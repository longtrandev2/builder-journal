// Reads author-filtered, non-merge commits with per-file numstat (+ optional patch excerpts).
import { runGit, UserFacingError } from '../lib/run-git.js';
import { stripSensitiveDiff } from '../narrator/secret-redactor.js';

const REC = '\x1e';
const FIELD = '\x1f';
const HEADER_FORMAT = `--format=${REC}%H${FIELD}%an${FIELD}%ae${FIELD}%aI${FIELD}%s`;
export const MAX_COMMITS = 5000;
const PATCH_LINES = 200;

// Generated / vendored files (lockfiles, builds, AI-agent kits): counted as touched, never as "lines written".
const NOISE_RE = /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb|composer\.lock|Cargo\.lock|poetry\.lock|Gemfile\.lock|go\.sum)$|\.min\.(js|css)$|(^|\/)(dist|build|vendor|node_modules)\/|(^|\/)\.(claude|opencode|cursor|windsurf|agents|codex|gemini|kiro)\//;

export function isNoiseFile(filePath) {
  return NOISE_RE.test(filePath);
}

/**
 * git --author matches a regex against "Name <email>". Escape the specials (POSIX basic regex) and ANCHOR:
 * emails as `<email>` (an@x.com must not match tuan@x.com), names as `^Name <` (Ln must not match Alan).
 */
export function authorArgs(authors = []) {
  return authors.filter(Boolean).map((a) => {
    const esc = String(a).trim().replace(/[.*^$\\[\]]/g, '\\$&');
    return `--author=${String(a).includes('@') ? `<${esc}>` : `^${esc} <`}`;
  });
}

/** "src/{a => b}.js" or "a => b" → new path. */
function renamedPath(raw) {
  if (!raw.includes(' => ')) return raw;
  const brace = raw.match(/^(.*)\{(.*) => (.*)\}(.*)$/);
  if (brace) return (brace[1] + brace[3] + brace[4]).replace(/\/\//g, '/');
  return raw.split(' => ')[1];
}

/** Parse `git log --numstat --summary` output produced with HEADER_FORMAT. Exported for tests. */
export function parseLog(text) {
  const commits = [];
  let order = 0;
  for (const chunk of text.split(REC)) {
    if (!chunk.trim()) continue;
    const [header, ...lines] = chunk.split('\n');
    const [hash, author, email, date, ...subject] = header.split(FIELD);
    const numstat = [];
    const created = new Set();
    for (const line of lines) {
      const ns = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/);
      if (ns) {
        const raw = ns[3];
        numstat.push({
          path: renamedPath(raw),
          status: raw.includes(' => ') ? 'R' : 'M',
          ins: ns[1] === '-' ? 0 : Number(ns[1]),
          del: ns[2] === '-' ? 0 : Number(ns[2]),
        });
        continue;
      }
      const cm = line.match(/^ create mode \d+ (.+)$/);
      if (cm) created.add(cm[1]);
    }
    for (const f of numstat) if (created.has(f.path) && f.status === 'M') f.status = 'A';
    const counted = numstat.filter((f) => !isNoiseFile(f.path));
    commits.push({
      hash,
      order: order++, // position in git log output: 0 = branch tip side (topological newest)
      author,
      email,
      date,
      message: subject.join(FIELD).trim(),
      files: numstat.length,
      insertions: counted.reduce((s, f) => s + f.ins, 0),
      deletions: counted.reduce((s, f) => s + f.del, 0),
      numstat,
    });
  }
  // Oldest first by author date (dates can be out of topo order after rebase — use .order for the tip) — grouping and ledgers assume chronological order.
  return commits.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}

/** Build the shared filter args: authors, date window or revision range, no merges, cap. */
function filterArgs({ authors, from, to, revRange, max = MAX_COMMITS }) {
  const args = ['--no-merges', `--max-count=${max}`, ...authorArgs(authors)];
  if (from) args.push(`--since=${from}`);
  if (to) args.push(`--until=${to}`);
  args.push(revRange || 'HEAD');
  return args;
}

/**
 * Read commits. options: { authors, from, to, revRange, withPatch }.
 * Returns { commits, capped } — capped=true when MAX_COMMITS was hit.
 */
export function readCommits(repo, options = {}) {
  const out = runGit(repo, ['log', '-M', '--numstat', '--summary', HEADER_FORMAT, ...filterArgs(options)]);
  const commits = parseLog(out);
  if (options.withPatch && commits.length) attachPatches(repo, commits, options);
  return { commits, capped: commits.length >= MAX_COMMITS };
}

// Diffs are only worth reading for the newest commits; the narrator budget is ~30 KB anyway.
const PATCH_COMMITS = 100;
const PATCH_MAX_BUFFER = 64 * 1024 * 1024;
// Pathspec excludes keep lockfiles / builds / agent kits out of `git log -p` (cheaper than filtering afterwards).
const PATCH_EXCLUDES = [
  '**/package-lock.json', '**/yarn.lock', '**/pnpm-lock.yaml', '**/bun.lockb', '**/composer.lock', '**/Cargo.lock', '**/poetry.lock', '**/Gemfile.lock', '**/go.sum',
  '**/*.min.js', '**/*.min.css', '**/dist/**', '**/build/**', '**/vendor/**', '**/node_modules/**',
  ...['.claude', '.opencode', '.cursor', '.windsurf', '.agents', '.codex', '.gemini', '.kiro'].map((d) => `${d}/**`),
].map((g) => `:(exclude,glob)${g}`);

/**
 * Attach the first PATCH_LINES lines of each of the newest PATCH_COMMITS commits' diffs (devlog narrator input only).
 * Never fatal: a huge repo (ENOBUFS) or any git hiccup just means the story is told without diffs.
 */
function attachPatches(repo, commits, options) {
  let out;
  try {
    out = runGit(repo, ['log', '-p', '--no-color', `--format=${REC}%H`, ...filterArgs({ ...options, max: PATCH_COMMITS }), '--', ...PATCH_EXCLUDES], { maxBuffer: PATCH_MAX_BUFFER });
  } catch (err) {
    if (err instanceof UserFacingError) throw err;
    console.warn('Không đọc được diff (repo quá lớn?) — bài sẽ chỉ dựa trên message và số liệu.');
    for (const c of commits) c.patchExcerpt = '';
    return;
  }
  const byHash = new Map();
  for (const chunk of out.split(REC)) {
    if (!chunk.trim()) continue;
    const nl = chunk.indexOf('\n');
    const hash = chunk.slice(0, nl).trim();
    // Secrets files are dropped BEFORE the line budget so they never eat it (or leak into sessions JSON).
    const lines = stripSensitiveDiff(chunk.slice(nl + 1)).split('\n');
    const excerpt = lines.slice(0, PATCH_LINES).join('\n').trim();
    byHash.set(hash, lines.length > PATCH_LINES ? `${excerpt}\n… (cắt bớt)` : excerpt);
  }
  for (const c of commits) c.patchExcerpt = byHash.get(c.hash) || '';
}
