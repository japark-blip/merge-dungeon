#!/usr/bin/env node
// 루프 가드: 모델을 부르지 않는다. "계속해도 되는가"만 판정하고 상태를 파일에 남긴다.
// 사용: node loop/guard.js start <작업ID> | check | attempt <pass|fail> [--sig 실패요약] [--improved yes|no]
//       | halt <usage_limit|user_needed|cannot_run> [메모] | status
// 종료 코드: 0 CONTINUE, 10 DONE, 20 NO_TASK, 21 DUPLICATE, 22 STOP, 23 TIME_LIMIT,
//           24 RETRY_LIMIT, 25 STAGNATED, 26 USAGE_LIMIT, 27 USER_NEEDED, 28 CANNOT_RUN, 2 사용법 오류
const fs = require('fs'), path = require('path');
const DIR = process.env.GUARD_DIR || __dirname;
const now = () => (process.env.GUARD_NOW ? Number(process.env.GUARD_NOW) : Date.now());
const F = { state: path.join(DIR, '.run.json'), lock: path.join(DIR, '.lock'), stop: path.join(DIR, 'STOP'), log: path.join(DIR, 'LOG.md'), limits: path.join(DIR, 'limits.json') };
const CODES = { CONTINUE: 0, DONE: 10, NO_TASK: 20, DUPLICATE: 21, STOP: 22, TIME_LIMIT: 23, RETRY_LIMIT: 24, STAGNATED: 25, USAGE_LIMIT: 26, USER_NEEDED: 27, CANNOT_RUN: 28 };
const L = Object.assign({ maxRevisions: 2, maxMinutes: 20, sameFailureRepeats: 2, noImprovementRepeats: 2 }, fs.existsSync(F.limits) ? JSON.parse(fs.readFileSync(F.limits, 'utf8')) : {});
const load = () => (fs.existsSync(F.state) ? JSON.parse(fs.readFileSync(F.state, 'utf8')) : null);
const save = (s) => fs.writeFileSync(F.state, JSON.stringify(s, null, 2));
const out = (decision, why, s) => { console.log(JSON.stringify({ decision, why, task: s && s.task, attempts: s ? s.attempts.length : 0, minutes: s ? Math.round((now() - s.startedAt) / 6000) / 10 : 0, limits: L })); process.exit(CODES[decision]); };
function finish(s, decision, why) {
  s.ended = { decision, why, at: now() }; save(s);
  if (fs.existsSync(F.lock)) fs.unlinkSync(F.lock);
  const mins = Math.round((now() - s.startedAt) / 6000) / 10;
  if (fs.existsSync(F.log)) fs.appendFileSync(F.log, `| ${new Date(now()).toISOString().slice(0, 10)} | ${s.task} | ${s.attempts.length} | ${mins}분 | ${decision} | ${why} |\n`);
  out(decision, why, s);
}
function running() { const s = load(); if (!s || s.ended || !fs.existsSync(F.lock)) { console.log(JSON.stringify({ decision: 'NO_TASK', why: '진행 중인 실행이 없음. start 먼저.' })); process.exit(CODES.NO_TASK); } return s; }
function gates(s) { // 모든 명령 앞에서 보는 공통 중단 조건
  if (fs.existsSync(F.stop)) finish(s, 'STOP', 'STOP 파일이 있음');
  if (now() - s.startedAt > L.maxMinutes * 60000) finish(s, 'TIME_LIMIT', `${L.maxMinutes}분 초과`);
}
const [cmd, ...args] = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : undefined; };
if (cmd === 'start') {
  const id = args[0];
  if (fs.existsSync(F.stop)) { console.log(JSON.stringify({ decision: 'STOP', why: 'STOP 파일이 있음. 지우고 다시 시작.' })); process.exit(CODES.STOP); }
  if (fs.existsSync(F.lock)) { console.log(JSON.stringify({ decision: 'DUPLICATE', why: '다른 실행이 진행 중: ' + fs.readFileSync(F.lock, 'utf8') })); process.exit(CODES.DUPLICATE); }
  if (!id || !fs.existsSync(path.join(DIR, 'tasks', id + '.md'))) { console.log(JSON.stringify({ decision: 'NO_TASK', why: '승인된 작업 파일이 없음: tasks/' + (id || '?') + '.md' })); process.exit(CODES.NO_TASK); }
  const s = { task: id, startedAt: now(), attempts: [] };
  fs.writeFileSync(F.lock, id + ' @ ' + new Date(now()).toISOString()); save(s); out('CONTINUE', '시작', s);
} else if (cmd === 'check') {
  const s = running(); gates(s); out('CONTINUE', '한도 내', s);
} else if (cmd === 'attempt') {
  const s = running(); const result = args[0];
  if (result !== 'pass' && result !== 'fail') { console.error('attempt <pass|fail>'); process.exit(2); }
  s.attempts.push({ result, sig: opt('sig') || null, improved: opt('improved') || null, at: now() }); save(s);
  gates(s);
  if (result === 'pass') finish(s, 'DONE', '검사 통과');
  const sigs = s.attempts.map((a) => a.sig).filter(Boolean), last = sigs[sigs.length - 1];
  if (last && sigs.filter((x) => x === last).length >= L.sameFailureRepeats) finish(s, 'STAGNATED', '같은 실패 반복: ' + last);
  const tail = s.attempts.slice(-L.noImprovementRepeats);
  if (tail.length === L.noImprovementRepeats && tail.every((a) => a.improved === 'no')) finish(s, 'STAGNATED', `${L.noImprovementRepeats}회 연속 개선 없음`);
  if (s.attempts.length >= 1 + L.maxRevisions) finish(s, 'RETRY_LIMIT', `후보 ${1 + L.maxRevisions}개 소진`);
  out('CONTINUE', `수정 ${s.attempts.length}/${L.maxRevisions} 가능`, s);
} else if (cmd === 'halt') {
  const s = running(); const map = { usage_limit: 'USAGE_LIMIT', user_needed: 'USER_NEEDED', cannot_run: 'CANNOT_RUN' };
  if (!map[args[0]]) { console.error('halt <usage_limit|user_needed|cannot_run> [메모]'); process.exit(2); }
  finish(s, map[args[0]], args.slice(1).join(' ') || args[0]);
} else if (cmd === 'status') {
  const s = load(); console.log(JSON.stringify({ state: s, locked: fs.existsSync(F.lock), stop: fs.existsSync(F.stop), limits: L }, null, 2));
} else { console.error('사용: start <id> | check | attempt <pass|fail> [--sig x] [--improved yes|no] | halt <reason> | status'); process.exit(2); }
