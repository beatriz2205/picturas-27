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

## Phase 8: *Thumbnails* (UC-VID-001/RN8, E6; 2026-10-21)

**Goal**: cada vídeo e cada resultado de vídeo aparece no projeto com a sua *thumbnail* gerada no
servidor (SUBMIT-011 a 013, COM-034, COM-050, COM-057; D16 do 000, S6).

**Independent Test**: submeter `ok_720p_30s.mp4` e `vertical_1080x1920.mp4` (já em `make-videos.sh`), recortar o primeiro e
detetar no segundo; cada cartão mostra a *thumbnail* certa (a deteção usa a da origem). Remover um vídeo
e verificar que a *thumbnail* desaparece do armazenamento.

### Armazenamento e modelo

- [X] T024 [P] `imageStorageService/utils/stages.js`: acrescentar `video_thumb`.
  `imageStorageService/route/video.js`: acrescentar `video_thumb` a `videoStages` e
  `"image/jpeg": "jpg"` a `extByMime`, aceitando `image/jpeg` só nesse estágio (e os tipos de vídeo
  só nos outros). Requisito: COM-057.
- [X] T025 [P] `projects/models/videoAsset.js`: campo `thumbnail_key: {type: String, default: null}`.

### Geração

- [X] T026 Criar `projects/video/thumbnail.js` com `generateThumbnail(input, durationS)` (S6):
  `ffmpeg -v error -ss <min(1, 0,1×duração)> -i <input> -frames:v 1 -vf scale=320:-2 -q:v 4 -y <tmp>.jpg`
  em `UPLOAD_TMP_DIR`, *timeout* de 5 s; devolve o caminho ou `null` sem lançar exceção. E
  `storeThumbnail(ownerId, projectId, input, durationS)`, que gera, carrega em `video_thumb` com
  `storage.uploadFile(..., "image/jpeg")`, apaga o JPEG local e devolve a chave ou `null`.
  Requisitos: SUBMIT-012, SUBMIT-013.
- [X] T027 `projects/routes/videos.js`, `POST /:user/:project/videos`: depois de `validateReceived`,
  executar `storeOriginal` e `storeThumbnail` em paralelo (`Promise.all`); gravar `thumbnail_key` no
  `VideoAsset.create`; em todos os caminhos de erro (projeto removido, `11000`, exceções) apagar também
  a *thumbnail* carregada. Requisitos: SUBMIT-011 a 013, UC-VID-001/E5.
- [X] T028 `projects/routes/videos.js`, `POST /:user/video-project`: o mesmo que T027 (S4).
- [X] T029 `projects/video/taskService.js`, conclusão de uma tarefa: para cada resultado com
  `kind: "video"`, `storeThumbnail(owner, project, storage.internalUrl(owner, key), durationS)` antes de
  criar o `videoAsset`; os resultados `detections` ficam com `thumbnail_key: null`. Uma falha não muda
  o estado da tarefa. Se a tarefa já não puder ser concluída (cancelada entretanto), apagar a
  *thumbnail*. Requisitos: COM-057, COM-047 (os *workers* não mudam).

### API

- [X] T030 `projects/video/messages.js`: `toVideoDTO` passa a `async` e devolve
  `thumbnailUrl: thumbnail_key ? await storage.publicUrl(owner, thumbnail_key) : null` (15 min, D13).
  Atualizar todos os chamadores (`GET .../videos` com `Promise.all`, `GET .../videos/:video`,
  submissão, `video-project` e respostas `200` de repetição). Requisitos: COM-050, COM-057.

### Remoção

- [X] T031 `projects/routes/videos.js`: `DELETE .../videos/:video`, `deleteProjectVideos` e a remoção
  de conta apagam também `thumbnail_key` (`storage.remove`, erros só registados). Requisito: COM-034.
- [X] T032 `projects/video/janitor.js`: apagar JPEG temporários de `UPLOAD_TMP_DIR` com mais de 24 h
  (junto com os `.part`). Requisito: COM-038.

