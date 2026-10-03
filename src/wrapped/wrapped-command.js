// `builder-journal wrapped`: full-history stats-only read → aggregate → HTML + card SVG → open browser.
// Does NOT write the ledger: wrapping is looking back, not "telling" — `last` keeps working after it.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { resolveRepo, hasCommits, UserFacingError } from '../lib/run-git.js';
import { loadConfig, resolveAuthors, normalizeTheme, UNITS } from '../lib/journal-config.js';
import { dateStamp, journalFile, displayPath } from '../lib/journal-paths.js';
import { buildPeriod, parseSince } from '../extractor/extract-sessions.js';
import { aggregateWrapped } from './wrapped-aggregator.js';
import { renderWrappedHtml } from './wrapped-html-template.js';
import { renderCardSvg } from './card-svg-template.js';
import { fmtNum, fmtRange } from '../lib/vn-format.js';

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

export function runWrapped(opts) {
  const repo = resolveRepo(opts.repo);
  if (!hasCommits(repo)) throw new UserFacingError('Repo chưa có commit nào để wrap.');
  const { config, created } = loadConfig(repo);
  const authors = resolveAuthors(config, opts.author);
  const theme = opts.theme ? normalizeTheme(opts.theme) : config.theme;
  if (!theme) throw new UserFacingError(`Không có giao diện "${opts.theme}" — chọn: đêm, bình-minh, giấy.`);
  const unit = opts.unit || config.unit;
  if (!UNITS.includes(unit)) throw new UserFacingError(`--unit chỉ nhận: ${UNITS.join(', ')}.`);
  if (created) console.log(`✨ Lần đầu chạy — đã tạo ${displayPath(journalFile(repo, 'config.json'))} (sửa displayName/authors/theme ở đây).`);

  const from = opts.since ? parseSince(opts.since).toISOString() : undefined;
  const period = buildPeriod(repo, { authors, from, withPatch: false });
  if (!period.commits.length) {
    throw new UserFacingError(`Không thấy commit nào của ${authors.join(' / ')} — thử --author "<tên trong git log>".`);
  }
  if (period.capped) console.log('ℹ Repo lớn: chỉ lấy 5000 commit gần nhất trong khoảng.');

  const repoName = path.basename(repo);
  const data = aggregateWrapped(period, { unit, repoName, displayName: config.displayName });
  const stamp = dateStamp();
  const htmlFile = journalFile(repo, `wrapped-${stamp}.html`);
  const cardFile = journalFile(repo, `wrapped-card-${stamp}.svg`);
  fs.writeFileSync(htmlFile, renderWrappedHtml(data, { theme, highlight: opts.highlight }));
  fs.writeFileSync(cardFile, renderCardSvg({
    title: repoName,
    displayName: config.displayName,
    from: data.range.from,
    to: data.range.to,
    ticks: data.ticks,
    stats: [
      { value: data.hero.sessions, label: 'buổi code' },
      { value: data.hero.commits, label: 'commits' },
      { value: data.hero.codeLines, label: 'dòng code' },
    ],
  }, theme));

  const h = data.hero;
  console.log(`\n🎞  ${repoName} · ${fmtRange(data.range.from, data.range.to)}`);
  console.log(`   ${fmtNum(h.sessions)} buổi · ${fmtNum(h.commits)} commits · ${h.chapters} mảng việc · ${fmtNum(h.codeLines)} dòng code`);
  console.log(`   Code nhiều nhất lúc ${data.habits.peakHour}h · chuỗi dài nhất ${data.habits.streak} ngày`);
  console.log(`\n→ ${displayPath(htmlFile)}\n→ ${displayPath(cardFile)} (ảnh share cho README/blog; FB thì chụp màn hình trang)`);
  if (opts.open !== false) openInBrowser(htmlFile);
  return { htmlFile, cardFile, data };
}
