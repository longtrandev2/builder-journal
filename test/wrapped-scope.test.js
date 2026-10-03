// Fairness of AI-vs-git comparisons: both sides must cover the same agent-log window.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLeverage, commitHoursInRange, commitsInRange, shareSafe } from '../src/wrapped/wrapped-scope-builder.js';

const commit = (date, ins = 10) => ({ date, numstat: [{ path: 'src/a.js', ins, del: 0 }] });
const commits = [
  commit('2026-03-01T10:00:00+07:00', 1000), // long before the log window
  commit('2026-09-10T16:30:00+07:00', 30),
  commit('2026-09-20T00:15:00+07:00', 20),
];
const ai = { prompts: 10, range: { from: '2026-09-07T00:00:00Z', to: '2026-10-02T00:00:00Z' } };

test('leverage counts only commits inside the agent-log window', () => {
  const lev = buildLeverage(commits, ai);
  assert.equal(lev.commits, 2);
  assert.equal(lev.codeLines, 50);
  assert.equal(lev.linesPerPrompt, 5);
});

test('leverage is null without prompts or without commits in the window', () => {
  assert.equal(buildLeverage(commits, null), null);
  assert.equal(buildLeverage([commits[0]], ai), null);
});

test('commit hours use the commit\'s own local clock, window only', () => {
  const hours = commitHoursInRange(commits, ai.range);
  assert.equal(hours[16], 1);
  assert.equal(hours[0], 1);
  assert.equal(hours[10], 0, 'the March commit is outside the window');
  assert.equal(commitsInRange(commits, ai.range).length, 2);
});

test('shareSafe strips absolute paths from projects and repos', () => {
  const out = shareSafe(
    { prompts: 1, projects: [{ path: 'C:\\Users\\me\\client-x', name: 'client-x', prompts: 1, activeMinutes: 5 }] },
    [{ path: '/home/me/client-x', name: 'client-x', commits: 3, sessions: 1, codeLines: 9 }],
  );
  assert.ok(!JSON.stringify(out).includes('Users') && !JSON.stringify(out).includes('/home/'));
  assert.equal(out.repos[0].name, 'client-x');
});
