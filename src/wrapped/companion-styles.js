// CSS for the pixel companion: the fixed sprite, its motion, the companion picker inside the theme
// dock, the closing speech bubble, and the static sprite stamped into PNG exports.
// --px = on-screen size of one sprite pixel (integer keeps edges crisp). Motion follows prefers-reduced-motion
// (the base stylesheet already kills every animation there, so the sprite just holds frame A).

export function companionCss() {
  return `
:root{--px:4px}
@media (max-width:600px){:root{--px:3px}}
.foot{padding-left:max(0px,calc(28*var(--px) + 14px - clamp(18px,6vw,96px)));padding-right:236px;min-height:calc(20*var(--px) + 8px)}
@media (max-width:600px){.screen:not(.exporting) .foot>span:first-child{display:none}.screen:not(.exporting) .foot{justify-content:flex-end}}
.buddy{position:fixed;left:max(14px,env(safe-area-inset-left));bottom:max(8px,env(safe-area-inset-bottom));z-index:15;width:calc(28*var(--px));height:calc(20*var(--px));padding:0;border-radius:8px}
.buddy svg,.buddy-x svg{display:block;width:100%;height:100%;overflow:visible}
.bod{animation:bj-bob 1.6s steps(1,end) infinite}
@keyframes bj-bob{0%{transform:translateY(0)}50%,100%{transform:translateY(-1px)}}
.fB{visibility:hidden}
.buddy.act .bod{animation:none}
.buddy.act .fA{animation:bj-fa var(--d) steps(1,end) var(--n)}
.buddy.act .fB{animation:bj-fb var(--d) steps(1,end) var(--n)}
@keyframes bj-fa{0%{visibility:visible}50%,100%{visibility:hidden}}
@keyframes bj-fb{0%{visibility:hidden}50%,100%{visibility:visible}}
.ground{position:absolute;left:0;right:calc(4*var(--px));bottom:0;height:var(--px);opacity:0;background:repeating-linear-gradient(90deg,var(--muted) 0 var(--px),transparent var(--px) calc(4*var(--px)))}
.buddy.p-run.act .ground{opacity:.7;animation:bj-gr .24s steps(4) var(--n) linear}
@keyframes bj-gr{to{background-position:calc(-4*var(--px)) 0}}
.fx{position:absolute;inset:0;pointer-events:none}
.cf{position:absolute;left:46%;top:38%;width:var(--px);height:var(--px);animation:bj-cf 1.3s steps(14) forwards}
@keyframes bj-cf{0%{transform:translate(0,0)}55%{transform:translate(var(--x),var(--y));opacity:1}100%{transform:translate(calc(var(--x)*1.25),calc(var(--y) + 60px));opacity:0}}
.zz{position:absolute;left:62%;top:4%;width:calc(4*var(--px));height:calc(4*var(--px));color:var(--ink);opacity:0;animation:bj-zz 2.6s steps(9) 2 forwards}
.zz svg{display:block;width:100%;height:100%}
@keyframes bj-zz{0%{opacity:0;transform:translate(0,0)}20%{opacity:.9}100%{opacity:0;transform:translate(calc(6*var(--px)),calc(-10*var(--px)))}}
/* picker inside the theme dock */
.themes{align-items:center}
.themes .sep{width:1px;height:24px;background:var(--line);margin:0 4px}
.themes .pick{width:auto;height:44px;padding:0 8px;border-radius:999px;display:flex;align-items:center;gap:2px}
.pick svg{width:40px;height:26px}
.pick .chev{width:10px;height:10px;border-right:2px solid var(--muted);border-bottom:2px solid var(--muted);transform:translateY(2px) rotate(-135deg);margin:0 4px}
.themes .pick[aria-expanded="true"]{background:var(--bg);box-shadow:inset 0 0 0 2px var(--ink)}
.drawer{position:absolute;right:0;bottom:calc(100% + 8px);width:min(330px,calc(100vw - 24px));padding:8px;border-radius:16px;background:var(--surface);border:1px solid var(--line);box-shadow:0 10px 30px rgba(0,0,0,.35)}
.drawer[hidden]{display:none}
.dh{font-size:12px;font-weight:700;color:var(--muted);padding:4px 8px 6px}
.themes .opt{display:grid;grid-template-columns:48px 1fr;align-items:center;gap:10px;width:100%;height:auto;min-height:52px;padding:6px 8px;border-radius:10px;text-align:left}
.themes .opt:hover{background:rgba(127,127,127,.1)}
.themes .opt[aria-pressed="true"]{background:var(--bg);box-shadow:inset 0 0 0 2px var(--accent)}
.opt svg{width:48px;height:34px}
.opt .auto-ico{width:40px;height:30px;margin:0 4px;display:grid;place-items:center;border:2px dashed var(--muted);border-radius:8px;font-size:12px;font-weight:700;color:var(--muted)}
.opt b{display:block;font-size:14px}.opt small{display:block;font-size:12px;line-height:1.4;color:var(--muted)}
.attr{font-size:11.5px;line-height:1.5;color:var(--muted);padding:8px 8px 4px;margin-top:6px;border-top:1px solid var(--line)}
/* closing "Lời nhắn": pixel speech bubble, tail points down toward the sprite */
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.s-khep-lai .quote{max-width:32ch}
.s-khep-lai .attribution{margin-top:6px}
.say{position:relative;max-width:640px;margin:20px 0 18px 4px;padding:14px 18px 16px;background:var(--surface);
 box-shadow:0 -4px 0 var(--ink),0 4px 0 var(--ink),-4px 0 0 var(--ink),4px 0 0 var(--ink)}
.say::after{content:"";position:absolute;left:22px;top:calc(100% + 4px);width:8px;height:8px;background:var(--ink);box-shadow:-8px 8px 0 var(--ink)}
.say h3{font-size:12.5px;font-weight:700;color:var(--accent);margin-bottom:4px}
.say p{font-size:clamp(15px,2.4cqi,18px);line-height:1.5;margin-top:4px;text-wrap:pretty}
.say .sign{color:var(--accent);font-weight:700}
.say .off{visibility:hidden}
.say .typing .on::after{content:"";display:inline-block;width:.45em;height:1em;margin-right:-.45em;vertical-align:-.14em;background:var(--accent)}
/* Phones (390x844): the closing screen must fit one viewport so the bubble sits right above the sprite
   without scrolling. Tighten type and gaps on screen only; the 540px export clone keeps its own sizes. */
@media (max-width:600px){
 .s-khep-lai:not(.exporting) .body{padding:10px 0}
 .s-khep-lai:not(.exporting) .quote{font-size:21px;max-width:none}
 .s-khep-lai:not(.exporting) .cmd{margin-top:14px;gap:8px}
 .s-khep-lai:not(.exporting) .cmd code{font-size:13px;padding:8px 12px;min-height:44px}
 .s-khep-lai:not(.exporting) .cmd .btn{min-height:44px;padding:0 14px;gap:8px}
 .s-khep-lai:not(.exporting) .note{font-size:13px;line-height:1.45;margin-top:12px}
 .s-khep-lai:not(.exporting) .attribution{font-size:12px;margin-top:4px}
 .s-khep-lai:not(.exporting) .made{font-size:12px;margin-top:6px}
 .s-khep-lai:not(.exporting) .say{margin:14px 0 16px 4px;padding:10px 14px 12px}
 .s-khep-lai:not(.exporting) .say p{font-size:14.5px;line-height:1.42;margin-top:3px}
}
/* PNG export: the screen clone gets a static sprite (frame A) in the footer corner */
.exporting{--px:3px}
.buddy-x{position:absolute;left:18px;bottom:12px;width:calc(28*var(--px));height:calc(20*var(--px));z-index:2}
.exporting .foot{padding-left:calc(28*var(--px) - 12px);min-height:calc(20*var(--px) - 4px)}
.exporting .say{margin:18px 0 22px 4px;max-width:none}
.exporting .say p{font-size:15px;margin-top:3px}
@media print{.buddy{display:none}}`;
}
