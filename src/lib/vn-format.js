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

/** 2.64 → "2,6" (vi-VN decimal comma, trailing ",0" dropped). */
export function fmtDecimal(n, digits = 1) {
  const [int, frac = ''] = Number(n).toFixed(digits).split('.');
  const tail = frac.replace(/0+$/, '');
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (tail ? `,${tail}` : '');
}

/** 11234567 → "11,2 triệu"; 1500000000 → "1,5 tỷ"; small numbers stay grouped ("9.870"). */
export function fmtCompact(n) {
  if (n >= 1e9) return `${fmtDecimal(n / 1e9)} tỷ`;
  if (n >= 1e6) return `${fmtDecimal(n / 1e6)} triệu`;
  return fmtNum(n);
}

/** Minutes → whole hours for big totals: 6730 → "112 giờ"; under 2 hours falls back to fmtDuration. */
export function fmtHours(minutes) {
  return minutes < 120 ? fmtDuration(Math.round(minutes)) : `${fmtNum(minutes / 60)} giờ`;
}

/** "PRO.IndieHub – Đêm" → "pro-indiehub-dem": ASCII file-name slug (Vietnamese diacritics + đ folded). */
export function slugify(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'wrapped';
}

/** UTC ISO timestamp (agent logs) → local calendar date "YYYY-MM-DD" (what the user lived). */
export function localIsoDate(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
