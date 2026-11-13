// Merge Dungeon — 보드 로직. DOM/Canvas를 전혀 모르는 순수 함수만.
// grid: N×N 배열, 셀은 null 또는 { type, lv, val, id }
//   type: 'weapon' | 'monster' | 'potion' | 'bigpotion' | 'coin'
window.MD = window.MD || {};
(function () {
  const C = MD.CONFIG;
  let nextId = 1;

  function emptyGrid(n) {
    return Array.from({ length: n }, () => Array(n).fill(null));
  }
  function clone(grid) {
    return grid.map((row) => row.map((c) => (c ? { ...c } : null)));
  }
  function makeTile(type, lv, val) {
    return { type, lv: lv || 1, val: val || 0, id: nextId++ };
  }
  function emptyCells(grid) {
    const out = [];
    grid.forEach((row, r) => row.forEach((c, col) => { if (!c) out.push([r, col]); }));
    return out;
  }

  // 두 타일이 만났을 때의 결과. null = 합쳐지지 않음(막힘).
  // 반환: { result: tile|null, events: [...] }
  function combine(a, b, opts) {
    opts = opts || {};
    const hero = opts.hero || 'knight';
    const ev = [];
    // 룬: 다른 타일이 밀려 들어오면 발동. 룬끼리는 막힘.
    const rune = a.type === 'rune' ? a : b.type === 'rune' ? b : null;
    if (rune) {
      const other = rune === a ? b : a;
      if (other.type === 'rune') return null;
      if (rune.rune === 'bomb') { ev.push({ kind: 'rune', rune: 'bomb' }); return { result: { ...other }, events: ev }; }
      if (rune.rune === 'mirror') { ev.push({ kind: 'rune', rune: 'mirror', copy: { type: other.type, lv: other.lv, val: other.val, elite: other.elite } }); return { result: { ...other }, events: ev }; }
      if (rune.rune === 'anvil') {
        if (other.type !== 'weapon') return null;
        ev.push({ kind: 'rune', rune: 'anvil' });
        return { result: makeTile('weapon', Math.min(C.MAX_LV, other.lv + 1)), events: ev };
      }
      return null;
    }
    if (a.type === b.type) {
      if ((a.type === 'weapon' || a.type === 'monster') && a.lv === b.lv) {
        const lv = Math.min(C.MAX_LV, a.lv + 1);
        ev.push({ kind: 'merge', type: a.type, lv });
        const r = makeTile(a.type, lv); if (a.type === 'monster' && a.fam && a.fam === b.fam) r.fam = a.fam;
        return { result: r, events: ev };
      }
      if (a.type === 'potion') {
        if (hero === 'alchemist') { ev.push({ kind: 'merge', type: 'bigpotion', lv: 1 }); return { result: makeTile('bigpotion', 1), events: ev }; }
        // 포션 둘이 만나면 즉시 회복하고 사라진다
        ev.push({ kind: 'heal', amount: C.POTION_HEAL });
        return { result: null, events: ev };
      }
      if (a.type === 'bigpotion') { ev.push({ kind: 'heal', amount: 7 }); return { result: null, events: ev }; }
      if (a.type === 'coin') {
        const mim = a.mimic ? a : b.mimic ? b : null;
        if (mim) { ev.push({ kind: 'mimic', lv: mim.mlv }); const m = makeTile('monster', mim.mlv); m.fam = 'mimic'; return { result: m, events: ev }; }
        const val = a.val + b.val;
        if (val >= (a.bank == null ? C.COIN_BANK : a.bank)) {
          // 충분히 모이면 지갑으로 — 보드를 비워 준다
          ev.push({ kind: 'bank', val });
          return { result: null, events: ev };
        }
        ev.push({ kind: 'merge', type: 'coin', lv: 1, val });
        return { result: makeTile('coin', 1, val), events: ev };
      }
      return null;
    }
    if ((a.type === 'bigpotion' && b.type === 'potion') || (a.type === 'potion' && b.type === 'bigpotion')) {
      ev.push({ kind: 'heal', amount: 7 }); return { result: null, events: ev };
    }
    // 황금 우상: 무기 무효, 코인으로만
    const idol = a.type === 'boss' && a.gimmick === 'idol' ? a : b.type === 'boss' && b.gimmick === 'idol' ? b : null;
    if (idol) {
      const other = idol === a ? b : a;
      if (other.type === 'coin') {
        const hits = (idol.hits || C.IDOL_HITS) - 1;
        if (hits <= 0) { ev.push({ kind: 'bosskill', monsterLv: idol.lv, weaponLv: 0 }); return { result: null, events: ev }; }
        ev.push({ kind: 'damage', amount: 0, monsterLv: idol.lv, weaponLv: 0, wound: true });
        const k = makeTile('boss', idol.lv); k.gimmick = 'idol'; k.hits = hits; return { result: k, events: ev };
      }
      if (other.type === 'weapon') { ev.push({ kind: 'blocked' }); return null; }
      return null;
    }
    // 무기 vs 몬스터/보스 (보스는 같은 보스끼리도 합쳐지지 않는다)
    const w = a.type === 'weapon' ? a : b.type === 'weapon' ? b : null;
    const m = (a.type === 'monster' || a.type === 'boss') ? a : (b.type === 'monster' || b.type === 'boss') ? b : null;
    if (w && m) {
      const boss = m.type === 'boss';
      if (opts.godslayer && boss && !m.wounded) { ev.push({ kind: 'damage', amount: 0, monsterLv: m.lv, weaponLv: w.lv, wound: true }); const k = makeTile('boss', m.lv); k.wounded = true; return { result: k, events: ev }; }
      if (w.lv >= m.lv || opts.godslayer) {
        ev.push({ kind: boss ? 'bosskill' : 'kill', monsterLv: m.lv, weaponLv: w.lv, elite: !!m.elite, fam: m.fam || 'slime' });
        if (w.lv === m.lv) {
          if (hero === 'rogue' && !boss) return { result: makeTile('weapon', w.lv), events: ev };
          ev[ev.length - 1].both = true;
          return { result: null, events: ev };
        }
        return { result: makeTile('weapon', w.lv), events: ev };
      }
      ev.push({ kind: 'damage', amount: m.lv - w.lv, monsterLv: m.lv, weaponLv: w.lv });
      const keep = makeTile(m.type, m.lv); if (m.elite) keep.elite = true; if (m.fam) keep.fam = m.fam; if (m.gimmick) { keep.gimmick = m.gimmick; keep.hits = m.hits; }
      return { result: keep, events: ev };
    }
    return null;
  }

  // 한 줄(배열)을 왼쪽으로 압축+합치기. 반환 { line, moved, events }
  function slideLine(line, opts) {
    const n = line.length;
    // 얼어붙은 타일은 벽: 그 사이 구간별로 따로 민다
    if (line.some((t) => t && t.frozen)) {
      const out = Array(n).fill(null), dests = {}, merged = [], events = [];
      let seg = [], start = 0, moved = false;
      const flush = (s0, s1) => {
        const r = slideLine(line.slice(s0, s1).map((t) => (t && t.frozen ? null : t)), opts);
        r.line.forEach((t, k) => { out[s0 + k] = t; });
        Object.keys(r.dests).forEach((id) => { dests[id] = r.dests[id] + s0; });
        r.events.forEach((ev) => { ev.idx += s0; });
        events.push(...r.events); merged.push(...r.merged); if (r.moved) moved = true;
      };
      for (let k = 0; k <= n; k++) {
        if (k === n || (line[k] && line[k].frozen)) { if (k > start) flush(start, k); if (k < n) { out[k] = line[k]; dests[line[k].id] = k; } start = k + 1; }
      }
      return { line: out, moved, events, dests, merged };
    }
    const tiles = line.filter(Boolean);
    const out = [];
    const events = [];
    const dests = {};   // 입력 타일 id → 도착 인덱스 (애니메이션용)
    const merged = [];  // 합쳐져서 새로 생긴 타일 id
    let i = 0;
    while (i < tiles.length) {
      const a = tiles[i];
      const b = tiles[i + 1];
      if (b) {
        const c = combine(a, b, opts);
        if (c) {
          dests[a.id] = out.length; dests[b.id] = out.length;
          c.events.forEach((ev) => { ev.idx = out.length; if (ev.kind === 'rune') ev.idx = line.indexOf(a.type === 'rune' ? a : b); });   // 이벤트 위치 (룬은 룬이 있던 칸)
          if (c.result) { out.push(c.result); merged.push(c.result.id); }
          events.push(...c.events);
          i += 2;
          continue;
        }
      }
      dests[a.id] = out.length;
      out.push(a);
      i += 1;
    }
    while (out.length < n) out.push(null);
    let moved = false;
    for (let k = 0; k < n; k++) {
      const x = line[k], y = out[k];
      if ((x && !y) || (!x && y) || (x && y && x.id !== y.id)) { moved = true; break; }
    }
    return { line: out, moved, events, dests, merged };
  }

  // dir: 'left' | 'right' | 'up' | 'down'
  function slide(grid, dir, opts) {
    const n = grid.length;
    const g = clone(grid);
    let moved = false;
    const events = [];
    const moves = {};   // id → { from:[r,c], to:[r,c] }
    const merged = [];
    // 라인 인덱스 k → 보드 좌표
    const rc = (i, k) => {
      if (dir === 'left') return [i, k];
      if (dir === 'right') return [i, n - 1 - k];
      if (dir === 'up') return [k, i];
      return [n - 1 - k, i];
    };
    const getLine = (i) => {
      const out = [];
      for (let k = 0; k < n; k++) {
        if (dir === 'left') out.push(g[i][k]);
        else if (dir === 'right') out.push(g[i][n - 1 - k]);
        else if (dir === 'up') out.push(g[k][i]);
        else out.push(g[n - 1 - k][i]);
      }
      return out;
    };
    const setLine = (i, line) => {
      for (let k = 0; k < n; k++) {
        if (dir === 'left') g[i][k] = line[k];
        else if (dir === 'right') g[i][n - 1 - k] = line[k];
        else if (dir === 'up') g[k][i] = line[k];
        else g[n - 1 - k][i] = line[k];
      }
    };
    for (let i = 0; i < n; i++) {
      const line = getLine(i);
      const r = slideLine(line, opts);
      if (r.moved) moved = true;
      r.events.forEach((ev) => { ev.at = rc(i, ev.idx); });
      events.push(...r.events);
      merged.push(...r.merged);
      line.forEach((t, k) => {
        if (t) moves[t.id] = { tile: t, from: rc(i, k), to: rc(i, r.dests[t.id]) };
      });
      setLine(i, r.line);
    }
    return { grid: g, moved, events, moves, merged };
  }

  function canMove(grid, opts) {
    return ['left', 'right', 'up', 'down'].some((d) => slide(grid, d, opts).moved);
  }

  // 가중치 랜덤으로 새 타일 생성. floor에 따라 몬스터 최소 레벨 상승.
  // mods: { weapon, monster, potion, coin (가중치 가산), coinMul }
  function randomTile(floor, rng, mods) {
    rng = rng || Math.random;
    mods = mods || {};
    const w = {
      weapon: Math.max(0, C.SPAWN.weapon + (mods.weapon || 0)), monster: Math.max(0, C.SPAWN.monster + (mods.monster || 0)),
      potion: Math.max(0, C.SPAWN.potion + (mods.potion || 0)), coin: Math.max(0, C.SPAWN.coin + (mods.coin || 0)),
    };
    const total = w.weapon + w.monster + w.potion + w.coin;
    let x = rng() * total;
    let type;
    if ((x -= w.weapon) < 0) type = 'weapon';
    else if ((x -= w.monster) < 0) type = 'monster';
    else if ((x -= w.potion) < 0) type = 'potion';
    else type = 'coin';
    if (type === 'weapon') {
      let lv = rng() < (mods.weaponLv2 == null ? 0.2 : mods.weaponLv2) ? 2 : 1;
      lv = Math.max(lv, mods.weaponMinLv || 1);
      if (mods.weaponLv3 && rng() < mods.weaponLv3) lv = 3;
      return makeTile('weapon', lv);
    }
    if (type === 'monster') {
      const min = Math.min(C.MAX_LV, C.monsterMinLv(floor) + (mods.monsterLv || 0));
      const m = makeTile('monster', rng() < 0.25 ? Math.min(C.MAX_LV, min + 1) : min);
      if (floor >= C.ELITE_FROM && rng() < C.ELITE_CHANCE) { m.elite = true; m.lv = Math.min(C.MAX_LV, m.lv + 1); }
      // 가족: 테마층이면 FAMILY_CHANCE
      const fam = mods.family;
      if (fam && fam !== 'slime' && rng() < C.FAMILY_CHANCE) {
        if (fam === 'mimic') { const c = makeTile('coin', 1, C.COIN_BASE * (mods.coinMul || 1)); c.mimic = true; c.mlv = m.lv; if (mods.coinBank != null) c.bank = mods.coinBank; return c; }
        m.fam = fam;
        if (fam === 'imp') m.lv = Math.min(C.MAX_LV, m.lv + 1);
      } else m.fam = 'slime';
      return m;
    }
    if (type === 'potion') return makeTile('potion', 1);
    const coin = makeTile('coin', 1, C.COIN_BASE * (mods.coinMul || 1));
    if (mods.coinBank != null) coin.bank = mods.coinBank;
    return coin;
  }

  function spawn(grid, floor, rng, mods) {
    rng = rng || Math.random;
    const cells = emptyCells(grid);
    if (!cells.length) return null;
    const [r, c] = cells[Math.floor(rng() * cells.length)];
    const t = randomTile(floor, rng, mods);
    grid[r][c] = t;
    return { r, c, tile: t };
  }

  // 특정 타일을 빈 칸에 놓는다 (보스 등장용)
  function place(grid, tile, rng) {
    rng = rng || Math.random;
    const cells = emptyCells(grid);
    if (!cells.length) return null;
    const [r, c] = cells[Math.floor(rng() * cells.length)];
    grid[r][c] = tile;
    return { r, c, tile };
  }

  function makeRune(id) { const t = makeTile('rune', 1); t.rune = id; return t; }

  function findTiles(grid, pred) {
    const out = [];
    grid.forEach((row, r) => row.forEach((t, c) => { if (t && pred(t)) out.push({ r, c, tile: t }); }));
    return out;
  }

  MD.board = { emptyGrid, clone, makeTile, makeRune, emptyCells, combine, slideLine, slide, canMove, randomTile, spawn, place, findTiles };
})();
