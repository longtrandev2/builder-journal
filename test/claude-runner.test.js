// Narrator safety: claude runs with no tools / no MCP, timeouts kill the whole process tree,
// --narrator-timeout is validated. A fake `claude` on PATH stands in for the real CLI.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { runClaude, narratorArgs } from '../src/narrator/claude-runner.js';

const BIN = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'builder-journal.js');

/** Fake claude: records argv + pid, then answers, hangs, or rejects optional flags depending on FAKE_MODE. */
function installFakeClaude() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bj-fake-claude-'));
  fs.writeFileSync(path.join(dir, 'fake.js'), [
    "const fs = require('fs'), path = require('path');",
    "const d = __dirname, args = process.argv.slice(2);",
    "fs.appendFileSync(path.join(d, 'calls.log'), JSON.stringify(args) + '\\n');",
    "fs.writeFileSync(path.join(d, 'pid.txt'), String(process.pid));",
    "if (process.env.FAKE_MODE === 'hang') setInterval(() => {}, 1000);",
    "else if (process.env.FAKE_MODE === 'old' && args.includes('--no-session-persistence')) { console.error(\"error: unknown option '--no-session-persistence'\"); process.exit(1); }",
    "else { process.stdin.resume(); process.stdin.on('end', () => console.log('NOI NHAT: ok')); }",
  ].join('\n'));
  if (process.platform === 'win32') {
    fs.writeFileSync(path.join(dir, 'claude.cmd'), '@echo off\r\nnode "%~dp0fake.js" %*\r\n');
  } else {
    fs.writeFileSync(path.join(dir, 'claude'), '#!/bin/sh\nexec node "$(dirname "$0")/fake.js" "$@"\n', { mode: 0o755 });
  }
  return dir;
}

const calls = (dir) => fs.readFileSync(path.join(dir, 'calls.log'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));

async function withFake(mode, fn) {
  const dir = installFakeClaude();
  const keep = { PATH: process.env.PATH, FAKE_MODE: process.env.FAKE_MODE };
  // Fake first, and drop PATH entries holding a REAL claude so the test never calls the real CLI.
  const hasClaude = (d) => ['claude', 'claude.exe', 'claude.cmd'].some((n) => fs.existsSync(path.join(d, n)));
  process.env.PATH = [dir, ...keep.PATH.split(path.delimiter).filter((d) => d && !hasClaude(d))].join(path.delimiter);
  process.env.FAKE_MODE = mode;
  try {
    return await fn(dir);
  } finally {
    process.env.PATH = keep.PATH;
    if (keep.FAKE_MODE === undefined) delete process.env.FAKE_MODE;
    else process.env.FAKE_MODE = keep.FAKE_MODE;
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('narrator args: no tools, no MCP, no project settings, no saved session', () => {
  const args = narratorArgs(true);
  assert.deepEqual(args.slice(0, 4), ['-p', '--tools', '', '--strict-mcp-config']);
  assert.ok(args.includes('--no-session-persistence') && args.includes('--disable-slash-commands'));
  assert.deepEqual(args.slice(args.indexOf('--setting-sources'), args.indexOf('--setting-sources') + 2), ['--setting-sources', 'user']);
  assert.deepEqual(narratorArgs(false), ['-p', '--tools', '', '--strict-mcp-config'], 'lock-down flags are never optional');
});

test('runClaude passes the lock-down flags (incl. the empty --tools value) and returns the answer', async () => {
  await withFake('ok', async (dir) => {
    const res = await runClaude('prompt', 15000);
    assert.equal(res.ok, true);
    assert.match(res.text, /NOI NHAT: ok/);
    const [argv] = calls(dir);
    assert.equal(argv[argv.indexOf('--tools') + 1], '', 'empty --tools value must survive quoting');
    assert.ok(argv.includes('--strict-mcp-config'));
  });
});

test('runClaude retries with only required flags when optional ones are unknown (old claude)', async () => {
  await withFake('old', async (dir) => {
    const res = await runClaude('prompt', 15000);
    assert.equal(res.ok, true);
    const all = calls(dir);
    assert.equal(all.length, 2);
    assert.ok(all[0].includes('--no-session-persistence') && !all[1].includes('--no-session-persistence'));
    assert.ok(all[1].includes('--strict-mcp-config'), 'required flags stay on the retry');
  });
});

test('runClaude timeout → reason "timeout" and the child process is really gone', async () => {
  await withFake('hang', async (dir) => {
    const t0 = Date.now();
    const res = await runClaude('prompt', 1500);
    assert.deepEqual([res.ok, res.reason], [false, 'timeout']);
    assert.ok(Date.now() - t0 < 10000);
    await new Promise((r) => setTimeout(r, 500));
    const pid = Number(fs.readFileSync(path.join(dir, 'pid.txt'), 'utf8'));
    assert.throws(() => process.kill(pid, 0), 'grandchild node process survived the timeout');
  });
});

test('--narrator-timeout: junk / zero / negative → friendly error, valid number accepted', () => {
  for (const bad of ['abc', '0', '-5', '1.5', '']) {
    const r = spawnSync(process.execPath, [BIN, 'last', '--narrator-timeout', bad], { encoding: 'utf8' });
    assert.notEqual(r.status, 0, bad);
    assert.match(r.stderr, /--narrator-timeout.*số nguyên dương/, bad);
  }
  const ok = spawnSync(process.execPath, [BIN, 'last', '--narrator-timeout', '5000', '--repo', os.tmpdir()], { encoding: 'utf8' });
  assert.ok(!/số nguyên dương/.test(ok.stderr));
});
