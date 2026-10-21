---
description: "Task list: detetar pessoas e objetos num vídeo"
---

# Tasks: Detetar pessoas e objetos num vídeo

**Input**: `/specs/005-video-detection/`. **Pré-requisitos**: 000 (Phases 1–5) e 001 (US1).

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 [P] Criar `Tools/video_detect/Dockerfile` com base em `Tools/obj_ai/Dockerfile` (torch CPU,
  bibliotecas de sistema do OpenCV), mais `ffmpeg`, `COPY ./video_utils`, `COPY ./models ../models`
  e `CMD ["python", "-u", "video_detect.py"]`. Criar o `requirements.txt` com `ultralytics>=8.0.0`,
  `opencv-python-headless==4.10.0.84` e `pika`. Requisito: COM-049.
- [X] T002 [P] Acrescentar ao `docker-compose.yaml` o `video_detect_worker` (1 réplica, 1 vCPU, 2 GB,
  D10).
- [X] T003 [P] Criar `Tools/video_detect/detections.v1.schema.json` (research R3). Requisito: DET-004.

## Phase 2: Foundational

- [X] T004 Criar `projects/video/tools/detect.js` com `validate`:
  - `tools` com 1 ou 2 elementos válidos e sem repetidos;
  - `0 ≤ threshold ≤ 1`, por omissão 0,5;
  - `annotatedVideo` booleano;
  - `dedupKey`.
  Registar `detect` em `VIDEO_TOOLS` com `outputs: ["detections", "video?"]`. Requisitos: DET-001,
  DET-002, COM-008.
- [X] T005 Em `taskService.complete` (000/T023), aceitar *outputs* `kind: "detections"` (JSON, sem
  metadados de vídeo) e nomeá-los segundo o data-model. Em `failed`, apagar `orphanKeys`. Requisitos:
  DET-006, COM-029.
- [X] T006 [P] Criar `projects/tests/detect.test.js`:
  - `tools: []` → `400`;
  - `["x"]` → `400`;
  - `["obj_ai", "obj_ai"]` → `400`;
  - `threshold: 1.2` → `400`;
  - sem `threshold` → 0,5;
  - as duas ferramentas → 1 tarefa e 1 operação (*mock* de quota);
  - `completed` com 2 *outputs* → 2 `videoAsset` com o mesmo `source_task_id`.
  Requisitos: DET-001 a DET-003, DET-006, COM-021.

## Phase 3: User Story 1 — Detetar e obter o JSON (P1) 🎯 MVP

**Independent Test**: Cenário 1 do [quickstart.md](./quickstart.md).

- [X] T007 [US1] Criar `Tools/video_detect/video_detect.py`:
  - carrega o modelo uma vez (`torch.set_num_threads(1)`);
  - o *handler* lê os fotogramas `bgr24` (R2) e faz uma inferência por fotograma com
    `conf=threshold`;
  - reparte os resultados por ferramenta (R1) e só inclui confiança ≥ limiar;
  - acumula `frames` e envia progresso por fotogramas;
  - escreve o JSON (R3), valida-o contra o esquema e carrega-o.
  Requisitos: DET-002, DET-003, DET-004, COM-052.
- [X] T008 [P] [US1] Criar `Tools/video_detect/tests/test_detect.py`:
  - o JSON de um vídeo curto (10 s, gerado com fotogramas com pessoas, por exemplo `Tools/obj_ai`
    `image_objects_detected.jpg` em ciclo com `ffmpeg -loop 1`) é válido contra o esquema;
  - com limiar 0,7, todas as confianças são ≥ 0,7;
  - com as duas ferramentas, aparecem `tool` `people_ai` e `obj_ai` no mesmo fotograma.
  Requisitos: DET-002 a DET-004.
- [X] T009 [P] [US1] Criar `Tools/video_detect/tests/test_parity.py` para DET-008:
  - extrair 20 fotogramas (PNG) nos instantes `k × duração/20`;
  - correr o código de deteção de `Tools/people_ai/people_ai.py` e `Tools/obj_ai/obj_ai.py`, com as
    classes importadas e as funções `count_people`/`detect_objects` sobre o PNG, ou o mesmo modelo com
    os mesmos argumentos;
  - comparar com as deteções do JSON no `index` correspondente (mesma classe e IoU ≥ 0,9) e exigir
    ≥ 95% de coincidência.
  Requisito: DET-008.
