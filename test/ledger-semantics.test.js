// Ledger semantics: `since` seeds only an empty ledger (else retelling), authors are recorded and
// compared, the manual-fallback rerun reuses the head the prompt was built from.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { makeRepo, commitAt, cleanup } from './helpers/temp-git-repo.js';
import { runDevlog } from '../src/devlog-command.js';
import { readLedger, sameAuthors } from '../src/ledger/journal-ledger.js';
import { readPending } from '../src/narrator/manual-fallback.js';

async function quiet(fn) {
  const lines = [];
  const orig = [console.log, console.warn];
  console.log = console.warn = (...a) => lines.push(a.join(' '));
  try {
    await fn();
  } finally {
    [console.log, console.warn] = orig;
  }
  return lines.join('\n');
}

function narrativeFile(dir) {
  const f = path.join(dir, 'narrative.md');
  fs.writeFileSync(f, 'NỔI NHẤT: xong\nCÂU CHUYỆN: Mình sửa phần gộp buổi.');
  return f;
}

const head = (dir) => spawnSync('git', ['-C', dir, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
const devlogs = (dir) => fs.readdirSync(path.join(dir, '.journal')).filter((f) => f.startsWith('devlog-'));
const seedRepo = (dir) => { for (let i = 0; i < 4; i++) commitAt(dir, 2, { minutes: i * 30 }); };

test('since on an EMPTY ledger seeds it (with authors); on a non-empty ledger it is a retelling', async () => {
  const dir = makeRepo();
  try {
    seedRepo(dir);
    const narrative = narrativeFile(dir);
    const run = (opts) => quiet(() => runDevlog({ repo: dir, narrative, hardest: '', ...opts }));
    const out1 = await run({ mode: 'since', when: '5d' });
    assert.ok(!out1.includes('sổ cái giữ nguyên'));
    const seeded = readLedger(dir);
    assert.equal(seeded.length, 1);
    assert.deepEqual(seeded[0].authors, ['Tester', 'tester@example.com']);

    commitAt(dir, 0, { minutes: 5 });
    const out2 = await run({ mode: 'since', when: '5d' });
    assert.match(out2, /Kể lại — sổ cái giữ nguyên/);
    assert.equal(readLedger(dir).length, 1, 'retelling must not touch the ledger');
    assert.equal(devlogs(dir).length, 2, 'devlog still written');

    const out3 = await run({ mode: 'last' });
    assert.match(out3, /Bản nháp/);
    const after = readLedger(dir);
    assert.equal(after.length, 2);
    assert.equal(after[1].stats.commits, 1, 'the commit made after seeding is still untold — retelling did not eat it');
  } finally {
    cleanup(dir);
  }
});

test('backfill (since > 14 days) retells without touching a non-empty ledger', async () => {
  const dir = makeRepo();
  try {
    commitAt(dir, 40);
    commitAt(dir, 3);
    commitAt(dir, 3, { minutes: 20 });
    commitAt(dir, 3, { minutes: 40 });
    const narrative = narrativeFile(dir);
    await quiet(() => runDevlog({ mode: 'last', repo: dir, narrative, hardest: '' }));
    const before = readLedger(dir).length;
    const out = await quiet(() => runDevlog({ mode: 'since', when: '60d', repo: dir, narrative, hardest: '' }));
    assert.match(out, /backfill/);
    assert.match(out, /sổ cái giữ nguyên/);
    assert.equal(readLedger(dir).length, before);
  } finally {
    cleanup(dir);
  }
});

test('last with different authors than the ledger tail → VN warning; same authors → none', async () => {
  const dir = makeRepo();
  try {
    seedRepo(dir);
    const narrative = narrativeFile(dir);
    await quiet(() => runDevlog({ mode: 'last', repo: dir, narrative, hardest: '' }));
    commitAt(dir, 0, { minutes: 5 });
    const same = await quiet(() => runDevlog({ mode: 'last', repo: dir, narrative, hardest: '' }));
    assert.ok(!same.includes('tác giả khác'));
    commitAt(dir, 0, { minutes: 3, author: 'Other' });
    const diff = await quiet(() => runDevlog({ mode: 'last', repo: dir, narrative, hardest: '', author: ['Other'] }));
    assert.match(diff, /tác giả khác/);
  } finally {
    cleanup(dir);
  }
});

test('sameAuthors: order/case-insensitive; legacy entries without authors never warn', () => {
  assert.equal(sameAuthors(['A', 'b@x.com'], ['b@X.com', 'a']), true);
  assert.equal(sameAuthors(['A'], ['B']), false);
  assert.equal(sameAuthors(undefined, ['B']), true);
});

test('manual fallback: pending.json pins the head; rerun with --narrative uses it, then deletes it', async () => {
  const dir = makeRepo();
  try {
    seedRepo(dir);
    const pinned = head(dir);
    const out = await quiet(() => runDevlog({ mode: 'last', repo: dir, narrator: 'manual', hardest: '' }));
    assert.match(out, /--narrative/);
    const pending = readPending(dir);
    assert.equal(pending.head, pinned);
    assert.equal(pending.mode, 'last');
    assert.ok(Array.isArray(pending.authors) && pending.createdAt);
    assert.equal(readLedger(dir).length, 0, 'manual prompt writes nothing to the ledger');

    commitAt(dir, 0, { minutes: 5 }); // lands while the user is chatting with the AI
    await quiet(() => runDevlog({ mode: 'last', repo: dir, narrative: narrativeFile(dir), hardest: '' }));
    const [entry] = readLedger(dir);
    assert.equal(entry.last_commit_hash, pinned, 'boundary = head the prompt was built from');
    assert.equal(entry.stats.commits, 4, 'the late commit is not part of this story');
    assert.equal(readPending(dir), null, 'pending.json removed after a successful write');

    await quiet(() => runDevlog({ mode: 'last', repo: dir, narrative: narrativeFile(dir), hardest: '' }));
    assert.equal(readLedger(dir)[1].stats.commits, 1, 'the late commit is told next time, not lost');
  } finally {
    cleanup(dir);
  }
});

test('pending.json from another command (mode differs) is ignored and kept', async () => {
  const dir = makeRepo();
  try {
    seedRepo(dir);
    await quiet(() => runDevlog({ mode: 'last', repo: dir, narrator: 'manual', hardest: '' }));
    commitAt(dir, 0, { minutes: 5 });
    await quiet(() => runDevlog({ mode: 'since', when: '5d', repo: dir, narrative: narrativeFile(dir), hardest: '' }));
    assert.equal(readLedger(dir)[0].stats.commits, 5, 'since seeded up to the real HEAD, not the pending head');
    assert.ok(readPending(dir), 'the last-mode pending boundary survives');
  } finally {
    cleanup(dir);
  }
});

test('since with a future date → friendly "ở tương lai" error, nothing written', async () => {
  const dir = makeRepo();
  try {
    seedRepo(dir);
    await assert.rejects(() => quiet(() => runDevlog({ mode: 'since', when: '2999-01-01', repo: dir, narrative: narrativeFile(dir), hardest: '' })), /ở tương lai/);
    assert.equal(readLedger(dir).length, 0);
  } finally {
    cleanup(dir);
  }
});
