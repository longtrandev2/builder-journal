// `bj update`: reinstall the latest published version globally. The only time the tool itself
// talks to the network — and only because the user asked for it.
import { spawnSync } from 'node:child_process';
import { UserFacingError } from './lib/run-git.js';

export const UPDATE_ARGS = ['i', '-g', 'builder-journal@latest'];

export function runSelfUpdate({ current }) {
  console.log(`Bản hiện tại: ${current}. Đang cài bản mới nhất…\n> npm ${UPDATE_ARGS.join(' ')}\n`);
  // Fixed command, no user input: safe through the shell (needed for npm.cmd on Windows).
  const res = spawnSync(`npm ${UPDATE_ARGS.join(' ')}`, { stdio: 'inherit', shell: true, windowsHide: true });
  if (res.status !== 0) {
    throw new UserFacingError(
      `Cập nhật chưa được (mã ${res.status}). Thử tự chạy: npm ${UPDATE_ARGS.join(' ')}` +
      (process.platform === 'win32' ? '' : ' (có thể cần sudo)'),
    );
  }
  const after = spawnSync('bj --version', { encoding: 'utf8', shell: true, windowsHide: true });
  console.log(`\nXong. Bản đang dùng: ${String(after.stdout || '').trim() || 'chạy bj --version để xem'}.`);
}
