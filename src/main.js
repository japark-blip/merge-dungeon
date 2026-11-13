// Merge Dungeon — 조립. screen: 'title' | 'shop' | 'game'
(function () {
  const canvas = document.getElementById('game');
  MD.render.init(canvas);
  MD.meta.load();
  MD.audio.setMuted(!!MD.meta.get().muted);
  MD.i18n.setLang(MD.meta.get().lang || 'en');
  let screen = 'title';
  let run = null;

  const startRun = (heroId) => { if (heroId) { MD.meta.get().hero = heroId; MD.meta.persist(); } MD.audio.play('start'); run = MD.run.newRun(MD.meta.get().hero); screen = 'game'; };
  const goHeroes = () => { screen = 'heroes'; MD.audio.play('tap'); };
  const goTitle = () => { screen = 'title'; };
  const toggleMute = () => { const m = MD.meta.get(); m.muted = !m.muted; MD.meta.persist(); MD.audio.setMuted(m.muted); MD.audio.play('tap'); };

  MD.input.init(canvas, {
    onAnyKey: (k) => { if (screen === 'title' && k !== 'm' && k !== 'M') goHeroes(); else if (screen === 'heroes' && k === 'Enter') startRun(); },
    onDir: (d) => { if (screen !== 'game') return; if (run.tutorial) { MD.run.dismissTutorial(run); return; } MD.run.move(run, d); },
    onRestart: () => { if (screen === 'game') startRun(); },
    onChoice: (i) => { if (screen !== 'game') return; if (run.phase === 'branch') MD.run.chooseBranch(run, i); else if (run.phase === 'altar') MD.run.chooseAltar(run, i); else MD.run.choose(run, i); },
    onUndo: () => { if (screen === 'game') MD.run.undo(run); },
    onMute: toggleMute,
    onHover: (x, y) => {
      if (screen !== 'game') return;
      const id = MD.render.hitPerk(run, x, y); if (id) run.tip = { id, t0: performance.now() };
    },
    onTap: (x, y) => {
      if (screen === 'title') {
        const h = MD.render.hitTitle(x, y);
        if (h === 'start') goHeroes();
        else if (h === 'codex') { MD.audio.play('tap'); screen = 'codex'; }
        else if (h === 'daily') { MD.audio.play('tap'); screen = 'daily'; }
        else if (h === 'shop') { MD.audio.play('tap'); screen = 'shop'; }
        else if (h === 'lang') { const m = MD.meta.get(); m.lang = MD.i18n.getLang() === 'en' ? 'ko' : 'en'; MD.meta.persist(); MD.i18n.setLang(m.lang); MD.audio.play('tap'); }
        else if (h === 'sound') toggleMute();
        return;
      }
      if (screen === 'heroes') {
        const h = MD.render.hitHeroes(x, y);
        if (!h) return;
        if (h.back) { MD.audio.play('tap'); screen = 'title'; }
        else if (MD.meta.heroUnlocked(h.hero)) startRun(h.hero);
        else MD.audio.play('tap');
        return;
      }
      if (screen === 'daily') {
        const h = MD.render.hitDaily(x, y);
        if (h === 'back') { MD.audio.play('tap'); screen = 'title'; }
        else if (h === 'play') { MD.audio.play('start'); run = MD.run.newRun(null, true); screen = 'game'; }
        return;
      }
      if (screen === 'codex') {
        const h = MD.render.hitCodex(x, y);
        if (h && h.back) { MD.audio.play('tap'); screen = 'title'; } else if (h && h.tab != null) MD.audio.play('tap'); else if (h && h.equip) MD.audio.play('pick');
        return;
      }
      if (screen === 'shop') {
        const h = MD.render.hitShop(x, y);
        if (!h) return;
        if (h.back) { MD.audio.play('tap'); screen = 'title'; } else if (MD.meta.buy(h.buy)) { MD.audio.play('coin'); if (MD.ach.check(null).length) setTimeout(() => MD.audio.play('feat'), 250); }
        return;
      }
      if (run.tutorial) { MD.run.dismissTutorial(run); MD.audio.play('tap'); return; }
      if (run.phase === 'dead') {
        const h = MD.render.hitDead(x, y);
        if (h === 'retry') startRun(); else if (h === 'menu') goTitle();
      } else if (run.phase === 'altar') {
        const i = MD.render.hitAltar(x, y); if (i >= 0) MD.run.chooseAltar(run, i);
      } else if (run.phase === 'branch') {
        const i = MD.render.hitBranch(x, y); if (i >= 0) MD.run.chooseBranch(run, i);
      } else if (run.phase === 'choose') {
        const i = MD.render.hitChoice(x, y); if (i >= 0) MD.run.choose(run, i);
      } else {
        if (MD.render.hitUndo(x, y)) { MD.run.undo(run); return; }
        if (MD.render.hitMute(x, y)) { toggleMute(); return; }
        const id = MD.render.hitPerk(run, x, y); if (id) run.tip = { id, t0: performance.now() };
      }
    },
  });

  function frame(now) {
    const meta = MD.meta.get();
    // 화면별 BGM (오디오가 unlock 된 뒤부터; 매 프레임 호출해도 같은 트랙이면 no-op)
    if (MD.audio.ready()) {
      if (screen === 'game' && run.phase === 'dead') MD.audio.stopBgm();
      else MD.audio.startBgm(screen === 'game' ? (run.stats.bossAlive ? 'boss' : 'game') : 'title', screen === 'game' ? MD.CONFIG.themeFor(run.stats.floor).id : null);
    }
    if (screen === 'title') MD.render.drawTitle(meta, now);
    else if (screen === 'heroes') MD.render.drawHeroes(meta, now);
    else if (screen === 'codex') MD.render.drawCodex(meta, now);
    else if (screen === 'daily') MD.render.drawDaily(meta, now);
    else if (screen === 'shop') MD.render.drawShop(meta);
    else MD.render.draw(run, meta, now);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // 디버그용 (콘솔에서 MD.debug.run 으로 상태 확인)
  MD.debug = { get run() { return run; }, get screen() { return screen; }, startRun, goto: (sc) => { screen = sc; } };
})();
