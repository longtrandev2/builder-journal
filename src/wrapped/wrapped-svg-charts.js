// Inline SVG charts for the Wrapped page (film strip, calendar heatmap, period columns).
// Colors come from CSS variables so themes swap live; no xmlns needed for inline SVG in HTML.
import { escapeHtml, fmtDate, fmtNum } from '../lib/vn-format.js';

/** Commit "film strip": one tick per commit on the time axis, framed by sprocket holes (CSS). */
export function barcodeSvg(ticks) {
  const lines = ticks.map((t) => {
    const x = (t * 1000).toFixed(1);
    return `<line x1="${x}" x2="${x}" y1="0" y2="100"/>`;
  }).join('');
  return `<div class="film"><svg class="barcode" viewBox="0 0 1000 100" preserveAspectRatio="none" role="img" aria-label="${ticks.length} commit trên trục thời gian"><g>${lines}</g></svg><span class="playhead" aria-hidden="true"></span></div>`;
}

const CELL = 12;
const STEP = 15;
const LEFT = 26;
const TOP = 18;
const ROW_LABELS = { 0: 'T2', 2: 'T4', 4: 'T6', 6: 'CN' };
/** Weeks shown on narrow screens (phone, PNG export): ~4 months stays legible at 360px. */
export const COMPACT_WEEKS = 16;
/** Desktop cells never grow past ~1.6x (19px) so a 20-week repo does not bloat to full width. */
const MAX_SCALE = 1.6;

/** Max CSS width of the wide calendar (cells stop growing at MAX_SCALE). Bucket strip aligns to it. */
export const heatmapCapPx = (heatmap) => Math.max(480, Math.round((LEFT + heatmap.weeks.length * STEP) * MAX_SCALE));

function heatGrid(weeks, peakWeek, variant) {
  const width = LEFT + weeks.length * STEP;
  const height = TOP + 7 * STEP;
  const parts = [];
  let lastMonth = '';
  let lastLabelX = -Infinity;
  weeks.forEach((week, w) => {
    const x = LEFT + w * STEP;
    const month = week.start.slice(5, 7);
    // Label a month at its first week, only if the previous label is >= 3 columns away (no "Th5Th6").
    const cutOff = w === 0 && weeks.slice(1, 3).some((wk) => wk.start.slice(5, 7) !== month);
    if (month !== lastMonth && !cutOff && x - lastLabelX >= 3 * STEP && w < weeks.length - 2) {
      parts.push(`<text class="axis" x="${x}" y="11">Th${Number(month)}</text>`);
      lastLabelX = x;
    }
    lastMonth = month;
    week.days.forEach((day, d) => {
      const title = `${fmtDate(day.key)}: ${day.count} commit`;
      parts.push(`<rect class="cell l${day.level}" x="${x}" y="${TOP + d * STEP}" width="${CELL}" height="${CELL}" rx="3"><title>${escapeHtml(title)}</title></rect>`);
    });
    if (week.start === peakWeek) {
      parts.push(`<rect class="peak" x="${x - 2}" y="${TOP - 2}" width="${CELL + 4}" height="${7 * STEP + 1}" rx="5"/>`);
    }
  });
  for (const [row, label] of Object.entries(ROW_LABELS)) {
    parts.push(`<text class="axis" x="0" y="${TOP + Number(row) * STEP + 10}">${label}</text>`);
  }
  const cap = variant === 'wide' ? ` style="max-width:${Math.round(width * MAX_SCALE)}px"` : '';
  return `<svg class="chart heat heat-${variant}" viewBox="0 0 ${width} ${height}"${cap} role="img" aria-label="Lịch commit theo ngày, ${weeks.length} tuần">${parts.join('')}</svg>`;
}

/** The COMPACT_WEEKS-long run of weeks with the most commits (latest wins ties): the part worth showing. */
export function busiestWindow(weeks, size = COMPACT_WEEKS) {
  if (weeks.length <= size) return weeks;
  let best = 0;
  let sum = weeks.slice(0, size).reduce((t, w) => t + w.total, 0);
  let bestSum = sum;
  for (let i = 1; i + size <= weeks.length; i++) {
    sum += weeks[i + size - 1].total - weeks[i - 1].total;
    if (sum >= bestSum) { bestSum = sum; best = i; }
  }
  return weeks.slice(best, best + size);
}

/** Calendar heatmap: full range on wide screens, the busiest COMPACT_WEEKS weeks on narrow ones. */
export function heatmapSvg(heatmap) {
  const { weeks, peakWeek } = heatmap;
  const compact = weeks.length > COMPACT_WEEKS ? heatGrid(busiestWindow(weeks), peakWeek, 'compact') : '';
  const legend = `<div class="heat-legend" aria-hidden="true"><span>Ít</span>${[0, 1, 2, 3, 4].map((l) => `<i class="l${l}"></i>`).join('')}<span>Nhiều</span></div>`;
  return `<div class="heat-box${compact ? ' has-compact' : ''}">${heatGrid(weeks, peakWeek, 'wide')}${compact}${legend}</div>`;
}

/** Small column strip: commits per week / month / quarter. */
export function bucketsSvg(buckets) {
  if (buckets.length < 2) return '';
  const max = Math.max(...buckets.map((b) => b.count));
  const w = 1000 / buckets.length;
  const bars = buckets.map((b, i) => {
    const h = Math.max(2, (b.count / max) * 80);
    return `<rect x="${(i * w + w * 0.15).toFixed(1)}" y="${(80 - h).toFixed(1)}" width="${(w * 0.7).toFixed(1)}" height="${h.toFixed(1)}" rx="1.5"><title>${escapeHtml(b.key)}: ${fmtNum(b.count)} commit</title></rect>`;
  }).join('');
  return `<svg class="chart buckets" viewBox="0 0 1000 80" preserveAspectRatio="none" role="img" aria-label="Số commit theo từng kỳ">${bars}</svg>`;
}
