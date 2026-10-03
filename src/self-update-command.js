// `bj update`: reinstall the latest published version globally. The only time the tool itself
// talks to the network — and only because the user asked for it.
import { spawnSync } from 'node:child_process';
import { UserFacingError } from './lib/run-git.js';

export const UPDATE_ARGS = ['i', '-g', 'builder-journal@latest'];

export function runSelfUpdate({ current }) {
  console.log(`Bản hiện tại: ${current}. Đang cài bản mới nhất…\n> npm ${UPDATE_ARGS.join(' ')}\n`);
  // Fixed command, no user input: safe through the shell (needed for npm.cmd on Windows).
  const res = spawnSync(`npm ${UPDATE_ARGS.join(' ')}`, { stdio: 'inherit', shell: true, windowsHide: true });
  if (res.error || res.status !== 0) {
    const why = res.error ? res.error.message : `mã ${res.status}`;
    throw new UserFacingError(
      `Cập nhật chưa được (${why}). Thử tự chạy: npm ${UPDATE_ARGS.join(' ')}` +
      (process.platform === 'win32' ? '' : ' (có thể cần sudo)'),
    );
  }
  // Don't spawn `bj` again here: on Windows npm just replaced the bj.cmd that is running right now.
  console.log('\nXong. Mở terminal mới rồi chạy `bj --version` để xem bản mới.');
}
