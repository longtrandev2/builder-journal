// `last` / `since`: resolve period → sessions JSON → 1 question → narrator → FB post → ledger.
// Ledger is appended ONLY after the devlog file is written, so a failed run never "eats" commits.
import fs from 'node:fs';
import path from 'node:path';
import { resolveRepo, hasCommits, UserFacingError } from './lib/run-git.js';
import { loadConfig, resolveAuthors } from './lib/journal-config.js';
import { dateStamp, journalFile, displayPath } from './lib/journal-paths.js';
import { fmtNum, fmtRange } from './lib/vn-format.js';
import { writeSessionsJson } from './extractor/extract-sessions.js';
import { appendLedger, ledgerEntry } from './ledger/journal-ledger.js';
import { seededEntries } from './extractor/backfill-seeder.js';
import { resolvePeriod, NOTHING_NEW } from './devlog-period-resolver.js';
import { askHardest } from './narrator/preflight.js';
import { buildPrompt, parseNarrative } from './narrator/prompt-builder.js';
import { runClaude, REASON_TEXT } from './narrator/claude-runner.js';
import { writePromptFile, printFallbackHelp, readNarrativeFile } from './narrator/manual-fallback.js';
import { renderVnCasual } from './template/vn-casual-template.js';

/** devlog-YYYY-MM-DD.md, or -2, -3… when several runs happen on the same day. */
function uniqueDevlogFile(repo) {
  const base = `devlog-${dateStamp()}`;
  let file = journalFile(repo, `${base}.md`);
  for (let i = 2; fs.existsSync(file); i++) file = journalFile(repo, `${base}-${i}.md`);
  return file;
}

/** The command a user re-runs after the manual fallback (keeps their flags meaningful). */
function rerunCommand(opts, repo) {
  const cmd = opts.mode === 'since' ? `builder-journal since ${opts.when}` : 'builder-journal last';
  return opts.repo ? `${cmd} --repo "${repo}"` : cmd;
}

async function narrate(opts, repo, prompt) {
  if (opts.narrative) return { text: readNarrativeFile(path.resolve(opts.narrative)) };
  const rerun = rerunCommand(opts, repo);
  if (opts.narrator !== 'manual') {
    process.stdout.write('Đang nhờ claude viết bài…');
    const res = await runClaude(prompt, opts.narratorTimeout);
    process.stdout.write('\n');
    if (res.ok) return { text: res.text };
    printFallbackHelp(writePromptFile(repo, prompt, rerun), rerun, REASON_TEXT[res.reason] || res.reason);
    return null;
  }
  printFallbackHelp(writePromptFile(repo, prompt, rerun), rerun);
  return null;
}

export async function runDevlog(opts) {
  const repo = resolveRepo(opts.repo);
  if (!hasCommits(repo)) throw new UserFacingError('Repo chưa có commit nào để kể.');
  const { config } = loadConfig(repo);
  const authors = resolveAuthors(config, opts.author);

  const plan = resolvePeriod(repo, opts, authors);
  if (!plan) {
    console.log(NOTHING_NEW);
    return;
  }
  const { period } = plan;
  const rangeLabel = fmtRange(plan.from, plan.to);
  if (plan.note) console.log(plan.note);
  const sessionsFile = writeSessionsJson(repo, { mode: plan.mode, from: plan.from, to: plan.to, widened: plan.widened, authors, period });
  console.log(`${path.basename(repo)} · ${rangeLabel} · ${fmtNum(period.stats.sessions)} buổi / ${fmtNum(period.stats.commits)} commits / ${period.stats.chapterCount} mảng việc`);
  if (opts.extractOnly) {
    console.log(`Số liệu: ${displayPath(sessionsFile)}`);
    return;
  }

  const hardest = await askHardest(opts);
  const prompt = buildPrompt({
    repo,
    stats: period.stats,
    rangeLabel,
    sessions: plan.weekly ? undefined : period.sessions,
    weekly: plan.weekly,
    hardest,
  });
  const answer = await narrate(opts, repo, prompt);
  if (!answer) return;

  const post = renderVnCasual({ repo, from: plan.from, to: plan.to, stats: period.stats, narrative: parseNarrative(answer.text), hardest });
  const file = uniqueDevlogFile(repo);
  fs.writeFileSync(file, post);
  const outputFile = path.relative(repo, file).split(path.sep).join('/');
  appendLedger(repo, plan.backfill
    ? seededEntries(plan.backfill, outputFile)
    : ledgerEntry({ from: plan.from, to: plan.to, commits: period.commits, stats: period.stats, outputFile }));

  console.log(`\n${'─'.repeat(48)}\n${post}${'─'.repeat(48)}`);
  console.log(`Bản nháp: ${displayPath(file)} — đọc lại, sửa nếu cần, rồi đăng.`);
}
