# Data Model: Alterar a velocidade de um vídeo

Entidades base: [000-video-common/data-model.md](../000-video-common/data-model.md).

## `videoTask.params` para `tool: "speed"`

| Campo | Tipo | Regras |
|---|---|---|
| `factor` | Number | `∈ {0.5, 0.75, 1.25, 1.5, 2}` (SPD-001, SPD-005) |
| `expectedDurationS` | Number | Calculado no servidor: `durationS / factor`, com 3 casas |

## Resultado

Um `videoAsset` com `kind: "video"`, `origin: "task"`, `container: "mp4"`, `video_codec: "h264"`,
`audio_codec: "aac"` ou `null`, `width`/`height`/`fps` da origem e `duration_s ≈ expectedDurationS`.

## Registo da ferramenta

```js
// projects/config/video.js → VIDEO_TOOLS
speed: require("../video/tools/speed") // { queue: "video_speed_queue", validate, outputs: ["video"], dedup: true }
```
