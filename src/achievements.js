// Merge Dungeon — 업적 40개 + 칭호 (v3.0). 동 = 코인 10, 은·금 = 칭호.
// test(c): c 는 context(run) — 세이브 누적값 + 진행 중인 런 값을 합친 스냅숏.
window.MD = window.MD || {};
(function () {
  const C = MD.CONFIG;
  const B = 'bronze', S = 'silver', G = 'gold';
  const A = (id, tier, en, ko, den, dko, test, ten, tko) => ({ id, tier, name: { en, ko }, desc: { en: den, ko: dko }, test, title: ten ? { en: ten, ko: tko } : null });

  const LIST = [
    // ----- 동: 첫걸음 -----
    A('first_blood', B, 'First Blood', '첫 사냥', 'Slay a monster', '몬스터 한 마리 처치', (c) => c.kills >= 1),
    A('floor3', B, 'Getting Deeper', '조금 더 깊이', 'Reach floor 3', '3층 도착', (c) => c.bestFloor >= 3),
    A('first_boss', B, 'Kingslayer', '왕을 벤 자', 'Slay a boss', '보스 처치', (c) => c.bossKills >= 1),
    A('combo5', B, 'On a Roll', '물 올랐다', 'Reach a x5 combo', '5콤보 달성', (c) => c.combo >= 5),
    A('potions10', B, 'Thirsty', '목마른 모험가', 'Drink 10 potions', '물약 10개 마시기', (c) => c.potions >= 10),
    A('coins100', B, 'Pocket Money', '용돈벌이', 'Bank 100 coins in total', '코인 100개 모으기', (c) => c.coinsLife >= 100),
    A('perk3', B, 'Specialist', '한 우물', 'Raise a perk to Lv3', '특성 하나를 Lv3까지', (c) => c.maxPerk >= 3),
    A('first_evolve', B, 'Metamorphosis', '탈바꿈', 'Evolve a perk', '특성 진화시키기', (c) => c.evoFound >= 1),
    A('rune', B, 'Rune Reader', '룬을 읽는 자', 'Trigger a rune', '룬 발동시키기', (c) => c.runes >= 1),
    A('first_relic', B, 'Souvenir', '기념품', 'Buy a relic', '유물 하나 구매', (c) => c.relics >= 1),
    A('lv4_weapon', B, 'Fine Steel', '좋은 쇠', 'Forge a Lv4 weapon', 'Lv4 무기 만들기', (c) => c.maxWeapon >= 4),
    A('elite', B, 'Star Hunter', '별 사냥꾼', 'Slay an elite', '엘리트 처치', (c) => c.elites >= 1),
    A('daily1', B, 'Daily Bread', '오늘의 던전', 'Finish a daily dungeon', '데일리 던전 한 판', (c) => c.daily >= 1),
    A('treasure', B, 'Jackpot', '횡재', 'Enter a Treasure Room', '보물방 들어가기', (c) => c.treasureRun >= 1),
    A('bestiary5', B, 'Field Notes', '관찰 일지', 'Discover 5 bestiary entries', '도감 5칸 채우기', (c) => c.bestiaryFound >= 5),
    // ----- 은: 한 판의 솜씨 -----
    A('floor10', S, 'Delver', '깊이 파는 자', 'Reach floor 10', '10층 도착', (c) => c.bestFloor >= 10, 'Delver', '탐험가'),
    A('floor15', S, 'Deep Diver', '심층 잠수부', 'Reach floor 15', '15층 도착', (c) => c.bestFloor >= 15, 'Deep Diver', '심층 탐험가'),
    A('combo8', S, 'Whirlwind', '회오리', 'Reach a x8 combo', '8콤보 달성', (c) => c.combo >= 8, 'Whirlwind', '회오리'),
    A('no_potion8', S, 'Teetotaler', '맨정신', 'Reach floor 8 without a potion', '물약 없이 8층 도착', (c) => c.inRun && c.floor >= 8 && c.potionsRun === 0, 'Sober', '맨정신의'),
    A('untouched5', S, 'Unbroken', '무상처', 'Reach floor 5 without taking damage', '한 대도 안 맞고 5층 도착', (c) => c.inRun && c.floor >= 5 && c.damageRun === 0, 'Unbroken', '무상처의'),
    A('dark2', S, 'Daredevil', '겁 없는 자', 'Take the Dark Path twice in one run', '한 판에 어두운 길 두 번', (c) => c.riskyRun >= 2, 'Daredevil', '겁 없는'),
    A('altar2', S, 'Devotee', '독실한 자', 'Make 2 offerings in one run', '한 판에 제물 두 번 바치기', (c) => c.altarRun >= 2, 'Devotee', '독실한'),
    A('lv6_weapon', S, 'Legendary Blade', '전설의 검', 'Forge a Lv6 weapon', 'Lv6 무기 만들기', (c) => c.maxWeapon >= 6, 'Swordsmith', '명검의 주인'),
    A('multi3', S, 'Clean Sweep', '싹쓸이', 'Slay 3 monsters in one slide', '한 번에 3마리 처치', (c) => c.multi >= 3, 'Sweeper', '싹쓸이'),
    A('two_evo', S, 'Twice Reborn', '두 번 태어난', 'Evolve twice in one run', '한 판에 진화 두 번', (c) => c.evoRun >= 2, 'Twice-Born', '두 번 태어난'),
    A('boss3_run', S, 'Regicide', '왕 사냥', 'Slay 3 bosses in one run', '한 판에 보스 셋 처치', (c) => c.bossKillsRun >= 3, 'Regicide', '왕 사냥꾼'),
    A('rich_run', S, 'Moneybags', '돈주머니', 'Bank 60 coins in one run', '한 판에 코인 60개', (c) => c.coinsRun >= 60, 'Moneybags', '돈주머니'),
    A('mimic5', S, 'Trust Issues', '의심병', 'Unmask 5 mimics', '미믹 5마리 정체 밝히기', (c) => c.mimics >= 5, 'Skeptic', '의심 많은'),
    A('warden', S, 'Weed Killer', '잡초 제거', 'Slay the Moss Warden', '모스 워든 처치', (c) => c.bossTypes.includes('spores'), 'Gardener', '정원사'),
    A('three_heroes', S, 'Party of Three', '삼총사', 'Reach floor 5 with 3 heroes', '영웅 셋으로 5층 도착', (c) => c.heroes5 >= 3, 'Captain', '대장'),
    A('tyrant', S, 'Thaw', '해빙', 'Slay the Frost Tyrant', '프로스트 타이런트 처치', (c) => c.bossTypes.includes('freeze'), 'Icebreaker', '얼음을 깬'),
    // ----- 금: 끝까지 간 사람 -----
    A('floor20', G, 'Abyss Walker', '심연을 걷는 자', 'Reach floor 20', '20층 도착', (c) => c.bestFloor >= 20, 'Abyss Walker', '심연을 걷는'),
    A('all_heroes', G, 'Full Roster', '전원 집합', 'Unlock every hero', '모든 영웅 해금', (c) => c.heroesUnlocked >= C.HEROES.length, 'Recruiter', '모집관'),
    A('all_heroes10', G, 'Master of All', '만능', 'Reach floor 10 with every hero', '모든 영웅으로 10층 도착', (c) => c.heroes10 >= C.HEROES.length, 'Polymath', '만능의'),
    A('evo_all', G, 'Evolutionist', '진화론자', 'Discover all 7 evolutions', '진화 7종 모두 발견', (c) => c.evoFound >= C.EVOLVE.length, 'Evolutionist', '진화론자'),
    A('hidden', G, 'Mythbreaker', '신화를 깬 자', 'Discover a hidden evolution', '숨겨진 진화 발견', (c) => c.hiddenFound >= 1, 'Mythbreaker', '신화를 깬'),
    A('bestiary_all', G, 'Monster Scholar', '몬스터 박사', 'Complete the bestiary', '도감 전부 채우기', (c) => c.bestiaryFound >= Object.keys(C.FAMILIES).length * 6, 'Scholar', '박사'),
    A('master10', G, 'Slime Whisperer', '몬스터 조련사', 'Master 10 bestiary entries', '도감 10칸 숙련', (c) => c.mastered >= 10, 'Whisperer', '조련사'),
    A('daily7', G, 'Regular', '단골', 'Play 7 daily dungeons', '데일리 던전 7일', (c) => c.daily >= 7, 'Regular', '단골'),
    A('all_relics', G, 'Collector', '수집가', 'Own every relic', '유물 전부 모으기', (c) => c.relics >= C.RELICS.length, 'Collector', '수집가'),
  ];
  const REWARD = { bronze: 10, silver: 0, gold: 0 };

  function context(run) {
    const s = MD.meta.get(), st = run ? run.stats : null;
    const heroBest = { ...s.heroBest };
    if (run) heroBest[run.hero] = Math.max(heroBest[run.hero] || 0, st.floor);
    if (run) { let mw = 0; run.grid.forEach((row) => row.forEach((t) => { if (t && t.type === 'weapon' && t.lv > mw) mw = t.lv; })); run.maxWeapon = Math.max(run.maxWeapon || 0, mw); }
    const best = Object.keys(s.bestiary || {});
    return {
      inRun: !!run,
      floor: st ? st.floor : 0,
      bestFloor: Math.max(s.bestFloor, st ? st.floor : 0),
      kills: (s.stats.kills || 0) + (st ? st.totalKills : 0),
      bossKills: s.stats.bossKills + (run ? run.bossKills : 0), bossKillsRun: run ? run.bossKills : 0,
      combo: Math.max(s.stats.bestCombo, st ? st.bestCombo : 0),
      potions: s.stats.potionsUsed + (st ? st.potionsUsed || 0 : 0), potionsRun: st ? st.potionsUsed || 0 : 0,
      coinsLife: s.stats.totalCoins + (st ? st.coins : 0), coinsRun: st ? st.coins : 0,
      maxPerk: run ? Math.max(0, ...Object.keys(run.perks).filter((id) => !MD.rules.isEvolved(id)).map((id) => run.perks[id])) : 0,
      evoRun: run ? run.evoCount || 0 : 0,
      evoFound: C.EVOLVE.filter((e) => s.codex[e.id]).length, hiddenFound: C.HIDDEN_EVOLVE.filter((e) => s.codex[e.id]).length,
      runes: run ? run.runesUsed || 0 : 0,
      relics: Object.keys(s.relics).length,
      maxWeapon: run ? run.maxWeapon : 0,
      elites: st ? st.elites || 0 : 0,
      daily: Object.keys(s.daily || {}).length,
      treasureRun: run ? run.treasureTaken || 0 : 0, riskyRun: run ? run.riskyTaken || 0 : 0, altarRun: run ? run.altarOffers || 0 : 0,
      bestiaryFound: best.length, mastered: best.filter((k) => s.bestiary[k] >= 10).length,
      damageRun: st ? st.damageTaken || 0 : 0,
      multi: st ? st.maxMulti || 0 : 0,
      mimics: (s.stats.mimics || 0) + (st ? st.mimics || 0 : 0),
      bossTypes: run ? run.bossTypes || [] : [],
      heroes5: Object.values(heroBest).filter((f) => f >= 5).length, heroes10: Object.values(heroBest).filter((f) => f >= 10).length,
      heroesUnlocked: C.HEROES.filter((h) => MD.meta.heroUnlocked(h.id)).length,
    };
  }

  // 새로 달성한 업적 목록을 돌려준다. 런 중이면 토스트·효과음까지.
  function check(run) {
    const s = MD.meta.get();
    s.achievements = s.achievements || {};
    const c = context(run), fresh = [];
    for (const a of LIST) {
      if (s.achievements[a.id]) continue;
      let ok = false; try { ok = !!a.test(c); } catch (e) { ok = false; }
      if (!ok) continue;
      s.achievements[a.id] = Date.now();
      s.coins += REWARD[a.tier];
      fresh.push(a);
    }
    if (fresh.length) {
      MD.meta.persist();
      if (run) {
        run.feats = (run.feats || []).concat(fresh.map((a) => a.id));
        const now = performance.now();
        fresh.forEach((a, i) => run.toasts.push({ kind: 'feat', text: MD.t('featToast', MD.L(a.name)), t0: now + 300 + i * 700 }));
        setTimeout(() => MD.audio && MD.audio.play('feat'), 300);
      }
    }
    return fresh;
  }
  function byId(id) { return LIST.find((a) => a.id === id); }
  function titleText() { const s = MD.meta.get(); const a = s.title && byId(s.title); return a && a.title && s.achievements && s.achievements[a.id] ? MD.L(a.title) : ''; }
  function equip(id) { const s = MD.meta.get(); const a = byId(id); if (!a || !a.title || !(s.achievements || {})[id]) return false; s.title = s.title === id ? null : id; MD.meta.persist(); return true; }
  function count() { return Object.keys(MD.meta.get().achievements || {}).length; }

  MD.ach = { LIST, check, context, byId, titleText, equip, count, TIER_COLOR: { bronze: '#c98a57', silver: '#b8c0cc', gold: '#f7c948' } };
})();
