#!/usr/bin/env bash
# 검사 실행기. 사용: tests/run.sh p0 | p1 | full
# 전체 로그는 tests/logs/ 에 두고, 화면에는 요약만 낸다.
set -u
cd "$(dirname "$0")/.."
export NODE_PATH="${NODE_PATH:-$(npm root -g 2>/dev/null)}"
TIER="${1:-p0}"; mkdir -p tests/logs; FAIL=0
step() { # 이름, 명령...
  local name="$1"; shift
  local log="tests/logs/${name}.log" t0=$SECONDS
  if "$@" >"$log" 2>&1; then echo "PASS  $name ($((SECONDS-t0))s)"
  else echo "FAIL  $name ($((SECONDS-t0))s)  -> $log"; tail -n 6 "$log" | sed 's/^/      /'; FAIL=1; fi
}
syntax() { local bad=0; for f in src/*.js tests/*.js loop/*.js; do [ -f "$f" ] || continue; node --check "$f" || bad=1; done; return $bad; }
case "$TIER" in p0|p1|full) ;; *) echo "사용: tests/run.sh p0|p1|full"; exit 2;; esac
step syntax syntax
step browser node tests/browser.js            # 부팅, 콘솔 오류 0, 외부 통신 0, 한 판 완주, 저장소 차단 환경
if [ "$TIER" != p0 ]; then step achievements node tests/achievements.js; fi   # 저장 이전, 업적
if [ "$TIER" = full ]; then step balance node tests/balance.js; step guard node loop/guard.test.js; fi           # 실력 차, 빌드 차 (느림)
echo "RESULT $TIER $([ $FAIL = 0 ] && echo PASS || echo FAIL)"
exit $FAIL
