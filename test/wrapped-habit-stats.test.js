// Deterministic habit stats that feed the closing notes: night/weekend share, rest gaps, recency.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aggregateWrapped, restStats } from '../src/wrapped/wrapped-aggregator.js';

const periodOf = (dates) => ({
  commits: dates.map((date) => ({ date })),
  stats: { commits: dates.length, merges: 0, chapterCount: 1, chapters: { feature: dates.length }, codeLines: 0, activeDays: 1 },
});
const opts = (now) => ({ repoName: 'r', displayName: 'n', now });

test('night share, weekend share, busiest weekday and days since the last commit', () => {
  // 2026-09-01 is a Tuesday; 09-05 Saturday, 09-06 Sunday.
  const p = periodOf(['2026-09-01T01:30:00+07:00', '2026-09-05T10:00:00+07:00', '2026-09-06T23:10:00+07:00', '2026-09-08T14:00:00+07:00']);
  const h = aggregateWrapped(p, opts(new Date(2026, 8, 20, 12))).habits;
  assert.equal(h.nightShare, 0.25); // only the 01:30 commit is in 0-4h
  assert.equal(h.weekendShare, 0.5);
  assert.equal(h.busiestWeekdayIndex, 2); // Tuesday x2
  assert.equal(h.busiestWeekday, 'Thứ ba');
  assert.equal(h.daysSinceLastCommit, 12);
  assert.equal(aggregateWrapped(p, opts(new Date(2026, 8, 8, 23))).habits.daysSinceLastCommit, 0);
});

test('longest rest gap and the longest stretch with at most one rest day', () => {
  assert.deepEqual(restStats(['2026-09-01', '2026-09-02', '2026-09-05']), { longestGapDays: 2, noRestStretchDays: 2 });
  assert.deepEqual(restStats(['2026-09-01', '2026-09-03', '2026-09-04', '2026-09-06']), { longestGapDays: 1, noRestStretchDays: 6 });
  assert.deepEqual(restStats(['2026-09-01']), { longestGapDays: 0, noRestStretchDays: 1 });
  assert.deepEqual(restStats([]), { longestGapDays: 0, noRestStretchDays: 0 });
});
