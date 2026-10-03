// Decides WHICH commits a devlog run tells: untold since ledger tail (`last`), a first-run 7-day
// window, a short `since` window (with widening), or a long `since` range (backfill).
// Ledger rule: only `last` advances it. `since` seeds an EMPTY ledger, otherwise it is a retelling.
import { readLedger, lastTold, isTellableFrom, sameAuthors } from './ledger/journal-ledger.js';
import { buildPeriod, buildFixedWindow, parseSince, daysBetween, BACKFILL_THRESHOLD_DAYS } from './extractor/extract-sessions.js';
import { buildBackfill, weeklyDigest } from './extractor/backfill-seeder.js';
import { readPending } from './narrator/manual-fallback.js';
import { MAX_COMMITS } from './extractor/git-reader.js';
import { UserFacingError, runGit } from './lib/run-git.js';

export const NOTHING_NEW = 'Không có commit mới kể từ lần cuối — chạy builder-journal status để xem, hoặc builder-journal since <ngày> để kể lại khoảng cũ.';
export const RETELL_NOTE = 'Kể lại — sổ cái giữ nguyên (lần last sau vẫn tính từ mốc cũ).';

const joinNotes = (...notes) => notes.filter(Boolean).join('\n');

function firstRun(repo, authors, head) {
  const p = buildFixedWindow(repo, { days: 7, authors, withPatch: true, revRange: head });
  const note = p.widened ? `Ít commit nên đã nới ra ${p.days} ngày.` : 'Chạy đầu tiên — lấy 7 ngày gần nhất.';
  return { mode: 'first-run', head, period: p, from: p.from, to: p.to, widened: p.widened, note };
}

/**
 * The manual-fallback rerun (--narrative) must tell exactly what the saved prompt told: reuse the
 * head recorded in .journal/pending.json when it is the same command and still in HEAD's history.
 */
function pendingHead(repo, opts) {
  if (!opts.narrative) return null;
  const p = readPending(repo);
  if (!p || p.mode !== opts.mode || (p.when || '') !== (opts.when || '')) return null;
  return isTellableFrom(repo, p.head) ? p.head : null;
}

/** Returns null when `last` has nothing new (caller prints NOTHING_NEW, exit 0). */
export function resolvePeriod(repo, opts, authors) {
  // Pin the head once: everything read and the ledger boundary refer to this exact commit.
  const fromPending = pendingHead(repo, opts);
  const head = fromPending || runGit(repo, ['rev-parse', 'HEAD']).trim();
  const base = { head, pendingUsed: Boolean(fromPending) };
  const ledger = readLedger(repo);

  if (opts.mode === 'since') {
    const fromDate = parseSince(opts.when);
    const days = daysBetween(fromDate);
    const retell = ledger.length > 0; // non-empty ledger → since never moves it
    const retellNote = retell ? RETELL_NOTE : '';
    if (days > BACKFILL_THRESHOLD_DAYS) {
      const bf = buildBackfill(repo, { from: fromDate.toISOString(), authors, revRange: head });
      if (!bf.commits.length) throw new UserFacingError(`Không có commit nào từ ${opts.when} — thử --author hoặc mốc sớm hơn.`);
      const note = `Kể gộp ${bf.chunks.length} tuần có commit (backfill).${bf.capped ? ` Repo lớn: chỉ lấy ${MAX_COMMITS} commit gần nhất trong khoảng.` : ''}`;
      return { ...base, mode: 'backfill', retell, period: bf, from: bf.from, to: bf.to, backfill: bf, weekly: weeklyDigest(bf), note: joinNotes(note, retellNote) };
    }
    const p = buildFixedWindow(repo, { days: Math.max(1, Math.ceil(days)), authors, withPatch: true, revRange: head });
    const widen = p.widened ? `Ít commit nên đã nới ra ${p.days} ngày.` : '';
    return { ...base, mode: 'since', retell, period: p, from: p.from, to: p.to, widened: p.widened, note: joinNotes(widen, retellNote) };
  }

  const tail = lastTold(ledger);
  if (!tail) return { ...firstRun(repo, authors, head), ...base };
  if (!isTellableFrom(repo, tail.last_commit_hash)) {
    console.warn('Mốc kể lần trước không còn trong lịch sử (rebase/reset?) — lấy lại 7 ngày gần nhất.');
    return { ...firstRun(repo, authors, head), ...base };
  }
  const period = buildPeriod(repo, { authors, revRange: `${tail.last_commit_hash}..${head}`, withPatch: true });
  if (!period.commits.length) return null;
  const warnings = [];
  if (!sameAuthors(tail.authors, authors)) {
    warnings.push(`Lưu ý: lần kể trước dùng tác giả khác (${tail.authors.join(', ')}) so với lần này (${authors.join(', ')}) — kiểm tra --author nếu không chủ ý.`);
  }
  if (period.capped) {
    warnings.push(`Lưu ý: còn hơn ${MAX_COMMITS} commit chưa kể — chỉ đọc ${MAX_COMMITS} commit mới nhất, phần cũ hơn sẽ bị bỏ qua (kể lại bằng builder-journal since <ngày> nếu cần).`);
  }
  return {
    ...base,
    mode: 'last',
    period,
    from: period.commits[0].date,
    to: new Date().toISOString(),
    note: joinNotes(period.commits.length < 3 ? 'Kỳ này mỏng — bài sẽ ngắn, cứ đăng thật.' : '', ...warnings),
  };
}
