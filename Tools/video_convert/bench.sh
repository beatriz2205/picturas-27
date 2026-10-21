#!/usr/bin/env bash
# T014 (spec 003): mede 10 conversões MP4/720p, 10 WebM/1080p e uma Premium de 5 min.
# Pré-requisitos: docker compose up e fixtures geradas com make-videos.sh --big.
# Uso: bash Tools/video_convert/bench.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FIX="$ROOT/projects/tests/fixtures/out"
PROJECTS="${PROJECTS:-https://localhost:9002}"
USERS="${USERS:-https://localhost:10001}"

for fixture in ok_1080p_60s.mp4 premium_5min.mp4; do
  if [[ ! -f "$FIX/$fixture" ]]; then
    echo "Falta $FIX/$fixture; gerar as fixtures com bash projects/tests/fixtures/make-videos.sh --big" >&2
    exit 1
  fi
done

TMP_DIR="$(mktemp -d /tmp/picturas-convert-bench.XXXXXX)"
TIMES="$TMP_DIR/conversion-seconds"
trap 'rm -f "$TIMES"; rmdir "$TMP_DIR"' EXIT

curl_api() { curl -sk "$@"; }
as_user() {
  local user_id=$1
  shift
  curl_api -H "X-Caller-Id: $user_id" "$@"
}
json_value() {
  python3 -c '
import json, sys
value = json.load(sys.stdin)
for key in sys.argv[1].split("."):
    value = value[key]
print("" if value is None else value)
' "$1"
}
task_duration() {
  python3 -c '
import datetime, json, sys
task = json.load(sys.stdin)
parse = lambda value: datetime.datetime.fromisoformat(value.replace("Z", "+00:00"))
print(round((parse(task["finishedAt"]) - parse(task["startedAt"])).total_seconds(), 1))
'
}

upload_video() {
  local user_id=$1
  local project_id=$2
  local path=$3
  local response
  response="$(as_user "$user_id" -X POST "$PROJECTS/$user_id/$project_id/videos" \
    -H "X-Upload-Id: $(python3 -c 'import uuid; print(uuid.uuid4())')" \
    -F "video=@$path;type=video/mp4")"
  printf '%s' "$response" | json_value 'id'
}

create_bench_account() {
  local profile=$1
  local name=$2
  local user_json project_json user_id project_id video_id
  user_json="$(curl_api -X POST "$USERS/" -H 'Content-Type: application/json' \
    -d "{\"name\":\"bench\",\"email\":\"bench-convert-$name-$RANDOM$RANDOM@test.local\",\"password\":\"Passw0rd!\",\"type\":\"$profile\"}")"
  user_id="$(printf '%s' "$user_json" | json_value 'user._id')"
  [[ -n "$user_id" ]] || { echo "Não foi possível criar o utilizador $profile: $user_json" >&2; return 1; }

  project_json="$(as_user "$user_id" -X POST "$PROJECTS/$user_id" \
    -H 'Content-Type: application/json' -d "{\"name\":\"bench-convert-$name\"}")"
  project_id="$(printf '%s' "$project_json" | json_value '_id')"
  [[ -n "$project_id" ]] || { echo "Não foi possível criar o projeto: $project_json" >&2; return 1; }

  if [[ "$profile" == "free" ]]; then
    video_id="$(upload_video "$user_id" "$project_id" "$FIX/ok_1080p_60s.mp4")"
  else
    video_id="$(upload_video "$user_id" "$project_id" "$FIX/premium_5min.mp4")"
  fi
  [[ -n "$video_id" ]] || { echo "Não foi possível carregar o vídeo de teste" >&2; return 1; }
  printf '%s %s %s\n' "$user_id" "$project_id" "$video_id"
}

FREE_USER_IDS=()
FREE_PROJECT_IDS=()
FREE_VIDEO_IDS=()
for account in 1 2 3 4; do
  read -r user_id project_id video_id <<<"$(create_bench_account free "$account")"
  [[ -n "$user_id" && -n "$project_id" && -n "$video_id" ]] || {
    echo "Não foi possível preparar a conta Free $account" >&2
    exit 1
  }
  FREE_USER_IDS+=("$user_id")
  FREE_PROJECT_IDS+=("$project_id")
  FREE_VIDEO_IDS+=("$video_id")
  echo "Utilizador Free $user_id, projeto $project_id, vídeo $video_id"
done

