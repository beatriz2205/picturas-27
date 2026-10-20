#!/usr/bin/env bash
# Teste de carga do spec 000 (T058; REQ-VID-COM-037: 5 tarefas em simultâneo e 100 em fila).
#   A) 6 utilizadores com uma tarefa cada e 5 workers → 5 em processing e 1 em queued;
#   B) 101 tarefas noop (34 utilizadores Premium, 3 tarefas cada) → todas terminam em completed.
# Fala diretamente com o projects (9002) e o users (10001), como o checkpoint.sh.
# Pré-requisitos: os mesmos do checkpoint.sh. O script põe o video_noop_worker com 5 réplicas e
# volta a 1 no fim.
# Uso: bash specs/000-video-common/load-test.sh [N_TAREFAS]
set -uo pipefail

PROJ="${PROJECTS:-https://localhost:9002}"
USERS="${USERS:-https://localhost:10001}"
FIX="$(cd "$(dirname "$0")/../.." && pwd)/projects/tests/fixtures/out"
N="${1:-101}"
C="curl -sk"
PASS=0
FAIL=0

check() {
  if [[ "$2" == "$3" ]]; then PASS=$((PASS + 1)); echo "  ok   $1"; else FAIL=$((FAIL + 1)); echo "  FAIL $1 (esperado $2, obtido $3)"; fi
}
json() { python3 -c "import sys,json; d=json.load(sys.stdin); print(eval(sys.argv[1]))" "$1"; }
uuid() { python3 -c "import uuid; print(uuid.uuid4())"; }
as() { local uid=$1; shift; $C -H "X-Caller-Id: $uid" "$@"; }
register() {
  $C -X POST "$USERS/" -H 'Content-Type: application/json' \
    -d "{\"name\":\"load\",\"email\":\"load-$1-$RANDOM$RANDOM@test.local\",\"password\":\"Passw0rd!\",\"type\":\"$1\"}" | json 'd["user"]["_id"]'
}
# Utilizador com um projeto e um vídeo curto → "uid pid vid"
setup_user() {
  local uid pid vid
  uid=$(register "$1")
  pid=$(as "$uid" -X POST "$PROJ/$uid" -H 'Content-Type: application/json' -d '{"name":"load"}' | json 'd["_id"]')
  vid=$(as "$uid" -X POST "$PROJ/$uid/$pid/videos" -H "X-Upload-Id: $(uuid)" -F "video=@$FIX/noaudio.mp4;type=video/mp4" | json 'd["id"]')
  echo "$uid $pid $vid"
}
start_task() { # uid pid vid sleepS → taskId
  as "$1" -X POST "$PROJ/$1/$2/video-tasks" -H 'Content-Type: application/json' \
    -d "{\"tool\":\"noop\",\"videoId\":\"$3\",\"params\":{\"sleepS\":$4}}" | json 'd.get("id","")'
}
status_of() { as "$1" "$PROJ/$1/$2/video-tasks/$3" | json 'd["status"]'; }

cleanup() { docker compose up -d --no-recreate --scale video_noop_worker=1 video_noop_worker >/dev/null 2>&1; }
trap cleanup EXIT

echo "== 5 workers"
docker compose up -d --no-recreate --scale video_noop_worker=5 video_noop_worker >/dev/null 2>&1
sleep 15
check "5 réplicas a correr" 5 "$(docker compose ps video_noop_worker --format '{{.Status}}' | grep -c Up)"

echo "== A) 6 utilizadores ao mesmo tempo → 5 em processamento e 1 em fila"
declare -a A_USERS A_TASKS
for i in $(seq 1 6); do A_USERS[$i]="$(setup_user free)"; done
for i in $(seq 1 6); do
  read -r u p v <<<"${A_USERS[$i]}"
  A_TASKS[$i]=$(start_task "$u" "$p" "$v" 20)
done
sleep 6
P=0; Q=0
for i in $(seq 1 6); do
  read -r u p v <<<"${A_USERS[$i]}"
  case "$(status_of "$u" "$p" "${A_TASKS[$i]}")" in processing) P=$((P + 1)) ;; queued) Q=$((Q + 1)) ;; esac
done
check "em processamento" 5 "$P"
check "em fila" 1 "$Q"

echo "== B) $N tarefas (Premium, 3 por utilizador)"
NU=$(((N + 2) / 3))
declare -a B_USERS
for i in $(seq 1 "$NU"); do B_USERS[$i]="$(setup_user premium)"; done
echo "  $NU utilizadores preparados"
T0=$(date +%s)
: >/tmp/load-tasks.txt
k=0
for i in $(seq 1 "$NU"); do
  read -r u p v <<<"${B_USERS[$i]}"
  for _ in 1 2 3; do
    [[ $k -ge $N ]] && break
    t=$(start_task "$u" "$p" "$v" 0)
    [[ -n "$t" ]] && echo "$u $p $t" >>/tmp/load-tasks.txt
    k=$((k + 1))
  done
done
check "$N tarefas aceites" "$N" "$(wc -l </tmp/load-tasks.txt | tr -d ' ')"

# Esperar que todas terminem (até 15 min)
for _ in $(seq 1 180); do
  DONE=0; OK=0
  while read -r u p t; do
    s=$(status_of "$u" "$p" "$t")
    case "$s" in completed) DONE=$((DONE + 1)); OK=$((OK + 1)) ;; failed | cancelled) DONE=$((DONE + 1)) ;; esac
  done </tmp/load-tasks.txt
  [[ $DONE -ge $N ]] && break
  sleep 5
done
echo "  tempo total: $(($(date +%s) - T0)) s"
check "todas terminaram em completed" "$N" "$OK"

echo
echo "Resultado: $PASS ok, $FAIL falhas"
[[ $FAIL -eq 0 ]]
