# Contrato: alteração de velocidade

Usa `POST /projects/:user/:project/video-tasks` de
[000-video-common/contracts/public-api.md](../../000-video-common/contracts/public-api.md).

## Pedido

```json
{ "tool": "speed", "videoId": "670f…", "outputName": "clip (2×).mp4", "params": { "factor": 2 } }
```

| Erro | Quando |
|---|---|
| `400 INVALID_PARAMS` com `fields.factor` | SPD-005 (`"Escolha uma das velocidades: 0.5×, 0.75×, 1.25×, 1.5×, 2×"`) |
| `409 DUPLICATE_TASK` com `task` | Pedido idêntico em curso (FA4) |
| `415 UNSUPPORTED_FORMAT` | Origem WebM ou fora da matriz (E3) |

## Mensagem para o *worker*

`params` normalizado (`{factor, expectedDurationS}`) na `video_speed_queue`, com o formato de
`worker-messages.md`. O *worker* responde com os eventos comuns (`started`, `progress`, `completed`,
`failed`).
