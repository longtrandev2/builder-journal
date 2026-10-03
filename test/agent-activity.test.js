// Tests: Claude Code + Codex log readers, aggregator rules, repo discovery, privacy.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { readClaudeCodeEvents } from '../src/agents/claude-code-log-reader.js';
import { readCodexEvents } from '../src/agents/codex-log-reader.js';
import { aggregateAgentActivity } from '../src/agents/agent-activity-aggregator.js';
import { discoverRepos } from '../src/agents/repo-discovery.js';
import { readAgentActivity } from '../src/agents/read-agent-activity.js';

const FIX = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'agents');
process.env.CLAUDE_CONFIG_DIR = path.join(FIX, 'claude');
process.env.CODEX_HOME = path.join(FIX, 'codex');

const prompts = (events) => events.filter((e) => e.kind === 'prompt');

test('claude reader: only human prompts (no meta, <command, tool_result, subagent, bad json)', () => {
  const ev = readClaudeCodeEvents();
  const p = prompts(ev);
  assert.equal(p.length, 4); // s1: 3 + s2: 1
  assert.equal(p.filter((e) => e.correction).length, 2); // "sai rồi, làm lại" + "Wrong again"
  assert.ok(p.every((e) => e.source === 'claude-code' && e.promptChars > 0 && e.sessionId));
  assert.ok(ev.filter((e) => e.kind === 'tool').some((e) => e.tool === 'Read')); // subagent tools still counted
});

test('claude reader: streamed assistant blocks dedupe by message id (max tokens)', () => {
  const asst = readClaudeCodeEvents().filter((e) => e.kind === 'assistant');
  const m1 = asst.filter((e) => e.model === 'glm-5' && e.outTokens === 200);
  assert.equal(m1.length, 1);
});

test('claude reader: since cutoff drops older events', () => {
  assert.equal(prompts(readClaudeCodeEvents({ since: '2026-09-21' })).length, 1);
});

test('aggregate: totals, actions, models, tokens from fixtures', () => {
  const a = readAgentActivity();
  assert.deepEqual(a.sources.sort(), ['claude-code', 'codex']);
  assert.equal(a.prompts, 6); // 4 claude + 2 codex
  assert.equal(a.corrections, 3);
  assert.equal(a.actions.edits, 3); // Edit, Write, apply_patch
  assert.equal(a.actions.commands, 3); // Bash, shell, local_shell_call
  assert.equal(a.actions.reads, 1);
  assert.equal(a.actions.total, 7);
  assert.equal(a.tokens.output, 238 + 50);
  assert.equal(a.tokens.input, 36 + 300);
  assert.ok(!a.models.some((m) => m.name === '<synthetic>'));
  assert.equal(a.models.find((m) => m.name === 'glm-5').count, 3);
  assert.equal(a.promptHours.reduce((x, y) => x + y, 0), 6);
  assert.equal(a.promptHours[a.peakPromptHour], Math.max(...a.promptHours));
  assert.equal(a.agentSessions, 3); // s1, s2, codex rollout
  assert.ok(a.busiestDay.minutes > 0 && /^\d{4}-\d\d-\d\d$/.test(a.busiestDay.date));
  const alpha = a.projects.find((p) => p.name === 'Alpha');
  assert.equal(alpha.prompts, 3);
  assert.equal(alpha.activeMinutes, 20);
  assert.equal(a.projects[0].name, 'Alpha'); // sorted by activeMinutes desc
});

test('activeMinutes: 30 min gap counted, 31 min gap is idle', () => {
  const ev = (min) => ({ source: 'claude-code', kind: 'prompt', ts: new Date(Date.UTC(2026, 0, 1) + min * 60000).toISOString(), project: '/p', sessionId: 's' });
  assert.equal(aggregateAgentActivity([ev(0), ev(30)]).activeMinutes, 30);
  assert.equal(aggregateAgentActivity([ev(0), ev(31)]).activeMinutes, 0);
  assert.equal(aggregateAgentActivity([ev(0), ev(30), ev(61)]).activeMinutes, 30);
});

test('project filter: subfolder counts, separators normalized, case-insensitive on win32', () => {
  const all = [...readClaudeCodeEvents(), ...readCodexEvents()];
  const beta = aggregateAgentActivity(all, { projects: ['C:/Users/Test/Code/Beta/'] });
  assert.equal(beta.prompts, 1); // event cwd is Beta\packages\web
  assert.equal(aggregateAgentActivity(all, { projects: ['C:\\Users\\Test\\Code\\Bet'] }), null); // prefix != parent dir
  if (process.platform === 'win32') {
    assert.equal(aggregateAgentActivity(all, { projects: ['c:\\USERS\\test\\code\\ALPHA'] }).prompts, 3);
  }
});

