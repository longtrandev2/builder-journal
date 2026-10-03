#!/usr/bin/env node
// CLI entry: wrapped / last / since / status. Commands load lazily to keep `--help` instant.
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
      console.error(`✖ ${err.message}`);
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
    .option('--narrator-timeout <ms>', 'giới hạn thời gian chờ claude', (v) => Number(v), 180000)
    .option('--extract-only', 'chỉ trích xuất số liệu, không viết bài');
}

program
  .name('builder-journal')
  .description('Biến git thành Wrapped kiểu Spotify + devlog tiếng Việt. Local-first, không gửi dữ liệu đi đâu.')
  .version(pkg.version);

program
  .command('wrapped')
  .description('Trang Wrapped (HTML) + card SVG cho toàn bộ lịch sử repo')
  .option('--repo <path>', 'repo cần wrap (mặc định: thư mục hiện tại)')
  .option('--author <name>', 'tên/email tác giả trong git (lặp lại được)', collect, [])
  .option('--since <when>', 'chỉ lấy từ mốc: 90d hoặc 2026-03-01')
  .option('--theme <name>', 'đêm | bình-minh | giấy')
  .option('--unit <unit>', 'week | month | quarter')
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

program.parseAsync(process.argv);
