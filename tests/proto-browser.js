// 원형 화면 점검: 부팅, 콘솔 오류 0, 외부 통신 0, 키와 누르기로 한 판 완주.  node tests/proto-browser.js [스크린샷 경로]
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [], reqs = []; p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); p.on('request', (r) => reqs.push(r.url()));
  await p.goto('file://' + path.resolve(__dirname, '..', 'proto', 'index.html')); await p.waitForTimeout(200);
  let taps = 0, slides = 0, shot = false;
  for (let i = 0; i < 1500; i++) {
    const st = await p.evaluate(() => ({ over: FDdebug.s.over, turns: FDdebug.s.turns, room: FDdebug.s.room }));
    if (st.over) break;
    if (!shot && st.turns >= 12 && process.argv[2]) { await p.screenshot({ path: process.argv[2] }); shot = true; }
    const kill = await p.$('.cell.kill');
    if (kill) { await kill.click(); taps++; continue; }                      // 실제 클릭으로 사용
    if (i % 5 === 4) { const t = await p.$('.cell.t'); if (t) { await t.click(); taps++; continue; } }
    await p.keyboard.press(['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp'][Math.floor(Math.random() * 4)]); slides++;
  }
  const end = await p.evaluate(() => ({ over: FDdebug.s.over, room: FDdebug.s.room, turns: FDdebug.s.turns, overlay: !!document.querySelector('.over') }));
  const wide = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  const external = reqs.filter((u) => !u.startsWith('file://'));
  console.log(JSON.stringify({ end, taps, slides, errors: errors.length, external: external.length, horizontalScroll: wide }));
  const bad = []; if (!end.over || !end.overlay) bad.push('run did not end'); if (errors.length) bad.push('errors: ' + errors[0]); if (external.length) bad.push('external: ' + external[0]); if (!taps || !slides) bad.push('input not exercised'); if (wide) bad.push('page scrolls sideways');
  await b.close(); if (bad.length) { console.log('FAIL', bad.join('; ')); process.exitCode = 1; } else console.log('OK');
})().catch((e) => { console.log('ERR', e.message); process.exit(1); });
