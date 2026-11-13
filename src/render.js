// Merge Dungeon — Canvas 렌더. M0/M1: 색 도형 + 글자. M3에서 스프라이트로 교체.
window.MD = window.MD || {};
(function () {
  const C = MD.CONFIG;
  const HUD_H = 104, FOOT_H = 70, PAD = 12;
  const COLORS = {
    bg: '#1b1a2e', board: '#2a2944', cell: '#35345a', ink: '#f2efe9', dim: '#9a97b8',
    weapon: '#4f8dfd', monster: '#e45b5b', boss: '#8e2bd1', potion: '#56c271', bigpotion: '#2f9d55', coin: '#f3c74f',
    hp: '#e45b5b', hpBg: '#4a2a3a', card: '#35345a', cardEdge: '#6c69a6',
  };
  const SYMBOL = { weapon: '⚔', monster: '☠', boss: '👑', potion: '♥', bigpotion: '♥', coin: '●' };

  let canvas, ctx, size = 320, dpr = 1;

  function init(c) {
    canvas = c; ctx = c.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }
  function resize() {
    size = Math.min(window.innerWidth * 0.92, 440, (window.innerHeight - 24) - HUD_H - FOOT_H);
    dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    canvas.style.width = size + 'px';
    canvas.style.height = (size + HUD_H + FOOT_H) + 'px';
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round((size + HUD_H + FOOT_H) * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
  }
  function cellSize() { return (size - PAD * 2 - (C.BOARD - 1) * 8) / C.BOARD; }
  function cellXY(r, c) {
    const cs = cellSize();
    return { x: PAD + c * (cs + 8), y: HUD_H + PAD + r * (cs + 8), cs };
  }
  function rrect(x, y, w, h, rad) {
    ctx.beginPath();
    ctx.moveTo(x + rad, y); ctx.arcTo(x + w, y, x + w, y + h, rad); ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad); ctx.arcTo(x, y, x + w, y, rad); ctx.closePath();
  }

  // 픽셀 폰트 텍스트. 지원하지 않는 글자(한글 등)가 있으면 시스템 폰트로. y = 세로 중앙.
  function ptext(text, x, y, px, color, align, opts) {
    align = align || 'left';
    const P = MD.pixfont;
    if (P.supports(text)) {
      const w = P.width(text, px);
      const x0 = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
      P.draw(ctx, text, Math.round(x0), Math.round(y - 3.5 * px), px, color, opts || {});
      return w;
    }
    ctx.font = `bold ${Math.round(px * 7.5)}px system-ui, sans-serif`; ctx.textAlign = align; ctx.textBaseline = 'middle';
    ctx.fillStyle = typeof color === 'function' ? color(2) : color; ctx.fillText(text, x, y);
    return ctx.measureText(text).width;
  }
  const GOLD = (ry) => ['#fff1b0', '#ffe27a', '#f7c948', '#f7c948', '#e0a52f', '#c98a17', '#a86d0e'][ry];

  // 픽셀 베벨 상자: 바깥 어두운 테두리, 안쪽 밝은 윗면
  function bevel(x, y, w, h, fill, hi, lo, px) {
    px = px || 2;
    ctx.fillStyle = lo; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = fill; ctx.fillRect(x + px, y + px, w - px * 2, h - px * 2);
    ctx.fillStyle = hi; ctx.fillRect(x + px, y + px, w - px * 2, px); ctx.fillRect(x + px, y + px, px, h - px * 2);
  }
  let theme = C.THEMES[0];
  function setTheme(t) {
    if (theme === t) return;
    theme = t;
    document.body.style.background = t.bg;
  }
  // 셀 장식 점: 셀/테마별로 고정된 의사난수 위치
  function specks(x, y, cs, r, c) {
    let seed = (r * 7 + c * 13 + theme.id.length * 31) | 0;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    ctx.fillStyle = theme.speck; ctx.globalAlpha = 0.35;
    for (let i = 0; i < 4; i++) { const sx = x + 6 + rnd() * (cs - 12), sy = y + 6 + rnd() * (cs - 12); ctx.fillRect(Math.round(sx), Math.round(sy), 2, 2); }
    ctx.globalAlpha = 1;
  }

  // ---------- 영웅 초상화 (HUD 왼쪽): 숨쉬기 / 공격 / 피격 / 회복 ----------
  function drawHero(run, now) {
    const a = run.heroAnim, t = a ? now - a.t0 : 1e9;
    const sp = 3, sw = 16 * sp, SW = sw + 28; // 무대는 초상화보다 넓다 (몬스터가 들어올 자리)
    const d = MD.fx.activeDuel();
    let frame = Math.floor(now / 600) % 2, dx = 0, dy = 0;
    if (a && a.state === 'hurt' && t < 300) { dx = Math.sin(t / 25) * 3; }
    bevel(PAD - 2, 6, SW + 4, sw + 4, theme.cellLo, theme.cellHi, '#0f0e1c');
    // 무대 바닥선
    ctx.fillStyle = theme.cellHi; ctx.fillRect(PAD + 2, 6 + sw - 4, SW - 4, 2);
    ctx.save(); ctx.beginPath(); ctx.rect(PAD, 8, SW, sw); ctx.clip();
    let attacking = false;
    if (d) attacking = MD.fx.drawDuel(ctx, d);
    if (attacking) { frame = 2; dx = 5; }
    const x = PAD + dx, y = 8 + dy;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(MD.sprites.hero(run.hero, frame), Math.round(x), Math.round(y), sw, sw);
    if (attacking && d.age < 0.42) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.globalAlpha = 1 - (d.age - 0.18) / 0.24; ctx.beginPath(); ctx.moveTo(x + sw - 6, y + 8); ctx.lineTo(x + sw + 14, y + sw - 12); ctx.stroke(); ctx.globalAlpha = 1; }
    ctx.restore();
    if (a && t < 300) {
      // 상태 틴트: 공격 흰 번쩍, 피격 붉게, 회복 초록
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = a.state === 'attack' ? `rgba(255,255,255,${0.6 * (1 - t / 300)})` : a.state === 'hurt' ? `rgba(228,91,91,${0.7 * (1 - t / 300)})` : `rgba(86,194,113,${0.6 * (1 - t / 300)})`;
      ctx.fillRect(x, y, sw, sw);
      ctx.globalCompositeOperation = 'source-over';
      if (a.state === 'attack' && t < 120) MD.fx.slash(PAD + sw + 6, 8 + sw / 2, 14);
    }
  }

  function drawHUD(run, meta, now) {
    const s = run.stats;
    const boss = MD.rules.isBossFloor(s.floor);
    drawHero(run, now);
    const L = PAD + 16 * 3 + 28 + 10; // 무대 오른쪽부터
    // 1행: FLOOR n · 테마 이름 · 코인
    ptext(MD.t('floor', s.floor), L, 20, 3, GOLD, 'left', { shadow: 1 });
    const coinStr = `${meta.coins + s.coins}`;
    ptext(coinStr, size - PAD, 20, 2, COLORS.coin, 'right', { shadow: 1 });
    ctx.imageSmoothingEnabled = false;
    const coinLeft = size - PAD - MD.pixfont.width(coinStr, 2) - 26;
    ctx.drawImage(MD.sprites.bake('coin', 1), coinLeft, 10, 20, 20);
    // 테마 이름: 남는 폭이 있을 때만
    const tx = L + MD.pixfont.width(MD.t('floor', s.floor), 3) + 12, tname = MD.L(theme.name);
    const btnLeft = coinLeft - 8 - 36 - 6 - (run.relics && run.relics.rewind ? 42 : 0);
    const routeTag = run.route === 'risky' ? 'DARK PATH' : run.route === 'treasure' ? `TREASURE ${C.TREASURE_MOVES - run.treasureMoves}` : '';
    const avail = btnLeft - tx - 8;
    const fits = (txt) => MD.pixfont.supports(txt) ? MD.pixfont.width(txt, 1.5) <= avail : true;
    if (routeTag) { const both = `${tname} / ${routeTag}`; ptext(fits(both) ? both : routeTag, tx, 21, 1.5, run.route === 'risky' ? '#ff8a8a' : COLORS.coin, 'left'); }
    else if (fits(tname)) ptext(tname, tx, 21, 1.5, COLORS.dim, 'left');
    drawUndo(run);
    drawMute(meta);
    // HP bar (베벨)
    const bx = L, by = 38, bw = size - L - PAD, bh = 20;
    bevel(bx, by, bw, bh, COLORS.hpBg, '#5e3a4a', '#0f0e1c');
    if (s.hp > 0) { ctx.fillStyle = COLORS.hp; ctx.fillRect(bx + 2, by + 2, Math.max(4, (bw - 4) * s.hp / s.maxHp), bh - 4); ctx.fillStyle = '#ff8a8a'; ctx.fillRect(bx + 2, by + 2, Math.max(4, (bw - 4) * s.hp / s.maxHp), 2); }
    ptext(`HP ${s.hp}/${s.maxHp}`, size / 2, by + bh / 2, 2, COLORS.ink, 'center', { shadow: 1 });
    // 층 진행 바
    const xy = by + bh + 6, xh = 16;
    const need = C.killsNeeded(s.floor), frac = boss ? (s.bossAlive ? 1 : 0) : Math.min(1, s.kills / need);
    bevel(bx, xy, bw, xh, '#242340', '#34335a', '#0f0e1c');
    if (frac > 0) { ctx.fillStyle = boss ? COLORS.boss : '#4f8dfd'; ctx.fillRect(bx + 2, xy + 2, Math.max(4, (bw - 4) * frac), xh - 4); ctx.fillStyle = boss ? '#d9a3ff' : '#a9c8ff'; ctx.fillRect(bx + 2, xy + 2, Math.max(4, (bw - 4) * frac), 2); }
    if (!boss) { ctx.fillStyle = 'rgba(15,14,28,0.7)'; for (let i = 1; i < need; i++) ctx.fillRect(Math.round(bx + 2 + ((bw - 4) * i) / need) - 1, xy + 2, 2, xh - 4); }
    ptext(boss ? MD.t('bossBar') : MD.t('xpBar', s.kills, need, s.floor + 1), size / 2, xy + xh / 2, 1.5, COLORS.ink, 'center', { shadow: 1 });
  }

  // ---------- 음소거 버튼 (HUD, 되감기 왼쪽) ----------
  function muteRect() { const cw = 26 + MD.pixfont.width(`${(MD.meta.get().coins) + ((MD.debug && MD.debug.run && MD.debug.run.stats.coins) || 0)}`, 2); return { x: size - PAD - cw - 8 - 36, y: 8, w: 36, h: 24 }; }
  function drawMute(meta) {
    const r = muteRect();
    button(r.x, r.y, r.w, r.h, '♪', COLORS.card);
    if (meta.muted) { ctx.strokeStyle = COLORS.dim; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(r.x + 8, r.y + r.h - 5); ctx.lineTo(r.x + r.w - 8, r.y + 5); ctx.stroke(); }
  }
  function hitMute(px, py) { return inRect(muteRect(), px, py); }

  // 타일 바탕색: 종류별 은은한 틴트 (스프라이트가 주인공)
  const TILE_BG = { weapon: '#2f3a5e', monster: '#4a2e3a', boss: '#3b2250', potion: '#2a4336', bigpotion: '#4a2a34', coin: '#4a4028', rune: '#2a2340' };

  const TILE_HI = { weapon: '#44508a', monster: '#6a4050', boss: '#58347a', potion: '#3a5c4a', bigpotion: '#4a2a34', coin: '#6a5a38', rune: '#4a4070' };
  function drawTile(t, x, y, cs, scale, now) {
    const w = cs * scale, h = cs * scale, ox = x + (cs - w) / 2, oy = y + (cs - h) / 2;
    bevel(Math.round(ox), Math.round(oy), Math.round(w), Math.round(h), TILE_BG[t.type] || COLORS.cell, TILE_HI[t.type] || COLORS.cell, '#0f0e1c', 2);
    // 픽셀 스프라이트: 정수 배율로 또렷하게
    const px = Math.max(2, Math.floor((cs * 0.78) / 16)) * scale;
    const sw = 16 * px, sx = ox + (w - sw) / 2, sy = oy + (h - sw) / 2 - h * (t.type === 'rune' ? 0.1 : 0.04);
    ctx.imageSmoothingEnabled = false;
    // 2프레임 호흡: 타일마다 위상이 다르게
    const frame = MD.sprites.hasFrames(t.type) ? Math.floor(((now || 0) + t.id * 137) / 550) % 2 : 0;
    if (t.type === 'boss') ctx.drawImage(MD.sprites.bake('boss', 1 + Math.max(0, C.BOSS_GIMMICK.indexOf(t.gimmick)), frame), sx, sy, sw, sw);
    else ctx.drawImage(MD.sprites.get(t, frame), sx, sy, sw, sw);
    if (t.frozen) { ctx.fillStyle = 'rgba(159,211,255,0.35)'; ctx.fillRect(Math.round(ox) + 2, Math.round(oy) + 2, Math.round(w) - 4, Math.round(h) - 4); ctx.strokeStyle = '#dff3ff'; ctx.lineWidth = 2; ctx.strokeRect(Math.round(ox) + 3, Math.round(oy) + 3, Math.round(w) - 6, Math.round(h) - 6); }
    if (t.type === 'boss' && t.gimmick === 'idol') { const lp = Math.max(1, Math.round(1.5 * scale)); ptext('●'.repeat(t.hits || C.IDOL_HITS).replace(/●/g, '*'), ox + 8 * scale, oy + 9 * scale, lp, COLORS.coin, 'left', { outline: '#0f0e1c' }); }
    if (t.elite) { ptext('*', ox + 8 * scale, oy + 9 * scale, Math.max(1, Math.round(2 * scale)), '#ff6b6b', 'center', { outline: '#0f0e1c' }); }
    if (t.type === 'rune') {
      // 맥동하는 테두리 + 이름 라벨: 일반 타일과 다른 '장치'임을 보여준다
      const RC = { bomb: '#ff8c3a', mirror: '#9fd3ff', anvil: '#eef2f6' };
      const pulse = 0.5 + 0.5 * Math.sin((now || 0) / 180);
      ctx.strokeStyle = RC[t.rune]; ctx.globalAlpha = 0.35 + 0.65 * pulse; ctx.lineWidth = 2;
      ctx.strokeRect(Math.round(ox) + 3, Math.round(oy) + 3, Math.round(w) - 6, Math.round(h) - 6); ctx.globalAlpha = 1;
      const lp = Math.max(1, Math.round(1.5 * scale));
      const name = t.rune.toUpperCase();
      const lw = MD.pixfont.width(name, lp) + 6 * lp;
      ctx.fillStyle = '#0f0e1c'; ctx.fillRect(Math.round(ox + (w - lw) / 2), Math.round(oy + h - 9 * lp - 3), lw, 9 * lp);
      ptext(name, ox + w / 2, oy + h - 4.5 * lp - 3, lp, RC[t.rune], 'center');
    }
    // 레벨/값 라벨 (우하단 작은 알약)
    const label = t.type === 'coin' ? `${t.val}` : (t.type === 'potion' || t.type === 'bigpotion' || t.type === 'rune') ? '' : `${t.lv}`;
    if (label) {
      const lp = Math.max(1, Math.round(2 * scale)), lw = MD.pixfont.width(label, lp) + 6 * lp, lh = 7 * lp + 4 * lp;
      ctx.fillStyle = '#0f0e1c'; ctx.fillRect(Math.round(ox + w - lw - 3 * lp), Math.round(oy + h - lh - 3 * lp), lw, lh);
      ptext(label, ox + w - lw / 2 - 3 * lp, oy + h - lh / 2 - 3 * lp, lp, t.type === 'coin' ? COLORS.coin : COLORS.ink, 'center');
    }
  }

  const easeOut = (k) => 1 - (1 - k) * (1 - k);
  const cellCenter = (rc) => { const p = cellXY(rc[0], rc[1]); return [p.x + p.cs / 2, p.y + p.cs / 2]; };

  // run.fxQueue 소비: 슬라이드가 끝난 시점에 위치 이펙트 + 효과음
  function consumeFx(run, now) {
    const FX = MD.fx, PAL = MD.sprites.PAL;
    run.fxQueue = run.fxQueue.filter((q) => {
      if (now < q.t0) return true;
      const sounds = [];
      q.events.forEach((ev) => {
        if (!ev.at) return;
        const [x, y] = cellCenter(ev.at);
        if (ev.kind === 'merge') {
          if (ev.type === 'weapon') { FX.burst(x, y, PAL.weapon[ev.lv - 1][2], 14, 150, 4); sounds.push('mergeWeapon'); }
          else if (ev.type === 'monster') { FX.burst(x, y, PAL.monster[ev.lv - 1][0], 12, 110, 5); sounds.push('mergeMonster'); }
          else if (ev.type === 'coin') { FX.sparkle(x, y, '#fff1b0', 10); FX.floater(x, y - 10, `+${ev.val}`, COLORS.coin); sounds.push('coin'); }
          else { FX.sparkle(x, y, '#b6f0c2', 8); sounds.push('potion'); }
        } else if (ev.kind === 'rune') {
          if (ev.rune === 'bomb') { FX.burst(x, y, '#ff8c3a', 30, 260, 6); FX.burst(x, y, '#ffffff', 14, 180, 3); FX.shakeScreen(12); sounds.push('bomb'); }
          else if (ev.rune === 'mirror') { FX.sparkle(x, y, '#9fd3ff', 20); sounds.push('mirror'); }
          else { FX.burst(x, y, '#eef2f6', 12, 140, 3); sounds.push('mergeWeapon'); }
        } else if (ev.kind === 'freeze') { FX.sparkle(x, y, '#dff3ff', 12); sounds.push('mirror');
        } else if (ev.kind === 'scorch') { FX.burst(x, y, '#ff8c3a', 14, 130, 4); FX.shakeScreen(4); sounds.push('damage');
        } else if (ev.kind === 'devour') { FX.burst(x, y, '#b26ae8', 16, 120, 5); FX.shakeScreen(6); sounds.push('mergeMonster');
        } else if (ev.kind === 'grow') { FX.sparkle(x, y, '#d9a3ff', 6); sounds.push('mergeMonster');
        } else if (ev.kind === 'mimic') { FX.burst(x, y, COLORS.coin, 12, 140, 4); FX.shakeScreen(5); sounds.push('kill');
        } else if (ev.kind === 'bank') {
          FX.sparkle(x, y, '#fff1b0', 16); FX.burst(x, y, COLORS.coin, 8, 120, 4); sounds.push('coin');
        } else if (ev.kind === 'kill' || ev.kind === 'bosskill') {
          { const mon = ev.kind === 'bosskill' ? MD.sprites.bake('boss', 1, 0) : MD.sprites.famSprite(ev.fam, Math.min(6, ev.monsterLv), 0); FX.duel(PAD, 8, 16 * 3 + 28, mon, ev.kind === 'bosskill', PAL.monster[Math.min(6, ev.monsterLv) - 1][0]); }
          FX.slash(x, y, ev.kind === 'bosskill' ? 46 : 30); FX.burst(x, y, '#ffffff', 10, 160, 3);
          FX.burst(x, y, PAL.monster[Math.min(6, ev.monsterLv) - 1][0], 10, 120, 5);
          FX.shakeScreen(ev.kind === 'bosskill' ? 10 : 4); sounds.push('kill');
        } else if (ev.kind === 'damage') {
          FX.burst(x, y, '#e45b5b', 12, 140, 4); FX.shakeScreen(6); sounds.push('damage');
        } else if (ev.kind === 'heal') {
          FX.sparkle(x, y, '#b6f0c2', 14); FX.burst(x, y, '#56c271', 6, 90, 4); sounds.push('heal');
        }
      });
      q.msgs.forEach((m) => {
        if (!m.at) return;
        const [x, y] = cellCenter(m.at);
        const color = m.kind === 'damage' ? '#ff6b6b' : m.kind === 'heal' ? '#7fe39a' : m.kind === 'coin' ? COLORS.coin : '#ffffff';
        FX.floater(x, y - 18, m.text, color, m.kind === 'damage' || m.kind === 'coin');
      });
      // 영웅 반응: 피격 > 공격 > 회복
      const kinds = new Set(q.events.map((ev) => ev.kind));
      if (kinds.has('damage')) run.heroAnim = { state: 'hurt', t0: now };
      else if (kinds.has('kill') || kinds.has('bosskill')) run.heroAnim = { state: 'attack', t0: now };
      else if (kinds.has('heal')) run.heroAnim = { state: 'heal', t0: now };
      if (!sounds.length) sounds.push('slide');
      [...new Set(sounds)].forEach((n, i) => setTimeout(() => MD.audio.play(n), i * 45));
      return false;
    });
  }

  function drawTiles(run, now) {
    const a = run.anim;
    const cs = cellSize();
    if (a && now - a.t0 < a.dur) {
      // 슬라이드 중: 이전 타일들을 from→to 로 보간해서 그린다
      const k = easeOut((now - a.t0) / a.dur);
      a.moves.forEach((m) => {
        const p0 = cellXY(m.from[0], m.from[1]), p1 = cellXY(m.to[0], m.to[1]);
        drawTile(m.tile, p0.x + (p1.x - p0.x) * k, p0.y + (p1.y - p0.y) * k, cs, 1, now);
      });
      return;
    }
    const since = a ? now - a.t0 - a.dur : 1e9; // 슬라이드 끝난 뒤 경과
    run.grid.forEach((row, r) => row.forEach((t, c) => {
      if (!t) return;
      const { x, y } = cellXY(r, c);
      let scale = 1;
      if (a && a.merged.has(t.id) && since < C.POP_MS) {
        const q = since / C.POP_MS;           // 0→1
        scale = 1 + 0.18 * Math.sin(q * Math.PI); // 1 → 1.18 → 1
      } else if (run.lastSpawn && run.lastSpawn.tile.id === t.id) {
        const q = Math.min(1, Math.max(0, (now - run.lastSpawn.t0) / C.POP_MS));
        scale = 0.3 + 0.7 * easeOut(q);
      }
      drawTile(t, x, y, cs, scale, now);
    }));
  }

  function drawToasts(run, now) {
    run.toasts = run.toasts.filter((t) => now - t.t0 < (t.kind === 'feat' ? 2400 : 900));
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    // 업적 배너: 보드 위쪽에서 내려왔다 올라간다
    const feat = run.toasts.find((t) => t.kind === 'feat' && now >= t.t0);
    if (feat) {
      const ft = (now - feat.t0) / 2400, slide = Math.min(1, ft * 8, (1 - ft) * 8);
      const bw = Math.min(size - 24, 330), bh = 34, bx = (size - bw) / 2, by = HUD_H + 8 - (1 - slide) * 50;
      bevel(Math.round(bx), Math.round(by), bw, bh, '#4a3a14', '#8a6a22', '#0f0e1c');
      ptext('*', bx + 14, by + bh / 2, 2, GOLD, 'center');
      ptext(feat.text.toUpperCase(), size / 2 + 6, by + bh / 2, MD.pixfont.supports(feat.text) && MD.pixfont.width(feat.text, 2) > bw - 40 ? 1.5 : 2, GOLD, 'center', { shadow: 1 });
    }
    run.toasts.filter((t) => t.kind !== 'feat').forEach((t, i) => {
      const k = Math.max(0, (now - t.t0) / 900);
      if (k <= 0) return;
      ctx.globalAlpha = 1 - k;
      const big = t.kind === 'floor' || t.kind === 'boss' || t.kind === 'theme' || t.kind === 'combo' || t.kind === 'multi';
      const col = t.kind === 'damage' ? COLORS.monster : t.kind === 'heal' ? COLORS.potion : t.kind === 'theme' ? COLORS.dim : t.kind === 'multi' ? '#9fd3ff' : big ? GOLD : COLORS.ink;
      let px = big ? (t.kind === 'theme' ? 2 : 3) : 2;
      if (t.kind === 'combo') px = Math.min(6, 3 + Math.floor((t.n - C.COMBO_MIN) / 2));
      const jx = t.kind === 'combo' ? (Math.random() - 0.5) * (px - 2) * 2 : 0;
      ptext(t.text.toUpperCase(), size / 2 + jx, HUD_H + size / 2 - 40 * k - i * 26, px, col, 'center', { shadow: 1, outline: t.kind === 'combo' ? '#1a1626' : undefined });
      ctx.globalAlpha = 1;
    });
  }

  // 푸터: 퍽이 없으면 조작 힌트, 있으면 퍽 배지. 배지를 탭하면 툴팁.
  function perkPills(run) {
    const ids = Object.keys(run.perks);
    const pills = [];
    let x = PAD;
    const y = HUD_H + size + 8, h = 24;
    ids.forEach((id) => {
      const p = MD.rules.perkDef(id); if (!p) return;
      const evo = MD.rules.isEvolved(id);
      const label = evo ? MD.L(p.name).toUpperCase() : `${MD.L(p.name).toUpperCase()} ${run.perks[id]}`;
      ctx.font = 'bold 12px system-ui, sans-serif';
      const w = (MD.pixfont.supports(label) ? MD.pixfont.width(label, 1.5) : ctx.measureText(label).width) + 16;
      pills.push({ id, label, p, evo, x, y, w, h });
      x += w + 6;
    });
    return pills;
  }
  function drawFooter(run, now) {
    ctx.textBaseline = 'middle';
    const pills = perkPills(run);
    // 아래 줄: 팁은 항상 돈다 (퍽과 영역 분리)
    ctx.fillStyle = COLORS.dim; ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'center';
    const tips = MD.t('tips');
    const fam = MD.rules.familyFor(run.stats.floor);
    const famTip = fam && fam !== 'slime' && run.route !== 'treasure' ? `${MD.L(C.FAMILIES[fam].name)}: ${MD.L(C.FAMILIES[fam].quirk)}` : null;
    const tipText = run.rune && now - run.t0 < 9000 ? MD.t('runeTip', MD.L(run.rune.name), MD.L(run.rune.desc)) : (famTip && Math.floor(now / 3500) % 2 === 0) ? famTip : tips[Math.floor(now / 3500) % tips.length];
    if (ctx.measureText(tipText).width > size - 20) ctx.font = '11px system-ui, sans-serif';
    if (ctx.measureText(tipText).width > size - 20) ctx.font = '10px system-ui, sans-serif';
    ctx.fillText(tipText, size / 2, HUD_H + size + FOOT_H - 16);
    if (!pills.length) {
      ptext(MD.t('noPerks'), PAD, HUD_H + size + 20, 1.5, '#4a4970', 'left');
      return;
    }
    pills.forEach((b) => {
      const active = run.tip && run.tip.id === b.id && now - run.tip.t0 < 2500;
      bevel(Math.round(b.x), Math.round(b.y), Math.round(b.w), b.h, active ? COLORS.cardEdge : (b.evo ? '#4a3a14' : COLORS.card), b.evo ? '#7a5e20' : '#4a4970', '#0f0e1c');
      ptext(b.label, b.x + 8, b.y + b.h / 2, 1.5, b.evo ? GOLD : COLORS.ink, 'left');
    });
    // 툴팁: 보드 아래쪽 위에 떠오름
    if (run.tip && now - run.tip.t0 < 2500) {
      const b = pills.find((q) => q.id === run.tip.id);
      if (!b) return;
      const text = b.evo ? MD.L(b.p.desc) : `Lv${run.perks[b.id]} · ${MD.L(b.p.desc)[run.perks[b.id] - 1]}`;
      ctx.font = '13px system-ui, sans-serif';
      const tw = ctx.measureText(text).width + 24, th = 32;
      let tx = Math.min(Math.max(PAD, b.x + b.w / 2 - tw / 2), size - PAD - tw);
      const ty = b.y - th - 8;
      ctx.fillStyle = '#0f0e1c'; rrect(tx, ty, tw, th, 8); ctx.fill();
      ctx.strokeStyle = COLORS.cardEdge; ctx.lineWidth = 1; rrect(tx, ty, tw, th, 8); ctx.stroke();
      ctx.fillStyle = COLORS.ink; ctx.textAlign = 'center';
      ctx.fillText(text, tx + tw / 2, ty + th / 2);
    }
  }
  function hitPerk(run, px, py) {
    const b = perkPills(run).find((q) => px >= q.x && px <= q.x + q.w && py >= q.y - 6 && py <= q.y + q.h + 6);
    return b ? b.id : null;
  }

  // 선택지 카드 좌표 (CSS px)
  function choiceRects() {
    const n = C.CHOICES, gap = 10, w = size - PAD * 2, h = 64;
    const top = HUD_H + size / 2 - (n * h + (n - 1) * gap) / 2 + 10;
    return Array.from({ length: n }, (_, i) => ({ x: PAD, y: top + i * (h + gap), w, h }));
  }

  function drawChoose(run) {
    ctx.fillStyle = 'rgba(20,18,40,0.86)';
    ctx.fillRect(0, HUD_H, size, size);
    ctx.fillStyle = COLORS.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ptext(MD.t('choose', run.stats.floor), size / 2, HUD_H + 36, 2.5, GOLD, 'center', { shadow: 1 });
    const rects = choiceRects();
    run.choices.forEach((p, i) => {
      const r = rects[i];
      const evo = MD.rules.wouldEvolve(run.perks, p.id);
      bevel(r.x, r.y, r.w, r.h, evo ? '#4a3a14' : COLORS.card, evo ? '#8a6a22' : '#4a4970', '#0f0e1c');
      const lv = (run.perks[p.id] || 0) + 1;
      ptext(`${i + 1}. ${MD.L(p.name).toUpperCase()}`, r.x + 14, r.y + 20, 2, evo ? GOLD : COLORS.coin, 'left', { shadow: 1 });
      // 짝 퍽을 이미 가졌으면 'PAIR' 힌트
      const pair = !evo && C.EVOLVE.find((ev) => !run.perks[ev.id] && ev.from.includes(p.id) && MD.rules.perkCount(run.perks, ev.from.find((f) => f !== p.id)) > 0);
      const tag = evo ? MD.t('evolveTag') : pair ? MD.t('pairTag') : lv > 1 ? `LV${lv - 1} > LV${lv}` : MD.t('newTag');
      ptext(tag, r.x + r.w - 14, r.y + 20, 1.5, evo ? GOLD : pair ? '#e0a52f' : lv > 1 ? COLORS.coin : COLORS.dim, 'right');
      ctx.fillStyle = COLORS.ink; ctx.font = '13px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(evo ? MD.t('evolveHint', MD.L(p.name), MD.L(MD.rules.perkDef(evo.from.find((f) => f !== p.id)).name), MD.L(evo.name)) : MD.L(p.desc)[lv - 1], r.x + 14, r.y + 44);
    });
    if (run.stats.bossAlive) {
      ctx.textAlign = 'center'; ctx.fillStyle = COLORS.boss; ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.fillText(MD.t('bossWarn'), size / 2, HUD_H + size - 22);
    }
  }

  function hitChoice(px, py) {
    const i = choiceRects().findIndex((r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h);
    return i;
  }

  // ---------- 진화 연출 ----------
  function drawEvolved(run, now) {
    const t = (now - run.evolved.t0) / 1000;
    if (t > 2.6) { run.evolved = null; return; }
    const ev = run.evolved.ev;
    const flash = Math.max(0, 1 - t * 3);
    ctx.fillStyle = `rgba(255,230,140,${flash * 0.9})`; ctx.fillRect(0, HUD_H, size, size);
    ctx.fillStyle = `rgba(20,18,40,${Math.min(0.85, t * 2)})`; ctx.fillRect(0, HUD_H, size, size);
    if (t < 1.2 && Math.random() < 0.6) MD.fx.sparkle(size / 2 + (Math.random() - 0.5) * size * 0.8, HUD_H + size * 0.35 + (Math.random() - 0.5) * 120, '#fff1b0', 2);
    const px = Math.max(3, Math.floor(size / 110));
    const pop = Math.min(1, t * 3), sc = 1 + (1 - pop) * 0.6;
    ptext(MD.t('evolved'), size / 2, HUD_H + size * 0.28, Math.round(px * sc), GOLD, 'center', { shadow: 1.2, outline: '#1a1626' });
    if (t > 0.35) {
      ptext(MD.L(ev.name).toUpperCase(), size / 2, HUD_H + size * 0.45, Math.max(2, px - 1), COLORS.ink, 'center', { shadow: 1 });
      const [a, b] = ev.from.map((id) => MD.L(MD.rules.perkDef(id).name));
      ctx.fillStyle = COLORS.dim; ctx.font = '13px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(MD.t('evolveHint', a, b, MD.L(ev.name)), size / 2, HUD_H + size * 0.55);
      ctx.fillStyle = COLORS.ink; ctx.font = '14px system-ui, sans-serif';
      // 줄바꿈
      const words = MD.L(ev.desc).split(' '), maxW = size - 40; let line = '', n = 0;
      words.forEach((w) => { const s2 = line ? line + ' ' + w : w; if (ctx.measureText(s2).width > maxW && line) { ctx.fillText(line, size / 2, HUD_H + size * 0.64 + n * 20); line = w; n++; } else line = s2; });
      ctx.fillText(line, size / 2, HUD_H + size * 0.64 + n * 20);
    }
    MD.fx.draw(ctx, now);
  }

  // ---------- 첫 실행 튜토리얼 (3줄 + 스프라이트) ----------
  function drawTutorial(run, now) {
    ctx.fillStyle = 'rgba(20,18,40,0.88)'; ctx.fillRect(0, HUD_H, size, size);
    const lines = MD.t('tut');
    const icons = [[{ type: 'weapon', lv: 1 }, { type: 'weapon', lv: 1 }], [{ type: 'weapon', lv: 2 }, { type: 'monster', lv: 1 }], [{ type: 'coin', lv: 1 }, { type: 'potion', lv: 1 }]];
    const sp = 3, sw = 16 * sp, rowH = size * 0.22, top = HUD_H + size * 0.1;
    ctx.imageSmoothingEnabled = false;
    lines.forEach((text, i) => {
      const y = top + i * rowH;
      ctx.fillStyle = COLORS.card; rrect(PAD, y, size - PAD * 2, rowH - 12, 10); ctx.fill();
      icons[i].forEach((ic, k) => ctx.drawImage(MD.sprites.get(ic), PAD + 10 + k * (sw + 4), y + (rowH - 12 - sw) / 2, sw, sw));
      ctx.fillStyle = COLORS.ink; ctx.font = '13px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      // 간단 줄바꿈
      const maxW = size - PAD * 2 - 24 - 2 * (sw + 4), words = text.split(' '); let line = '', ly = y + (rowH - 12) / 2 - 9, n = 0;
      const tx = PAD + 20 + 2 * (sw + 4);
      words.forEach((w) => { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, tx, ly + n * 18); line = w; n++; } else line = t; });
      ctx.fillText(line, tx, ly + n * 18);
    });
    if (Math.floor(now / 500) % 2 === 0) {
      const P = MD.pixfont, msg = MD.t('tutGo'), px = 2;
      if (/^[A-Z0-9 ]+$/.test(msg)) P.draw(ctx, msg, (size - P.width(msg, px)) / 2, HUD_H + size * 0.86, px, COLORS.coin, { shadow: 1 });
      else { ctx.fillStyle = COLORS.coin; ctx.font = 'bold 14px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(msg, size / 2, HUD_H + size * 0.88); }
    }
  }

  // ---------- 버튼 유틸 ----------
  function button(x, y, w, h, label, color, enabled) {
    ctx.globalAlpha = enabled === false ? 0.4 : 1;
    bevel(Math.round(x), Math.round(y), Math.round(w), Math.round(h), color, color === COLORS.weapon ? '#8ab4ff' : '#4a4970', '#0f0e1c');
    ptext(label, x + w / 2, y + h / 2, 2, COLORS.ink, 'center', { shadow: 1 });
    ctx.globalAlpha = 1;
    return { x, y, w, h };
  }
  const inRect = (r, px, py) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;

  // ---------- 타이틀 (title.js) ----------
  function drawTitle(meta, now) { MD.title.draw(ctx, size, HUD_H, FOOT_H, meta, now); }
  function hitTitle(px, py) { return MD.title.hit(size, HUD_H, FOOT_H, px, py); }

  // ---------- 상점 ----------
  function shopRects() {
    const rowH = 60, gap = 8, top = HUD_H + 10;
    const rows = C.RELICS.map((r, i) => ({ id: r.id, x: PAD, y: top + i * (rowH + gap), w: size - PAD * 2, h: rowH, buy: { x: size - PAD - 78, y: top + i * (rowH + gap) + 13, w: 70, h: 34 } }));
    return { rows, back: { x: PAD, y: HUD_H + size + 4, w: 110, h: 36 } };
  }
  function drawShop(meta) {
    const H = size + HUD_H + FOOT_H;
    ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, size, H);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.ink; ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText(MD.t('shop'), PAD, 30);
    ctx.textAlign = 'right'; ctx.fillStyle = COLORS.coin; ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText(`● ${meta.coins}`, size - PAD, 30);
    ctx.textAlign = 'left'; ctx.fillStyle = COLORS.dim; ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(MD.t('shopHint'), PAD, 56);
    const s = shopRects();
    C.RELICS.forEach((rel, i) => {
      const r = s.rows[i];
      const owned = !!meta.relics[rel.id];
      ctx.fillStyle = COLORS.card; rrect(r.x, r.y, r.w, r.h, 10); ctx.fill();
      if (owned) { ctx.strokeStyle = COLORS.coin; ctx.lineWidth = 1.5; rrect(r.x, r.y, r.w, r.h, 10); ctx.stroke(); }
      ctx.textAlign = 'left';
      ctx.fillStyle = owned ? COLORS.coin : COLORS.ink; ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.fillText(MD.L(rel.name), r.x + 14, r.y + 20);
      ctx.fillStyle = COLORS.dim; ctx.font = '12px system-ui, sans-serif';
      ctx.fillText(MD.L(rel.desc), r.x + 14, r.y + 41);
      if (owned) button(r.buy.x, r.buy.y, r.buy.w, r.buy.h, MD.t('owned'), COLORS.bg);
      else button(r.buy.x, r.buy.y, r.buy.w, r.buy.h, `● ${rel.cost}`, COLORS.weapon, meta.coins >= rel.cost);
    });
    button(s.back.x, s.back.y, s.back.w, s.back.h, MD.t('back'), COLORS.card);
  }
  function hitShop(px, py) {
    const s = shopRects();
    if (inRect(s.back, px, py)) return { back: true };
    const row = s.rows.find((r) => inRect(r.buy, px, py));
    return row ? { buy: row.id } : null;
  }

  // ---------- 영웅 선택 ----------
  function heroRects() {
    const rowH = 66, gap = 8, top = HUD_H + 8;
    return { rows: C.HEROES.map((h, i) => ({ id: h.id, x: PAD, y: top + i * (rowH + gap), w: size - PAD * 2, h: rowH })), back: { x: PAD, y: HUD_H + size + 6, w: 110, h: 36 } };
  }
  function drawHeroes(meta, now) {
    const H = size + HUD_H + FOOT_H;
    ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, size, H);
    ptext(MD.t('chooseHero'), size / 2, 28, 3, GOLD, 'center', { shadow: 1 });
    ptext(MD.t('heroSub'), size / 2, 56, 1.5, COLORS.dim, 'center');
    const r = heroRects();
    C.HEROES.forEach((h, i) => {
      const row = r.rows[i], ok = MD.meta.heroUnlocked(h.id), sel = meta.hero === h.id;
      bevel(row.x, row.y, row.w, row.h, sel ? '#2f3a5e' : COLORS.card, sel ? '#4f8dfd' : '#4a4970', '#0f0e1c');
      ctx.imageSmoothingEnabled = false; ctx.globalAlpha = ok ? 1 : 0.35;
      const frame = Math.floor((now + i * 200) / 550) % 2;
      ctx.drawImage(MD.sprites.hero(h.id, frame), row.x + 10, row.y + (row.h - 48) / 2, 48, 48);
      ctx.globalAlpha = 1;
      ptext(MD.L(h.name).toUpperCase(), row.x + 64, row.y + 18, 2, ok ? (sel ? '#a9c8ff' : COLORS.coin) : COLORS.dim, 'left', { shadow: 1 });
      const best = meta.heroBest[h.id] ? `BEST ${meta.heroBest[h.id]}F` : '';
      if (ok && best) ptext(best, row.x + row.w - 12, row.y + 18, 1.5, COLORS.dim, 'right');
      ctx.fillStyle = ok ? COLORS.ink : COLORS.dim; ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      if (ok) {
        const words = MD.L(h.desc).split(' '), maxW = row.w - 76; let line = '', n = 0;
        words.forEach((w) => { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, row.x + 64, row.y + 38 + n * 15); line = w; n++; } else line = t; });
        ctx.fillText(line, row.x + 64, row.y + 38 + n * 15);
      } else {
        const [a, b] = MD.meta.heroProgress(h.id);
        ctx.fillText(`${MD.t('locked')}: ${MD.L(h.unlock.text)} (${a}/${b})`, row.x + 64, row.y + 42);
      }
      if (!ok) ptext('?', row.x + 32, row.y + row.h / 2, 3, COLORS.dim, 'center');
    });
    button(r.back.x, r.back.y, r.back.w, r.back.h, MD.t('back'), COLORS.card);
  }
  function hitHeroes(px, py) {
    const r = heroRects();
    if (inRect(r.back, px, py)) return { back: true };
    const row = r.rows.find((q) => inRect(q, px, py));
    return row ? { hero: row.id } : null;
  }

  // ---------- 분기 (갈림길) ----------
  function branchRects() {
    const n = C.BRANCHES.length, gap = 10, w = size - PAD * 2, h = 70;
    const top = HUD_H + size / 2 - (n * h + (n - 1) * gap) / 2 + 10;
    return Array.from({ length: n }, (_, i) => ({ x: PAD, y: top + i * (h + gap), w, h }));
  }
  function drawBranch(run) {
    ctx.fillStyle = 'rgba(20,18,40,0.88)'; ctx.fillRect(0, HUD_H, size, size);
    ptext(MD.t('branchTitle'), size / 2, HUD_H + 36, 2.5, GOLD, 'center', { shadow: 1 });
    const rects = branchRects();
    const col = { safe: '#56c271', risky: '#e45b5b', treasure: '#f3c74f' };
    run.branches.forEach((b, i) => {
      const r = rects[i];
      bevel(r.x, r.y, r.w, r.h, COLORS.card, '#4a4970', '#0f0e1c');
      ptext(`${i + 1}. ${MD.L(b.name).toUpperCase()}`, r.x + 14, r.y + 22, 2, col[b.id], 'left', { shadow: 1 });
      ctx.fillStyle = COLORS.ink; ctx.font = '13px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(MD.L(b.desc), r.x + 14, r.y + 48);
    });
  }
  function hitBranch(px, py) { return branchRects().findIndex((r) => inRect(r, px, py)); }

  // ---------- 제물 제단 ----------
  function altarRects() {
    const n = C.ALTAR.length, gap = 10, w = size - PAD * 2, h = 64;
    const top = HUD_H + size / 2 - (n * h + (n - 1) * gap) / 2 + 16;
    return Array.from({ length: n }, (_, i) => ({ x: PAD, y: top + i * (h + gap), w, h }));
  }
  function drawAltar(run, now) {
    ctx.fillStyle = 'rgba(20,10,24,0.9)'; ctx.fillRect(0, HUD_H, size, size);
    // 촛불 두 개
    [size * 0.25, size * 0.75].forEach((cx, i) => {
      const fl = 0.7 + 0.3 * Math.sin(now / 90 + i * 2);
      ctx.fillStyle = '#5a3a2a'; ctx.fillRect(cx - 3, HUD_H + 60, 6, 16);
      ctx.fillStyle = `rgba(255,140,58,${fl})`; ctx.fillRect(cx - 2, HUD_H + 50, 4, 10);
      ctx.fillStyle = `rgba(255,241,176,${fl})`; ctx.fillRect(cx - 1, HUD_H + 54, 2, 4);
      if (Math.random() < 0.15) MD.fx.sparkle(cx, HUD_H + 48, '#ff8c3a', 1);
    });
    ptext(MD.t('altarTitle'), size / 2, HUD_H + 36, 2.5, (ry) => ['#ffd0d0', '#ff8a8a', '#e45b5b', '#e45b5b', '#b83a3a', '#8e2626', '#5e1515'][ry], 'center', { shadow: 1 });
    const rects = altarRects();
    const have = (MD.meta.get().coins) + run.stats.coins;
    run.altar.forEach((o, i) => {
      const r = rects[i];
      const ok = o.id === 'blood' ? run.stats.hp > o.cost.hp && Object.keys(run.perks).some((id) => !MD.rules.isEvolved(id) && run.perks[id] < C.PERK_MAX) : o.id === 'gold' ? have >= o.cost.coins : true;
      bevel(r.x, r.y, r.w, r.h, ok ? '#3a1a24' : COLORS.card, ok ? '#6a2a3a' : '#4a4970', '#0f0e1c');
      ctx.globalAlpha = ok ? 1 : 0.45;
      ptext(`${i + 1}. ${MD.L(o.name).toUpperCase()}`, r.x + 14, r.y + 20, 2, o.id === 'refuse' ? COLORS.dim : '#ff8a8a', 'left', { shadow: 1 });
      ctx.fillStyle = COLORS.ink; ctx.font = '13px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(MD.L(o.desc), r.x + 14, r.y + 44);
      ctx.globalAlpha = 1;
    });
  }
  function hitAltar(px, py) { return altarRects().findIndex((r) => inRect(r, px, py)); }

  // ---------- 데일리 던전 ----------
  function dailyRects() { return { play: { x: size / 2 - 90, y: HUD_H + 70, w: 180, h: 44 }, back: { x: PAD, y: HUD_H + size + 6, w: 110, h: 36 } }; }
  function drawDaily(meta, now) {
    const H = size + HUD_H + FOOT_H;
    ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, size, H);
    const key = MD.run.dailyKey(), today = meta.daily[key];
    ptext(MD.t('dailyTitle'), size / 2, 30, 3, GOLD, 'center', { shadow: 1 });
    ctx.fillStyle = COLORS.dim; ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(MD.t('dailySub', key), size / 2, 58);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(MD.sprites.hero('knight', Math.floor(now / 600) % 2), size / 2 - 24, HUD_H - 10, 48, 48);
    if (today) ptext(MD.t('dailyDone', today.floor), size / 2, HUD_H + 50, 2, COLORS.ink, 'center', { shadow: 1 });
    const r = dailyRects();
    button(r.play.x, r.play.y, r.play.w, r.play.h, today ? MD.t('dailyAgain') : MD.t('dailyPlay'), COLORS.weapon);
    // 최근 30일 막대
    ptext(MD.t('dailyHist'), PAD, HUD_H + 140, 1.5, COLORS.dim, 'left');
    const keys = Object.keys(meta.daily).sort().slice(-30);
    const bw = (size - PAD * 2) / 30, maxF = Math.max(5, ...keys.map((k) => meta.daily[k].floor));
    const baseY = HUD_H + 150 + 120;
    bevel(PAD, HUD_H + 150, size - PAD * 2, 124, '#242340', '#34335a', '#0f0e1c');
    keys.forEach((k, i) => {
      const f = meta.daily[k].floor, h = Math.round((f / maxF) * 100);
      ctx.fillStyle = k === key ? COLORS.coin : '#4f8dfd';
      ctx.fillRect(Math.round(PAD + 4 + (30 - keys.length + i) * bw), baseY - h, Math.max(2, Math.round(bw - 2)), h);
    });
    if (!keys.length) { ctx.fillStyle = COLORS.dim; ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('—', size / 2, HUD_H + 212); }
    button(r.back.x, r.back.y, r.back.w, r.back.h, MD.t('back'), COLORS.card);
  }
  function hitDaily(px, py) { const r = dailyRects(); if (inRect(r.play, px, py)) return 'play'; if (inRect(r.back, px, py)) return 'back'; return null; }

  // ---------- 테마별 배경 (캔버스 전체에 깔리는 패턴) ----------
  const BACKDROP = {
    stone: (x, y) => ((Math.floor(y / 14) % 2 ? x + 14 : x) % 28 < 26 && y % 14 < 12) ? 0 : 1,
    moss: (x, y) => ((x * 7 + y * 13) % 29 === 0) ? 2 : 0,
    frost: (x, y) => ((x + y) % 24 === 0 || (x - y + 240) % 24 === 0) ? 1 : 0,
    ember: (x, y) => (Math.floor(y / 10) % 2 ? x + 10 : x) % 20 < 18 && y % 10 < 8 ? 0 : 1,
    void: (x, y) => ((x * 31 + y * 17) % 53 === 0) ? 2 : 0,
    gold: (x, y) => (x % 16 < 1 || y % 16 < 1) ? 1 : ((x % 16 === 8 && y % 16 === 8) ? 2 : 0),
    throne: (x, y) => (x % 24 < 2) ? 1 : 0,
  };
  let backdropCache = null, backdropKey = '';
  function drawBackdrop(now) {
    const key = theme.id + ':' + size;
    if (backdropKey !== key) {
      backdropKey = key;
      const H = size + HUD_H + FOOT_H;
      backdropCache = document.createElement('canvas'); backdropCache.width = size; backdropCache.height = H;
      const g = backdropCache.getContext('2d');
      const fn = BACKDROP[theme.id] || BACKDROP.stone;
      for (let y = 0; y < H; y += 2) for (let x = 0; x < size; x += 2) {
        const v = fn(x, y);
        if (!v) continue;
        g.fillStyle = v === 1 ? theme.cellLo : theme.speck; g.globalAlpha = v === 1 ? 0.55 : 0.35;
        g.fillRect(x, y, 2, 2);
      }
    }
    ctx.drawImage(backdropCache, 0, 0);
    // 보드/HUD 아래는 살짝 어둡게 해서 패턴이 뒤로 물러나게
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0, 0, size, HUD_H);
  }

  // ---------- 테마별 환경 효과 ----------
  function ambient(now) {
    const FX = MD.fx, id = theme.id;
    const rx = () => Math.random() * size, top = HUD_H + 4, bot = HUD_H + size - 4;
    if (id === 'moss' && Math.random() < 0.12) FX.drift(rx(), top + Math.random() * size, '#8fd48a', 0.4, 0, 6);
    else if (id === 'frost' && Math.random() < 0.35) FX.drift(rx(), top, '#dff3ff', 0.2, 28, 5);
    else if (id === 'ember' && Math.random() < 0.3) FX.drift(rx(), bot, '#ff8c3a', 0.6, -40, 3);
    else if (id === 'void' && Math.random() < 0.25) FX.drift(rx(), top + Math.random() * size, '#d9a3ff', 0.5, -8, 4, true);
    else if (id === 'gold' && Math.random() < 0.2) FX.drift(rx(), top + Math.random() * size, '#fff1b0', 0.3, 6, 3, true);
    else if (id === 'throne' && Math.random() < 0.1) FX.drift(rx(), top, '#e45b5b', 0.35, 30, 4);
    else if (id === 'stone') {
      // 횃불: 보드 양쪽 위 모서리 광원
      [[PAD + 10, HUD_H + 14], [size - PAD - 10, HUD_H + 14]].forEach(([x, y], i) => {
        const fl = 0.5 + 0.5 * Math.sin(now / 70 + i * 1.7);
        const g = ctx.createRadialGradient(x, y, 2, x, y, 70);
        g.addColorStop(0, `rgba(255,170,80,${0.16 + 0.08 * fl})`); g.addColorStop(1, 'rgba(255,170,80,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 70, y - 70, 140, 140);
        if (Math.random() < 0.08) FX.drift(x + (Math.random() - 0.5) * 6, y, '#ffd27a', 0.5, -30, 2);
      });
    }
  }
  function drawCutscene(run, now) {
    const cs = run.cutscene, t = (now - cs.t0) / 1000;
    if (t < 0) return;
    if (t > 2.8) { run.cutscene = null; return; }
    ctx.fillStyle = `rgba(14,10,24,${Math.min(0.85, t * 3)})`; ctx.fillRect(0, HUD_H, size, size);
    const drop = Math.min(1, t * 2.5), ease = 1 - Math.pow(1 - drop, 3);
    const sp = Math.max(4, Math.floor(size / 90)), sw = 16 * sp;
    const y = HUD_H + size * 0.18 + (1 - ease) * -size * 0.5;
    if (drop >= 1 && t < 1.15) { const o = MD.fx.shakeOffset(now); if (!o[0]) MD.fx.shakeScreen(10); }
    ctx.imageSmoothingEnabled = false;
    const frame = Math.floor(now / 300) % 2;
    ctx.drawImage(MD.sprites.bake('boss', 1 + Math.max(0, C.BOSS_GIMMICK.indexOf(cs.gimmick)), frame), Math.round(size / 2 - sw / 2), Math.round(y), sw, sw);
    if (t > 0.5) {
      const px = Math.max(3, Math.floor(size / 110));
      ptext(cs.name, size / 2, HUD_H + size * 0.18 + sw + 30, px, (ry) => ['#e6c6ff', '#c99cff', '#a86ef5', '#9257e0', '#7a45c7', '#6436a8', '#4f2a8a'][ry], 'center', { shadow: 1.2, outline: '#1a1626' });
      ptext(MD.t('bossLv', cs.lv), size / 2, HUD_H + size * 0.18 + sw + 30 + 7 * px + 14, 1.5, COLORS.dim, 'center');
      if (cs.gimmick) { ctx.fillStyle = '#ff8a8a'; ctx.font = 'bold 13px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(MD.L(C.BOSS_HINT[cs.gimmick]), size / 2, HUD_H + size * 0.18 + sw + 30 + 7 * px + 40); }
    }
  }

  // ---------- 도감 ----------
  let codexTab = 0, featPage = 0;
  const FEATS_PER_PAGE = 8;
  function codexRects() {
    const tw = Math.floor((size - PAD * 2 - 18) / 4);
    return {
      back: { x: PAD, y: HUD_H + size + 6, w: 110, h: 36 },
      tabs: [0, 1, 2, 3].map((i) => ({ x: PAD + i * (tw + 6), y: 44, w: tw, h: 26 })),
      prev: { x: size - PAD - 96, y: HUD_H + size + 6, w: 44, h: 36 }, next: { x: size - PAD - 44, y: HUD_H + size + 6, w: 44, h: 36 },
      rows: Array.from({ length: FEATS_PER_PAGE }, (_, i) => ({ x: PAD, y: 100 + i * 46, w: size - PAD * 2, h: 42 })),
    };
  }
  function drawFeats(meta, now) {
    const r = codexRects(), L = MD.ach.LIST, pages = Math.ceil(L.length / FEATS_PER_PAGE);
    featPage = Math.max(0, Math.min(pages - 1, featPage));
    ptext(`${MD.ach.count()}/${L.length}`, PAD, 86, 2, COLORS.ink, 'left');
    ctx.fillStyle = COLORS.dim; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText(MD.t('featHint'), size - PAD, 86);
    L.slice(featPage * FEATS_PER_PAGE, (featPage + 1) * FEATS_PER_PAGE).forEach((a, i) => {
      const row = r.rows[i], got = !!(meta.achievements || {})[a.id], worn = meta.title === a.id;
      bevel(row.x, row.y, row.w, row.h, worn ? '#4a3a14' : got ? '#2f2c4c' : '#1f1d33', worn ? '#8a6a22' : '#4a4970', '#0f0e1c');
      ctx.globalAlpha = got ? 1 : 0.5;
      ctx.fillStyle = MD.ach.TIER_COLOR[a.tier]; ctx.fillRect(row.x + 8, row.y + 8, 8, 8); ctx.fillStyle = '#0f0e1c'; ctx.fillRect(row.x + 10, row.y + 10, 2, 2);
      ptext(MD.L(a.name).toUpperCase(), row.x + 24, row.y + 13, 1.5, got ? COLORS.ink : COLORS.dim, 'left');
      ctx.fillStyle = COLORS.dim; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(MD.L(a.desc), row.x + 24, row.y + 30);
      const tag = a.title ? (worn ? MD.t('featWorn') : `"${MD.L(a.title)}"`) : `+10 ●`;
      ctx.fillStyle = worn ? COLORS.coin : a.title ? '#a9c8ff' : COLORS.coin; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(tag, row.x + row.w - 10, row.y + 13);
      if (got) { ctx.fillStyle = '#56c271'; ctx.fillRect(row.x + row.w - 22, row.y + 28, 3, 3); ctx.fillRect(row.x + row.w - 19, row.y + 31, 3, 3); ctx.fillRect(row.x + row.w - 16, row.y + 28, 3, 3); ctx.fillRect(row.x + row.w - 13, row.y + 25, 3, 3); }
      ctx.globalAlpha = 1;
    });
    button(r.prev.x, r.prev.y, r.prev.w, r.prev.h, '<', COLORS.card, featPage > 0);
    button(r.next.x, r.next.y, r.next.w, r.next.h, '>', COLORS.card, featPage < pages - 1);
    ptext(`${featPage + 1}/${pages}`, r.prev.x - 12, r.prev.y + 18, 1.5, COLORS.dim, 'right');
  }
  function drawStats(meta) {
    const fl = meta.stats.floors || [], avg = fl.length ? (fl.reduce((x, y) => x + y, 0) / fl.length).toFixed(1) : '-';
    const lab = MD.t('statLabels');
    const rows = [
      [lab[0], meta.runs], [lab[1], meta.bestFloor], [lab[2], avg], [lab[3], meta.stats.kills || 0], [lab[4], meta.stats.bossKills],
      [lab[5], `X${meta.stats.bestCombo}`], [lab[6], meta.stats.totalCoins], [lab[7], meta.stats.potionsUsed], [lab[8], Object.keys(meta.daily || {}).length],
    ];
    rows.forEach(([k, v], i) => {
      const y = 92 + i * 26;
      if (i % 2 === 0) { ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.fillRect(PAD, y - 12, size - PAD * 2, 26); }
      ptext(String(k), PAD + 8, y, 1.5, COLORS.dim, 'left'); ptext(String(v), size - PAD - 8, y, 2, COLORS.ink, 'right');
    });
    const y0 = 92 + rows.length * 26 + 14;
    ptext(lab[9], PAD + 8, y0, 1.5, GOLD, 'left');
    const hw = (size - PAD * 2) / C.HEROES.length;
    C.HEROES.forEach((h, i) => {
      const x = PAD + i * hw, ok = MD.meta.heroUnlocked(h.id);
      ctx.imageSmoothingEnabled = false; ctx.globalAlpha = ok ? 1 : 0.3;
      ctx.drawImage(MD.sprites.hero(h.id, 0), Math.round(x + hw / 2 - 24), y0 + 14, 48, 48);
      ctx.globalAlpha = 1;
      ptext(ok ? `${meta.heroBest[h.id] || 0}F` : '?', x + hw / 2, y0 + 74, 2, ok ? COLORS.ink : COLORS.dim, 'center');
    });
  }
  function drawBestiary(meta, now) {
    const fams = Object.keys(C.FAMILIES), cell = Math.floor((size - PAD * 2 - 60) / 6), top = 84;
    ptext('LV', PAD + 50 + cell * 3, top - 10, 1.5, COLORS.dim, 'center');
    let found = 0, total = fams.length * 6;
    fams.forEach((f, i) => {
      const y = top + i * (cell + 4);
      ptext(MD.L(C.FAMILIES[f].name).toUpperCase().slice(0, 8), PAD, y + cell / 2, 1.2, COLORS.ink, 'left');
      for (let lv = 1; lv <= 6; lv++) {
        const n = meta.bestiary[`${f}-${lv}`] || 0, x = PAD + 54 + (lv - 1) * cell;
        const master = n >= 10; if (n) found++;
        bevel(x, y, cell - 3, cell, n ? (master ? '#4a3a14' : '#2f2c4c') : '#1f1d33', master ? '#8a6a22' : '#4a4970', '#0f0e1c');
        ctx.imageSmoothingEnabled = false;
        if (n) ctx.drawImage(MD.sprites.famSprite(f, lv, Math.floor((now + i * 100) / 600) % 2), x + 4, y + 2, cell - 11, cell - 11);
        else { ctx.globalAlpha = 0.25; ctx.drawImage(MD.sprites.famSprite(f, lv, 0), x + 4, y + 2, cell - 11, cell - 11); ctx.globalAlpha = 1; ctx.fillStyle = '#1f1d33'; ctx.globalCompositeOperation = 'source-atop'; ctx.fillRect(x + 4, y + 2, cell - 11, cell - 11); ctx.globalCompositeOperation = 'source-over'; }
        if (n) ptext(String(Math.min(n, 99)), x + cell - 6, y + cell - 6, 1, master ? COLORS.coin : COLORS.dim, 'right');
      }
    });
    ptext(MD.t('bestiaryFoot', found, total), size / 2, top + fams.length * (cell + 4) + 10, 1.2, COLORS.dim, 'center');
  }
  function drawCodex(meta, now) {
    const H = size + HUD_H + FOOT_H;
    ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, size, H);
    ptext(MD.t('records'), size / 2, 22, 3, GOLD, 'center', { shadow: 1 });
    const r = codexRects();
    MD.t('recTabs').forEach((lab, i) => { button(r.tabs[i].x, r.tabs[i].y, r.tabs[i].w, r.tabs[i].h, lab, codexTab === i ? COLORS.weapon : COLORS.card); });
    if (codexTab > 0) {
      if (codexTab === 1) drawBestiary(meta, now || 0); else if (codexTab === 2) drawFeats(meta, now || 0); else drawStats(meta);
      button(r.back.x, r.back.y, r.back.w, r.back.h, MD.t('back'), COLORS.card); return;
    }
    const found = Object.keys(meta.codex || {}).length;
    ptext(`EVOLUTIONS ${found}/${C.EVOLVE.length + C.HIDDEN_EVOLVE.length}`, PAD, 84, 2, COLORS.ink, 'left');
    const rowH = 30;
    C.EVOLVE.forEach((ev, i) => {
      const y = 98 + i * rowH, got = !!meta.codex[ev.id];
      bevel(PAD, y, size - PAD * 2, rowH - 6, got ? '#4a3a14' : COLORS.card, got ? '#7a5e20' : '#4a4970', '#0f0e1c');
      ptext(got ? MD.L(ev.name).toUpperCase() : '???', PAD + 10, y + (rowH - 6) / 2, 1.5, got ? GOLD : COLORS.dim, 'left');
      ctx.fillStyle = got ? COLORS.ink : COLORS.dim; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      const [a, b] = ev.from.map((id) => MD.L(MD.rules.perkDef(id).name));
      ctx.fillText(got ? MD.L(ev.desc).slice(0, 44) : `${a} + ${b}`, size - PAD - 10, y + (rowH - 6) / 2);
    });
    C.HIDDEN_EVOLVE.forEach((ev, i) => {
      const y = 98 + (C.EVOLVE.length + i) * rowH, got = !!meta.codex[ev.id];
      bevel(PAD, y, size - PAD * 2, rowH - 6, got ? '#4a3a14' : '#2a1a30', got ? '#7a5e20' : '#5a3a70', '#0f0e1c');
      ptext(got ? MD.L(ev.name).toUpperCase() : '? ? ?', PAD + 10, y + (rowH - 6) / 2, 1.5, got ? GOLD : '#b26ae8', 'left');
      ctx.fillStyle = got ? COLORS.ink : COLORS.dim; ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(got ? MD.L(ev.desc).slice(0, 44) : MD.L(ev.hint), size - PAD - 10, y + (rowH - 6) / 2);
    });
    const y2 = 98 + (C.EVOLVE.length + C.HIDDEN_EVOLVE.length) * rowH + 10;
    button(r.back.x, r.back.y, r.back.w, r.back.h, MD.t('back'), COLORS.card);
  }
  function hitCodex(px, py) {
    const r = codexRects();
    if (inRect(r.back, px, py)) return { back: true };
    const ti = r.tabs.findIndex((t) => inRect(t, px, py));
    if (ti >= 0) { codexTab = ti; return { tab: ti }; }
    if (codexTab === 2) {
      const pages = Math.ceil(MD.ach.LIST.length / FEATS_PER_PAGE);
      if (inRect(r.prev, px, py) && featPage > 0) { featPage--; return { tab: 2 }; }
      if (inRect(r.next, px, py) && featPage < pages - 1) { featPage++; return { tab: 2 }; }
      const ri = r.rows.findIndex((q) => inRect(q, px, py));
      const a = ri >= 0 ? MD.ach.LIST[featPage * FEATS_PER_PAGE + ri] : null;
      if (a && MD.ach.equip(a.id)) return { equip: a.id };
    }
    return null;
  }

  // ---------- 되감기 버튼 (HUD 우측) ----------
  function undoRect() { const m = muteRect(); return { x: m.x - 6 - 36, y: 8, w: 36, h: 24 }; }
  function drawUndo(run) {
    if (!run.relics || !run.relics.rewind) return;
    const r = undoRect();
    button(r.x, r.y, r.w, r.h, `↶${run.undoLeft}`, COLORS.card, run.undoLeft > 0 && !!run.prev);
  }
  function hitUndo(px, py) { return inRect(undoRect(), px, py); }

  function drawDead(run, meta) {
    const R = run.result, t = (performance.now() - R.t0) / 1000;
    const P = MD.pixfont;
    // 어두워지는 막 + 붉은 비네트
    const a = Math.min(0.86, t * 2);
    ctx.fillStyle = `rgba(14,10,24,${a})`; ctx.fillRect(0, HUD_H, size, size);
    const vg = ctx.createRadialGradient(size / 2, HUD_H + size / 2, size * 0.25, size / 2, HUD_H + size / 2, size * 0.75);
    vg.addColorStop(0, 'rgba(120,20,40,0)'); vg.addColorStop(1, `rgba(120,20,40,${0.55 * Math.min(1, t)})`);
    ctx.fillStyle = vg; ctx.fillRect(0, HUD_H, size, size);
    // 떨어지는 재 (파티클)
    if (t < 6 && Math.random() < 0.5) MD.fx.ash(Math.random() * size, HUD_H + 4, size);
    // GAME OVER 픽셀 로고 — 위에서 쿵 떨어짐
    const px = Math.max(3, Math.floor(size / 110));
    const drop = Math.min(1, t * 2.2), ease = 1 - Math.pow(1 - drop, 3);
    const gy = HUD_H + size * 0.14 + (1 - ease) * -60;
    const red = (ry) => ['#ffd0d0', '#ff8a8a', '#e45b5b', '#e45b5b', '#b83a3a', '#8e2626', '#5e1515'][ry];
    const msg = R.reason === 'hp' ? 'GAME OVER' : 'NO MOVES';
    P.draw(ctx, msg, (size - P.width(msg, px)) / 2, gy, px, red, { shadow: 1.2, outline: '#0f0e1c' });
    // 해골 스프라이트 (살짝 흔들림)
    const sp = Math.max(3, px), sw = 16 * sp;
    ctx.imageSmoothingEnabled = false;
    if (t > 0.3) ctx.drawImage(MD.sprites.bake('skull', 1), Math.round(size / 2 - sw / 2 + Math.sin(t * 3) * 2), Math.round(gy + 9 * px + 8), sw, sw);
    // 결과 숫자 카운트업
    const k = Math.min(1, Math.max(0, (t - 0.6) / 0.8));
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const line = MD.t('result', Math.round(R.floor * k), Math.round(R.kills * k), Math.round(R.coins * k));
    ptext(line, size / 2, gy + 9 * px + 8 + sw + 20, 2, COLORS.ink, 'center', { shadow: 1 });
    if (t > 1.0) {
      const m = MD.meta.get(), found = Object.keys(m.codex || {}).length;
      const l1 = `BEST COMBO X${R.bestCombo}  ·  EVOLUTIONS ${found}/${C.EVOLVE.length + C.HIDDEN_EVOLVE.length}`;
      ptext(l1, size / 2, gy + 9 * px + 8 + sw + 44, 1.5, COLORS.dim, 'center');
      if (!R.newBest) ptext(MD.t('nextGoal', R.prevBest + 1), size / 2, gy + 9 * px + 8 + sw + 62, 1.5, '#7fc8ff', 'center');
      const feats = (run.feats || []).map((id) => MD.ach.byId(id)).filter(Boolean);
      if (feats.length) {
        let line = `${MD.t('featsRun')}: ` + feats.slice(0, 2).map((a) => MD.L(a.name)).join(', ') + (feats.length > 2 ? ` +${feats.length - 2}` : '');
        ptext(line.toUpperCase(), size / 2, gy + 9 * px + 8 + sw + 82, 1.5, GOLD, 'center');
      }
    }
    if (R.newBest && t > 1.4 && Math.floor(t * 3) % 2 === 0) {
      const px2 = Math.max(2, px - 1), nb = MD.t('newBest');
      P.draw(ctx, nb, (size - P.width(nb, px2)) / 2, gy + 9 * px + 8 + sw + 58, px2, COLORS.coin, { shadow: 1 });
    }
    if (t > 1.0) {
      const r = deadRects();
      button(r.retry.x, r.retry.y, r.retry.w, r.retry.h, MD.t('retry'), COLORS.weapon);
      button(r.menu.x, r.menu.y, r.menu.w, r.menu.h, MD.t('menu'), COLORS.card);
    }
  }
  function deadRects() {
    return {
      retry: { x: size / 2 - 92, y: HUD_H + size * 0.70, w: 184, h: 44 },
      menu: { x: size / 2 - 92, y: HUD_H + size * 0.70 + 52, w: 184, h: 38 },
    };
  }
  function hitDead(px, py) {
    const r = deadRects();
    if (inRect(r.retry, px, py)) return 'retry';
    if (inRect(r.menu, px, py)) return 'menu';
    return null;
  }

  let lastFrame = 0;
  function draw(run, meta, now) {
    const dt = Math.min(0.05, (now - lastFrame) / 1000 || 0.016); lastFrame = now;
    consumeFx(run, now);
    MD.fx.update(dt);
    setTheme(C.themeFor(run.stats.floor));
    ctx.fillStyle = theme.bg; ctx.fillRect(0, 0, size, size + HUD_H + FOOT_H);
    drawBackdrop(now);
    drawHUD(run, meta, now);
    const [sx, sy] = MD.fx.shakeOffset(now);
    ctx.save(); ctx.translate(sx, sy);
    setTheme(C.themeFor(run.stats.floor));
    bevel(0, HUD_H, size, size, theme.board, theme.cellHi, '#0f0e1c', 3);
    // 모서리 장식: 테마 색 꺾쇠 + 보석
    [[0, 0, 1, 1], [size, 0, -1, 1], [0, size, 1, -1], [size, size, -1, -1]].forEach(([cx, cy, sx, sy]) => {
      const x = cx, y = HUD_H + cy, L = 22, T = 3;
      ctx.fillStyle = theme.cellHi;
      ctx.fillRect(Math.min(x, x + sx * L), Math.min(y, y + sy * T), L, T);
      ctx.fillRect(Math.min(x, x + sx * T), Math.min(y, y + sy * L), T, L);
      ctx.fillStyle = theme.speck; ctx.fillRect(Math.min(x, x + sx * 7), Math.min(y, y + sy * 7), 7, 7);
      ctx.fillStyle = '#0f0e1c'; ctx.fillRect(Math.min(x + sx * 2, x + sx * 5), Math.min(y + sy * 2, y + sy * 5), 3, 3);
    });
    for (let r = 0; r < C.BOARD; r++) for (let c = 0; c < C.BOARD; c++) {
      const { x, y, cs } = cellXY(r, c);
      bevel(Math.round(x), Math.round(y), Math.round(cs), Math.round(cs), theme.cell, theme.cellHi, theme.cellLo, 2);
      specks(x, y, cs, r, c);
    }
    drawTiles(run, now);
    ambient(now);
    MD.fx.draw(ctx, now);
    ctx.restore();
    drawToasts(run, now);
    drawFooter(run, now);
    if (run.phase === 'altar') drawAltar(run, now);
    if (run.phase === 'branch') drawBranch(run);
    if (run.cutscene) drawCutscene(run, now);
    if (run.evolved) drawEvolved(run, now);
    if (run.stats.hp > 0 && run.stats.hp <= 3 && run.phase === 'playing') {
      const beat = Math.pow(Math.max(0, Math.sin(now / 420)), 6);
      const vg = ctx.createRadialGradient(size / 2, HUD_H + size / 2, size * 0.35, size / 2, HUD_H + size / 2, size * 0.75);
      vg.addColorStop(0, 'rgba(180,30,40,0)'); vg.addColorStop(1, `rgba(180,30,40,${0.25 + 0.3 * beat})`);
      ctx.fillStyle = vg; ctx.fillRect(0, HUD_H, size, size);
    }
    if (run.tutorial) drawTutorial(run, now);
    if (run.phase === 'choose') drawChoose(run);
    if (run.phase === 'dead') { drawDead(run, meta); MD.fx.draw(ctx, now); }
  }

  MD.render = { init, draw, drawTitle, drawShop, drawHeroes, drawCodex, drawDaily, hitDaily, hitAltar, hitTitle, hitShop, hitHeroes, hitCodex, hitBranch, hitDead, hitChoice, hitPerk, hitUndo, hitMute, COLORS };
})();
