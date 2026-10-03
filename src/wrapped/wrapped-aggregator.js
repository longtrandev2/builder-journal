// Deterministic numbers for the Wrapped page. Every figure on the page comes from here —
// the optional AI sentence is the only non-deterministic element.
// Times use each commit's own local clock (ISO offset kept), so "0h" means the author's midnight.
import { CHAPTER_LABELS } from '../extractor/chapter-classifier.js';

const DAY = 86400000;
const MAX_WEEKS = 53;

const dayKey = (iso) => iso.slice(0, 10);
const hourOf = (iso) => Number(iso.slice(11, 13));
const utcDay = (key) => Date.UTC(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1, Number(key.slice(8, 10)));
const keyOf = (ms) => new Date(ms).toISOString().slice(0, 10);
const mondayOf = (ms) => ms - ((new Date(ms).getUTCDay() + 6) % 7) * DAY;

export function longestStreak(dayKeys) {
  const days = [...new Set(dayKeys)].sort().map(utcDay);
  let best = 0;
  let run = 0;
  for (let i = 0; i < days.length; i++) {
    run = i > 0 && days[i] - days[i - 1] === DAY ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

/** GitHub-style grid: columns = weeks (Mon→Sun), capped to the last 53 weeks. */
export function buildHeatmap(perDay) {
  const keys = Object.keys(perDay).sort();
  const lastMonday = mondayOf(utcDay(keys[keys.length - 1]));
  let start = mondayOf(utcDay(keys[0]));
  const truncated = (lastMonday - start) / (7 * DAY) + 1 > MAX_WEEKS;
  if (truncated) start = lastMonday - (MAX_WEEKS - 1) * 7 * DAY;
  const max = Math.max(...Object.values(perDay));
  const weeks = [];
  for (let w = start; w <= lastMonday; w += 7 * DAY) {
    const days = [];
    for (let d = 0; d < 7; d++) {
      const key = keyOf(w + d * DAY);
      const count = perDay[key] || 0;
      // sqrt scale keeps quiet days visible next to one monster day
      const level = count ? Math.min(4, Math.max(1, Math.ceil(Math.sqrt(count / max) * 4))) : 0;
      days.push({ key, count, level });
    }
    weeks.push({ start: keyOf(w), days, total: days.reduce((s, x) => s + x.count, 0) });
  }
  const peak = weeks.reduce((a, b) => (b.total > a.total ? b : a));
  return { weeks, truncated, peakWeek: peak.start, peakTotal: peak.total, max };
}

function bucketKey(iso, unit) {
  const key = dayKey(iso);
  if (unit === 'month') return key.slice(0, 7);
  if (unit === 'quarter') return `${key.slice(0, 4)}-Q${Math.floor((Number(key.slice(5, 7)) - 1) / 3) + 1}`;
  return keyOf(mondayOf(utcDay(key)));
}

const DAYPARTS = [
  { id: 'sang', label: 'Sáng', from: 5, to: 11 },
  { id: 'chieu', label: 'Chiều', from: 12, to: 17 },
  { id: 'toi', label: 'Tối', from: 18, to: 22 },
  { id: 'khuya', label: 'Khuya', from: 23, to: 4 },
];
const inPart = (h, p) => (p.from <= p.to ? h >= p.from && h <= p.to : h >= p.from || h <= p.to);
/** Rest stats over the sorted active-day keys: longest gap (rest days between two active days) and the longest
 *  stretch (first→last day, inclusive) in which no two active days are more than 1 rest day apart. */
export function restStats(dayKeys) {
  const days = [...new Set(dayKeys)].sort().map(utcDay);
  let longestGapDays = 0;
  let noRestStretchDays = days.length ? 1 : 0;
  let start = days[0];
  for (let i = 1; i < days.length; i++) {
    const rest = (days[i] - days[i - 1]) / DAY - 1;
    longestGapDays = Math.max(longestGapDays, rest);
    if (rest > 1) start = days[i];
    noRestStretchDays = Math.max(noRestStretchDays, (days[i] - start) / DAY + 1);
  }
  return { longestGapDays, noRestStretchDays };
}

const localKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const WEEKDAYS = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

/**
 * @param period  output of periodFromCommits (commits classified)
 * @param options { unit, repoName, displayName, now }  now = run time (daysSinceLastCommit is measured against it)
 */
export function aggregateWrapped(period, { unit = 'week', repoName, displayName, now = new Date() }) {
  const { commits, stats } = period;
  const first = commits[0].date;
  const last = commits[commits.length - 1].date;
  const t0 = Date.parse(first);
  const span = Math.max(1, Date.parse(last) - t0);

  const perDay = {};
  const hours = Array(24).fill(0);
  const weekdays = Array(7).fill(0);
  const buckets = {};
  for (const c of commits) {
    const k = dayKey(c.date);
    perDay[k] = (perDay[k] || 0) + 1;
    hours[hourOf(c.date)]++;
    weekdays[new Date(utcDay(k)).getUTCDay()]++;
    const b = bucketKey(c.date, unit);
    buckets[b] = (buckets[b] || 0) + 1;
  }
  const peakHour = hours.indexOf(Math.max(...hours));
  const nightHours = hours.slice(0, 5).reduce((s, n) => s + n, 0); // 0h–4h
  const dayparts = DAYPARTS.map((p) => ({ ...p, count: hours.filter((_, h) => inPart(h, p)).reduce((s, n) => s + n, 0) }));

  return {
    repoName,
    displayName,
    unit,
    range: { from: first, to: last, days: Math.round(span / DAY) + 1 },
    hero: { activeDays: Object.keys(perDay).length, commits: stats.commits, merges: stats.merges || 0, chapters: stats.chapterCount, codeLines: stats.codeLines },
    // Ticks deduped at 0.1% resolution: same picture, ≤1001 lines even for a 5000-commit repo.
    ticks: [...new Set(commits.map((c) => Math.round(((Date.parse(c.date) - t0) / span) * 1000) / 1000))],
    heatmap: buildHeatmap(perDay),
    activeDays: Object.keys(perDay).length,
    classifiedBy: stats.classifiedBy || { prefix: 0, diff: commits.length },
    buckets: Object.entries(buckets).sort((a, b) => a[0].localeCompare(b[0])).map(([key, count]) => ({ key, count })),
    // % of commits that carry code (merge commits have no chapter of their own).
    chapters: Object.entries(stats.chapters).map(([id, count]) => ({
      id,
      label: CHAPTER_LABELS[id] || id,
      count,
      percent: Math.round((count / Math.max(1, stats.commits - (stats.merges || 0))) * 100),
    })),
    habits: {
      hours,
      peakHour,
      peakHourCount: hours[peakHour],
      dayparts,
      topDaypart: dayparts.reduce((a, b) => (b.count > a.count ? b : a)),
      streak: longestStreak(Object.keys(perDay)),
      busiestWeekday: WEEKDAYS[weekdays.indexOf(Math.max(...weekdays))],
      busiestWeekdayIndex: weekdays.indexOf(Math.max(...weekdays)), // 0 = Chủ nhật
      nightShare: nightHours / commits.length,
      weekendShare: (weekdays[0] + weekdays[6]) / commits.length,
      ...restStats(Object.keys(perDay)),
      daysSinceLastCommit: Math.max(0, Math.round((utcDay(localKey(now)) - utcDay(dayKey(last))) / DAY)),
    },
  };
}
