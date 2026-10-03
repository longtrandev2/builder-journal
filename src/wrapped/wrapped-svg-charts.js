// Inline SVG charts for the Wrapped page. Colors come from CSS variables so themes swap live.
import { escapeHtml, fmtDate } from '../lib/vn-format.js';

/** Commit "film strip": one vertical tick per commit, positioned on the time axis. */
export function barcodeSvg(ticks) {
  const lines = ticks.map((t) => {
    const x = (t * 1000).toFixed(1);
    return `<line x1="${x}" x2="${x}" y1="0" y2="100"/>`;
  }).join('');
  return `<svg class="barcode" viewBox="0 0 1000 100" preserveAspectRatio="none" role="img" aria-label="${ticks.length} commit trên trục thời gian"><g>${lines}</g></svg>`;
}

const CELL = 12;
const STEP = 15;
const LEFT = 30;
const TOP = 20;
const ROW_LABELS = { 0: 'T2', 2: 'T4', 4: 'T6', 6: 'CN' };

/** GitHub-style calendar, Vietnamese weekday/month labels, peak week outlined. */
export function heatmapSvg(heatmap) {
  const { weeks, peakWeek } = heatmap;
  const width = LEFT + weeks.length * STEP;
  const height = TOP + 7 * STEP;
  const parts = [];
  let lastMonth = '';
  weeks.forEach((week, w) => {
    const x = LEFT + w * STEP;
    const month = week.start.slice(5, 7);
    if (month !== lastMonth && w < weeks.length - 1) {
      parts.push(`<text class="axis" x="${x}" y="12">Th${Number(month)}</text>`);
      lastMonth = month;
    }
    week.days.forEach((day, d) => {
      const title = `${fmtDate(day.key)}: ${day.count} commit`;
      parts.push(`<rect class="cell" x="${x}" y="${TOP + d * STEP}" width="${CELL}" height="${CELL}" rx="3" fill="var(--heat${day.level})"><title>${escapeHtml(title)}</title></rect>`);
    });
    if (week.start === peakWeek) {
      parts.push(`<rect class="peak" x="${x - 2}" y="${TOP - 2}" width="${CELL + 4}" height="${7 * STEP + 1}" rx="5"/>`);
    }
  });
  for (const [row, label] of Object.entries(ROW_LABELS)) {
    parts.push(`<text class="axis" x="0" y="${TOP + Number(row) * STEP + 10}">${label}</text>`);
  }
  return `<svg class="chart heat" viewBox="0 0 ${width} ${height}" role="img" aria-label="Lịch commit theo ngày">${parts.join('')}</svg>`;
}

/** Small column strip: commits per week / month / quarter. */
export function bucketsSvg(buckets) {
  if (buckets.length < 2) return '';
  const max = Math.max(...buckets.map((b) => b.count));
  const w = 1000 / buckets.length;
  const bars = buckets.map((b, i) => {
    const h = Math.max(2, (b.count / max) * 80);
    return `<rect x="${(i * w + w * 0.15).toFixed(1)}" y="${(90 - h).toFixed(1)}" width="${(w * 0.7).toFixed(1)}" height="${h.toFixed(1)}" rx="2"><title>${escapeHtml(b.key)}: ${b.count} commit</title></rect>`;
  }).join('');
  return `<svg class="chart buckets" viewBox="0 0 1000 90" preserveAspectRatio="none" style="height:70px;margin-top:28px" role="img" aria-label="Số commit theo từng kỳ">${bars}</svg>`;
}

/** 24-hour clock: one radial bar per hour, the busiest hour in accent color. */
export function clockSvg(hours, peakHour) {
  const cx = 170;
  const cy = 170;
  const inner = 62;
  const reach = 92;
  const max = Math.max(1, ...hours);
  const hands = hours.map((count, h) => {
    const len = 4 + (count / max) * reach;
    const angle = (h / 24) * 360;
    const cls = h === peakHour ? 'hand peak' : 'hand';
    return `<rect class="${cls}" x="${cx - 4}" y="${cy - inner - len}" width="8" height="${len.toFixed(1)}" rx="4" transform="rotate(${angle} ${cx} ${cy})"><title>${h}h: ${count} commit</title></rect>`;
  }).join('');
  const labels = [0, 6, 12, 18].map((h) => {
    const a = ((h / 24) * 2 * Math.PI) - Math.PI / 2;
    const r = inner - 16;
    return `<text x="${(cx + Math.cos(a) * r).toFixed(1)}" y="${(cy + Math.sin(a) * r + 5).toFixed(1)}">${h}h</text>`;
  }).join('');
  return `<svg class="chart clock" viewBox="0 0 340 340" role="img" aria-label="Commit theo giờ trong ngày, nhiều nhất lúc ${peakHour}h">${hands}${labels}<text class="center num" x="${cx}" y="${cy + 15}">${peakHour}h</text></svg>`;
}
