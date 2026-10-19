# Data Model: Detetar pessoas e objetos num vídeo

Entidades base: [000-video-common/data-model.md](../000-video-common/data-model.md).

## `videoTask.params` para `tool: "detect"`

| Campo | Tipo | Regras |
|---|---|---|
| `tools` | `("people_ai" \| "obj_ai")[]` | 1 ou 2 elementos, sem repetidos (DET-001) |
| `threshold` | Number | 0 ≤ t ≤ 1; por omissão 0,5 (DET-002) |
| `annotatedVideo` | Boolean | Por omissão `false` (DET-005) |

`dedupKey = sha1(userId|videoId|detect|tools ordenadas|threshold|annotatedVideo)`.

## Resultados

| `videoAsset` | `kind` | `container` | Notas |
|---|---|---|---|
| Resultado de deteção | `detections` | `json` | Sempre; nome `<vídeo> (deteções).json`; esquema em research R3 |
| Vídeo anotado | `video` | `mp4` | Só com `annotatedVideo`; nome `<vídeo> (anotado).mp4`; aceite como entrada de outras ferramentas (é MP4/H.264/AAC) |

Os dois têm `source_video_id` e `source_task_id` iguais. A interface agrupa-os pela tarefa.

Correspondência com o modelo de domínio: **Resultado de deteção** (versão do formato) = o documento
JSON (`schemaVersion`); **Deteção** (classe, confiança, instante do fotograma, caixa delimitadora) =
cada elemento de `frames[].detections[]`.

## Registo da ferramenta

```js
detect: { queue: "video_detect_queue", validate: require("../video/tools/detect").validate, dedup: true,
          outputs: ["detections", "video?"] }
```
