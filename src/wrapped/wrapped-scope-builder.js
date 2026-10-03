// Builds the data behind a Wrapped page for one repo or for a whole person (all repos found in
// local agent logs), and attaches the optional AI layer + the "leverage" chain.
import path from 'node:path';
import os from 'node:os';
import { tryGit, UserFacingError, resolveRepo } from '../lib/run-git.js';
import { buildPeriod, periodStats, codeInsertions } from '../extractor/extract-sessions.js';
import { groupSessions } from '../extractor/session-grouper.js';
import { readAgentActivity } from '../agents/read-agent-activity.js';
import { discoverRepos } from '../agents/repo-discovery.js';

/** Author identities for person mode: global git identity + --author flags. */
export function personAuthors(authorFlags = []) {
  const flags = [].concat(authorFlags).filter(Boolean);
  if (flags.length) return flags;
  const home = os.homedir();
  return [tryGit(home, ['config', '--global', 'user.name']), tryGit(home, ['config', '--global', 'user.email'])].filter(Boolean);
}

/** Commits whose date falls inside the agent-log window (inclusive). */
export function commitsInRange(commits, range) {
  const from = Date.parse(range.from);
  const to = Date.parse(range.to);
  return commits.filter((c) => {
    const t = Date.parse(c.date);
    return t >= from && t <= to;
  });
}

/**
 * Prompt → commit → line chain, computed ONLY inside the agent-log window so both sides cover
 * the same days. null when there are no prompts or no commits in that window.
 */
export function buildLeverage(commits, ai) {
  if (!ai || !ai.prompts) return null;
  const inRange = commitsInRange(commits, ai.range);
  if (!inRange.length) return null;
  const codeLines = inRange.reduce((s, c) => s + codeInsertions(c), 0);
  return {
    prompts: ai.prompts,
    commits: inRange.length,
    codeLines,
    linesPerPrompt: Math.round(codeLines / ai.prompts),
    commitsPerPrompt: Math.round((inRange.length / ai.prompts) * 100) / 100,
  };
}

/** AI layer is optional and must never break a wrap. */
export function safeActivity(options, enabled) {
  if (!enabled) return null;
  try {
    return readAgentActivity(options);
  } catch {
    return null;
  }
}

/** Repos named with --include (e.g. older than the ~30-day agent-log window). Bad paths are skipped. */
function includedRepos(include) {
  const out = [];
  for (const p of include) {
    try {
      const top = resolveRepo(p);
      out.push({ path: top, name: path.basename(top), prompts: 0, activeMinutes: 0 });
    } catch {
      console.warn(`Bỏ qua --include không phải git repo: ${p}`);
    }
  }
  return out;
}

/**
 * Person scope: merge commits of every discovered repo, regroup sessions across repos
 * (a "buổi" is about the person's time, not the repo).
 */
export async function buildPersonPeriod({ authors, from, exclude = [], include = [], activityAll, confirm = async (r) => r }) {
  const extra = includedRepos(include);
  if (!activityAll && !extra.length) {
    throw new UserFacingError('Chế độ --all cần đọc log agent (Claude Code / Codex) để tự tìm repo — chạy lại với --ai, hoặc thêm repo bằng --include <đường dẫn>.');
  }
  const seen = new Set();
  let repos = [...discoverRepos(activityAll, { exclude }), ...extra].filter((r) => {
    const key = path.resolve(r.path).toLowerCase();
    return seen.has(key) ? false : seen.add(key);
  });
  if (!repos.length) throw new UserFacingError('Log agent không trỏ tới repo git nào còn trên máy — thêm bằng --include <đường dẫn>.');
  repos = await confirm(repos);
  if (!repos.length) throw new UserFacingError('Đã bỏ hết repo — không còn gì để wrap.');
  const merged = [];
  const perRepo = [];
  for (const repo of repos) {
    try {
      const p = buildPeriod(repo.path, { authors, from, withPatch: false });
      if (!p.commits.length) continue;
      for (const c of p.commits) c.repo = repo.name;
      merged.push(...p.commits);
      perRepo.push({ name: repo.name, path: repo.path, commits: p.stats.commits, sessions: p.stats.sessions, codeLines: p.stats.codeLines });
    } catch {
      // One unreadable repo never blocks the person page.
    }
  }
  if (!merged.length) throw new UserFacingError(`Không thấy commit nào của ${authors.join(' / ')} trong các repo tìm được.`);
  merged.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const sessions = groupSessions(merged).map((s) => ({ ...s, chapters: [...new Set(s.commits.map((c) => c.chapter))] }));
  perRepo.sort((a, b) => b.commits - a.commits);
  return { period: { commits: merged, sessions, stats: periodStats(merged, sessions), capped: false }, repos: perRepo };
}

/**
 * Share pages must not leak absolute paths (usernames, client folder names): keep repo names only.
 */
export function shareSafe(ai, repos) {
  const safeAi = ai && {
    ...ai,
    projects: (ai.projects || []).map(({ name, prompts, activeMinutes, lastActive }) => ({ name, prompts, activeMinutes, lastActive })),
  };
  const safeRepos = repos && repos.map(({ name, commits, sessions, codeLines }) => ({ name, commits, sessions, codeLines }));
  return { ai: safeAi, repos: safeRepos };
}

/** Commit counts per local hour, limited to the agent-log window (fair prompt-vs-commit comparison). */
export function commitHoursInRange(commits, range) {
  const hours = Array(24).fill(0);
  for (const c of commitsInRange(commits, range)) hours[Number(c.date.slice(11, 13))]++;
  return hours;
}

/** --hide-names: replace repo names everywhere on the page with stable aliases. */
export function hideRepoNames(data, aliasMap) {
  const rename = (n) => aliasMap.get(n) || n;
  if (data.repos) data.repos = data.repos.map((r) => ({ ...r, name: rename(r.name) }));
  if (data.ai) data.ai = { ...data.ai, projects: data.ai.projects.map((p) => ({ ...p, name: rename(p.name) })) };
  if (data.scope === 'repo') data.repoName = rename(data.repoName);
  return data;
}
