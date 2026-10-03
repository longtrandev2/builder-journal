// Reads the vendored browser assets (src/vendor/, produced by scripts/vendor-assets.js) and returns
// them as inline-ready text: font as base64 @font-face, libraries as <script> bodies. Read once, cached.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const VENDOR = new URL('../vendor/', import.meta.url);
const cache = new Map();

function once(key, load) {
  if (!cache.has(key)) cache.set(key, load());
  return cache.get(key);
}

const readVendor = (rel, enc) => fs.readFileSync(fileURLToPath(new URL(rel, VENDOR)), enc);

/** A literal "</script" inside a library would end the inline <script> early. */
const scriptSafe = (src) => src.replace(/<\/script/gi, '<\\/script');

/** Be Vietnam Pro 400/600/800, latin + vietnamese subsets, as data: URL @font-face rules. */
export function fontFaceCss() {
  return once('font', () => {
    const faces = JSON.parse(readVendor('fonts/font-faces.json', 'utf8'));
    return faces.map((f) => `@font-face{font-family:"Be Vietnam Pro";font-style:normal;font-weight:${f.weight};font-display:swap;` +
      `src:url(data:font/woff2;base64,${readVendor(`fonts/${f.file}`).toString('base64')}) format("woff2");unicode-range:${f.unicodeRange}}`).join('\n');
  });
}

export const animeJs = () => once('anime', () => scriptSafe(readVendor('anime.umd.min.js', 'utf8')));
export const htmlToImageJs = () => once('h2i', () => scriptSafe(readVendor('html-to-image.min.js', 'utf8')));