wait_for_task() {
  local user_id=$1
  local project_id=$2
  local task_id=$3
  local task_json=""
  local status=""
  for _ in $(seq 1 180); do
    task_json="$(as_user "$user_id" "$PROJECTS/$user_id/$project_id/video-tasks/$task_id")"
    status="$(printf '%s' "$task_json" | json_value 'status')"
    [[ "$status" == "completed" || "$status" == "failed" || "$status" == "cancelled" ]] && break
    sleep 5
  done
  if [[ "$status" != "completed" ]]; then
    echo "Tarefa $task_id terminou em $status: $task_json" >&2
    return 1
  fi
  printf '%s' "$task_json"
}

formats=(mp4 webm)
heights=(720 1080)
for format_index in 0 1; do
  format="${formats[$format_index]}"
  height="${heights[$format_index]}"
  for run in $(seq 1 10); do
    account_index=$(((format_index * 10 + run - 1) / 5))
    user_id="${FREE_USER_IDS[$account_index]}"
    project_id="${FREE_PROJECT_IDS[$account_index]}"
    video_id="${FREE_VIDEO_IDS[$account_index]}"
    TASK_JSON="$(as_user "$user_id" -X POST "$PROJECTS/$user_id/$project_id/video-tasks" \
      -H 'Content-Type: application/json' \
      -d "{\"tool\":\"convert\",\"videoId\":\"$video_id\",\"params\":{\"format\":\"$format\",\"height\":$height}}")"
    TASK_ID="$(printf '%s' "$TASK_JSON" | json_value 'id')"
    [[ -n "$TASK_ID" ]] || { echo "Pedido $format/$height recusado: $TASK_JSON" >&2; exit 1; }
    TASK_JSON="$(wait_for_task "$user_id" "$project_id" "$TASK_ID")"
    DURATION_SECONDS="$(printf '%s' "$TASK_JSON" | task_duration)"
    echo "$format/$height $run: $DURATION_SECONDS s"
    printf '%s\n' "$DURATION_SECONDS" >>"$TIMES"
  done
done

python3 - "$TIMES" <<'PY'
import math
import sys

values = sorted(float(line) for line in open(sys.argv[1]) if line.strip())
if len(values) != 20:
    raise SystemExit(f"Esperadas 20 medições; obtidas {len(values)}")
p95 = values[math.ceil(0.95 * len(values)) - 1]
print(f"60 s: n={len(values)}, mediana={values[len(values)//2]} s, p95={p95} s")
if p95 > 120:
    raise SystemExit("CONV-006 Free NÃO cumprido: p95 excede 120 s")
print("CONV-006 Free cumprido: p95 ≤ 120 s")
PY

read -r PREMIUM_USER PREMIUM_PROJECT PREMIUM_VIDEO_ID <<<"$(create_bench_account premium premium)"
[[ -n "$PREMIUM_USER" && -n "$PREMIUM_PROJECT" && -n "$PREMIUM_VIDEO_ID" ]] || {
  echo "Não foi possível preparar a conta Premium" >&2
  exit 1
}
PREMIUM_TASK="$(as_user "$PREMIUM_USER" -X POST "$PROJECTS/$PREMIUM_USER/$PREMIUM_PROJECT/video-tasks" \
  -H 'Content-Type: application/json' \
  -d "{\"tool\":\"convert\",\"videoId\":\"$PREMIUM_VIDEO_ID\",\"params\":{\"format\":\"webm\",\"height\":360}}")"
PREMIUM_TASK_ID="$(printf '%s' "$PREMIUM_TASK" | json_value 'id')"
[[ -n "$PREMIUM_TASK_ID" ]] || { echo "Pedido Premium recusado: $PREMIUM_TASK" >&2; exit 1; }
PREMIUM_TASK="$(wait_for_task "$PREMIUM_USER" "$PREMIUM_PROJECT" "$PREMIUM_TASK_ID")"
PREMIUM_SECONDS="$(printf '%s' "$PREMIUM_TASK" | task_duration)"
echo "Premium 5 min → WebM: $PREMIUM_SECONDS s (limite: 600 s)"
python3 - "$PREMIUM_SECONDS" <<'PY'
import sys
seconds = float(sys.argv[1])
if seconds > 600:
    raise SystemExit("CONV-006 Premium NÃO cumprido: conversão excede 600 s")
print("CONV-006 Premium cumprido: conversão ≤ 600 s")
PY