### Vídeos já existentes

- [X] T033 Criar `projects/scripts/backfill-thumbnails.js`: para cada `videoAsset` com
  `kind: "video"` e `thumbnail_key: null`, gerar a *thumbnail* a partir do URL interno e gravar a
  chave. Idempotente; documentar a execução (`docker compose exec projects node scripts/backfill-thumbnails.js`)
  no `quickstart.md`.

### Frontend

- [X] T034 `frontend/components/project-page/project-video-list.tsx` (`VideoThumbnail`): usar só
  `thumbnailUrl` (a do vídeo ou, nas deteções, a da origem) e, sem ela ou com erro no `<img>`
  (URL expirado), o ícone genérico; retirar o fotograma gerado no navegador, que descarregava parte do
  vídeo por cartão. Refazer o pedido da lista quando um URL expira (`onError` → `invalidateQueries`).
  Trocar "miniatura" por *thumbnail* nos comentários (`project-video-list.tsx`, `lib/videos.ts`).
  Requisito: COM-057.

### Testes

- [X] T035 [P] Criar `projects/tests/thumbnail.test.js`:
  - `generateThumbnail` com `ok_720p_30s.mp4` → JPEG de 320 × 180; com `vertical_1080x1920.mp4` → 320 × 568;
    com um vídeo de 0,5 s (acrescentar `short_0_5s.mp4` a `make-videos.sh`) → JPEG; com um ficheiro inexistente → `null`.
  - Submissão (em `submit.test.js`): `201` com `thumbnailUrl`; com o `ffmpeg` forçado a falhar
    (`PATH` sem `ffmpeg` ou *mock*) → `201` com `thumbnailUrl: null` e o `sha256` igual.
  - Remoção: o *mock* de `storage.remove` recebe a chave do vídeo e a da *thumbnail*.
  - Conclusão de tarefa: resultado `video` com `thumbnail_key`; resultado `detections` sem.
- [ ] T036 Medir de novo `SUBMIT-011` com um MP4 de 500 MB (fim da transferência → resposta, agora com
  a *thumbnail*) e registar nas notas.

**Checkpoint**: os cartões de todos os vídeos e resultados mostram a *thumbnail* do servidor, sem
pedidos ao ficheiro de vídeo; o `e2e.sh` continua a passar.

---

## Dependencies & Execution Order

- 000 Phase 2 → T003, T004 → US1 → US2 → US3 → US4 → Polish.
- Phase 8: T024 e T025 → T026 → T027, T028, T029 (em paralelo) → T030 → T031 a T034; T035 e T036 no
  fim. O frontend (T034) já aceita `thumbnailUrl`, por isso pode ser feito a qualquer momento depois
  de T030.
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
- **Phase 8 (2026-10-21)**: T024 a T035 feitas. `projects` com 104/104 testes a passar (`npm test` num
  contentor com `ffmpeg` e MongoDB 4.4), incluindo `tests/thumbnail.test.js`, os novos casos de
  `submit.test.js` (320 × 180, 320 × 568, repetição, falha, projeto removido, `video-project`) e de
  `taskService.test.js` (resultados com e sem *thumbnail*). Frontend: `tsc --noEmit` sem erros. Falta
  T036 (medir 500 MB no ambiente de referência) e verificar no `docker compose` completo (cartões no
  navegador e o *backfill* sobre vídeos existentes). T032 já estava coberta: o janitor apaga qualquer
  ficheiro de `UPLOAD_TMP_DIR` com mais de 24 h.

## Revisão de estado (2026-10-23)

T036 parcial: a equipa comunicou novas medições com 490 MB, incluindo thumbnail e persistência,
mas não uma série no limite exato de 500 MiB. SUBMIT-011 não foi cumprido: após a correção, os
envios aceites demoraram 12,9 e 55,0 s; um envio válido foi recusado com 503 em 1,1 s sob carga.
O teste manual de submissão foi confirmado pela equipa. Ver [estado de validação](../validation-status.md).
