// 원형 수치 측정: 무작위 / 연타 / 신중한 플레이의 도달 방 수.  node tests/proto-sim.js [판 수]
const FD = require('../proto/core.js'); const RUNS = Number(process.argv[2] || 300), CAP = 3000;
const tiles = (s, t) => s.grid.map((c, i) => (c && (!t || c.t === t) ? { i, v: FD.power(c), t: c.t, lv: c.lv } : null)).filter(Boolean);
const policies = {
  random(s, r) { const L = FD.legalSlides(s), T = tiles(s); if (L.length && (r() < 0.6 || !T.length)) return FD.slide(s, L[Math.floor(r() * L.length)]); return FD.use(s, T[Math.floor(r() * T.length)].i); },
  masher(s, r, st) { const L = FD.legalSlides(s); if (!L.length) { const T = tiles(s); return FD.use(s, T[Math.floor(r() * T.length)].i); } const seq = ['left', 'down', 'right', 'down']; for (let k = 0; k < 4; k++) { const d = seq[(st.n = (st.n || 0) + 1) % 4]; if (L.includes(d)) return FD.slide(s, d); } return FD.slide(s, L[0]); },
  careful(s) {
    const e = s.enemy, S = tiles(s, 'S').sort((a, b) => a.v - b.v), H = tiles(s, 'H').sort((a, b) => a.v - b.v), P = tiles(s, 'P').sort((a, b) => b.v - a.v), C = tiles(s, 'C');
    const kill = S.find((x) => x.v >= e.hp); if (kill) return FD.use(s, kill.i);                       // 딱 맞는 검으로 처치
    const sum = S.reduce((a, x) => a + x.v, 0);
    if (e.timer <= 1) {                                                                                 // 맞기 직전
      if (sum >= e.hp) return FD.use(s, S[S.length - 1].i);                                             // 죽일 수 있으면 죽인다
      if (s.block < e.atk && H.length) return FD.use(s, H[0].i);                                        // 아니면 막는다
    }
    if (P.length && s.hp <= s.maxHp - P[P.length - 1].v && s.hp < s.maxHp * 0.6) return FD.use(s, P[P.length - 1].i);
    const empties = s.grid.filter((c) => !c).length;
    if (C.length && empties <= 2) return FD.use(s, C[0].i);
    const L = FD.legalSlides(s);
    if (!L.length) { const T = tiles(s).sort((a, b) => a.v - b.v); return FD.use(s, (C[0] || T[0]).i); }
    let best = L[0], bs = -1; for (const d of L) { const g = FD.slideGrid(s.grid, d); const sc = g.merges * 3 + g.grid.filter((c) => !c).length; if (sc > bs) { bs = sc; best = d; } }
    return FD.slide(s, best);
  },
};
const median = (a) => { const b = a.slice().sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
const out = {};
for (const name of Object.keys(policies)) {
  const rooms = [], turns = [];
  for (let i = 0; i < RUNS; i++) { const s = FD.newGame(1000 + i); let seed = 7 + i; const r = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296); const st = {}; let steps = 0; while (!s.over && steps++ < CAP) policies[name](s, r, st); rooms.push(s.room - 1); turns.push(s.turns); }
  out[name] = { median: median(rooms), avg: +(rooms.reduce((a, b) => a + b, 0) / RUNS).toFixed(2), max: Math.max(...rooms), medianTurns: median(turns), capped: rooms.filter((_, i) => turns[i] >= CAP - 5).length };
  console.log(name.padEnd(8), JSON.stringify(out[name]));
}
const ratio = out.careful.median / Math.max(1, out.random.median);
console.log('skill gap (careful/random median):', ratio.toFixed(2), ratio >= 2 ? 'OK' : 'FAIL (<2)');
process.exitCode = ratio >= 2 ? 0 : 1;
