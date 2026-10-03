// Theme tokens + page frame CSS shared by the Wrapped page and the weekly card.
// --accent is text-safe (AA >= 4.5:1 on --bg); --accent-2 is for fills (bars, cells, ticks).
// Sizes inside a screen use container units (cqi) so the PNG export, which re-lays a screen out
// at 540px wide, gets the phone layout regardless of the browser window size.

export const PALETTES = {
  // Desk lamp at midnight: indigo night, warm paper-white ink, amber lamp light.
  dem: {
    label: 'Đêm', bg: '#10172e', surface: '#19223f', ink: '#f4efe3', muted: '#a3abc9', accent: '#ffb547', accent2: '#ffb547',
    line: 'rgba(244,239,227,.16)', heat: ['#1c2547', '#4a3f3a', '#8a6236', '#d18a3a', '#ffb547'],
  },
  // Early sky: pale blue, deep navy ink, sunrise coral (text coral darkened to pass AA: 4.88:1).
  'binh-minh': {
    label: 'Bình minh', bg: '#eef3fa', surface: '#ffffff', ink: '#1c2742', muted: '#56627f', accent: '#bf3a2c', accent2: '#f0705f',
    line: 'rgba(28,39,66,.16)', heat: ['#dde5f1', '#f9c9bf', '#f7a08f', '#f37a6f', '#d9503f'],
  },
  // Vietnamese "vở ô li": squared paper, fountain-pen blue ink, red correction pen.
  giay: {
    label: 'Giấy', bg: '#fbfaf5', surface: '#ffffff', ink: '#1d3270', muted: '#5d6684', accent: '#c62828', accent2: '#d42f2f',
    line: 'rgba(29,50,112,.18)', heat: ['#e8ebf3', '#c9d1ea', '#8e9fd3', '#4b63b5', '#1d3270'],
  },
};

function paletteVars(p) {
  return `--bg:${p.bg};--surface:${p.surface};--ink:${p.ink};--muted:${p.muted};--accent:${p.accent};--accent-2:${p.accent2};--line:${p.line};` +
    p.heat.map((c, i) => `--heat${i}:${c}`).join(';') + ';';
}

const FONT_STACK = '"Be Vietnam Pro","Segoe UI",-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif';

