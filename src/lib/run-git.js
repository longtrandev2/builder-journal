// Thin wrapper around the git binary: args array (no shell), UTF-8, friendly errors.
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';

export class UserFacingError extends Error {
  constructor(message, exitCode = 1) {
    super(message);
    this.exitCode = exitCode;
  }
}

/**
 * Run `git -C <repo> ...args` and return stdout. Throws on non-zero exit (or ENOBUFS past maxBuffer).
 * core.quotepath=off: paths with Vietnamese/CJK characters come out as real UTF-8, not "\303\240" escapes.
 */
export function runGit(repo, args, { maxBuffer = 512 * 1024 * 1024 } = {}) {
  const result = spawnSync('git', ['-C', repo, '-c', 'core.quotepath=off', ...args], {
    encoding: 'utf8',
    maxBuffer,
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

/**
 * Async twin of runGit: lets several repos (and the agent-log reading) run at the same time.
 * Same errors, same flags.
 */
export function runGitAsync(repo, args) {
  return new Promise((resolve, reject) => {
    const child = spawn('git', ['-C', repo, '-c', 'core.quotepath=off', ...args], { windowsHide: true });
    const out = [];
    let errText = '';
    child.stdout.on('data', (d) => out.push(d));
    child.stderr.setEncoding('utf8').on('data', (d) => { errText += d; });
    child.on('error', (err) => reject(err.code === 'ENOENT' ? new UserFacingError('Không tìm thấy lệnh git — cài git trước nhé.') : err));
    child.on('close', (code) => {
      if (code === 0) resolve(Buffer.concat(out).toString('utf8'));
      else reject(Object.assign(new Error(`git ${args[0]} failed: ${errText.trim()}`), { stderr: errText }));
    });
  });
}

/** Async tryGit: null instead of throwing (except "git missing"). */
export async function tryGitAsync(repo, args) {
  try {
    return (await runGitAsync(repo, args)).trim();
  } catch (err) {
    if (err instanceof UserFacingError) throw err;
    return null;
  }
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