- [X] T010 [P] [US1] Criar `frontend/components/video-tools/detect-dialog.tsx`:
  - *checkboxes* `people_ai` (“Pessoas”) e `obj_ai` (“Objetos”);
  - *slider* de limiar de 0 a 1 (passo 0,05, valor inicial 0,5);
  - *checkbox* “Gerar também vídeo anotado”;
  - `request-summary` com a indicação “Conta como 1 operação” e as operações restantes;
  - botão desativado sem ferramenta e com o erro no campo.
  Requisitos: DET-001, DET-002, COM-023.
- [X] T011 [US1] `video-tool-menu.tsx`: entrada “Detetar no vídeo” (ícone `ScanSearch`).
  `project-video-list.tsx` (000): cartão para `kind: "detections"` com o ícone JSON, a origem, a
  ação “Ver deteções” (US2) e “Descarregar JSON”. Requisitos: COM-030, DET-007.

## Phase 4: User Story 2 — Consultar as deteções (P2)

**Independent Test**: Cenário 2 do quickstart.

- [X] T012 [US2] Criar `frontend/lib/detections.ts`: tipos do esquema v1, `loadDetections(url)` e
  `indexByFrame(doc)` → `Map<number, Detection[]>`. Erro claro se `schemaVersion ≠ 1`.
  Requisito: DET-004.
- [X] T013 [US2] Criar `frontend/components/video-tools/detections-viewer.tsx` (research R7):
  - `video-player` da origem (ou do vídeo anotado, se existir);
  - `<canvas>` sobreposto que desenha as caixas no instante atual (`requestVideoFrameCallback`,
    com recurso a `timeupdate`);
  - filtros por classe (de `classes`) e por ferramenta;
  - lista das deteções do fotograma atual;
  - faixa com os instantes com deteções, que salta para o instante ao clicar.
  Requisito: DET-007.

## Phase 5: User Story 3 — Vídeo anotado (P3)

**Independent Test**: Cenário 3 do quickstart.

- [X] T014 [US3] Criar `Tools/video_detect/annotate.py`: `draw(frame, detections)` com
  `cv2.rectangle` e `cv2.putText`, cores por classe e pessoa desenhada uma vez (R4). Em
  `video_detect.py`, quando `annotatedVideo` for verdadeiro, escrever os fotogramas num codificador
  FFmpeg com o áudio copiado, verificar (resolução e duração iguais à origem, ±0,5 s) e carregar depois
  do JSON. Se algo falhar, publicar `failed` com `orphanKeys` (R5). A variável de teste
  `VIDEO_DETECT_FAIL_ANNOTATED=1` força a falha do carregamento do vídeo anotado e é usada no
  quickstart. Requisitos: DET-005, DET-006, COM-027, COM-028.
- [X] T015 [P] [US3] Em `test_detect.py`:
  - o vídeo anotado tem a resolução e a duração da origem e os píxeis mudam dentro de uma caixa
    conhecida;
  - simular uma falha no carregamento do vídeo anotado (*mock* de `storage.upload` no 2.º
    carregamento) → evento `failed` com `orphanKeys` contendo a chave do JSON.
  Requisitos: DET-005, DET-006.

## Phase 6: Polish

- [X] T016 Criar `specs/005-video-detection/bench.sh` (modelo de 002/T018). Medir DET-009 com 10
  deteções de `ok_1080p_60s.mp4` com as duas ferramentas: percentil 95 ≤ 600 s. Registar também a
  folga em relação ao tempo máximo de 15 min (R6). Se não cumprir, documentar no relatório (Cap. 8/9)
  e propor um ajuste a RNG-06 para a deteção.
- [X] T017 Guardar capturas do visualizador e do vídeo anotado para o relatório.

## Phase 7: Integration

- [X] T018 Ligar o worker `video_detect` à fila RabbitMQ, incluindo download do vídeo de origem,
  publicação de progresso e carregamento dos resultados para `video_out`.
- [X] T019 Consumir eventos `progress`, `completed` e `failed` em `projects`, criando os `videoAsset`
  apenas após a conclusão e enviando atualizações para o WebSocket.
- [X] T020 Expor o estado e métricas das tarefas na API e apresentar o progresso, resultado e erro no
  frontend, atualizando automaticamente a lista de vídeos quando a tarefa termina.

## Dependencies & Execution Order

- 000 e 001 → T001–T006 → US1 → US2 → US3 → Polish.
- T007 a T009 (Python) em paralelo com T010 e T011 (frontend). T012 e T013 dependem de um JSON real
  (T007) ou de um JSON de exemplo criado a partir do esquema.
