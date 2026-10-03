// Assembles the single self-contained Wrapped HTML file (inline CSS + SVG + ~30 lines of JS).
// Every dynamic string goes through escapeHtml. No external URLs, fonts or images.
import { escapeHtml as e, fmtNum, fmtDate, fmtRange, fmtDuration, UNIT_LABELS } from '../lib/vn-format.js';
import { NPX_COMMAND, PRODUCT_NAME } from '../lib/product-info.js';
import { themeCss, PALETTES } from './wrapped-theme-styles.js';
import { barcodeSvg, heatmapSvg, bucketsSvg, clockSvg } from './wrapped-svg-charts.js';

const PERSONAS = { khuya: 'Cú đêm chính hiệu.', toi: 'Người của ca tối.', chieu: 'Nhịp đều buổi chiều.', sang: 'Chim dậy sớm.' };

/** Deterministic closing line — used when no AI sentence is available. */
export function defaultHighlight(data) {
  const { hero, habits, heatmap, displayName } = data;
  return `${fmtNum(hero.sessions)} lần ngồi xuống code, chuỗi dài nhất ${habits.streak} ngày liền, ` +
    `và tuần ${fmtDate(heatmap.peakWeek, false)} bùng nổ với ${heatmap.peakTotal} commit. Đó là mùa build của ${displayName}.`;
}

const count = (n) => `<span class="num" data-count="${n}">${fmtNum(n)}</span>`;

function screenOpen(d) {
  return `<section class="in"><div class="wrap">
<p class="owner">Mùa build của ${e(d.displayName)}</p>
<h1 class="display">${e(d.repoName)}</h1>
<p class="lead">Từ ${fmtRange(d.range.from, d.range.to, ' đến ')}, ${fmtNum(d.range.days)} ngày.</p>
${barcodeSvg(d.ticks)}
<p class="note">Mỗi vạch là một commit của bạn, xếp theo thời gian.</p>
</div><p class="hint" aria-hidden="true">Cuộn xuống</p></section>`;
}

function screenHero(d) {
  const h = d.hero;
  return `<section><div class="wrap">
<p class="sentence reveal">Bạn đã ngồi xuống code ${count(h.sessions)} buổi, để lại ${count(h.commits)} commit trên ${count(h.chapters)} mảng việc, và viết ra ${count(h.codeLines)} dòng code.</p>
<p class="note reveal">Một buổi là chuỗi commit cách nhau không quá 2 giờ. Dòng code chỉ tính file mã nguồn, bỏ qua tài liệu, cấu hình, lockfile và bộ kit agent.</p>
</div></section>`;
}

function screenHeatmap(d) {
  const hm = d.heatmap;
  const cut = hm.truncated ? ' Lịch hiển thị 53 tuần gần nhất.' : '';
  return `<section><div class="wrap">
<h2 class="reveal">Nhịp từng ngày</h2>
<div class="reveal">${heatmapSvg(hm)}${bucketsSvg(d.buckets)}</div>
<p class="lead reveal">Tuần dữ nhất bắt đầu ${fmtDate(hm.peakWeek)}: ${hm.peakTotal} commit. Bạn có mặt ${fmtNum(d.activeDays)} ngày.</p>
<p class="note reveal">Cột nhỏ bên dưới: số commit mỗi ${UNIT_LABELS[d.unit]}.${cut}</p>
</div></section>`;
}

function screenChapters(d) {
  const rows = d.chapters.map((c) => `<div class="bar-row"><span class="bar-label">${e(c.label)}</span>
<div class="bar-track"><div class="bar-fill" style="width:${c.percent}%"></div></div><span class="bar-pct num">${c.percent}%</span></div>`).join('');
  const top = d.chapters[0];
  return `<section><div class="wrap">
<h2 class="reveal">Bạn dành thời gian cho gì</h2>
<div class="bars reveal">${rows}</div>
<p class="lead reveal">Nhiều nhất là ${e(top.label.toLowerCase())}: ${top.count} commit.</p>
<p class="note reveal">Phân loại theo hình dạng diff (file mới, file đổi tên, tỉ lệ thêm/xoá), không đọc commit message.</p>
</div></section>`;
}

