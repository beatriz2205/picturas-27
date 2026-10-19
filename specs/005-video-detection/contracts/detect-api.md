# Contrato: deteção

Usa as rotas de [000-video-common/contracts/public-api.md](../../000-video-common/contracts/public-api.md).

## Pedido

```json
{ "tool": "detect", "videoId": "670f…", "outputName": null,
  "params": { "tools": ["people_ai", "obj_ai"], "threshold": 0.5, "annotatedVideo": true } }
```

| Erro | Quando |
|---|---|
| `400 INVALID_PARAMS`, `fields.tools` | Lista vazia, ferramenta desconhecida ou repetida (DET-001, E2) |
| `400 INVALID_PARAMS`, `fields.threshold` | Fora de [0, 1] ou não numérico (DET-002, E2) |
| `415`, `413/422`, `429`, `503` | 000 (E1, E3–E6) |

`outputName` é ignorado; os nomes seguem o data-model.

## Resultado

- `GET .../videos?sourceTaskId=<task>` devolve o JSON (`kind: "detections"`) e, se pedido, o vídeo
  anotado.
- `GET .../videos/:id/url` do JSON devolve um URL de 15 min. O conteúdo segue o esquema
  `Tools/video_detect/detections.v1.schema.json` (research R3).

## Mensagem `completed` do *worker*

```json
{ "type": "completed", "taskId": "…",
  "outputs": [
    { "kind": "detections", "key": "…/video_out/….json", "sizeBytes": 123456, "sha256": "…", "container": "json" },
    { "kind": "video", "key": "…/video_out/….mp4", "sizeBytes": 9876543, "sha256": "…", "container": "mp4",
      "videoCodec": "h264", "audioCodec": "aac", "durationS": 60.0, "width": 1920, "height": 1080, "fps": 30 } ],
  "metrics": { "processingMs": 412000, "frames": 1800, "detections": 5321 } }
```