test('aggregate: null when there are no prompts', () => {
  assert.equal(aggregateAgentActivity([]), null);
  assert.equal(aggregateAgentActivity([{ source: 'codex', kind: 'tool', tool: 'shell', ts: '2026-01-01T00:00:00Z', sessionId: 's', project: null }]), null);
});

test('codex reader: dedupes user message, max cumulative tokens, tool types', () => {
  const ev = readCodexEvents();
  assert.equal(prompts(ev).length, 2);
  assert.equal(prompts(ev).filter((e) => e.correction).length, 1);
  assert.deepEqual(ev.filter((e) => e.kind === 'tool').map((e) => e.tool).sort(), ['apply_patch', 'local_shell_call', 'shell']);
  const usage = ev.filter((e) => e.kind === 'assistant');
  assert.equal(usage.length, 1);
  assert.deepEqual([usage[0].inTokens, usage[0].outTokens, usage[0].model], [300, 50, 'gpt-5-codex']);
  assert.ok(ev.every((e) => e.project === 'C:\\Users\\Test\\Code\\CodexProj'));
});

test('codex reader: falls back to response_item prompts when no event_msg; missing dir → []', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bj-codex-'));
  const day = path.join(dir, 'sessions', '2026', '09', '21');
  fs.mkdirSync(day, { recursive: true });
  const line = (o) => JSON.stringify(o);
  fs.writeFileSync(path.join(day, 'rollout-x.jsonl'), [
    line({ timestamp: '2026-09-21T01:00:00Z', type: 'session_meta', payload: { cwd: '/w' } }),
    line({ timestamp: '2026-09-21T01:00:01Z', type: 'response_item', payload: { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'hello world' }] } }),
  ].join('\n'));
  const keep = process.env.CODEX_HOME;
  try {
    process.env.CODEX_HOME = dir;
    assert.equal(prompts(readCodexEvents()).length, 1);
    process.env.CODEX_HOME = path.join(dir, 'does-not-exist');
    assert.deepEqual(readCodexEvents(), []);
  } finally {
    process.env.CODEX_HOME = keep;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('facade: missing dirs → null, never throws', () => {
  const keep = [process.env.CLAUDE_CONFIG_DIR, process.env.CODEX_HOME];
  try {
    process.env.CLAUDE_CONFIG_DIR = process.env.CODEX_HOME = path.join(os.tmpdir(), 'bj-no-such-dir-xyz');
    assert.equal(readAgentActivity(), null);
  } finally {
    [process.env.CLAUDE_CONFIG_DIR, process.env.CODEX_HOME] = keep;
  }
});

test('privacy: aggregate never contains prompt text', () => {
  const json = JSON.stringify(readAgentActivity()) + JSON.stringify(readClaudeCodeEvents()) + JSON.stringify(readCodexEvents());
  assert.ok(!json.includes('FIXTURE-SECRET'));
  assert.ok(!/login page|Refactor the header|Build a parser|làm lại/.test(json));
});

test('repo discovery: git repos only, deduped by toplevel, exclude by name', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bj-repo-'));
  const keepCeiling = process.env.GIT_CEILING_DIRECTORIES;
  process.env.GIT_CEILING_DIRECTORIES = tmp; // tmp may itself sit inside a git repo (e.g. home dir)
  try {
    const repo = path.join(tmp, 'my-repo');
    const sub = path.join(repo, 'src');
    const plain = path.join(tmp, 'plain-dir');
    for (const d of [sub, plain]) fs.mkdirSync(d, { recursive: true });
    assert.equal(spawnSync('git', ['init', '-q', repo]).status, 0);
    const proj = (p, prompts, activeMinutes) => ({ path: p, name: path.basename(p), prompts, activeMinutes, lastActive: '2026-09-20T00:00:00Z' });
    const activity = { projects: [proj(repo, 2, 10), proj(sub, 3, 5), proj(plain, 9, 99), proj(path.join(tmp, 'gone'), 1, 1)] };
    const repos = await discoverRepos(activity);
    assert.equal(repos.length, 1);
    assert.deepEqual([repos[0].name, repos[0].prompts, repos[0].activeMinutes], ['my-repo', 5, 15]);
    assert.equal((await discoverRepos(activity, { exclude: ['MY-REPO'] })).length, 0);
    assert.equal((await discoverRepos(null)).length, 0);
  } finally {
    if (keepCeiling === undefined) delete process.env.GIT_CEILING_DIRECTORIES;
    else process.env.GIT_CEILING_DIRECTORIES = keepCeiling;
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
