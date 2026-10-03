// BETA: reads Codex CLI rollout logs (~/.codex/sessions/**/rollout-*.jsonl) into normalized events.
// PRIVACY: prompt text is inspected only to classify it, then dropped — never stored or returned.
import os from 'node:os';
import path from 'node:path';
import { isCorrectionPrompt, isStaleFile, listJsonlFiles, parseJsonlLines, sinceMs } from './claude-code-log-reader.js';

const TOOL_TYPES = new Set(['function_call', 'local_shell_call', 'custom_tool_call']);

export function codexSessionsDir() {
  return path.join(process.env.CODEX_HOME || path.join(os.homedir(), '.codex'), 'sessions');
}

/** Prompt text → event fields, or null for injected context (<environment_context>, AGENTS.md dumps…). */
function promptFields(text) {
  if (typeof text !== 'string') return null;
  const t = text.trimStart();
  if (!t || t.startsWith('<') || t.startsWith('# AGENTS.md')) return null;
  return { promptChars: text.length, correction: isCorrectionPrompt(text) };
}

function userMessageText(payload) {
  if (!Array.isArray(payload.content)) return null;
  return payload.content.filter((b) => b && b.type === 'input_text').map((b) => b.text).join('\n');
}

/** Events from one rollout file. */
function readFileEvents(file, cutoff) {
  const sessionId = path.basename(file, '.jsonl');
  let cwd = null;
  let model = null;
  let usageEv = null; // single assistant event carrying the session's max cumulative tokens
  const msgPrompts = []; // event_msg/user_message prompts (preferred)
  const itemPrompts = []; // response_item user messages (fallback when no event_msg ones exist)
  const tools = [];
  const mk = (ts, extra) => ({ source: 'codex', ts, project: cwd, sessionId, ...extra });

  for (const line of parseJsonlLines(file)) {
    const p = line.payload;
    if (!p || typeof p !== 'object') continue;
    if (line.type === 'session_meta' || line.type === 'turn_context') {
      if (typeof p.cwd === 'string') cwd = p.cwd;
      if (typeof p.model === 'string') model = p.model;
      continue;
    }
    const ts = typeof line.timestamp === 'string' ? line.timestamp : null;
    if (!ts || (cutoff && Date.parse(ts) < cutoff)) continue;

    if (line.type === 'event_msg' && p.type === 'user_message') {
      const f = promptFields(p.message);
      if (f) msgPrompts.push(mk(ts, { kind: 'prompt', ...f }));
    } else if (line.type === 'event_msg' && p.type === 'token_count') {
      const u = p.info && p.info.total_token_usage;
      if (!u) continue;
      const out = u.output_tokens || 0;
      const inn = u.input_tokens || 0;
      if (!usageEv) usageEv = mk(ts, { kind: 'assistant', model, outTokens: 0, inTokens: 0 });
      usageEv.ts = ts;
      usageEv.model = model;
      usageEv.outTokens = Math.max(usageEv.outTokens, out);
      usageEv.inTokens = Math.max(usageEv.inTokens, inn);
    } else if (line.type === 'response_item') {
      if (p.type === 'message' && p.role === 'user') {
        const f = promptFields(userMessageText(p));
        if (f) itemPrompts.push(mk(ts, { kind: 'prompt', ...f }));
      } else if (TOOL_TYPES.has(p.type)) {
        tools.push(mk(ts, { kind: 'tool', tool: p.name || p.type }));
      }
    }
  }
  return [...(msgPrompts.length ? msgPrompts : itemPrompts), ...tools, ...(usageEv ? [usageEv] : [])];
}

/** Read all Codex activity since `since`. Never throws; missing dir → []. */
export function readCodexEvents({ since } = {}) {
  const cutoff = sinceMs(since);
  const events = [];
  const files = listJsonlFiles(codexSessionsDir(), (f) => path.basename(f).startsWith('rollout-'));
  for (const file of files) {
    if (isStaleFile(file, cutoff)) continue;
    events.push(...readFileEvents(file, cutoff));
  }
  return events;
}