/** Tokens, textures, screen frame, type scale, buttons, theme switcher. */
export function baseCss() {
  const themes = Object.entries(PALETTES).map(([id, p]) => `[data-theme="${id}"]{${paletteVars(p)}}`).join('\n');
  return `${themes}
*{box-sizing:border-box;margin:0}
html{-webkit-text-size-adjust:100%;background:var(--bg)}
html.snap{scroll-snap-type:y proximity}
body{background:var(--bg);color:var(--ink);font:400 17px/1.55 ${FONT_STACK};-webkit-font-smoothing:antialiased;transition:background .4s,color .4s}
.screen{position:relative;min-height:100vh;min-height:100svh;display:flex;flex-direction:column;scroll-snap-align:start;overflow:hidden;
 padding:clamp(18px,min(4vw,4.4vh),48px) clamp(18px,6vw,96px);background-color:var(--bg);container-type:inline-size;transition:background-color .4s}
[data-theme="dem"] .screen{background-image:radial-gradient(70% 55% at 12% -8%,rgba(255,181,71,.11),transparent 70%)}
[data-theme="binh-minh"] .screen{background-image:linear-gradient(to top,rgba(240,112,95,.10),transparent 45%)}
[data-theme="giay"] .screen{background-image:linear-gradient(90deg,rgba(29,50,112,.11) 1px,transparent 1px),linear-gradient(rgba(29,50,112,.11) 1px,transparent 1px),linear-gradient(rgba(29,50,112,.05) 1px,transparent 1px);background-size:32px 32px,32px 32px,32px 8px}
[data-theme="giay"] .screen::before{content:"";position:absolute;top:0;bottom:0;left:clamp(8px,2.4vw,40px);width:2px;background:rgba(198,40,40,.32)}
.head,.foot{display:flex;align-items:center;justify-content:space-between;gap:12px;position:relative;z-index:1}
.foot{color:var(--muted);font-size:13px;padding-top:16px;padding-right:156px;min-height:52px}
.body{flex:1;display:flex;flex-direction:column;justify-content:center;width:100%;max-width:1120px;margin:0 auto;padding:clamp(16px,min(5cqi,4vh),56px) 0;position:relative;z-index:1}
.kicker{display:inline-flex;align-items:center;gap:10px;font-size:15px;font-weight:600;color:var(--muted)}
.kicker .ico{color:var(--accent)}
.num,.mega,.big{font-variant-numeric:tabular-nums lining-nums;font-feature-settings:"tnum"}
.mega{display:block;font-size:clamp(76px,23cqi,250px);font-weight:800;line-height:.86;letter-spacing:-.055em;color:var(--accent)}
.big{font-size:clamp(40px,10cqi,104px);font-weight:800;line-height:.9;letter-spacing:-.045em}
h1{font-size:clamp(48px,15cqi,168px);font-weight:800;line-height:.92;letter-spacing:-.045em;overflow-wrap:anywhere}
h2{font-size:clamp(28px,6.4cqi,58px);font-weight:600;line-height:1.1;letter-spacing:-.025em;max-width:20ch;text-wrap:balance}
.lead{font-size:clamp(18px,3.4cqi,26px);line-height:1.4;color:var(--ink);max-width:34ch;text-wrap:pretty}
.lead b,.hl{color:var(--accent);font-weight:700}
.note{color:var(--muted);font-size:14px;line-height:1.5;max-width:60ch;margin-top:clamp(18px,3cqi,32px);text-wrap:pretty}
.ico{flex:none;display:block}
button{font:inherit;cursor:pointer;border:0;border-radius:12px;color:inherit;background:none;-webkit-tap-highlight-color:transparent}
button:focus-visible,a:focus-visible{outline:3px solid var(--accent);outline-offset:3px}
.dl{white-space:nowrap;flex:none;display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 14px;border:1px solid var(--line);color:var(--muted);font-size:14px;font-weight:600;transition:color .2s,border-color .2s,background-color .2s}
.dl:hover{color:var(--ink);border-color:var(--ink)}
.dl:disabled{opacity:.6;cursor:progress}
.btn{display:inline-flex;align-items:center;gap:10px;min-height:48px;padding:0 20px;background:var(--accent);color:var(--bg);font-weight:700}
[data-theme="binh-minh"] .btn,[data-theme="giay"] .btn{color:#fff}
.themes{position:fixed;right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));display:flex;gap:2px;z-index:20;padding:4px;border-radius:999px;background:var(--surface);border:1px solid var(--line);box-shadow:0 6px 24px rgba(0,0,0,.18)}
.themes button{width:44px;height:44px;border-radius:50%;display:grid;place-items:center}
.themes .sw{width:24px;height:24px;border-radius:50%;border:1px solid rgba(127,127,127,.5);position:relative}
.themes .sw::after{content:"";position:absolute;inset:7px;border-radius:50%;background:var(--sw-accent)}
.themes button[aria-pressed="true"]{box-shadow:inset 0 0 0 2px var(--ink)}
.export-host{position:fixed;left:-20000px;top:0;pointer-events:none}
.exporting{min-height:675px!important;padding:26px 30px 22px!important}
.exporting .foot{padding-right:0;min-height:0}
[data-theme="giay"] .exporting::before{left:12px}
.exporting .body{padding:16px 0}
.exporting .note{display:none}
.exporting .note.range-note{display:block;font-size:13px;margin-top:10px} /* shared images keep the log date range: numbers without it mislead */
.exporting .mega{font-size:min(96px,calc(140cqi / var(--len,6)))}.exporting .stat .big{font-size:34px}.exporting h2{font-size:30px}
.exporting .persona{font-size:30px}.exporting .clock-box{max-width:250px}.exporting .facts{font-size:14px}.exporting .facts li{padding:7px 0}
.exporting .duel-box{max-width:430px}.exporting .redo{font-size:14px;padding:10px 14px}.exporting .acts li{padding:6px 0}.exporting .act-num{font-size:26px}
.exporting .hero{gap:16px}.exporting .lead{font-size:18px}.exporting .stack,.exporting .agent-meta,.exporting .bars{margin-top:16px}
.exporting .ai-grid .mega{font-size:80px}.exporting .stats{padding-top:12px}.exporting .redo{margin-top:12px}.exporting .duel-box{margin-top:10px}
.exporting .ai-grid .lead,.exporting .s-chi-dao .lead{margin-top:8px}.exporting .acts{margin-top:10px}.exporting .agent-meta{gap:14px}.exporting .models li{padding:3px 0}
.exporting .bars{gap:12px}.exporting .bar-row{gap:6px 12px}.exporting .bar-text{display:flex;align-items:baseline;gap:10px}.exporting .bar-track{height:10px}
.exporting .no-export{visibility:hidden}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
@media print{.screen{min-height:auto;break-after:page}.themes,.no-export{display:none}}`;
}

/** Theme switcher: 44px targets, swatch shows each theme's paper + accent. */
export function themeSwitcherHtml(active) {
  return `<nav class="themes no-export" aria-label="Đổi giao diện">${Object.entries(PALETTES).map(([id, p]) =>
    `<button type="button" data-set="${id}" aria-label="Giao diện ${p.label}" title="${p.label}" aria-pressed="${id === active}"><span class="sw" style="background:${p.bg};--sw-accent:${p.accent2}"></span></button>`).join('')}</nav>`;
}
