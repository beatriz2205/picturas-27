# Implementation Plan: Alterar a velocidade de um vídeo

**Branch**: `006-video-speed` | **Date**: 2026-10-21 | **Spec**: [spec.md](./spec.md)

## Summary

A ferramenta tem três partes:
- o validador `speed` no `projects`, registado em `VIDEO_TOOLS`;
- o *worker* `Tools/video_speed`, que muda a velocidade do vídeo (`setpts` + `fps`) e do áudio
  (`atempo`) com FFmpeg;
- a entrada "Alterar velocidade" no menu do frontend, com os botões das velocidades e a duração
  prevista.

Tudo o resto (tarefa, quota, progresso, cancelamento, notificação, publicação) é do 000.

## Technical Context

**Language/Version**: Python 3.11 (*worker*); Node.js (validador); TypeScript/Next.js 15 (frontend)

**Primary Dependencies**: FFmpeg (`libx264`, `aac`, filtros `setpts`, `fps`, `atempo`),
`Tools/video_utils`

**Storage**: sem alterações (000)

**Testing**: `pytest` (`Tools/video_speed/tests`), `node --test` (`projects/tests/speed.test.js`),
`e2e.sh`, `bench.sh`

**Performance Goals**: SPD-006: ≤ 2 min por minuto de resultado com 1 vCPU

**Constraints**: ±0,5 s; resolução e cadência da origem; tom mantido; MP4/H.264/AAC

## Constitution Check

- **I — PASS**: *worker* isolado na sua fila, sem acesso a bases de dados.
- **II — PASS**: validação do fator no servidor; mesma autorização do 000.
- **III — PASS**: testes de duração, cadência, sincronização e tom; medição de SPD-006.
- **IV — PASS**: progresso e códigos de falha do contrato comum.
- **V — PASS**: uma ferramenta = *worker* + validador + registo + entrada no menu (COM-047). A fila
  passou a ser criada a partir do registo, por isso o `broker.js` não precisa de ser alterado em
  ferramentas futuras.

## Project Structure

```text
specs/006-video-speed/  plan.md research.md (S1–S4) data-model.md quickstart.md tasks.md e2e.sh bench.sh
                        contracts/speed-api.md checklists/requirements.md

Tools/video_speed/
├── video_speed.py           # VideoWorker("speed", handle)
├── Dockerfile               # python:3.11-slim + ffmpeg + video_utils
├── requirements.txt, requirements-dev.txt
└── tests/test_speed.py
projects/
├── video/tools/speed.js     # validate(params, video) → {params: {factor, expectedDurationS}}
├── config/video.js          # VIDEO_TOOLS.speed
├── video/broker.js          # TASK_QUEUES tiradas de VIDEO_TOOLS
└── tests/speed.test.js
rabbitMQ/definitions.json    # video_speed_queue
docker-compose.yaml          # video_speed_worker (1 réplica, 1 vCPU, 1 GB)
frontend/lib/video-tools.tsx # entrada "Alterar velocidade" (SpeedForm)
```

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Nenhuma | — | — |
