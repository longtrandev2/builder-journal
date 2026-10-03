// `bj` with no arguments in an interactive terminal: a numbered Vietnamese menu of what the tool
// can do. Picking an item just builds the normal CLI arguments — the menu never adds behaviour of
// its own, so every choice maps to a command you could also type directly (printed for learning).
import readline from 'node:readline/promises';

export const MENU_ITEMS = [
  { label: 'Wrapped của repo này', hint: 'trang Wrapped toàn bộ lịch sử repo hiện tại', args: ['wrapped'] },
  { label: 'Wrapped của bạn (mọi repo)', hint: 'gộp mọi repo tìm thấy trong log agent', args: ['wrapped', '--all'] },
  { label: 'Card tuần', hint: '1 màn cho 7 ngày gần nhất, tải ảnh đăng group', args: ['wrapped', '--week'] },
  { label: 'Cập nhật bản mới nhất', hint: 'npm i -g builder-journal@latest', args: ['update'] },
  { label: 'Xem tất cả lệnh và cờ', hint: '--help', args: ['--help'] },
];

/** Render the menu text (exported for tests). */
export function menuText(items = MENU_ITEMS) {
  const lines = items.map((it, i) => `  ${i + 1}. ${it.label.padEnd(30)} ${it.hint}`);
  return ['builder-journal — chọn việc muốn làm:', '', ...lines, '', '  0. Thoát'].join('\n');
}

/**
 * Map an answer to CLI args. Returns null for exit / invalid input.
 * @param {string} answer  menu number typed by the user
 * @param {string} [extra] answer to the follow-up question (since)
 */
export function argsForChoice(answer, extra, items = MENU_ITEMS) {
  const n = Number(String(answer).trim());
  if (!Number.isInteger(n) || n < 1 || n > items.length) return null;
  const item = items[n - 1];
  if (!item.ask) return [...item.args];
  const when = String(extra || '').trim();
  return when ? [...item.args, when] : null;
}

/**
 * Show the menu, ask once, return the args to run (or null to exit).
 * @param {(q: string) => Promise<string>} [ask] injectable for tests
 */
export async function runMenu(ask) {
  const rl = ask ? null : readline.createInterface({ input: process.stdin, output: process.stdout });
  const question = ask || ((q) => rl.question(q));
  try {
    console.log(menuText());
    const answer = await question('\nNhập số › ');
    const n = Number(String(answer).trim());
    const item = MENU_ITEMS[n - 1];
    const extra = item?.ask ? await question(item.ask) : undefined;
    const args = argsForChoice(answer, extra);
    if (!args) {
      if (String(answer).trim() !== '0') console.log('Không có lựa chọn đó — gõ `bj --help` để xem mọi lệnh.');
      return null;
    }
    console.log(`\n→ bj ${args.join(' ')}   (lần sau gõ thẳng lệnh này)\n`);
    return args;
  } finally {
    rl?.close();
  }
}
