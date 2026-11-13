// Merge Dungeon — 레트로 타이틀 화면. 픽셀 로고, 깜빡이는 PRESS ANY KEY, 벽돌 배경, 통통 튀는 슬라임.
window.MD = window.MD || {};
(function () {
  const C = MD.CONFIG;
  let t0 = null;

  const rects = (size, H) => ({
    shop: { x: 16, y: H - 44, w: 84, h: 32 },
    codex: { x: 16 + 84 + 6, y: H - 44, w: 84, h: 32 },
    daily: { x: 16 + 84 + 6 + 84 + 6, y: H - 44, w: 66, h: 32 },
    lang: { x: size - 16 - 44 - 6 - 50, y: H - 44, w: 50, h: 32 },
    sound: { x: size - 16 - 44, y: H - 44, w: 44, h: 32 },
  });

  function brickWall(ctx, size, y0, h, scroll) {
    const bw = 24, bh = 12;
    for (let row = 0; row * bh < h; row++) {
      const off = (row % 2) * (bw / 2) - (scroll % bw);
      for (let x = off - bw; x < size + bw; x += bw) {
        const y = y0 + row * bh;
        ctx.fillStyle = row % 2 ? '#2b2846' : '#2f2c4c';
        ctx.fillRect(x, y, bw - 2, bh - 2);
      }
    }
  }

  function draw(ctx, size, HUD_H, FOOT_H, meta, now) {
    if (t0 == null) t0 = now;
    const t = (now - t0) / 1000;
    const H = size + HUD_H + FOOT_H;
    const P = MD.pixfont;
    // 하늘 → 던전 그라데이션 띠 (레트로 밴드)
    const bands = ['#120f24', '#17132d', '#1b1a2e', '#1f1d36', '#231f3e'];
    bands.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(0, (H * i) / bands.length, size, H / bands.length + 1); });
    // 별
    ctx.fillStyle = '#9a97b8';
    for (let i = 0; i < 28; i++) {
      const sx = (i * 97 + 31) % size, sy = (i * 53 + 17) % (H * 0.45);
      if (Math.sin(t * 2 + i) > -0.2) ctx.fillRect(sx, sy, 2, 2);
    }
    // 바닥 벽돌
    const wallY = H * 0.62;
    brickWall(ctx, size, wallY, H - wallY, t * 12);
    ctx.fillStyle = '#0f0e1c'; ctx.fillRect(0, wallY - 3, size, 3);

    // 로고: MERGE (금색 그라데이션) / DUNGEON (보라→파랑)
    const px = Math.max(3, Math.floor(size / 95));
    const gold = (ry) => ['#fff1b0', '#ffe27a', '#f7c948', '#f7c948', '#e0a52f', '#c98a17', '#a86d0e'][ry];
    const violet = (ry) => ['#e6c6ff', '#c99cff', '#a86ef5', '#9257e0', '#7a45c7', '#6436a8', '#4f2a8a'][ry];
    const bob = Math.sin(t * 2) * 3;
    const w1 = P.width('MERGE', px), w2 = P.width('DUNGEON', px);
    const ly = H * 0.16 + bob;
    P.draw(ctx, 'MERGE', (size - w1) / 2, ly, px, gold, { shadow: 1.2, outline: '#1a1626' });
    P.draw(ctx, 'DUNGEON', (size - w2) / 2, ly + 9 * px, px, violet, { shadow: 1.2, outline: '#1a1626' });
    // 부제
    const px2 = Math.max(2, px - 2);
    const sub = 'SLIDE & SLAY';
    P.draw(ctx, sub, (size - P.width(sub, px2)) / 2, ly + 18 * px + 4, px2, '#9a97b8', { gap: 1 });

    // 스프라이트 퍼레이드 (벽돌 위를 걷는 슬라임/검)
    const sp = 4, sw = 16 * sp;
    const parade = [{ type: 'monster', lv: 1 }, { type: 'weapon', lv: 2 }, { type: 'monster', lv: 3 }, { type: 'coin', lv: 1 }, { type: 'boss', lv: 1 }, { type: 'potion', lv: 1 }];
    ctx.imageSmoothingEnabled = false;
    // 영웅이 행렬 맨 앞에서 걷는다
    const heroX = ((t * 28) % (parade.length * (sw + 28))) - sw - sw - 10;
    ctx.drawImage(MD.sprites.hero(meta.hero || 'knight', Math.floor(t * 4) % 2), Math.round(heroX), Math.round(wallY - sw + 6 - Math.abs(Math.sin(t * 8)) * 3), sw, sw);
    parade.forEach((it, i) => {
      const spacing = sw + 28;
      const x = ((t * 28 + i * spacing) % (parade.length * spacing)) - sw;
      const hop = it.type === 'weapon' ? 0 : Math.abs(Math.sin(t * 5 + i)) * 8;
      ctx.drawImage(MD.sprites.get(it), Math.round(x), Math.round(wallY - sw + 6 - hop), sw, sw);
    });

    // PRESS ANY KEY (깜빡임)
    if (Math.floor(t * 2.2) % 2 === 0) {
      const msg = 'PRESS ANY KEY';
      const px3 = Math.max(2, px - 1);
      P.draw(ctx, msg, (size - P.width(msg, px3)) / 2, H * 0.70, px3, '#f2efe9', { shadow: 1 });
    }
    // 기록
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillStyle = '#9a97b8';
    ctx.fillText(MD.t('title_stats', meta.bestFloor, meta.coins, meta.runs), size / 2, H * 0.70 + 7 * px + 12);

    // 하단 버튼 (상점 / 사운드)
    const r = rects(size, H);
    const btn = (b, label) => {
      ctx.fillStyle = '#0f0e1c'; ctx.fillRect(b.x + 2, b.y + 2, b.w, b.h);
      ctx.fillStyle = '#35345a'; ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = '#6c69a6'; ctx.lineWidth = 1; ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
      ctx.fillStyle = '#f2efe9'; ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2);
    };
    const n = Object.keys(meta.relics).length;
    btn(r.shop, MD.t('title_shop', n, C.RELICS.length));
    // 현재 영웅
    ctx.fillStyle = '#9a97b8'; ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'center';
    const worn = MD.ach ? MD.ach.titleText() : '';
    ctx.fillText(MD.t('heroLine', (worn ? worn + ' ' : '') + MD.L(C.HEROES.find((h) => h.id === meta.hero).name)), size / 2, H * 0.70 + 7 * px + 30);
    btn(r.codex, MD.t('records'));
    btn(r.daily, MD.t('daily'));
    btn(r.lang, MD.i18n.getLang() === 'en' ? 'EN·한' : '한·EN');
    btn(r.sound, meta.muted ? '♪✕' : '♪');
  }

  // 반환: 'shop' | 'sound' | 'start' (그 외 영역)
  function hit(size, HUD_H, FOOT_H, px, py) {
    const r = rects(size, size + HUD_H + FOOT_H);
    const inR = (b) => px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;
    if (inR(r.shop)) return 'shop';
    if (inR(r.lang)) return 'lang';
    if (inR(r.codex)) return 'codex';
    if (inR(r.daily)) return 'daily';
    if (inR(r.sound)) return 'sound';
    return 'start';
  }

  MD.title = { draw, hit };
})();
