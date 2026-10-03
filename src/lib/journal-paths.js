// Paths inside <repo>/.journal/ + keeps .journal out of git via .git/info/exclude.
import fs from 'node:fs';
import path from 'node:path';
import { tryGit } from './run-git.js';

export const JOURNAL_DIR = '.journal';

export function journalDir(repo) {
  return path.join(repo, JOURNAL_DIR);
}

export function journalFile(repo, name) {
  return path.join(journalDir(repo), name);
}

/** Local calendar stamp YYYY-MM-DD used in output file names. */
export function dateStamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Create .journal/ and make sure git ignores it locally (never committed by accident). */
export function ensureJournal(repo) {
  fs.mkdirSync(journalDir(repo), { recursive: true });
  const excludeRel = tryGit(repo, ['rev-parse', '--git-path', 'info/exclude']);
  if (!excludeRel) return;
  const excludePath = path.isAbsolute(excludeRel) ? excludeRel : path.join(repo, excludeRel);
  try {
    const current = fs.existsSync(excludePath) ? fs.readFileSync(excludePath, 'utf8') : '';
    if (!current.split(/\r?\n/).some((line) => line.trim() === `${JOURNAL_DIR}/`)) {
      fs.mkdirSync(path.dirname(excludePath), { recursive: true });
      const sep = current && !current.endsWith('\n') ? '\n' : '';
      fs.appendFileSync(excludePath, `${sep}${JOURNAL_DIR}/\n`);
    }
  } catch {
    // Non-fatal: worst case .journal shows up as untracked.
  }
}

/** Short display path relative to cwd when possible (keeps terminal output tidy). */
export function displayPath(p) {
  const rel = path.relative(process.cwd(), p);
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel) ? rel : p;
}
