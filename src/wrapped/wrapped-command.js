// `builder-journal wrapped`: repo (default) or person (--all) scope → aggregate → self-contained
// HTML (+ card SVG) → open browser. `--week` renders the one-screen weekly mini card instead.
// Does NOT write the ledger: wrapping is looking back, not "telling" — `last` keeps working after it.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { resolveRepo, hasCommits, UserFacingError } from '../lib/run-git.js';
import { loadConfig, resolveAuthors, normalizeTheme, UNITS } from '../lib/journal-config.js';
import { dateStamp, journalFile, displayPath } from '../lib/journal-paths.js';
import { buildPeriodAsync, parseSince } from '../extractor/extract-sessions.js';
import { aggregateWrapped } from './wrapped-aggregator.js';
import { renderWrappedHtml } from './wrapped-html-template.js';
import { renderWeeklyCardHtml } from './weekly-card-html-template.js';
import { renderCardSvg } from './card-svg-template.js';
import { buildLeverage, safeActivity, safeEvents, buildPersonPeriod, personAuthors, shareSafe, commitHoursInRange, hideRepoNames } from './wrapped-scope-builder.js';
import { ensureAiLogConsent, confirmRepos, aliasNames } from '../lib/user-consent.js';
import { fmtNum, fmtRange } from '../lib/vn-format.js';
import { CHAPTER_LABELS } from '../extractor/chapter-classifier.js';

const WEEK_MS = 7 * 86400000;

/** Open a file in the default browser without blocking or failing the command. */
export function openInBrowser(file) {
  if (process.env.BJ_NO_OPEN) return;
  const [cmd, args] =
    process.platform === 'win32' ? ['cmd', ['/c', 'start', '""', file]]
      : process.platform === 'darwin' ? ['open', [file]]
        : ['xdg-open', [file]];
  try {
    spawn(cmd, args, { detached: true, stdio: 'ignore', windowsHide: true }).on('error', () => {}).unref();
  } catch {
    // Opening is a convenience; the path is printed anyway.
  }
}

/** Resolve scope → { period, ai, repos, name, displayName, outDir, config } */
async function buildScope(opts, from) {
  const aiAllowed = await ensureAiLogConsent(opts);
  if (opts.all) {
    const authors = personAuthors(opts.author);
    const exclude = [].concat(opts.exclude || []).flatMap((x) => String(x).split(',')).map((x) => x.trim()).filter(Boolean);
    // Agent logs are read ONCE: the same events serve repo discovery and the AI screens.
    const events = safeEvents(aiAllowed);
    const activityAll = events ? safeActivity({ events }, true) : null;
    const include = [].concat(opts.include || []).flatMap((x) => String(x).split(',')).map((x) => x.trim()).filter(Boolean);
    const confirm = (list) => confirmRepos(list, opts);
    const { period, repos } = await buildPersonPeriod({ authors, from, exclude, include, activityAll, confirm });
    const ai = events ? safeActivity({ since: from, projects: repos.map((r) => r.path), events }, true) : null;
    const outDir = path.join(os.homedir(), '.builder-journal');
    fs.mkdirSync(outDir, { recursive: true });
    // Never put an email on a share page: first identity that is not an email, else the OS user.
    const displayName = authors.find((a) => !a.includes('@')) || os.userInfo().username;
    return { period, ai, repos, name: displayName, displayName, outDir, config: { theme: 'dem', unit: 'month' }, scope: 'person' };
  }
  const repo = resolveRepo(opts.repo);
  if (!hasCommits(repo)) throw new UserFacingError('Repo chưa có commit nào để wrap.');
  const { config, created } = loadConfig(repo);
  if (created) console.log(`Lần đầu chạy — đã tạo ${displayPath(journalFile(repo, 'config.json'))} (sửa displayName/authors/theme ở đây).`);
  const authors = resolveAuthors(config, opts.author);
  // Start git first; the agent logs are read while git works.
  const periodPromise = buildPeriodAsync(repo, { authors, from });
  const ai = safeActivity({ since: from, projects: [repo] }, aiAllowed);
  const period = await periodPromise;
  if (!period.commits.length) {
    throw new UserFacingError(`Không thấy commit nào của ${authors.join(' / ')} — thử --author "<tên trong git log>".`);
  }
  if (period.capped) console.log('Repo lớn: chỉ lấy 5000 commit gần nhất trong khoảng.');
  return { period, ai, repos: null, name: path.basename(repo), displayName: config.displayName, outDir: path.join(repo, '.journal'), config, scope: 'repo' };
}

