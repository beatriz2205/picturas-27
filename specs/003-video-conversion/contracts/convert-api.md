# Contrato: conversão

Usa as rotas de [000-video-common/contracts/public-api.md](../../000-video-common/contracts/public-api.md).

## Opções

`GET /projects/:user/:project/videos/:video/convert-options` → `200`

```json
{ "source": { "container": "mp4", "videoCodec": "h264", "audioCodec": "aac", "width": 1920, "height": 1080,
              "durationS": 60, "sizeBytes": 52428800 },
  "formats": [ { "id": "mp4", "label": "MP4 (H.264/AAC)" }, { "id": "webm", "label": "WebM (VP9/Opus)" } ],
  "heights": [ { "value": 1080, "label": "Original (1080p)" }, { "value": 720, "label": "720p" },
               { "value": 480, "label": "480p" }, { "value": 360, "label": "360p" } ],
  "defaults": { "format": "mp4", "height": 1080 } }
```

Origem não aceite como entrada → `415 UNSUPPORTED_FORMAT`.

## Pedido

```json
{ "tool": "convert", "videoId": "670f…", "outputName": "video.webm",
  "params": { "format": "webm", "height": 1080 } }
```

| Erro | Quando |
|---|---|
| `400 INVALID_PARAMS`, `fields.format` | Formato fora de `mp4`/`webm`; inclui `options` (E4) |
| `400 INVALID_PARAMS`, `fields.height` | Resolução não permitida; inclui `options` (E4, COM-010) |
| `400 INVALID_PARAMS`, `fields._ = "NO_CHANGE"` | CONV-003 (E5) |
| `415 UNSUPPORTED_FORMAT` | Origem WebM ou fora da matriz (CONV-004, E2) |
| `409 DUPLICATE_TASK` | Mesma conversão ativa |

A extensão de `outputName` é corrigida pelo servidor para a do formato (`.mp4` ou `.webm`).
