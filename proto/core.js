// Forge & Duel 원형 — 순수 규칙 (화면 없음). 브라우저(window.FD)와 Node(require) 양쪽에서 쓴다.
(function (root) {
  const N = 4, MAXLV = 5;
  const VAL = [0, 1, 3, 7, 15, 31];            // 레벨별 값. 합칠수록 이득(1+1 < 3)
  const CFG = {
    hp: 20,
    spawn: { S: 45, H: 20, P: 15, C: 20 },     // 검, 방패, 물약, 동전
    goldPerBonus: 10, bonusHp: 2,              // 금 10마다 최대 체력 +2
    enemies: {
      slime: { hp: 5, atk: 3, cd: 4 }, bat: { hp: 3, atk: 2, cd: 2 },
      golem: { hp: 14, atk: 6, cd: 6 }, boss: { hp: 22, atk: 7, cd: 4 },
    },
    hpScale: 0.18, atkScale: 0.10,
  };
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const power = (tile) => (tile.t === 'S' || tile.t === 'C' ? VAL[tile.lv] : VAL[tile.lv] + 1);
  function makeEnemy(room, r) {
    let kind = 'slime';
    if (room % 5 === 0) kind = 'boss';
    else { const pool = ['slime']; if (room >= 2) pool.push('bat'); if (room >= 4) pool.push('golem'); kind = pool[Math.floor(r() * pool.length)]; }
    const b = CFG.enemies[kind];
    return { kind, hp: Math.ceil(b.hp * (1 + CFG.hpScale * (room - 1))), atk: Math.ceil(b.atk * (1 + CFG.atkScale * (room - 1))), cd: b.cd, timer: b.cd };
  }
  function spawn(s) {
    const empty = []; s.grid.forEach((c, i) => { if (!c) empty.push(i); });
    if (!empty.length) return false;
    const total = Object.values(CFG.spawn).reduce((a, b) => a + b, 0); let x = s.r() * total, t = 'S';
    for (const k of Object.keys(CFG.spawn)) { if (x < CFG.spawn[k]) { t = k; break; } x -= CFG.spawn[k]; }
    s.grid[empty[Math.floor(s.r() * empty.length)]] = { t, lv: 1 }; return true;
  }
  function newGame(seed) {
    const s = { r: rng(seed == null ? Date.now() : seed), grid: Array(N * N).fill(null), hp: CFG.hp, maxHp: CFG.hp, block: 0, gold: 0, room: 1, turns: 0, over: false, events: [] };
    s.enemy = makeEnemy(1, s.r); spawn(s); spawn(s); spawn(s); return s;
  }
  const lineIdx = (dir, k) => { const a = []; for (let i = 0; i < N; i++) a.push(dir === 'left' ? k * N + i : dir === 'right' ? k * N + (N - 1 - i) : dir === 'up' ? i * N + k : (N - 1 - i) * N + k); return a; };
  function slideGrid(grid, dir) { // 반환: {grid, moved, merges}
    const g = grid.slice(); let moved = false, merges = 0;
    for (let k = 0; k < N; k++) {
      const idx = lineIdx(dir, k), tiles = idx.map((i) => g[i]).filter(Boolean), out = [];
      for (let i = 0; i < tiles.length; i++) {
        const a = tiles[i], b = tiles[i + 1];
        if (b && a.t === b.t && a.lv === b.lv && a.lv < MAXLV) { out.push({ t: a.t, lv: a.lv + 1 }); merges++; i++; } else out.push(a);
      }
      idx.forEach((gi, i) => { const v = out[i] || null; if ((g[gi] && !v) || (!g[gi] && v) || (g[gi] && v && (g[gi].t !== v.t || g[gi].lv !== v.lv))) moved = true; g[gi] = v; });
    }
    return { grid: g, moved, merges };
  }
  const legalSlides = (s) => ['left', 'right', 'up', 'down'].filter((d) => slideGrid(s.grid, d).moved);
  function slide(s, dir) { // 밀기 = 한 턴
    if (s.over) return false;
    const res = slideGrid(s.grid, dir); if (!res.moved) return false;
    s.grid = res.grid; s.turns++; s.events = [];
    if (res.merges) s.events.push({ type: 'merge', n: res.merges });
    const e = s.enemy; e.timer--;
    if (e.timer <= 0) {
      const dmg = Math.max(0, e.atk - s.block);
      s.events.push({ type: 'hit', dmg, blocked: Math.min(e.atk, s.block) });
      s.hp -= dmg; s.block = 0; e.timer = e.cd;
      if (s.hp <= 0) { s.hp = 0; s.over = true; s.events.push({ type: 'dead' }); return true; }
    }
    spawn(s); return true;
  }
  function use(s, i) { // 타일 사용 = 턴 소모 없음
    if (s.over) return false; const tile = s.grid[i]; if (!tile) return false;
    const v = power(tile); s.grid[i] = null; s.events = [];
    if (tile.t === 'S') {
      s.enemy.hp -= v; s.events.push({ type: 'strike', dmg: v });
      if (s.enemy.hp <= 0) { s.events.push({ type: 'kill', kind: s.enemy.kind }); s.room++; s.enemy = makeEnemy(s.room, s.r); }
    } else if (tile.t === 'H') { s.block += v; s.events.push({ type: 'block', v });
    } else if (tile.t === 'P') { const before = s.hp; s.hp = Math.min(s.maxHp, s.hp + v); s.events.push({ type: 'heal', v: s.hp - before });
    } else if (tile.t === 'C') {
      const b0 = Math.floor(s.gold / CFG.goldPerBonus); s.gold += v; const b1 = Math.floor(s.gold / CFG.goldPerBonus);
      s.events.push({ type: 'gold', v });
      if (b1 > b0) { const up = (b1 - b0) * CFG.bonusHp; s.maxHp += up; s.hp += up; s.events.push({ type: 'bonus', v: up }); }
    }
    return true;
  }
  const api = { N, VAL, CFG, power, newGame, slide, use, legalSlides, slideGrid, makeEnemy };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FD = api;
})(typeof window !== 'undefined' ? window : globalThis);
