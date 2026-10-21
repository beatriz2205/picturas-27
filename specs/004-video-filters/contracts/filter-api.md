# Contrato: filtros

Usa as rotas de [000-video-common/contracts/public-api.md](../../000-video-common/contracts/public-api.md).

## Opções

`GET /projects/:user/:project/videos/:video/filter-options` → `200`

```json
{ "styles": [
    { "id": "bw", "label": "Preto e Branco", "brightness": 0, "contrast": 10, "saturation": -100, "tint": null },
    { "id": "sepia", "label": "Sépia", "brightness": 5, "contrast": 0, "saturation": -100, "tint": "sepia" },
    { "id": "vintage", "label": "Vintage", "brightness": 5, "contrast": -15, "saturation": -35, "tint": "sepia30" } ],
  "range": { "min": -100, "max": 100, "neutral": 0 } }
```

## Pedido

```json
{ "tool": "filter", "videoId": "670f…", "outputName": "video (P&B).mp4",
  "params": { "style": "bw", "brightness": 0, "contrast": 10, "saturation": -100 } }
```

`tint` (`null`, `"sepia"`, `"sepia30"`) é opcional: se faltar, usa-se a tonalidade do estilo
(`null` para `none` e `custom`). O frontend envia-a sempre, para manter a tonalidade de um estilo
ajustado à mão (FA1: `"style": "custom", "tint": "sepia"`). Valores omitidos contam como 0.

| Erro | Quando |
|---|---|
| `400 INVALID_PARAMS`, `fields.brightness`/`contrast`/`saturation` | Fora de −100..+100 ou não inteiro (FLT-003, E2) |
| `400 INVALID_PARAMS`, `fields.style` | Estilo desconhecido |
| `400 INVALID_PARAMS`, `fields._ = "NO_CHANGE"` | Nenhum estilo nem ajuste (F5) |
| `415`, `413/422`, `429`, `503` | 000 (E3–E7) |
