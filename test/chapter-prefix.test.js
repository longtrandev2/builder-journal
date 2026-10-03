// Conventional-commit prefix wins; free-form messages fall back to diff shape; the page says which.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prefixChapter, classifyWithSource, classifyAll } from '../src/extractor/chapter-classifier.js';
import { chapterMethodNote } from '../src/wrapped/wrapped-git-screens.js';

test('prefixChapter maps conventional types, with scope and breaking marker', () => {
  assert.equal(prefixChapter('feat: add login'), 'feature');
  assert.equal(prefixChapter('fix(web): submit edit mode fetches via api'), 'fix');
  assert.equal(prefixChapter('refactor!: drop v1 api'), 'refactor');
  assert.equal(prefixChapter('perf(db): index orders'), 'refactor');
  assert.equal(prefixChapter('docs: readme'), 'docs');
  assert.equal(prefixChapter('test(e2e): playwright setup'), 'test');
  assert.equal(prefixChapter('chore(release): v0.1.0'), 'infra');
  assert.equal(prefixChapter('CI: cache deps'), 'infra', 'case-insensitive');
});

test('free-form or unknown prefixes are NOT parsed', () => {
  for (const m of ['update stuff', 'fix bug', 'Fixed the thing', 'WIP', 'revert: undo x', 'feat:', 'Merge branch x', '']) {
    assert.equal(prefixChapter(m), null, m);
  }
});

test('classifyWithSource: prefix beats diff shape; no prefix → diff', () => {
  const bigChange = [{ path: 'src/a.js', ins: 42, del: 29, status: 'M' }, { path: 'src/b.js', ins: 5, del: 1, status: 'M' },
    { path: 'src/c.js', ins: 3, del: 3, status: 'M' }, { path: 'src/d.js', ins: 1, del: 1, status: 'M' }];
  assert.deepEqual(classifyWithSource({ message: 'fix(web): submit edit mode', numstat: bigChange }), { chapter: 'fix', source: 'prefix' });
  assert.deepEqual(classifyWithSource({ message: 'update', numstat: bigChange }), { chapter: 'feature', source: 'diff' });
});

test('classifyAll tags chapterSource and the page note reports the split', () => {
  const commits = [
    { message: 'feat: a', numstat: [{ path: 'src/a.js', ins: 9, del: 0, status: 'A' }] },
    { message: 'tweak', numstat: [{ path: 'src/a.js', ins: 2, del: 1, status: 'M' }] },
  ];
  classifyAll(commits);
  assert.deepEqual(commits.map((c) => c.chapterSource), ['prefix', 'diff']);
  assert.match(chapterMethodNote({ prefix: 1, diff: 1 }), /^50% commit phân loại theo tiền tố/);
  assert.match(chapterMethodNote({ prefix: 0, diff: 3 }), /^Phân loại theo hình dạng diff/);
  assert.match(chapterMethodNote({ prefix: 3, diff: 0 }), /theo tiền tố commit/);
});
