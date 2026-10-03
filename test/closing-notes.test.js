// Closing "Lời nhắn": rule groups, selection limits, fallback, determinism, skipped rules, privacy.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickNotes, notesStatsFrom, poseForLead, isoWeek, hashStr } from '../src/wrapped/closing-notes.js';
import { NOTE_RULES, NOTE_GROUPS } from '../src/wrapped/closing-notes-rules.js';
import { fixtureData, fixtureAi, fixtureLeverage, fixturePerson } from '../scripts/wrapped-preview-fixtures.js';

const SEED = 'ln/builder-journal|2026-W40';
const ids = (r) => r.lines.map((l) => l.id);

test('each group fires on its own fixture stats', () => {
  const cases = [
    [{ peakCommitHour: 0 }, 'S1', 0],
    [{ linesShipped: 81293 }, 'C1', 1],
    [{ daysSinceLastCommit: 20 }, 'N1', 2],
    [{ topWeekday: 5 }, 'F3', 3],
  ];
  for (const [stats, id, group] of cases) {
    const r = pickNotes(stats, SEED);
    assert.equal(r.lines[0].id, id);
    assert.equal(r.lines[0].group, group, `${id} is in ${NOTE_GROUPS[group]}`);
    assert.equal(r.lead, id);
  }
});

test('at most one line per group, at most 3 lines, Sức khỏe kept, shown in group order', () => {
  const everything = {
    peakCommitHour: 0, nightShare: 0.4, streak: 20, busiestDayMin: 500, busiestDate: '12/09', weekendShare: 0.3, agentHoursPerDay: 6, peakPromptHour: 23, noRestStretchDays: 40,
    linesShipped: 90000, peakWeekCommits: 60, peakWeekDate: '13/07', activeDays: 100, totalDays: 150, repos: 6, testShare: 0.2, docsShare: 0.2, linesPerPrompt: 90, prompts: 800, promptDays: 50,
    daysSinceLastCommit: 30, fixShare: 0.5, commits: 300, refactorShare: 0.01, mergeShare: 0.5,
    peakShipHour: 14, topWeekday: 1, models: 4, editReadRatio: 0.9, subagentTasks: 80, topDaypart: 'sang',
  };
  assert.equal(NOTE_RULES.length, 28, 'whole catalog ported');
  const r = pickNotes(everything, SEED);
  assert.ok(r.lines.length <= 3 && r.lines.length >= 2);
  const groups = r.lines.map((l) => l.group);
  assert.equal(new Set(groups).size, groups.length, 'one per group');
  assert.deepEqual(groups, [...groups].sort((a, b) => a - b), 'group order');
  assert.ok(groups.includes(0), 'a Sức khỏe line survives');
  assert.equal(r.lead, 'S1');
});

test('fewer than 2 matches are topped up from the generic pool; always a sign-off', () => {
  const none = pickNotes({}, SEED);
  assert.equal(none.lines.length, 2);
  assert.ok(none.lines.every((l) => l.id === 'CHUNG'));
  assert.notEqual(none.lines[0].text, none.lines[1].text);
  assert.equal(none.lead, 'CHUNG');
  assert.equal(poseForLead('CHUNG'), 'wave');
  assert.ok(none.signoff.length > 10);
  assert.deepEqual(ids(pickNotes({ topWeekday: 1 }, SEED)), ['F2', 'CHUNG']);
});

test('deterministic per seed and ISO week; the week label changes on Monday', () => {
  const stats = { peakCommitHour: 1, streak: 9 };
  assert.deepEqual(pickNotes(stats, SEED), pickNotes(stats, SEED));
  assert.equal(isoWeek(new Date(2026, 9, 3)), '2026-W40'); // Saturday
  assert.equal(isoWeek(new Date(2026, 9, 5)), '2026-W41'); // next Monday
  assert.equal(isoWeek(new Date(2026, 0, 1)), '2026-W01');
  const seen = new Set();
  for (let w = 1; w <= 20; w++) {
    const r = pickNotes(stats, `x|2026-W${w}`);
    seen.add(r.lines[0].text + r.signoff);
  }
  assert.ok(seen.size > 1, 'wording rotates across weeks');
  assert.equal(hashStr('abc'), hashStr('abc'));
});

