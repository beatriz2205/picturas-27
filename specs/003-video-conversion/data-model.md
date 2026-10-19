# Data Model: Converter vídeo

Entidades base: [000-video-common/data-model.md](../000-video-common/data-model.md).

## `videoTask.params` para `tool: "convert"`

| Campo | Tipo | Regras |
|---|---|---|
| `format` | `"mp4"` \| `"webm"` | CONV-001 |
| `height` | Number | `∈ allowedHeights(video, profile)` (COM-010); por omissão, a original |

Restrição: `!(format === "mp4" && height === video.height)` (CONV-003).

## Resultado

`videoAsset` com:
- `container` `mp4` ou `webm`;
- `video_codec` `h264` ou `vp9`;
- `audio_codec` `aac`, `opus` ou `null`;
- `duration_s ≈ origem`.

O virtual `acceptedAsInput` é `false` para `webm` (CONV-004).

## Registo da ferramenta

```js
convert: { queue: "video_convert_queue", validate: require("../video/tools/convert").validate, dedup: true, outputs: ["video"] }
```

`dedupKey = sha1(userId|videoId|convert|format|height)`.
