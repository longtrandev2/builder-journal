// Browser-side script for the Wrapped page, written as a real function and inlined via toString().
// One orchestrated anime.js moment per screen, played when the screen scrolls into view.
// Markup always holds the final state: no JS, reduced motion or a failed library = static page.
// window.bjFinishMotion(section) jumps a screen to its end state (used before PNG export).

/* global anime */
export function wrappedPageClient() {
  const A = window.anime;
  const root = document.documentElement;
  const motion = !!(A && A.animate) && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const $$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));
  const shown = (el) => el.getClientRects().length > 0;

  // Count-ups: every [data-count] in a screen, staggered, outExpo so big numbers settle slowly.
  function counts(sec, { delay = 0, step = 110, duration = 1600 } = {}) {
    return $$('[data-count]', sec).map((el, i) => {
      const o = { v: 0 };
      const end = +el.dataset.count;
      return A.animate(o, {
        v: end, duration, delay: delay + i * step, ease: 'outExpo',
        onUpdate: () => { el.textContent = fmt(o.v); },
        onComplete: () => { el.textContent = fmt(end); },
      });
    });
  }
  const grow = (targets, prop, opts) => (targets.length ? [A.animate(targets, { [prop]: [0, 1], duration: 900, ease: 'outExpo', ...opts })] : []);

  // prep(sec): hide what the moment will reveal. play(sec): return the animations it starts.
  const MOMENTS = {
    film: {
      prep: (s) => { s.querySelector('.barcode').style.clipPath = 'inset(0 100% 0 0)'; },
      play(s) {
        const svg = s.querySelector('.barcode');
        const head = s.querySelector('.playhead');
        const num = s.querySelector('.film-count [data-count]');
        const xs = $$('line', svg).map((l) => +l.getAttribute('x1') / 1000).sort((a, b) => a - b);
        const o = { p: 0 };
        let k = 0;
        head.style.opacity = 1;
        return [A.animate(o, {
          p: 1, duration: 2600, delay: 250, ease: 'inOutSine',
          onUpdate: () => {
            svg.style.clipPath = `inset(0 ${(100 - o.p * 100).toFixed(2)}% 0 0)`;
            head.style.left = `calc(12px + (100% - 24px) * ${o.p.toFixed(4)})`;
            while (k < xs.length && xs[k] <= o.p + 1e-9) k++;
            num.textContent = fmt(k);
          },
          onComplete: () => { svg.style.clipPath = ''; head.style.opacity = 0; num.textContent = fmt(+num.dataset.count); },
        })];
      },
    },
    hero: {
      prep: (s) => A.utils.set($$('.hero-label,.hero-note,.stat-label', s), { opacity: 0, translateY: 10 }),
      play: (s) => [...counts(s, { step: 160, duration: 1900 }),
        A.animate($$('.hero-label,.hero-note,.stat-label', s), { opacity: [0, 1], translateY: [10, 0], delay: A.stagger(120, { start: 500 }), duration: 700, ease: 'outCubic' })],
    },
    heat: {
      prep: (s) => { A.utils.set($$('.cell', s), { scale: 0 }); A.utils.set($$('.buckets rect', s), { scaleY: 0 }); },
      play(s) {
        const svg = $$('.heat', s).filter(shown)[0];
        const cells = svg ? $$('.cell', svg) : [];
        const weeks = Math.max(1, cells.length / 7);
        A.utils.set($$('.cell', s).filter((c) => !cells.includes(c)), { scale: 1 });
        return [
          ...grow(cells, 'scale', { delay: A.stagger(26, { grid: [7, weeks], from: 'first' }), duration: 520, ease: 'outBack(1.6)' }),
          ...grow($$('.buckets rect', s), 'scaleY', { delay: A.stagger(18, { start: 500 }), ease: 'outCubic' }),
        ];
      },
    },
    bars: {
      prep: (s) => A.utils.set($$('.bar-fill', s), { scaleX: 0 }),
      play: (s) => [...counts(s), ...grow($$('.bar-fill', s), 'scaleX', { delay: A.stagger(130), duration: 1200 })],
    },
    clock: {
      prep: (s) => A.utils.set($$('.hand', s), { scaleY: 0 }),
      play(s) {
        const sweep = s.querySelector('.sweep');
        return [
          ...grow($$('.hand', s), 'scaleY', { delay: A.stagger(55), duration: 700, ease: 'outBack(1.4)' }),
          A.animate(sweep, { rotate: [0, 360], opacity: [{ to: 0.9, duration: 150 }, { to: 0.9, duration: 1150 }, { to: 0, duration: 250 }], duration: 1550, ease: 'linear' }),
        ];
      },
    },
    direct: {
      prep: (s) => { A.utils.set($$('.duel rect', s), { scaleY: 0 }); A.utils.set(s.querySelector('.redo'), { opacity: 0, translateX: -12 }); },
      play: (s) => [...counts(s), ...grow($$('.duel rect', s), 'scaleY', { delay: A.stagger(28, { from: 'center', start: 300 }), duration: 800 }),
        A.animate(s.querySelector('.redo'), { opacity: [0, 1], translateX: [-12, 0], delay: 900, duration: 700, ease: 'outCubic' })],
    },
    agent: {
      prep: (s) => A.utils.set($$('.seg,.m-bar i', s), { scaleX: 0 }),
      play: (s) => [...counts(s, { step: 140 }), ...grow($$('.seg', s), 'scaleX', { delay: A.stagger(220), duration: 1000 }),
        ...grow($$('.m-bar i', s), 'scaleX', { delay: A.stagger(120, { start: 700 }) })],
    },
    chain: {
      prep: (s) => { A.utils.set($$('.node', s), { opacity: 0, translateY: 16 }); A.utils.set($$('.link', s), { scale: 0 }); },
      play: (s) => [...counts(s, { step: 520, duration: 1300 }),
        A.animate($$('.node', s), { opacity: [0, 1], translateY: [16, 0], delay: A.stagger(520), duration: 700, ease: 'outCubic' }),
        ...grow($$('.link', s), 'scale', { delay: A.stagger(520, { start: 300 }), duration: 600, ease: 'inOutQuad' })],
    },
    type: {
      prep(s) {
        const q = s.querySelector('[data-type]');
        q.dataset.full = q.textContent;
        q.innerHTML = '<span class="typed"></span><span class="rest"></span>';
        q.lastChild.textContent = q.dataset.full;
      },
      play(s) {
        const q = s.querySelector('[data-type]');
        const full = q.dataset.full;
        const o = { i: 0 };
        return [A.animate(o, {
          i: full.length, duration: Math.min(4200, full.length * 26), delay: 300, ease: 'linear',
          onUpdate: () => { const n = Math.round(o.i); q.firstChild.textContent = full.slice(0, n); q.lastChild.textContent = full.slice(n); },
          onComplete: () => { q.textContent = full; },
        })];
      },
    },
  };

  function play(sec) {
    if (sec.dataset.played) return;
    sec.dataset.played = '1';
    const m = MOMENTS[sec.dataset.moment];
    try { sec._anims = m ? m.play(sec) : []; } catch (err) { console.error(err); }
  }
  window.bjFinishMotion = (sec) => {
    if (!motion) return;
    play(sec);
    (sec._anims || []).forEach((a) => a && a.complete && a.complete());
  };

  if (motion) {
    root.classList.add('motion');
    const io = new IntersectionObserver((entries) => entries.forEach((x) => { if (x.isIntersecting) play(x.target); }), { threshold: 0.3 });
    $$('[data-moment]').forEach((sec) => {
      const m = MOMENTS[sec.dataset.moment];
      if (!m) return;
      try {
        $$('[data-count]', sec).forEach((el) => { el.textContent = '0'; });
        m.prep(sec);
        io.observe(sec);
      } catch (err) { console.error(err); }
    });
  }

  $$('.themes button').forEach((b) => b.addEventListener('click', () => {
    root.dataset.theme = b.dataset.set;
    $$('.themes button').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
  }));
  const copy = document.getElementById('copy');
  if (copy) copy.addEventListener('click', () => {
    const label = copy.querySelector('span');
    const text = document.getElementById('cmd').textContent;
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject(new Error('no clipboard')))
      .then(() => { label.textContent = 'Đã chép'; }, () => { label.textContent = 'Bôi đen lệnh để chép'; });
  });
}
