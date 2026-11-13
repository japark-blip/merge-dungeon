const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 2 });
  const errors = [], reqs = [];
  p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type()==='error') errors.push(m.text()); });
  p.on('request', r => reqs.push(r.url()));
  await p.goto('file://' + require('path').resolve(__dirname, '..', 'index.html')); await p.waitForTimeout(300);
  await p.keyboard.press('Space'); await p.waitForTimeout(200); await p.keyboard.press('Enter'); await p.waitForTimeout(300);
  await p.screenshot({ path: process.argv[2] + '/tutorial.png' });
  await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(100);
  // play a full run with keys until dead
  for (let i = 0; i < 600; i++) {
    const ph = await p.evaluate(() => MD.debug.run.phase);
    if (ph === 'dead') break;
    if (ph === 'choose' || ph === 'branch' || ph === 'altar') { await p.keyboard.press(String(1 + (i % 3))); if (ph === 'altar') await p.keyboard.press('3'); continue; }
    await p.evaluate(() => { if (MD.debug.run.cutscene) MD.debug.run.cutscene = null; if (MD.debug.run.evolved) MD.debug.run.evolved.t0 = 0; });
    await p.keyboard.press(['ArrowLeft','ArrowUp','ArrowRight','ArrowDown'][i % 4]); await p.waitForTimeout(15);
  }
  const res = await p.evaluate(() => ({ phase: MD.debug.run.phase, floor: MD.debug.run.result && MD.debug.run.result.floor, save: localStorage.getItem('merge-dungeon-save') }));
  console.log('run:', JSON.stringify(res).slice(0, 200));
  const external = reqs.filter(u => !u.startsWith('file://'));
  console.log('requests:', reqs.length, 'external:', external.length, external.slice(0, 3));
  console.log('errors:', errors.length, errors.slice(0, 3));
  // no-localStorage environment
  const p2 = await b.newPage({ viewport: { width: 390, height: 760 } });
  const errs2 = []; p2.on('pageerror', e => errs2.push(e.message));
  await p2.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }); });
  await p2.goto('file://' + require('path').resolve(__dirname, '..', 'index.html')); await p2.waitForTimeout(300);
  await p2.keyboard.press('Space'); await p2.waitForTimeout(150); await p2.keyboard.press('Enter'); await p2.waitForTimeout(150); await p2.keyboard.press('ArrowLeft'); await p2.waitForTimeout(100); await p2.keyboard.press('ArrowUp'); await p2.waitForTimeout(200);
  console.log('no-localStorage errors:', errs2.length, errs2.slice(0, 2), 'phase', await p2.evaluate(() => MD.debug.run && MD.debug.run.phase));
  const bad = [];
  if (res.phase !== 'dead') bad.push('run did not reach death: ' + res.phase);
  if (external.length) bad.push('external requests: ' + external.length);
  if (errors.length) bad.push('console errors: ' + errors.length);
  if (errs2.length) bad.push('no-localStorage errors: ' + errs2.length);
  if (bad.length) { console.log('FAIL', bad.join('; ')); process.exitCode = 1; } else console.log('OK');
  await b.close();
})().catch(e => { console.log('ERR', e.message); process.exit(1); });
