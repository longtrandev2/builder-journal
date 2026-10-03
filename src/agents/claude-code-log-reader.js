// Reads Claude Code session logs (~/.claude/projects/**.jsonl) into normalized, privacy-safe events.
// PRIVACY: prompt text is inspected only to classify it, then dropped — never stored or returned.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { StringDecoder } from 'node:string_decoder';

// Vietnamese + English "the agent got it wrong / try again" markers. Crude on purpose.
const CORRECTION_RE = /sai rồi|không phải|chưa đúng|làm lại|vẫn lỗi|vẫn bị|lỗi rồi|không chạy|wrong|still (broken|failing|not)|try again|doesn't work/i;

const CORRECTION_MAX_CHARS = 600; // long prompts are specs / pasted logs, not "you got it wrong"
const CORRECTION_SCAN_CHARS = 200; // a real correction says so up front

export function isCorrectionPrompt(text) {
  const s = String(text);
  return s.length <= CORRECTION_MAX_CHARS && CORRECTION_RE.test(s.slice(0, CORRECTION_SCAN_CHARS));
}

// Auto-generated "user" lines after /compact or context overflow — not typed by the human.
const CONTINUATION_RE = /^this session is being continued from a previous conversation/i;

/** Normalize `since` (Date | ISO string | ms) to epoch ms, or 0 when absent/invalid. */
export function sinceMs(since) {
  if (!since) return 0;
  const ms = since instanceof Date ? since.getTime() : new Date(since).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

/** Recursively list files ending with `.jsonl` accepted by `accept(fullPath)`. Missing dir → []. */
export function listJsonlFiles(dir, accept = () => true) {
  const out = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listJsonlFiles(full, accept));
    else if (e.name.endsWith('.jsonl') && accept(full)) out.push(full);
  }
  return out;
}

const CHUNK_BYTES = 1024 * 1024;

/** Yield the lines of a file reading 1 MB at a time (sync, constant memory — session logs reach 100s of MB). */
function* readLines(file) {
  let fd;
  try {
    fd = fs.openSync(file, 'r');
  } catch {
    return;
  }
  const decoder = new StringDecoder('utf8'); // keeps multi-byte chars intact across chunk edges
  const buf = Buffer.allocUnsafe(CHUNK_BYTES);
  let rest = '';
  try {
    for (;;) {
      const n = fs.readSync(fd, buf, 0, CHUNK_BYTES, null);
      if (n === 0) break;
      const parts = (rest + decoder.write(buf.subarray(0, n))).split('\n');
      rest = parts.pop();
      yield* parts;
    }
    rest += decoder.end();
    if (rest) yield rest;
  } catch {
    /* unreadable mid-way: keep what we already yielded */
  } finally {
    fs.closeSync(fd);
  }
}

/** Parse a JSONL file line by line; bad lines and unreadable files are skipped silently. */
export function* parseJsonlLines(file) {
  for (const line of readLines(file)) {
    if (!line || line.charCodeAt(0) !== 123) continue; // cheap "starts with {" check
    try {
      const obj = JSON.parse(line);
      if (obj && typeof obj === 'object') yield obj;
    } catch {
      /* skip corrupt line */
    }
  }
}

/** True when file mtime is older than the `since` cutoff (nothing in it can be newer). */
export function isStaleFile(file, cutoff) {
  if (!cutoff) return false;
  try {
    return fs.statSync(file).mtimeMs < cutoff;
  } catch {
    return true;
  }
}

/** Human prompt text → { chars, correction } or null if it is a wrapper/system/tool message. */
function classifyPrompt(content) {
  let text = null;
  if (typeof content === 'string') text = content;
  else if (Array.isArray(content)) {
    if (content.some((b) => b && b.type === 'tool_result')) return null;
    text = content.filter((b) => b && b.type === 'text' && typeof b.text === 'string').map((b) => b.text).join('\n');
  }
  if (text === null) return null;
  const trimmed = text.trimStart();
  if (!trimmed || trimmed.startsWith('<') || trimmed.startsWith('[Request interrupted') || CONTINUATION_RE.test(trimmed)) return null;
  return { chars: text.length, correction: isCorrectionPrompt(text) };
}

export function claudeProjectsDir() {
  return path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'projects');
}

/** Events from one Claude Code session file. */
function readFileEvents(file, cutoff) {
  const isSubagent = file.split(path.sep).includes('subagents');
  const events = [];
  const messages = new Map(); // assistant message.id → event (streamed blocks repeat usage; keep max)
  for (const line of parseJsonlLines(file)) {
    const ts = typeof line.timestamp === 'string' ? line.timestamp : null;
    if (!ts || (cutoff && Date.parse(ts) < cutoff)) continue;
    const base = { source: 'claude-code', ts, project: typeof line.cwd === 'string' ? line.cwd : null, sessionId: line.sessionId || path.basename(file, '.jsonl') };
    const msg = line.message;
    if (line.type === 'user' && !line.isMeta && !line.isCompactSummary && !line.isVisibleInTranscriptOnly && !isSubagent && !line.isSidechain && msg) {
      const p = classifyPrompt(msg.content);
      if (p) events.push({ ...base, kind: 'prompt', promptChars: p.chars, correction: p.correction });
    } else if (line.type === 'assistant' && msg) {
      const usage = msg.usage || {};
      const key = msg.id || line.uuid;
      let ev = messages.get(key);
      if (!ev) {
        ev = { ...base, kind: 'assistant', model: msg.model || null, outTokens: 0, inTokens: 0 };
        messages.set(key, ev);
        events.push(ev);
      }
      ev.outTokens = Math.max(ev.outTokens, usage.output_tokens || 0);
      ev.inTokens = Math.max(ev.inTokens, usage.input_tokens || 0);
      if (Array.isArray(msg.content)) {
        for (const b of msg.content) {
          if (b && b.type === 'tool_use' && b.name) events.push({ ...base, kind: 'tool', tool: b.name });
        }
      }
    }
  }
  return events;
}

/** Read all Claude Code activity since `since`. Never throws; missing dir → []. */
export function readClaudeCodeEvents({ since } = {}) {
  const cutoff = sinceMs(since);
  const events = [];
  for (const file of listJsonlFiles(claudeProjectsDir())) {
    if (isStaleFile(file, cutoff)) continue;
    events.push(...readFileEvents(file, cutoff));
  }
  return events;
}