test('rules with missing inputs never fire (no guessing)', () => {
  for (const rule of NOTE_RULES) assert.equal(rule.when({}), false, `${rule.id} silent without data`);
  const gitOnly = notesStatsFrom(fixtureData());
  for (const k of ['prompts', 'promptDays', 'peakPromptHour', 'busiestDayMin', 'agentHoursPerDay', 'models', 'editReadRatio', 'subagentTasks', 'linesPerPrompt', 'peakShipHour', 'repos']) {
    assert.ok(!(k in gitOnly), `${k} absent without agent data`);
  }
  const ai = { ...fixtureAi(), actions: { edits: 5, commands: 1, reads: 3, other: 0, total: 9 }, activeDays: 0 };
  const sparse = notesStatsFrom(fixtureData({ ai, leverage: null }));
  assert.ok(!('editReadRatio' in sparse), 'too few reads for a ratio');
  assert.ok(!('subagentTasks' in sparse), 'no delegations counter in older data');
  assert.ok(!('agentHoursPerDay' in sparse), 'no active log days');
  assert.ok(!('linesPerPrompt' in sparse));
});

test('tiny histories do not trigger hour/share rules', () => {
  const small = fixtureData();
  small.hero = { ...small.hero, commits: 4, merges: 0 };
  const s = notesStatsFrom(small);
  for (const k of ['peakCommitHour', 'nightShare', 'weekendShare', 'topWeekday', 'testShare', 'fixShare', 'mergeShare']) assert.ok(!(k in s), k);
  assert.ok('streak' in s && 'linesShipped' in s);
});

test('stats map from real aggregate shapes (git, agent, person)', () => {
  const commitHours = Array.from({ length: 24 }, (_, h) => (h === 1 ? 9 : 0));
  const s = notesStatsFrom(fixtureData({ ai: { ...fixtureAi(), commitHours }, leverage: fixtureLeverage() }));
  assert.equal(s.peakPromptHour, 16);
  assert.equal(s.peakShipHour, 1);
  assert.equal(s.busiestDayMin, 412);
  assert.equal(s.busiestDate, '12/09');
  assert.equal(s.subagentTasks, 64);
  assert.equal(s.models, 3);
  assert.equal(s.promptDays, 24);
  assert.equal(s.agentHoursPerDay, Math.round((6730 / 60 / 22) * 10) / 10);
  assert.ok(s.editReadRatio > 0.4 && s.editReadRatio < 0.5);
  assert.ok(s.nightShare > 0 && s.nightShare <= 1);
  assert.equal(s.repos, undefined, 'repo scope has no repo count');
  assert.equal(notesStatsFrom(fixturePerson()).repos, 7);
  assert.ok(pickNotes(s, SEED).lines.some((l) => l.group === 0), 'a night-owl fixture gets a health line');
});

test('notes never carry prompt text or anything but numbers, dates and day-part ids', () => {
  const ai = { ...fixtureAi(), promptText: 'SECRET PROMPT', projects: [{ name: 'SECRET_REPO', path: 'C:/SECRET', prompts: 1, activeMinutes: 1, lastActive: '2026-10-01' }] };
  const stats = notesStatsFrom(fixtureData({ ai, leverage: fixtureLeverage() }));
  assert.doesNotMatch(JSON.stringify(stats), /SECRET/);
  for (const v of Object.values(stats)) assert.ok(typeof v === 'number' || /^(\d\d\/\d\d|sang|chieu|toi|khuya)$/.test(v), `unexpected stat value ${v}`);
  assert.doesNotMatch(JSON.stringify(pickNotes(stats, SEED)), /SECRET/);
});

test('F1 second half follows the ship hour (catalog wording)', () => {
  const f1 = (a, b) => pickNotes({ peakPromptHour: a, peakShipHour: b }, SEED).lines.find((l) => l.id === 'F1')?.text;
  assert.match(f1(15, 23), /Bạn ra lệnh lúc 15h nhưng ship lúc 23h\. Agent làm ca ngày, bạn chốt ca đêm\./);
  assert.match(f1(2, 9), /Đêm agent làm, sáng bạn gom lại ship\./);
  assert.match(f1(9, 15), /Hai ca lệch nhau mà vẫn ăn ý\./);
  assert.equal(f1(10, 12), undefined, 'gap < 4h stays silent');
});
