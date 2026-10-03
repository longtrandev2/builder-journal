// Unit tests: session grouping boundary, chapter rules, git log parsing, author escaping.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupSessions } from '../src/extractor/session-grouper.js';
import { classifyCommit, fileKind } from '../src/extractor/chapter-classifier.js';
import { parseLog, authorArgs } from '../src/extractor/git-reader.js';
import { parseSince } from '../src/extractor/extract-sessions.js';
import { chunkByWeek } from '../src/extractor/backfill-seeder.js';

const at = (min) => ({ date: new Date(Date.UTC(2026, 0, 1) + min * 60000).toISOString() });

test('grouper: 120 min gap stays in one session, 121 min splits', () => {
  assert.equal(groupSessions([at(0), at(120)]).length, 1);
  assert.equal(groupSessions([at(0), at(121)]).length, 2);
  const [s] = groupSessions([at(0), at(30), at(95)]);
  assert.equal(s.durationMinutes, 95);
});

const f = (path, ins, del, status = 'M') => ({ path, ins, del, status });

test('classifier rule 1: any rename → refactor', () => {
  assert.equal(classifyCommit({ numstat: [f('src/b.js', 300, 0, 'R')] }), 'refactor');
});
test('classifier rule 2: new file and ins ≥ 2×del → feature', () => {
  assert.equal(classifyCommit({ numstat: [f('src/new.js', 120, 0, 'A'), f('src/a.js', 10, 5)] }), 'feature');
});
test('classifier rule 3: small edit, ≤3 files, ≤50 lines → fix', () => {
  assert.equal(classifyCommit({ numstat: [f('src/a.js', 4, 3)] }), 'fix');
});
test('classifier rule 4: deletes ≥ inserts, no new files → refactor', () => {
  assert.equal(classifyCommit({ numstat: [f('src/a.js', 20, 80), f('src/b.js', 10, 40)] }), 'refactor');
});
test('classifier rule 5: big modification → feature', () => {
  assert.equal(classifyCommit({ numstat: [f('src/a.js', 200, 20), f('src/b.js', 90, 10)] }), 'feature');
});
test('classifier: tests / docs / infra dominate by line weight', () => {
  assert.equal(classifyCommit({ numstat: [f('test/a.test.js', 100, 0, 'A'), f('src/a.js', 2, 1)] }), 'test');
  assert.equal(classifyCommit({ numstat: [f('README.md', 40, 2)] }), 'docs');
  assert.equal(classifyCommit({ numstat: [f('.github/workflows/ci.yml', 30, 0, 'A')] }), 'infra');
  assert.equal(fileKind('package-lock.json'), 'infra');
  assert.equal(fileKind('src/app.tsx'), 'src');
});

test('git-reader parses numstat, renames, creates, binary and noise files', () => {
  const R = '\x1e', F = '\x1f';
  const log =
    `${R}bbb${F}Ln${F}ln@x.vn${F}2026-01-02T10:00:00+07:00${F}second\n\n5\t1\tsrc/{old => new}.js\n-\t-\tlogo.png\n` +
    `${R}aaa${F}Ln${F}ln@x.vn${F}2026-01-01T10:00:00+07:00${F}first\n\n10\t0\tsrc/a.js\n900\t0\tpackage-lock.json\n create mode 100644 src/a.js\n`;
  const [first, second] = parseLog(log);
  assert.equal(first.hash, 'aaa');
  assert.equal(first.numstat[0].status, 'A');
  assert.equal(first.insertions, 10, 'lockfile lines are not "lines written"');
  assert.equal(second.numstat[0].path, 'src/new.js');
  assert.equal(second.numstat[0].status, 'R');
  assert.equal(second.files, 2);
});

test('authorArgs escapes regex specials so emails match literally', () => {
  assert.deepEqual(authorArgs(['a.b@x.com', '']), ['--author=a\\.b@x\\.com']);
});

test('parseSince accepts Nd and YYYY-MM-DD, rejects junk', () => {
  const now = new Date(2026, 9, 3);
  assert.equal(parseSince('3d', now).getDate(), 30);
  assert.equal(parseSince('2026-07-01', now).getMonth(), 6);
  assert.throws(() => parseSince('hôm qua', now), /Không hiểu mốc/);
});

test('chunkByWeek splits into 7-day buckets and skips empty weeks', () => {
  const from = '2026-01-01T00:00:00.000Z';
  const day = (d) => ({ date: new Date(Date.parse(from) + d * 86400000).toISOString() });
  const chunks = chunkByWeek([day(0), day(6), day(20)], from);
  assert.equal(chunks.length, 2);
  assert.equal(chunks[0].commits.length, 2);
  assert.equal(chunks[1].from.slice(0, 10), '2026-01-15');
});
