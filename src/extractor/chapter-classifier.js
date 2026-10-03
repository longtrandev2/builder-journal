// Deterministic "chapter" (kind of work) per commit, two signals in order of trust:
//  1. Conventional-commit prefix (feat:, fix(api):, refactor!: …) — structured, written on purpose.
//  2. Otherwise DIFF SHAPE: which file kinds dominate, then shape rules for source code.
// Free-form messages ("update", "fix stuff") are never parsed: only a strict `type(scope)?!?:` prefix counts.
import { isNoiseFile } from './git-reader.js';

export const CHAPTERS = ['feature', 'fix', 'refactor', 'test', 'docs', 'infra'];

export const CHAPTER_LABELS = {
  feature: 'Viết tính năng',
  fix: 'Sửa lỗi',
  refactor: 'Dọn & tái cấu trúc',
  test: 'Kiểm thử',
  docs: 'Tài liệu',
  infra: 'Hạ tầng & cấu hình',
};

const TEST_RE = /(^|\/)(tests?|__tests__|spec|e2e|cypress)\/|\.(test|spec)\.[a-z0-9]+$|_test\.(go|py)$|(^|\/)test_[^/]+\.py$/i;
const DOCS_RE = /\.(md|mdx|markdown|rst|txt|adoc)$|(^|\/)docs?\/|(^|\/)(LICENSE|CHANGELOG|README)[^/]*$/i;
const INFRA_RE = /(^|\/)(\.github|\.circleci|\.husky|\.vscode|docker|deploy|infra|k8s|scripts)\/|(^|\/)(Dockerfile|Makefile|Procfile|\.gitignore|\.env\.example|\.editorconfig|\.npmrc|\.nvmrc)$|(^|\/)package\.json$|(^|\/)(tsconfig|jsconfig)[^/]*\.json$|\.config\.[cm]?[jt]s$|\.(ya?ml|toml|ini|cfg|lock)$|(^|\/)\.[^/]*rc(\.[a-z]+)?$/i;

export function fileKind(filePath) {
  if (TEST_RE.test(filePath)) return 'test';
  if (DOCS_RE.test(filePath)) return 'docs';
  if (INFRA_RE.test(filePath) || isNoiseFile(filePath)) return 'infra';
  return 'src';
}

/** Shape rules on source files (first match wins). */
function shapeChapter(files) {
  const A = files.filter((f) => f.status === 'A').length;
  const R = files.filter((f) => f.status === 'R').length;
  const ins = files.reduce((s, f) => s + f.ins, 0);
  const del = files.reduce((s, f) => s + f.del, 0);
  if (R >= 1) return 'refactor';
  if (A >= 1 && ins >= 2 * del) return 'feature';
  if (files.length <= 3 && ins + del <= 50 && A === 0) return 'fix';
  if (del >= ins && A === 0) return 'refactor';
  return 'feature';
}

const PREFIX_CHAPTERS = {
  feat: 'feature', feature: 'feature',
  fix: 'fix', bugfix: 'fix', hotfix: 'fix',
  refactor: 'refactor', perf: 'refactor', style: 'refactor',
  test: 'test', tests: 'test',
  docs: 'docs', doc: 'docs',
  // chore is a catch-all ("chore: init README", "chore: hygiene fixes") → no mapping, diff shape decides.
  ci: 'infra', build: 'infra', deps: 'infra',
};
const PREFIX_RE = /^\s*([a-z]+)(\([^)]*\))?!?:\s*\S/i;

/** Chapter from a strict conventional-commit prefix, or null (unknown types like revert → null). */
export function prefixChapter(message) {
  const m = PREFIX_RE.exec(String(message || ''));
  return m ? PREFIX_CHAPTERS[m[1].toLowerCase()] || null : null;
}

/** Diff-shape chapter (used when the message has no recognised prefix). */
export function shapeChapterOf(commit) {
  const files = commit.numstat || [];
  if (!files.length) return 'infra';
  const weight = { src: 0, test: 0, docs: 0, infra: 0 };
  for (const f of files) weight[fileKind(f.path)] += Math.max(1, f.ins + f.del);
  const total = weight.src + weight.test + weight.docs + weight.infra;
  // A non-source kind wins only when it carries more than half of the changed lines.
  for (const kind of ['test', 'docs', 'infra']) if (weight[kind] / total > 0.5) return kind;
  const srcFiles = files.filter((f) => fileKind(f.path) === 'src');
  return shapeChapter(srcFiles.length ? srcFiles : files);
}

/** { chapter, source: 'prefix' | 'diff' } */
export function classifyWithSource(commit) {
  const fromPrefix = prefixChapter(commit.message);
  return fromPrefix ? { chapter: fromPrefix, source: 'prefix' } : { chapter: shapeChapterOf(commit), source: 'diff' };
}

export function classifyCommit(commit) {
  return classifyWithSource(commit).chapter;
}

/** Mutates commits with .chapter + .chapterSource; returns { chapterName: count } ordered by count desc. */
export function classifyAll(commits) {
  const counts = {};
  for (const c of commits) {
    const { chapter, source } = classifyWithSource(c);
    c.chapter = chapter;
    c.chapterSource = source;
    counts[c.chapter] = (counts[c.chapter] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((a, b) => b[1] - a[1]));
}
