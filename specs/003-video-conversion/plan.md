# Implementation Plan: Converter vídeo para outro formato ou resolução

**Branch**: `003-video-conversion` | **Date**: 2026-10-19 | **Spec**: [spec.md](./spec.md)

## Summary

A conversão tem três partes:
- o validador `convert` e a rota `convert-options` no `projects`;
- o *worker* `Tools/video_convert`, que recodifica com FFmpeg para MP4 (H.264/AAC) ou WebM
  (VP9/Opus);
- o diálogo de conversão no frontend, que reutiliza os componentes de 002 (`resolution-select`,
  `output-name-field`, `request-summary`).

## Technical Context

**Language/Version**: Python 3.11 (*worker*); Node.js; TypeScript/Next.js 15

**Primary Dependencies**: FFmpeg com `libx264`, `aac`, `libvpx-vp9` e `libopus` (pacote `ffmpeg` do
Debian, que já os inclui); `Tools/video_utils`

**Storage**: sem alterações (000)

**Testing**: `pytest` (`Tools/video_convert/tests`); `node --test` (`projects/tests/convert.test.js`);
quickstart

**Performance Goals**: CONV-006: MP4, 95% em ≤ 2 min para 60 s 1080p; MP4 Premium ≤ 2 × a duração; WebM com alvo por definir

**Constraints**: só MP4/WebM; resolução ≤ original e perfil; sem cópia igual; WebM não reentra

## Constitution Check

- **I — PASS**: *worker* isolado.
- **II — PASS**: validação no servidor; autorização do 000.
- **III — PASS**: testes por formato, por resolução e pela regra de alteração efetiva; medição de
  CONV-006.
- **IV — PASS**: contrato comum de progresso e falhas.
- **V — PASS**: segue o padrão de 002.

## Project Structure

```text
specs/003-video-conversion/  plan.md research.md (C1–C5) data-model.md quickstart.md tasks.md
                             contracts/convert-api.md checklists/requirements.md

Tools/video_convert/
├── video_convert.py
├── Dockerfile
├── requirements.txt
└── tests/test_convert.py
projects/
├── video/tools/convert.js          # validate + options(video, profile)
├── config/video.js                 # VIDEO_TOOLS.convert
├── routes/videos.js                # GET .../videos/:video/convert-options
└── tests/convert.test.js
docker-compose.yaml                 # video_convert_worker (1 réplica)
frontend/
├── components/video-tools/convert-dialog.tsx    # NOVO
└── components/project-page/video-tool-menu.tsx  # entrada “Converter”
```

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Nenhuma | — | — |
