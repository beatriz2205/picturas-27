---
description: "Task list: filtros visuais e ajustes de cor"
---

# Tasks: Aplicar filtros visuais e ajustes de cor a um vídeo

**Input**: `/specs/004-video-filters/`. **Pré-requisitos**: 000 (Phases 1–5), 001 (US1) e 002/T009.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 [P] Criar `Tools/video_filter/Dockerfile` e `requirements.txt` com `Pillow` na mesma versão
  de `Tools/brightness/requirements.txt` e `numpy` só em `requirements-dev.txt`. Requisito: COM-049.
- [X] T002 [P] Acrescentar ao `docker-compose.yaml` o `video_filter_worker` (1 réplica, D10).
- [X] T003 [P] Acrescentar `FILTER_STYLES` a `projects/config/video.js` (research F3).

## Phase 2: Foundational

- [X] T004 Criar `projects/video/tools/filter.js` com `validate`:
  - inteiros entre −100 e 100;
  - `style` e `tint` conhecidos;
  - regra `NO_CHANGE` (F5);
  - `dedupKey`.
  Registar `filter` em `VIDEO_TOOLS`. Requisitos: FLT-003, COM-008.
- [X] T005 `projects/routes/videos.js`: `GET /:user/:project/videos/:video/filter-options` (antes de
  `/videos/:video`) e o *proxy* no gateway. Requisito: FLT-001.
- [X] T006 [P] Criar `projects/tests/filter.test.js`:
  - 150 → `400 fields.brightness`;
  - −101 → `400`;
  - 10,5 → `400`;
  - tudo a 0 sem tonalidade → `NO_CHANGE`;
  - `bw` → aceite;
  - as opções têm os três estilos.
  Requisitos: FLT-001, FLT-003.

## Phase 3: User Story 1 — Aplicar e obter um novo vídeo (P1) 🎯 MVP

**Independent Test**: Cenário 1 do [quickstart.md](./quickstart.md).

- [X] T007 [US1] Criar `Tools/video_filter/adjust.py` com `apply(img, fb, fc, fs, tint)`, que aplica
  `ImageEnhance.Brightness`, `ImageEnhance.Contrast`, `ImageEnhance.Color` e a matriz de tonalidade
  por esta ordem, saltando os fatores iguais a 1. Requisitos: FLT-006, FLT-007.
- [X] T008 [US1] Criar `Tools/video_filter/video_filter.py`, com um *handler* que:
  - abre o descodificador (`rawvideo rgb24`, `-vsync cfr -r fps`) e o codificador (`rawvideo` → `libx264`,
    `-i in.mp4 -map 1:a:0? -c:a copy`);
  - lê `w*h*3` bytes por fotograma, aplica `apply` e escreve;
  - envia progresso com `frames_done / round(duração × fps)`;
  - verifica a saída (resolução, fps e duração iguais à origem ±0,5 s, número de fotogramas por
    `ffprobe -count_frames`, áudio);
  - em cancelamento ou *timeout*, mata os dois processos.
  Requisitos: FLT-006, COM-027, COM-028.
- [X] T009 [P] [US1] Criar `Tools/video_filter/tests/test_filter.py`:
  - um vídeo `lavfi` de 10 s a 30 fps → 300 fotogramas, mesma resolução, 30 fps;
  - FLT-007: extrair 10 fotogramas da origem (`ffmpeg -ss t -frames:v 1 png`), aplicar as funções de
    `Tools/brightness`, `contrast` e `saturation`, importadas ou chamadas com o mesmo
    `ImageEnhance`, e comparar com os fotogramas do resultado nos mesmos instantes → PSNR ≥ 35 dB;
  - áudio: `ffprobe` com `start_time` do áudio e do vídeo → diferença ≤ 40 ms.
  Requisitos: FLT-006, FLT-007, COM-028.
- [X] T010 [P] [US1] Criar `frontend/lib/video-filters.ts`: `toFactor(v) = 1 + v/100` e
  `cssFilter({brightness, contrast, saturation, tint})` (research F4).
- [X] T011 [US1] Criar `frontend/components/video-tools/filter-panel.tsx`:
  - o leitor (`video-player` do 000) com o `style.filter` de `cssFilter`;
  - os botões dos três estilos (de `filter-options`), que preenchem os valores e a tonalidade
    (FLT-002);
  - três `Slider` de −100 a 100 com campo numérico;
  - `output-name-field` e `request-summary` (estilo, valores, tonalidade, MP4 e operações restantes);
  - o botão “Aplicar filtros”, que chama `useCreateVideoTask({tool: "filter"})`.
  Requisitos: FLT-001, FLT-002, FLT-005, COM-023.
- [X] T012 [US1] `video-tool-menu.tsx`: entrada “Filtros” (ícone `SlidersHorizontal`).

## Phase 4: User Story 2 — Ajustar, validar e repor (P1)

**Independent Test**: Cenário 2 do quickstart.

- [X] T013 [US2] Em `filter-panel.tsx`:
  - um valor escrito fora do intervalo marca o campo em erro com “Entre −100 e +100” e desativa o
    botão (FLT-003);
  - mexer num *slider* depois de um estilo passa o estilo a “Personalizado” e mantém a tonalidade
    (FA1);
  - o botão Repor põe tudo a 0, `tint: null` e `style: "none"` (FLT-004);
  - o resumo e a pré-visualização atualizam-se em `onValueChange` (FLT-005).
  Requisitos: FLT-003, FLT-004, FLT-005.

## Phase 5: Polish

- [ ] T014 Criar `specs/004-video-filters/bench.sh` (modelo de 002/T018). Medir FLT-008 com 20
  filtragens de `ok_1080p_60s.mp4` com os três ajustes: percentil 95 ≤ 180 s. Se não cumprir:
  - usar 3 *threads* (ler, processar, escrever);
  - usar `-preset superfast`;
  - registar o resultado e a decisão no relatório (Cap. 8, decisão arquitetural de A17).
- [ ] T015 Afinar visualmente os valores de Sépia e Vintage e guardar capturas antes/depois para o
  relatório.

## Dependencies & Execution Order

- 000, 001 e 002/T009 → T001–T006 → US1 → US2 → Polish.
- T007 a T009 (Python) em paralelo com T010 a T012 (frontend).
