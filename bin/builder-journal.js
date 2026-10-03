#!/usr/bin/env node
// CLI entry: wrapped / last / since / status. Commands load lazily to keep `--help` instant.
import { Command, InvalidArgumentError } from 'commander';
import { createRequire } from 'node:module';

const pkg = createRequire(import.meta.url)('../package.json');
const program = new Command();

const collect = (value, list) => list.concat(value);

/** --narrator-timeout: whole milliseconds > 0, otherwise a friendly VN error (never NaN → instant timeout). */
function parseTimeoutMs(value) {
  if (!/^\d+$/.test(String(value).trim()) || Number(value) <= 0) {
    throw new InvalidArgumentError('phải là số nguyên dương (mili-giây), ví dụ 180000.');
  }
  return Number(value);
}

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

const devlog = () => import('../src/devlog-command.js').then((m) => m.runDevlog);

/** Options shared by the devlog-writing commands. */
function devlogOptions(cmd) {
  return cmd
    .option('--repo <path>', 'repo cần kể (mặc định: thư mục hiện tại)')
    .option('--author <name>', 'tên/email tác giả trong git (lặp lại được)', collect, [])
    .option('--hardest <text>', 'trả lời trước câu "Vấp gì nhất?" ("" = bỏ qua)')
    .option('--narrator <mode>', 'claude | manual', 'claude')
    .option('--narrative <file>', 'dùng bài AI đã viết sẵn (chế độ thủ công)')
    .option('--narrator-timeout <ms>', 'giới hạn thời gian chờ claude', parseTimeoutMs, 180000)
    .option('--extract-only', 'chỉ trích xuất số liệu, không viết bài')
    .option('-y, --yes', 'đồng ý gửi diff (đã che secret) cho claude ở repo này, không hỏi');
}

program
  .name('builder-journal')
  .description('Biến git thành Wrapped kiểu Spotify + devlog tiếng Việt. Số liệu tính trên máy bạn; last/since gửi trích đoạn diff cho claude trên máy bạn (như khi dùng Claude Code), trừ khi --narrator manual; wrapped không gửi gì.')
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
  .option('--week', 'card 1 màn cho 7 ngày gần nhất (đi kèm devlog tuần)')
  .option('--hardest <text>', 'dòng "vấp thật" trên card tuần')
  .option('--ai', 'đọc log agent (Claude Code / Codex) — chỉ số tổng, nhớ lựa chọn')
  .option('--no-ai', 'không đọc log agent (chỉ dùng git), nhớ lựa chọn')
  .option('--hide-names', 'ẩn tên repo trên trang (Repo A, Repo B…)')
  .option('-y, --yes', 'không hỏi: đồng ý đọc log agent, giữ mọi repo')
  .option('--no-open', 'không tự mở trình duyệt')
  .action((opts) => run(() => import('../src/wrapped/wrapped-command.js').then((m) => m.runWrapped), opts));

devlogOptions(program.command('last').description('Viết devlog cho phần chưa kể (từ lần kể trước tới giờ)'))
  .action((opts) => run(devlog, { ...opts, mode: 'last' }));

devlogOptions(program.command('since <when>').description('Viết devlog từ mốc: 3d (3 ngày) hoặc 2026-07-01'))
  .action((when, opts) => run(devlog, { ...opts, mode: 'since', when }));

program
  .command('status')
  .description('Đã kể tới đâu, còn bao nhiêu commit chưa kể')
  .option('--repo <path>', 'repo cần xem (mặc định: thư mục hiện tại)')
  .option('--author <name>', 'tên/email tác giả trong git (lặp lại được)', collect, [])
  .action((opts) => run(() => import('../src/status-command.js').then((m) => m.runStatus), opts));

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
