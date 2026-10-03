// Backfill: a long `since` range is split into 7-day periods → one seeded ledger line per
// non-empty period, but only ONE aggregate story devlog. Single stats-only git read (fast).
import { buildPeriod, periodStats } from './extract-sessions.js';
import { groupSessions } from './session-grouper.js';
import { ledgerEntry } from '../ledger/journal-ledger.js';

const WEEK = 7 * 86400000;

/** Bucket chronological commits into 7-day chunks starting at `from`; empty chunks skipped. */
export function chunkByWeek(commits, from) {
  const start = Date.parse(from);
  const chunks = new Map();
  for (const c of commits) {
    const idx = Math.max(0, Math.floor((Date.parse(c.date) - start) / WEEK));
    if (!chunks.has(idx)) chunks.set(idx, []);
    chunks.get(idx).push(c);
  }
  return [...chunks.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([idx, list]) => ({
      from: new Date(start + idx * WEEK).toISOString(),
      to: new Date(start + (idx + 1) * WEEK).toISOString(),
      commits: list,
    }));
}

/** Read the whole range once (stats only). Returns the aggregate period + per-week chunks. */
export function buildBackfill(repo, { from, authors }) {
  const to = new Date().toISOString();
  const period = buildPeriod(repo, { authors, from, withPatch: false });
  const chunks = chunkByWeek(period.commits, from).map((chunk) => {
    const sessions = groupSessions(chunk.commits);
    return { ...chunk, stats: periodStats(chunk.commits, sessions) };
  });
  return { ...period, from, to, chunks };
}

/** Ledger lines for every non-empty week (seeded:true), appended after the devlog is written. */
export function seededEntries(backfill, outputFile) {
  return backfill.chunks.map((chunk) =>
    ledgerEntry({ from: chunk.from, to: chunk.to, commits: chunk.commits, stats: chunk.stats, outputFile, seeded: true }),
  );
}

/** Compact per-week stats for the narrator (no diffs in backfill mode). */
export function weeklyDigest(backfill) {
  return backfill.chunks.map((c) => ({
    tuan_tu: c.from.slice(0, 10),
    buoi: c.stats.sessions,
    commits: c.stats.commits,
    chuong: c.stats.chapters,
    dong_them: c.stats.insertions,
    vi_du_commit: c.commits.slice(-3).map((x) => x.message),
  }));
}
