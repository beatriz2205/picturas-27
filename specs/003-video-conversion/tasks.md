---
description: "Task list: converter vídeo para outro formato ou resolução"
---

# Tasks: Converter vídeo para outro formato ou resolução

**Input**: `/specs/003-video-conversion/`. **Pré-requisitos**: 000 (Phases 1–5), 001 (US1) e 002/T009
(componentes partilhados).

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [x] T001 [P] Criar `Tools/video_convert/Dockerfile` e `requirements.txt` (como em 002/T001). Garantir
  que `ffmpeg -encoders` lista `libvpx-vp9` e `libopus` (falhar no *build* se não listar). Requisito:
  COM-049.
- [x] T002 [P] Acrescentar ao `docker-compose.yaml` o `video_convert_worker` (1 réplica, D10).

## Phase 2: Foundational

- [x] T003 Criar `projects/video/tools/convert.js` com:
  - `options(video, profile)`, como em research C3;
  - `validate(params, video, profile)`: `format ∈ {mp4, webm}`, `height ∈ allowedHeights`, regra
    `NO_CHANGE` (C2) e `dedupKey`;
  - correção da extensão do `outputName`.
  Registar `convert` em `VIDEO_TOOLS`. Requisitos: CONV-001, CONV-003, COM-010.
- [x] T004 `projects/routes/videos.js`: `GET /:user/:project/videos/:video/convert-options` (antes de
  `/videos/:video`) e o *proxy* no gateway. Requisito: CONV-001.
- [x] T005 [P] Criar `projects/tests/convert.test.js`:
  - as opções têm exatamente dois formatos;
  - 1080p Free tem `[1080, 720, 480, 360]`;
  - 4K Free tem `[1080, …]` sem a original;
  - 720p não tem opções acima;
  - MP4 com a mesma altura → `NO_CHANGE`;
  - `mov` → `400` com `options`;
  - origem WebM → `415`.
  Requisitos: CONV-001, CONV-003, CONV-004, COM-010.

## Phase 3: User Story 1 — Converter (P1) 🎯 MVP

**Independent Test**: Cenário 1 do [quickstart.md](./quickstart.md).

- [x] T006 [US1] Criar `Tools/video_convert/video_convert.py`, com um *handler* que monta o comando
  de C1 conforme `format` (`scale` só se `height` < origem), corre-o com progresso e chama `verify`
  (C4). Requisitos: CONV-001, CONV-002, COM-027, COM-028.
- [x] T007 [P] [US1] Criar `Tools/video_convert/tests/test_convert.py`:
  - MP4 → WebM 1080p → `vp9`/`opus`, 1080p, duração ±0,5;
  - MP4 → MP4 720p → `h264`/`aac` 720p;
  - sem áudio → WebM sem áudio;
  - vertical 1080 × 1920 → 720p dá 720 × 1280.
  Requisitos: CONV-001, CONV-002, COM-028.
- [x] T008 [US1] Criar `frontend/components/video-tools/convert-dialog.tsx`:
  - metadados da origem (`convert-options.source`);
  - formato com `RadioGroup` (ou `Select`) de 2 opções;
  - seleção da resolução com as opções do servidor;
  - campo de nome com a extensão automática;
  - `request-summary` e o botão “Converter”, desativado com “Escolha outro formato ou resolução”
    enquanto as opções forem as do original (C3).
  Requisitos: CONV-001, CONV-002, CONV-003, COM-023.
- [x] T009 [US1] `frontend/lib/video-tools.tsx`: entrada “Converter” (ícone `RefreshCw`), desativada nas mesmas
  condições do recorte. Requisitos: COM-001, CONV-004.
- [x] T010 [P] [US1] `frontend/components/project-page/project-video-list.tsx` (000/T051): `<source type="video/webm">` para os resultados
  WebM, sem outras alterações. Requisito: COM-044.

## Phase 4: User Story 2 — Opções inválidas e sem efeito (P1)

**Independent Test**: Cenário 2 do quickstart.

- [x] T011 [US2] Em `convert-dialog.tsx`, com `400 INVALID_PARAMS`, mostrar a mensagem do campo e
  substituir as opções pelas que vêm em `options`. Requisitos: CONV-003, COM-010, UC-VID-003/E4.

## Phase 5: User Story 3 — WebM não reentra (P2)

**Independent Test**: Cenário 3 do quickstart.

- [x] T012 [US3] Garantir que `video-tool-menu.tsx` desativa as cinco ferramentas para
  `acceptedAsInput = false`, com a indicação “Formato de vídeo não suportado como entrada (só
  MP4/H.264/AAC)”, e que o cartão do vídeo mostra “WebM — reproduzir ou descarregar”. Requisito:
  CONV-004.
- [ ] T013 [P] [US3] Em `projects/tests/convert.test.js`, para cada `tool` (`trim`, `convert`,
  `filter`, `detect`) com uma origem WebM → `415`. Requisito: CONV-004.

## Phase 6: Polish

- [ ] T014 Alinhar o benchmark existente `Tools/video_convert/bench.sh` com CONV-006:
  executar ≥ 20 conversões para MP4 de `ok_1080p_60s.mp4` e avaliar p95 ≤ 120 s.
  Medir WebM separadamente, sem declarar cumprimento enquanto o alvo estiver por definir.
  O script atual mistura 10 MP4 e 10 WebM no mesmo percentil e aplica também um limite a WebM
  Premium; não constitui uma validação do requisito refinado. As séries comunicadas no relatório
  têm 10 execuções por formato e não completam as 20 MP4 exigidas.
- [ ] T015 Reproduzir um MP4 e um WebM no Chrome e no Firefox atuais e guardar capturas para o
  relatório (COM-044).
- [x] T016 Apagar a pasta antiga `specs/001-video-conversion/`, substituída por este spec (feito na
  preparação dos specs; continua recuperável pelo histórico do git).

## Dependencies & Execution Order

- 000, 001 e 002/T009 → T001–T005 → US1 → US2 → US3 → Polish.
- T006 e T007 em paralelo com T008 a T010.

## Estado verificado em 2026-10-23

As marcas de implementação resultam da inspeção do código, não de uma nova execução dos testes.
T013 está parcial: `convert.test.js` cobre `convert` e `filter`; `trim.test.js` cobre recorte,
mas falta o cenário de deteção nessa matriz (e a extensão à velocidade).
T015: a equipa confirmou os testes manuais no navegador; falta localizar as capturas e registar
as versões dos navegadores. Os componentes do menu e leitor foram consolidados nos caminhos acima.
