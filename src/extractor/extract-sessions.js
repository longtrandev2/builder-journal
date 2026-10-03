// Composes git-reader → classifier → grouper into one "period" + resolves time windows.
import fs from 'node:fs';
import { readCommits, isNoiseFile } from './git-reader.js';
import { groupSessions } from './session-grouper.js';
import { classifyAll, fileKind } from './chapter-classifier.js';
import { UserFacingError } from '../lib/run-git.js';
import { dateStamp, ensureJournal, journalFile } from '../lib/journal-paths.js';

const DAY = 86400000;
export const BACKFILL_THRESHOLD_DAYS = 14;
const MIN_COMMITS = 3;
const WIDEN_STEPS = [7, 14, 21];

/** "3d" → 3 days ago; "2026-07-01" → that local midnight. */
export function parseSince(value, now = new Date()) {
  const s = String(value || '').trim();
  const days = s.match(/^(\d+)\s*d$/i);
  if (days) return new Date(now.getTime() - Number(days[1]) * DAY);
  const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) {
    const d = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
    if (!Number.isNaN(d.getTime()) && d < now) return d;
  }
  throw new UserFacingError(`Không hiểu mốc thời gian "${s}" — dùng dạng 3d (3 ngày) hoặc 2026-07-01.`);
}

export function daysBetween(from, to = new Date()) {
  return (to.getTime() - from.getTime()) / DAY;
}

/** Inserted lines in real source files only (no docs/config/tests/lockfiles/agent kits). */
export function codeInsertions(commit) {
  return (commit.numstat || [])
    .filter((f) => !isNoiseFile(f.path) && fileKind(f.path) === 'src')
    .reduce((s, f) => s + f.ins, 0);
}

/** Aggregate numbers shared by devlog, ledger and status — all deterministic. */
export function periodStats(commits, sessions) {
  const chapters = {};
  for (const c of commits) chapters[c.chapter] = (chapters[c.chapter] || 0) + 1;
  return {
    sessions: sessions.length,
    commits: commits.length,
    chapters: Object.fromEntries(Object.entries(chapters).sort((a, b) => b[1] - a[1])),
    chapterCount: Object.keys(chapters).length,
    insertions: commits.reduce((s, c) => s + c.insertions, 0),
    deletions: commits.reduce((s, c) => s + c.deletions, 0),
    codeLines: commits.reduce((s, c) => s + codeInsertions(c), 0),
  };
}

/** Read + classify + group. options pass through to readCommits. */
export function buildPeriod(repo, options) {
  const { commits, capped } = readCommits(repo, options);
  classifyAll(commits);
  const sessions = groupSessions(commits).map((s) => ({
    ...s,
    chapters: [...new Set(s.commits.map((c) => c.chapter))],
  }));
  return { commits, sessions, stats: periodStats(commits, sessions), capped };
}

/**
 * Fixed window ending now: start at `days`, widen 7→14→21 while < 3 commits.
 * Zero commits even at 21 days → friendly exit-1 error.
 */
export function buildFixedWindow(repo, { days, authors, withPatch }) {
  const steps = [...new Set([days, ...WIDEN_STEPS.filter((d) => d > days)])];
  const now = new Date();
  let period = null;
  let usedDays = days;
  for (const d of steps) {
    usedDays = d;
    period = buildPeriod(repo, { authors, from: new Date(now - d * DAY).toISOString(), withPatch });
    if (period.commits.length >= MIN_COMMITS) break;
  }
  if (!period.commits.length) {
    throw new UserFacingError(
      `Không tìm thấy commit nào trong ${usedDays} ngày — thử --author hoặc chạy: builder-journal since <ngày> để lấy khoảng khác.`,
    );
  }
  return { ...period, from: new Date(now - usedDays * DAY).toISOString(), to: now.toISOString(), widened: usedDays !== days, days: usedDays };
}

/** Persist the sessions JSON (patch excerpts included — local file only). */
export function writeSessionsJson(repo, { mode, from, to, widened, authors, period }) {
  ensureJournal(repo);
  const file = journalFile(repo, `sessions-${dateStamp()}.json`);
  const payload = {
    repo,
    author: authors.join(', '),
    generatedAt: new Date().toISOString(),
    range: { mode, from, to, widened: Boolean(widened) },
    stats: period.stats,
    sessions: period.sessions,
  };
  fs.writeFileSync(file, JSON.stringify(payload, null, 2));
  return file;
}
