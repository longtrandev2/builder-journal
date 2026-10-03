// 1200×630 share card (README / blog / OG image). Standalone SVG: colors baked in, no external refs.
// Note: Facebook upload does not accept SVG — for FB, screenshot a Wrapped screen instead.
import { escapeHtml as e, fmtNum, fmtRange } from '../lib/vn-format.js';
import { NPX_COMMAND } from '../lib/product-info.js';
import { PALETTES } from './wrapped-theme-styles.js';

const NUM_FONT = 'Bahnschrift, DIN Condensed, Avenir Next Condensed, Arial Narrow, sans-serif';
const TEXT_FONT = 'Segoe UI, -apple-system, Helvetica Neue, Arial, sans-serif';

/**
 * @param card { title, displayName, from, to, stats: [{ value, label }] (3 items), ticks? }
 */
export function renderCardSvg(card, theme = 'dem') {
  const p = PALETTES[theme] || PALETTES.dem;
  const stats = card.stats.slice(0, 3).map((s, i) => {
    const x = 80 + i * 360;
    return `<text x="${x}" y="420" font-family="${NUM_FONT}" font-size="120" font-weight="700" fill="${p.accent}">${fmtNum(s.value)}</text>` +
      `<text x="${x + 4}" y="462" font-family="${TEXT_FONT}" font-size="28" fill="${p.muted}">${e(s.label)}</text>`;
  }).join('');
  const ticks = (card.ticks || []).map((t) => {
    const x = (80 + t * 1040).toFixed(1);
    return `<line x1="${x}" x2="${x}" y1="500" y2="540"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="${p.bg}"/>
<text x="80" y="110" font-family="${TEXT_FONT}" font-size="30" font-weight="600" fill="${p.accent}">Mùa build của ${e(card.displayName)}</text>
<text x="80" y="210" font-family="${NUM_FONT}" font-size="92" font-weight="700" fill="${p.ink}">${e(card.title)}</text>
<text x="80" y="262" font-family="${TEXT_FONT}" font-size="30" fill="${p.muted}">${e(fmtRange(card.from, card.to))}</text>
${stats}
<g stroke="${p.accent}" stroke-width="1.5" opacity="0.7">${ticks}</g>
<text x="80" y="592" font-family="${TEXT_FONT}" font-size="24" fill="${p.muted}">${e(NPX_COMMAND)}</text>
</svg>
`;
}
