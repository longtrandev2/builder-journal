// Facebook-group devlog post (Build in Public VN). Plain text, no emoji: copy-paste ready.
// Numbers come from the extractor; only "Nổi nhất" and the story are written by the narrator.
import path from 'node:path';
import { fmtNum, fmtRange } from '../lib/vn-format.js';
import { NPX_COMMAND } from '../lib/product-info.js';

export const TRANSPARENCY_LINE = '(AI hỗ trợ tổng hợp — số liệu đọc trực tiếp từ git)';

/**
 * @param input { repo, from, to, stats, narrative: { highlight, story }, hardest }
 */
export function renderVnCasual(input) {
  const { stats, narrative } = input;
  const lines = [
    `${path.basename(input.repo)} — ${fmtRange(input.from, input.to)}`,
    '',
    `${fmtNum(stats.sessions)} buổi code / ${fmtNum(stats.commits)} commits / ${stats.chapterCount} mảng việc`,
  ];
  if (narrative.highlight) lines.push(`Nổi nhất: ${narrative.highlight}`);
  if (input.hardest) lines.push(`Vấp thật: ${input.hardest}`);
  if (narrative.story) lines.push('', narrative.story);
  lines.push('', `Thử ngay: ${NPX_COMMAND}`, '', TRANSPARENCY_LINE, '');
  return lines.join('\n');
}
