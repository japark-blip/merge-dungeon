// Merge Dungeon — UI 문자열. 기본 영어, 타이틀에서 EN/KO 전환 (meta.lang).
window.MD = window.MD || {};
(function () {
  const STR = {
    en: {
      floor: (n) => `FLOOR ${n}`, kills: (k, n) => `Kills ${k}/${n}`, slayBoss: 'Slay the boss', hp: (h, m) => `HP ${h} / ${m}`,
      tips: ['Push a weapon into a monster to slay it · same tiles merge', 'Potion + Potion = heal 3 HP', 'Coins merge; at 4 they go to your wallet', 'Clear the floor to pick a perk · a boss every 5 floors', 'Slay on every slide to build a COMBO', 'Push a tile into the rune on the board to trigger it', 'Elite monsters (red star) drop 3 coins'],
      tut: ['Swipe to slide every tile. Same tiles merge.', 'Push a weapon into a monster to slay it.', 'Fill the bar to clear the floor and pick a perk.'], tutGo: 'TAP TO BEGIN',
      xpBar: (k, n, f) => `${k}/${n} TO FLOOR ${f}`, bossBar: 'BOSS - SLAY IT TO ADVANCE', newBest: 'NEW BEST!',
      choose: (n) => `FLOOR ${n} - PICK ONE`, pairTag: 'PAIR', bossWarn: '👑 A boss appeared — HP -1 every move', newTag: 'NEW',
      dead_hp: 'You fell', dead_full: 'The board is full', result: (f, k, c) => `FLOOR ${f} - ${k} SLAIN - +${c} COINS`,
      retry: 'ONE MORE RUN', menu: 'MENU / SHOP',
      shop: 'RELIC SHOP', shopHint: 'Coins you bank in a run carry over. Relics apply to every run.', owned: 'OWNED', back: '< BACK',
      recTabs: ['EVOLVE', 'BEASTS', 'FEATS', 'STATS'], featToast: (n) => `FEAT: ${n}`, featsRun: 'FEATS', featWorn: 'WEARING', featHint: 'Tap an earned feat to wear its title', bestiaryFoot: (f, t) => `${f}/${t} FOUND  ·  10 SLAIN = MASTERED (+1 COIN)`,
      statLabels: ['RUNS', 'BEST FLOOR', 'AVERAGE FLOOR', 'MONSTERS SLAIN', 'BOSSES SLAIN', 'BEST COMBO', 'COINS EARNED', 'POTIONS USED', 'DAILY DUNGEONS', 'BEST FLOOR BY HERO'],
      records: 'RECORDS', daily: 'DAILY', dailyTitle: 'DAILY DUNGEON', dailySub: (k) => `${k}  ·  same dungeon for everyone  ·  Knight`, dailyDone: (f) => `TODAY: FLOOR ${f}`, dailyPlay: 'ENTER', dailyAgain: 'TRY AGAIN', dailyHist: 'LAST 30 DAYS', altarTitle: 'A DARK ALTAR', t_immortal: 'Immortal', t_mimic: 'MIMIC!', chooseHero: 'CHOOSE YOUR HERO', heroSub: 'EACH HERO BENDS ONE RULE', locked: 'Locked', heroLine: (n) => `Hero: ${n}  ·  tap PRESS ANY KEY to choose`, branchTitle: 'A FORK IN THE DUNGEON', bossLv: (lv) => `LEVEL ${lv}  ·  BRING A WEAPON OF LV${lv}+`,
      title_shop: (n, m) => `RELICS ${n}/${m}`, title_stats: (f, c, r) => `BEST FLOOR ${f}  ·  ● ${c}  ·  ${r} RUNS`, press: 'PRESS ANY KEY',
      t_slain: (lv) => `LV${lv} SLAIN`, t_bossSlain: 'Boss slain!', t_blocked: 'Blocked', t_hunter: 'Hunter ×2', t_leech: 'Leech +1', t_ward: 'Ward',
      t_floor: (n) => `Floor ${n}`, t_bossTick: (n) => `Boss -${n}`, t_rewind: 'Rewind', t_mercy: 'Mercy', t_bastion: 'Bastion', t_purify: 'Purified', t_perk: (name, lv) => `${name} Lv${lv}`,
      evolved: 'EVOLVED!', evolveTag: 'EVOLVE', evolveHint: (a, b, n) => `${a} + ${b} → ${n}`, nextGoal: (f) => `NEXT GOAL: REACH FLOOR ${f}`, runeTip: (n, d) => `${n} on the board — ${d}`, noPerks: 'PERKS APPEAR HERE',
    },
    ko: {
      floor: (n) => `FLOOR ${n}`, kills: (k, n) => `처치 ${k}/${n}`, slayBoss: '보스를 쓰러뜨려라', hp: (h, m) => `HP ${h} / ${m}`,
      tips: ['무기를 몬스터 쪽으로 밀면 공격 · 같은 타일끼리는 합쳐져요', '물약 두 개가 만나면 HP 3 회복', '코인은 합쳐지다 4가 되면 지갑으로 쏙', '층을 깨면 특성 하나 선택 · 5층마다 보스', '매 턴 연달아 처치하면 콤보!', '룬 위로 타일을 밀어 넣으면 발동돼요', '빨간 별 엘리트는 코인 3개를 떨궈요'],
      tut: ['밀면 타일이 전부 움직여요. 같은 타일끼리는 합쳐져요.', '무기를 몬스터 쪽으로 밀면 공격해요.', '게이지를 채우면 다음 층으로. 특성도 하나 골라요.'], tutGo: '탭해서 시작',
      xpBar: (k, n, f) => `${k} / ${n} → ${f}층`, bossBar: '보스를 쓰러뜨려야 내려갈 수 있다', newBest: '신기록!',
      choose: (n) => `${n}층 도착 — 특성을 고르세요`, pairTag: '짝', bossWarn: '👑 보스 등장 — 한 턴마다 HP -1', newTag: 'NEW',
      dead_hp: '쓰러졌다', dead_full: '더 움직일 수 없다', result: (f, k, c) => `${f}층 · 처치 ${k} · 코인 +${c}`,
      retry: '한 판 더', menu: '메뉴 · 상점',
      shop: '유물 상점', shopHint: '던전에서 모은 코인은 그대로 쌓여요. 유물은 모든 판에 적용.', owned: '보유 중', back: '← 뒤로',
      recTabs: ['진화', '도감', '업적', '통계'], featToast: (n) => `업적 달성: ${n}`, featsRun: '이번 판 업적', featWorn: '장착 중', featHint: '달성한 업적을 누르면 칭호를 달 수 있어요', bestiaryFoot: (f, t) => `${f}/${t} 발견  ·  10마리 잡으면 숙련 (코인 +1)`,
      statLabels: ['플레이한 판', '최고 층', '평균 층', '잡은 몬스터', '잡은 보스', '최고 콤보', '번 코인', '마신 물약', '데일리 던전', '영웅별 최고 층'],
      records: '기록', daily: 'DAILY', dailyTitle: 'DAILY DUNGEON', dailySub: (k) => `${k}  ·  오늘은 모두 같은 던전  ·  기사`, dailyDone: (f) => `오늘 기록: ${f}층`, dailyPlay: 'ENTER', dailyAgain: '한 번 더', dailyHist: '최근 30일', altarTitle: 'A DARK ALTAR', t_immortal: '불멸', t_mimic: '미믹!', chooseHero: 'CHOOSE YOUR HERO', heroSub: '영웅마다 규칙이 하나씩 달라요', locked: '잠김', heroLine: (n) => `영웅: ${n}  ·  아무 키나 누르면 영웅 선택`, branchTitle: 'A FORK IN THE DUNGEON', bossLv: (lv) => `LEVEL ${lv}  ·  Lv${lv} 이상 무기로만 벨 수 있다`,
      title_shop: (n, m) => `유물 ${n}/${m}`, title_stats: (f, c, r) => `최고 ${f}층  ·  ● ${c}  ·  ${r}판`, press: 'PRESS ANY KEY',
      t_slain: (lv) => `Lv${lv} 처치`, t_bossSlain: '보스 격파!', t_blocked: '막아냈다', t_hunter: '사냥꾼 ×2', t_leech: '흡혈 +1', t_ward: '결계',
      t_floor: (n) => `${n}층`, t_bossTick: (n) => `보스 -${n}`, t_rewind: '되감기', t_mercy: '자비', t_bastion: '요새', t_purify: '정화', t_perk: (name, lv) => `${name} Lv${lv}`,
      evolved: 'EVOLVED!', evolveTag: '진화!', evolveHint: (a, b, n) => `${a} + ${b} → ${n}`, nextGoal: (f) => `다음 목표: ${f}층`, runeTip: (n, d) => `${n}이 보드에 있어요 — ${d}`, noPerks: 'PERKS APPEAR HERE',
    },
  };
  let lang = 'en';
  function setLang(l) { lang = STR[l] ? l : 'en'; }
  function getLang() { return lang; }
  // t('key', ...args) — 함수형 문자열이면 인자 적용
  function t(key, ...args) { const v = STR[lang][key]; return typeof v === 'function' ? v(...args) : v; }
  // 퍽/유물처럼 {en, ko} 객체인 필드
  function L(obj) { return obj && typeof obj === 'object' && !Array.isArray(obj) ? (obj[lang] || obj.en) : obj; }

  MD.i18n = { t, L, setLang, getLang };
  MD.t = t; MD.L = L;
})();
