#!/usr/bin/env bash
# UC-VID-005 ponta a ponta com o worker sobre o VideoWorker comum: cancelamento que liberta o worker e
# conclusão com JSON e vídeo anotado (H.264 + AAC).
# Fala com o projects (9002) e o users (10001), como o checkpoint.sh do spec 000.
# Pré-requisitos: docker compose up -d; bash projects/tests/fixtures/make-videos.sh
set -uo pipefail
PROJ="${PROJECTS:-https://localhost:9002}"
USERS="${USERS:-https://localhost:10001}"
FIX="$(cd "$(dirname "$0")/../.." && pwd)/projects/tests/fixtures/out"
C="curl -sk"; PASS=0; FAIL=0
check() { if [[ "$2" == "$3" ]]; then PASS=$((PASS+1)); echo "  ok   $1"; else FAIL=$((FAIL+1)); echo "  FAIL $1 (esperado $2, obtido $3)"; fi; }
json() { python3 -c "import sys,json; d=json.load(sys.stdin); print(eval(sys.argv[1]))" "$1"; }
uuid() { python3 -c "import uuid; print(uuid.uuid4())"; }
as() { local uid=$1; shift; $C -H "X-Caller-Id: $uid" "$@"; }
task() { as "$1" -o /tmp/det-body.json -w '%{http_code}' -X POST "$PROJ/$1/$2/video-tasks" -H 'Content-Type: application/json' -d "$3"; }
status() { as "$1" "$PROJ/$1/$2/video-tasks/$3" | json 'd["status"]'; }
wait_status() { local i s; for ((i=0;i<${5:-600};i++)); do s=$(status "$1" "$2" "$3"); [[ "$s" == "$4" || "$s" =~ ^(completed|failed|cancelled)$ ]] && { echo "$s"; return; }; sleep 1; done; echo "$s"; }

U=$($C -X POST "$USERS/" -H 'Content-Type: application/json' -d "{\"name\":\"det\",\"email\":\"det-$RANDOM$RANDOM@test.local\",\"password\":\"Passw0rd!\",\"type\":\"premium\"}" | json 'd["user"]["_id"]')
P=$(as "$U" -X POST "$PROJ/$U" -H 'Content-Type: application/json' -d '{"name":"detecao"}' | json 'd["_id"]')
SHORT=$(as "$U" -X POST "$PROJ/$U/$P/videos" -H "X-Upload-Id: $(uuid)" -F "video=@$FIX/vertical_1080x1920.mp4;type=video/mp4" | json 'd["id"]')
LONG=$(as "$U" -X POST "$PROJ/$U/$P/videos" -H "X-Upload-Id: $(uuid)" -F "video=@$FIX/ok_720p_30s.mp4;type=video/mp4" | json 'd["id"]')
[[ -n "$U" && -n "$P" && -n "$SHORT" && -n "$LONG" ]] || { echo "preparação falhou"; exit 1; }

echo "== Cancelamento liberta o worker (COM-016)"
check "deteção longa aceite → 202" 202 "$(task "$U" "$P" "{\"tool\":\"detect\",\"videoId\":\"$LONG\",\"params\":{\"tools\":[\"people_ai\",\"obj_ai\"]}}")"
T1=$(json 'd["id"]' </tmp/det-body.json)
check "passa a processing" processing "$(wait_status "$U" "$P" "$T1" processing 120)"
sleep 5
check "cancelar → 200" 200 "$(as "$U" -o /dev/null -w '%{http_code}' -X POST "$PROJ/$U/$P/video-tasks/$T1/cancel" -H 'Content-Type: application/json' -d '{}')"

echo "== Vídeo anotado H.264 com áudio (DET-004, DET-005, COM-027, COM-028)"
check "deteção curta com vídeo anotado → 202" 202 "$(task "$U" "$P" "{\"tool\":\"detect\",\"videoId\":\"$SHORT\",\"params\":{\"tools\":[\"people_ai\",\"obj_ai\"],\"annotatedVideo\":true}}")"
T2=$(json 'd["id"]' </tmp/det-body.json)
START=$(date +%s)
check "começa logo depois do cancelamento (≤ 60 s)" processing "$(wait_status "$U" "$P" "$T2" processing 60)"
echo "  (começou $(( $(date +%s) - START )) s depois do pedido)"
check "termina em completed" completed "$(wait_status "$U" "$P" "$T2" completed 900)"
RES=$(as "$U" "$PROJ/$U/$P/video-tasks/$T2" | json '" ".join(d["resultIds"])')
check "dois resultados (JSON + vídeo)" 2 "$(echo $RES | wc -w | tr -d ' ')"
for R in $RES; do
  K=$(as "$U" "$PROJ/$U/$P/videos/$R" | json 'd["kind"]')
  if [[ "$K" == video ]]; then
    check "vídeo anotado: h264 + aac, 1080×1920" "h264 aac 1080x1920" "$(as "$U" "$PROJ/$U/$P/videos/$R" | json 'd["videoCodec"]+" "+str(d["audioCodec"])+" "+str(d["width"])+"x"+str(d["height"])')"
  fi
done
check "a tarefa cancelada ficou cancelled" cancelled "$(status "$U" "$P" "$T1")"

echo "Resultado: $PASS ok, $FAIL falhas"
[[ $FAIL -eq 0 ]]
