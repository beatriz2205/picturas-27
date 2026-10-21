#!/usr/bin/env bash
# Medição de REQ-VID-TRIM-011 (spec 002, T018): 20 recortes de 30 s (10–40 s, resolução original) de
# ok_1080p_60s.mp4 → percentil 95 de finishedAt − startedAt ≤ 60 s com 1 vCPU por worker.
# Segue o modelo de specs/000-video-common/load-test.sh: fala diretamente com o projects (9002) e o
# users (10001). As tarefas são feitas uma de cada vez: o tempo medido é o de processamento de uma
# réplica do video_trim_worker (1 vCPU), sem espera na fila. Modelo para os bench.sh de 003 a 005.
# Pré-requisitos: docker compose up, fixtures geradas (projects/tests/fixtures/make-videos.sh).
# Uso: bash specs/002-video-trim/bench.sh [N]
set -uo pipefail

PROJ="${PROJECTS:-https://localhost:9002}"
USERS="${USERS:-https://localhost:10001}"
FIX="$(cd "$(dirname "$0")/../.." && pwd)/projects/tests/fixtures/out"
N="${1:-20}"
LIMIT_S=60
C="curl -sk"

json() { python3 -c "import sys,json; d=json.load(sys.stdin); print(eval(sys.argv[1]))" "$1"; }
uuid() { python3 -c "import uuid; print(uuid.uuid4())"; }
as() { local uid=$1; shift; $C -H "X-Caller-Id: $uid" "$@"; }

[[ -f "$FIX/ok_1080p_60s.mp4" ]] || { echo "Falta $FIX/ok_1080p_60s.mp4 (correr make-videos.sh)"; exit 1; }

UID_=$($C -X POST "$USERS/" -H 'Content-Type: application/json' \
  -d "{\"name\":\"bench\",\"email\":\"bench-trim-$RANDOM$RANDOM@test.local\",\"password\":\"Passw0rd!\",\"type\":\"premium\"}" | json 'd["user"]["_id"]')
PID=$(as "$UID_" -X POST "$PROJ/$UID_" -H 'Content-Type: application/json' -d '{"name":"bench-trim"}' | json 'd["_id"]')
VID=$(as "$UID_" -X POST "$PROJ/$UID_/$PID/videos" -H "X-Upload-Id: $(uuid)" \
  -F "video=@$FIX/ok_1080p_60s.mp4;type=video/mp4" | json 'd["id"]')
echo "utilizador $UID_, projeto $PID, vídeo $VID"

: >/tmp/trim-bench.txt
for i in $(seq 1 "$N"); do
  TASK=$(as "$UID_" -X POST "$PROJ/$UID_/$PID/video-tasks" -H 'Content-Type: application/json' \
    -d "{\"tool\":\"trim\",\"videoId\":\"$VID\",\"params\":{\"startS\":10,\"endS\":40}}" \
    | json 'd.get("id","")')
  [[ -n "$TASK" ]] || { echo "  $i: pedido recusado"; continue; }
  # Até 15 min por tarefa
  for _ in $(seq 1 180); do
    T=$(as "$UID_" "$PROJ/$UID_/$PID/video-tasks/$TASK")
    S=$(echo "$T" | json 'd["status"]')
    [[ "$S" == completed || "$S" == failed || "$S" == cancelled ]] && break
    sleep 5
  done
  if [[ "$S" != completed ]]; then
    echo "  $i: $S ($(echo "$T" | json '(d.get("reason") or {}).get("code")'))"
    continue
  fi
  D=$(echo "$T" | python3 -c "import sys,json,datetime as dt; d=json.load(sys.stdin); f=lambda s: dt.datetime.fromisoformat(s.replace('Z','+00:00')); print(round((f(d['finishedAt'])-f(d['startedAt'])).total_seconds(),1))")
  echo "  $i: $D s"
  echo "$D" >>/tmp/trim-bench.txt
done

python3 - "$LIMIT_S" <<'EOF'
import math, sys
limit = float(sys.argv[1])
v = sorted(float(x) for x in open("/tmp/trim-bench.txt") if x.strip())
if not v:
    print("Sem medições"); sys.exit(1)
p95 = v[max(0, math.ceil(0.95 * len(v)) - 1)]
print(f"n={len(v)} mín={v[0]} s mediana={v[len(v)//2]} s p95={p95} s máx={v[-1]} s")
print("TRIM-011 cumprido" if p95 <= limit else f"TRIM-011 NÃO cumprido (p95 > {limit:.0f} s)")
sys.exit(0 if p95 <= limit else 1)
EOF
