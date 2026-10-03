// Browser-side "Tải ảnh" handler shared by the Wrapped page and the weekly card (inlined via toString()).
// A [data-export] button exports its closest [data-export-root] with the vendored html-to-image.
// Roots with data-export-width are cloned into an off-screen host of that width first, so the
// container-query layout re-flows to a 4:5 portrait (540px wide, 2x = 1080x1350) on any window size.
// Works from file:// because the font is already a data: URL and the page has no external assets.

/* global htmlToImage */
export function pngExportClient() {
  const fontCss = (document.getElementById('bj-fonts') || {}).textContent || '';
  const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  // html-to-image copies computed styles for HTML elements only; SVG children keep just their
  // classes, and the page stylesheet is not inside the exported image. Bake the visual props inline.
  const SVG_PROPS = ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'opacity', 'fill-opacity', 'stroke-opacity', 'display', 'visibility',
    'font-family', 'font-size', 'font-weight', 'letter-spacing', 'text-anchor', 'transform', 'transform-origin', 'transform-box', 'vector-effect'];
  function inlineSvgStyles(node) {
    node.querySelectorAll('svg').forEach((svg) => {
      const box = svg.getBoundingClientRect();
      svg.style.width = `${box.width}px`;
      svg.style.height = `${box.height}px`;
      svg.querySelectorAll('*').forEach((el) => {
        const cs = getComputedStyle(el);
        SVG_PROPS.forEach((p) => el.style.setProperty(p, cs.getPropertyValue(p)));
      });
    });
  }

  async function capture(root) {
    if (window.bjFinishMotion) window.bjFinishMotion(root);
    // Always export a clone in an off-screen host: the live page is never mutated.
    const host = document.createElement('div');
    host.className = 'export-host';
    host.style.width = `${Number(root.dataset.exportWidth) || root.offsetWidth}px`;
    const node = root.cloneNode(true);
    node.removeAttribute('id');
    node.classList.add('exporting');
    host.appendChild(node);
    document.body.appendChild(host);
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      await frames();
      inlineSvgStyles(node);
      return await window.htmlToImage.toPng(node, {
        pixelRatio: 2,
        width: node.offsetWidth,
        height: node.offsetHeight,
        backgroundColor: getComputedStyle(node).backgroundColor,
        fontEmbedCSS: fontCss,
        filter: (n) => !(n.classList && n.classList.contains('no-export')),
      });
    } finally {
      host.remove();
    }
  }
  window.bjCapture = capture;

  document.addEventListener('click', async (ev) => {
    const btn = ev.target.closest && ev.target.closest('[data-export]');
    const root = btn && btn.closest('[data-export-root]');
    if (!root || btn.disabled) return;
    const label = btn.querySelector('span');
    const idle = label.textContent;
    btn.disabled = true;
    label.textContent = 'Đang tạo ảnh';
    try {
      if (!window.htmlToImage) throw new Error('html-to-image missing');
      const url = await capture(root);
      const a = document.createElement('a');
      a.href = url;
      a.download = root.dataset.exportName || 'builder-wrapped.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      label.textContent = 'Đã tải xong';
    } catch (err) {
      console.error(err);
      label.textContent = 'Chưa tạo được ảnh';
    }
    setTimeout(() => { label.textContent = idle; btn.disabled = false; }, 1800);
  });
}
