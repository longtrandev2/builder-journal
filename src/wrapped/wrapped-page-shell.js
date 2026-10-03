// Single-file HTML shell shared by the Wrapped page and the weekly card: inlined font, CSS,
// anime.js, html-to-image and the page scripts. No external URL is ever referenced.
import { escapeHtml as e } from '../lib/vn-format.js';
import { PALETTES, baseCss, themeSwitcherHtml } from './wrapped-theme-styles.js';
import { fontFaceCss, animeJs, htmlToImageJs } from './wrapped-vendor-assets.js';
import { wrappedPageClient } from './wrapped-page-client-script.js';
import { pngExportClient } from './png-export-client-script.js';

export const safeTheme = (theme) => (PALETTES[theme] ? theme : 'dem');

/**
 * @param page { title, theme, css, body, lang? }  css = page-specific CSS appended after the base.
 */
export function renderPageShell({ title, theme, css = '', body }) {
  const active = safeTheme(theme);
  return `<!DOCTYPE html>
<html lang="vi" data-theme="${active}" class="snap">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="color-scheme" content="light dark">
<title>${e(title)}</title>
<style id="bj-fonts">${fontFaceCss()}</style>
<style>${baseCss()}${css}</style>
</head>
<body>
${body}
${themeSwitcherHtml(active)}
<script>${animeJs()}</script>
<script>${htmlToImageJs()}</script>
<script>(${wrappedPageClient.toString()})();(${pngExportClient.toString()})();</script>
</body>
</html>
`;
}
