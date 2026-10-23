#!/usr/bin/env bash
# Medição de REQ-VID-SPD-006 (spec 006, T011): N alterações de velocidade de
# ok_1080p_60s.mp4 → percentil 95 de finishedAt − startedAt ≤ 2 min por minuto da maior das duas durações, origem ou resultado (1 vCPU).
# Segue o modelo de specs/000-video-common/load-test.sh: fala diretamente com o projects (9002) e o
# users (10001). As tarefas são feitas uma de cada vez: o tempo medido é o de processamento de uma
# réplica do video_speed_worker (1 vCPU), sem espera na fila. Adaptado de specs/002-video-trim/bench.sh.
# Pré-requisitos: docker compose up, fixtures geradas (projects/tests/fixtures/make-videos.sh).
# Uso: bash specs/006-video-speed/bench.sh [FATOR] [N]   (ex.: bench.sh 0.5 10)
set -uo pipefail

PROJ="${PROJECTS:-https://localhost:9002}"
USERS="${USERS:-https://localhost:10001}"
FIX="$(cd "$(dirname "$0")/../.." && pwd)/projects/tests/fixtures/out"
FACTOR="${1:-0.5}"
N="${2:-10}"
LIMIT_S=$(python3 -c "print(round(120 * max(1, 1 / $FACTOR), 1))")  # origem de 60 s
C="curl -sk"

json() { python3 -c "import sys,json; d=json.load(sys.stdin); print(eval(sys.argv[1]))" "$1"; }
uuid() { python3 -c "import uuid; print(uuid.uuid4())"; }
as() { local uid=$1; shift; $C -H "X-Caller-Id: $uid" "$@"; }

[[ -f "$FIX/ok_1080p_60s.mp4" ]] || { echo "Falta $FIX/ok_1080p_60s.mp4 (correr make-videos.sh)"; exit 1; }

UID_=$($C -X POST "$USERS/" -H 'Content-Type: application/json' \
  -d "{\"name\":\"bench\",\"email\":\"bench-speed-$RANDOM$RANDOM@test.local\",\"password\":\"Passw0rd!\",\"type\":\"premium\"}" | json 'd["user"]["_id"]')
PID=$(as "$UID_" -X POST "$PROJ/$UID_" -H 'Content-Type: application/json' -d '{"name":"bench-speed"}' | json 'd["_id"]')
VID=$(as "$UID_" -X POST "$PROJ/$UID_/$PID/videos" -H "X-Upload-Id: $(uuid)" \
  -F "video=@$FIX/ok_1080p_60s.mp4;type=video/mp4" | json 'd["id"]')
echo "utilizador $UID_, projeto $PID, vídeo $VID"

: >/tmp/speed-bench.txt
for i in $(seq 1 "$N"); do
  TASK=$(as "$UID_" -X POST "$PROJ/$UID_/$PID/video-tasks" -H 'Content-Type: application/json' \
    -d "{\"tool\":\"speed\",\"videoId\":\"$VID\",\"params\":{\"factor\":$FACTOR}}" \
    | json 'd.get("id","")')
  [[ -n "$TASK" ]] || { echo "  $i: pedido recusado"; continue; }
  # Até 15 min por tarefa (o tempo máximo de RNG-06 para 60 s)
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
  echo "$D" >>/tmp/speed-bench.txt
done

python3 - "$LIMIT_S" <<'EOF'
import math, sys
limit = float(sys.argv[1])
v = sorted(float(x) for x in open("/tmp/speed-bench.txt") if x.strip())
if not v:
    print("Sem medições"); sys.exit(1)
p95 = v[max(0, math.ceil(0.95 * len(v)) - 1)]
print(f"n={len(v)} mín={v[0]} s mediana={v[len(v)//2]} s p95={p95} s máx={v[-1]} s")
print("SPD-006 cumprido" if p95 <= limit else f"SPD-006 NÃO cumprido (p95 > {limit:.0f} s)")
sys.exit(0 if p95 <= limit else 1)
EOF
