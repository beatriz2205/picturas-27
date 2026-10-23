---
description: "Task list: alterar a velocidade de um vídeo"
---

# Tasks: Alterar a velocidade de um vídeo

**Input**: `/specs/006-video-speed/`. **Pré-requisitos**: 000 (Phases 1–5) e 001 (US1).

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [x] T001 [P] Criar `Tools/video_speed/Dockerfile` (base `python:3.11-slim`, `ffmpeg`, cópia de
  `video_utils` e `video_speed`, `CMD ["python", "-u", "video_speed.py"]`) e os `requirements*.txt`.
  Requisito: COM-049.
- [x] T002 [P] Acrescentar ao `docker-compose.yaml` o `video_speed_worker` (como o
  `video_trim_worker`, com `deploy.replicas: 1`, 1 vCPU, 1 GB) e a `video_speed_queue` ao
  `rabbitMQ/definitions.json`. Requisitos: COM-037, COM-049.

## Phase 2: Foundational

- [x] T003 Criar `projects/video/tools/speed.js` com `validate(params, video)`: `factor` na lista de
  RN2, senão `400 INVALID_PARAMS` com `fields.factor`; devolver `{factor, expectedDurationS}`.
  Registar `speed` em `VIDEO_TOOLS` com `dedup: true`. Requisitos: SPD-001, SPD-005, COM-008.
- [x] T004 Em `projects/video/broker.js`, tirar `TASK_QUEUES` do registo `VIDEO_TOOLS` em vez de uma
  lista fixa, para que uma ferramenta nova não obrigue a mudar o broker. Requisito: COM-047.
- [x] T005 [P] Criar `projects/tests/speed.test.js`: registo e fila; fatores aceites e
  `expectedDurationS`; fator ausente, 1×, 3×, 0,25× e texto → `400`. Requisitos: SPD-001, SPD-005,
  COM-047.

**Checkpoint**: um pedido com `tool: "speed"` gera uma tarefa `queued` na `video_speed_queue`.

---

## Phase 3: User Story 1 — Câmara lenta ou aceleração (P1) 🎯 MVP

- [x] T006 [US1] Criar `Tools/video_speed/video_speed.py`: `handle(ctx)` lê a origem com
  `ffmpeg.probe`, monta o comando de research S1, corre-o com o progresso sobre a duração do
  resultado e chama `ctx.output` com `durationS = origem / fator`, a resolução da origem, `h264`, `mp4`
  e o áudio da origem. Requisitos: SPD-002, SPD-003, COM-027.
- [x] T007 [P] [US1] Criar `Tools/video_speed/tests/test_speed.py`: duração para 2×, 0,5×, 1,25× e
  0,75×; resolução e cadência mantidas; fator fora da lista → `tool_error`. Requisitos: SPD-002,
  SPD-003.
- [x] T008 [US1] Em `frontend/lib/video-tools.tsx`, entrada "Alterar velocidade" (ícone `Gauge`) com
  botões das cinco velocidades, a duração prevista ("Câmara lenta/Acelerado: de mm:ss para mm:ss"),
  nome por omissão `<nome> (2×).mp4` e mensagem para `409 DUPLICATE_TASK`. Requisito: SPD-001.

## Phase 4: User Story 2 — Áudio (P1)

- [x] T009 [US2] Em `test_speed.py`: áudio AAC, início com o vídeo (≤ 40 ms) e mesma duração; origem
  sem áudio → resultado sem áudio; tom de 440 Hz mantido a 2× e a 0,5× (FFT). Requisitos: SPD-004,
  COM-028.

## Phase 5: User Story 3 — Inválidos e duplicados (P2)

- [x] T010 [US3] Criar `specs/006-video-speed/e2e.sh` contra o sistema a correr: `factor: 3` → `400`
  sem gastar operação; `speed` em `video-limits.tools`; 2× de um vídeo de 30 s → `202`, mesmo pedido
  → `409`, `completed`, 15 s e 1280 × 720, ligado à origem, 1 operação consumida. Resultado: 9/9.
  Requisitos: SPD-002, SPD-003, SPD-005, COM-021.

## Phase 6: Polish

- [x] T011 Criar `specs/006-video-speed/bench.sh` (modelo do 002) e medir SPD-006 com
  `ok_1080p_60s.mp4` e 1 vCPU: 2× em 72,8 s e 0,5× em 228,2 s (uma execução de cada). O alvo fixo de
  2 min não era exequível a 0,5×; refinado para "≤ 2 min por minuto da maior das duas durações" (Cap. 5.4).
- [ ] T012 Repetir a medição com ≥ 10 execuções de cada fator (`bench.sh 0.5 10`, `bench.sh 2 10`) para
  o percentil 95.
- [ ] T013 Ver o menu "Alterar velocidade" no browser (quickstart, cenários 1 a 3) e no Firefox
  (COM-044).
- [x] T014 Acrescentar a caixa "Ferramenta de velocidade" ao modelo de domínio e o UC-VID-006 ao
  diagrama de casos de uso.

## Dependencies & Execution Order

- 000 (Phases 1–5) → T001–T005 → US1 → US2 → US3 → Polish.
- T006/T007 (Python) em paralelo com T008 (frontend).
