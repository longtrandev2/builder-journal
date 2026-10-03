// Reads the author's commits (merge commits included, flagged isMerge) with per-file numstat.
import { runGit, runGitAsync } from '../lib/run-git.js';

const REC = '\x1e';
const FIELD = '\x1f';
const HEADER_FORMAT = `--format=${REC}%H${FIELD}%P${FIELD}%an${FIELD}%ae${FIELD}%aI${FIELD}%s`;
export const MAX_COMMITS = 5000;

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
    const [hash, parents, author, email, date, ...subject] = header.split(FIELD);
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
      // Merge commits count as commits (they are real work steps: PRs, git-flow) but carry no own diff.
      isMerge: String(parents || '').trim().split(/\s+/).filter(Boolean).length > 1,
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

/** Build the shared filter args: authors, date window or revision range, cap. */
function filterArgs({ authors, from, to, revRange, max = MAX_COMMITS }) {
  const args = [`--max-count=${max}`, ...authorArgs(authors)];
  if (from) args.push(`--since=${from}`);
  if (to) args.push(`--until=${to}`);
  args.push(revRange || 'HEAD');
  return args;
}

const logArgs = (options) => ['log', '-M', '--numstat', '--summary', HEADER_FORMAT, ...filterArgs(options)];
const result = (commits) => ({ commits, capped: commits.length >= MAX_COMMITS });

/** Read commits. options: { authors, from, to, revRange }. Returns { commits, capped }. */
export function readCommits(repo, options = {}) {
  return result(parseLog(runGit(repo, logArgs(options))));
}

/** Async version — used to read several repos in parallel. */
export async function readCommitsAsync(repo, options = {}) {
  return result(parseLog(await runGitAsync(repo, logArgs(options))));
}
