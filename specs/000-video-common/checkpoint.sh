#!/usr/bin/env bash
# Checkpoint da Phase 2 do spec 000: uma tarefa "noop" passa por queued → processing → completed e gera
# um resultado no armazenamento. Fala diretamente com o projects (porta 9002) e o users (10001), sem
# nginx nem gateway, como os workers e o gateway fazem na rede interna (X-Caller-Id).
# Pré-requisitos:
#   docker compose up -d rabbitmq projects_mongoDB users_mongoDB users seaweedfs img_storage projects ws_gateway video_noop_worker
#   bash projects/tests/fixtures/make-videos.sh
# Uso: bash specs/000-video-common/checkpoint.sh
set -uo pipefail

PROJ="${PROJECTS:-https://localhost:9002}"
USERS="${USERS:-https://localhost:10001}"
FIX="$(cd "$(dirname "$0")/../.." && pwd)/projects/tests/fixtures/out"
C="curl -sk"
PASS=0
FAIL=0

check() { # descrição, esperado, obtido
  if [[ "$2" == "$3" ]]; then PASS=$((PASS + 1)); echo "  ok   $1"; else FAIL=$((FAIL + 1)); echo "  FAIL $1 (esperado $2, obtido $3)"; fi
}
json() { python3 -c "import sys,json; d=json.load(sys.stdin); print(eval(sys.argv[1]))" "$1"; }
uuid() { python3 -c "import uuid; print(uuid.uuid4())"; }

register() { # tipo → id
  $C -X POST "$USERS/" -H 'Content-Type: application/json' \
    -d "{\"name\":\"chk\",\"email\":\"chk-$1-$RANDOM$RANDOM@test.local\",\"password\":\"Passw0rd!\",\"type\":\"$1\"}" | json 'd["user"]["_id"]'
}
as() { # uid, resto dos argumentos do curl
  local uid=$1; shift
  $C -H "X-Caller-Id: $uid" "$@"
}
task() { # uid pid body → "status body"
  as "$1" -o /tmp/chk-body.json -w '%{http_code}' -X POST "$PROJ/$1/$2/video-tasks" -H 'Content-Type: application/json' -d "$3"
}
wait_status() { # uid pid tid estado-esperado segundos → estado final observado
  local i
  for ((i = 0; i < $5 * 2; i++)); do
    s=$(as "$1" "$PROJ/$1/$2/video-tasks/$3" | json 'd["status"]')
    [[ "$s" == "$4" || "$s" == "failed" || "$s" == "cancelled" || "$s" == "completed" ]] && { echo "$s"; return; }
    sleep 0.5
  done
  echo "$s"
}
remaining() { as "$1" "$PROJ/$1/video-limits" | json 'd["remainingOperations"]'; }

echo "== Preparação"
FREE=$(register free)
PID=$(as "$FREE" -X POST "$PROJ/$FREE" -H 'Content-Type: application/json' -d '{"name":"checkpoint"}' | json 'd["_id"]')
VID=$(as "$FREE" -X POST "$PROJ/$FREE/$PID/videos" -H "X-Upload-Id: $(uuid)" -F "video=@$FIX/ok_720p_30s.mp4;type=video/mp4" | json 'd["id"]')
echo "  free=$FREE projeto=$PID vídeo=$VID"
[[ -n "$FREE" && -n "$PID" && -n "$VID" ]] || { echo "preparação falhou (users, projects ou armazenamento em baixo?)"; exit 1; }
check "operações iniciais" 5 "$(remaining "$FREE")"

