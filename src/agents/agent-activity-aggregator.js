// Folds normalized agent events (Claude Code / Codex) into one privacy-safe summary: counts, hours, tokens.
import path from 'node:path';

export const IDLE_GAP_MINUTES = 30; // gap between two events in a session above this = user idle, not counted

const EDIT_TOOLS = new Set(['Edit', 'MultiEdit', 'Write', 'NotebookEdit', 'apply_patch']);
const COMMAND_TOOLS = new Set(['Bash', 'PowerShell', 'shell', 'exec_command', 'local_shell', 'local_shell_call']);
const READ_TOOLS = new Set(['Read', 'Grep', 'Glob', 'LS', 'WebFetch', 'WebSearch']);

/** Normalize a path for comparison: forward slashes, no trailing slash, lowercase on Windows. */
export function normalizePath(p) {
  let s = String(p).replace(/\\/g, '/').replace(/\/+$/, '');
  if (process.platform === 'win32') s = s.toLowerCase();
  return s;
}

/** True when `projectPath` is one of the repos or lives inside one of their subfolders. */
function insideAny(projectPath, normRepos) {
  const n = normalizePath(projectPath);
  return normRepos.some((r) => n === r || n.startsWith(r + '/'));
}

const localDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Map a tool name to edits | commands | reads | other. */
export function classifyTool(name) {
  if (EDIT_TOOLS.has(name)) return 'edits';
  if (COMMAND_TOOLS.has(name)) return 'commands';
  if (READ_TOOLS.has(name)) return 'reads';
  return 'other';
}

/** Per-session active minutes: sum of consecutive-event gaps <= 30 min, credited to the later event's project/day. */
function measureActivity(events) {
  const bySession = new Map();
  for (const e of events) {
    if (!bySession.has(e.sessionId)) bySession.set(e.sessionId, []);
    bySession.get(e.sessionId).push(e);
  }
  const perProject = new Map(); // normalized project -> minutes
  const perDay = new Map(); // local YYYY-MM-DD -> minutes
  let total = 0;
  for (const list of bySession.values()) {
    list.sort((a, b) => a.t - b.t);
    for (let i = 1; i < list.length; i++) {
      const gap = (list[i].t - list[i - 1].t) / 60000;
      if (gap > IDLE_GAP_MINUTES) continue;
      total += gap;
      const day = localDate(new Date(list[i].t));
      perDay.set(day, (perDay.get(day) || 0) + gap);
      if (list[i].project) {
        const k = normalizePath(list[i].project);
        perProject.set(k, (perProject.get(k) || 0) + gap);
      }
    }
  }
  return { total, perProject, perDay, sessions: bySession.size };
}

/**
 * Aggregate events -> summary object, or null when there are no human prompts.
 * `projects` (optional): absolute repo paths; only events inside them are kept.
 */
export function aggregateAgentActivity(events, { projects } = {}) {
  const norm = Array.isArray(projects) && projects.length ? projects.map(normalizePath) : null;
  const kept = [];
  for (const e of events || []) {
    const t = Date.parse(e.ts);
    if (!Number.isFinite(t)) continue;
    if (norm && !(e.project && insideAny(e.project, norm))) continue;
    kept.push({ ...e, t });
  }
  if (!kept.some((e) => e.kind === 'prompt')) return null;

  const promptHours = new Array(24).fill(0);
  const actions = { edits: 0, commands: 0, reads: 0, other: 0, total: 0 };
  const modelCounts = new Map();
  const tokens = { input: 0, output: 0 };
  const projectStats = new Map(); // normalized path -> { path, prompts, lastActive }
  const sources = new Set();
  let prompts = 0;
  let corrections = 0;
  let from = Infinity;
  let to = -Infinity;

  for (const e of kept) {
    sources.add(e.source);
    from = Math.min(from, e.t);
    to = Math.max(to, e.t);
    if (e.kind === 'prompt') {
      prompts++;
      if (e.correction) corrections++;
      promptHours[new Date(e.t).getHours()]++;
    } else if (e.kind === 'tool') {
      actions[classifyTool(e.tool)]++;
      actions.total++;
    } else if (e.kind === 'assistant') {
      tokens.input += e.inTokens || 0;
      tokens.output += e.outTokens || 0;
      if (e.model && e.model !== '<synthetic>') modelCounts.set(e.model, (modelCounts.get(e.model) || 0) + 1);
    }
    if (e.project) {
      const k = normalizePath(e.project);
      const s = projectStats.get(k) || { path: e.project, prompts: 0, lastActive: 0 };
      if (e.kind === 'prompt') s.prompts++;
      s.lastActive = Math.max(s.lastActive, e.t);
      projectStats.set(k, s);
    }
  }

  const activity = measureActivity(kept);
  const busiest = [...activity.perDay.entries()].sort((a, b) => b[1] - a[1])[0];
  const projectList = [...projectStats.entries()]
    .map(([k, s]) => ({
      path: s.path,
      name: path.basename(s.path.replace(/[\\/]+$/, '')) || s.path,
      prompts: s.prompts,
      activeMinutes: Math.round(activity.perProject.get(k) || 0),
      lastActive: new Date(s.lastActive).toISOString(),
    }))
    .sort((a, b) => b.activeMinutes - a.activeMinutes || b.prompts - a.prompts);

  return {
    sources: [...sources],
    range: { from: new Date(from).toISOString(), to: new Date(to).toISOString() },
    prompts,
    corrections,
    activeMinutes: Math.round(activity.total),
    agentSessions: activity.sessions,
    promptHours,
    peakPromptHour: promptHours.indexOf(Math.max(...promptHours)),
    busiestDay: busiest ? { date: busiest[0], minutes: Math.round(busiest[1]) } : null,
    actions,
    models: [...modelCounts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    tokens,
    projects: projectList,
  };
}
