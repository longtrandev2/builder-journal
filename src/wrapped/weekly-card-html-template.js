// One-screen weekly mini-Wrapped: a 4:5 card (exports as 1080x1350 PNG) on a themed page.
// Same themes, font, motion and export pipeline as the full Wrapped page.
import { escapeHtml as e, fmtNum, fmtDate, fmtRange, fmtHours, slugify } from '../lib/vn-format.js';
import { TRY_LINE } from '../lib/product-info.js';
import { icon } from '../vendor/lucide-icons.js';
import { renderPageShell } from './wrapped-page-shell.js';
import { chartCss } from './wrapped-chart-styles.js';
import { screenCss } from './wrapped-screen-styles.js';
import { count, downloadButton } from './wrapped-screen-frame.js';

const WEEK_CSS = `
.week-page{min-height:100vh;min-height:100svh;display:grid;place-items:center;padding:24px 12px 88px}
.week-card{min-height:auto;overflow:visible;width:100%;max-width:540px;aspect-ratio:4/5;border-radius:20px;border:1px solid var(--line);box-shadow:0 24px 60px rgba(0,0,0,.22);padding:22px 24px}
.week-card::before{left:12px!important}
.week-card .body{padding:18px 0;justify-content:flex-start;gap:18px}
.week-card .stats{margin-top:auto}
.week-card .foot{padding-right:0;min-height:0;font-size:12px}
.week-card .foot span:first-child{white-space:nowrap}.week-card .foot span:last-child{text-align:right;overflow-wrap:anywhere}
.week-card h1{font-size:clamp(30px,10cqi,52px)}
.week-card .owner{margin-bottom:.3em}
.week-card .stats{grid-template-columns:repeat(3,minmax(0,1fr));border-left:0;padding:16px 0 0;border-top:1px solid var(--line)}
.week-card .stat .big{font-size:clamp(26px,8.5cqi,46px)}
.week-card .stat.lead-stat .big{color:var(--accent)}
.week-card .bars{margin-top:0;gap:10px}
.week-card .bar-row{grid-template-columns:1fr auto;align-items:end}
.week-card .bar-row .bar-track{grid-column:1/-1;height:10px}
.week-card .bar-pct{font-size:18px;text-align:right}
.ai-line{display:flex;gap:10px;align-items:flex-start;font-size:15px;color:var(--muted)}
.ai-line .ico{color:var(--accent);margin-top:2px}
.ai-line b{color:var(--ink)}
.hardest{border-left:3px solid var(--accent-2);padding:2px 0 2px 14px;font-size:clamp(16px,3.4cqi,19px);font-weight:600;line-height:1.4}
.hardest span{display:block;color:var(--muted);font-weight:400;font-size:13px;margin-bottom:2px}
.exporting.week-card{border-radius:0;border:0;box-shadow:none;aspect-ratio:auto}`;

/**
 * @param week { displayName, repoName, range:{from,to}, sessions, commits, codeLines,
 *               chapters:[{label,percent}], ai: data.ai shape | null, hardest?: string }
 * @param options { theme }
 */
export function renderWeeklyCardHtml(week, { theme = 'dem' } = {}) {
  const stat = (n, label, cls = '') => `<div class="stat${cls}">${count(n, 'big num')}<span class="stat-label">${label}</span></div>`;
  const bars = (week.chapters || []).slice(0, 3).map((c, i) => `<div class="bar-row${i === 0 ? ' top' : ''}">
<span class="bar-label">${e(c.label)}</span><span class="bar-pct num">${Math.round(c.percent)}%</span>
<div class="bar-track"><div class="bar-fill" style="width:${Math.max(1, Math.round(c.percent))}%"></div></div></div>`).join('');
  const ai = week.ai
    ? `<p class="ai-line">${icon('message-square-text')}<span><b>${fmtNum(week.ai.prompts)} lệnh</b> cho agent, <b>${fmtHours(week.ai.activeMinutes)}</b> làm việc thật.</span></p>` : '';
  const hardest = week.hardest ? `<p class="hardest"><span>Khó nhất tuần này</span>${e(week.hardest)}</p>` : '';
  const file = `${slugify(week.repoName)}-tuan-${String(week.range.from).slice(0, 10)}.png`;
  // All commits on one day would read "Tuần 03/10 – 03/10/2026": name the week by its last day instead.
  const sameDay = String(week.range.from).slice(0, 10) === String(week.range.to).slice(0, 10);
  const when = sameDay ? `Tuần đến ${fmtDate(week.range.to)}` : `Tuần ${fmtRange(week.range.from, week.range.to)}`;
  const body = `<main class="week-page">
<article class="screen week-card" data-moment="bars" data-export-root data-export-width="540" data-export-name="${e(file)}" aria-label="Tuần build">
<header class="head"><p class="kicker">${icon('calendar-days')}<span>${when}</span></p>${downloadButton()}</header>
<div class="body">
<div><p class="owner">Tuần build của ${e(week.displayName)}</p><h1>${e(week.repoName)}</h1></div>
<div class="stats">${stat(week.codeLines, 'dòng code đã ship', ' lead-stat')}${stat(week.commits, 'commit')}${stat(week.activeDays, 'ngày có mặt')}</div>
${bars ? `<div class="bars">${bars}</div>` : ''}
${ai}${hardest}
</div>
<footer class="foot"><span>Builder Wrapped</span><span>${e(TRY_LINE)}</span></footer>
</article></main>`;
  return renderPageShell({ title: `${week.repoName}: tuần ${fmtRange(week.range.from, week.range.to)}`, theme, css: chartCss() + screenCss() + WEEK_CSS, body });
}
