# Research: Recortar um intervalo temporal

Base: [000-video-common/research.md](../000-video-common/research.md) (D2: *worker* próprio; D3: fila
com prioridade; D11: tempo máximo).

## T1. Comando FFmpeg

**Decision**: Recodificar com procura exata. O `-ss` depois de `-i` é exato ao fotograma, e o `-ss`
antes de `-i` é uma procura rápida que deixa margem de 2 s:

```bash
ffmpeg -hide_banner -y -progress pipe:1 -nostats \
  -ss <max(0, start-2)> -i in.mp4 -ss <start - max(0, start-2)> -t <end-start> \
  -map 0:v:0 -map 0:a:0? \
  -vf "scale=-2:<height>:flags=lanczos,fps=<fps_origem>" \
  -c:v libx264 -preset veryfast -crf 20 -pix_fmt yuv420p -profile:v high \
  -c:a aac -b:a 160k -movflags +faststart out.mp4
```

- `start` e `end` são primeiro arredondados ao fotograma: `round(t × fps) / fps` (TRIM-005).
- Sem mudança de resolução, o `scale` é omitido. `-2` mantém a proporção com largura par.
- `-map 0:a:0?` mantém o áudio se existir (COM-028).
- `+faststart` permite reproduzir no navegador antes de o ficheiro descarregar todo (COM-044).
- `veryfast` + CRF 20 é o compromisso para 1 vCPU (TRIM-011); a confirmar na medição.

**Alternatives considered**: `-c copy` (sem recodificação), rejeitado porque só corta em fotogramas-chave
(RN4, Q7).

## T2. Progresso

O progresso é `out_time_us / ((end - start) × 1e6)`, lido de `-progress pipe:1`, e é limitado pelo
`progress.py` (2 a 4 s).

## T3. Verificação

O `video_utils.ffmpeg.verify` recebe `{durationS: end-start, height, container: mp4, videoCodec: h264,
audio: origem.hasAudio}`. Uma diferença de mais de 0,5 s dá `output_verification_failed` (TRIM-009,
COM-027).

## T4. Pedido duplicado

`dedupKey = sha1(userId|videoId|trim|startS|endS|height)`. Os valores são arredondados ao fotograma
antes do *hash*, para que 10,01 s e 10,00 s sejam o mesmo pedido a 30 fps. O nome de saída não entra
na chave, porque um pedido igual com outro nome continua a ser trabalho duplicado (FA6). Se existir
uma tarefa `queued`/`processing` com a mesma chave, a resposta é `409 DUPLICATE_TASK` com essa tarefa,
sem reservar quota.

## T5. Nome por omissão e conflitos

O nome por omissão é `<nome original sem extensão> (recorte <mm:ss>-<mm:ss>).mp4`.
`GET .../videos/name-available?name=` devolve `{available, suggestion}` (TRIM-007). O servidor aplica
`uniqueName` na conclusão para cobrir corridas: se dois resultados terminarem com o mesmo nome, o
segundo recebe ` (n)`.
