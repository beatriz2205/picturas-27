---
description: "Task list: recortar um intervalo temporal de um vídeo"
---

# Tasks: Recortar um intervalo temporal de um vídeo

**Input**: `/specs/002-video-trim/`. **Pré-requisitos**: 000 (Phases 1–5) e 001 (US1).

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [ ] T001 [P] Criar `Tools/video_trim/Dockerfile` com base em `python:3.11-slim`, `apt-get install
  ffmpeg`, cópia de `video_utils` e `video_trim`, e `CMD ["python", "-u", "video_trim.py"]`.
  Criar também o `requirements.txt`. Requisito: COM-049.
- [ ] T002 [P] Acrescentar ao `docker-compose.yaml` o `video_trim_worker` (contexto `./Tools`, rede
  `elk`, `depends_on rabbitmq healthy`, `VIDEO_INTERNAL_TOKEN`, volume `video_tmp`, `deploy.replicas:
  2`). Requisito: COM-037.

## Phase 2: Foundational

- [ ] T003 Criar `projects/video/tools/trim.js` com `validate(params, video, profile)`:
  - `endS ??= duration`;
  - arredondamento ao fotograma;
  - regras de TRIM-003, com `INVALID_PARAMS` e `fields` com as mensagens de `trim-api.md`;
  - `height ∈ allowedHeights` (COM-010);
  - `dedupKey` (research T4).
  Registar `trim` em `VIDEO_TOOLS` com `dedup: true`. Requisitos: TRIM-003, TRIM-004, TRIM-005,
  TRIM-008, COM-008, COM-010.
- [ ] T004 Em `taskService.accept` (000/T023), quando `VIDEO_TOOLS[tool].dedup` é verdadeiro, procurar
  uma tarefa ativa com o mesmo `dedupKey` e devolver `409 DUPLICATE_TASK` com o `TaskDTO`, sem
  reservar quota. Requisito: TRIM-008.
- [ ] T005 [P] Criar `projects/tests/trim.test.js`:
  - início ≥ fim, fim > duração e duração 0,9 s → `400`;
  - sem fim → `endS = duração`;
  - 1,01 s a 30 fps → 1,0;
  - `height` acima da original ou do perfil → `400`;
  - pedido idêntico ativo → `409` sem reserva;
  - origem resultado de um recorte → aceite;
  - origem WebM → `415`.
  Requisitos: TRIM-003 a TRIM-005, TRIM-008, TRIM-010, CONV-004.

**Checkpoint**: um `curl` com `tool: "trim"` gera uma tarefa `queued` na `video_trim_queue`.

---

## Phase 3: User Story 1 — Recortar um excerto (P1) 🎯 MVP

**Independent Test**: Cenário 1 do [quickstart.md](./quickstart.md).

- [ ] T006 [US1] Criar `Tools/video_trim/video_trim.py`. O *handler* `(task, input_path, work_dir,
  progress, cancel)`:
  - constrói o comando de research T1 (procura exata, `scale` só se `height` < origem, `-map 0:a:0?`,
    `fps` da origem, `+faststart`);
  - corre `video_utils.ffmpeg.run` com o progresso de T2;
  - chama `verify` com a duração `endS-startS` (±0,5 s), `height`, `h264`, `mp4` e o áudio da
    origem;
  - devolve o *output* para `completed`.
  Requisitos: TRIM-005, TRIM-009, COM-027, COM-028.
- [ ] T007 [P] [US1] Criar `Tools/video_trim/tests/test_trim.py` com vídeos `lavfi` (com contador de
  fotogramas `drawtext` ou `testsrc2`):
  - 10–40 s → 30 s ± 0,5;
  - 1,01 s a 30 fps → o primeiro fotograma do resultado é o 30 (ler com `ffprobe -show_frames`
    + `drawtext`, ou comparar o PSNR com o fotograma 30 da origem);
  - 720p a partir de 1080p → 1280 × 720;
  - sem áudio → sem áudio;
  - com áudio → `aac`.
  Requisitos: TRIM-005, TRIM-009, COM-028.
- [ ] T008 [P] [US1] Criar `frontend/components/video-tools/timeline-range.tsx`: `Slider` Radix com
  dois polegares (`value=[start, end]`, `step = 1/fps`), campos `mm:ss.fff` sincronizados nos dois
  sentidos e a duração do excerto. Requisito: TRIM-001.
