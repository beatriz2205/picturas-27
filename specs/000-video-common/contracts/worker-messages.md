# Contrato de mensagens: `projects` ↔ *workers* de vídeo

Implementado do lado Python em `Tools/video_utils/messages.py` e do lado Node em
`projects/video/messages.js`. Todas as mensagens são JSON, persistentes (`delivery_mode=2`) e têm
`schemaVersion: 1`.

## Pedido de tarefa: `projects` → `video_<tool>_queue`

Fila durável com `x-max-priority: 10`; `priority` da mensagem 10 (Premium) ou 1 (Free).

```json
{
  "schemaVersion": 1,
  "type": "video-task",
  "taskId": "6711…",
  "tool": "trim",
  "ownerId": "66aa…",
  "projectId": "670e…",
  "input": {
    "url": "http://seaweedfs:9000/user-66aa…/670e…/video_src/…mp4?X-Amz-…",
    "durationS": 60.0, "width": 1920, "height": 1080, "fps": 30, "hasAudio": true
  },
  "params": { "startS": 10, "endS": 40, "height": 720 },
  "output": { "stage": "video_out" },
  "limits": { "timeoutS": 900 },
  "issuedAt": "2026-10-19T10:00:00Z"
}
```

O URL de entrada é válido durante `timeoutS + 300` s, e o *worker* descarrega a entrada logo no início.

## Eventos: *worker* → `video_events_queue`

Fila durável, sem prioridade, consumida pelo `projects` com `ack` manual.

```json
{ "schemaVersion": 1, "type": "started",   "taskId": "…", "worker": "video_trim@<hostname>", "at": "…" }
{ "schemaVersion": 1, "type": "progress",  "taskId": "…", "progress": 42, "at": "…" }
{ "schemaVersion": 1, "type": "completed", "taskId": "…", "at": "…",
  "outputs": [
    { "kind": "video", "key": "670e…/video_out/….mp4", "sizeBytes": 1234, "sha256": "…",
      "container": "mp4", "videoCodec": "h264", "audioCodec": "aac",
      "durationS": 30.0, "width": 1280, "height": 720, "fps": 30 }
  ],
  "metrics": { "processingMs": 41000 } }
{ "schemaVersion": 1, "type": "failed",    "taskId": "…", "at": "…",
  "reason": { "code": "ffmpeg_error", "message": "Não foi possível ler o vídeo." },
  "metrics": { "processingMs": 1200 } }
```

Um `failed` pode incluir `"orphanKeys": ["…"]` com objetos que o *worker* já tinha carregado (por
exemplo, o JSON de deteção quando o vídeo anotado falha). O `projects` apaga-os (`COM-029`,
`DET-006`).

Códigos de falha (`reason.code`): `ffmpeg_error`, `corrupted_input`, `output_verification_failed`,
`timeout`, `worker_interrupted`, `storage_error`, `tool_error`. A mensagem para o utilizador é escolhida
pelo `projects` a partir do código (`projects/video/messages.js`), não pelo texto do *worker*.

## Regras do *worker* (`Tools/video_utils/worker.py`)

1. `prefetch_count=1`, `auto_ack=False`.
2. Se `redelivered`: consulta o estado. Se a tarefa não estiver em estado final, publica `failed` com
   `worker_interrupted`. Depois faz `ack` e termina.
3. Consulta o estado (`GET /internal/video-tasks/:id`). Se não estiver `queued`, faz `ack` e termina,
   sem publicar nada.
4. Publica `started` e cria `/tmp/video/<taskId>/`.
5. Descarrega a entrada, processa e publica `progress` no máximo a cada 2 s e pelo menos a cada 4 s
   enquanto houver avanço.
6. Verifica a saída com `ffprobe` (`COM-027`): legível, formato, resolução e duração pedidos (±0,5 s), e
   áudio presente se e só se a entrada o tiver. Se a verificação falhar, publica `failed`
   `output_verification_failed`.
7. Carrega a saída em `video_out` e publica `completed`.
8. `finally`: apaga `/tmp/video/<taskId>/` e faz `ack`.
9. Ao receber `{taskId}` no *exchange* `video_cancel` para a tarefa em curso: termina o processo
   filho, apaga os temporários, faz `ack` e não publica nada.
10. Quando o tempo `timeoutS` passa, termina o processo filho e publica `failed` `timeout`.

## Exchange `video_cancel`

*Fanout*, não durável. Mensagem `{"schemaVersion": 1, "taskId": "…"}`. Cada réplica de *worker*
declara uma fila exclusiva e `auto_delete` ligada a ele.
