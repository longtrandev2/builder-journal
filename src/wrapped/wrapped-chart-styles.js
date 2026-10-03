// CSS for the custom SVG charts: film strip, calendar heatmap, period columns, bars, 24h clock,
// mirrored hour columns. Animated SVG parts use transform-box so anime.js can scale them in place.

export function chartCss() {
  return `
.chart{display:block;width:100%;height:auto;overflow:visible}
.chart text{font-family:inherit}
.axis{fill:var(--muted);font-size:10px}
.film-wrap{margin-top:clamp(28px,7cqi,72px)}
.film{position:relative;padding:17px 12px;border-radius:8px;background:var(--surface);border:1px solid var(--line)}
.film::before,.film::after{content:"";position:absolute;left:10px;right:10px;height:5px;border-radius:2px;background:repeating-linear-gradient(90deg,var(--line) 0 10px,transparent 10px 20px)}
.film::before{top:5px}.film::after{bottom:5px}
.barcode{display:block;width:100%;height:clamp(64px,15cqi,132px)}
.barcode line{stroke:var(--accent-2);stroke-width:1.3;vector-effect:non-scaling-stroke;opacity:.85}
.playhead{position:absolute;top:4px;bottom:4px;left:12px;width:2px;border-radius:2px;background:var(--ink);opacity:0}
.film-meta{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-top:10px;font-size:13px;color:var(--muted)}
.film-count{color:var(--ink);font-weight:600;font-size:15px}
.heat-wrap{margin-top:clamp(18px,4cqi,40px)}
.heat-compact{display:none}
@container (max-width:599px){.has-compact .heat-wide{display:none}.has-compact .heat-compact{display:block}}
.cell{transform-box:fill-box;transform-origin:center}
.cell.l0{fill:var(--heat0);stroke:var(--line);stroke-width:1}
.cell.l1{fill:var(--heat1)}.cell.l2{fill:var(--heat2)}.cell.l3{fill:var(--heat3)}.cell.l4{fill:var(--heat4)}
.heat .peak{fill:none;stroke:var(--ink);stroke-width:1.5}
.heat-legend{display:flex;align-items:center;justify-content:flex-end;gap:4px;margin-top:10px;font-size:12px;color:var(--muted)}
.heat-legend span{margin:0 4px}
.heat-legend i{width:12px;height:12px;border-radius:3px;background:var(--heat0)}
.heat-legend i.l0{box-shadow:inset 0 0 0 1px var(--line)}
.heat-legend i.l1{background:var(--heat1)}.heat-legend i.l2{background:var(--heat2)}.heat-legend i.l3{background:var(--heat3)}.heat-legend i.l4{background:var(--heat4)}
.buckets{height:48px;margin-top:16px}
.buckets rect{fill:var(--accent-2);opacity:.8;transform-box:fill-box;transform-origin:50% 100%}
.bars{display:grid;gap:clamp(14px,2.6cqi,24px);margin-top:clamp(20px,4cqi,40px);max-width:940px}
.bar-row{display:grid;grid-template-columns:1fr auto;align-items:end;gap:8px 16px}
.bar-row .bar-track{grid-column:1/-1}
.bar-row .bar-pct{grid-column:2;grid-row:1;text-align:right}
.bar-label{font-weight:600;display:block;line-height:1.3}
.bar-sub{display:block;color:var(--muted);font-size:13px}
.bar-track{height:clamp(12px,2.2cqi,20px);border-radius:999px;background:var(--heat0);box-shadow:inset 0 0 0 1px var(--line);overflow:hidden}
.bar-fill{height:100%;border-radius:999px;background:var(--ink);opacity:.4;transform-origin:left center}
.top .bar-fill{background:var(--accent-2);opacity:1}
.bar-pct{font-size:clamp(20px,3.8cqi,32px);font-weight:800;letter-spacing:-.03em;line-height:1}
.top .bar-pct{color:var(--accent)}
@container (min-width:720px){.bar-row{grid-template-columns:minmax(12em,15em) 1fr 4.2em;align-items:center}.bar-row .bar-track,.bar-row .bar-pct{grid-column:auto;grid-row:auto}}
.clock-box{width:100%;max-width:min(460px,82cqi);margin:0 auto}
.clock .track{fill:var(--line);opacity:.55}
.clock .hand{fill:var(--ink);opacity:.5;transform-box:fill-box;transform-origin:50% 100%}
.clock .hand.peak{fill:var(--accent-2);opacity:1}
.clock .tick{fill:var(--muted);font-size:13px;text-anchor:middle}
.clock .center{fill:var(--ink);font-size:46px;font-weight:800;letter-spacing:-.04em;text-anchor:middle}
.clock .center-cap{fill:var(--muted);font-size:13px;text-anchor:middle}
.clock .sweep{stroke:var(--accent);stroke-width:2;stroke-linecap:round;opacity:0;transform-box:view-box;transform-origin:170px 170px}
.duel-box{margin:clamp(18px,3.4cqi,32px) 0 0;max-width:680px}
.duel .axis{text-anchor:middle;font-size:11px}
.duel rect{transform-box:fill-box}
.duel .up{fill:var(--accent-2);opacity:.5;transform-origin:50% 100%}
.duel .down{fill:var(--ink);opacity:.32;transform-origin:50% 0}
.duel .up.peak{opacity:1}.duel .down.peak{opacity:.85}
.legend{display:flex;gap:18px;margin-top:8px;font-size:13px;color:var(--muted)}
.key::before{content:"";display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:7px;vertical-align:-1px}
.key.up::before{background:var(--accent-2)}.key.down::before{background:var(--ink);opacity:.6}`;
}
