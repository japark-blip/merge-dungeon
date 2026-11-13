// 가드 모의 실행: 모델을 부르지 않고 종료 조건 8가지를 확인한다.  node loop/guard.test.js
const { spawnSync } = require('child_process'); const fs = require('fs'), os = require('os'), path = require('path');
const G = path.join(__dirname, 'guard.js'); let fails = 0, T0 = 1700000000000;
function world() { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-')); fs.mkdirSync(path.join(d, 'tasks')); fs.writeFileSync(path.join(d, 'tasks', 'R-1.md'), '# R-1'); fs.writeFileSync(path.join(d, 'LOG.md'), ''); return d; }
function g(d, t, ...a) { const r = spawnSync('node', [G, ...a], { env: { ...process.env, GUARD_DIR: d, GUARD_NOW: String(T0 + t * 60000) }, encoding: 'utf8' }); let j = {}; try { j = JSON.parse(r.stdout.trim().split('\n').pop()); } catch (e) {} return { code: r.status, decision: j.decision }; }
function expect(name, got, want) { const ok = got.decision === want; if (!ok) fails++; console.log((ok ? 'PASS  ' : 'FAIL  ') + name + '  -> ' + got.decision + ' (exit ' + got.code + ')' + (ok ? '' : ', expected ' + want)); }
let d;
d = world(); expect('1 작업 없음', g(d, 0, 'start', 'R-404'), 'NO_TASK');
d = world(); g(d, 0, 'start', 'R-1'); expect('2 정상 완료', g(d, 3, 'attempt', 'pass'), 'DONE');
             expect('2b 완료 뒤 잠금 해제, 다시 시작 가능', g(d, 4, 'start', 'R-1'), 'CONTINUE');
d = world(); g(d, 0, 'start', 'R-1'); g(d, 1, 'attempt', 'fail', '--sig', 'a', '--improved', 'yes'); const r2 = g(d, 2, 'attempt', 'fail', '--sig', 'b', '--improved', 'yes');
             expect('3a 수정 2회까지는 계속', r2, 'CONTINUE'); expect('3 재시도 상한(후보 3개)', g(d, 3, 'attempt', 'fail', '--sig', 'c', '--improved', 'yes'), 'RETRY_LIMIT');
d = world(); g(d, 0, 'start', 'R-1'); g(d, 1, 'attempt', 'fail', '--sig', 'boot-error'); expect('4a 같은 실패 2회', g(d, 2, 'attempt', 'fail', '--sig', 'boot-error'), 'STAGNATED');
d = world(); g(d, 0, 'start', 'R-1'); g(d, 1, 'attempt', 'fail', '--sig', 'x', '--improved', 'no'); expect('4b 2회 연속 개선 없음', g(d, 2, 'attempt', 'fail', '--sig', 'y', '--improved', 'no'), 'STAGNATED');
d = world(); g(d, 0, 'start', 'R-1'); fs.writeFileSync(path.join(d, 'STOP'), ''); expect('5 STOP (진행 중)', g(d, 1, 'check'), 'STOP'); expect('5b STOP (시작 전)', g(d, 2, 'start', 'R-1'), 'STOP');
d = world(); g(d, 0, 'start', 'R-1'); expect('6a 19분은 계속', g(d, 19, 'check'), 'CONTINUE'); expect('6 시간 한도(21분)', g(d, 21, 'check'), 'TIME_LIMIT');
d = world(); g(d, 0, 'start', 'R-1'); expect('7 사용량 제한 신호', g(d, 1, 'halt', 'usage_limit'), 'USAGE_LIMIT'); expect('7b 중단 뒤 계속 불가', g(d, 2, 'attempt', 'fail'), 'NO_TASK');
d = world(); g(d, 0, 'start', 'R-1'); expect('8 중복 실행', g(d, 1, 'start', 'R-1'), 'DUPLICATE');
console.log(fails ? `RESULT FAIL (${fails})` : 'RESULT PASS'); process.exit(fails ? 1 : 0);