function writeWeekly(s, theme, opts) {
  const { period, ai } = s;
  const week = {
    displayName: s.displayName,
    repoName: opts.hideNames ? 'Repo A' : s.name,
    range: { from: period.commits[0].date, to: period.commits[period.commits.length - 1].date },
    sessions: period.stats.sessions,
    commits: period.stats.commits,
    codeLines: period.stats.codeLines,
    chapters: Object.entries(period.stats.chapters) // already sorted by count desc
      .map(([id, count]) => ({ id, label: CHAPTER_LABELS[id] || id, count, percent: Math.round((count / period.stats.commits) * 100) })),
    ai: opts.hideNames && ai ? { ...shareSafe(ai, null).ai, projects: [] } : shareSafe(ai, null).ai,
    hardest: opts.hardest || '',
  };
  const file = path.join(s.outDir, `weekly-card-${dateStamp()}.html`);
  fs.writeFileSync(file, renderWeeklyCardHtml(week, { theme }));
  console.log(`\nTuần của ${s.name}: ${period.stats.sessions} buổi / ${period.stats.commits} commits${ai ? ` / ${ai.prompts} lệnh cho agent` : ''}`);
  return file;
}

export async function runWrapped(opts) {
  const theme = opts.theme ? normalizeTheme(opts.theme) : null;
  if (opts.theme && !theme) throw new UserFacingError(`Không có giao diện "${opts.theme}" — chọn: đêm, bình-minh, giấy.`);
  if (opts.unit && !UNITS.includes(opts.unit)) throw new UserFacingError(`--unit chỉ nhận: ${UNITS.join(', ')}.`);
  const from = opts.week ? new Date(Date.now() - WEEK_MS).toISOString() : opts.since ? parseSince(opts.since).toISOString() : undefined;

  const s = await buildScope(opts, from);
  const useTheme = theme || s.config.theme;
  if (opts.week) {
    const file = writeWeekly(s, useTheme, opts);
    console.log(`Card: ${displayPath(file)} (mở ra, bấm Tải ảnh để đăng)`);
    if (opts.open !== false) openInBrowser(file);
    return { htmlFile: file };
  }

  const data = aggregateWrapped(s.period, { unit: opts.unit || s.config.unit, repoName: s.name, displayName: s.displayName });
  Object.assign(data, { ...shareSafe(s.ai, s.repos), leverage: buildLeverage(s.period.commits, s.ai), scope: s.scope });
  if (data.ai) {
    const inRange = commitHoursInRange(s.period.commits, data.ai.range);
    // No commits inside the log window → null: the screen drops the prompt-vs-commit comparison.
    data.ai.commitHours = inRange.some(Boolean) ? inRange : null;
  }
  if (opts.hideNames) {
    const names = [...(data.repos || []).map((r) => r.name), ...(data.ai?.projects || []).map((p) => p.name), ...(s.scope === 'repo' ? [s.name] : [])];
    hideRepoNames(data, aliasNames(names));
  }
  const stamp = dateStamp();
  const htmlFile = path.join(s.outDir, `wrapped-${stamp}.html`);
  const cardFile = path.join(s.outDir, `wrapped-card-${stamp}.svg`);
  fs.writeFileSync(htmlFile, renderWrappedHtml(data, { theme: useTheme, highlight: opts.highlight }));
  fs.writeFileSync(cardFile, renderCardSvg({
    title: data.repoName, // aliased when --hide-names
    displayName: s.displayName,
    from: data.range.from,
    to: data.range.to,
    ticks: data.ticks,
    stats: [
      { value: data.hero.sessions, label: 'buổi code' },
      { value: data.hero.commits, label: 'commits' },
      { value: data.hero.codeLines, label: 'dòng code đã ship' },
    ],
  }, useTheme));

  const h = data.hero;
  console.log(`\n${s.name} · ${fmtRange(data.range.from, data.range.to)}`);
  console.log(`  ${fmtNum(h.sessions)} buổi · ${fmtNum(h.commits)} commits · ${h.chapters} mảng việc · ${fmtNum(h.codeLines)} dòng code đã ship`);
  if (s.ai) console.log(`  ${fmtNum(s.ai.prompts)} lệnh cho agent · ${fmtNum(Math.round(s.ai.activeMinutes / 60))} giờ làm thật (log từ ${fmtRange(s.ai.range.from, s.ai.range.to)})`);
  if (s.repos) console.log(`  ${s.repos.length} repo: ${s.repos.slice(0, 5).map((r) => r.name).join(', ')}${s.repos.length > 5 ? '…' : ''}`);
  console.log(`\nTrang: ${displayPath(htmlFile)}\nCard SVG (README/blog): ${displayPath(cardFile)} — lên FB thì bấm Tải ảnh trong trang.`);
  if (opts.open !== false) openInBrowser(htmlFile);
  return { htmlFile, cardFile, data };
}
