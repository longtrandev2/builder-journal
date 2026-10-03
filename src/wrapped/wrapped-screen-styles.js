// CSS for screen content blocks: opening title, hero numbers, habits list, agent screens,
// leverage chain, closing quote. Mobile-first; wide layouts switch on the screen container width.

export function screenCss() {
  return `
.owner{color:var(--accent);font-weight:600;font-size:clamp(17px,3.2cqi,24px);margin-bottom:.5em}
.s-mo-dau h1{font-size:clamp(36px,min(15cqi,calc(150cqi / var(--len,8))),168px)}
.s-mo-dau .lead{color:var(--muted);margin-top:.7em}
.mega{font-size:clamp(64px,min(23cqi,calc(140cqi / var(--len,6))),250px)}
.hero{display:grid;gap:clamp(24px,5cqi,56px)}
.hero-label{font-size:clamp(20px,4.2cqi,34px);font-weight:600;letter-spacing:-.01em;margin-top:.4em;line-height:1.2}
.hero-note{color:var(--muted);font-size:15px;margin-top:4px}
.stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;border-top:1px solid var(--line);padding-top:18px}
.stat .big{display:block;font-size:clamp(26px,8.4cqi,64px);white-space:nowrap}
.stat-label{display:block;color:var(--muted);font-size:14px;line-height:1.35;margin-top:6px;text-wrap:balance}
@container (min-width:720px){
 .hero{grid-template-columns:minmax(0,1fr) auto;align-items:end}
 .mega{font-size:clamp(64px,min(17cqi,calc(90cqi / var(--len,6))),230px)}
 .ai-grid{grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);align-items:center;column-gap:clamp(32px,5cqi,72px)}
 .ai-grid .mega{font-size:clamp(64px,min(10cqi,calc(55cqi / var(--len,6))),150px)}
 .ai-grid .stat .big{font-size:clamp(26px,3.6cqi,46px)}
 .stats{grid-template-columns:1fr;border-top:0;border-left:1px solid var(--line);padding:0 0 0 clamp(24px,3cqi,40px);gap:22px}
 .habits{grid-template-columns:minmax(280px,400px) 1fr;align-items:center}
 .acts{grid-template-columns:repeat(2,minmax(0,1fr))}
 .agent-meta{grid-template-columns:1.2fr 1fr}
}
.habits{display:grid;gap:clamp(20px,5cqi,72px)}
.ai-grid{display:grid}
.ai-grid .hero{grid-template-columns:1fr}
.ai-grid .stats{border-left:0;padding:18px 0 0;border-top:1px solid var(--line);grid-template-columns:repeat(3,minmax(0,1fr))}
.persona{font-size:clamp(30px,7cqi,64px);font-weight:800;line-height:1.02;letter-spacing:-.035em;color:var(--accent);margin-bottom:.45em;text-wrap:balance}
.facts{list-style:none;padding:0;font-size:clamp(15px,2.3cqi,19px)}
.facts li{display:flex;justify-content:space-between;align-items:baseline;gap:16px;padding:10px 0;border-top:1px solid var(--line)}
.facts span{color:var(--muted)}
.facts b{font-weight:600;text-align:right}
.redo{display:flex;gap:12px;align-items:flex-start;margin-top:clamp(20px,4cqi,36px);padding:14px 16px;border-left:3px solid var(--accent-2);border-radius:0 12px 12px 0;background:var(--surface);font-size:clamp(15px,2.5cqi,19px);max-width:62ch}
.redo .ico{color:var(--accent);margin-top:3px}
.redo b{color:var(--accent)}
.stack{display:flex;gap:3px;height:clamp(14px,2.4cqi,22px);border-radius:999px;overflow:hidden;margin-top:clamp(20px,4cqi,36px)}
.seg{flex-basis:0;min-width:4px;transform-origin:left center}
.seg-edits{background:var(--accent-2)}.seg-commands{background:var(--ink);opacity:.72}.seg-reads{background:var(--ink);opacity:.36}.seg-other{background:var(--line)}
.acts{list-style:none;padding:0;display:grid;gap:0 32px;margin-top:14px}
.acts li{display:grid;grid-template-columns:22px auto 1fr;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--line)}
.acts li span:last-child{color:var(--muted)}
.act-num{font-size:clamp(24px,5cqi,40px);font-weight:800;letter-spacing:-.03em;line-height:1}
.act-edits .ico{color:var(--accent)}.act-commands .ico{color:var(--ink)}.act-reads .ico,.act-other .ico{color:var(--muted)}
.agent-meta{display:grid;gap:24px;margin-top:clamp(22px,4cqi,40px)}
.meta-title{font-weight:600;font-size:14px;color:var(--muted);margin-bottom:10px}
.models ol{list-style:none;padding:0}
.models li{display:grid;grid-template-columns:minmax(0,10em) 1fr 3em;align-items:center;gap:12px;padding:5px 0}
.m-name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600}
.m-bar{height:8px;border-radius:99px;background:var(--heat0);overflow:hidden}
.m-bar i{display:block;height:100%;border-radius:99px;background:var(--accent-2);transform-origin:left center}
.models .num{text-align:right;color:var(--muted)}
.tokens .big{display:block;font-size:clamp(34px,8cqi,64px);line-height:1.05}
.tokens .note{margin-top:12px}
.chain{display:flex;flex-direction:column;align-items:flex-start;margin-top:clamp(24px,5cqi,48px)}
.node{display:flex;align-items:baseline;gap:12px}
.node .big{font-size:clamp(44px,min(13cqi,calc(80cqi / var(--len,4))),112px)}
.node span:last-child{font-size:clamp(17px,3cqi,26px);font-weight:600;color:var(--muted)}
.node.last .big{color:var(--accent)}
.link{display:block;width:2px;height:clamp(20px,5cqi,40px);margin:6px 0 6px clamp(14px,3cqi,26px);background:var(--accent-2);transform-origin:50% 0}
@container (min-width:720px){
 .chain{flex-direction:row;align-items:center;width:100%}
 .node{flex-direction:column;gap:4px}
 .node .big{font-size:clamp(44px,min(9cqi,calc(42cqi / var(--len,4))),104px)}
 .link{flex:1;min-width:24px;height:2px;margin:0 clamp(14px,2.4cqi,32px);transform-origin:0 50%}
}
.s-don-bay .lead,.s-chi-dao .lead,.s-nhip-ngay .lead{margin-top:clamp(16px,3cqi,28px)}
.quote{font-size:clamp(25px,5.4cqi,52px);line-height:1.22;font-weight:600;letter-spacing:-.02em;max-width:24ch;text-wrap:pretty}
.quote .rest{color:transparent}
.quote .typed::after{content:"";display:inline-block;width:.08em;height:.9em;margin-left:.04em;background:var(--accent);vertical-align:-.08em}
.cmd{display:flex;flex-wrap:wrap;gap:12px;align-items:stretch;margin-top:clamp(24px,5cqi,44px)}
.cmd code{display:flex;align-items:center;min-height:48px;padding:10px 16px;border-radius:12px;background:var(--surface);border:1px solid var(--line);font:500 15px/1.3 ui-monospace,Consolas,"SF Mono",monospace;overflow-wrap:anywhere}
.made{color:var(--muted);font-size:13px;margin-top:20px}
@container (min-width:600px){.compact-only{display:none}}
/* Short landscape windows (1366x768 laptops): type is sized by width (cqi), so cap the tall
   pieces by viewport height too. Never applies to the 540px export clone (.exporting). */
@media (min-aspect-ratio:4/3) and (max-height:860px){
 .screen:not(.exporting) h2{font-size:min(clamp(28px,6.4cqi,58px),6.6vh)}
 .screen:not(.exporting) .lead{font-size:min(clamp(18px,3.4cqi,26px),3.2vh)}
 .screen:not(.exporting) .note{margin-top:min(clamp(18px,3cqi,32px),2.4vh)}
 .screen.s-mo-dau:not(.exporting) h1{font-size:min(clamp(36px,min(15cqi,calc(150cqi / var(--len,8))),168px),19vh)}
 .screen.s-con-so:not(.exporting) .mega{font-size:min(clamp(64px,min(17cqi,calc(90cqi / var(--len,6))),230px),24vh)}
 .screen:not(.exporting) .barcode{height:min(clamp(64px,15cqi,132px),12vh)}
 .screen:not(.exporting) .film-wrap{margin-top:min(clamp(28px,7cqi,72px),4vh)}
 .screen:not(.exporting) .heat-wrap{margin-top:min(clamp(18px,4cqi,40px),2vh)}
 .screen:not(.exporting) .buckets{height:min(48px,5vh)}
 .screen:not(.exporting) .bars{gap:min(clamp(14px,2.6cqi,24px),1.8vh);margin-top:min(clamp(20px,4cqi,40px),3vh)}
 .screen:not(.exporting) .agent-meta{margin-top:min(clamp(22px,4cqi,40px),3vh)}
 .screen.s-don-bay:not(.exporting) .lead,.screen.s-nhip-ngay:not(.exporting) .lead{margin-top:min(clamp(16px,3cqi,28px),2vh)}
}`;
}
