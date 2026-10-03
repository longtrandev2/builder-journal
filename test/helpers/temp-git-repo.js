// Test helper: throwaway git repos with back-dated commits (author + committer date).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function git(dir, args, env = {}) {
  const r = spawnSync('git', ['-C', dir, ...args], { encoding: 'utf8', env: { ...process.env, ...env } });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
}

export function makeRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bj-test-'));
  git(dir, ['init', '-q', '-b', 'main']);
  git(dir, ['config', 'user.name', 'Tester']);
  git(dir, ['config', 'user.email', 'tester@example.com']);
  git(dir, ['config', 'commit.gpgsign', 'false']);
  return dir;
}

/** Commit one new source file, dated `daysAgo` days (+ optional minutes) before now. */
export function commitAt(dir, daysAgo, { minutes = 0, file, lines = 20, author } = {}) {
  const date = new Date(Date.now() - daysAgo * 86400000 - minutes * 60000).toISOString();
  const name = file || `src/f-${daysAgo}-${minutes}-${Math.random().toString(36).slice(2, 7)}.js`;
  fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
  fs.writeFileSync(path.join(dir, name), Array.from({ length: lines }, (_, i) => `const x${i} = ${i};`).join('\n'));
  git(dir, ['add', '-A']);
  const env = { GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date };
  if (author) Object.assign(env, { GIT_AUTHOR_NAME: author, GIT_AUTHOR_EMAIL: `${author}@example.com` });
  git(dir, ['commit', '-q', '-m', `add ${name}`], env);
  return git(dir, ['rev-parse', 'HEAD']);
}

export function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}
