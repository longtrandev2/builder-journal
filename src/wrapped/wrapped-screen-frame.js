// Shared frame for every Wrapped screen: kicker + "Tải ảnh" button on top, page number at the
// bottom (that footer doubles as the watermark of the exported PNG). Screens return plain specs
// { id, kicker, icon, moment, body } and the template numbers them here.
import { escapeHtml as e, fmtNum } from '../lib/vn-format.js';
import { icon } from '../vendor/lucide-icons.js';

/** Count-up number: markup already holds the final value (no-JS / reduced-motion / export safe). */
export const count = (n, cls = 'num') => `<span class="${cls}" data-count="${Math.round(n)}" style="--len:${fmtNum(n).length}">${fmtNum(n)}</span>`;

export function downloadButton(label = 'Tải ảnh') {
  return `<button type="button" class="dl no-export" data-export>${icon('download', { size: 18 })}<span>${label}</span></button>`;
}

/**
 * @param spec  { id, kicker, icon, moment, body }
 * @param ctx   { title, owner, index, total, slug }
 */
export function frameScreen(spec, ctx) {
  const file = `${ctx.slug}-${String(ctx.index).padStart(2, '0')}-${spec.id}.png`;
  return `<section class="screen s-${spec.id}" id="${spec.id}" data-moment="${spec.moment}" data-export-root data-export-width="540" data-export-name="${e(file)}" aria-label="${e(spec.kicker)}">
<header class="head"><p class="kicker">${icon(spec.icon)}<span>${e(spec.kicker)}</span></p>${downloadButton()}</header>
<div class="body">${spec.body}</div>
<footer class="foot"><span>${e(ctx.owner)}</span><span class="num">${fmtNum(ctx.index)}/${fmtNum(ctx.total)}</span></footer>
</section>`;
}
