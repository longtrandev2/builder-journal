// The one human question before writing. Enter = skip; non-interactive shells skip silently.
import readline from 'node:readline/promises';

export const HARDEST_QUESTION = 'Kỳ này vấp gì nhất? (Enter để bỏ qua) › ';

/** Returns the trimmed answer, or '' when skipped. `--hardest` (even "") wins over the prompt. */
export async function askHardest(opts) {
  if (typeof opts.hardest === 'string') return opts.hardest.trim();
  if (!process.stdin.isTTY) return '';
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(HARDEST_QUESTION)).trim();
  } finally {
    rl.close();
  }
}
