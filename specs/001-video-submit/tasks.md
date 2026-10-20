---
description: "Task list: submeter vídeo a um projeto"
---

# Tasks: Submeter vídeo a um projeto

**Input**: `/specs/001-video-submit/`. **Pré-requisito**: [000-video-common](../000-video-common/tasks.md),
Phases 1 e 2 (T001–T031).

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [X] T001 Confirmar que as tarefas T003 (ffmpeg), T004 (stages), T007 (Nginx), T018 (upload de vídeo) e
  T020 (`storage.js`) do 000 estão feitas.
- [X] T002 [P] Acrescentar a `make-videos.sh` (000/T015) o `big_150mb.mp4` (H.264 com *bitrate* alto,
  acima do limite Free) e o `premium_5min.mp4` (5 min, para testar o *downgrade*).

## Phase 2: Foundational

- [X] T003 Criar `projects/video/upload.js`:
  - `receiveUpload(req, {maxBytes})` com `multer.diskStorage` em `/app/images/tmp/uploads`,
    `limits: {fileSize: maxBytes, files: 1}` e cálculo do `sha256` em *stream*;
  - limpeza em `req.on("aborted")` e em caso de erro;
  - `uniqueName(projectId, name)`, que acrescenta ` (n)`.
  Requisitos: SUBMIT-005, SUBMIT-006, SUBMIT-007.
- [X] T004 `apiGateway/routes/videos.js`: `POST /:user/:project/videos` e `POST /:user/video-project`
  com `auth.checkToken`. Fazer *pipe* de `req` para o `projects` (`axios({method: "post", data: req,
  maxBodyLength: Infinity, maxContentLength: Infinity})`) com `Content-Type`, `Content-Length`,
  `Authorization`, `X-Caller-Id`, `X-Upload-Id` e `X-Video-Size`. Não usar o `multer` do gateway.
  Requisito: SUBMIT-001.

**Checkpoint**: `curl -F video=@ok.mp4` chega ao `projects` sem o ficheiro ficar em memória.

---

## Phase 3: User Story 1 — Submeter um vídeo (P1) 🎯 MVP

**Independent Test**: Cenário 1 do [quickstart.md](./quickstart.md).

- [X] T005 [US1] `projects/routes/videos.js`: `POST /:user/:project/videos` com
  `checkSharePermission` e `requireEditPermission`, seguindo os passos S3 de [research.md](./research.md):
  perfil → tamanho declarado → `upload_id` → receção → `probe` → `validateInput` →
  `validateProfile` → `storage.uploadFile(video_src)` → projeto ainda existe → criar `videoAsset` →
  `201`. Requisitos: SUBMIT-001, SUBMIT-006, SUBMIT-007, SUBMIT-010, COM-003 a COM-006.
- [X] T006 [P] [US1] `frontend/lib/videos.ts`: `uploadVideo({uid, pid, token, file, uploadId,
  onProgress, signal, ownerId, shareId})` com `FormData` (`video`), cabeçalhos `X-Upload-Id` e
  `X-Video-Size` e `onUploadProgress`; `lib/mutations/videos.ts`: `useUploadVideo`, que invalida
  `["videos", pid]`. Requisito: SUBMIT-004.
- [X] T007 [P] [US1] Criar `frontend/components/video-submission-area.tsx`: `react-dropzone` com
  `accept: {"video/mp4": [".mp4"]}`, `maxFiles: 1`, e mostra o nome e o tamanho do ficheiro
  (UC-VID-001/P3).
- [X] T008 [US1] Criar `frontend/components/project-page/add-video-dialog.tsx`, no padrão de
  `add-images-dialog.tsx`:
  - seleção, nome e tamanho, Confirmar;
  - barra de progresso;
  - mensagem final “Vídeo submetido” e entrada na lista (`project-video-list` do 000);
  - erros com `getErrorMessage` e `upgrade-dialog` quando `upgrade: true`.
  Requisitos: SUBMIT-001, SUBMIT-004, COM-007, COM-024.
- [X] T009 [US1] `frontend/app/dashboard/[pid]/page.tsx`: botão “Adicionar vídeo” só com permissão de
  edição. Requisito: COM-001.
- [X] T010 [P] [US1] `projects/tests/submit.test.js`:
  - um vídeo válido gera `201`, o `videoAsset` e o objeto;
  - dois vídeos dão duas entradas;
  - o contador de operações do Free não muda (`users` real ou *mock* que falha se for chamado);
  - um envio cortado a 90% (*socket* destruído) não deixa entrada nem ficheiro em
    `tmp/uploads`.
  Requisitos: SUBMIT-001, SUBMIT-006, SUBMIT-007, SUBMIT-010.

## Phase 4: User Story 2 — Rejeitar cedo (P1)

**Independent Test**: Cenário 2 do quickstart.

- [X] T011 [US2] No `add-video-dialog.tsx`, comparar `file.size` com `useVideoLimits().limits.maxBytes`
  antes de enviar e mostrar o limite sem iniciar o pedido. Requisitos: SUBMIT-003, COM-004.
