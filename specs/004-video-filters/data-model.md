# Data Model: Filtros visuais e ajustes de cor

Entidades base: [000-video-common/data-model.md](../000-video-common/data-model.md).

## `videoTask.params` para `tool: "filter"`

| Campo | Tipo | Regras |
|---|---|---|
| `style` | `"none"` \| `"bw"` \| `"sepia"` \| `"vintage"` \| `"custom"` | Rótulo para o resumo; `custom` = estilo ajustado à mão |
| `tint` | `null` \| `"sepia"` \| `"sepia30"` | Tonalidade herdada do último estilo escolhido |
| `brightness` | Integer | −100..+100 (FLT-003) |
| `contrast` | Integer | −100..+100 |
| `saturation` | Integer | −100..+100 |

Restrição: `tint ≠ null` ou pelo menos um valor ≠ 0 (F5). Para o *worker*, os fatores são
`1 + v/100` (F2).

`dedupKey = sha1(userId|videoId|filter|tint|brightness|contrast|saturation)`.

## Estilos (`projects/config/video.js` → `FILTER_STYLES`)

Ver a tabela em research F3. A configuração é a fonte única: o frontend recebe-a por `filter-options`
e o *worker* só conhece as matrizes de `tint`.

## Resultado

`videoAsset` com `container: "mp4"`, `video_codec: "h264"`, `audio_codec` igual à origem (cópia) e
`width`, `height`, `fps` e `duration_s` iguais à origem (FLT-006).

## Registo da ferramenta

```js
filter: { queue: "video_filter_queue", validate: require("../video/tools/filter").validate, dedup: true, outputs: ["video"] }
```
