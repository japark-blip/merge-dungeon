// Merge Dungeon — 입력: 방향키/WASD, 터치 스와이프, 마우스 드래그, 탭.
window.MD = window.MD || {};
(function () {
  const SWIPE_MIN = 30;

  function init(canvas, handlers) {
    const keys = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', a: 'left', d: 'right', w: 'up', s: 'down' };
    const unlock = () => { if (MD.audio) MD.audio.unlock(); };
    window.addEventListener('keydown', (e) => {
      unlock();
      const d = keys[e.key];
      if (handlers.onAnyKey && !e.repeat) handlers.onAnyKey(e.key);
      if (d) { e.preventDefault(); handlers.onDir(d); }
      else if (e.key === 'r' || e.key === 'R') handlers.onRestart();
      else if (e.key >= '1' && e.key <= '9') handlers.onChoice(Number(e.key) - 1);
      else if (e.key === 'z' || e.key === 'Z') handlers.onUndo();
      else if (e.key === 'm' || e.key === 'M') handlers.onMute();
    });

    let start = null;
    const pos = (e) => {
      const p = e.touches ? e.touches[0] : e;
      const rect = canvas.getBoundingClientRect();
      return { x: p.clientX - rect.left, y: p.clientY - rect.top };
    };
    const down = (e) => { unlock(); start = pos(e); };
    const up = (e) => {
      if (!start) return;
      const p = e.changedTouches ? { x: e.changedTouches[0].clientX - canvas.getBoundingClientRect().left, y: e.changedTouches[0].clientY - canvas.getBoundingClientRect().top } : pos(e);
      const dx = p.x - start.x, dy = p.y - start.y;
      start = null;
      if (Math.abs(dx) < SWIPE_MIN && Math.abs(dy) < SWIPE_MIN) { handlers.onTap(p.x, p.y); return; }
      if (Math.abs(dx) > Math.abs(dy)) handlers.onDir(dx > 0 ? 'right' : 'left');
      else handlers.onDir(dy > 0 ? 'down' : 'up');
    };
    canvas.addEventListener('touchstart', (e) => { e.preventDefault(); down(e); }, { passive: false });
    canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    canvas.addEventListener('touchend', (e) => { e.preventDefault(); up(e); }, { passive: false });
    canvas.addEventListener('mousedown', down);
    canvas.addEventListener('mouseup', up);
    canvas.addEventListener('mousemove', (e) => { if (!start && handlers.onHover) { const p = pos(e); handlers.onHover(p.x, p.y); } });
  }

  MD.input = { init };
})();
