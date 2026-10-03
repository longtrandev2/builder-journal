#!/usr/bin/env node
// CLI entry: wrapped / update. Commands load lazily to keep `--help` instant.
import { Command } from 'commander';
import { createRequire } from 'node:module';

const pkg = createRequire(import.meta.url)('../package.json');
const program = new Command();

const collect = (value, list) => list.concat(value);

/** Run a command; friendly VN errors exit with their code, real bugs print the stack. */
async function run(load, opts) {
  try {
    const mod = await load();
    await mod(opts);
  } catch (err) {
    if (err && typeof err.exitCode === 'number') {
      console.error(`Lỗi: ${err.message}`);
      process.exitCode = err.exitCode;
    } else {
      console.error(err);
      process.exitCode = 1;
    }
  }
}

program
  .name('builder-journal')
  .description('Wrapped cho builder thời AI: đọc git và log agent trên máy bạn, ra trang HTML để xem và tải ảnh. Chạy hoàn toàn trên máy, không gửi gì đi đâu.')
  .version(pkg.version);

program
  .command('wrapped')
  .description('Trang Wrapped (HTML) + card SVG cho toàn bộ lịch sử repo')
  .option('--repo <path>', 'repo cần wrap (mặc định: thư mục hiện tại)')
  .option('--author <name>', 'tên/email tác giả trong git (lặp lại được)', collect, [])
  .option('--since <when>', 'chỉ lấy từ mốc: 90d hoặc 2026-03-01')
  .option('--theme <name>', 'đêm | bình-minh | giấy')
  .option('--unit <unit>', 'week | month | quarter')
  .option('--all', 'Wrapped của bạn: mọi repo tìm thấy trong log agent (Claude Code / Codex)')
  .option('--exclude <names>', 'bỏ repo khỏi --all (tên hoặc đường dẫn, phân cách dấu phẩy)', collect, [])
  .option('--include <paths>', 'thêm repo vào --all (đường dẫn, phân cách dấu phẩy)', collect, [])
  .option('--week', 'card 1 màn cho 7 ngày gần nhất')
  .option('--hardest <text>', 'dòng "vấp thật" trên card tuần')
  .option('--ai', 'đọc log agent (Claude Code / Codex) — chỉ số tổng, nhớ lựa chọn')
  .option('--no-ai', 'không đọc log agent (chỉ dùng git), nhớ lựa chọn')
  .option('--hide-names', 'ẩn tên repo trên trang (Repo A, Repo B…)')
  .option('-y, --yes', 'không hỏi: đồng ý đọc log agent, giữ mọi repo')
  .option('--no-open', 'không tự mở trình duyệt')
  .action((opts) => run(() => import('../src/wrapped/wrapped-command.js').then((m) => m.runWrapped), opts));

program
  .command('update')
  .description('Cập nhật builder-journal lên bản mới nhất (npm i -g builder-journal@latest)')
  .action(() => run(() => import('../src/self-update-command.js').then((m) => m.runSelfUpdate), { current: pkg.version }));

// `bj` alone in a real terminal → numbered menu; scripts/pipes (no TTY) keep the plain help.
async function main() {
  if (process.argv.length <= 2 && process.stdin.isTTY && process.stdout.isTTY) {
    const { runMenu } = await import('../src/interactive-menu.js');
    const args = await runMenu();
    if (!args) return;
    await program.parseAsync([process.argv[0], process.argv[1], ...args]);
    return;
  }
  await program.parseAsync(process.argv);
}

main();
