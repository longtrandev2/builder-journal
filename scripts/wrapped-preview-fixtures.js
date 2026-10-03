// Deterministic fixture data for the Wrapped page: preview screenshots + test/wrapped-html.test.js.
// Git part goes through the real aggregateWrapped(); AI part mirrors the data.ai contract.
import { aggregateWrapped } from '../src/wrapped/wrapped-aggregator.js';

const DAY = 86400000;

/** Small LCG so every run renders identical pages. */
function rng(seed) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
}

const pad = (n) => String(n).padStart(2, '0');
const iso = (ms, hour, min) => `${new Date(ms).toISOString().slice(0, 10)}T${pad(hour)}:${pad(min)}:00+07:00`;

/** ~26 weeks of commits, late-night heavy, with a burst week and a few quiet weeks. */
export function fixturePeriod({ weeks = 26, seed = 7 } = {}) {
  const rand = rng(seed);
  const start = Date.UTC(2026, 2, 16);
  const commits = [];
  const sessions = [];
  for (let day = 0; day < weeks * 7; day++) {
    const week = Math.floor(day / 7);
    const busy = week === 17 ? 0.95 : week % 9 === 4 ? 0.1 : 0.55;
    if (rand() > busy) continue;
    const n = 1 + Math.floor(rand() * (week === 17 ? 9 : 4));
    const startHour = [22, 23, 0, 14, 20][Math.floor(rand() * 5)];
    for (let i = 0; i < n; i++) commits.push({ date: iso(start + day * DAY, (startHour + i) % 24, Math.floor(rand() * 59)) });
    sessions.push({ start: commits[commits.length - n].date, durationMinutes: 30 + n * 35 });
  }
  commits.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const total = commits.length;
  const chapters = { feature: Math.round(total * 0.46), fix: Math.round(total * 0.24), refactor: Math.round(total * 0.14), infra: Math.round(total * 0.09) };
  chapters.test = total - Object.values(chapters).reduce((s, x) => s + x, 0);
  return { commits, sessions, stats: { sessions: sessions.length, commits: total, chapterCount: 5, codeLines: 81293, chapters } };
}

export function fixtureData(overrides = {}) {
  const data = aggregateWrapped(fixturePeriod(), { unit: 'week', repoName: 'PRO.IndieHub', displayName: 'Ln' });
  return { ...data, scope: 'repo', ai: null, leverage: null, ...overrides };
}

export const fixtureAi = () => ({
  sources: ['claude-code'],
  range: { from: '2026-09-07', to: '2026-10-03' },
  prompts: 765,
  promptsBySource: { 'claude-code': 765 },
  promptDays: 24,
  activeDays: 22,
  corrections: 98,
  activeMinutes: 6730,
  agentSessions: 34,
  promptHours: [6, 2, 0, 0, 0, 0, 0, 3, 12, 30, 44, 52, 28, 40, 61, 70, 92, 81, 47, 33, 39, 51, 42, 18],
  peakPromptHour: 16,
  busiestDay: { date: '2026-09-12', minutes: 412 },
  actions: { edits: 1001, commands: 1612, reads: 2340, other: 310, delegations: 64, total: 5263 },
  models: [{ name: 'GLM-5.3', count: 420 }, { name: 'claude-opus-4-5', count: 212 }, { name: 'GLM-5', count: 133 }],
  tokens: { input: 2140000000, output: 11234567 },
  projects: [{ path: 'D:/Project/PRO.IndieHub', name: 'PRO.IndieHub', prompts: 402, activeMinutes: 3300, lastActive: '2026-10-03' }],
});

export const fixtureLeverage = () => ({ prompts: 765, commits: 298, codeLines: 81293, linesPerPrompt: 106.27, commitsPerPrompt: 0.3895 });

export function fixturePerson(overrides = {}) {
  return fixtureData({
    scope: 'person',
    repoName: 'Bùi Thế Vĩnh Nguyên',
    ai: fixtureAi(),
    leverage: fixtureLeverage(),
    repos: [
      { name: 'PRO.IndieHub', commits: 298, activeDays: 56, codeLines: 81293 },
      { name: 'builder-journal', commits: 41, activeDays: 3, codeLines: 6120 },
      { name: 'landing-2026', commits: 63, activeDays: 12, codeLines: 9400 },
      { name: 'dotfiles', commits: 12, sessions: 6, codeLines: 380 },
      { name: 'vn-invoice-kit', commits: 27, sessions: 8, codeLines: 4210 },
      { name: 'notes', commits: 5, sessions: 3, codeLines: 0 },
      { name: 'old-portfolio', commits: 3, sessions: 2, codeLines: 210 },
    ],
    ...overrides,
  });
}

export const fixtureWeek = (withAi = true) => ({
  displayName: 'Ln',
  repoName: 'PRO.IndieHub',
  range: { from: '2026-09-28', to: '2026-10-04' },
  sessions: 7,
  commits: 31,
  codeLines: 4820,
  chapters: [{ label: 'Viết tính năng', percent: 52 }, { label: 'Sửa lỗi', percent: 29 }, { label: 'Kiểm thử', percent: 19 }],
  ai: withAi ? { ...fixtureAi(), prompts: 188, corrections: 21, activeMinutes: 1260, range: { from: '2026-09-28', to: '2026-10-04' } } : null,
  hardest: 'Đồng bộ lịch đặt chỗ giữa hai múi giờ mà không làm hỏng dữ liệu cũ.',
});
