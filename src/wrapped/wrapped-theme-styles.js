// Inline CSS for the Wrapped page: 3 palettes as CSS variables + layout. Zero external fonts —
// numbers use condensed system faces (Bahnschrift on Windows, DIN/Avenir Condensed on macOS).

export const PALETTES = {
  // Desk lamp at midnight: indigo night, warm paper-white ink, amber lamp light.
  dem: { label: 'Đêm', bg: '#10172e', surface: '#1a2343', ink: '#f4efe3', muted: '#9aa3c4', accent: '#ffb547', heat: ['#1d2749', '#4a3f3a', '#8a6236', '#d18a3a', '#ffb547'] },
  // Early sky: pale blue, deep navy ink, sunrise coral.
  'binh-minh': { label: 'Bình minh', bg: '#e9f0fa', surface: '#ffffff', ink: '#1c2742', muted: '#5d6b8a', accent: '#f0566b', heat: ['#d6e1f1', '#f9c9bf', '#f7a08f', '#f37a6f', '#f0566b'] },
  // Vietnamese "vở ô li": squared paper, fountain-pen blue ink, red correction pen.
  giay: { label: 'Giấy', bg: '#fbfaf5', surface: '#ffffff', ink: '#1d3270', muted: '#66708f', accent: '#d42f2f', heat: ['#e9ecf4', '#c9d1ea', '#8e9fd3', '#4b63b5', '#1d3270'] },
};

function paletteVars(p) {
  return `--bg:${p.bg};--surface:${p.surface};--ink:${p.ink};--muted:${p.muted};--accent:${p.accent};` +
    p.heat.map((c, i) => `--heat${i}:${c}`).join(';') + ';';
}

