// Pixel companions (Cam / Lệnh / Cú): original characters drawn on a 28x20 grid, ported from the
// approved mock. Everything lives inside ONE factory so it can run in Node (server-rendered first
// paint, tests, export markup) and be inlined into the page via toString() (pose switching at runtime).
// Colours given as 'var(--ink)' follow the page theme (thought dots / megaphone stay visible on light themes).

export function createSpriteKit() {
  // Canvas 28x20, ground shadow on row 19. Coordinates in grids/anchors are body-relative.
  const CHARS = {
    cam: { name: 'Cam', bio: 'Điềm tĩnh, hay ghi chép, nghĩ kỹ rồi mới làm.', vibe: 'Tinh thần Claude Code', ox: 7, oy: 4, L: [-1, 8], R: [14, 8], notebook: true, lidY: 14,
      pal: { O: '#e07a4f', H: '#f3a77a', S: '#b85a36', f: '#ffb547', C: '#f8d9b8', eye: '#2a1610', mouth: '#7a3420', blush: '#ff9f8a', arm: '#d06c43', hand: '#f8d9b8', leg: '#b85a36' },
      grid: ['......f.......', '......ff......', '....OOfOOO....', '..OHHOOOOOOO..', '.OHHOOOOOOOOO.', '.OHOOOOOOOOOO.', 'OOOOOOOOOOOOOO',
        'OOOOOOOOOOOOOO', 'OOOOOOOOOOOOOO', 'OOOOOCCCCOOOOO', '.OOOCCCCCCOOO.', '.SOOCCCCCCOOS.', '..SSOCCCCOSS..', '....SSSSSS....'],
      eyes: { open: [[4,6],[4,7],[9,6],[9,7]], up: [[4,5],[4,6],[9,5],[9,6]], shut: [[3,7],[4,7],[9,7],[10,7]], happy: [[3,7],[4,6],[5,7],[8,7],[9,6],[10,7]], type: [[4,7],[4,8],[9,7],[9,8]] },
      mouth: { calm: [[6,8],[7,8]], open: [[6,8],[7,8],[6,9],[7,9]] }, blush: [[2,8],[11,8]],
      legs: { rest: [[4,14],[5,14],[8,14],[9,14]], hop: [[3,14],[4,14],[9,14],[10,14]] } },
    lenh: { name: 'Lệnh', bio: 'Ít lời, làm nhanh, thích mọi thứ gọn gàng.', vibe: 'Tinh thần Codex', ox: 7, oy: 3, L: [-1, 10], R: [14, 10], lidY: 14,
      pal: { W: '#eef1f3', G: '#9aa6b0', D: '#0e1418', t: '#3ee6c4', eye: '#3ee6c4', mouth: '#3a4650', blush: '#9fe8d8', arm: '#d5dbe0', hand: '#9aa6b0', leg: '#9aa6b0' },
      grid: ['........tt....', '........tt....', '....WWWWWW....', '..WWWWWWWWWW..', '.WWWWWWWWWWWW.', '.WWWWWWWWWWWW.', 'WDDDDDDDDDDDDW', 'WDDDDDDDDDDDDW',
        'WDDDDDDDDDDDDW', 'WWWWWWWWWWWWWW', 'WWWWWWWWWWWWWW', 'WWWWWWWWWWWWWW', '.WWWWWWWWWWWW.', '.GWWWWWWWWWWG.', '..GGGGGGGGGG..'],
      eyes: { open: [[4,6],[4,7],[9,6],[9,7]], up: [[5,6],[10,6]], shut: [[3,7],[4,7],[5,7],[8,7],[9,7],[10,7]], happy: [[3,7],[4,6],[5,7],[8,7],[9,6],[10,7]],
        type: [[2,6],[3,7],[2,8],[5,8],[6,8],[7,8]] },
      mouth: { calm: [[6,11],[7,11]], open: [[6,11],[7,11],[6,12],[7,12]] }, blush: [[2,11],[11,11]],
      legs: { rest: [[4,15],[5,15],[8,15],[9,15]], hop: [[3,15],[4,15],[9,15],[10,15]] } },
    cu: { name: 'Cú', bio: 'Thức khuya giỏi nhưng luôn nhắc bạn đi ngủ.', vibe: 'Mặc định khi chưa có log agent', ox: 10, oy: 4, L: [-1, 8], R: [14, 8], lamp: true, lidY: 13,
      pal: { B: '#a8744c', F: '#f3dfb8', N: '#ffb547', L: '#d9a873', l: '#a8744c', eye: '#1b1420', blush: '#f19a8a', arm: '#845436', hand: '#6e432b', leg: '#ffb547', mouth: '#ffb547' },
      grid: ['.BB........BB.', '.BBB......BBB.', 'BBBBBBBBBBBBBB', 'BFFFFBBBBFFFFB', 'BFFFFFBBFFFFFB', 'BFFFFFBBFFFFFB', 'BBFFFFNNFFFFBB',
        'BBBBBBNNBBBBBB', 'BBLLLLLLLLLLBB', 'BLLlLLlLLlLLLB', 'BLLLLLLLLLLLLB', 'BBLlLLlLLlLLBB', '.BLLLLLLLLLLB.', '..BBBBBBBBBB..'],
      eyes: { open: [[3,4],[4,4],[3,5],[4,5],[10,4],[11,4],[10,5],[11,5]], up: [[3,3],[4,3],[3,4],[4,4],[10,3],[11,3],[10,4],[11,4]],
        shut: [[2,5],[3,5],[4,5],[9,5],[10,5],[11,5]], happy: [[2,5],[3,4],[4,5],[9,5],[10,4],[11,5]] },
      mouth: { calm: [], open: [[6,8],[7,8]] }, blush: [[1,6],[12,6]], arms: { rest: [[0,0],[0,1],[0,2]] },
      legs: { rest: [[3,14],[4,14],[9,14],[10,14]], hop: [[2,14],[3,14],[10,14],[11,14]] } },
  };
  // Arm shapes for the RIGHT side (dx outward, dy down); left is mirrored. Last pixel = paw (hand colour).
  const ARMS = {
    rest: [[0,0],[1,0],[0,1],[1,1]], swing: [[0,0],[1,0],[1,-1],[2,-1],[2,-2]],
    up: [[0,0],[1,0],[1,-1],[2,-1],[2,-2],[3,-2],[3,-3],[4,-3]], upHigh: [[0,0],[1,0],[1,-1],[2,-1],[1,-2],[2,-2],[1,-3],[2,-3],[2,-4]],
    fwd: [[0,0],[1,0],[2,0],[3,0],[0,1],[1,1],[2,1],[3,1]], chin: [[0,0],[1,0],[1,-1],[0,-2],[-1,-2],[-2,-2]],
  };
  // Two frames per pose. dy = body offset, ldy = legs offset. lid = laptop seen from behind, hands tap on its top edge.
  const POSES = {
    run:   [{ eyes: 'open', armL: 'rest', armR: 'swing' }, { eyes: 'open', armL: 'swing', armR: 'rest', legs: 'hop', dy: -1 }],
    cheer: [{ eyes: 'happy', mouth: 'open', blush: 1, armL: 'up', armR: 'up' }, { eyes: 'happy', mouth: 'open', blush: 1, armL: 'upHigh', armR: 'upHigh', legs: 'hop', dy: -2 }],
    doze:  [{ eyes: 'shut', armL: 'rest', armR: 'rest' }, { eyes: 'shut', armL: 'rest', armR: 'rest', dy: 1, ldy: 0 }],
    mega:  [{ eyes: 'open', armL: 'rest', armR: 'fwd', mega: 1 }, { eyes: 'open', armL: 'rest', armR: 'fwd', mega: 1, waves: 1 }],
    type:  [{ eyes: 'type', lid: 1, tap: 'L' }, { eyes: 'type', lid: 1, tap: 'R' }],
    wave:  [{ eyes: 'happy', blush: 1, armL: 'rest', armR: 'upHigh' }, { eyes: 'happy', blush: 1, armL: 'rest', armR: 'up' }],
    think: [{ eyes: 'up', armL: 'rest', armR: 'chin', dots: 2 }, { eyes: 'up', armL: 'rest', armR: 'chin', dots: 3 }],
    laugh: [{ eyes: 'happy', mouth: 'open', blush: 1, armL: 'rest', armR: 'rest' }, { eyes: 'happy', mouth: 'open', blush: 1, armL: 'swing', armR: 'swing', dy: -1 }],
  };
  // [seconds per frame pair, repeat count] of each pose's one-shot motion.
  const ACT = { run: [.24, 10], cheer: [.36, 6], doze: [1.3, 2], mega: [.5, 5], type: [.16, 14], wave: [.42, 5], think: [.9, 3], laugh: [.2, 10] };
  const MEGA = { M: [[2,0],[3,0],[4,0],[5,0],[6,0],[2,1],[3,1],[4,1],[5,1],[6,1],[4,-1],[5,-1],[6,-1],[4,2],[5,2],[6,2],[6,-2],[6,3]], a: [[3,-1],[5,-2],[3,2],[5,3]], h: [[1,0],[1,1]] };
  const WAVES = [[8,-1],[9,0],[9,1],[8,2],[10,-3],[11,-2],[11,-1],[12,0],[12,1],[11,2],[11,3],[10,4]];
  const INK = 'var(--ink)';

  function frameCells(c, f) {
    const m = new Map(), put = (x, y, col) => m.set(x + ',' + y, col), w = c.grid[0].length;
    const X = c.ox, Y = c.oy + (f.dy || 0), LY = c.oy + (f.ldy ?? f.dy ?? 0);
    c.legs[f.legs || 'rest'].forEach(([x, y]) => put(X + x, LY + y, c.pal.leg));
    c.grid.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] !== '.') put(X + x, Y + y, c.pal[r[x]]); });
    (c.mouth[f.mouth || 'calm'] || []).forEach(([x, y]) => put(X + x, Y + y, c.pal.mouth));
    (c.eyes[f.eyes] || c.eyes.open).forEach(([x, y]) => put(X + x, Y + y, c.pal.eye));
    if (f.blush) c.blush.forEach(([x, y]) => put(X + x, Y + y, c.pal.blush));
    const arm = (name, side) => { if (!name) return null; const s = side < 0 ? c.L : c.R, px = (c.arms && c.arms[name]) || ARMS[name];
      px.forEach(([dx, dy], i) => put(X + s[0] + side * dx, Y + s[1] + dy, i === px.length - 1 ? c.pal.hand : c.pal.arm));
      const [ex, ey] = px[px.length - 1]; return [X + s[0] + side * ex, Y + s[1] + ey]; };
    const lh = arm(f.armL, -1); arm(f.armR, 1);
    if (c.notebook && lh) { const [hx, hy] = lh; // tiny notebook + pencil in the left paw
      for (let dy = -2; dy <= 1; dy++) { put(hx - 3, hy + dy, '#5b6488'); put(hx - 2, hy + dy, dy % 2 ? '#a3abc9' : '#f4efe3'); put(hx - 1, hy + dy, dy % 2 ? '#a3abc9' : '#f4efe3'); }
      put(hx - 1, hy - 3, '#ffb547'); put(hx, hy - 4, '#ffb547'); }
    if (f.lid) { const cx = X + Math.floor(w / 2), LIDY = c.lidY, glow = c.pal.eye === '#3ee6c4' ? '#3ee6c4' : '#ffb547';
      for (let x = cx - 7; x <= cx + 6; x++) for (let y = LIDY; y <= 18; y++) put(x, y, y === LIDY ? '#e3e7f5' : y === 18 ? '#8b93b5' : '#c7cde6');
      put(cx - 1, LIDY + 2, glow); put(cx, LIDY + 2, glow);
      [[cx - 5, f.tap === 'L'], [cx + 3, f.tap === 'R']].forEach(([hx, up]) => { const y0 = up ? LIDY - 2 : LIDY - 1;
        put(hx, y0, c.pal.hand); put(hx + 1, y0, c.pal.hand); put(hx, y0 + 1, c.pal.hand); put(hx + 1, y0 + 1, c.pal.hand); }); }
    if (f.mega) { const hx = X + c.R[0] + 3, hy = Y + c.R[1], col = { M: INK, a: '#ffb547', h: '#5b6488' };
      Object.entries(MEGA).forEach(([k, px]) => px.forEach(([dx, dy]) => put(hx + dx, hy + dy, col[k])));
      if (f.waves) WAVES.forEach(([dx, dy]) => put(hx + dx, hy + dy, '#ffb547')); }
    if (f.dots) { const x = X + w, y = Y + 2; // thought dots, growing up-right
      [[x, y], [x + 2, y - 2], [x + 4, y - 4], [x + 5, y - 4], [x + 4, y - 5], [x + 5, y - 5]].slice(0, f.dots === 2 ? 2 : 6).forEach(([a, b]) => put(a, b, INK)); }
    return m;
  }
  /* Cú's desk lamp: weighted base, stem, angled arm, dome shade, warm bulb. Static (does not bob). */
  function lampCells() {
    const m = new Map(), put = (x, y, c) => m.set(x + ',' + y, c);
    put(5, 8, '#ffb547'); put(6, 8, '#ffb547');
    for (let x = 4; x <= 8; x++) put(x, 9, '#d18a3a');
    for (let x = 5; x <= 7; x++) put(x, 10, '#fff1c4');
    put(3, 10, '#c7cde6'); put(2, 11, '#c7cde6'); put(1, 12, '#ffb547');
    put(1, 13, '#c7cde6'); put(1, 14, '#c7cde6'); put(2, 15, '#c7cde6'); put(2, 16, '#c7cde6');
    for (let x = 1; x <= 3; x++) put(x, 17, '#6b7499');
    for (let x = 0; x <= 4; x++) put(x, 18, '#4b5480');
    return m;
  }
  /* Merge horizontal runs of one colour into a single <rect>. */
  function rects(m) {
    const rows = {}; m.forEach((col, k) => { const [x, y] = k.split(',').map(Number); (rows[y] ||= []).push([x, col]); });
    let out = '';
    Object.entries(rows).forEach(([y, cells]) => { cells.sort((a, b) => a[0] - b[0]);
      for (let i = 0; i < cells.length;) { let j = i; while (j + 1 < cells.length && cells[j + 1][0] === cells[j][0] + 1 && cells[j + 1][1] === cells[i][1]) j++;
        const col = cells[i][1], paint = col.startsWith('var(') ? `style="fill:${col}"` : `fill="${col}"`;
        out += `<rect x="${cells[i][0]}" y="${y}" width="${j - i + 1}" height="1" ${paint}/>`; i = j + 1; } });
    return out;
  }
  const glowRef = (id) => `<circle cx="6" cy="11" r="7.5" fill="url(#${id})" shape-rendering="auto"/>`;
  function staticPart(c, { shadow = true, glowId = 'bj-glow' } = {}) {
    let s = shadow ? `<rect x="${c.ox + 1}" y="19" width="${c.grid[0].length - 2}" height="1" fill="rgba(0,0,0,.4)"/>` : '';
    if (c.lamp) s += glowRef(glowId) + rects(lampCells());
    return s;
  }
  /** Live sprite: shadow + lamp + body with both animation frames (CSS toggles .fA / .fB). */
  const spriteSvg = (id, pose) => { const c = CHARS[id];
    return staticPart(c) + `<g class="bod"><g class="fA">${rects(frameCells(c, POSES[pose][0]))}</g><g class="fB">${rects(frameCells(c, POSES[pose][1]))}</g></g>`; };
  /** PNG-export sprite: frame A only, own gradient defs, no CSS needed. */
  const exportSvg = (id, pose) => { const c = CHARS[id];
    const defs = c.lamp ? '<defs><radialGradient id="bj-glow-x"><stop offset="0" stop-color="#ffb547" stop-opacity=".5"/><stop offset="1" stop-color="#ffb547" stop-opacity="0"/></radialGradient></defs>' : '';
    return defs + staticPart(c, { glowId: 'bj-glow-x' }) + rects(frameCells(c, POSES[pose][0])); };
  /** Small head-and-shoulders icon for the picker (no shadow / ground). */
  const miniSvg = (id) => `<svg viewBox="0 2 28 18" shape-rendering="crispEdges" aria-hidden="true">${staticPart(CHARS[id], { shadow: false })}${rects(frameCells(CHARS[id], { eyes: 'open', armL: 'rest', armR: 'rest' }))}</svg>`;

  return { CHARS, POSES, ACT, spriteSvg, exportSvg, miniSvg };
}
