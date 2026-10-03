// Thin wrapper around the git binary: args array (no shell), UTF-8, friendly errors.
import { spawnSync } from 'node:child_process';
import path from 'node:path';

export class UserFacingError extends Error {
  constructor(message, exitCode = 1) {
    super(message);
    this.exitCode = exitCode;
  }
}

/** Run `git -C <repo> ...args` and return stdout. Throws on non-zero exit. */
export function runGit(repo, args) {
  const result = spawnSync('git', ['-C', repo, ...args], {
    encoding: 'utf8',
    maxBuffer: 512 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.error) {
    if (result.error.code === 'ENOENT') throw new UserFacingError('Không tìm thấy lệnh git — cài git trước nhé.');
    throw result.error;
  }
  if (result.status !== 0) {
    const err = new Error(`git ${args[0]} failed: ${result.stderr.trim()}`);
    err.stderr = result.stderr;
    throw err;
  }
  return result.stdout;
}

/** Same as runGit but returns null instead of throwing (for optional lookups). */
export function tryGit(repo, args) {
  try {
    return runGit(repo, args).trim();
  } catch (err) {
    if (err instanceof UserFacingError) throw err;
    return null;
  }
}

/** Resolve the repo top-level dir or throw the friendly VN error. */
export function resolveRepo(repoArg) {
  const abs = path.resolve(repoArg || process.cwd());
  const top = tryGit(abs, ['rev-parse', '--show-toplevel']);
  if (!top) throw new UserFacingError(`Thư mục không phải git repo: ${abs}`);
  return path.resolve(top);
}

export function hasCommits(repo) {
  return tryGit(repo, ['rev-parse', '--verify', '-q', 'HEAD']) !== null;
}