echo "== Ciclo de vida (COM-011 a COM-014, COM-026, COM-036)"
T0=$(date +%s%N)
check "aceitação → 202" 202 "$(task "$FREE" "$PID" "{\"tool\":\"noop\",\"videoId\":\"$VID\",\"params\":{\"sleepS\":4}}")"
MS=$((($(date +%s%N) - T0) / 1000000))
check "aceitação ≤ 2 s (${MS} ms)" 1 "$((MS <= 2000))"
TID=$(json 'd["id"]' </tmp/chk-body.json)
check "estado inicial" queued "$(json 'd["status"]' </tmp/chk-body.json)"
check "passa a processing" processing "$(wait_status "$FREE" "$PID" "$TID" processing 15)"
sleep 2.5
check "progresso a meio > 0" 1 "$(as "$FREE" "$PROJ/$FREE/$PID/video-tasks/$TID" | json 'int(d["progress"] > 0)')"
check "operação reservada" 4 "$(remaining "$FREE")"
check "termina em completed" completed "$(wait_status "$FREE" "$PID" "$TID" completed 60)"
RES=$(as "$FREE" "$PROJ/$FREE/$PID/video-tasks/$TID" | json 'd["resultIds"][0]')
check "resultado ligado à tarefa e à origem" "$TID $VID" "$(as "$FREE" "$PROJ/$FREE/$PID/videos/$RES" | json 'd["sourceTaskId"]+" "+d["sourceVideoId"]')"
check "nome do resultado" "ok_720p_30s (1).mp4" "$(as "$FREE" "$PROJ/$FREE/$PID/videos/$RES" | json 'd["name"]')"
URL=$(as "$FREE" "$PROJ/$FREE/$PID/videos/$RES/url" | json 'd["url"]')
# O URL público passa pelo proxy /s3/ do nginx; sem nginx, vai diretamente ao SeaweedFS
URL=$(python3 -c 'import re,sys; print(re.sub(r"^https?://[^/]+/s3/", "http://localhost:9000/", sys.argv[1]))' "$URL")
check "resultado descarregável" 200 "$($C -o /tmp/chk-out.mp4 -w '%{http_code}' "$URL")"
check "resultado com 30 s" 30 "$(ffprobe -v error -show_entries format=duration -of csv=p=0 /tmp/chk-out.mp4 | cut -d. -f1)"
check "operação consumida" 4 "$(remaining "$FREE")"

echo "== Limite de tarefas ativas e cancelamento (COM-016, COM-018, COM-022)"
task "$FREE" "$PID" "{\"tool\":\"noop\",\"videoId\":\"$VID\",\"params\":{\"sleepS\":30}}" >/dev/null
T2=$(json 'd["id"]' </tmp/chk-body.json)
check "segunda tarefa ativa no Free → 429" 429 "$(task "$FREE" "$PID" "{\"tool\":\"noop\",\"videoId\":\"$VID\"}")"
check "código ACTIVE_TASK_LIMIT" ACTIVE_TASK_LIMIT "$(json 'd["code"]' </tmp/chk-body.json)"
wait_status "$FREE" "$PID" "$T2" processing 15 >/dev/null
check "cancelar → 200" 200 "$(as "$FREE" -o /tmp/chk-body.json -w '%{http_code}' -X POST "$PROJ/$FREE/$PID/video-tasks/$T2/cancel")"
check "estado cancelled" cancelled "$(json 'd["status"]' </tmp/chk-body.json)"
check "operação devolvida" 4 "$(remaining "$FREE")"
check "cancelar outra vez → 409 TASK_FINAL" 409 "$(as "$FREE" -o /dev/null -w '%{http_code}' -X POST "$PROJ/$FREE/$PID/video-tasks/$T2/cancel")"

# A tarefa seguinte só termina a tempo se o worker tiver parado a cancelada (sleepS 30)
echo "== Saída inválida (COM-027, COM-029)"
N=$(as "$FREE" "$PROJ/$FREE/$PID/videos" | json 'len(d)')
task "$FREE" "$PID" "{\"tool\":\"noop\",\"videoId\":\"$VID\",\"params\":{\"corrupt\":true}}" >/dev/null
T3=$(json 'd["id"]' </tmp/chk-body.json)
check "termina em failed" failed "$(wait_status "$FREE" "$PID" "$T3" failed 60)"
check "motivo output_verification_failed" output_verification_failed "$(as "$FREE" "$PROJ/$FREE/$PID/video-tasks/$T3" | json 'd["reason"]["code"]')"
check "nenhum resultado novo" "$N" "$(as "$FREE" "$PROJ/$FREE/$PID/videos" | json 'len(d)')"
check "operação devolvida" 4 "$(remaining "$FREE")"

