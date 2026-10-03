// Composes git-reader → classifier → grouper into one "period" + resolves time windows.
import { readCommits, readCommitsAsync, isNoiseFile } from './git-reader.js';
import { groupSessions } from './session-grouper.js';
import { classifyAll } from './chapter-classifier.js';
import { UserFacingError } from '../lib/run-git.js';

const DAY = 86400000;

/** "3d" → 3 days ago; "2026-07-01" → that local midnight. */
export function parseSince(value, now = new Date()) {
  const s = String(value || '').trim();
  const days = s.match(/^(\d+)\s*d$/i);
  if (days) return new Date(now.getTime() - Number(days[1]) * DAY);
  const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) {
    const d = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
    if (!Number.isNaN(d.getTime())) {
      if (d >= now) throw new UserFacingError(`Mốc "${s}" ở tương lai — chọn ngày đã qua, ví dụ 7d hoặc 2026-07-01.`);
      return d;
    }
  }
  throw new UserFacingError(`Không hiểu mốc thời gian "${s}" — dùng dạng 3d (3 ngày) hoặc 2026-07-01.`);
}

// Extensions that count as "lines of code written". Whitelist (not "everything but docs"): svg/json/csv/lock/
// generated blobs must never inflate the number.
const CODE_EXTENSIONS = new Set(
  'js jsx ts tsx mjs cjs vue svelte py rb go rs java kt kts swift c cc cpp h hpp cs php dart scala lua sql sh ps1 css scss sass less html astro ex exs erl clj elm hs ml r jl m'.split(' '),
);

export function isCodeFile(filePath) {
  const dot = filePath.lastIndexOf('.');
  return dot > 0 && CODE_EXTENSIONS.has(filePath.slice(dot + 1).toLowerCase()) && !isNoiseFile(filePath);
}

/** Inserted lines in whitelisted source-code files (lockfiles/build output/agent kits excluded as noise). */
export function codeInsertions(commit) {
  return (commit.numstat || []).filter((f) => isCodeFile(f.path)).reduce((s, f) => s + f.ins, 0);
}

/**
 * Aggregate numbers — all deterministic. Merge commits count as commits (and shape sessions,
 * heatmap, timeline) but have no diff of their own, so chapters/lines/classification use the rest.
 */
export function periodStats(commits, sessions) {
  const work = commits.filter((c) => !c.isMerge);
  const chapters = {};
  for (const c of work) chapters[c.chapter] = (chapters[c.chapter] || 0) + 1;
  return {
    sessions: sessions.length,
    commits: commits.length,
    merges: commits.length - work.length,
    chapters: Object.fromEntries(Object.entries(chapters).sort((a, b) => b[1] - a[1])),
    chapterCount: Object.keys(chapters).length,
    insertions: work.reduce((s, c) => s + c.insertions, 0),
    deletions: work.reduce((s, c) => s + c.deletions, 0),
    codeLines: work.reduce((s, c) => s + codeInsertions(c), 0),
    // How chapters were decided — shown on the page so the split is never a black box.
    classifiedBy: { prefix: work.filter((c) => c.chapterSource === 'prefix').length, diff: work.filter((c) => c.chapterSource === 'diff').length },
  };
}

/** Classify + group already-read commits into a period. */
export function periodFromCommits(commits, capped = false) {
  classifyAll(commits);
  const sessions = groupSessions(commits).map((s) => ({
    ...s,
    chapters: [...new Set(s.commits.map((c) => c.chapter).filter(Boolean))],
  }));
  return { commits, sessions, stats: periodStats(commits, sessions), capped };
}

/** Read + classify + group. options pass through to readCommits. */
export function buildPeriod(repo, options) {
  const { commits, capped } = readCommits(repo, options);
  return periodFromCommits(commits, capped);
}

/** Async version: several repos can be read at the same time. */
export async function buildPeriodAsync(repo, options) {
  const { commits, capped } = await readCommitsAsync(repo, options);
  return periodFromCommits(commits, capped);
}
