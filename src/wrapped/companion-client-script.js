// Browser-side companion behaviour, written as a real function and inlined via toString().
// kit = createSpriteKit() inlined next to it. Responsibilities:
//  - one pose per screen (a thin band across the middle of the viewport decides which screen is "current")
//  - picker in the theme dock (auto / Cam / Lệnh / Cú), remembered in localStorage (failures ignored)
//  - closing screen: speech bubble typed line by line, then a wave at the sign-off
//  - window.bjDecorateExport(clone, screen): stamps a static sprite (and the finished bubble) into PNG exports
// Reduced motion = static: sprite holds frame A, bubble text is complete. No JS = same, from the markup.

export function companionClient(kit, storageKey) {
  const buddy = document.getElementById('bj-buddy');
  if (!buddy) return;
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (id) => document.getElementById(id);
  const svg = buddy.querySelector('svg');
  const fx = buddy.querySelector('.fx');
  const pick = $('bj-pick');
  const drawer = $('bj-drawer');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const auto = buddy.dataset.auto;
  let choice = 'auto';
  try { const v = localStorage.getItem(storageKey); if (v === 'auto' || kit.CHARS[v]) choice = v; } catch { /* private mode / blocked storage */ }
  const charId = () => (choice === 'auto' ? auto : choice);
  let pose = 'run';
  let timer = 0;
  let typeRun = 0;
  let notesDone = false;

  const ZZ = '<svg viewBox="0 0 4 4" shape-rendering="crispEdges"><path d="M0 0h4v1H0zM2 1h1v1H2zM1 2h1v1H1zM0 3h4v1H0z" fill="currentColor"/></svg>';
  function effects(p) {
    fx.textContent = '';
    if (p === 'cheer' && !RM.matches) {
      const cols = ['#ffb547', '#f4efe3', '#e07a4f', '#3ee6c4', '#8fb3ff'];
      for (let i = 0; i < 18; i++) {
        const s = document.createElement('i');
        const ang = -Math.PI * (0.12 + 0.76 * Math.random());
        const r = 50 + Math.random() * 60;
        s.className = 'cf';
        s.style.cssText = `--x:${(Math.cos(ang) * r).toFixed(1)}px;--y:${(Math.sin(ang) * r).toFixed(1)}px;background:${cols[i % 5]};animation-delay:${(Math.random() * 0.2).toFixed(2)}s`;
        fx.append(s);
      }
    }
    if (p === 'doze') {
      [0, 1, 2].forEach((i) => {
        const z = document.createElement('i');
        const sz = [1, 0.8, 0.6][i];
        z.className = 'zz';
        z.innerHTML = ZZ;
        z.style.cssText = RM.matches
          ? `opacity:.85;transform:translate(calc(${i * 4}*var(--px)),calc(${-i * 4}*var(--px))) scale(${sz})`
          : `animation-delay:${(i * 0.8).toFixed(1)}s;scale:${sz}`;
        fx.append(z);
      });
    }
  }

  function play(p) {
    const c = kit.CHARS[charId()];
    pose = p;
    svg.innerHTML = kit.spriteSvg(charId(), p);
    buddy.className = 'buddy no-export p-' + p;
    buddy.setAttribute('aria-label', `${c.name}, bạn đồng hành. Bấm để xem lại động tác`);
    effects(p);
    if (RM.matches) return;
    const [d, n] = kit.ACT[p];
    buddy.style.setProperty('--d', d + 's');
    buddy.style.setProperty('--n', n);
    void buddy.offsetWidth; // restart the CSS animation
    buddy.classList.add('act');
    clearTimeout(timer);
    timer = setTimeout(() => buddy.classList.remove('act'), d * n * 1000);
  }
  buddy.addEventListener('click', () => play(pose));

  // ---- picker ----
  const setDrawer = (open) => { drawer.hidden = !open; pick.setAttribute('aria-expanded', String(open)); };
  function syncPicker() {
    const c = kit.CHARS[charId()];
    $('bj-pick-ico').innerHTML = kit.miniSvg(charId());
    pick.setAttribute('aria-label', `Đổi bạn đồng hành, đang chọn ${c.name}${choice === 'auto' ? ' (tự động)' : ''}`);
    document.querySelectorAll('#bj-opts .opt').forEach((o) => o.setAttribute('aria-pressed', String(o.dataset.c === choice)));
    const head = document.querySelector('.say h3');
    if (head) head.textContent = `Lời nhắn từ ${c.name}`;
  }
  pick.addEventListener('click', () => setDrawer(drawer.hidden));
  document.addEventListener('click', (e) => { if (!drawer.hidden && !e.target.closest('.themes')) setDrawer(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !drawer.hidden) { setDrawer(false); pick.focus(); } });
  $('bj-opts').addEventListener('click', (e) => {
    const b = e.target.closest('.opt');
    if (!b) return;
    choice = b.dataset.c;
    try { localStorage.setItem(storageKey, choice); } catch { /* remembered choice is a nicety */ }
    syncPicker();
    play(pose);
  });

  // ---- closing bubble: text is complete in the markup; here it is hidden and typed ----
  const bubbleLines = () => Array.from(document.querySelectorAll('.say-line'));
  const fullText = (p) => p.querySelector('.on').textContent + p.querySelector('.off').textContent;
  const showAll = (lines) => lines.forEach((p) => { const t = fullText(p); p.classList.remove('typing'); p.querySelector('.on').textContent = t; p.querySelector('.off').textContent = ''; });
  async function typeNotes(sec) {
    const lines = bubbleLines();
    const run = ++typeRun;
    if (!lines.length) return;
    const texts = lines.map(fullText);
    const on = (i) => lines[i].querySelector('.on');
    const off = (i) => lines[i].querySelector('.off');
    lines.forEach((_, i) => { on(i).textContent = ''; off(i).textContent = texts[i]; });
    play(sec.dataset.leadPose || 'wave');
    const q = sec.querySelector('[data-type]'); // let the highlight sentence finish typing first
    await sleep(q ? Math.min(4200, (q.dataset.full || q.textContent).length * 26) + 700 : 500);
    for (let i = 0; i < lines.length; i++) {
      if (i === lines.length - 1) { await sleep(250); if (run === typeRun) play('wave'); }
      lines[i].classList.add('typing');
      for (let k = 1; k <= texts[i].length; k++) {
        if (run !== typeRun) return;
        on(i).textContent = texts[i].slice(0, k);
        off(i).textContent = texts[i].slice(k);
        await sleep(22);
      }
      lines[i].classList.remove('typing');
      await sleep(320);
    }
    notesDone = true;
  }

  // ---- one pose per screen ----
  function enter(sec) {
    const p = sec.dataset.pose;
    if (!p) return;
    if (p !== 'notes') { typeRun++; play(p); return; }
    if (RM.matches || notesDone) { typeRun++; showAll(bubbleLines()); play(notesDone ? 'wave' : sec.dataset.leadPose || 'wave'); return; }
    typeNotes(sec);
  }
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((x) => { if (x.isIntersecting) enter(x.target); }),
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
    document.querySelectorAll('[data-pose]').forEach((s) => io.observe(s));
  }

  // ---- PNG export: static sprite + finished bubble in the cloned screen ----
  window.bjDecorateExport = (node, sec) => {
    const p = sec.dataset.pose === 'notes' ? 'wave' : sec.dataset.pose;
    if (!p) return;
    showAll(Array.from(node.querySelectorAll('.say-line')));
    const head = node.querySelector('.say h3');
    if (head) head.textContent = `Lời nhắn từ ${kit.CHARS[charId()].name}`;
    const stamp = document.createElement('span');
    stamp.className = 'buddy-x';
    stamp.innerHTML = `<svg viewBox="0 0 28 20" shape-rendering="crispEdges" aria-hidden="true">${kit.exportSvg(charId(), p)}</svg>`;
    node.appendChild(stamp);
  };

  syncPicker();
  play('run');
}
