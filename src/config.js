// Merge Dungeon — 밸런스 숫자는 전부 여기. 다른 파일은 숫자를 하드코딩하지 않는다.
window.MD = window.MD || {};
MD.CONFIG = {
  BOARD: 4,
  START_HP: 10,
  MAX_LV: 6,
  // 타일 등장 확률 (합 100)
  // 등장은 같아도 무기는 전투에서 소모되고 몬스터는 남아서, 보드 위 비중은 몬스터가 더 커진다.
  // 35/35 → 보드 위 무기 23% : 몬스터 29%. 40/30 → 31% : 22% (랜덤 플레이 시뮬 기준)
  SPAWN: { weapon: 40, monster: 30, potion: 15, coin: 15 },
  // 층 n 클리어에 필요한 처치 수
  // v2.1 페이싱: 연타로 1~4층이 순식간에 지나가지 않게 2배로. 5,7,9,11…
  killsNeeded: (floor) => floor * 2 + 3,
  // 층 n 에서 등장하는 몬스터 최소 레벨
  monsterMinLv: (floor) => Math.min(5, 1 + Math.floor((floor - 1) / 3)),
  // 엘리트: 10층부터 몬스터 스폰의 일부가 +1Lv, 처치 시 코인 적립 3 (v2.0)
  ELITE_FROM: 10, ELITE_CHANCE: 0.15, ELITE_COINS: 3,
  // 콤보: 연속 슬라이드마다 처치가 이어지면 스택. 3부터 표시·보상 (v2.0)
  COMBO_MIN: 3, COMBO_COIN: 1,
  // 룬 타일: 런 시작 시 1개 랜덤 배치. 합쳐지지 않고, 다른 타일이 밀려 들어오면 발동 후 사라짐 (v2.0)
  // 영웅 (v2.1): 시작 조건 + 고유 룰 하나. unlock: meta 통계 조건
  HEROES: [
    { id: 'knight', name: { en: 'Knight', ko: '기사' }, hp: 10, unlock: null, desc: { en: 'The standard rules. Steady and honest.', ko: '기본 규칙 그대로. 묵직하고 정직한 영웅.' }, sprite: { type: 'weapon', lv: 1 } },
    { id: 'rogue', name: { en: 'Rogue', ko: '도적' }, hp: 7, unlock: { stat: 'bestFloor', n: 5, text: { en: 'Reach floor 5', ko: '5층까지 내려가기' } }, desc: { en: 'Weapons survive equal-level fights. Only 7 HP.', ko: '같은 레벨과 싸워도 무기가 부서지지 않아요. 대신 HP 7.' }, sprite: { type: 'weapon', lv: 4 } },
    { id: 'alchemist', name: { en: 'Alchemist', ko: '연금술사' }, hp: 10, unlock: { stat: 'potionsUsed', n: 30, text: { en: 'Use 30 potions', ko: '물약 30개 마시기' } }, desc: { en: 'Potions merge into a big potion. Big potion + potion heals 7. Weapons -10%.', ko: '물약끼리 합치면 큰 물약이 돼요. 큰 물약 + 물약 = 7 회복. 무기는 10% 덜 나와요.' }, sprite: { type: 'bigpotion', lv: 1 } },
    { id: 'merchant', name: { en: 'Merchant', ko: '상인' }, hp: 9, unlock: { stat: 'totalCoins', n: 500, text: { en: 'Bank 500 coins in total', ko: '코인 500개 모으기' } }, desc: { en: 'Coins bank at 2. Starts each run with one random relic on loan.', ko: '코인이 2만 모여도 지갑으로. 매 판 유물 하나를 빌려서 시작해요.' }, sprite: { type: 'coin', lv: 1 } },
    { id: 'necromancer', name: { en: 'Necromancer', ko: '강령술사' }, hp: 10, unlock: { stat: 'bossKills', n: 3, text: { en: 'Slay 3 bosses', ko: '보스 3마리 쓰러뜨리기' } }, desc: { en: 'When a weapon and monster destroy each other, a Lv1 weapon rises 50% of the time. No potions.', ko: '무기와 몬스터가 같이 쓰러진 자리에서 50% 확률로 Lv1 무기가 일어나요. 물약은 안 나와요.' }, sprite: { type: 'skull', lv: 1 } },
  ],
  // 분기 (v2.1): BRANCH_EVERY 층마다 다음 구간을 고른다
  BRANCH_EVERY: 3,
  BRANCHES: [
    { id: 'safe', name: { en: 'Safe Path', ko: '안전한 길' }, desc: { en: 'Nothing changes.', ko: '아무 일도 없어요.' } },
    { id: 'risky', name: { en: 'Dark Path', ko: '어두운 길' }, desc: { en: 'Next 3 floors: monsters +1 Lv, coins x2.', ko: '앞으로 3층 동안 몬스터 +1Lv, 대신 코인 2배.' } },
    { id: 'treasure', name: { en: 'Treasure Room', ko: '보물방' }, desc: { en: 'Next floor: no monsters, only coins and potions, 15 moves.', ko: '다음 층엔 몬스터가 없어요. 코인과 물약만, 15턴 동안.' } },
  ],
  TREASURE_MOVES: 15,
  // 몬스터 가족 (v3.0): 테마층에서 FAMILY_CHANCE 로 등장. 나머지는 slime.
  FAMILY_CHANCE: 0.45,
  FAMILIES: {
    slime: { name: { en: 'Slime', ko: '슬라임' }, quirk: { en: 'No tricks.', ko: '별다른 재주는 없어요.' } },
    bat: { name: { en: 'Bat', ko: '박쥐' }, theme: 'stone', quirk: { en: 'Flutters to a nearby empty cell every other turn', ko: '두 턴마다 옆의 빈 칸으로 푸드덕 옮겨 다녀요' } },
    shroom: { name: { en: 'Shroom', ko: '버섯' }, theme: 'moss', quirk: { en: 'Leaves a Lv1 spore beside it when slain', ko: '쓰러지면 옆에 Lv1 포자를 남겨요' } },
    wisp: { name: { en: 'Frost Wisp', ko: '얼음정령' }, theme: 'frost', quirk: { en: 'The weapon that slays it is frozen for 1 turn', ko: '자기를 벤 무기를 한 턴 얼려요' } },
    imp: { name: { en: 'Imp', ko: '임프' }, theme: 'ember', quirk: { en: 'Spawns one level higher, drops 2 coins', ko: '한 단계 강하게 나오지만 코인 2개를 떨궈요' } },
    shade: { name: { en: 'Shade', ko: '그림자' }, theme: 'void', quirk: { en: 'Grows a level every 2 turns', ko: '두 턴마다 한 단계씩 강해져요. 빨리 잡으세요' } },
    mimic: { name: { en: 'Mimic', ko: '미믹' }, theme: 'gold', quirk: { en: 'Looks like a coin until you merge it', ko: '코인인 척하다가 합치려 들면 정체를 드러내요' } },
  },
  // 보스 기믹 (v3.0): 이름 순서와 같다
  BOSS_GIMMICK: ['summon', 'spores', 'freeze', 'fire', 'devour', 'idol'],
  BOSS_HINT: {
    summon: { en: 'Summons a Lv1 slime every 3 turns', ko: '3턴마다 Lv1 슬라임을 불러요' },
    spores: { en: 'Arrives with 2 spores. Each slain shroom leaves more', ko: '포자 2개와 함께 와요. 버섯을 벨수록 늘어나요' },
    freeze: { en: 'Freezes one of your weapons every turn', ko: '매 턴 무기 하나를 얼려요' },
    fire: { en: 'Scorches a random tile every 2 turns (-1 level)', ko: '2턴마다 아무 칸이나 태워요 (-1 레벨)' },
    devour: { en: 'Eats your weakest tile every 4 turns', ko: '4턴마다 제일 약한 타일을 삼켜요' },
    idol: { en: 'Immune to weapons. Push 3 coins into it', ko: '무기가 안 통해요. 코인 3개를 밀어 넣으세요' },
  },
  IDOL_HITS: 3,
  // 보스 이름 (5층마다 순환)
  BOSSES: ['SLIME KING', 'MOSS WARDEN', 'FROST TYRANT', 'ASH DRAKE', 'VOID MAW', 'GILDED IDOL'],
  bossName: (floor) => MD.CONFIG.BOSSES[(Math.floor(floor / 5) - 1) % MD.CONFIG.BOSSES.length],
  RUNES: [
    { id: 'bomb', name: { en: 'Bomb Rune', ko: '폭탄 룬' }, desc: { en: 'Push any tile into it: every monster around it is slain', ko: '아무 타일이나 밀어 넣으면 주변 몬스터가 전부 터져요' } },
    { id: 'mirror', name: { en: 'Mirror Rune', ko: '거울 룬' }, desc: { en: 'Push a tile into it: the tile is duplicated', ko: '타일을 밀어 넣으면 똑같은 게 하나 더 생겨요' } },
    { id: 'anvil', name: { en: 'Anvil Rune', ko: '모루 룬' }, desc: { en: 'Push a weapon into it: the weapon gains a level', ko: '무기를 밀어 넣으면 한 단계 강해져요' } },
  ],
  // 시작 타일 수
  START_TILES: 2,
  POTION_HEAL: 3,     // 포션 두 개를 합치면 즉시 회복 (타일은 사라짐)
  COIN_BANK: 4,       // 코인 타일 값이 이 이상이 되면 자동으로 지갑에 들어가고 타일은 사라짐
  COIN_BASE: 1,       // 코인 타일 기본 가치
  SLIDE_MS: 110,      // 슬라이드 애니메이션 길이
  POP_MS: 140,        // 합쳐진 타일 팝 길이
  // 보스: 5층마다. 보스 층은 처치 수 대신 보스를 잡아야 넘어간다.
  BOSS_EVERY: 5,
  bossLv: (floor) => Math.min(6, 3 + Math.floor(floor / 5)),
  BOSS_TICK: 1,       // 보스가 보드에 있는 동안 매 이동마다 HP 감소
  // 층 클리어 시 3개 중 1개 선택. 같은 퍽을 다시 고르면 Lv이 오른다 (최대 PERK_MAX).
  // desc[n-1] = Lv n 일 때 효과. 수치는 rules.effects() 에서 레벨별로 계산.
  PERK_MAX: 3,
  PERKS: [
    { id: 'sharp', name: { en: 'Keen Edge', ko: '예리한 날' }, desc: { en: ['Weapon spawn +8%', 'Weapon spawn +16%', 'Weapon spawn +24%'], ko: ['무기가 8% 더 자주 나와요', '무기가 16% 더 자주 나와요', '무기가 24% 더 자주 나와요'] } },
    { id: 'forge', name: { en: 'Forge', ko: '대장간' }, desc: { en: ['New weapons are Lv2 35% of the time', 'New weapons are Lv2 50% of the time', 'New weapons are Lv2 65% of the time'], ko: ['새 무기의 35%가 Lv2로 나와요', '새 무기의 50%가 Lv2로 나와요', '새 무기의 65%가 Lv2로 나와요'] } },
    { id: 'hide', name: { en: 'Thick Hide', ko: '두꺼운 가죽' }, desc: { en: ['Combat damage -1', 'Combat damage -2', 'Combat damage -3'], ko: ['받는 피해 -1', '받는 피해 -2', '받는 피해 -3'] } },
    { id: 'vigor', name: { en: 'Vigor', ko: '활력' }, desc: { en: ['Max HP +3, heal 3 now', 'Max HP +6, heal 3 now', 'Max HP +9, heal 3 now'], ko: ['최대 HP +3, 바로 3 회복', '최대 HP +6, 바로 3 회복', '최대 HP +9, 바로 3 회복'] } },
    { id: 'alchemist', name: { en: 'Alchemist', ko: '연금술사' }, desc: { en: ['Potions heal +2', 'Potions heal +4', 'Potions heal +6'], ko: ['물약 회복량 +2', '물약 회복량 +4', '물약 회복량 +6'] } },
    { id: 'vampire', name: { en: 'Leech', ko: '흡혈' }, desc: { en: ['30% chance: +1 HP on slay', '60% chance: +1 HP on slay', '+1 HP on every slay'], ko: ['처치할 때 30% 확률로 HP +1', '처치할 때 60% 확률로 HP +1', '처치할 때마다 HP +1'] } },
    { id: 'hunter', name: { en: 'Hunter', ko: '사냥꾼' }, desc: { en: ['25% chance a slay counts twice', '50% chance a slay counts twice', '75% chance a slay counts twice'], ko: ['처치가 25% 확률로 두 마리로 쳐져요', '처치가 50% 확률로 두 마리로 쳐져요', '처치가 75% 확률로 두 마리로 쳐져요'] } },
    { id: 'tidy', name: { en: 'Tidy Up', ko: '청소부' }, desc: { en: ['Floor clear removes the weakest monster', 'Floor clear removes 2 weakest monsters', 'Floor clear removes 3 weakest monsters'], ko: ['층을 깰 때 제일 약한 몬스터 1마리가 사라져요', '층을 깰 때 제일 약한 몬스터 2마리가 사라져요', '층을 깰 때 제일 약한 몬스터 3마리가 사라져요'] } },
    { id: 'armory', name: { en: 'Armory', ko: '무기고' }, desc: { en: ['Floor clear spawns a Lv2 weapon', 'Floor clear spawns a Lv3 weapon', 'Floor clear spawns a Lv4 weapon'], ko: ['층을 깰 때 Lv2 무기를 받아요', '층을 깰 때 Lv3 무기를 받아요', '층을 깰 때 Lv4 무기를 받아요'] } },
    { id: 'mercy', name: { en: 'Mercy', ko: '자비' }, desc: { en: ['Full board: once, remove 2 weakest tiles', 'Full board: twice, remove 3 weakest tiles', 'Full board: 3 times, remove 4 weakest tiles'], ko: ['보드가 막히면 한 번, 약한 타일 2개를 치워줘요', '보드가 막히면 두 번까지, 약한 타일 3개를 치워줘요', '보드가 막히면 세 번까지, 약한 타일 4개를 치워줘요'] } },
    { id: 'ward', name: { en: 'Ward', ko: '결계' }, desc: { en: ['Ignore boss turn damage 33%', 'Ignore boss turn damage 66%', 'Ignore boss turn damage'], ko: ['보스의 턴 피해를 33% 확률로 막아요', '보스의 턴 피해를 66% 확률로 막아요', '보스의 턴 피해를 전부 막아요'] } },
    { id: 'greed', name: { en: 'Greed', ko: '탐욕' }, desc: { en: ['Coins ×2, monsters +10%', 'Coins ×3, monsters +20%', 'Coins ×4, monsters +30%'], ko: ['코인 2배, 대신 몬스터 +10%', '코인 3배, 대신 몬스터 +20%', '코인 4배, 대신 몬스터 +30%'] } },
    { id: 'miser', name: { en: 'Miser', ko: '구두쇠' }, desc: { en: ['+20% coins at run end', '+40% coins at run end', '+60% coins at run end'], ko: ['판이 끝날 때 코인 +20%', '판이 끝날 때 코인 +40%', '판이 끝날 때 코인 +60%'] } },
  ],
  CHOICES: 3,
  // 진화: 두 퍽이 모두 Lv2 이상이 되는 순간 합쳐져 새 퍽이 된다 (둘은 사라지고 진화 퍽은 고정 Lv).
  EVOLVE: [
    { id: 'masterwork', from: ['sharp', 'forge'], name: { en: 'Masterwork', ko: '명장의 솜씨' }, desc: { en: 'Every new weapon is at least Lv2, 30% Lv3. Weapon spawn +20%', ko: '새 무기는 전부 Lv2 이상, 30%는 Lv3. 무기도 20% 더 자주' } },
    { id: 'ironbody', from: ['hide', 'vigor'], name: { en: 'Iron Body', ko: '강철의 몸' }, desc: { en: 'Max HP +8. Any hit deals at most 1 damage', ko: '최대 HP +8. 어떤 공격을 받아도 피해는 1까지만' } },
    { id: 'reaper', from: ['vampire', 'hunter'], name: { en: 'Reaper', ko: '사신' }, desc: { en: 'Every slay heals 1 HP and counts twice', ko: '처치할 때마다 HP +1, 처치는 항상 두 마리로' } },
    { id: 'purifier', from: ['alchemist', 'tidy'], name: { en: 'Purifier', ko: '정화자' }, desc: { en: 'Potions heal 8 and also banish the weakest monster', ko: '물약이 8 회복하고, 제일 약한 몬스터까지 쫓아내요' } },
    { id: 'midas', from: ['greed', 'miser'], name: { en: 'Midas', ko: '미다스' }, desc: { en: 'Coins are worth 3× and bank instantly. +60% at run end', ko: '코인 3배에 바로 지갑으로. 판이 끝나면 +60%' } },
    { id: 'bastion', from: ['armory', 'mercy'], name: { en: 'Bastion', ko: '요새' }, desc: { en: 'Full board never kills: 2 weakest tiles become a Lv3 weapon, every time', ko: '보드가 막혀도 끝나지 않아요. 약한 타일 2개가 Lv3 무기로, 몇 번이든' } },
    { id: 'sanctuary', from: ['ward', 'hide'], name: { en: 'Sanctuary', ko: '성역' }, desc: { en: 'Bosses deal no turn damage and you take -2 from every hit', ko: '보스 턴 피해 없음, 모든 피해 -2' } },
  ],
  // 제물 제단 (v2.2): 보스 층 직전(4,9,14…) 퍽 선택 뒤 등장
  ALTAR: [
    { id: 'blood', name: { en: 'Offer 3 HP', ko: 'HP 3을 바친다' }, desc: { en: 'One of your perks gains a level', ko: '가진 특성 하나가 한 단계 올라요' }, cost: { hp: 3 } },
    { id: 'gold', name: { en: 'Offer 40 coins', ko: '코인 40을 바친다' }, desc: { en: 'Gain one Rewind for this run', ko: '이번 판에 되감기 1회' }, cost: { coins: 40 } },
    { id: 'refuse', name: { en: 'Walk away', ko: '그냥 지나간다' }, desc: { en: 'Nothing happens.', ko: '아무 일도 없다.' }, cost: {} },
  ],
  // 숨겨진 진화 (v2.2): 진화 퍽 둘을 모두 가지면. 도감에는 힌트만.
  HIDDEN_EVOLVE: [
    { id: 'godslayer', from: ['masterwork', 'reaper'], name: { en: 'Godslayer', ko: '신살자' }, desc: { en: 'Every weapon slays any monster. Bosses take 2 hits.', ko: '어떤 무기로도 어떤 몬스터든 벨 수 있어요. 보스는 두 번.' }, hint: { en: 'Two golden perks of the blade…', ko: '칼날을 품은 황금 특성 둘이 만나면…' } },
    { id: 'immortal', from: ['ironbody', 'sanctuary'], name: { en: 'Immortal', ko: '불멸자' }, desc: { en: 'HP cannot drop below 1 once per floor.', ko: '층마다 한 번은 죽지 않아요. HP 1로 버팁니다.' }, hint: { en: 'Two golden perks of the shield…', ko: '방패를 품은 황금 특성 둘이 만나면…' } },
  ],
  // 데일리 던전 (v2.2): 날짜 시드, 영웅 고정 Knight, 로컬 기록
  DAILY_HERO: 'knight',
  // 층 테마: 2층마다 바뀜, 보스 층은 throne
  THEMES: [
    { id: 'stone', name: { en: 'STONE HALL', ko: '돌의 회랑' }, bg: '#1b1a2e', board: '#2a2944', cell: '#35345a', cellHi: '#434268', cellLo: '#262540', speck: '#4a4970' },
    { id: 'moss', name: { en: 'MOSSY CRYPT', ko: '이끼 낀 지하묘' }, bg: '#161f1b', board: '#1f2d27', cell: '#2b3f36', cellHi: '#3a5247', cellLo: '#1d2c25', speck: '#4f8a5e' },
    { id: 'frost', name: { en: 'FROZEN DEPTHS', ko: '얼어붙은 심연' }, bg: '#141c2b', board: '#1e2b40', cell: '#2a3b56', cellHi: '#3d5070', cellLo: '#1e2b40', speck: '#9fd3ff' },
    { id: 'ember', name: { en: 'EMBER PITS', ko: '잉걸불 구덩이' }, bg: '#241412', board: '#361d18', cell: '#4a2820', cellHi: '#5e362b', cellLo: '#2e1812', speck: '#ff8c3a' },
    { id: 'void', name: { en: 'VOID RIFT', ko: '공허의 균열' }, bg: '#120c1e', board: '#1d1230', cell: '#2a1a44', cellHi: '#3b2860', cellLo: '#1a1030', speck: '#b26ae8' },
    { id: 'gold', name: { en: 'GILDED VAULT', ko: '황금 금고' }, bg: '#221b10', board: '#332817', cell: '#46371f', cellHi: '#5c4a2a', cellLo: '#2c2213', speck: '#f7c948' },
  ],
  THEME_THRONE: { id: 'throne', name: { en: 'THRONE ROOM', ko: '왕좌의 방' }, bg: '#1a0f26', board: '#2a1640', cell: '#3b2250', cellHi: '#52306c', cellLo: '#2a1640', speck: '#d9a3ff' },
  themeFor: (floor) => (floor % 5 === 0 ? MD.CONFIG.THEME_THRONE : MD.CONFIG.THEMES[Math.floor((floor - 1) / 2) % MD.CONFIG.THEMES.length]),
  // 영구 유물: 코인으로 구매, 런 시작 시 자동 적용. 각 1회 구매.
  RELICS: [
    { id: 'startweapon', name: { en: 'Starter Blade', ko: '시작 무기' }, cost: 50, desc: { en: 'Start with one Lv2 weapon on the board', ko: 'Lv2 무기 하나를 들고 시작' } },
    { id: 'bigheart', name: { en: 'Big Heart', ko: '큰 심장' }, cost: 100, desc: { en: 'Start with +2 HP', ko: '시작 HP +2' } },
    { id: 'luckypouch', name: { en: 'Lucky Pouch', ko: '행운의 주머니' }, cost: 150, desc: { en: 'Coin tiles are worth 2×', ko: '코인 타일 값이 2배' } },
    { id: 'rewind', name: { en: 'Rewind', ko: '되감기' }, cost: 300, desc: { en: 'Undo your last slide once per run', ko: '한 판에 한 번, 마지막 수를 무를 수 있어요' } },
    { id: 'sharpener', name: { en: 'Whetstone', ko: '숫돌' }, cost: 450, desc: { en: 'Weapon spawn +5%', ko: '무기가 5% 더 자주 나와요' } },
  ],
};
