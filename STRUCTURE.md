# Merge Dungeon — 파일 구조 인덱스

요청마다 이 표를 보고 해당 파일/함수만 연다. 통째로 다시 읽지 않는다.
모든 파일은 `window.MD` 네임스페이스에 붙는 classic script (file:// 로 열어도 동작).
로드 순서: i18n → config → sprites → pixfont → fx → title → audio → board → rules → meta → run → render → input → main.

| 파일 | 줄 | 역할 | 주요 함수 |
| --- | --- | --- | --- |
| src/i18n.js | ~45 | UI 문자열 en/ko, 기본 en | MD.t(key,...args) / MD.L({en,ko}) / setLang. 퍽·유물 name/desc 는 config 에 {en,ko} 로 |
| src/config.js | ~70 | 밸런스 숫자 전부 + PERKS/RELICS 정의 | BOARD, START_HP, SPAWN 확률, killsNeeded(floor), monsterMinLv(floor) |
| src/sprites.js | ~130 | 16×16 픽셀 스프라이트 (문자 맵 → 캔버스 캐시) | MAPS(monster/boss/weapon/potion/bigpotion/coin), PAL 레벨 팔레트, bake(type,lv), get(tile) |
| src/pixfont.js | ~70 | 5×7 픽셀 폰트 | draw(ctx,text,x,y,px,color|fn,{shadow,outline,gap}) / width |
| src/fx.js | ~80 | 파티클·떠오르는 숫자·슬래시·화면 흔들림 | burst / sparkle / floater / slash / shakeScreen / update(dt) / draw(ctx) / shakeOffset |
| src/title.js | ~100 | 레트로 타이틀 화면 | draw(ctx,size,HUD_H,FOOT_H,meta,now): 밴드 배경·별·벽돌·로고·퍼레이드·PRESS ANY KEY / hit → start|shop|sound |
| src/audio.js | ~140 | Web Audio 효과음 + 타이틀 BGM | unlock / play(name) / startBgm / stopBgm / setMuted. sfx: slide mergeWeapon mergeMonster potion coin kill damage heal floor boss pick dead tap start. BGM: TRACKS.title(132bpm 드럼 있음) / TRACKS.game(96bpm 아르페지오, 볼륨 절반). startBgm(name) 은 같은 트랙이면 no-op, 0.6초 페이드인 |
| src/board.js | ~165 | 순수 보드 로직 (DOM 없음) | combine(a,b) 합치기·전투 규칙 L25-60 / slideLine L63-95 (dests·merged 반환) / slide(grid,dir) L98-140 (moves: id→{tile,from,to}) / canMove / randomTile / spawn |
| src/rules.js | ~85 | HP·층·퍽 효과 | isBossFloor / spawnMods(perks) / applyEvents(stats, events, perks) → {msgs, floorUp} / applyPerkInstant / rollChoices / coinsOnBoard |
| src/meta.js | ~50 | localStorage 세이브 + 유물 구매 | load / get / onRunEnd / has / canBuy / buy. 키 `merge-dungeon-save`, version 1, relics는 {id:1} 맵 |
| src/run.js | ~120 | 런 상태 머신 (playing/choose/dead) | newRun (유물 적용) / snapshot·undo L20-35 / move L38-65 (보스 틱) / onFloorUp (tidy, 보스 등장, 선택지) / choose / endRun |
| src/render.js | ~420 | Canvas 그리기 | HUD_H=100: 층·처치·● 지갑(meta+run)·♪ 음소거(hitMute)·↶ 되감기 / HP 바 / 층 진행 바(xpBar, 보스 층은 보라) / init/resize / drawHUD / drawTile / drawTiles (슬라이드 보간·팝) / drawToasts / 퍽 배지+툴팁 drawFooter·hitPerk L120-165 / drawChoose·hitChoice / button·inRect 유틸 / 타이틀 drawTitle·hitTitle / 상점 drawShop·hitShop / drawUndo·hitUndo / drawDead(레트로: 비네트·GAME OVER 픽셀 로고·해골·카운트업·NEW BEST·재 파티클)·hitDead / draw |
| src/input.js | ~45 | 키보드·스와이프·탭·호버 | init(canvas, {onAnyKey, onDir, onRestart, onChoice, onUndo, onMute, onHover, onTap}). 키: 방향키/WASD, R, 1-3, Z, M |
| src/guide.js | ~70 | 항상 보이는 게임 설명 사이드바 (DOM, en/ko) | render(): 스프라이트 아이콘 + 문장 8줄 + 키 안내. 760px 이하는 ? 버튼 오버레이 |
| src/main.js | ~55 | 화면 라우터 (title/shop/game), rAF 루프 | startRun, MD.debug |
| index.html | ~55 | 진입점, canvas + #guide 사이드바 스타일(@media 760px) | — |

## 규칙 요약 (board.combine)
- weapon+weapon 같은 Lv → Lv+1 (최대 6). monster도 동일.
- potion+potion → 즉시 HP +3, 타일 소멸 (bigpotion 스프라이트는 남아 있지만 미사용).
- coin+coin → 값 합산. 값이 COIN_BANK(4) 이상이면 'bank' 이벤트: stats.coins 에 적립, 타일 소멸. 런 종료 시 stats.coins + 보드 잔여 코인이 지갑으로.
- weapon vs monster: 무기 Lv ≥ 몬스터 Lv → 처치 (같으면 무기도 소멸, 크면 무기 유지). 작으면 차이만큼 HP 감소, 무기 소멸, 몬스터 유지.
- 한 슬라이드에서 한 타일은 한 번만 합쳐진다 (2048과 동일).

## 보스·퍽 (M1 후반 + M2 전반, 세션 1에서 완료)
- 5층마다 보스(lv 3+floor/5). 보스 층은 처치 수 무시, 보스 격파로만 진행. 보스가 보드에 있으면 매 이동 HP -1.
- 층 클리어 시 PERKS 13개 중 3개 제시(최대 레벨 제외), 1개 선택 → run.perks[id] = 레벨 (1~PERK_MAX=3).
- 레벨 → 수치 변환은 rules.effects(perks, relics) 한 곳. 적용 지점: spawnMods(sharp·forge·greed), applyEvents(hide·alchemist·vampire·hunter), run.move(ward), run.mercy, run.onFloorUp(tidy·armory), run.endRun(miser), applyPerkInstant(vigor).
- 선택 카드는 다음 레벨 설명(desc[lv-1])을, 푸터 배지 툴팁은 현재 레벨 설명을 보여준다.
- render.js: drawChoose / choiceRects / hitChoice. 키 1~3 또는 탭.

## 진화 (세션 1 후반)
- config.EVOLVE 7개: from=[a,b] 둘 다 Lv2 이상이 되는 순간 rules.tryEvolve 가 둘을 지우고 진화 퍽(Lv=PERK_MAX)을 넣는다. run.choose 에서 호출, run.evolved={ev,t0} → render.drawEvolved 2.6초 연출(1.5초 입력 차단).
- 효과는 rules.effects 의 E(id) 플래그로: masterwork(weaponMinLv·weaponLv3), ironbody(dmgCap·hpBonus), reaper, purifier(run.move 에서 heal 시 몬스터 추방), midas(coinBank=0 즉시 적립), bastion(run.mercy 무제한), sanctuary.
- 선택 카드: wouldEvolve → 금색 EVOLVE 태그 + "A + B → C" 힌트, 짝만 있으면 PAIR 태그. 진화 재료 퍽은 rollChoices 에서 제외.

## 테마 (세션 1 후반)
- config.THEMES 6개(2층마다 순환) + THEME_THRONE(보스 층). themeFor(floor). render.setTheme 가 body 배경까지 바꿈. 셀은 bevel + specks(테마 색 점).
- 층 클리어 시 kind:'theme' 토스트로 테마 이름.

## 픽셀 UI (세션 1 후반)
- render.ptext(text,x,y,px,color,align,opts): pixfont.supports 면 픽셀 폰트, 아니면(한글) 시스템 폰트. GOLD 그라데이션 함수.
- bevel() 로 HP/XP 바, 타일, 배지, 선택 카드 모두 픽셀 베벨. fx.floater 도 픽셀 폰트.

## v2.0 — 살아 있는 보드 (세션 1 후반)
- 룬 타일: board.makeRune(id), type 'rune', rune: bomb|mirror|anvil. combine 에서 룬 충돌 → events {kind:'rune', rune, copy?} (at = 룬이 있던 칸). run.move 가 applyEvents 전에 폭탄(주변 8칸 몬스터 → kill 이벤트)/거울(복제 place) 처리. 런 시작 시 1개 배치(run.rune).
- 엘리트: config.ELITE_FROM(10층)부터 ELITE_CHANCE(15%) 몬스터가 +1Lv, tile.elite=true. 처치 시 ELITE_COINS(3) 즉시 적립. 렌더: 빨간 * 마크.
- 후반 벽: monsterMinLv 4층마다.
- 콤보: rules.applyEvents 가 처치 있는 슬라이드마다 stats.combo++, 없으면 0. COMBO_MIN(3)부터 toast kind 'combo'(n 커질수록 글자 크고 흔들림) + COMBO_COIN 적립. 한 슬라이드 2처치 이상 'multi'.
- 타일 2프레임: sprites.FRAMES2(monster·boss·potion·coin·weapon), bake(type,lv,frame), render.drawTile 이 id 위상으로 550ms 교대.
- 사망 화면: BEST COMBO · EVOLUTIONS n/7(meta.codex, 진화 시 기록) · NEXT GOAL: REACH FLOOR (prevBest+1). 버튼·결과 줄 픽셀 폰트.
- 사이드바(guide.js) 제거 → dist/guide.js.unused.

## v2.1 — 매 런이 다르다 (세션 1 후반)
- 영웅: config.HEROES 5명 {hp, unlock{stat,n}, desc, sprite}. board.combine(a,b,{hero}) — rogue(같은 Lv 전투에서 무기 유지), alchemist(potion+potion→bigpotion, bigpotion+potion→heal 7). rules.effects(perks,relics,hero,route): alchemist 무기 -10, necromancer 물약 0·코인 +15·necro 0.5(run.move 에서 both-vanish 자리에 Lv1 무기), merchant coinBank 2 + run.newRun 에서 유물 대여('loan').
- 해금: meta.heroUnlocked(id) — bestFloor / stats.potionsUsed / stats.totalCoins / stats.bossKills. 세이브 v2 (meta.migrate): stats, heroBest, hero.
- 분기: rules.isBranchFloor (4,7,13,… 보스 층 제외). run.afterChoose → phase 'branch', run.chooseBranch → run.route 'risky'(3층, monsterLv+1, coin×2) | 'treasure'(1층, 몬스터 0·물약/코인 +25, TREASURE_MOVES 15턴 후 자동 클리어). HUD 에 DARK PATH / TREASURE n 태그.
- 보스 컷신: run.cutscene {t0,name,lv} → render.drawCutscene 2.2초(보스 낙하+흔들림+이름). config.BOSSES 6종 bossName(floor). 보스 생존 중 BGM 'boss'.
- 영웅 스프라이트: sprites.HERO_MAPS 5종(16×16 2등신), heroFrame(map, frame): 0 idle / 1 숨쉬기(1px 하강) / 2 공격(2px 전진). sprites.hero(id, frame). HUD 왼쪽 초상화 render.drawHero — run.heroAnim {state: attack|hurt|heal, t0} (consumeFx 가 설정) 로 번쩍·흔들림·틴트 + 처치 시 fx.duel(stage, monsterSprite, boss, color): 초상화 '무대'(폭 76) 안으로 몬스터가 오른쪽에서 미끄러져 들어오고(0.18s) 영웅이 공격 프레임으로 베고(0.3s) 몬스터가 파편으로 터짐. fx.drawDuel 은 render.drawHero 의 클립 안에서 호출. 영웅 선택·타이틀 행렬에도 등장.
- 화면: screen 'heroes'(drawHeroes/hitHeroes, Enter 로 현재 영웅 시작) · 'codex'(진화 도감 + 통계). 타이틀 버튼: RELICS / CODEX / EN·한 / ♪. PRESS ANY KEY → 영웅 선택.

## v2.2 — 분위기와 리턴 (세션 2)
- 제물 제단: rules.isAltarFloor (4,9,14…). run.afterChoose → phase 'altar' (분기보다 먼저), run.chooseAltar: blood(HP 3 → 무작위 일반 퍽 Lv+1, 진화 체크) / gold(코인 40 → undoLeft+1, 런 코인 우선) / refuse. render.drawAltar 촛불 연출.
- 숨겨진 진화: config.HIDDEN_EVOLVE 2종(from = 진화 퍽 둘): godslayer(board.combine opts.godslayer — 무기가 모든 몬스터 처치, 보스는 wounded 1회 후 처치), immortal(rules.applyEvents 에서 층당 1회 HP 1 보존, stats.immortalUsed). 기록 화면에 보라 '? ? ?' + hint.
- 데일리: run.newRun(null, true) — run.seeded(mulberry32) + dailySeed(FNV of YYYY-MM-DD). rng 가 spawn/place/rollChoices 에 전달. 영웅 Knight 고정. meta.daily[key] = {floor,kills} 최근 30일, render.drawDaily 막대 그래프. 타이틀 DAILY 버튼.
- 환경 효과: render.ambient(now) 테마별 fx.drift (상한 80): moss 포자, frost 눈, ember 불씨(상승), void 별가루, gold 먼지, throne 붉은 조각, stone 횃불 광원 2개. HP ≤ 3 이면 심장박동 붉은 비네트.
- BGM 변주: audio.VARIANTS[themeId] 가 TRACKS.game 의 악기/템포를 덮어씀. main.frame 이 startBgm('game', themeId).

## v3.0 (1/2) — 몬스터 가족·보스 기믹·도감 (세션 2)
- 가족: config.FAMILIES 7(slime 기본 + 테마별 6). rules.familyFor(floor) = 테마의 가족. run.move 가 spawnMods 에 mods.family 를 얹고 board.randomTile 이 FAMILY_CHANCE(45%) 로 tile.fam 부여 (imp 는 +1Lv, mimic 은 type 'coin' + mimic/mlv). 같은 가족끼리 합쳐야 가족 유지.
- 버릇: run.monsterTurn(run, s) — 스폰 뒤 호출. wisp 처치 → 그 칸 무기 frozen=2 / shroom 처치 → 인접 포자 / bat 2턴마다 인접 빈 칸 이동 / shade 2턴마다 +1Lv / mimic 은 board.combine(coin+coin) 에서 정체 → monster.
- 얼음: tile.frozen>0 이면 board.slideLine 이 벽으로 취급(구간 분할). run.move 시작 시 frozen-1.
- 보스 기믹: config.BOSS_GIMMICK 순서 = BOSSES 순서. boss.gimmick, run.bossSince. summon(3턴 Lv1 슬라임) / spores(등장 시 포자 2) / freeze(매 턴 무기 하나) / fire(2턴마다 타일 -1Lv) / devour(4턴마다 약한 타일 삼킴) / idol(무기 무효, 코인 3개 — board.combine 에서 hits 감소). 컷신에 BOSS_HINT, 보스 팔레트 PAL.boss[기믹 인덱스+1].
- 도감: meta.bestiary['fam-lv'] (rules.applyEvents 의 kill 에서 recordKill). 10마리 이상이면 숙련 → 처치 시 코인 +1. 기록 화면 탭 EVOLUTIONS / BESTIARY (render.drawBestiary 7×6 격자).
- 배경: render.drawBackdrop — 테마별 2px 패턴을 오프스크린 캔버스에 한 번 굽고 매 프레임 drawImage.

## v3.0 (2/2) — 업적·칭호·기록 탭 (세션 3)
- src/achievements.js (~110줄, run.js 다음에 로드): MD.ach.LIST 40개 {id, tier, name, desc, test(c), title?}. 동 15(코인 +10) / 은 16 / 금 9 (은·금은 전부 칭호). context(run) = 세이브 누적 + 진행 중 런 값 스냅숏. check(run) 이 새 달성을 저장·보상하고 런 중이면 toast kind 'feat' + sfx 'feat', run.feats 에 기록.
- check 호출 지점: run.move 끝 / choose / chooseBranch / chooseAltar / endRun(onRunEnd 전후 2회) / main 의 유물 구매 뒤.
- 런 카운터: stats.damageTaken·elites·mimics·maxMulti (rules.applyEvents), run.runesUsed·riskyTaken·treasureTaken·altarOffers·evoCount·bossTypes·maxWeapon (run.js / ach.context).
- 칭호: meta.title = 업적 id. MD.ach.equip(id) 토글, titleText(). 타이틀 화면 영웅 이름 앞에 표시.
- 세이브 v3: meta.migrate v2→v3 (bestiary, achievements, title, stats.kills/mimics). 기존 세이브는 첫 check(null) 에서 소급 달성.
- 기록 화면: codexTab 0~3 (i18n recTabs: EVOLVE/BEASTS/FEATS/STATS). drawFeats 8개씩 5쪽(featPage, < > 버튼, 행 탭 = 칭호 장착), drawStats 9줄 + 영웅별 최고 층.
- 업적 배너: render.drawToasts 에서 kind 'feat' 는 2.4초, 보드 상단 금색 배너. 사망 화면에 '이번 판 업적' 한 줄.
- 보드 프레임: 네 모서리 꺾쇠 + 테마 색 보석.
- MD.debug.goto(screen) — 스크린샷 테스트용.

## 유물 상점 (M2 후반, 세션 1에서 완료)
- 타이틀 화면 → 던전 입장 / 유물 상점. RELICS 5개, 각 1회 구매, 코인은 런 종료 시 보드 잔여 코인.
- 적용 지점: run.newRun (bigheart, startweapon, rewind→undoLeft), rules.spawnMods (sharpener, luckypouch).
- 랜덤 플레이 기준 런당 ~12코인. 상점 전체 1050코인.

## 픽셀 아트·사운드 (M3, 세션 1에서 완료)
- 스프라이트는 PNG 없이 코드에 문자 맵으로. 외곽선 k, 레벨 팔레트 a/b/c. 정수 배율로 drawImage(imageSmoothing off).
- 이펙트 파이프라인: board.slide 이벤트에 at=[r,c] → run.move 가 run.fxQueue 에 {t0, events, msgs} 푸시 → render.consumeFx 가 슬라이드 끝에 파티클·슬래시·떠오르는 숫자·효과음(종류별, 45ms 간격) 실행. 위치 없는 msgs(보스 틱, 층)는 중앙 토스트.
- BGM은 main.frame 이 화면에 맞춰 매 프레임 startBgm('title'|'game') 호출(오디오 unlock 후), 사망 화면은 stopBgm. 음소거 ♪ 버튼(meta.muted), 언어 EN/한 버튼(meta.lang, 기본 en).

## 아직 없음 (다음 단계)
- 튜토리얼 첫 실행 안내, GamePix 제출 패키징 (M4)

## 테스트
`node` 로 config/board/rules 를 로드해 slideLine/slide/applyEvents 단언 + 300회 랜덤 플레이. (세션 1에서 통과)

## loop/ 와 tests/ (작업 방식)
- `loop/LOOP.md` 작업 규칙(먼저 읽기), `loop/STATUS.md` 현재 위치, `loop/INBOX.md` Jake의 요구, `loop/tasks/<ID>.md` 작업 계약과 결과, `loop/LOG.md` 실행 기록.
- `loop/guard.js` 한도 가드(모델 호출 없음), `loop/limits.json` 한도, `loop/guard.test.js` 종료 조건 모의 실행. 멈추려면 `loop/STOP` 파일을 만든다.
- `loop/profiles/gamepix.md` 플랫폼 점검, `loop/champion/` 최고 후보, `loop/reference/` 참고 화면 (아트 작업용).
- `tests/run.sh p0|p1|full` 검사 실행기. browser.js(부팅, 오류, 외부 통신, 완주), achievements.js(저장 이전, 업적), balance.js(실력 차, 느림). 로그는 `tests/logs/`.
- loop/ 와 tests/ 는 게임 zip에 넣지 않는다.

## proto/ (리부트 원형, 기존 게임과 분리)
- `proto/core.js` Forge & Duel 순수 규칙: 보드는 아이템만(검 S, 방패 H, 물약 P, 동전 C), 밀기 = 한 턴, 누르기 = 사용, 몬스터 예고(timer). 수치는 CFG.
- `proto/index.html` 회색 상자 화면 (DOM, 그림 없음). 공개 아티팩트로도 올림.
- `tests/proto-sim.js` 무작위/연타/신중 플레이 도달 방 수, `tests/proto-browser.js` 부팅과 한 판 완주.
