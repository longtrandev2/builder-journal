// Integration: range modes, ledger no-overlap, backfill seeding, status — on temp git repos.
// Narrator is bypassed with --narrative files so tests never call an AI.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeRepo, commitAt, cleanup } from './helpers/temp-git-repo.js';
import { runDevlog } from '../src/devlog-command.js';
import { runStatus } from '../src/status-command.js';
import { readLedger } from '../src/ledger/journal-ledger.js';
import { resolvePeriod } from '../src/devlog-period-resolver.js';

const AUTHORS = ['Tester'];

/** Run fn with console.log captured. */
async function quiet(fn) {
  const lines = [];
  const orig = console.log;
  console.log = (...a) => lines.push(a.join(' '));
  try {
    await fn();
  } finally {
    console.log = orig;
  }
  return lines.join('\n');
}

function narrativeFile(dir) {
  const f = path.join(dir, 'narrative.md');
  fs.writeFileSync(f, 'NỔI NHẤT: xong bộ đọc git\nCÂU CHUYỆN: Mình viết lại phần gộp buổi vì cách cũ đếm sai.');
  return f;
}

test('thin repo widens 7→14 days; nothing in 21 days → friendly error', () => {
  const dir = makeRepo();
  try {
    commitAt(dir, 10);
    commitAt(dir, 12);
    commitAt(dir, 13);
    const plan = resolvePeriod(dir, { mode: 'last' }, AUTHORS);
    assert.equal(plan.mode, 'first-run');
    assert.equal(plan.widened, true);
    assert.equal(plan.period.stats.commits, 3);
  } finally {
    cleanup(dir);
  }
  const old = makeRepo();
  try {
    commitAt(old, 40);
    assert.throws(() => resolvePeriod(old, { mode: 'last' }, AUTHORS), /Không tìm thấy commit nào trong 21 ngày/);
  } finally {
    cleanup(old);
  }
});

test('ledger: two `last` runs never share a commit; nothing new → exit 0 message', async () => {
  const dir = makeRepo();
  try {
    for (let i = 0; i < 4; i++) commitAt(dir, 2, { minutes: i * 30 });
    const narrative = narrativeFile(dir);
    await quiet(() => runDevlog({ mode: 'last', repo: dir, narrative, hardest: '' }));
    const first = readLedger(dir);
    assert.equal(first.length, 1);
    assert.equal(first[0].stats.commits, 4);

    commitAt(dir, 0, { minutes: 10 });
    await quiet(() => runDevlog({ mode: 'last', repo: dir, narrative, hardest: 'test' }));
    const second = readLedger(dir);
    assert.equal(second.length, 2);
    assert.equal(second[1].stats.commits, 1, 'only the untold commit');

    const out = await quiet(() => runDevlog({ mode: 'last', repo: dir, narrative, hardest: '' }));
    assert.match(out, /Không có commit mới kể từ lần cuối/);
    assert.match(await quiet(() => runStatus({ repo: dir })), /Chưa kể: 0 commits/);

    const devlogs = fs.readdirSync(path.join(dir, '.journal')).filter((f) => f.startsWith('devlog-'));
    assert.equal(devlogs.length, 2, 'same-day runs get -2 suffix, never overwrite');
    const second2 = devlogs.find((f) => f.endsWith('-2.md'));
    assert.ok(second2, 'second run uses -2 suffix');
    const post = fs.readFileSync(path.join(dir, '.journal', second2), 'utf8');
    assert.match(post, /Vấp thật: test/);
    assert.match(post, /1 buổi code \/ 1 commits/);
    const exclude = fs.readFileSync(path.join(dir, '.git', 'info', 'exclude'), 'utf8');
    assert.match(exclude, /\.journal\//);
  } finally {
    cleanup(dir);
  }
});

test('backfill: since > 14 days seeds one ledger line per non-empty week + one devlog', async () => {
  const dir = makeRepo();
  try {
    commitAt(dir, 60);
    commitAt(dir, 59);
    commitAt(dir, 30);
    commitAt(dir, 3);
    const since = new Date(Date.now() - 70 * 86400000).toISOString().slice(0, 10);
    await quiet(() => runDevlog({ mode: 'since', when: since, repo: dir, narrative: narrativeFile(dir), hardest: '' }));
    const ledger = readLedger(dir);
    assert.ok(ledger.length >= 3 && ledger.length <= 4, `weeks: ${ledger.length}`);
    assert.ok(ledger.every((e) => e.seeded === true));
    assert.equal(new Set(ledger.map((e) => e.output_file)).size, 1, 'one aggregate devlog');
    const hashes = ledger.map((e) => e.last_commit_hash);
    assert.equal(new Set(hashes).size, hashes.length, 'adjacent periods do not overlap');
  } finally {
    cleanup(dir);
  }
});

test('missing narrative file → friendly error, ledger untouched', async () => {
  const dir = makeRepo();
  try {
    commitAt(dir, 1);
    await assert.rejects(() => quiet(() => runDevlog({ mode: 'last', repo: dir, narrative: path.join(dir, 'nope.md'), hardest: '' })), /Không tìm thấy file narrative/);
    assert.equal(readLedger(dir).length, 0);
  } finally {
    cleanup(dir);
  }
});

test('author filter: other people\'s commits are not told', () => {
  const dir = makeRepo();
  try {
    commitAt(dir, 1);
    commitAt(dir, 1, { minutes: 20, author: 'Someone' });
    commitAt(dir, 1, { minutes: 40 });
    commitAt(dir, 1, { minutes: 60 });
    const plan = resolvePeriod(dir, { mode: 'last' }, AUTHORS);
    assert.equal(plan.period.stats.commits, 3);
  } finally {
    cleanup(dir);
  }
});
