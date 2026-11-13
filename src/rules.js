// Merge Dungeon — 런 규칙: HP, 층 진행, 퍽 효과. 순수 함수.
window.MD = window.MD || {};
(function () {
  const C = MD.CONFIG;

  function newRunStats() {
    return { hp: C.START_HP, maxHp: C.START_HP, floor: 1, kills: 0, totalKills: 0, coins: 0, moves: 0, bossAlive: false, mercyUsed: 0, combo: 0, bestCombo: 0 };
  }

  function isBossFloor(floor) { return floor % C.BOSS_EVERY === 0; }

  // perks: { sharp: n, hide: n, ... } (레벨)
  function perkCount(perks, id) { return (perks && perks[id]) || 0; }

  // 퍽 레벨 → 실제 수치. 다른 파일은 이 결과만 읽는다.
  function effects(perks, relics, hero, route) {
    relics = relics || {}; hero = hero || 'knight'; route = route || null;
    const L = (id) => perkCount(perks, id);
    const E = (id) => !!(perks && perks[id]);   // 진화 퍽 보유 여부
    const e = {
      weaponW: 8 * L('sharp') + (relics.sharpener ? 5 : 0) + (E('masterwork') ? 20 : 0) + (hero === 'alchemist' ? -10 : 0) + (route === 'treasure' ? -20 : 0),
      monsterW: 10 * L('greed') + (route === 'treasure' ? -100 : 0),
      potionW: (hero === 'necromancer' ? -100 : 0) + (route === 'treasure' ? 25 : 0),
      coinW: (hero === 'necromancer' ? 15 : 0) + (route === 'treasure' ? 25 : 0),
      monsterLv: route === 'risky' ? 1 : 0,
      coinMul: (1 + L('greed')) * (relics.luckypouch ? 2 : 1) * (E('midas') ? 3 : 1) * (route === 'risky' ? 2 : 1),
      coinBank: E('midas') ? 0 : hero === 'merchant' ? 2 : C.COIN_BANK,         // 0 = 즉시 적립
      necro: hero === 'necromancer' ? 0.5 : 0,
      weaponLv2: L('forge') ? 0.2 + 0.15 * L('forge') : 0.2,
      weaponMinLv: E('masterwork') ? 2 : 1, weaponLv3: E('masterwork') ? 0.3 : 0,
      dmgReduce: L('hide') + (E('sanctuary') ? 2 : 0),
      dmgCap: E('ironbody') ? 1 : 99,
      healBonus: 2 * L('alchemist') + (E('purifier') ? 5 : 0),
      purify: E('purifier'),
      vampire: E('reaper') ? 1 : ([0, 0.3, 0.6, 1][L('vampire')] || 0),
      hunter: E('reaper') ? 1 : 0.25 * L('hunter'),
      tidy: L('tidy'),
      armoryLv: L('armory') ? 1 + L('armory') : 0,
      mercyUses: L('mercy'), mercyRemove: L('mercy') ? 1 + L('mercy') : 0,
      bastion: E('bastion'),
      ward: E('sanctuary') ? 1 : ([0, 0.33, 0.66, 1][L('ward')] || 0),
      miser: 0.2 * L('miser') + (E('midas') ? 0.6 : 0),
      hpBonus: E('ironbody') ? 8 : 0,
      godslayer: E('godslayer'), immortal: E('immortal'),
    };
    return e;
  }

  // 진화 체크: perks 에서 두 재료가 모두 Lv2 이상이면 진화. 반환: 진화 정의 또는 null (perks 를 직접 수정)
  function tryEvolve(perks) {
    for (const ev of C.EVOLVE.concat(C.HIDDEN_EVOLVE)) {
      if (perks[ev.id]) continue;
      const [a, b] = ev.from;
      if (perkCount(perks, a) >= 2 && perkCount(perks, b) >= 2) {
        delete perks[a]; delete perks[b];
        perks[ev.id] = C.PERK_MAX;
        return ev;
      }
    }
    return null;
  }
  // 이 퍽을 한 번 더 고르면 진화가 완성되는가
  function wouldEvolve(perks, id) {
    const after = { ...perks, [id]: perkCount(perks, id) + 1 };
    return C.EVOLVE.find((ev) => !perks[ev.id] && ev.from.includes(id) && perkCount(after, ev.from[0]) >= 2 && perkCount(after, ev.from[1]) >= 2) || null;
  }
  function familyFor(floor) { if (floor == null) return null; const th = C.themeFor(floor).id; const f = Object.keys(C.FAMILIES).find((k) => C.FAMILIES[k].theme === th); return f || 'slime'; }
  function isAltarFloor(floor) { return floor % C.BOSS_EVERY === C.BOSS_EVERY - 1; }
  function isBranchFloor(floor) { return floor > 1 && (floor - 1) % C.BRANCH_EVERY === 0 && !isBossFloor(floor); }
  // 퍽 정의 찾기 (일반 또는 진화)
  function perkDef(id) { return C.PERKS.find((p) => p.id === id) || C.EVOLVE.find((p) => p.id === id) || C.HIDDEN_EVOLVE.find((p) => p.id === id); }
  function isEvolved(id) { return !!C.EVOLVE.find((p) => p.id === id) || !!C.HIDDEN_EVOLVE.find((p) => p.id === id); }

  // board.randomTile 에 넘기는 mods
  function spawnMods(perks, relics, hero, route) {
    const e = effects(perks, relics, hero, route);
    return { weapon: e.weaponW, monster: e.monsterW, potion: e.potionW, coin: e.coinW, monsterLv: e.monsterLv, coinMul: e.coinMul, coinBank: e.coinBank, weaponLv2: e.weaponLv2, weaponMinLv: e.weaponMinLv, weaponLv3: e.weaponLv3, family: e.family };
  }

  // 슬라이드 이벤트를 스탯에 적용. 반환 { msgs, floorUp }
  function applyEvents(stats, events, perks, relics, rng, hero, route) {
    rng = rng || Math.random;
    const e = effects(perks, relics, hero, route);
    const msgs = [];
    let floorUp = false;
    let slays = 0;
    for (const ev of events) {
      if (ev.kind === 'kill') {
        slays++;
        if (ev.fam === 'imp') { stats.coins += 2; msgs.push({ kind: 'coin', text: '+2', at: ev.at }); }
        if (MD.meta && MD.meta.recordKill) { const n = MD.meta.recordKill(ev.fam || 'slime', ev.monsterLv); if (n > 10) { stats.coins += 1; } }
        if (ev.elite) { stats.elites = (stats.elites || 0) + 1; stats.coins += C.ELITE_COINS; msgs.push({ kind: 'coin', text: `+${C.ELITE_COINS}`, at: ev.at }); }
        let n = 1;
        if (e.hunter && rng() < e.hunter) { n = 2; msgs.push({ kind: 'kill', text: MD.t('t_hunter') }); }
        stats.kills += n; stats.totalKills += 1;
        msgs.push({ kind: 'kill', text: MD.t('t_slain', ev.monsterLv), at: ev.at });
        if (e.vampire && rng() < e.vampire && stats.hp < stats.maxHp) { stats.hp += 1; msgs.push({ kind: 'heal', text: MD.t('t_leech') }); }
      } else if (ev.kind === 'bosskill') {
        slays++;
        stats.totalKills += 1; stats.bossAlive = false;
        msgs.push({ kind: 'boss', text: MD.t('t_bossSlain') });
        floorUp = true;
      } else if (ev.kind === 'damage') {
        const amt = Math.min(e.dmgCap, Math.max(0, ev.amount - e.dmgReduce));
        stats.hp = Math.max(0, stats.hp - amt);
        stats.damageTaken = (stats.damageTaken || 0) + amt;
        if (e.immortal && stats.hp <= 0 && !stats.immortalUsed) { stats.hp = 1; stats.immortalUsed = true; msgs.push({ kind: 'heal', text: MD.t('t_immortal') }); }
        msgs.push({ kind: 'damage', text: amt > 0 ? `-${amt}` : MD.t('t_blocked'), at: ev.at });
      } else if (ev.kind === 'mimic') {
        stats.mimics = (stats.mimics || 0) + 1;
        msgs.push({ kind: 'damage', text: MD.t('t_mimic'), at: ev.at });
      } else if (ev.kind === 'bank') {
        stats.coins += ev.val;
        msgs.push({ kind: 'coin', text: `+${ev.val}`, at: ev.at });
      } else if (ev.kind === 'heal') {
        stats.potionsUsed = (stats.potionsUsed || 0) + 2;
        const before = stats.hp;
        stats.hp = Math.min(stats.maxHp, stats.hp + ev.amount + e.healBonus);
        msgs.push({ kind: 'heal', text: `+${stats.hp - before}`, at: ev.at });
      }
    }
    // 콤보: 처치가 이어진 슬라이드 수. 처치 없는 슬라이드에서 끊긴다.
    if (slays > 0) {
      stats.combo += 1;
      if (stats.combo > stats.bestCombo) stats.bestCombo = stats.combo;
      if (stats.combo >= C.COMBO_MIN) { stats.coins += C.COMBO_COIN; msgs.push({ kind: 'combo', text: `COMBO X${stats.combo}`, n: stats.combo }); }
      if (slays >= 2) msgs.push({ kind: 'multi', text: `MULTI X${slays}` });
      if (slays > (stats.maxMulti || 0)) stats.maxMulti = slays;
    } else {
      stats.combo = 0;
    }
    // 일반 층 클리어 (보스 층은 보스 격파로만)
    if (!isBossFloor(stats.floor) && stats.kills >= C.killsNeeded(stats.floor)) floorUp = true;
    if (floorUp) {
      stats.kills = 0;
      stats.floor += 1;
      stats.immortalUsed = false;
      msgs.push({ kind: 'floor', text: MD.t('t_floor', stats.floor) });
    }
    return { msgs, floorUp };
  }

  // 퍽을 고른 즉시 적용되는 효과
  function applyPerkInstant(stats, id) {
    if (id === 'vigor') { stats.maxHp += 3; stats.hp = Math.min(stats.maxHp, stats.hp + 3); }
    if (id === 'ironbody') { stats.maxHp += 8; stats.hp = Math.min(stats.maxHp, stats.hp + 8); }
  }

  // 보드 위 코인 타일 합계 (런 종료 시 영구 재화로 전환)
  function coinsOnBoard(grid) {
    let s = 0;
    grid.forEach((row) => row.forEach((c) => { if (c && c.type === 'coin') s += c.val; }));
    return s;
  }

  // 선택지 n개 무작위 (중복 없음, 최대 레벨인 퍽 제외)
  function rollChoices(perks, rng) {
    rng = rng || Math.random;
    const owned = C.EVOLVE.filter((ev) => perks[ev.id]).flatMap((ev) => ev.from);
    const pool = C.PERKS.filter((p) => perkCount(perks, p.id) < C.PERK_MAX && !owned.includes(p.id));
    const out = [];
    while (out.length < C.CHOICES && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    return out;
  }

  MD.rules = { newRunStats, familyFor, isBossFloor, isAltarFloor, isBranchFloor, perkCount, effects, tryEvolve, wouldEvolve, perkDef, isEvolved, spawnMods, applyEvents, applyPerkInstant, coinsOnBoard, rollChoices };
})();
