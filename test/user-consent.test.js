// Consent: asked once and remembered, safe default in non-interactive shells, flags override.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const fakeHome = fs.mkdtempSync(path.join(os.tmpdir(), 'bj-home-'));
let consent;
const saved = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };

before(async () => {
  // os.homedir() reads these; the module computes its global path at import time.
  process.env.HOME = fakeHome;
  process.env.USERPROFILE = fakeHome;
  consent = await import(`../src/lib/user-consent.js?home=${Date.now()}`);
});
after(() => {
  Object.assign(process.env, saved);
  fs.rmSync(fakeHome, { recursive: true, force: true });
});

const quiet = async (fn) => {
  const orig = console.log;
  console.log = () => {};
  try {
    return await fn();
  } finally {
    console.log = orig;
  }
};

test('agent-log consent: non-interactive → off and not remembered; asked once then remembered', async () => {
  assert.equal(await quiet(() => consent.ensureAiLogConsent({}, { interactive: false })), false);
  assert.equal(consent.readGlobalConfig().readAgentLogs, undefined);
  let asked = 0;
  const ask = async () => { asked++; return ''; }; // Enter = default yes
  assert.equal(await consent.ensureAiLogConsent({}, { ask, interactive: true }), true);
  assert.equal(await consent.ensureAiLogConsent({}, { ask, interactive: true }), true);
  assert.equal(asked, 1, 'asked only once');
  assert.equal(await consent.ensureAiLogConsent({ ai: false }), false, '--no-ai wins and is remembered');
  assert.equal(await consent.ensureAiLogConsent({}, { ask, interactive: true }), false);
});

test('confirmRepos drops chosen numbers; aliasNames is stable', async () => {
  const repos = [{ name: 'a' }, { name: 'b' }, { name: 'c' }];
  const kept = await quiet(() => consent.confirmRepos(repos, {}, { ask: async () => '1, 3', interactive: true }));
  assert.deepEqual(kept.map((r) => r.name), ['b']);
  const all = await quiet(() => consent.confirmRepos(repos, {}, { interactive: false }));
  assert.equal(all.length, 3);
  const map = consent.aliasNames(['x', 'y', 'x']);
  assert.equal(map.get('x'), 'Repo A');
  assert.equal(map.get('y'), 'Repo B');
});
