# Implementation Plan: Submeter vídeo a um projeto

**Branch**: `001-video-submit` | **Date**: 2026-10-19 | **Spec**: [spec.md](./spec.md)

## Summary

Rota de carregamento de vídeo em *stream* (Nginx, gateway, `projects`, `imageStorageService`) com:
- recusa por tamanho antes da transferência;
- validação por conteúdo com `ffprobe`;
- idempotência por `X-Upload-Id`;
- criação de projeto a partir de um vídeo;
- *thumbnail* JPEG gerada com `ffmpeg` no `projects` e guardada em `video_thumb` (Phase 8; S6 e D16
  do 000).

No frontend: diálogo “Adicionar vídeo” com progresso e cancelamento, e opção de vídeo no diálogo de
novo projeto. Depende da Phase 2 do 000 (modelos, `probe`, `limits`, `storage`).

## Technical Context

**Language/Version**: Node.js (CommonJS); TypeScript/Next.js 15

**Primary Dependencies**: Multer `diskStorage`, Axios (*stream*), `form-data`, `crypto` (sha256),
`ffprobe`; no frontend, Axios `onUploadProgress` e `AbortController`

**Storage**: `videoAsset` (MongoDB `projects`); SeaweedFS `video_src`; disco temporário
`/app/images/tmp/uploads`

**Testing**: `node --test` (`projects/tests/submit.test.js`) com os vídeos de
`projects/tests/fixtures/make-videos.sh`; cenários do quickstart

**Target Platform**: Docker Compose, Nginx HTTPS

**Performance Goals**: validação e geração da *thumbnail* ≤ 5 s para 500 MB após a receção
(SUBMIT-011); memória do gateway e do
`projects` independente do tamanho do ficheiro

**Constraints**: 500 MB máx. (Premium); nenhuma entrada parcial; não alterar `addProjectImages` nem a
rota `/img`

**Scale/Scope**: 1 ficheiro por pedido

## Constitution Check

- **I — PASS**: Passa pelo gateway; o armazenamento continua atrás do `imageStorageService`.
- **II — PASS**: JWT e permissão de edição; a chave de armazenamento não é exposta; o *hash* é guardado.
- **III — PASS**: Testes para cada requisito SUBMIT.
- **IV — PASS**: Erros com código estável; registo da submissão (tamanho, duração, resultado da
  validação).
- **V — PASS**: Rota nova em ficheiro próprio; o fluxo de imagem não muda.

## Project Structure

### Documentation (this feature)

```text
specs/001-video-submit/
├── plan.md, research.md (S1–S5), data-model.md, quickstart.md, tasks.md
├── contracts/submit-api.md
└── checklists/requirements.md
```

### Source Code

```text
nginx/nginx.conf                                  # locations de upload (T007 do 000)
apiGateway/routes/videos.js                       # POST .../videos e POST /:user/video-project em stream
projects/
├── video/upload.js                               # NOVO: receiveUpload(req) → {path, sha256, size}; S3
├── routes/videos.js                              # POST .../videos, POST /:user/video-project
└── tests/submit.test.js                          # NOVO
frontend/
├── lib/videos.ts                                 # uploadVideo({file, uploadId, onProgress, signal}), createProjectWithVideo
├── lib/mutations/videos.ts                       # useUploadVideo, useCreateProjectWithVideo
├── components/project-page/add-video-dialog.tsx  # NOVO
├── components/video-submission-area.tsx          # NOVO: dropzone (react-dropzone) só video/mp4
├── components/dashboard-sidebar/new-project-dialog.tsx   # opção “Começar com um vídeo”
└── app/dashboard/[pid]/page.tsx                  # botão “Adicionar vídeo”; página sem imagens não falha
```

**Structure Decision**: A receção vive em `projects/video/upload.js` para ser testável sem HTTP. O
gateway só reencaminha o *stream*, com `Content-Type`, `Content-Length` e os cabeçalhos
`X-Upload-Id` e `X-Video-Size`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Nenhuma | — | — |
