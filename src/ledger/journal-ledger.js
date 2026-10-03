// .journal/journal.jsonl — one line per told period. The tail is "đã kể tới đâu".
import fs from 'node:fs';
import { journalFile, ensureJournal } from '../lib/journal-paths.js';
import { tryGit } from '../lib/run-git.js';
import { authorArgs } from '../extractor/git-reader.js';

const LEDGER = 'journal.jsonl';

/** Tolerant read: corrupt lines are skipped with a warning, never fatal. */
export function readLedger(repo) {
  const file = journalFile(repo, LEDGER);
  if (!fs.existsSync(file)) return [];
  const entries = [];
  let bad = 0;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line);
      if (entry && entry.last_commit_hash) entries.push(entry);
      else bad++;
    } catch {
      bad++;
    }
  }
  if (bad) console.warn(`Lưu ý: bỏ qua ${bad} dòng hỏng trong .journal/${LEDGER}.`);
  return entries;
}

export function lastTold(entries) {
  return entries.length ? entries[entries.length - 1] : null;
}

/** Append entries — callers do this ONLY after the devlog file was written successfully. */
export function appendLedger(repo, entries) {
  ensureJournal(repo);
  const lines = [].concat(entries).map((e) => JSON.stringify(e)).join('\n') + '\n';
  fs.appendFileSync(journalFile(repo, LEDGER), lines);
}

/** Is the told commit still in HEAD's history? (false after rebase/reset → fall back to dates) */
export function isTellableFrom(repo, hash) {
  if (!hash) return false;
  return tryGit(repo, ['merge-base', '--is-ancestor', hash, 'HEAD']) !== null;
}

/** Commits by the authors after the last told one (null when the ledger point is unusable). */
export function untoldCount(repo, authors, entry) {
  if (!entry || !isTellableFrom(repo, entry.last_commit_hash)) return null;
  const out = tryGit(repo, ['rev-list', '--count', '--no-merges', ...authorArgs(authors), `${entry.last_commit_hash}..HEAD`]);
  return out === null ? null : Number(out);
}

/** Topologically newest commit of a list (smallest git-log position), NOT the latest date. */
export function tipCommit(commits) {
  return commits.reduce((a, b) => (b.order < a.order ? b : a));
}

/** Same people? Order-insensitive, case-insensitive. Entries from before `authors` existed never warn. */
export function sameAuthors(a, b) {
  if (!Array.isArray(a)) return true;
  const norm = (list) => [...new Set(list.map((x) => String(x).trim().toLowerCase()))].sort().join('|');
  return norm(a) === norm(b);
}

/** Build one ledger line. tipHash = the HEAD the run read up to (exact boundary, no gaps/overlap). */
export function ledgerEntry({ from, to, commits, stats, outputFile, seeded = false, tipHash, authors = [] }) {
  return {
    date: new Date().toISOString(),
    range_from: from,
    range_to: to,
    last_commit_hash: tipHash || tipCommit(commits).hash,
    stats: { sessions: stats.sessions, commits: stats.commits, chapters: stats.chapters },
    output_file: outputFile,
    seeded,
    authors: [...authors],
  };
}
