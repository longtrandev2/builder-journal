// `status`: where the ledger stands and how much is still untold.
import path from 'node:path';
import { resolveRepo } from './lib/run-git.js';
import { loadConfig, resolveAuthors } from './lib/journal-config.js';
import { readLedger, lastTold, untoldCount } from './ledger/journal-ledger.js';
import { fmtDate } from './lib/vn-format.js';

export function runStatus(opts) {
  const repo = resolveRepo(opts.repo);
  const { config } = loadConfig(repo);
  const authors = resolveAuthors(config, opts.author);
  const name = path.basename(repo);
  const entries = readLedger(repo);
  const tail = lastTold(entries);
  if (!tail) {
    console.log(`${name}: chưa kể lần nào. Gợi ý: builder-journal last (lấy 7 ngày gần nhất) hoặc builder-journal wrapped.`);
    return;
  }
  const untold = untoldCount(repo, authors, tail);
  const told = `Lần cuối kể ${fmtDate(tail.date)} (${tail.last_commit_hash.slice(0, 7)}) — ${tail.stats.commits} commits, ${tail.stats.sessions} buổi`;
  const seeded = entries.filter((e) => e.seeded).length;
  const extra = seeded ? ` · ${seeded} tuần kể gộp (backfill)` : '';
  if (untold === null) {
    console.log(`${name}: ${told}${extra} · Mốc cũ không còn trong lịch sử. Gợi ý: builder-journal since 7d`);
  } else {
    const hint = untold ? 'builder-journal last' : 'chưa có gì mới, code tiếp đã';
    console.log(`${name}: ${told}${extra} · Chưa kể: ${untold} commits · Gợi ý: ${hint}`);
  }
}
