// Turns project paths seen in agent logs into real git repos (existing dirs, deduped by git toplevel).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { tryGitAsync } from '../lib/run-git.js';
import { normalizePath } from './agent-activity-aggregator.js';

function isDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/**
 * `activity` = aggregate from aggregateAgentActivity (uses activity.projects).
 * `exclude` = repo names or absolute paths to drop. Returns [{ path, name, prompts, activeMinutes }].
 */
export async function discoverRepos(activity, { exclude = [] } = {}) {
  if (!activity || !Array.isArray(activity.projects)) return [];
  const excl = exclude.filter(Boolean).map((x) => ({ raw: String(x).toLowerCase(), norm: normalizePath(x) }));
  const byTop = new Map(); // normalized toplevel -> repo

  // One `git rev-parse` per project folder, all at once (each git start costs ~60 ms on Windows).
  const projects = activity.projects.filter((p) => p.path && isDir(p.path));
  const tops = await Promise.all(projects.map((p) => tryGitAsync(p.path, ['rev-parse', '--show-toplevel'])));
  projects.forEach((proj, i) => {
    const topRaw = tops[i];
    if (!topRaw) return;
    const top = path.resolve(topRaw);
    const key = normalizePath(top);
    // A dotfiles repo at ~ would swallow every non-git project folder under home — never a real project.
    if (key === normalizePath(os.homedir())) return;
    const hit = byTop.get(key);
    if (hit) {
      hit.prompts += proj.prompts;
      hit.activeMinutes += proj.activeMinutes;
    } else {
      byTop.set(key, { path: top, name: path.basename(top), prompts: proj.prompts, activeMinutes: proj.activeMinutes });
    }
  });

  return [...byTop.entries()]
    .filter(([key, r]) => !excl.some((x) => x.raw === r.name.toLowerCase() || x.norm === key))
    .map(([, r]) => r)
    .sort((a, b) => b.activeMinutes - a.activeMinutes);
}
