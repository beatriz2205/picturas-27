# Research: Converter vídeo

Base: [000-video-common/research.md](../000-video-common/research.md).

## C1. Comandos FFmpeg

**MP4 (H.264/AAC)**:

```bash
ffmpeg -hide_banner -y -progress pipe:1 -nostats -i in.mp4 -map 0:v:0 -map 0:a:0? \
  [-vf "scale=-2:<h>:flags=lanczos"] \
  -c:v libx264 -preset veryfast -crf 21 -pix_fmt yuv420p -c:a aac -b:a 160k \
  -movflags +faststart out.mp4
```

**WebM (VP9/Opus)**:

```bash
ffmpeg -hide_banner -y -progress pipe:1 -nostats -i in.mp4 -map 0:v:0 -map 0:a:0? \
  [-vf "scale=-2:<h>:flags=lanczos"] \
  -c:v libvpx-vp9 -deadline realtime -cpu-used 8 -row-mt 1 -b:v 0 -crf 33 -pix_fmt yuv420p \
  -c:a libopus -b:a 128k out.webm
```

`-deadline realtime -cpu-used 8 -row-mt 1` é a configuração mais rápida do `libvpx-vp9`. Com o modo
`good` por omissão, um 1080p de 60 s demora vários minutos com 1 vCPU e não cumpre CONV-006 (A4). A
qualidade fica abaixo do VP9 em modo `good`, o que é aceitável para o MVP. Se a medição mostrar margem,
experimentar `-cpu-used 5`.

O áudio é recodificado (AAC → Opus) no WebM e copiável no MP4. Para manter um só caminho e garantir o
AAC LC, o MP4 também recodifica.

## C2. Alteração efetiva (CONV-003)

`noChange = (format == "mp4") && (height == origem.height)`. A origem é sempre MP4 (matriz de entrada),
por isso basta comparar a altura. O resultado é `400 INVALID_PARAMS` com o código lógico
`NO_CHANGE` em `fields._` e a mensagem “O resultado seria igual ao original” (UC-VID-003/E5).

## C3. Opções apresentadas

`GET /projects/:user/:project/videos/:video/convert-options` →
`{formats: [{id: "mp4", label: "MP4 (H.264/AAC)"}, {id: "webm", label: "WebM (VP9/Opus)"}],
heights: [{value: 1080, label: "Original (1080p)"}, {value: 720}, …], defaults: {format: "mp4",
height: <original>}}`. Por omissão, os valores são os do original (MP4, resolução original), o que
cumpre CONV-002: quem só muda a resolução recebe um MP4 e quem só muda o formato mantém a resolução.
O botão de confirmar fica desativado enquanto as duas opções forem iguais às do original, com a
indicação “Escolha outro formato ou resolução” (CONV-003).

## C4. Verificação

`verify` com `{container, videoCodec: h264|vp9, audioCodec: aac|opus|null, height, durationS: origem}`
e tolerância de ±0,5 s (RN8, COM-027). Para WebM, o `ffprobe` devolve `format_name` `matroska,webm`;
aceitar se `webm` estiver na lista.

## C5. Tempo esperado

CONV-006 diz “≤ 2 × duração” para Premium, e o tempo máximo de RNG-06 é 15 × duração. A medição
(T014) regista as duas razões.