echo "== Notificações pendentes (COM-015)"
check "3 notificações" 3 "$(as "$FREE" "$PROJ/$FREE/video-notifications" | json 'len(d)')"
IDS=$(as "$FREE" "$PROJ/$FREE/video-notifications" | json 'json.dumps([t["id"] for t in d])')
check "ack → 204" 204 "$(as "$FREE" -o /dev/null -w '%{http_code}' -X POST "$PROJ/$FREE/video-notifications/ack" -H 'Content-Type: application/json' -d "{\"taskIds\":$IDS}")"
check "sem notificações pendentes" 0 "$(as "$FREE" "$PROJ/$FREE/video-notifications" | json 'len(d)')"

echo "== Remover o vídeo de origem cancela a tarefa (COM-017)"
task "$FREE" "$PID" "{\"tool\":\"noop\",\"videoId\":\"$VID\",\"params\":{\"sleepS\":30}}" >/dev/null
T4=$(json 'd["id"]' </tmp/chk-body.json)
check "remover vídeo → 204" 204 "$(as "$FREE" -o /dev/null -w '%{http_code}' -X DELETE "$PROJ/$FREE/$PID/videos/$VID")"
check "tarefa cancelada com source_video_removed" "cancelled source_video_removed" "$(as "$FREE" "$PROJ/$FREE/$PID/video-tasks/$T4" | json 'd["status"]+" "+d["reason"]["code"]')"

echo "== Prioridade Premium (COM-019, T043)"
PREM=$(register premium)
FREE2=$(register free)
PP=$(as "$PREM" -X POST "$PROJ/$PREM" -H 'Content-Type: application/json' -d '{"name":"prio"}' | json 'd["_id"]')
PV=$(as "$PREM" -X POST "$PROJ/$PREM/$PP/videos" -H "X-Upload-Id: $(uuid)" -F "video=@$FIX/noaudio.mp4;type=video/mp4" | json 'd["id"]')
FP=$(as "$FREE2" -X POST "$PROJ/$FREE2" -H 'Content-Type: application/json' -d '{"name":"prio"}' | json 'd["_id"]')
FV=$(as "$FREE2" -X POST "$PROJ/$FREE2/$FP/videos" -H "X-Upload-Id: $(uuid)" -F "video=@$FIX/noaudio.mp4;type=video/mp4" | json 'd["id"]')
check "preparação da prioridade (2 utilizadores, 2 projetos, 2 vídeos)" 6 "$(for v in "$PREM" "$FREE2" "$PP" "$FP" "$PV" "$FV"; do [[ -n "$v" ]] && echo x; done | wc -l)"
docker compose stop video_noop_worker >/dev/null 2>&1
task "$FREE2" "$FP" "{\"tool\":\"noop\",\"videoId\":\"$FV\"}" >/dev/null
TF=$(json 'd["id"]' </tmp/chk-body.json)
task "$PREM" "$PP" "{\"tool\":\"noop\",\"videoId\":\"$PV\"}" >/dev/null
TP=$(json 'd["id"]' </tmp/chk-body.json)
docker compose start video_noop_worker >/dev/null 2>&1
wait_status "$FREE2" "$FP" "$TF" completed 90 >/dev/null
wait_status "$PREM" "$PP" "$TP" completed 90 >/dev/null
SF=$(as "$FREE2" "$PROJ/$FREE2/$FP/video-tasks/$TF" | json 'd["startedAt"]')
SPR=$(as "$PREM" "$PROJ/$PREM/$PP/video-tasks/$TP" | json 'd["startedAt"]')
check "Premium, publicada depois, começa primeiro" 1 "$(python3 -c "import sys; print(int(sys.argv[1] < sys.argv[2]))" "$SPR" "$SF")"

