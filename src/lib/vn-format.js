// Vietnamese display helpers + HTML/XML escaping for every dynamic string we render.

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ESCAPES[ch]);
}

/** 81293 → "81.293" (vi-VN grouping, no ICU dependency). */
export function fmtNum(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** ISO (any offset) → "17/03/2026" using the string's own calendar date. */
export function fmtDate(iso, withYear = true) {
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return withYear ? `${d}/${m}/${y}` : `${d}/${m}`;
}

/** "17/03 – 08/09/2026" (year shown once when both dates share it). */
export function fmtRange(fromIso, toIso, sep = ' – ') {
  const sameYear = String(fromIso).slice(0, 4) === String(toIso).slice(0, 4);
  return `${fmtDate(fromIso, !sameYear)}${sep}${fmtDate(toIso)}`;
}

/** 400 → "6 giờ 40 phút"; 35 → "35 phút". */
export function fmtDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} phút`;
  return m ? `${h} giờ ${m} phút` : `${h} giờ`;
}

export const UNIT_LABELS = { week: 'tuần', month: 'tháng', quarter: 'quý' };
