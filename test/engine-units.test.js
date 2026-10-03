// Unit tests: session grouping boundary, chapter rules, git log parsing, author escaping.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupSessions } from '../src/extractor/session-grouper.js';
import { classifyCommit, fileKind } from '../src/extractor/chapter-classifier.js';
import { parseLog, authorArgs, readCommits } from '../src/extractor/git-reader.js';
import { parseSince, codeInsertions } from '../src/extractor/extract-sessions.js';
import { makeRepo, commitAt, cleanup } from './helpers/temp-git-repo.js';

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
    `${R}ccc${F}bbb x9${F}Ln${F}ln@x.vn${F}2026-01-03T10:00:00+07:00${F}Merge branch 'feat/x'

` +
    `${R}bbb${F}aaa${F}Ln${F}ln@x.vn${F}2026-01-02T10:00:00+07:00${F}second\n\n5\t1\tsrc/{old => new}.js\n-\t-\tlogo.png\n` +
    `${R}aaa${F}${F}Ln${F}ln@x.vn${F}2026-01-01T10:00:00+07:00${F}first\n\n10\t0\tsrc/a.js\n900\t0\tpackage-lock.json\n create mode 100644 src/a.js\n`;
  const [first, second, merge] = parseLog(log);
  assert.equal(merge.isMerge, true, 'two parents → merge commit (counted, no own diff)');
  assert.equal(merge.files, 0);
  assert.equal(first.isMerge, false);
  assert.equal(first.hash, 'aaa');
  assert.equal(first.numstat[0].status, 'A');
  assert.equal(first.insertions, 10, 'lockfile lines are not "lines written"');
  assert.equal(second.numstat[0].path, 'src/new.js');
  assert.equal(second.numstat[0].status, 'R');
  assert.equal(second.files, 2);
});

test('authorArgs escapes regex specials and anchors: emails as <email>, names as ^Name <', () => {
  assert.deepEqual(authorArgs(['a.b@x.com', '', 'Ln']), ['--author=<a\\.b@x\\.com>', '--author=^Ln <']);
});

test('author match is anchored: email must not match a longer email, name must not match a longer name', () => {
  const dir = makeRepo();
  try {
    commitAt(dir, 1, { author: 'an' });
    commitAt(dir, 1, { minutes: 5, author: 'tuan' });
    commitAt(dir, 1, { minutes: 10, author: 'Alan' });
    const count = (authors) => readCommits(dir, { authors }).commits.length;
    assert.equal(count(['an@example.com']), 1, 'an@ must not match tuan@');
    assert.equal(count(['an']), 1, 'name an must not match tuan / Alan');
    assert.equal(count(['tuan@example.com', 'Alan']), 2, 'several authors are OR-ed');
  } finally {
    cleanup(dir);
  }
});

test('parseSince: a future date gets the friendly "ở tương lai" message', () => {
  assert.throws(() => parseSince('2999-01-01', new Date(2026, 9, 3)), /ở tương lai/);
});

test('codeLines: only whitelisted source extensions count; svg/json/csv/lock/generated never do', () => {
  const n = (p, ins) => ({ path: p, ins, del: 0 });
  const commit = (...files) => ({ numstat: files });
  assert.equal(codeInsertions(commit(n('src/a.js', 10), n('src/b.tsx', 5), n('app/main.py', 7), n('lib/x.rs', 3), n('s.sh', 2), n('a.scss', 4))), 31);
  for (const p of ['logo.svg', 'data.json', 'rows.csv', 'yarn.lock', 'Cargo.lock', 'README.md', 'a.min.js', 'build/app.js', 'vendor/lib.js', '.claude/skills/x.py', 'Makefile', 'noext']) {
    assert.equal(codeInsertions(commit(n(p, 100))), 0, p);
  }
  assert.equal(codeInsertions(commit(n('SRC/UPPER.JS', 4))), 4, 'extension match is case-insensitive');
});

test('parseSince accepts Nd and YYYY-MM-DD, rejects junk', () => {
  const now = new Date(2026, 9, 3);
  assert.equal(parseSince('3d', now).getDate(), 30);
  assert.equal(parseSince('2026-07-01', now).getMonth(), 6);
  assert.throws(() => parseSince('hôm qua', now), /Không hiểu mốc/);
});


test('merge commits count as commits but stay out of chapters, lines and the method split', async () => {
  const { periodFromCommits } = await import('../src/extractor/extract-sessions.js');
  const day = (h) => `2026-01-01T${String(h).padStart(2, '0')}:00:00+07:00`;
  const commits = [
    { date: day(9), message: 'feat: a', numstat: [{ path: 'src/a.js', ins: 10, del: 0, status: 'A' }], isMerge: false, insertions: 10, deletions: 0 },
    { date: day(10), message: "Merge branch 'feat/a' into develop", numstat: [], isMerge: true, insertions: 0, deletions: 0 },
  ];
  const { stats } = periodFromCommits(commits);
  assert.equal(stats.commits, 2);
  assert.equal(stats.merges, 1);
  assert.deepEqual(stats.chapters, { feature: 1 });
  assert.equal(stats.codeLines, 10);
  assert.deepEqual(stats.classifiedBy, { prefix: 1, diff: 0 });
});