echo "== Worker reiniciado a meio (COM-041, COM-042, T047)"
R0=$(remaining "$FREE2")
task "$FREE2" "$FP" "{\"tool\":\"noop\",\"videoId\":\"$FV\",\"params\":{\"sleepS\":20}}" >/dev/null
T5=$(json 'd["id"]' </tmp/chk-body.json)
wait_status "$FREE2" "$FP" "$T5" processing 30 >/dev/null
docker compose kill video_noop_worker >/dev/null 2>&1
docker compose start video_noop_worker >/dev/null 2>&1
check "falha com worker_interrupted, sem repetição automática" "failed worker_interrupted" \
  "$(wait_status "$FREE2" "$FP" "$T5" failed 60 >/dev/null; as "$FREE2" "$PROJ/$FREE2/$FP/video-tasks/$T5" | json 'd["status"]+" "+d["reason"]["code"]')"
check "operação devolvida" "$R0" "$(remaining "$FREE2")"
task "$FREE2" "$FP" "{\"tool\":\"noop\",\"videoId\":\"$FV\"}" >/dev/null
T6=$(json 'd["id"]' </tmp/chk-body.json)
check "o worker volta a aceitar tarefas" completed "$(wait_status "$FREE2" "$FP" "$T6" completed 60)"

echo "== Remover projeto e eliminar conta (COM-034, COM-035, T055)"
mongo_count() { docker compose exec -T projects_mongoDB mongo --port 27018 project --quiet --eval "print(db.$1.countDocuments($2))" | tr -d '\r'; }
# projeto: o vídeo e o resultado desaparecem do armazenamento
RV=$(as "$FREE2" "$PROJ/$FREE2/$FP/videos" | json '[v["id"] for v in d if v["origin"]=="task"][0]')
RURL=$(as "$FREE2" "$PROJ/$FREE2/$FP/videos/$RV/url" | json 'd["url"]')
RURL=$(python3 -c 'import re,sys; print(re.sub(r"^https?://[^/]+/s3/", "http://localhost:9000/", sys.argv[1]))' "$RURL")
check "resultado acessível antes" 200 "$($C -o /dev/null -w '%{http_code}' "$RURL")"
VER=$(as "$FREE2" "$PROJ/$FREE2/$FP" | json 'd.get("version", 0)')
check "remover projeto → 204" 204 "$(as "$FREE2" -o /dev/null -w '%{http_code}' -X DELETE "$PROJ/$FREE2/$FP" -H "X-Project-Version: $VER")"
check "nenhum videoAsset do projeto" 0 "$(mongo_count videoassets "{project_id: ObjectId('$FP')}")"
check "objeto apagado do armazenamento" 404 "$($C -o /dev/null -w '%{http_code}' "$RURL")"
# conta: projetos, vídeos e tarefas do utilizador
check "eliminar conta → 204" 204 "$($C -o /dev/null -w '%{http_code}' -X DELETE "$USERS/$PREM" -H 'Authorization: Bearer x')"
check "nenhum projeto da conta" 0 "$(mongo_count projects "{user_id: ObjectId('$PREM')}")"
check "nenhum videoAsset da conta" 0 "$(mongo_count videoassets "{owner_id: ObjectId('$PREM')}")"
check "nenhuma videoTask da conta" 0 "$(mongo_count videotasks "{user_id: ObjectId('$PREM')}")"

echo "== Rota interna (contracts/internal-api.md)"
check "sem token → 401" 401 "$($C -o /dev/null -w '%{http_code}' "$PROJ/internal/video-tasks/$TID")"

echo
echo "Resultado: $PASS ok, $FAIL falhas"
[[ $FAIL -eq 0 ]]
