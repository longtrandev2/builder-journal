// Closing "Lời nhắn": pure, deterministic selection of 2–3 warm notes + a sign-off from real stats.
//   notesStatsFrom(data)        Wrapped data → flat stats object (fields missing when the data is missing)
//   pickNotes(stats, seedKey)   stats → { lines, lead, signoff }   (rules: closing-notes-rules.js)
// Selection: <=1 line per group, top 3 by priority (a Sức khỏe line is kept whenever one matched),
// shown in group order. Fewer than 2 matches → topped up from the "Chung" pool. Wording and sign-off
// come from hash(seedKey + rule id); seedKey = name + ISO week, so a re-run in the same week reads the same.
// No prompt text ever reaches this module: it only sees counts, hours and shares.
import { fmtDate } from '../lib/vn-format.js';
import { NOTE_GROUPS, NOTE_RULES, NOTE_FALLBACK, NOTE_SIGNOFFS } from './closing-notes-rules.js';

const MIN_COMMITS_FOR_SHARES = 10; // below this, hour/weekday/chapter shares are noise: those rules stay silent
const MIN_READS_FOR_RATIO = 20;

/** FNV-1a 32-bit: deterministic seed from a string. */
export function hashStr(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return h >>> 0;
}

/** ISO week label of a local date, e.g. "2026-W40". */
export function isoWeek(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const w = Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(w).padStart(2, '0')}`;
}

/** @returns {{ lines: {id, group, priority, text}[], lead: string, signoff: string }}  lead = strongest picked rule id (drives the pose). */
export function pickNotes(stats, seedKey) {
  const variant = (list, salt) => list[hashStr(`${seedKey}:${salt}`) % list.length];
  const fill = (tpl, v) => tpl.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''));
  const matched = NOTE_RULES.filter((r) => { try { return r.when(stats); } catch { return false; } });
  const best = []; // strongest rule per group (catalog order breaks priority ties)
  NOTE_GROUPS.forEach((_, g) => {
    const inGroup = matched.filter((r) => r.g === g);
    if (inGroup.length) best.push(inGroup.reduce((a, b) => (b.p > a.p ? b : a)));
  });
  const chosen = [...best].sort((a, b) => b.p - a.p).slice(0, 3);
  const health = best.find((r) => r.g === 0);
  if (health && !chosen.includes(health)) chosen[chosen.length - 1] = health; // keep one Sức khỏe line
  const lead = chosen.length ? chosen.reduce((a, b) => (b.p > a.p ? b : a)) : null;
  chosen.sort((a, b) => a.g - b.g);
  const lines = chosen.map((r) => ({ id: r.id, group: r.g, priority: r.p, text: fill(variant(r.say, r.id), r.vars(stats)) }));
  // Top up to 2 lines from the generic pool (distinct sentences, starting point chosen by seed).
  for (let i = 0; lines.length < 2; i++) {
    const start = hashStr(`${seedKey}:chung`) % NOTE_FALLBACK.length;
    lines.push({ id: 'CHUNG', group: -1, priority: 0, text: NOTE_FALLBACK[(start + i) % NOTE_FALLBACK.length] });
  }
  return { lines, lead: lead ? lead.id : 'CHUNG', signoff: variant(NOTE_SIGNOFFS, 'signoff') };
}

/** Pose for the lead note: khuya → ngủ gật, ăn mừng → reo, nhắc nhẹ / sức khỏe khác → suy nghĩ, chuyện vui → cười, chung → vẫy. */
const GROUP_POSE = { S: 'think', C: 'cheer', N: 'think', F: 'laugh' };
export function poseForLead(id) {
  if (['S1', 'S2', 'S7'].includes(id)) return 'doze';
  return id === 'CHUNG' ? 'wave' : GROUP_POSE[id[0]] || 'wave';
}

const share = (n, of) => (of > 0 ? n / of : undefined);
const peakIndex = (arr) => arr.indexOf(Math.max(...arr));

/**
 * Wrapped data (aggregateWrapped + ai + leverage + repos) → stats for the rules.
 * Anything not measurable from the data is left undefined so its rules are skipped, never guessed.
 */
export function notesStatsFrom(data) {
  const { hero, habits: h, heatmap, range } = data;
  const s = { commits: hero.commits, activeDays: hero.activeDays, totalDays: range?.days, linesShipped: hero.codeLines, streak: h.streak,
    daysSinceLastCommit: h.daysSinceLastCommit, noRestStretchDays: h.noRestStretchDays };
  if (heatmap?.peakTotal) { s.peakWeekCommits = heatmap.peakTotal; s.peakWeekDate = fmtDate(heatmap.peakWeek, false); }
  if (data.scope === 'person' && data.repos?.length) s.repos = data.repos.length;
  if (hero.commits >= MIN_COMMITS_FOR_SHARES) {
    const work = hero.commits - (hero.merges || 0);
    const chapter = (id) => share((data.chapters || []).find((c) => c.id === id)?.count || 0, work);
    Object.assign(s, { peakCommitHour: h.peakHour, nightShare: h.nightShare, weekendShare: h.weekendShare, topWeekday: h.busiestWeekdayIndex,
      topDaypart: h.topDaypart?.id, mergeShare: share(hero.merges || 0, hero.commits),
      testShare: chapter('test'), docsShare: chapter('docs'), fixShare: chapter('fix'), refactorShare: chapter('refactor') });
  }
  const ai = data.ai;
  if (ai && Array.isArray(ai.promptHours)) {
    s.prompts = ai.prompts;
    s.promptDays = ai.promptDays;
    s.peakPromptHour = Number.isInteger(ai.peakPromptHour) ? ai.peakPromptHour : peakIndex(ai.promptHours);
    if (ai.busiestDay) { s.busiestDayMin = ai.busiestDay.minutes; s.busiestDate = fmtDate(ai.busiestDay.date, false); }
    if (ai.activeDays > 0) s.agentHoursPerDay = Math.round((ai.activeMinutes / 60 / ai.activeDays) * 10) / 10;
    if (ai.models?.length) s.models = ai.models.length;
    const a = ai.actions;
    if (a && a.reads >= MIN_READS_FOR_RATIO) s.editReadRatio = a.edits / a.reads;
    if (a && Number.isFinite(a.delegations)) s.subagentTasks = a.delegations;
    if (Array.isArray(ai.commitHours) && ai.commitHours.some(Boolean)) s.peakShipHour = peakIndex(ai.commitHours);
  }
  if (data.leverage?.prompts) s.linesPerPrompt = data.leverage.linesPerPrompt;
  for (const k of Object.keys(s)) if (s[k] === undefined || (typeof s[k] === 'number' && !Number.isFinite(s[k]))) delete s[k];
  return s;
}
