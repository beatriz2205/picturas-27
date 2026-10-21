#!/usr/bin/env bash
# Gera os vídeos de teste (spec 000, T015; spec 001, T002) em tests/fixtures/out/.
# Uso: bash tests/fixtures/make-videos.sh [--big]   (--big gera também os ficheiros grandes)
set -euo pipefail
OUT="$(cd "$(dirname "$0")" && pwd)/out"
mkdir -p "$OUT"
cd "$OUT"

FF="ffmpeg -hide_banner -loglevel error -y"
src() { echo "-f lavfi -i testsrc2=size=$1:rate=${3:-30} -f lavfi -i sine=frequency=440:sample_rate=48000 -t $2"; }

$FF $(src 1280x720 30) -c:v libx264 -preset veryfast -crf 30 -pix_fmt yuv420p -c:a aac -shortest -movflags +faststart ok_720p_30s.mp4
$FF $(src 1920x1080 60) -c:v libx264 -preset veryfast -crf 30 -pix_fmt yuv420p -c:a aac -shortest -movflags +faststart ok_1080p_60s.mp4
$FF -f lavfi -i testsrc2=size=640x360:rate=30 -t 5 -c:v libx264 -preset veryfast -crf 30 -pix_fmt yuv420p noaudio.mp4
# 0,5 s: thumbnail de um vídeo mais curto do que 1 s (spec 001, T035)
$FF -f lavfi -i testsrc2=size=640x360:rate=30 -t 0.5 -c:v libx264 -preset veryfast -crf 30 -pix_fmt yuv420p short_0_5s.mp4
$FF $(src 640x360 5) -c:v libx265 -preset ultrafast -pix_fmt yuv420p -c:a aac -shortest -tag:v hvc1 hevc.mp4
$FF $(src 640x360 5) -c:v libx264 -preset veryfast -crf 30 -pix_fmt yuv420p -c:a aac -shortest -f mov mov.mov
$FF $(src 640x360 5) -c:v libvpx-vp9 -deadline realtime -cpu-used 8 -c:a libopus -shortest webm.webm
cp webm.webm fake_webm.mp4
$FF $(src 640x360 5) -c:v libx264 -preset veryfast -crf 30 -pix_fmt yuv420p -c:a libmp3lame -shortest mp3audio.mp4
$FF $(src 640x360 61) -c:v libx264 -preset veryfast -crf 30 -pix_fmt yuv420p -c:a aac -shortest long_61s.mp4
$FF $(src 3840x2160 2) -c:v libx264 -preset veryfast -crf 30 -pix_fmt yuv420p -c:a aac -shortest uhd_4k.mp4
$FF $(src 1080x1920 5) -c:v libx264 -preset veryfast -crf 30 -pix_fmt yuv420p -c:a aac -shortest vertical_1080x1920.mp4
# MP4 truncado: cabeçalho completo (faststart) mas sem metade dos dados
SIZE=$(stat -c %s ok_720p_30s.mp4); head -c $((SIZE / 2)) ok_720p_30s.mp4 > truncated.mp4
# Ficheiro que não é vídeo, com extensão .mp4
head -c 200000 /dev/urandom > random.mp4

if [[ "${1:-}" == "--big" ]]; then
  # > 100 MB (acima do limite Free) e 5 min (acima da duração Free)
  $FF $(src 1920x1080 60) -c:v libx264 -preset ultrafast -b:v 16M -maxrate 16M -bufsize 16M -x264-params nal-hrd=cbr -pix_fmt yuv420p -c:a aac -shortest big_150mb.mp4
  $FF $(src 640x360 300) -c:v libx264 -preset veryfast -crf 30 -pix_fmt yuv420p -c:a aac -shortest premium_5min.mp4
fi
ls -la "$OUT"
