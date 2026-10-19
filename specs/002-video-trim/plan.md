# Implementation Plan: Recortar um intervalo temporal de um vídeo

**Branch**: `002-video-trim` | **Date**: 2026-10-19 | **Spec**: [spec.md](./spec.md)

## Summary

A ferramenta de recorte tem três partes:
- o validador `trim` no `projects`, registado em `VIDEO_TOOLS`;
- o *worker* `Tools/video_trim`, que recodifica o intervalo ao fotograma com FFmpeg;
- o editor de recorte no frontend, com leitor, linha temporal de dois marcadores, campos numéricos,
  resolução, nome e resumo.

Tudo o resto (tarefa, quota, progresso, cancelamento, notificação, publicação) é do 000.

## Technical Context

**Language/Version**: Python 3.11 (*worker*); Node.js (validador); TypeScript/Next.js 15 (editor)

**Primary Dependencies**: FFmpeg (`libx264`, `aac`), `Tools/video_utils`; `@radix-ui/react-slider`
(já usado no frontend) com dois polegares para a linha temporal

**Storage**: sem alterações (000)

**Testing**: `pytest` (`Tools/video_trim/tests`), `node --test` (`projects/tests/trim.test.js`),
quickstart

**Performance Goals**: TRIM-011: 30 s de um vídeo de 60 s 1080p em ≤ 1 min (95%) com 1 vCPU

**Constraints**: precisão ao fotograma; ±0,5 s; MP4/H.264/AAC; resolução ≤ original e ≤ perfil

## Constitution Check

- **I — PASS**: *worker* isolado na sua fila, sem acesso a bases de dados.
- **II — PASS**: validação de parâmetros no servidor; mesma autorização do 000.
- **III — PASS**: testes de duração, de fotograma e de validação; medição de TRIM-011.
- **IV — PASS**: progresso e códigos de falha do contrato comum.
- **V — PASS**: uma ferramenta = *worker* + validador + entrada de registo (COM-047).

## Project Structure

```text
specs/002-video-trim/  plan.md research.md (T1–T5) data-model.md quickstart.md tasks.md
                       contracts/trim-api.md checklists/requirements.md

Tools/video_trim/
├── video_trim.py            # VideoWorker("trim", handler)
├── Dockerfile               # python:3.11-slim + ffmpeg + video_utils
├── requirements.txt
└── tests/test_trim.py
projects/
├── video/tools/trim.js      # validate(params, video, profile) → {params, dedupKey}
├── config/video.js          # VIDEO_TOOLS.trim
├── routes/videos.js         # GET .../videos/name-available
└── tests/trim.test.js
docker-compose.yaml          # video_trim_worker (2 réplicas, D10)
frontend/
├── components/video-tools/trim-editor.tsx       # NOVO: diálogo do editor
├── components/video-tools/timeline-range.tsx    # NOVO: slider de dois polegares + campos mm:ss.fff
├── components/video-tools/resolution-select.tsx # NOVO, partilhado com 003
├── components/video-tools/output-name-field.tsx # NOVO, partilhado com 003/004 (TRIM-007)
├── components/video-tools/request-summary.tsx   # NOVO, partilhado
└── components/project-page/video-tool-menu.tsx  # entrada “Recortar”
```

**Structure Decision**: Os componentes reutilizáveis pelas outras ferramentas (resolução, nome,
resumo) ficam em `components/video-tools/` e são criados aqui, porque o recorte é a primeira
ferramenta a ser implementada.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Nenhuma | — | — |
