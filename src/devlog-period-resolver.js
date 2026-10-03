// Decides WHICH commits a devlog run tells: untold since ledger tail (`last`), a first-run 7-day
// window, a short `since` window (with widening), or a long `since` range (backfill).
import { readLedger, lastTold, isTellableFrom } from './ledger/journal-ledger.js';
import { buildPeriod, buildFixedWindow, parseSince, daysBetween, BACKFILL_THRESHOLD_DAYS } from './extractor/extract-sessions.js';
import { buildBackfill, weeklyDigest } from './extractor/backfill-seeder.js';
import { UserFacingError, runGit } from './lib/run-git.js';

export const NOTHING_NEW = 'Không có commit mới kể từ lần cuối — chạy builder-journal status để xem, hoặc builder-journal since <ngày> để kể lại khoảng cũ.';

function firstRun(repo, authors, head) {
  const p = buildFixedWindow(repo, { days: 7, authors, withPatch: true, revRange: head });
  const note = p.widened ? `Ít commit nên đã nới ra ${p.days} ngày.` : 'Chạy đầu tiên — lấy 7 ngày gần nhất.';
  return { mode: 'first-run', head, period: p, from: p.from, to: p.to, widened: p.widened, note };
}

/** Returns null when `last` has nothing new (caller prints NOTHING_NEW, exit 0). */
export function resolvePeriod(repo, opts, authors) {
  // Pin HEAD once: everything read and the ledger boundary refer to this exact commit.
  const head = runGit(repo, ['rev-parse', 'HEAD']).trim();
  if (opts.mode === 'since') {
    const fromDate = parseSince(opts.when);
    const days = daysBetween(fromDate);
    if (days > BACKFILL_THRESHOLD_DAYS) {
      const bf = buildBackfill(repo, { from: fromDate.toISOString(), authors, revRange: head });
      if (!bf.commits.length) throw new UserFacingError(`Không có commit nào từ ${opts.when} — thử --author hoặc mốc sớm hơn.`);
      const note = `Kể gộp ${bf.chunks.length} tuần có commit (backfill).${bf.capped ? ' Repo lớn: chỉ lấy 5000 commit gần nhất trong khoảng.' : ''}`;
      return { mode: 'backfill', head, period: bf, from: bf.from, to: bf.to, backfill: bf, weekly: weeklyDigest(bf), note };
    }
    const p = buildFixedWindow(repo, { days: Math.max(1, Math.ceil(days)), authors, withPatch: true, revRange: head });
    return { mode: 'since', head, period: p, from: p.from, to: p.to, widened: p.widened, note: p.widened ? `Ít commit nên đã nới ra ${p.days} ngày.` : '' };
  }

  const tail = lastTold(readLedger(repo));
  if (!tail) return firstRun(repo, authors, head);
  if (!isTellableFrom(repo, tail.last_commit_hash)) {
    console.warn('Mốc kể lần trước không còn trong lịch sử (rebase/reset?) — lấy lại 7 ngày gần nhất.');
    return firstRun(repo, authors, head);
  }
  const period = buildPeriod(repo, { authors, revRange: `${tail.last_commit_hash}..${head}`, withPatch: true });
  if (!period.commits.length) return null;
  return {
    mode: 'last',
    head,
    period,
    from: period.commits[0].date,
    to: new Date().toISOString(),
    note: period.commits.length < 3 ? 'Kỳ này mỏng — bài sẽ ngắn, cứ đăng thật.' : '',
  };
}
