// Git-only screens (always rendered): opening film strip, hero numbers, calendar, chapters, habits.
// Each returns a frame spec { id, kicker, icon, moment, body }; see wrapped-screen-frame.js.
import { escapeHtml as e, fmtNum, fmtDate, fmtRange, fmtDuration, UNIT_LABELS } from '../lib/vn-format.js';
import { barcodeSvg, heatmapSvg, bucketsSvg, heatmapCapPx, COMPACT_WEEKS } from './wrapped-svg-charts.js';
import { clockSvg } from './wrapped-clock-charts.js';
import { count } from './wrapped-screen-frame.js';

/** Says honestly how the split was decided: conventional prefixes first, diff shape for the rest. */
export function chapterMethodNote(by) {
  const total = (by?.prefix || 0) + (by?.diff || 0);
  const shape = 'hình dạng diff (file mới, file đổi tên, tỉ lệ thêm và xoá)';
  if (!total || !by.prefix) return `Phân loại theo ${shape}.`;
  if (!by.diff) return 'Phân loại theo tiền tố commit (feat:, fix:, refactor:…) bạn đã ghi.';
  // Clamp: a mixed split must never read as 0% or 100%.
  const pct = Math.min(99, Math.max(1, Math.round((by.prefix / total) * 100)));
  return `${pct}% commit phân loại theo tiền tố bạn ghi (feat:, fix:…), phần còn lại theo ${shape}.`;
}


const PERSONAS = { khuya: 'Cú đêm chính hiệu.', toi: 'Người của ca tối.', chieu: 'Nhịp đều buổi chiều.', sang: 'Chim dậy sớm.' };

export function screenOpen(d) {
  const owner = d.scope === 'person' && d.repos?.length
    ? `Mùa build trên ${fmtNum(d.repos.length)} repo`
    : `Mùa build của ${e(d.displayName)}`;
  return {
    id: 'mo-dau', kicker: 'Builder Wrapped', icon: 'git-commit-horizontal', moment: 'film',
    body: `<p class="owner">${owner}</p>
<h1 style="--len:${[...String(d.repoName)].length}">${e(d.repoName)}</h1>
<p class="lead">Từ ${fmtRange(d.range.from, d.range.to, ' đến ')}, ${fmtNum(d.range.days)} ngày.</p>
<div class="film-wrap">${barcodeSvg(d.ticks)}
<div class="film-meta"><span>${fmtDate(d.range.from)}</span><span class="film-count">${count(d.hero.commits)} commit</span><span>${fmtDate(d.range.to)}</span></div></div>
<p class="note">Mỗi vạch là một commit của bạn, xếp theo thời gian. Chỗ vạch dày là lúc bạn đang vào guồng.</p>`,
  };
}

export function screenHero(d) {
  const h = d.hero;
  const stat = (n, label) => `<div class="stat">${count(n, 'big num')}<span class="stat-label">${label}</span></div>`;
  return {
    id: 'con-so', kicker: 'Con số của mùa', icon: 'pencil-line', moment: 'hero',
    body: `<div class="hero">
<div class="hero-main">${count(h.codeLines, 'mega num')}<p class="hero-label">dòng code đã ship</p><p class="hero-note">tính cả code agent viết, chỉ file mã nguồn</p></div>
<div class="stats">${stat(h.sessions, 'buổi code')}${stat(h.commits, 'commit')}${stat(h.chapters, 'mảng việc')}</div>
</div>
<p class="note">Một buổi là chuỗi commit cách nhau không quá 2 giờ. Dòng code bỏ qua tài liệu, cấu hình, lockfile và bộ kit agent.</p>`,
  };
}

export function screenHeatmap(d) {
  const hm = d.heatmap;
  const notes = [`Cột nhỏ bên dưới: số commit mỗi ${UNIT_LABELS[d.unit] || 'tuần'}.`];
  if (hm.weeks.length > COMPACT_WEEKS) notes.push(`<span class="compact-only">Lịch ở đây chỉ hiện ${COMPACT_WEEKS} tuần sôi nổi nhất.</span>`);
  if (hm.truncated) notes.push('Lịch hiển thị tối đa 53 tuần gần nhất.');
  return {
    id: 'nhip-ngay', kicker: 'Nhịp từng ngày', icon: 'calendar-days', moment: 'heat',
    body: `<h2>Có mặt <span class="hl">${fmtNum(d.activeDays)} ngày</span> trên tổng ${fmtNum(d.range.days)} ngày.</h2>
<div class="heat-wrap" style="max-width:${heatmapCapPx(hm)}px">${heatmapSvg(hm)}${bucketsSvg(d.buckets)}</div>
<p class="lead">Tuần dữ nhất bắt đầu ${fmtDate(hm.peakWeek)}: <b>${fmtNum(hm.peakTotal)} commit</b>.</p>
<p class="note">${notes.join(' ')}</p>`,
  };
}

export function screenChapters(d) {
  const rows = d.chapters.map((c, i) => `<div class="bar-row${i === 0 ? ' top' : ''}">
<div class="bar-text"><span class="bar-label">${e(c.label)}</span><span class="bar-sub">${fmtNum(c.count)} commit</span></div>
<div class="bar-track"><div class="bar-fill" style="width:${Math.max(1, c.percent)}%"></div></div>
<span class="bar-pct num">${c.percent}%</span></div>`).join('');
  const top = d.chapters[0];
  return {
    id: 'mang-viec', kicker: 'Mảng việc', icon: 'layers', moment: 'bars',
    body: `<h2>Phần lớn thời gian dành cho <span class="hl">${e(top.label.toLowerCase())}</span>.</h2>
<div class="bars">${rows}</div>
<p class="note">${chapterMethodNote(d.classifiedBy)}</p>`,
  };
}

export function screenHabits(d) {
  const h = d.habits;
  const total = h.dayparts.reduce((s, p) => s + p.count, 0) || 1;
  const pct = Math.round((h.topDaypart.count / total) * 100);
  return {
    id: 'gio-giac', kicker: 'Giờ giấc', icon: 'clock', moment: 'clock',
    body: `<div class="habits">
<div class="clock-box">${clockSvg(h.hours, h.peakHour)}</div>
<div><p class="persona">${PERSONAS[h.topDaypart.id] || ''}</p>
<ul class="facts">
<li><span>Giờ cao điểm</span><b>${h.peakHour}h, ${fmtNum(h.peakHourCount)} commit</b></li>
<li><span>${h.topDaypart.id === 'khuya' ? 'Đêm khuya' : `Buổi ${e(h.topDaypart.label.toLowerCase())}`}</span><b>${pct}% số commit</b></li>
<li><span>Chuỗi dài nhất</span><b>${fmtNum(h.streak)} ngày liền</b></li>
<li><span>Buổi dài nhất</span><b>${fmtDuration(h.longestSessionMinutes)}, ngày ${fmtDate(h.longestSessionDay)}</b></li>
<li><span>Ngày hay code nhất</span><b>${e(h.busiestWeekday)}</b></li>
</ul></div></div>`,
  };
}
