# Contrato: recorte

Usa `POST /projects/:user/:project/video-tasks` de
[000-video-common/contracts/public-api.md](../../000-video-common/contracts/public-api.md).

## Pedido

```json
{ "tool": "trim", "videoId": "670f…", "outputName": "clip.mp4",
  "params": { "startS": 10.0, "endS": 40.0, "height": 720 } }
```

| Erro | Quando |
|---|---|
| `400 INVALID_PARAMS` com `fields.startS` / `fields.endS` | TRIM-003 (`"O início tem de ser anterior ao fim"`, `"O fim excede a duração do vídeo"`, `"O excerto tem de ter pelo menos 1 s"`) |
| `400 INVALID_PARAMS` com `fields.height` | Resolução não permitida (COM-010) |
| `409 DUPLICATE_TASK` com `task` | TRIM-008 |
| `415 UNSUPPORTED_FORMAT` | Origem WebM ou fora da matriz (E2, CONV-004) |

## Nome disponível

`GET /projects/:user/:project/videos/name-available?name=clip.mp4` →
`200 {"available": false, "suggestion": "clip (1).mp4"}` (TRIM-007). É usado também pelos specs 003 e
004.

## Mensagem para o *worker*

`params` igual ao pedido, depois de normalizado (`endS` preenchido e valores arredondados ao
fotograma), mais `input.fps` e `input.hasAudio` (ver `worker-messages.md`).
