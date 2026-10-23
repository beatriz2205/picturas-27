# Research: Detetar pessoas e objetos num vídeo

Base: [000-video-common/research.md](../000-video-common/research.md).

## R1. Uma inferência por fotograma para as duas ferramentas

**Decision**: O *worker* `video_detect` carrega `YOLO("../models/yolov5su.pt")` uma vez por tarefa. Para cada
fotograma corre `model(frame, conf=threshold, verbose=False)` com todas as classes:
- `obj_ai` recebe todas as deteções, com `tool: "obj_ai"`;
- `people_ai` recebe o subconjunto da classe 0 (`person`), com `tool: "people_ai"`.

**Rationale**:
- `Tools/people_ai/people_ai.py` e `Tools/obj_ai/obj_ai.py` usam o mesmo modelo. O `people_ai` só
  acrescenta `classes=[0]`. Como o NMS da `ultralytics` é feito por classe (`agnostic=False` por
  omissão), filtrar a classe 0 depois da inferência dá as mesmas caixas que inferir com
  `classes=[0]`.
- Uma única inferência por fotograma reduz para metade o tempo com as duas ferramentas (DET-003,
  DET-009).

**Alternatives considered**: Encaminhar os fotogramas para os *workers* `people_ai` e `obj_ai`,
rejeitado por A17 (transporte por fila) e porque estes escrevem ficheiros de texto por imagem. Uma
inferência por ferramenta, rejeitada por duplicar o custo.

## R2. Leitura de fotogramas

A implementação lê sequencialmente com `cv2.VideoCapture`. O fotograma é um *array*
NumPy `(h, w, 3)` BGR passado diretamente ao modelo. Os fotogramas não são todos mantidos em memória,
mas a lista de deteções é acumulada até à escrita do JSON; a memória total não é constante.
`index = n`, `timeS = round(n / fps, 3)`.

## R3. Formato JSON (DET-004)

Ficheiro `Tools/video_detect/detections.v1.schema.json` (JSON Schema), usado nos testes:

```json
{
  "schemaVersion": 1,
  "source": { "videoId": "670f…", "durationS": 60.0, "fps": 30, "width": 1920, "height": 1080, "frameCount": 1800 },
  "task": { "id": "6711…", "tools": ["people_ai", "obj_ai"], "threshold": 0.5, "model": "yolov5su" },
  "classes": ["car", "person"],
  "frames": [
    { "index": 150, "timeS": 5.0,
      "detections": [
        { "tool": "people_ai", "class": "person", "confidence": 0.91, "box": { "cx": 0.42, "cy": 0.55, "w": 0.10, "h": 0.40 } },
        { "tool": "obj_ai",    "class": "person", "confidence": 0.91, "box": { "cx": 0.42, "cy": 0.55, "w": 0.10, "h": 0.40 } },
        { "tool": "obj_ai",    "class": "car",    "confidence": 0.77, "box": { "cx": 0.80, "cy": 0.60, "w": 0.25, "h": 0.18 } } ] }
  ]
}
```

- A caixa usa centro e dimensões normalizados (`cx`, `cy`, `w`, `h` em [0, 1]), o mesmo formato
  (`bx, by, bw, bh`) das ferramentas de imagem.
- A confiança tem 4 casas decimais.
- Só são incluídos os fotogramas com deteções. `frameCount` indica o total.
- Inclui-se uma deteção se `confidence ≥ threshold` (RN3). O `obj_ai` de imagem usa `>`, mas a
  diferença só se nota com valores exatamente iguais ao limiar e cabe na tolerância de DET-008.

## R4. Vídeo anotado (DET-005)

Na mesma passagem, se `annotatedVideo` for verdadeiro, desenha-se cada caixa com `cv2.rectangle` e
`cv2.putText` (`"<classe> 0.91"`), com uma cor por classe (paleta fixa por `hash`), e escreve-se o
fotograma num temporário OpenCV (`mp4v`). No fim, o FFmpeg recodifica para H.264, `yuv420p`,
e copia o áudio da origem. O resultado é verificado antes de ser carregado. Com
as duas ferramentas, a pessoa é desenhada uma só vez (a deteção de `people_ai`). Formato MP4/H.264/AAC
com a resolução e a duração da origem.

## R5. Conclusão atómica (DET-006)

O *worker* carrega primeiro o JSON e depois o vídeo anotado. Se algum carregamento ou a verificação
falharem, publica `failed` com `orphanKeys` (as chaves já carregadas) e o `projects` apaga-as. O
`completed` lista todos os *outputs*, e o `projects` cria os `videoAsset` todos na mesma transição
(000/D7).

## R6. Desempenho (DET-009)

A estimativa inicial de 150–300 ms por fotograma não foi confirmada. Nas medições comunicadas
pela equipa, 60 s 1080p a 30 fps com duas ferramentas e 1 vCPU excederam o tempo máximo de 15 min,
sem concluir. DET-009 (95% ≤ 10 min) não foi cumprido; não há série completa de 10 execuções.
`torch.set_num_threads(1)` e `imgsz=640` estão implementados. A anotação é escrita na mesma passagem,
sem uma thread dedicada, e depois recodificada com FFmpeg. O modelo é recarregado por tarefa.
Ver [estado de validação](../validation-status.md) para a distinção entre medições comunicadas e
verificações desta revisão.

## R7. Visualizador (DET-007)

O cliente descarrega o JSON (URL de 15 min) e indexa `frames` num `Map<index, detections>`. Sobre o
`<video>` (a origem, ou o vídeo anotado se existir) há um `<canvas>` sobreposto que, em
`requestVideoFrameCallback` (com recurso a `timeupdate`), calcula `index = round(currentTime × fps)`
e desenha as caixas das classes e ferramentas selecionadas. Uma lista lateral mostra as deteções do
fotograma atual, e uma faixa por baixo da linha temporal marca os instantes com deteções da classe
filtrada (clicar salta para esse instante).
