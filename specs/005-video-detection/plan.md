# Implementation Plan: Detetar pessoas e objetos num vídeo

**Branch**: `005-video-detection` | **Date**: 2026-10-19 | **Spec**: [spec.md](./spec.md)

## Summary

A deteção tem três partes:
- o validador `detect` no `projects`;
- o *worker* `Tools/video_detect`, que lê os fotogramas com FFmpeg e corre o mesmo YOLO
  (`yolov5su.pt`) de `people_ai` e `obj_ai`, uma vez por fotograma para as duas ferramentas; escreve
  o JSON versionado e, opcionalmente, o vídeo anotado com OpenCV e FFmpeg;
- no frontend, o diálogo de deteção e o visualizador de deteções (vídeo com *canvas* sobreposto,
  filtro por classe e ferramenta e navegação no tempo).

## Technical Context

**Language/Version**: Python 3.11; Node.js; TypeScript/Next.js 15

**Primary Dependencies**: `ultralytics>=8.0.0`, `torch` CPU (como `Tools/obj_ai/Dockerfile`),
`opencv-python-headless==4.10.0.84`, FFmpeg, `jsonschema` (testes), `Tools/video_utils`

**Storage**: JSON e MP4 em `video_out` (000)

**Testing**: `pytest` (esquema JSON, coincidência com as ferramentas de imagem, falha parcial);
`node --test`; quickstart

**Performance Goals**: DET-009: 60 s 1080p a 30 fps, duas ferramentas, em ≤ 10 min (95%) com 1 vCPU

**Constraints**: todos os fotogramas (DET-008); memória constante; conclusão atómica (DET-006); modelo
partilhado com as ferramentas de imagem (`Tools/models`)

## Constitution Check

- **I — PASS**: *worker* de IA isolado em contentor próprio (Constituição, Security and Operations);
  não usa as filas de imagem.
- **II — PASS**: o JSON só é acessível por URL temporário a quem tem acesso ao projeto (RN8,
  COM-050).
- **III — PASS**: DET-008 com teste automático contra as ferramentas de imagem; validação do esquema.
- **IV — PASS**: progresso por fotogramas e métricas de deteções no `completed`.
- **V — PASS**: reutiliza o modelo e a biblioteca existentes.

## Project Structure

```text
specs/005-video-detection/  plan.md research.md (R1–R7) data-model.md quickstart.md tasks.md
                            contracts/detect-api.md checklists/requirements.md

Tools/video_detect/
├── video_detect.py                  # handler: frames → YOLO → JSON (+ vídeo anotado)
├── annotate.py                      # draw(frame, detections) com cv2
├── detections.v1.schema.json
├── Dockerfile                       # torch CPU + ultralytics + opencv + ffmpeg + video_utils + ../models
├── requirements.txt
└── tests/test_detect.py
projects/
├── video/tools/detect.js
├── config/video.js                  # VIDEO_TOOLS.detect
└── tests/detect.test.js
docker-compose.yaml                  # video_detect_worker (1 réplica, 2 GB)
frontend/
├── components/video-tools/detect-dialog.tsx       # NOVO
├── components/video-tools/detections-viewer.tsx   # NOVO (DET-007)
├── lib/detections.ts                              # NOVO: tipos, fetch + índice por fotograma
└── components/project-page/video-tool-menu.tsx    # entrada “Detetar no vídeo”; cartão JSON → “Ver deteções”
```

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Nenhuma | — | — |
