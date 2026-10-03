// Agent-log hardening: compaction summaries are not prompts, correction heuristic is bounded,
// parallel sessions never double-count active minutes, big logs stream in chunks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readClaudeCodeEvents, isCorrectionPrompt } from '../src/agents/claude-code-log-reader.js';
import { aggregateAgentActivity } from '../src/agents/agent-activity-aggregator.js';

/** Run fn with CLAUDE_CONFIG_DIR pointing at a temp dir holding one session file made of `lines`. */
function withSession(lines, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bj-claude-'));
  const proj = path.join(dir, 'projects', 'p');
  fs.mkdirSync(proj, { recursive: true });
  fs.writeFileSync(path.join(proj, 's.jsonl'), lines.map((l) => (typeof l === 'string' ? l : JSON.stringify(l))).join('\n'));
  const keep = process.env.CLAUDE_CONFIG_DIR;
  process.env.CLAUDE_CONFIG_DIR = dir;
  try {
    return fn();
  } finally {
    process.env.CLAUDE_CONFIG_DIR = keep;
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const user = (content, extra = {}, min = 0) => ({
  type: 'user', timestamp: new Date(Date.UTC(2026, 8, 20, 10, min)).toISOString(), cwd: '/w', sessionId: 's', message: { role: 'user', content }, ...extra,
});
const prompts = (ev) => ev.filter((e) => e.kind === 'prompt');

test('claude reader: compaction summaries are not prompts (flag + "session is being continued" text)', () => {
  withSession([
    user('Fix the header please', {}, 0),
    user('This session is being continued from a previous conversation that ran out of context. The summary: wrong, still failing, try again', {}, 1),
    user('Summary of earlier work: sai rồi làm lại', { isCompactSummary: true }, 2),
    user('Transcript only line', { isVisibleInTranscriptOnly: true }, 3),
    user([{ type: 'text', text: 'This session is being continued from a previous conversation...' }], {}, 4),
  ], () => {
    const p = prompts(readClaudeCodeEvents());
    assert.equal(p.length, 1);
    assert.equal(p[0].correction, false);
  });
});

test('correction heuristic: short prompts only, marker must be in the first 200 chars', () => {
  assert.equal(isCorrectionPrompt('sai rồi, làm lại'), true);
  assert.equal(isCorrectionPrompt(`${'x'.repeat(250)} wrong`), false, 'marker beyond char 200');
  assert.equal(isCorrectionPrompt(`wrong. ${'spec text '.repeat(70)}`), false, 'long prompt = pasted spec/log');
  assert.equal(isCorrectionPrompt(`Still failing ${'x'.repeat(100)}`), true);
});

const ev = (session, min, project = '/p') => ({ source: 'claude-code', kind: 'prompt', ts: new Date(Date.UTC(2026, 0, 1) + min * 60000).toISOString(), project, sessionId: session });

test('activeMinutes: two parallel sessions over the same hour count once', () => {
  const a = [ev('a', 0), ev('a', 20), ev('a', 40), ev('a', 60)];
  const b = [ev('b', 5, '/q'), ev('b', 25, '/q'), ev('b', 45, '/q'), ev('b', 60, '/q')];
  const solo = aggregateAgentActivity(a).activeMinutes;
  assert.equal(solo, 60);
  assert.equal(aggregateAgentActivity([...a, ...b]).activeMinutes, 60, 'overlap merged, not 120');
  // partial overlap: c runs 30..80 while a runs 0..60 → union = 80
  const c = [ev('c', 30), ev('c', 55), ev('c', 80)];
  assert.equal(aggregateAgentActivity([...a, ...c]).activeMinutes, 80);
});

test('activeMinutes: per-project / busiest-day credit adds up to the merged total', () => {
  const agg = aggregateAgentActivity([ev('a', 0), ev('a', 30), ev('b', 0, '/q'), ev('b', 30, '/q')]);
  assert.equal(agg.activeMinutes, 30);
  assert.equal(agg.projects.reduce((s, p) => s + p.activeMinutes, 0), 30);
  assert.equal(agg.busiestDay.minutes, 30);
});

test('large log: >1 MB file streams in chunks, multi-byte chars on chunk edges survive, bad lines skipped', () => {
  const lines = [];
  for (let i = 0; i < 3000; i++) lines.push(user(`Viết giúp mình hàm số ${i} — ${'ế'.repeat(200)}`, {}, i % 50));
  lines.splice(1500, 0, 'this is not json {{{');
  withSession(lines, () => {
    const p = prompts(readClaudeCodeEvents());
    assert.equal(p.length, 3000);
    assert.ok(p.every((e) => e.promptChars > 200));
  });
});
