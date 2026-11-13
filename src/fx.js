// Merge Dungeon — 이펙트: 파티클, 떠오르는 숫자, 슬래시, 화면 흔들림. 렌더 좌표(CSS px) 기준.
window.MD = window.MD || {};
(function () {
  let parts = [], floaters = [], slashes = [], shake = { t0: 0, mag: 0 };

  function burst(x, y, color, n, speed, size) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = (speed || 120) * (0.4 + Math.random() * 0.8);
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: 0.45 + Math.random() * 0.25, age: 0, color, size: size || 4, g: 260 });
    }
  }
  // 반짝이: 위로 천천히 떠오르는 작은 점
  function sparkle(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      parts.push({ x: x + (Math.random() - 0.5) * 40, y: y + (Math.random() - 0.5) * 40, vx: (Math.random() - 0.5) * 20, vy: -40 - Math.random() * 40, life: 0.6, age: 0, color, size: 3, g: 0, twinkle: true });
    }
  }
  // 사망 화면의 떨어지는 재
  function ash(x, y, size) {
    parts.push({ x, y, vx: (Math.random() - 0.5) * 15, vy: 25 + Math.random() * 30, life: 3 + Math.random() * 2, age: 0, color: Math.random() < 0.5 ? '#6b6680' : '#3e3a52', size: 2 + Math.random() * 2, g: 4 });
  }
  // 환경 파티클: 느리게 떠다니는 점. vy 양수=아래로. twinkle 옵션. 상한 80개
  let ambientCount = 0;
  function drift(x, y, color, alpha, vy, size, twinkle) {
    if (parts.filter((p) => p.ambient).length > 80) return;
    parts.push({ x, y, vx: (Math.random() - 0.5) * 12, vy, life: 2.5 + Math.random() * 2, age: 0, color, size: size || 3, g: 0, twinkle: !!twinkle, ambient: true, alpha });
  }
  function floater(x, y, text, color, big) {
    floaters.push({ x, y, text, color, big: !!big, age: 0, life: 0.9 });
  }
  function slash(x, y, size) { slashes.push({ x, y, size, age: 0, life: 0.18 }); }
  // 결투: 초상화 무대. 몬스터가 오른쪽에서 미끄러져 들어오고(0~0.18s), 영웅이 베고(0.18~0.3s), 몬스터가 파편으로 터진다(0.3s)
  let duels = [];
  function duel(stageX, stageY, stageW, monster, boss, color) { duels.push({ stageX, stageY, stageW, monster, boss, color: color || '#e45b5b', age: 0, life: 0.55, burst: false }); }
  function activeDuel() { return duels.length ? duels[duels.length - 1] : null; }
  function shakeScreen(mag) { shake = { t0: performance.now(), mag }; }

  function update(dt) {
    parts.forEach((p) => { p.age += dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; });
    parts = parts.filter((p) => p.age < p.life);
    floaters.forEach((f) => { f.age += dt; });
    floaters = floaters.filter((f) => f.age < f.life);
    slashes.forEach((s) => { s.age += dt; });
    slashes = slashes.filter((s) => s.age < s.life);
    duels.forEach((s) => { s.age += dt; });
    duels = duels.filter((s) => s.age < s.life);
  }

  function draw(ctx, now) {
    parts.forEach((p) => {
      const k = p.age / p.life;
      ctx.globalAlpha = (p.twinkle ? (Math.sin(p.age * (p.ambient ? 6 : 30)) * 0.5 + 0.5) : 1) * (p.ambient ? p.alpha * Math.sin(k * Math.PI) : 1 - k);
      ctx.fillStyle = p.color;
      const s = p.size * (p.twinkle ? 1 : 1 - k * 0.5);
      ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), Math.round(s), Math.round(s));
    });
    ctx.globalAlpha = 1;
    ctx.globalAlpha = 1;
    slashes.forEach((s) => {
      const k = s.age / s.life;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4 * (1 - k) + 1; ctx.globalAlpha = 1 - k;
      ctx.beginPath();
      const r = s.size * (0.5 + k * 0.4);
      ctx.moveTo(s.x - r, s.y - r * 0.7); ctx.lineTo(s.x + r, s.y + r * 0.7);
      ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s.x - r * 0.6, s.y + r * 0.8); ctx.lineTo(s.x + r * 0.6, s.y - r * 0.8); ctx.stroke();
    });
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    floaters.forEach((f) => {
      const k = f.age / f.life;
      ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      const y = f.y - 36 * (1 - (1 - k) * (1 - k));
      const P = MD.pixfont, txt = f.text.toUpperCase();
      if (P.supports(txt)) { const px = f.big ? 3 : 2; P.draw(ctx, txt, Math.round(f.x - P.width(txt, px) / 2), Math.round(y - 3.5 * px), px, f.color, { outline: '#0f0e1c' }); }
      else { ctx.font = `bold ${f.big ? 22 : 16}px system-ui, sans-serif`; ctx.lineWidth = 3; ctx.strokeStyle = '#0f0e1c'; ctx.strokeText(f.text, f.x, y); ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, y); }
    });
    ctx.globalAlpha = 1;
  }

  // 무대 안에 몬스터를 그린다 (초상화 클립 안에서 호출). 반환: 영웅이 공격 프레임이어야 하는지
  function drawDuel(ctx, d) {
    const t = d.age, sw = d.stageW * 0.62;
    let x, alpha = 1;
    if (t < 0.18) { const k = 1 - Math.pow(1 - t / 0.18, 3); x = d.stageX + d.stageW + 4 - (d.stageW * 0.55 + 4) * k; }
    else if (t < 0.3) { x = d.stageX + d.stageW * 0.45 + Math.sin(t * 90) * 1.5; }
    else {
      if (!d.burst) { d.burst = true; burst(d.stageX + d.stageW * 0.7, d.stageY + d.stageW * 0.55, d.color, d.boss ? 18 : 10, 110, 3); burst(d.stageX + d.stageW * 0.7, d.stageY + d.stageW * 0.55, '#ffffff', 6, 140, 2); }
      return true;
    }
    ctx.globalAlpha = alpha; ctx.imageSmoothingEnabled = false;
    ctx.drawImage(d.monster, Math.round(x), Math.round(d.stageY + (d.stageW - sw) / 2 + 4), sw, sw);
    ctx.globalAlpha = 1;
    return t >= 0.18;
  }

  function shakeOffset(now) {
    const t = (now - shake.t0) / 1000;
    if (t > 0.18) return [0, 0];
    const m = shake.mag * (1 - t / 0.18);
    return [(Math.random() - 0.5) * m, (Math.random() - 0.5) * m];
  }

  MD.fx = { burst, sparkle, ash, drift, floater, slash, duel, activeDuel, drawDuel, shakeScreen, update, draw, shakeOffset };
})();