function screenHabits(d) {
  const h = d.habits;
  const total = h.dayparts.reduce((s, p) => s + p.count, 0) || 1;
  const pct = Math.round((h.topDaypart.count / total) * 100);
  return `<section><div class="wrap habits">
<div class="reveal">${clockSvg(h.hours, h.peakHour)}</div>
<div class="reveal">
<p class="persona">${PERSONAS[h.topDaypart.id]}</p>
<ul class="facts">
<li>Giờ code nhiều nhất: <b>${h.peakHour}h</b>, ${h.peakHourCount} commit.</li>
<li>${h.topDaypart.label} là giờ của bạn: <b>${pct}%</b> số commit.</li>
<li>Chuỗi dài nhất: <b>${h.streak} ngày</b> liên tiếp.</li>
<li>Buổi dài nhất: <b>${fmtDuration(h.longestSessionMinutes)}</b>, ngày ${fmtDate(h.longestSessionDay)}.</li>
<li>Ngày hay code nhất: <b>${h.busiestWeekday}</b>.</li>
</ul></div>
</div></section>`;
}

function screenClose(d, highlight) {
  return `<section id="close"><div class="wrap">
<p class="quote" data-type="${e(highlight)}">${e(highlight)}</p>
<div class="cmd reveal"><code id="cmd">${e(NPX_COMMAND)} wrapped</code><button type="button" id="copy">Chép lệnh</button></div>
<p class="note reveal">Chạy lệnh trong thư mục repo của bạn để có trang như thế này.</p>
<footer>Làm bằng ${PRODUCT_NAME}. Số liệu đọc trực tiếp từ git trên máy bạn, không gửi đi đâu.</footer>
</div></section>`;
}

const SCRIPT = `(function(){var d=document.documentElement,reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
function countUp(el){var n=+el.dataset.count,t0=null;if(reduce||n<10)return;function f(t){t0=t0||t;var p=Math.min(1,(t-t0)/1400),v=Math.round(n*(1-Math.pow(1-p,3)));el.textContent=v.toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g,'.');if(p<1)requestAnimationFrame(f)}requestAnimationFrame(f)}
function type(el){var s=el.dataset.type,i=0;if(reduce||!s)return;el.textContent='';var c=document.createElement('span');c.className='caret';el.appendChild(c);(function step(){if(i<s.length){c.insertAdjacentText('beforebegin',s[i++]);setTimeout(step,28)}})()}
var io=new IntersectionObserver(function(es){es.forEach(function(x){if(!x.isIntersecting||x.target.dataset.seen)return;x.target.dataset.seen=1;x.target.classList.add('in');x.target.querySelectorAll('[data-count]').forEach(countUp);x.target.querySelectorAll('[data-type]').forEach(type)})},{threshold:.35});
document.querySelectorAll('section').forEach(function(s){io.observe(s)});
document.querySelectorAll('.themes button').forEach(function(b){b.onclick=function(){d.dataset.theme=b.dataset.set;document.querySelectorAll('.themes button').forEach(function(o){o.setAttribute('aria-pressed',o===b)})}});
var cp=document.getElementById('copy');cp.onclick=function(){var t=document.getElementById('cmd').textContent;(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){cp.textContent='Đã chép'},function(){cp.textContent='Chọn lệnh để chép'})}})();`;

function themeSwitcher(active) {
  return `<nav class="themes" aria-label="Đổi giao diện">${Object.entries(PALETTES).map(([id, p]) =>
    `<button type="button" data-set="${id}" aria-label="Giao diện ${p.label}" aria-pressed="${id === active}" style="background:${p.bg};box-shadow:inset 0 0 0 7px ${p.bg},inset 0 0 0 20px ${p.accent}"></button>`).join('')}</nav>`;
}

/** @param data aggregateWrapped() output; @param options { theme, highlight } */
export function renderWrappedHtml(data, { theme = 'dem', highlight } = {}) {
  const line = highlight || defaultHighlight(data);
  return `<!DOCTYPE html>
<html lang="vi" data-theme="${e(theme)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${e(data.repoName)} — Builder Wrapped</title>
<style>${themeCss()}</style>
</head>
<body>
<main>
${screenOpen(data)}
${screenHero(data)}
${screenHeatmap(data)}
${screenChapters(data)}
${screenHabits(data)}
${screenClose(data, line)}
</main>
${themeSwitcher(theme)}
<script>${SCRIPT}</script>
</body>
</html>
`;
}
