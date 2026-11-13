// Merge Dungeon — 런 한 판의 상태 머신. phase: 'playing' | 'choose' | 'dead'
window.MD = window.MD || {};
(function () {
  const C = MD.CONFIG, B = MD.board, R = MD.rules;
  const sfx = (n) => { if (MD.audio) MD.audio.play(n); };

  // 시드 난수 (데일리). mulberry32
  function seeded(seed) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function dailyKey() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  function dailySeed() { let h = 2166136261; for (const ch of dailyKey()) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

  function newRun(heroId, daily) {
    const rng = daily ? seeded(dailySeed()) : Math.random;
    const hero = daily ? C.DAILY_HERO : (heroId || (MD.meta && MD.meta.get().hero) || 'knight');
    const H = C.HEROES.find((h) => h.id === hero) || C.HEROES[0];
    const relics = { ...((MD.meta && MD.meta.get().relics) || {}) };
    // 상인: 미보유 유물 하나 대여
    if (hero === 'merchant') {
      const pool = C.RELICS.filter((r) => !relics[r.id]);
      if (pool.length) relics[pool[Math.floor(Math.random() * pool.length)].id] = 'loan';
    }
    const grid = B.emptyGrid(C.BOARD);
    const stats = R.newRunStats();
    stats.hp = stats.maxHp = H.hp;
    if (relics.bigheart) { stats.maxHp += 2; stats.hp += 2; }
    if (relics.startweapon) B.place(grid, B.makeTile('weapon', 2));
    for (let i = 0; i < C.START_TILES; i++) B.spawn(grid, 1, rng, R.spawnMods({}, relics, hero, null));
    // 룬 타일 1개 (런마다 랜덤)
    const rune = C.RUNES[Math.floor(rng() * C.RUNES.length)];
    B.place(grid, B.makeRune(rune.id), rng);
    return {
      phase: 'playing', grid, stats, perks: {}, relics, choices: null, lastSpawn: null, anim: null, toasts: [], fxQueue: [], result: null,
      undoLeft: relics.rewind ? 1 : 0, prev: null, rune, t0: performance.now(),
      hero, route: null, routeUntil: 0, treasureMoves: 0, branches: null, cutscene: null, bossKills: 0,
      rng, daily: !!daily, dailyKey: daily ? dailyKey() : null, altar: null,
      tutorial: MD.meta && !MD.meta.get().seenTutorial,
    };
  }

  function snapshot(run) {
    return { grid: B.clone(run.grid), stats: { ...run.stats } };
  }

  // 되감기: 마지막 슬라이드 취소 (유물 보유 시 런당 1회)
  function undo(run) {
    if (run.phase !== 'playing' || !run.undoLeft || !run.prev) return false;
    run.grid = run.prev.grid; run.stats = run.prev.stats;
    run.prev = null; run.undoLeft -= 1; run.anim = null; run.lastSpawn = null;
    pushToasts(run, [{ kind: 'floor', text: MD.t('t_rewind') }], 0);
    return true;
  }

  function pushToasts(run, msgs, delay) {
    const now = performance.now();
    msgs.forEach((m, i) => run.toasts.push({ ...m, t0: now + delay + i * 120 }));
  }

  // 반환: true면 보드가 바뀜
  function move(run, dir) {
    if (run.tutorial) return false;
    if (run.evolved && performance.now() - run.evolved.t0 < 1500) return false;
    if (run.phase !== 'playing') return false;
    const opts = { hero: run.hero, godslayer: R.effects(run.perks, run.relics, run.hero, run.route).godslayer };
    const s = B.slide(run.grid, dir, opts);
    if (!s.moved) return false;
    // 얼음 해제 (이번 턴 벽 역할을 했으면 다음 턴부터 움직인다)
    s.grid.forEach((row) => row.forEach((t) => { if (t && t.frozen) t.frozen -= 1; }));
    if (run.undoLeft) run.prev = snapshot(run);
    run.grid = s.grid;
    run.stats.moves += 1;
    const now = performance.now();
    const D = C.SLIDE_MS;
    run.anim = { t0: now, dur: D, moves: Object.values(s.moves), merged: new Set(s.merged) };

    const e = R.effects(run.perks, run.relics, run.hero, run.route);
    // 룬 발동 (폭탄: 주변 몬스터 처치 / 거울: 복제 배치)
    s.events.filter((ev) => ev.kind === 'rune').forEach((ev) => {
      run.runesUsed = (run.runesUsed || 0) + 1;
      if (ev.rune === 'bomb') {
        const [r0, c0] = ev.at;
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
          const r = r0 + dr, c = c0 + dc;
          const t = run.grid[r] && run.grid[r][c];
          if (t && (t.type === 'monster' || (t.type === 'boss' && false))) { run.grid[r][c] = null; s.events.push({ kind: 'kill', monsterLv: t.lv, weaponLv: 9, elite: !!t.elite, at: [r, c] }); }
        }
      } else if (ev.rune === 'mirror') {
        const copy = B.makeTile(ev.copy.type, ev.copy.lv, ev.copy.val); if (ev.copy.elite) copy.elite = true;
        const placed = B.place(run.grid, copy);
        if (placed) s.events.push({ kind: 'merge', type: copy.type, lv: copy.lv, val: copy.val, at: [placed.r, placed.c] });
      }
    });
    // 강령술사: 무기와 몬스터가 함께 사라진 자리에서 50% Lv1 무기
    if (e.necro) s.events.filter((ev) => ev.kind === 'kill' && ev.both && ev.at).forEach((ev) => {
      const [r, c] = ev.at;
      if (!run.grid[r][c] && Math.random() < e.necro) { run.grid[r][c] = B.makeTile('weapon', 1); s.events.push({ kind: 'merge', type: 'weapon', lv: 1, at: [r, c] }); }
    });
    let { msgs, floorUp } = R.applyEvents(run.stats, s.events, run.perks, run.relics, null, run.hero, run.route);
    // 보물방: 15턴 지나면 자동 클리어
    if (run.route === 'treasure') {
      run.treasureMoves += 1;
      if (run.treasureMoves >= C.TREASURE_MOVES && !floorUp) { floorUp = true; run.stats.kills = 0; run.stats.floor += 1; msgs.push({ kind: 'floor', text: MD.t('t_floor', run.stats.floor) }); }
    }
    // 위치 있는 이펙트/효과음은 슬라이드가 끝난 뒤 (D ms) 터뜨린다. render가 run.fxQueue를 소비.
    // 보스가 보드에 있으면 매 이동마다 HP 감소 (결계: 확률로 무시)
    if (run.stats.bossAlive && !floorUp) {
      if (e.ward && Math.random() < e.ward) msgs.push({ kind: 'heal', text: MD.t('t_ward') });
      else { run.stats.hp = Math.max(0, run.stats.hp - C.BOSS_TICK); run.stats.damageTaken = (run.stats.damageTaken || 0) + C.BOSS_TICK; msgs.push({ kind: 'damage', text: MD.t('t_bossTick', C.BOSS_TICK) }); }
    }
    if (e.purify && s.events.some((ev) => ev.kind === 'heal')) {
      const ms = B.findTiles(run.grid, (t) => t.type === 'monster').sort((a, b) => a.tile.lv - b.tile.lv);
      if (ms.length) { run.grid[ms[0].r][ms[0].c] = null; msgs.push({ kind: 'heal', text: MD.t('t_purify'), at: [ms[0].r, ms[0].c] }); s.events.push({ kind: 'kill', monsterLv: ms[0].tile.lv, at: [ms[0].r, ms[0].c], silent: true }); }
    }
    run.fxQueue.push({ t0: now + D * 0.9, events: s.events, msgs });
    pushToasts(run, msgs.filter((m) => !m.at), D);

    const mods = R.spawnMods(run.perks, run.relics, run.hero, run.route);
    mods.family = run.route === 'treasure' ? null : R.familyFor(run.stats.floor);
    run.lastSpawn = B.spawn(run.grid, run.stats.floor, run.rng, mods);
    monsterTurn(run, s);
    if (run.lastSpawn) run.lastSpawn.t0 = now + D;

    if (run.stats.hp <= 0) { endRun(run, 'hp'); return true; }
    if (s.events.some((ev) => ev.kind === 'bosskill')) { run.bossKills += 1; run.bossTypes = (run.bossTypes || []).concat(run.bossGimmick || []); }
    if (MD.ach) MD.ach.check(run);
    if (floorUp) { setTimeout(() => sfx('floor'), D); pushToasts(run, [{ kind: 'theme', text: MD.L(C.themeFor(run.stats.floor).name) }], D + 150); onFloorUp(run); return true; }
    if (!B.canMove(run.grid, { hero: run.hero }) && !mercy(run)) endRun(run, 'full');
    return true;
  }

  // 몬스터 턴: 슬라이드·스폰 뒤. 가족 버릇 + 보스 기믹.
  function monsterTurn(run, s) {
    const g = run.grid, mv = run.stats.moves;
    const empties = () => B.emptyCells(g);
    const push = (ev) => s.events.push(ev);
    // 얼음정령: 자기를 벤 무기를 얼린다 (처치한 자리의 무기)
    s.events.filter((ev) => ev.kind === 'kill' && ev.fam === 'wisp' && ev.at).forEach((ev) => {
      const t = g[ev.at[0]][ev.at[1]]; if (t && t.type === 'weapon') { t.frozen = 2; push({ kind: 'freeze', at: ev.at }); }
    });
    // 버섯: 쓰러진 자리 옆에 포자
    s.events.filter((ev) => ev.kind === 'kill' && ev.fam === 'shroom' && ev.at).forEach((ev) => {
      const [r0, c0] = ev.at; const cand = [[r0 - 1, c0], [r0 + 1, c0], [r0, c0 - 1], [r0, c0 + 1]].filter(([r, c]) => g[r] && g[r][c] === null);
      if (cand.length) { const [r, c] = cand[Math.floor(run.rng() * cand.length)]; const sp = B.makeTile('monster', 1); sp.fam = 'shroom'; g[r][c] = sp; push({ kind: 'merge', type: 'monster', lv: 1, at: [r, c] }); }
    });
    // 박쥐: 2턴마다 인접 빈 칸으로 / 그림자: 2턴마다 +1Lv
    if (mv % 2 === 0) {
      const bats = B.findTiles(g, (t) => t.type === 'monster' && t.fam === 'bat');
      bats.forEach(({ r, c, tile }) => {
        const cand = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].filter(([rr, cc]) => g[rr] && g[rr][cc] === null);
        if (cand.length) { const [rr, cc] = cand[Math.floor(run.rng() * cand.length)]; g[rr][cc] = tile; g[r][c] = null; run.hops = run.hops || []; run.hops.push({ id: tile.id, from: [r, c], to: [rr, cc], t0: performance.now() + C.SLIDE_MS }); }
      });
      B.findTiles(g, (t) => t.type === 'monster' && t.fam === 'shade').forEach(({ r, c, tile }) => { if (tile.lv < C.MAX_LV) { tile.lv += 1; push({ kind: 'grow', at: [r, c] }); } });
    }
    // 보스 기믹
    const bossT = B.findTiles(g, (t) => t.type === 'boss')[0];
    if (bossT && run.stats.bossAlive) {
      const gk = bossT.tile.gimmick, since = mv - (run.bossSince || 0);
      if (gk === 'summon' && since % 3 === 0) { const e = empties(); if (e.length) { const [r, c] = e[Math.floor(run.rng() * e.length)]; const m = B.makeTile('monster', 1); m.fam = 'slime'; g[r][c] = m; push({ kind: 'merge', type: 'monster', lv: 1, at: [r, c] }); } }
      if (gk === 'freeze') { const ws = B.findTiles(g, (t) => t.type === 'weapon' && !t.frozen); if (ws.length) { const w = ws[Math.floor(run.rng() * ws.length)]; w.tile.frozen = 2; push({ kind: 'freeze', at: [w.r, w.c] }); } }
      if (gk === 'fire' && since % 2 === 0) { const ts = B.findTiles(g, (t) => t.type !== 'boss' && t.type !== 'rune'); if (ts.length) { const x = ts[Math.floor(run.rng() * ts.length)]; push({ kind: 'scorch', at: [x.r, x.c] }); if (x.tile.type === 'weapon' || x.tile.type === 'monster') { if (x.tile.lv <= 1) g[x.r][x.c] = null; else x.tile.lv -= 1; } else g[x.r][x.c] = null; } }
      if (gk === 'devour' && since > 0 && since % 4 === 0) { const ts = B.findTiles(g, (t) => t.type !== 'boss' && t.type !== 'rune').sort((a, b) => a.tile.lv - b.tile.lv || (a.tile.val || 0) - (b.tile.val || 0)); if (ts.length) { g[ts[0].r][ts[0].c] = null; push({ kind: 'devour', at: [ts[0].r, ts[0].c] }); } }
    }
  }

  // 자비: 보드가 가득 찼을 때 가장 약한 타일 n개 제거 (레벨당 1회)
  function mercy(run) {
    const e = R.effects(run.perks, run.relics);
    const all = B.findTiles(run.grid, (t) => t.type !== 'boss').sort((a, b) => a.tile.lv - b.tile.lv || a.tile.val - b.tile.val);
    if (e.bastion) {
      // 요새: 무제한. 약한 타일 2개 → 그 자리 하나에 Lv3 무기
      if (all.length < 2) return false;
      const [p, q] = all;
      run.grid[q.r][q.c] = null; run.grid[p.r][p.c] = B.makeTile('weapon', 3);
      pushToasts(run, [{ kind: 'floor', text: MD.t('t_bastion') }], C.SLIDE_MS);
      return B.canMove(run.grid, { hero: run.hero });
    }
    if (run.stats.mercyUsed >= e.mercyUses) return false;
    run.stats.mercyUsed += 1;
    all.slice(0, e.mercyRemove).forEach((x) => { run.grid[x.r][x.c] = null; });
    pushToasts(run, [{ kind: 'floor', text: MD.t('t_mercy') }], C.SLIDE_MS);
    return B.canMove(run.grid, { hero: run.hero });
  }

  function onFloorUp(run) {
    // 구간 만료
    if (run.route && run.stats.floor >= run.routeUntil) { run.route = null; run.treasureMoves = 0; }
    if (run.route === 'treasure' && run.treasureMoves > 0) { run.route = null; run.treasureMoves = 0; }
    const e = R.effects(run.perks, run.relics, run.hero, run.route);
    // 정리정돈: 가장 약한 몬스터 n마리 제거
    if (e.tidy) {
      const ms = B.findTiles(run.grid, (t) => t.type === 'monster').sort((a, b) => a.tile.lv - b.tile.lv);
      ms.slice(0, e.tidy).forEach((x) => { run.grid[x.r][x.c] = null; });
    }
    // 무기고: 층 클리어 시 무기 등장
    if (e.armoryLv) B.place(run.grid, B.makeTile('weapon', e.armoryLv));
    // 보스 층 진입: 보스 등장
    if (R.isBossFloor(run.stats.floor)) {
      const boss = B.makeTile('boss', C.bossLv(run.stats.floor));
      boss.gimmick = C.BOSS_GIMMICK[(Math.floor(run.stats.floor / 5) - 1) % C.BOSS_GIMMICK.length]; run.bossGimmick = boss.gimmick; boss.hits = C.IDOL_HITS; run.bossSince = run.stats.moves;
      if (!B.place(run.grid, boss)) {
        // 빈 칸이 없으면 가장 약한 타일 자리를 비워 등장
        const all = B.findTiles(run.grid, () => true).sort((a, b) => a.tile.lv - b.tile.lv);
        run.grid[all[0].r][all[0].c] = boss;
      }
      run.stats.bossAlive = true;
      if (boss.gimmick === 'spores') for (let i = 0; i < 2; i++) { const sp = B.makeTile('monster', 1); sp.fam = 'shroom'; B.place(run.grid, sp, run.rng); }
      run.cutscene = { t0: performance.now() + C.SLIDE_MS + 200, name: C.bossName(run.stats.floor), lv: boss.lv, gimmick: boss.gimmick };
      setTimeout(() => sfx('boss'), C.SLIDE_MS + 400);
    }
    run.phase = 'choose';
    run.choices = R.rollChoices(run.perks, run.rng);
    if (!run.choices.length) { run.phase = 'playing'; afterChoose(run); } // 모든 퍽이 최대 레벨
  }

  // 퍽 선택 뒤: 분기 층이면 갈림길
  function afterChoose(run) {
    if (R.isAltarFloor(run.stats.floor) && !run.altarSeen) {
      run.altarSeen = run.stats.floor; run.phase = 'altar'; run.altar = C.ALTAR.slice(); return;
    }
    if (R.isBranchFloor(run.stats.floor) && !run.route) {
      run.phase = 'branch';
      run.branches = C.BRANCHES.slice();
    }
  }
  function chooseAltar(run, i) {
    if (run.phase !== 'altar' || !run.altar || !run.altar[i]) return false;
    const o = run.altar[i];
    if (o.id === 'blood') {
      if (run.stats.hp <= o.cost.hp) return false;
      const ids = Object.keys(run.perks).filter((id) => !R.isEvolved(id) && run.perks[id] < C.PERK_MAX);
      if (!ids.length) return false;
      run.stats.hp -= o.cost.hp; run.altarPending = true;
      const id = ids[Math.floor(Math.random() * ids.length)];
      run.perks[id] += 1; R.applyPerkInstant(run.stats, id);
      pushToasts(run, [{ kind: 'damage', text: `-${o.cost.hp} HP` }, { kind: 'floor', text: MD.t('t_perk', MD.L(R.perkDef(id).name), run.perks[id]) }], 0);
      const ev = R.tryEvolve(run.perks);
      if (ev) { R.applyPerkInstant(run.stats, ev.id); run.evolved = { ev, t0: performance.now() }; run.evoCount = (run.evoCount || 0) + 1; if (MD.meta) { const m = MD.meta.get(); m.codex[ev.id] = 1; MD.meta.persist(); } setTimeout(() => sfx('evolve'), 50); }
    } else if (o.id === 'gold') {
      const have = (MD.meta ? MD.meta.get().coins : 0) + run.stats.coins;
      if (have < o.cost.coins) return false;
      // 런 코인부터, 모자라면 지갑에서
      let c = o.cost.coins; const fromRun = Math.min(c, run.stats.coins); run.stats.coins -= fromRun; c -= fromRun;
      if (c > 0 && MD.meta) { MD.meta.get().coins -= c; MD.meta.persist(); }
      run.undoLeft += 1; run.altarPending = true;
      pushToasts(run, [{ kind: 'floor', text: MD.t('t_rewind') + ' +1' }], 0);
    }
    if (run.altarPending) { run.altarOffers = (run.altarOffers || 0) + 1; run.altarPending = false; }
    run.altar = null; run.phase = 'playing';
    sfx(o.id === 'refuse' ? 'tap' : 'pick');
    if (MD.ach) MD.ach.check(run);
    afterChoose(run);
    return true;
  }
  function chooseBranch(run, i) {
    if (run.phase !== 'branch' || !run.branches || !run.branches[i]) return false;
    const b = run.branches[i];
    run.branches = null; run.phase = 'playing';
    if (b.id === 'risky') { run.route = 'risky'; run.routeUntil = run.stats.floor + 3; run.riskyTaken = (run.riskyTaken || 0) + 1; }
    else if (b.id === 'treasure') { run.route = 'treasure'; run.routeUntil = run.stats.floor + 1; run.treasureMoves = 0; run.treasureTaken = (run.treasureTaken || 0) + 1; }
    if (MD.ach) MD.ach.check(run);
    pushToasts(run, [{ kind: 'floor', text: MD.L(b.name) }], 0);
    sfx('pick');
    return true;
  }

  function choose(run, i) {
    if (run.phase !== 'choose' || !run.choices || !run.choices[i]) return false;
    const p = run.choices[i];
    run.perks[p.id] = (run.perks[p.id] || 0) + 1;
    R.applyPerkInstant(run.stats, p.id);
    run.choices = null;
    run.phase = 'playing';
    afterChoose(run);
    const ev = R.tryEvolve(run.perks);
    if (ev) {
      R.applyPerkInstant(run.stats, ev.id);
      run.evolved = { ev, t0: performance.now() }; run.evoCount = (run.evoCount || 0) + 1;
      if (MD.meta) { const m = MD.meta.get(); m.codex = m.codex || {}; m.codex[ev.id] = 1; MD.meta.persist(); }
      setTimeout(() => sfx('evolve'), 50);
    } else {
      pushToasts(run, [{ kind: 'floor', text: MD.t('t_perk', MD.L(p.name), run.perks[p.id]) }], 0);
      sfx('pick');
    }
    if (MD.ach) MD.ach.check(run);
    if (!B.canMove(run.grid)) endRun(run, 'full');
    return true;
  }

  function endRun(run, reason) {
    run.phase = 'dead';
    setTimeout(() => sfx('dead'), C.SLIDE_MS);
    const e = R.effects(run.perks, run.relics);
    const coins = Math.round((run.stats.coins + R.coinsOnBoard(run.grid)) * (1 + e.miser));
    const prevBest = MD.meta ? MD.meta.get().bestFloor : 0;
    run.result = { reason, floor: run.stats.floor, kills: run.stats.totalKills, coins, moves: run.stats.moves, newBest: run.stats.floor > prevBest, bestCombo: run.stats.bestCombo, prevBest, t0: performance.now(), hero: run.hero, potionsUsed: run.stats.potionsUsed || 0, bossKills: run.bossKills, mimics: run.stats.mimics || 0 };
    if (MD.ach) MD.ach.check(run);
    if (run.daily) run.result.daily = run.dailyKey;
    MD.meta && MD.meta.onRunEnd(run.result);
    if (MD.ach) { const late = MD.ach.check(null); run.feats = (run.feats || []).concat(late.map((a) => a.id)); }
  }

  function dismissTutorial(run) {
    run.tutorial = false;
    if (MD.meta) { MD.meta.get().seenTutorial = true; MD.meta.persist(); }
  }

  MD.run = { newRun, move, choose, chooseBranch, chooseAltar, undo, endRun, dismissTutorial, dailyKey };
})();
