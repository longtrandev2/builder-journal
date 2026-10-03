// When `claude -p` is unavailable: save the prompt so the user can paste it into ANY AI chat,
// then rerun with --narrative <file>. Works on every machine, no API key needed.
import fs from 'node:fs';
import { dateStamp, journalFile, displayPath, ensureJournal } from '../lib/journal-paths.js';
import { UserFacingError } from '../lib/run-git.js';

const PENDING = 'pending.json';

export function writePromptFile(repo, prompt, rerunCommand) {
  ensureJournal(repo);
  const file = journalFile(repo, `narrator-prompt-${dateStamp()}.md`);
  const answerFile = displayPath(journalFile(repo, 'narrative.md'));
  const header = `<!--
Hướng dẫn: copy toàn bộ phần bên dưới đường kẻ, dán vào chat AI bất kỳ (ChatGPT, Gemini, Claude, Copilot…).
Lưu câu trả lời của AI vào file: ${answerFile}
Rồi chạy: ${rerunCommand} --narrative "${answerFile}"
-->

---

`;
  fs.writeFileSync(file, header + prompt);
  return { file, answerFile };
}

/**
 * Remember WHICH commits the prompt was built from. The --narrative rerun reads up to this exact head,
 * so commits made while you were chatting with the AI are never swallowed by the ledger.
 */
export function writePending(repo, { head, mode, when, authors }) {
  const data = { head, mode, when: when || null, authors, createdAt: new Date().toISOString() };
  fs.writeFileSync(journalFile(repo, PENDING), JSON.stringify(data, null, 2) + '\n');
}

/** Tolerant read: missing/corrupt → null. */
export function readPending(repo) {
  try {
    const p = JSON.parse(fs.readFileSync(journalFile(repo, PENDING), 'utf8'));
    return p && typeof p.head === 'string' ? p : null;
  } catch {
    return null;
  }
}

/** Remove the saved boundary — only when it belongs to the same command (mode + when) that just finished. */
export function clearPending(repo, { mode, when } = {}) {
  const p = readPending(repo);
  if (p && p.mode === mode && (p.when || '') === (when || '')) fs.rmSync(journalFile(repo, PENDING), { force: true });
}

export function printFallbackHelp({ file, answerFile }, rerunCommand, reason) {
  if (reason) console.log(`\nChưa gọi được AI (${reason}) — chuyển sang chế độ thủ công.`);
  console.log(`1. Mở ${displayPath(file)}, copy phần dưới đường kẻ, dán vào chat AI bất kỳ.`);
  console.log(`2. Lưu câu trả lời vào ${answerFile}`);
  console.log(`3. Chạy: ${rerunCommand} --narrative "${answerFile}"`);
}

export function readNarrativeFile(file) {
  if (!fs.existsSync(file)) throw new UserFacingError(`Không tìm thấy file narrative: ${file}`);
  return fs.readFileSync(file, 'utf8');
}
