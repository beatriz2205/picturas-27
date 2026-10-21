#!/usr/bin/env bash
# UC-VID-006 ponta a ponta: pedido de alteração de velocidade até ao resultado no projeto.
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
task() { as "$1" -o /tmp/spd-body.json -w '%{http_code}' -X POST "$PROJ/$1/$2/video-tasks" -H 'Content-Type: application/json' -d "$3"; }
wait_final() { local i s; for ((i=0;i<240;i++)); do s=$(as "$1" "$PROJ/$1/$2/video-tasks/$3" | json 'd["status"]'); [[ "$s" =~ ^(completed|failed|cancelled)$ ]] && { echo "$s"; return; }; sleep 0.5; done; echo "$s"; }

U=$($C -X POST "$USERS/" -H 'Content-Type: application/json' -d "{\"name\":\"spd\",\"email\":\"spd-$RANDOM$RANDOM@test.local\",\"password\":\"Passw0rd!\",\"type\":\"free\"}" | json 'd["user"]["_id"]')
P=$(as "$U" -X POST "$PROJ/$U" -H 'Content-Type: application/json' -d '{"name":"velocidade"}' | json 'd["_id"]')
V=$(as "$U" -X POST "$PROJ/$U/$P/videos" -H "X-Upload-Id: $(uuid)" -F "video=@$FIX/ok_720p_30s.mp4;type=video/mp4" | json 'd["id"]')
[[ -n "$U" && -n "$P" && -n "$V" ]] || { echo "preparação falhou"; exit 1; }

echo "== Velocidade inválida (SPD-005)"
check "3× → 400" 400 "$(task "$U" "$P" "{\"tool\":\"speed\",\"videoId\":\"$V\",\"params\":{\"factor\":3}}")"
check "nenhuma operação gasta" 5 "$(as "$U" "$PROJ/$U/video-limits" | json 'd["remainingOperations"]')"
check "ferramenta anunciada em video-limits" True "$(as "$U" "$PROJ/$U/video-limits" | json '"speed" in d["tools"]')"

echo "== 2× de um vídeo de 30 s (SPD-002, SPD-003)"
check "aceitação → 202" 202 "$(task "$U" "$P" "{\"tool\":\"speed\",\"videoId\":\"$V\",\"params\":{\"factor\":2}}")"
T=$(json 'd["id"]' </tmp/spd-body.json)
check "mesmo pedido em curso → 409" 409 "$(task "$U" "$P" "{\"tool\":\"speed\",\"videoId\":\"$V\",\"params\":{\"factor\":2}}")"
check "termina em completed" completed "$(wait_final "$U" "$P" "$T")"
R=$(as "$U" "$PROJ/$U/$P/video-tasks/$T" | json 'd["resultIds"][0]')
check "duração ≈ 15 s, mesma resolução" "15 1280x720" "$(as "$U" "$PROJ/$U/$P/videos/$R" | json 'str(round(d["durationS"]))+" "+str(d["width"])+"x"+str(d["height"])')"
check "resultado ligado à origem" "$V" "$(as "$U" "$PROJ/$U/$P/videos/$R" | json 'd["sourceVideoId"]')"
check "operação consumida" 4 "$(as "$U" "$PROJ/$U/video-limits" | json 'd["remainingOperations"]')"

echo "Resultado: $PASS ok, $FAIL falhas"
[[ $FAIL -eq 0 ]]