export function themeCss() {
  const themes = Object.entries(PALETTES).map(([id, p]) => `[data-theme="${id}"]{${paletteVars(p)}}`).join('\n');
  return `${themes}
*{box-sizing:border-box;margin:0}
html{scroll-snap-type:y mandatory;scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{background:var(--bg);color:var(--ink);font:400 clamp(16px,1.6vw,20px)/1.55 "Segoe UI Variable Text","Segoe UI",-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;transition:background .4s,color .4s}
[data-theme="giay"] body{background-image:linear-gradient(rgba(29,50,112,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(29,50,112,.07) 1px,transparent 1px);background-size:24px 24px}
.num,.display{font-family:"Bahnschrift","DIN Condensed","Avenir Next Condensed","Roboto Condensed","Arial Narrow",sans-serif;font-stretch:condensed;font-variant-numeric:tabular-nums lining-nums;letter-spacing:-.01em}
section{min-height:100vh;min-height:100svh;scroll-snap-align:start;display:flex;flex-direction:column;justify-content:center;padding:clamp(28px,6vw,96px) clamp(16px,7vw,120px);position:relative}
.wrap{width:100%;max-width:1180px;margin:0 auto}
h1.display{font-size:clamp(56px,11vw,168px);font-weight:700;line-height:.9;word-break:break-word}
h2{font-size:clamp(26px,3.4vw,44px);font-weight:600;line-height:1.15;margin-bottom:.9em;max-width:28ch}
.lead{font-size:clamp(18px,2.2vw,28px);color:var(--muted);margin-top:.8em}
.note{color:var(--muted);font-size:.85em;margin-top:1.6em;max-width:62ch}
.owner{color:var(--accent);font-weight:600;margin-bottom:.6em;font-size:clamp(18px,2vw,24px)}
.barcode{width:100%;height:clamp(70px,12vw,140px);margin-top:clamp(28px,5vw,64px);display:block}
.barcode line{stroke:var(--accent);stroke-width:1.4;opacity:.75}
.barcode{animation:draw 1.8s cubic-bezier(.2,.7,.2,1) .3s backwards}
.hint{position:absolute;bottom:22px;left:50%;transform:translateX(-50%);color:var(--muted);font-size:14px}
.sentence{font-size:clamp(26px,3.6vw,52px);line-height:1.18;font-weight:500;max-width:22ch}
.sentence .num{display:inline-block;font-size:2.35em;line-height:.9;font-weight:700;color:var(--accent);vertical-align:-.12em;margin:0 .06em}
.chart{width:100%;height:auto;display:block;overflow:visible}
.heat .peak{fill:none;stroke:var(--ink);stroke-width:1.5}
.axis{fill:var(--muted);font-size:11px}
.buckets rect{fill:var(--accent);opacity:.85}
.bars{display:grid;gap:clamp(12px,1.8vw,22px);max-width:900px}
.bar-row{display:grid;grid-template-columns:minmax(9em,13em) 1fr 3.2em;align-items:center;gap:16px}
.bar-track{height:clamp(14px,2vw,24px);background:var(--heat0);border-radius:999px;overflow:hidden}
.bar-fill{height:100%;background:var(--accent);border-radius:999px;transform-origin:left;transform:scaleX(0);transition:transform 1.1s cubic-bezier(.2,.7,.2,1)}
.in .bar-fill{transform:scaleX(1)}
.bar-row:not(:first-child) .bar-fill{opacity:.55}
.bar-pct{text-align:right;font-size:1.25em;font-weight:700}
.habits{display:grid;grid-template-columns:minmax(260px,420px) 1fr;gap:clamp(24px,5vw,72px);align-items:center}
.persona{font-size:clamp(34px,5vw,72px);font-weight:700;line-height:1;color:var(--accent);margin-bottom:.4em}
.facts{list-style:none;padding:0;display:grid;gap:.55em;font-size:clamp(18px,1.9vw,24px)}
.facts b{color:var(--ink)}
.clock .hand{fill:var(--ink);opacity:.28}
.clock .hand.peak{fill:var(--accent);opacity:1}
.clock text{fill:var(--muted);font-size:13px;text-anchor:middle}
.clock .center{fill:var(--ink);font-size:44px;font-weight:700}
.quote{font-size:clamp(28px,4vw,58px);line-height:1.2;font-weight:500;max-width:24ch;min-height:3.6em}
.quote .caret{display:inline-block;width:.08em;height:1em;background:var(--accent);vertical-align:-.12em;animation:blink 1s steps(1) infinite}
.cmd{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin-top:2.2em}
.cmd code{background:var(--surface);color:var(--ink);padding:.7em 1em;border-radius:10px;font:500 clamp(14px,1.5vw,18px)/1.3 ui-monospace,Consolas,"SF Mono",monospace;word-break:break-all}
button{font:inherit;cursor:pointer;border:0;border-radius:10px;padding:.7em 1.1em;background:var(--accent);color:var(--bg);font-weight:600}
button:focus-visible{outline:3px solid var(--ink);outline-offset:3px}
.themes{position:fixed;right:16px;bottom:16px;display:flex;gap:8px;z-index:5;background:var(--surface);padding:6px;border-radius:999px;box-shadow:0 2px 10px rgba(0,0,0,.18)}
.themes button{width:30px;height:30px;padding:0;border-radius:50%;border:2px solid transparent}
.themes button[aria-pressed="true"]{border-color:var(--ink)}
.reveal{opacity:0;transform:translateY(18px);transition:opacity .7s,transform .7s}
.in .reveal{opacity:1;transform:none}
footer{color:var(--muted);font-size:14px;margin-top:3em}
@keyframes draw{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
@keyframes blink{50%{opacity:0}}
@media (max-width:760px){.habits{grid-template-columns:1fr}.bar-row{grid-template-columns:1fr 3em}.bar-row .bar-label{grid-column:1/-1}}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}.reveal{opacity:1;transform:none}.bar-fill{transform:none}}
@media print{section{min-height:auto;page-break-after:always}.themes,.hint{display:none}}`;
}
