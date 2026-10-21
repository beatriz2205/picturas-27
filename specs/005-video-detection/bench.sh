#!/usr/bin/env bash
set -euo pipefail

input="${1:-ok_1080p_60s.mp4}"
output="${2:-/tmp/video-detection-bench.json}"
times=()
for run in $(seq 1 10); do
  start=$(date +%s)
  python Tools/video_detect/video_detect.py "$input" "$output" --tools people_ai obj_ai >/dev/null
  times+=("$(( $(date +%s) - start ))")
done
printf 'runs_seconds=%s\n' "${times[*]}"
printf 'max_seconds=%s (target p95 <= 600; maximum is the 10th run)\n' "$(printf '%s\n' "${times[@]}" | sort -n | tail -1)"