- [ ] T009 [P] [US1] Criar os componentes partilhados em `frontend/components/video-tools/`:
  - `resolution-select.tsx`: opções de `allowedHeights`, calculadas no cliente com os mesmos dados de
    `video-limits` e com a original pré-selecionada;
  - `request-summary.tsx`: lista chave/valor, com o formato de saída e as operações restantes do 000;
  - `output-name-field.tsx`.
  Requisitos: COM-010, TRIM-006, COM-023.
- [ ] T010 [US1] Criar `frontend/components/video-tools/trim-editor.tsx`: diálogo com `video-player`
  (000), `timeline-range`, `resolution-select`, `output-name-field` e `request-summary`, e o botão
  “Iniciar recorte”, que chama `useCreateVideoTask({tool: "trim", …})`, fecha o diálogo e mostra a
  tarefa no painel. Os erros vêm de `getErrorMessage`/`upgrade-dialog`. Requisitos: TRIM-001,
  TRIM-006, COM-007, COM-024.
- [ ] T011 [US1] `video-tool-menu.tsx`: entrada “Recortar” (ícone `Scissors`), desativada com o motivo
  quando o vídeo não é aceite como entrada, excede o perfil, não há permissão de edição ou não há
  quota. Requisitos: COM-001, COM-018, CONV-004.

## Phase 4: User Story 2 — Validar e pré-visualizar (P1)

**Independent Test**: Cenário 2 do quickstart.

- [ ] T012 [US2] Em `trim-editor.tsx`:
  - validação em tempo real com as mesmas regras de `trim.js` (função partilhada copiada para
    `frontend/lib/video-validation.ts`);
  - campo em erro com a mensagem;
  - botão desativado;
  - fim vazio → “fim do vídeo” no resumo.
  Requisitos: TRIM-003, TRIM-004.
- [ ] T013 [US2] Em `trim-editor.tsx`, botões “Ver início” e “Ver fim” (`video.currentTime = start` e
  `play`; para o fim, reproduzir a partir de `end - 2 s` e parar em `end`). Requisito: TRIM-002.

## Phase 5: User Story 3 — Duplicados e nomes (P2)

**Independent Test**: Cenário 3 do quickstart.

- [ ] T014 [US3] `projects/routes/videos.js`: `GET /:user/:project/videos/name-available`, declarada
  antes de `/videos/:video`, e o *proxy* no gateway. Requisito: TRIM-007.
- [ ] T015 [US3] Em `output-name-field.tsx`, verificar o nome com *debounce* de 300 ms. Se não estiver
  disponível, mostrar “Já existe. Usar «clip (1).mp4»?” com confirmação, e só deixar confirmar o
  pedido depois de aceitar a sugestão ou mudar o nome. Requisito: TRIM-007.
- [ ] T016 [US3] Em `trim-editor.tsx`, perante `409 DUPLICATE_TASK`, mostrar “Este recorte já está em
  curso” e destacar a tarefa existente no painel. Requisito: TRIM-008.

## Phase 6: User Story 4 — Recortar um resultado (P3)

- [ ] T017 [US4] Verificar que o menu “Recortar” aparece nos resultados MP4 (`acceptedAsInput`) e
  acrescentar ao `trim.test.js` o caso origem = resultado de recorte. Requisito: TRIM-010.

## Phase 7: Polish

- [ ] T018 Criar `specs/002-video-trim/bench.sh`, que cria 20 tarefas por `curl`, espera pelo fim e
  calcula o percentil 95 de `finishedAt - startedAt`. Medir TRIM-011: 20 recortes de 30 s de
  `ok_1080p_60s.mp4` → percentil 95 ≤ 60 s com 1 vCPU. Se não cumprir, ajustar o `-preset` em
  `video_trim.py` e registar o valor no relatório. O *script* serve de modelo para os `bench.sh` de
  003 a 005.
- [ ] T019 Correr o cenário completo do quickstart e os cenários 2 a 4 do quickstart do 000 com
  `trim` em vez de `noop`.

## Dependencies & Execution Order

- 000 (Phases 1–5) e 001 (US1) → T001–T005 → US1 → US2 → US3 → US4 → Polish.
- T006 e T007 (Python) em paralelo com T008 a T011 (frontend).
- T009 cria componentes usados por 003 e 004: terminar antes de começar esses specs.
