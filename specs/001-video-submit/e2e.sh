#!/usr/bin/env bash
# Teste ponta a ponta da submissão de vídeo (UC-VID-001) através do Nginx, como o navegador.
# Pré-requisitos: docker compose a correr (nginx, frontend, api_gateway, projects, users, img_storage,
# seaweedfs, rabbitmq) e os vídeos de teste gerados:  bash projects/tests/fixtures/make-videos.sh
# Uso: bash specs/001-video-submit/e2e.sh [https://localhost:8080]
set -uo pipefail

BASE="${1:-https://localhost:8080}"
API="$BASE/api-gateway"
FIX="$(cd "$(dirname "$0")/../.." && pwd)/projects/tests/fixtures/out"
C="curl -sk"
PASS=0
FAIL=0

check() { # descrição, esperado, obtido
  if [[ "$2" == "$3" ]]; then PASS=$((PASS + 1)); echo "  ok   $1"; else FAIL=$((FAIL + 1)); echo "  FAIL $1 (esperado $2, obtido $3)"; fi
}
json() { python3 -c "import sys,json; d=json.load(sys.stdin); print(eval(sys.argv[1]))" "$1"; }
uuid() { python3 -c "import uuid; print(uuid.uuid4())"; }

register() { # tipo → "id token"
  local email="e2e-$1-$RANDOM$RANDOM@test.local"
  $C -X POST "$API/users" -H 'Content-Type: application/json' \
    -d "{\"name\":\"e2e\",\"email\":\"$email\",\"password\":\"Passw0rd!\",\"type\":\"$1\"}" | json 'd["user"]["_id"]+" "+d["jwt"]["token"] if isinstance(d["jwt"],dict) else d["user"]["_id"]+" "+d["jwt"]'
}

upload() { # uid token pid file [uploadId] [declaredSize] [query] → "status body"
  local uid=$1 tok=$2 pid=$3 file=$4 up=${5:-$(uuid)} size=${6:-$(stat -c %s "$FIX/$4")} q=${7:-}
  $C -o /tmp/e2e-body.json -w '%{http_code}' -X POST "$API/projects/$uid/$pid/videos$q" \
    -H "Authorization: Bearer $tok" -H "X-Upload-Id: $up" -H "X-Video-Size: $size" -F "video=@$FIX/$file;type=video/mp4"
}

echo "== Utilizadores e projeto"
read -r FREE FREE_TOK <<<"$(register free)"
read -r PREM PREM_TOK <<<"$(register premium)"
read -r ANON ANON_TOK <<<"$(register anonymous)"
[[ -n "$FREE_TOK" && -n "$PREM_TOK" ]] || { echo "registo falhou"; exit 1; }
PID=$($C -X POST "$API/projects/$FREE" -H "Authorization: Bearer $FREE_TOK" -H 'Content-Type: application/json' -d '{"name":"e2e video"}' | json 'd["_id"]')
echo "  free=$FREE premium=$PREM projeto=$PID"

echo "== Limites (video-limits)"
check "limite Free 100 MB" "104857600" "$($C "$API/projects/$FREE/video-limits" -H "Authorization: Bearer $FREE_TOK" | json 'd["limits"]["maxBytes"]')"

echo "== US1 — submeter (SUBMIT-001, 004, 006, 007)"
UP=$(uuid)
check "MP4 válido → 201" 201 "$(upload "$FREE" "$FREE_TOK" "$PID" ok_720p_30s.mp4 "$UP")"
VID=$(json 'd["id"]' </tmp/e2e-body.json)
check "metadados: 30 s, 1280×720, aac" "30.0 1280 720 aac" "$(json '" ".join(map(str, [float(d["durationS"]), d["width"], d["height"], d["audioCodec"]]))' </tmp/e2e-body.json)"
check "segundo vídeo → 201" 201 "$(upload "$FREE" "$FREE_TOK" "$PID" noaudio.mp4)"
check "projeto tem 2 vídeos" 2 "$($C "$API/projects/$FREE/$PID/videos" -H "Authorization: Bearer $FREE_TOK" | json 'len(d)')"
check "submissão não gasta operações (remaining_operations=5)" 5 "$($C "$API/users/$FREE" -H "Authorization: Bearer $FREE_TOK" | json 'd["remaining_operations"]')"

