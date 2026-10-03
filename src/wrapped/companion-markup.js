// Server-rendered markup for the companion: the fixed sprite button and the picker that lives inside
// the theme dock. First paint is complete without JS (sprite in its opening pose, picker readable);
// companion-client-script.js only adds pose changes, the remembered choice and the typing effect.
import { escapeHtml as e } from '../lib/vn-format.js';
import { createSpriteKit } from './companion-sprites.js';
import { COMPANION_IDS } from './companion-assignment.js';

export const ATTRIBUTION = 'Nhân vật tự vẽ, lấy cảm hứng từ tinh thần Claude Code / Codex — không phải linh vật chính thức, không liên kết với Anthropic hay OpenAI.';
export const COMPANION_STORAGE_KEY = 'bj-companion';

// Soft glow behind Cú's desk lamp; referenced as url(#bj-glow) by the sprites.
const GLOW_DEFS = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><radialGradient id="bj-glow"><stop offset="0" stop-color="#ffb547" stop-opacity=".5"/><stop offset="1" stop-color="#ffb547" stop-opacity="0"/></radialGradient></defs></svg>';

/**
 * @param autoId  character picked by autoCompanion(); the page opens with it unless the user chose another
 * @returns { buddyHtml, dockHtml }  buddyHtml goes after the screens, dockHtml inside the .themes nav
 */
export function companionMarkup(autoId) {
  const kit = createSpriteKit();
  const auto = kit.CHARS[autoId];
  const options = [
    `<button class="opt" type="button" data-c="auto" aria-pressed="true"><span class="auto-ico" aria-hidden="true">Tự</span><span><b>Tự động</b><small>Theo agent bạn dùng nhiều nhất: Cam đi cùng Claude Code, Lệnh đi cùng Codex, chưa có log thì Cú đi cùng bạn. Đang là ${e(auto.name)}.</small></span></button>`,
    ...COMPANION_IDS.map((id) => {
      const c = kit.CHARS[id];
      return `<button class="opt" type="button" data-c="${id}" aria-pressed="false">${kit.miniSvg(id)}<span><b>${e(c.name)}</b><small>${e(c.vibe)}. ${e(c.bio)}</small></span></button>`;
    }),
  ].join('');
  const buddyHtml = `${GLOW_DEFS}
<button class="buddy no-export" id="bj-buddy" type="button" data-auto="${autoId}" aria-label="${e(auto.name)}, bạn đồng hành. Bấm để xem lại động tác">
<span class="fx" aria-hidden="true"></span><svg viewBox="0 0 28 20" shape-rendering="crispEdges" aria-hidden="true">${kit.spriteSvg(autoId, 'run')}</svg><span class="ground" aria-hidden="true"></span></button>`;
  const dockHtml = `<span class="sep" aria-hidden="true"></span>
<button class="pick" id="bj-pick" type="button" aria-expanded="false" aria-controls="bj-drawer" aria-label="Đổi bạn đồng hành, đang chọn ${e(auto.name)} (tự động)"><span id="bj-pick-ico">${kit.miniSvg(autoId)}</span><span class="chev" aria-hidden="true"></span></button>
<div class="drawer" id="bj-drawer" hidden><p class="dh">Bạn đồng hành</p><div id="bj-opts">${options}</div><p class="attr">${e(ATTRIBUTION)}</p></div>`;
  return { buddyHtml, dockHtml };
}