- [X] T012 [US2] No `projects` (T005), recusar com `413` antes de ler o corpo se `X-Video-Size` ou
  `Content-Length` excederem `maxBytes + 1 MB`. Tratar o `LIMIT_FILE_SIZE` do Multer como `413`.
  Requisito: SUBMIT-003.
- [X] T013 [P] [US2] Em `submit.test.js`:
  - 150 MB Free → `413` sem bytes gravados em disco;
  - H.265 → `415`;
  - `.mp4` com WebM → `415`;
  - 61 s → `422`;
  - 4K Free → `422`;
  - anónimo → `401`;
  - *link* “ver” → `403`.
  Requisitos: SUBMIT-003, COM-001, COM-003 a COM-006.

## Phase 5: User Story 3 — Cancelar e repetir (P2)

**Independent Test**: Cenário 3 do quickstart.

- [X] T014 [US3] No `add-video-dialog.tsx`:
  - botão Cancelar durante o envio (`AbortController.abort()`);
  - em erro de rede, estado “falhado” com o botão “Tentar novamente”, que reutiliza o mesmo `uploadId`
    (gerado com `crypto.randomUUID()` na seleção);
  - nova seleção → novo `uploadId`.
  Requisitos: SUBMIT-005, SUBMIT-008, SUBMIT-009.
- [X] T015 [US3] No `projects` (T005):
  - se `upload_id` já existir no projeto, responder `200` com o vídeo existente e descartar o
    ficheiro;
  - tratar o erro de chave duplicada no `insert` (corrida entre duas repetições) da mesma forma;
  - projeto removido → apagar o objeto e responder `410`.
  Requisitos: SUBMIT-009, UC-VID-001/E5.
- [X] T016 [P] [US3] Em `submit.test.js`:
  - repetição com o mesmo `X-Upload-Id` → 1 entrada;
  - duas repetições simultâneas → 1 entrada;
  - pedido abortado → sem entrada nem objeto;
  - projeto removido a meio → `410` sem objeto.
  Requisitos: SUBMIT-005, SUBMIT-008, SUBMIT-009.

## Phase 6: User Story 4 — Projeto a partir de um vídeo (P3)

**Independent Test**: Cenário 4 do quickstart.

- [X] T017 [US4] Garantir que a página do projeto, a pré-visualização e a lista de imagens funcionam
  com `imgs = []` (`frontend/app/dashboard/[pid]/page.tsx`,
  `components/project-page/project-image-list.tsx`) e mostram a área de vídeos.
- [X] T018 [US4] `projects/routes/videos.js`: `POST /:user/video-project` (research S4). Cria o
  `project` com os mesmos valores de `POST /:user` (ver `projects/controllers/project.js`) só depois
  da validação e do carregamento; se o `videoAsset` falhar, apaga o projeto e o objeto. Requisito:
  SUBMIT-002.
- [X] T019 [US4] `frontend/components/dashboard-sidebar/new-project-dialog.tsx`: separador
  “Imagens | Vídeo”. No separador Vídeo, usar `video-submission-area` e
  `useCreateProjectWithVideo`, e retirar a obrigatoriedade de imagem (linha ≈102). Se o vídeo for
  recusado, mostrar a mensagem e não criar o projeto. Requisito: SUBMIT-002.
- [X] T020 [P] [US4] Em `submit.test.js`: projeto com um vídeo válido → projeto e vídeo; vídeo
  inválido → nenhum projeto (`Project.countDocuments` igual). Requisito: SUBMIT-002.

## Phase 7: Polish

- [X] T021 Medir a validação de um MP4 de 500 MB (tempo entre o fim da receção e a resposta) e
  registar o valor (COM-036).
- [X] T022 Verificar com `docker stats` que a memória do `api_gateway` e do `projects` não sobe com o
  tamanho do ficheiro (D5).
- [X] T023 Verificar que `POST /:user/:project/img` e `addProjectImages` continuam iguais (COM-046).

## Dependencies & Execution Order

- 000 Phase 2 → T003, T004 → US1 → US2 → US3 → US4 → Polish.
- T006 e T007 podem avançar em paralelo com T005.
- Os specs 002 a 005 precisam de US1 concluída (vídeos no projeto).

## Notas de implementação (2026-10-20)

- **T021**: validação de um MP4 de 469 MB no `projects` em 0,69 a 0,83 s (ver as notas do
  `000-video-common/tasks.md`, T061).
- **T023**: `POST /:user/:project/img` e `addProjectImages` sem alterações em relação ao `main`.
- **Testes**: `projects/tests/submit.test.js` e `specs/001-video-submit/e2e.sh` (29/29 pelo Nginx).
- **T022** (2026-10-20): envio de 115 MB pelo Nginx. A primeira medição mostrou o `api_gateway` a subir
  ~164 MiB: o `follow-redirects` do axios guardava o corpo em memória. Corrigido com `maxRedirects: 0`
  no gateway e no `projects/video/storage.js`. Depois da correção, RSS dos processos `node`:
  `api_gateway` 108 → 122 MiB, `projects` 135 → 142 MiB (o `docker stats` inclui a cache de disco do
  ficheiro temporário).