echo "== US2 — recusar (SUBMIT-003, COM-001, COM-003 a 006)"
check "tamanho declarado 150 MB (Free) → 413 no gateway" 413 "$(upload "$FREE" "$FREE_TOK" "$PID" ok_720p_30s.mp4 "$(uuid)" 157286400)"
check "H.265 → 415" 415 "$(upload "$FREE" "$FREE_TOK" "$PID" hevc.mp4)"
check "WebM com extensão .mp4 → 415" 415 "$(upload "$FREE" "$FREE_TOK" "$PID" fake_webm.mp4)"
check "61 s no Free → 422" 422 "$(upload "$FREE" "$FREE_TOK" "$PID" long_61s.mp4)"
check "mensagem indica o limite" "VIDEO_TOO_LONG" "$(json 'd["code"]' </tmp/e2e-body.json)"
check "4K no Free → 422" 422 "$(upload "$FREE" "$FREE_TOK" "$PID" uhd_4k.mp4)"
check "truncado → 422" 422 "$(upload "$FREE" "$FREE_TOK" "$PID" truncated.mp4)"
APID=$($C -X POST "$API/projects/$ANON" -H "Authorization: Bearer $ANON_TOK" -H 'Content-Type: application/json' -d '{"name":"anon"}' | json 'd["_id"]')
check "anónimo → 401" 401 "$(upload "$ANON" "$ANON_TOK" "$APID" noaudio.mp4)"
check "nenhuma entrada nova" 2 "$($C "$API/projects/$FREE/$PID/videos" -H "Authorization: Bearer $FREE_TOK" | json 'len(d)')"

echo "== US3 — repetir (SUBMIT-008, 009)"
check "mesmo X-Upload-Id → 200" 200 "$(upload "$FREE" "$FREE_TOK" "$PID" ok_720p_30s.mp4 "$UP")"
check "devolve o mesmo vídeo" "$VID" "$(json 'd["id"]' </tmp/e2e-body.json)"

echo "== Reproduzir e descarregar (COM-030, COM-050)"
URL=$($C "$API/projects/$FREE/$PID/videos/$VID/url" -H "Authorization: Bearer $FREE_TOK" | json 'd["url"]')
check "URL temporário responde 200" 200 "$($C -o /tmp/e2e-dl.mp4 -w '%{http_code}' "$URL")"
check "ficheiro descarregado igual ao original" "$(sha256sum <"$FIX/ok_720p_30s.mp4" | cut -d' ' -f1)" "$(sha256sum </tmp/e2e-dl.mp4 | cut -d' ' -f1)"
check "pedido Range (leitor de vídeo) → 206" 206 "$($C -o /dev/null -w '%{http_code}' -H 'Range: bytes=0-1023' "$URL")"
# URL assinado com SigV2 (aws-sdk v2): "Expires" é o instante de expiração em segundos Unix
check "URL válido 15 min (Expires ≈ agora + 900 s)" 1 "$(python3 -c 'import sys,time,urllib.parse as u; q=u.parse_qs(u.urlparse(sys.argv[1]).query); e=int(q.get("Expires",["0"])[0]); print(int(abs(e-time.time()-900)<60))' "$URL")"
check "outro utilizador não obtém o URL" 401 "$($C -o /dev/null -w '%{http_code}' "$API/projects/$FREE/$PID/videos/$VID/url" -H "Authorization: Bearer $PREM_TOK")"

echo "== Premium (limites maiores)"
PREM_PID=$($C -X POST "$API/projects/$PREM" -H "Authorization: Bearer $PREM_TOK" -H 'Content-Type: application/json' -d '{"name":"e2e prem"}' | json 'd["_id"]')
check "4K no Premium → 201" 201 "$(upload "$PREM" "$PREM_TOK" "$PREM_PID" uhd_4k.mp4)"

echo "== US4 — projeto a partir de vídeo (SUBMIT-002)"
N0=$($C "$API/projects/$FREE" -H "Authorization: Bearer $FREE_TOK" | json 'len(d)')
check "vídeo inválido → 415" 415 "$($C -o /tmp/e2e-body.json -w '%{http_code}' -X POST "$API/projects/$FREE/video-project" -H "Authorization: Bearer $FREE_TOK" -H "X-Upload-Id: $(uuid)" -F 'name=Novo' -F "video=@$FIX/hevc.mp4;type=video/mp4")"
check "nenhum projeto criado" "$N0" "$($C "$API/projects/$FREE" -H "Authorization: Bearer $FREE_TOK" | json 'len(d)')"
check "vídeo válido → 201" 201 "$($C -o /tmp/e2e-body.json -w '%{http_code}' -X POST "$API/projects/$FREE/video-project" -H "Authorization: Bearer $FREE_TOK" -H "X-Upload-Id: $(uuid)" -F 'name=Novo' -F "video=@$FIX/noaudio.mp4;type=video/mp4")"
check "projeto criado com o vídeo" "$((N0 + 1))" "$($C "$API/projects/$FREE" -H "Authorization: Bearer $FREE_TOK" | json 'len(d)')"

echo "== Remover (COM-034)"
check "remover vídeo → 204" 204 "$($C -o /dev/null -w '%{http_code}' -X DELETE "$API/projects/$FREE/$PID/videos/$VID" -H "Authorization: Bearer $FREE_TOK")"
check "objeto já não existe no armazenamento" 404 "$($C -o /dev/null -w '%{http_code}' "$URL")"

echo
echo "Resultado: $PASS ok, $FAIL falhas"
[[ $FAIL -eq 0 ]]
