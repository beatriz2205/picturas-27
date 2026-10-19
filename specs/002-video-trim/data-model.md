# Data Model: Recortar um intervalo temporal

Entidades base: [000-video-common/data-model.md](../000-video-common/data-model.md).

## `videoTask.params` para `tool: "trim"`

| Campo | Tipo | Regras |
|---|---|---|
| `startS` | Number | `0 ≤ startS`; arredondado ao fotograma (TRIM-005) |
| `endS` | Number \| null | `null` → `durationS` (TRIM-004); `startS < endS ≤ durationS`; `endS - startS ≥ 1` (TRIM-003) |
| `height` | Number | `∈ allowedHeights(video, profile)` (COM-010); por omissão, a altura original |

Normalização no servidor (`projects/video/tools/trim.js`): `endS ??= durationS`; arredondar ao
fotograma; validar; calcular `dedupKey`.

## Resultado

Um `videoAsset` com `kind: "video"`, `origin: "task"`, `container: "mp4"`, `video_codec: "h264"`,
`audio_codec: "aac"` ou `null` e `duration_s ≈ endS - startS`.

## Registo da ferramenta

```js
// projects/config/video.js → VIDEO_TOOLS
trim: { queue: "video_trim_queue", validate: require("../video/tools/trim").validate, dedup: true, outputs: ["video"] }
```
