// Hour-of-day charts: the 24h radial clock (commits) and the mirrored "who works when" columns
// (prompts to the agent above the axis, commits below).

const CX = 170;
const CY = 170;
const INNER = 58;
const REACH = 84;

/** 24-hour clock: one radial hand per hour over a faint full-length track; busiest hour in accent. */
export function clockSvg(hours, peakHour, { unit = 'commit' } = {}) {
  const max = Math.max(1, ...hours);
  const hands = hours.map((count, h) => {
    const len = count ? 6 + (count / max) * (REACH - 6) : 0;
    const top = CY - INNER - REACH;
    const hand = len ? `<rect class="hand${h === peakHour ? ' peak' : ''}" x="${CX - 4}" y="${(CY - INNER - len).toFixed(1)}" width="8" height="${len.toFixed(1)}" rx="4"/>` : '';
    return `<g transform="rotate(${h * 15} ${CX} ${CY})"><title>${h}h: ${count} ${unit}</title><rect class="track" x="${CX - 4}" y="${top}" width="8" height="${REACH}" rx="4"/>${hand}</g>`;
  }).join('');
  // Axis labels sit outside the ring; the peak's own label is dropped because the center shows it.
  const labels = [0, 6, 12, 18].filter((h) => h !== peakHour).map((h) => {
    const a = (h / 24) * 2 * Math.PI - Math.PI / 2;
    const r = INNER + REACH + 16;
    return `<text class="tick" x="${(CX + Math.cos(a) * r).toFixed(1)}" y="${(CY + Math.sin(a) * r + 5).toFixed(1)}">${h}h</text>`;
  }).join('');
  const sweep = `<line class="sweep" x1="${CX}" y1="${CY}" x2="${CX}" y2="${CY - INNER - REACH - 4}"/>`;
  return `<svg class="chart clock" viewBox="0 0 340 340" role="img" aria-label="${unit} theo giờ trong ngày, nhiều nhất lúc ${peakHour}h">` +
    `${hands}${sweep}${labels}<text class="center" x="${CX}" y="${CY + 10}">${peakHour}h</text><text class="center-cap" x="${CX}" y="${CY + 34}">cao điểm</text></svg>`;
}

/**
 * Mirrored hour columns: prompts (accent, up) vs commits (ink, down), hour labels in the gutter.
 * Each series is scaled to its own max: the shape (when) matters, not the absolute ratio.
 */
export function hourDuelSvg(promptHours, commitHours) {
  const pMax = Math.max(1, ...promptHours);
  const cMax = Math.max(1, ...commitHours);
  const pPeak = promptHours.indexOf(Math.max(...promptHours));
  const cPeak = commitHours.indexOf(Math.max(...commitHours));
  const H = 70;
  const cols = [];
  for (let h = 0; h < 24; h++) {
    const x = h * 20 + 4;
    const ph = promptHours[h] ? Math.max(2, (promptHours[h] / pMax) * H) : 0;
    const ch = commitHours[h] ? Math.max(2, (commitHours[h] / cMax) * H) : 0;
    cols.push(`<rect class="up${h === pPeak ? ' peak' : ''}" x="${x}" y="${(H - ph).toFixed(1)}" width="12" height="${ph.toFixed(1)}" rx="2"><title>${h}h: ${promptHours[h]} lệnh</title></rect>`);
    cols.push(`<rect class="down${h === cPeak ? ' peak' : ''}" x="${x}" y="${H + 22}" width="12" height="${ch.toFixed(1)}" rx="2"><title>${h}h: ${commitHours[h]} commit</title></rect>`);
    if (h % 6 === 0) cols.push(`<text class="axis" x="${x + 6}" y="${H + 15}">${h}h</text>`);
  }
  cols.push(`<text class="axis" x="${23 * 20 + 10}" y="${H + 15}">23h</text>`);
  return `<svg class="chart duel" viewBox="0 0 480 ${2 * H + 22}" role="img" aria-label="Lệnh cho agent và commit theo giờ, lệnh nhiều nhất lúc ${pPeak}h, commit nhiều nhất lúc ${cPeak}h">${cols.join('')}</svg>`;
}
