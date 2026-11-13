// Merge Dungeon — 런 사이에 남는 것: 코인, 최고 층, 유물, 영웅, 통계, 도감. localStorage.
// 스키마 v3 (v3.0): + bestiary, achievements, title, stats.kills/mimics. v1·v2 세이브는 migrate()로 올린다.
window.MD = window.MD || {};
(function () {
  const KEY = 'merge-dungeon-save';
  const DEFAULT = {
    version: 3, coins: 0, bestFloor: 0, runs: 0, relics: {}, muted: false, lang: 'en', seenTutorial: false, codex: {},
    hero: 'knight',
    stats: { potionsUsed: 0, totalCoins: 0, bossKills: 0, bestCombo: 0, floors: [], kills: 0, mimics: 0 },
    heroBest: {},
    daily: {},   // { 'YYYY-MM-DD': { floor, kills, hero } } 최근 30일
    bestiary: {}, // { 'fam-lv': count } (v3)
    achievements: {}, // { id: 달성 시각 } (v3)
    title: null,      // 장착한 칭호의 업적 id (v3)
  };
  let save = null;

  function migrate(s) {
    if (!s.version || s.version < 2) {
      s.version = 2;
      s.hero = s.hero || 'knight';
      s.stats = { potionsUsed: 0, totalCoins: s.coins || 0, bossKills: 0, bestCombo: 0, floors: [] };
      s.heroBest = {};
      s.codex = s.codex || {};
    }
    if (s.version < 3) {
      s.version = 3;
      s.bestiary = s.bestiary || {}; s.achievements = s.achievements || {}; s.title = s.title || null;
    }
    return s;
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      save = raw ? migrate({ ...DEFAULT, ...JSON.parse(raw) }) : { ...DEFAULT, stats: { ...DEFAULT.stats, floors: [] } };
      if (Array.isArray(save.relics)) save.relics = {};
      save.stats = { ...DEFAULT.stats, ...(save.stats || {}) };
      save.daily = save.daily || {};
      save.bestiary = save.bestiary || {}; save.achievements = save.achievements || {};
    } catch (e) { save = { ...DEFAULT, stats: { ...DEFAULT.stats, floors: [] } }; }
    return save;
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* 시크릿 모드 등 */ }
  }
  function onRunEnd(result) {
    if (!save) load();
    save.coins += result.coins;
    save.runs += 1;
    save.stats.totalCoins += result.coins;
    save.stats.potionsUsed += result.potionsUsed || 0;
    save.stats.bossKills += result.bossKills || 0;
    save.stats.kills = (save.stats.kills || 0) + (result.kills || 0);
    save.stats.mimics = (save.stats.mimics || 0) + (result.mimics || 0);
    if (result.bestCombo > save.stats.bestCombo) save.stats.bestCombo = result.bestCombo;
    save.stats.floors.push(result.floor); if (save.stats.floors.length > 50) save.stats.floors.shift();
    if (result.floor > save.bestFloor) save.bestFloor = result.floor;
    if (result.hero && result.floor > (save.heroBest[result.hero] || 0)) save.heroBest[result.hero] = result.floor;
    if (result.daily) { save.daily = save.daily || {}; const prev = save.daily[result.daily]; if (!prev || result.floor > prev.floor) save.daily[result.daily] = { floor: result.floor, kills: result.kills }; const keys = Object.keys(save.daily).sort(); while (keys.length > 30) delete save.daily[keys.shift()]; }
    persist();
  }
  function get() { return save || load(); }
  function has(id) { return !!get().relics[id]; }
  function canBuy(id) {
    const r = MD.CONFIG.RELICS.find((q) => q.id === id);
    return r && !has(id) && get().coins >= r.cost;
  }
  function buy(id) {
    if (!canBuy(id)) return false;
    const r = MD.CONFIG.RELICS.find((q) => q.id === id);
    save.coins -= r.cost;
    save.relics[id] = 1;
    persist();
    return true;
  }
  // 영웅 해금: unlock.stat 은 stats 또는 최상위(bestFloor)
  function heroUnlocked(id) {
    const h = MD.CONFIG.HEROES.find((q) => q.id === id);
    if (!h || !h.unlock) return true;
    const s = get();
    const v = h.unlock.stat === 'bestFloor' ? s.bestFloor : (s.stats[h.unlock.stat] || 0);
    return v >= h.unlock.n;
  }
  function heroProgress(id) {
    const h = MD.CONFIG.HEROES.find((q) => q.id === id);
    if (!h || !h.unlock) return [1, 1];
    const s = get();
    const v = h.unlock.stat === 'bestFloor' ? s.bestFloor : (s.stats[h.unlock.stat] || 0);
    return [Math.min(v, h.unlock.n), h.unlock.n];
  }

  let dirty = false;
  function recordKill(fam, lv) { const s = get(); const k = `${fam}-${lv}`; s.bestiary[k] = (s.bestiary[k] || 0) + 1; dirty = true; return s.bestiary[k]; }
  // 처치 기록은 런 종료 시 onRunEnd 의 persist 에 함께 저장
  MD.meta = { load, get, onRunEnd, persist, has, canBuy, buy, heroUnlocked, heroProgress, recordKill };
})();
