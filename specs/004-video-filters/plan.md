# Implementation Plan: Filtros visuais e ajustes de cor

**Branch**: `004-video-filters` | **Date**: 2026-10-19 | **Spec**: [spec.md](./spec.md)

## Summary

A ferramenta de filtros tem três partes:
- o validador `filter` e a rota `filter-options` no `projects`;
- o *worker* `Tools/video_filter`, que aplica `PIL.ImageEnhance` fotograma a fotograma entre dois
  processos FFmpeg (descodificar → PIL → codificar) e copia o áudio;
- o painel de filtros no frontend, com estilos, três *sliders*, Repor, pré-visualização CSS no leitor
  e resumo.

## Technical Context

**Language/Version**: Python 3.11; Node.js; TypeScript/Next.js 15

**Primary Dependencies**: FFmpeg (`libx264`), Pillow (a mesma versão de `Tools/brightness`), NumPy
(opcional, para o teste de PSNR), `Tools/video_utils`; `@radix-ui/react-slider`

**Storage**: sem alterações (000)

**Testing**: `pytest` com comparação de PSNR entre o fotograma filtrado e a ferramenta de imagem;
`node --test`; quickstart

**Performance Goals**: FLT-008: 60 s 1080p a 30 fps em ≤ 3 min (95%) com 1 vCPU e 2 GB

**Constraints**: mesmos fotogramas, resolução e cadência; áudio copiado (≤ 40 ms); PSNR ≥ 35 dB;
memória constante (um fotograma de cada vez, ≈ 6 MB em 1080p e ≈ 25 MB em 4K)

## Constitution Check

- **I — PASS**: *worker* isolado; não usa as filas das ferramentas de imagem (A17).
- **II — PASS**: valores validados no servidor.
- **III — PASS**: FLT-007 testado de forma automática (PSNR); medição de FLT-008.
- **IV — PASS**: progresso por fotogramas escritos / total de fotogramas.
- **V — PASS**: reutiliza as mesmas funções da PIL que as ferramentas de imagem.

## Project Structure

```text
specs/004-video-filters/  plan.md research.md (F1–F5) data-model.md quickstart.md tasks.md
                          contracts/filter-api.md checklists/requirements.md

Tools/video_filter/
├── video_filter.py          # handler: pipeline FFmpeg → PIL → FFmpeg
├── adjust.py                # apply(frame: PIL.Image, factors, tint) — partilhável pelos testes
├── Dockerfile
├── requirements.txt         # Pillow (versão de Tools/brightness/requirements.txt)
└── tests/test_filter.py
projects/
├── video/tools/filter.js
├── config/video.js          # VIDEO_TOOLS.filter, FILTER_STYLES
├── routes/videos.js         # GET .../videos/:video/filter-options
└── tests/filter.test.js
docker-compose.yaml          # video_filter_worker (1 réplica)
frontend/
├── components/video-tools/filter-panel.tsx      # NOVO
├── lib/video-filters.ts                         # NOVO: toFactor(v), cssFilter(params)
└── components/project-page/video-tool-menu.tsx  # entrada “Filtros”
```

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Dois processos FFmpeg e processamento em Python por fotograma | FLT-007 exige o mesmo efeito que as ferramentas de imagem (PIL) | O filtro `eq` do FFmpeg usa fórmulas diferentes (research F1) |
