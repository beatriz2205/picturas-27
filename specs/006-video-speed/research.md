# Research: Alterar a velocidade de um vídeo

Base: [000-video-common/research.md](../000-video-common/research.md) (D2: *worker* próprio; D3: fila
com prioridade; D11: tempo máximo).

## S1. Comando FFmpeg

**Decision**:

```bash
ffmpeg -hide_banner -y -progress pipe:1 -nostats -i in.mp4 \
  -map 0:v:0 -vf "setpts=PTS/<fator>,fps=<fps_origem>" \
  -map 0:a:0 -af "atempo=<fator>" -c:a aac -b:a 160k \
  -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p -profile:v high -movflags +faststart out.mp4
```

- `setpts=PTS/fator` muda o tempo de apresentação de cada fotograma; o `fps` seguinte repõe a cadência
  da origem, repetindo fotogramas em câmara lenta e descartando-os na aceleração (SPD-003).
- `atempo` muda a velocidade do áudio sem mudar o tom (SPD-004). Aceita 0,5 a 2 num só filtro, que é
  exatamente o intervalo de RN2.
- Sem áudio na origem, as opções de áudio são omitidas (FA1).

**Alternatives considered**:
- `asetrate` + `aresample` para o áudio: muda o tom (efeito "esquilo"), rejeitado (RN5).
- Interpolação de movimento (`minterpolate`) na câmara lenta: resultado mais suave, mas 10 a 50 vezes
  mais lento; fora do MVP.
- Mudar só a cadência no contentor (sem recodificar): o áudio não acompanharia e os navegadores não
  reproduzem bem cadências fora do normal.

## S2. Velocidades disponíveis

0,5×, 0,75×, 1,25×, 1,5× e 2×. O limite de 0,5× mantém o resultado, no máximo, com o dobro da duração
da origem (A3) e cabe num só `atempo`. 1× é recusado porque o resultado seria igual ao original.

## S3. Verificação e progresso

`expectedDurationS = durationS / fator`, calculado no `projects` e de novo no *worker* a partir do
`ffprobe` da origem. O `video_utils.ffmpeg.verify` recebe `{durationS, width, height, container: mp4,
videoCodec: h264, hasAudio}` (SPD-002, SPD-003, COM-027). O progresso usa a duração do resultado como
denominador.

## S4. Medição (SPD-006)

Uma execução de cada (`bench.sh`), `ok_1080p_60s.mp4`, 1 vCPU, `veryfast`/CRF 20:
- 2× (resultado de 30 s): 72,8 s;
- 0,5× (resultado de 120 s): 228,2 s.

O custo é proporcional à duração do resultado (é a codificação de cada fotograma). Por isso o alvo
foi refinado de "≤ 2 min" para "≤ 2 min por minuto de resultado" (Cap. 5.4), seguindo a lógica da
RNG-06. `VIDEO_SPEED_PRESET` e `VIDEO_SPEED_CRF` ficam para ajustes futuros.
