---
description: "Task list: infraestrutura comum de vídeo"
---

# Tasks: Infraestrutura comum de vídeo

**Input**: `/specs/000-video-common/` (spec, plan, research D1–D15, data-model, contracts, quickstart)

**Tests**: Incluídos. A Constituição (princípio III) exige validação reproduzível, e os critérios de
aceitação do Cap. 5 são testes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode ser feita em paralelo (ficheiros diferentes, sem dependências pendentes)
- **[USn]**: *user story* do [spec.md](./spec.md)
- Cada tarefa indica os requisitos que implementa.

---

## Phase 1: Setup

- [ ] T001 [P] Criar `projects/config/video.js` com `PROFILE_LIMITS`, `PRESET_HEIGHTS`, `INPUT_MATRIX`,
  `TIMEOUT`, `CLEANUP`, `TASK_RETENTION_S`, `URL_EXPIRES_S`, `PRIORITY` e `VIDEO_TOOLS` vazio
  (data-model.md). Requisitos: RNG-02 a RNG-06.
- [ ] T002 [P] Acrescentar a `rabbitMQ/definitions.json`:
  - as filas duráveis `video_noop_queue`, `video_trim_queue`, `video_convert_queue`,
    `video_filter_queue` e `video_detect_queue`, com `arguments: {"x-max-priority": 10}`;
  - a fila durável `video_events_queue`;
  - o *exchange fanout* `video_cancel`;
  - os *bindings* das filas ao *exchange* `picturas`, como as existentes.
  (D3, D12)
- [ ] T003 [P] `projects/Dockerfile`: instalar `ffmpeg` (`apt-get update && apt-get install -y
  --no-install-recommends ffmpeg`). (D6)
- [ ] T004 [P] `imageStorageService/utils/stages.js`: acrescentar `video_src`, `video_out`, `video_tmp`.
- [ ] T005 [P] Configurar testes:
  - `"test": "node --test tests/"` em `projects/package.json` e `users/package.json`;
  - `mongodb-memory-server` como `devDependency`;
  - `Tools/video_utils/requirements-dev.txt` com `pytest`.
  (D15)
- [ ] T006 [P] `docker-compose.yaml`:
  - variáveis `VIDEO_INTERNAL_TOKEN` no `projects` e nos *workers* de vídeo;
  - volume `video_tmp` para `/tmp/video` nos *workers*;
  - serviço `video_noop_worker` (contexto `./Tools`, `dockerfile: video_noop/Dockerfile`).
- [ ] T007 [P] `nginx/nginx.conf`: `location ~ ^/api-gateway/projects/[^/]+/[^/]+/videos$` com
  `client_max_body_size 510m`, `proxy_request_buffering off` e `proxy_read_timeout 600s`, e o mesmo
  `proxy_pass` e os mesmos cabeçalhos de `/api-gateway/`. Acrescentar também `/api-gateway/projects/[^/]+/video-project$`
  (spec 001). (D5)

---

## Phase 2: Foundational (bloqueia 000 US1–US7 e os specs 001–005)

### Modelos e configuração

- [ ] T008 Criar `projects/models/videoAsset.js` com os campos, os índices e o virtual
  `acceptedAsInput` do data-model.md. Requisitos: COM-026, SUBMIT-009, CONV-004.
- [ ] T009 Criar `projects/models/videoTask.js` com:
  - os campos do data-model.md;
  - o índice único esparso `slotKey`;
  - o TTL de 30 dias em `finishedAt`;
  - o índice `{status, deadlineAt}`;
  - `dedupKey`.
  Requisitos: COM-011, COM-012, COM-043, COM-048.
- [ ] T010 [P] Criar `projects/video/errors.js`: classe `VideoError(code, http, message, extra)` e
  `toResponse(err)` no formato de `contracts/public-api.md`. Requisito: COM-007.
- [ ] T011 [P] Criar `projects/video/messages.js` com:
  - os textos PT por `code` (erros de API e `reason.code` dos *workers*);
  - `buildTaskMessage(task, video, url)`;
  - `toTaskDTO(task)` e `toVideoDTO(asset)`.
  Requisito: COM-052.

### Validação

- [ ] T012 Criar `projects/video/probe.js`:
  - `probe(filePath)` executa `ffprobe -v error -print_format json -show_format -show_streams` (com
    `child_process.execFile` e *timeout* de 10 s) e devolve
    `{container, majorBrand, videoCodec, audioCodec, durationS, width, height, fps, sizeBytes}`;
  - `checkIntegrity(filePath)` executa `ffprobe -count_packets -select_streams v:0`.
  Requisito: COM-003.
- [ ] T013 Criar `projects/video/limits.js`:
  - `validateInput(meta)`: matriz de formatos, devolve `UNSUPPORTED_FORMAT` ou `CORRUPTED_FILE`;
  - `validateProfile(meta, profile)`: o primeiro limite excedido dá `VIDEO_TOO_LARGE`,
    `VIDEO_TOO_LONG` ou `RESOLUTION_TOO_HIGH`, com `limit` e `upgrade`, e aceita vídeos verticais;
  - `allowedHeights(meta, profile)` (COM-010);
  - `timeoutMs(durationS)`.
  Requisitos: COM-003 a COM-008, COM-010, COM-024, COM-040, COM-045.
- [ ] T014 [P] Criar `projects/tests/limits.test.js`:
  - cada limite de cada perfil no valor exato e 1 unidade acima;
  - H.265, MOV, MP4 sem áudio, áudio MP3 e vídeo vertical 1080 × 1920 no Free;
  - `allowedHeights` para 4K Free, 4K Premium e 720p;
  - `timeoutMs(30) = 15 min` e `timeoutMs(600) = 150 min`.
- [ ] T015 [P] Criar `projects/tests/fixtures/make-videos.sh`, que gera com `ffmpeg -f lavfi`
  (`testsrc2` + `sine`), em `projects/tests/fixtures/out/` (ignorado no git):
  - `ok_720p_30s.mp4` (H.264/AAC);
  - `ok_1080p_60s.mp4`;
  - `noaudio.mp4`;
  - `hevc.mp4`;
  - `mov.mov`;
  - `webm.webm`;
  - `fake_webm.mp4` (WebM com extensão `.mp4`);
  - `mp3audio.mp4`;
  - `truncated.mp4` (com `head -c`);
  - `long_61s.mp4`;
  - `uhd_4k.mp4`;
  - `vertical_1080x1920.mp4`.
  Requisito: COM-045.

### Quota (users)

- [ ] T016 `users/routes/users.js`: `POST /:user/video-ops/reserve` e `POST /:user/video-ops/refund`
  com as atualizações atómicas de D8 (constante `max_free_daily_op` existente). Declarar antes de
  `/:user/process/...`. Requisitos: COM-021, COM-022, COM-051.
- [ ] T017 [P] Criar `users/tests/videoOps.test.js`:
  - reserva Free até 5 e a 6.ª dá `409`;
  - 10 reservas concorrentes com 1 restante, só 1 aceite;
  - estorno no dia da reserva;
  - estorno não desce abaixo de 0;
  - Premium sem contador;
  - partilha com `PUT /:user/process/:n` (imagem).
  Requisitos: COM-021, COM-051.

### Armazenamento

- [ ] T018 Criar no `imageStorageService`:
  - `route/video.js` e `services/uploadVideo.js`: `multer.diskStorage` em `/tmp/uploads`,
    `s3.upload({Body: fs.createReadStream(path), ContentType}, {partSize: 10MB, queueSize: 4})`,
    resposta `{key}` e remoção do ficheiro local em `finally`;
  - o `app.use("/video", ...)` em `server.js`;
  - `GET /health`, que responde `200` se `s3.headBucket` ou `listBuckets` funcionar.
  Requisito: COM-009.
- [ ] T019 `imageStorageService/services/getPresignedUrl.js` e `route/images.js`: parâmetros opcionais
  `expires` (segundos) e `download` (nome, gera `ResponseContentDisposition`). Por omissão mantém-se
  60 min, sem regressão nas imagens. Requisitos: COM-030, COM-050.
- [ ] T020 Criar `projects/video/storage.js`:
  - `uploadFile(ownerId, projectId, stage, filePath, mime)`, com *stream* `form-data` e `axios` com
    `maxBodyLength: Infinity`;
  - `internalUrl(..., expiresS)` e `publicUrl(..., expiresS, downloadName)`;
  - `remove(key)`;
  - `health()`.

### Mensagens e eventos

- [ ] T021 `projects/utils/project_msg.js`:
  - `send_video_task(queue, msg, priority)` com `persistent: true` e `priority`;
  - `send_video_ws(userId, projectId, taskDTO)` com `type: "video-task"` para `ws_queue`;
  - `send_video_cancel(taskId)` para o *exchange* `video_cancel`;
  - `isConnected()`.
  Ver `projects/utils/rabbit_mq.js` para o canal. Requisitos: COM-009, COM-019.
- [ ] T022 Criar `projects/video/quota.js`: `reserve(userId)` → `{state, day}` e `refund(userId, day)`,
  que chamam o `users` com o `httpsAgent` existente (`projects/utils/httpsAgent.js`).
- [ ] T023 Criar `projects/video/taskService.js`:
  - `accept(ctx)` segue os 11 passos do plan.md;
  - `transition(taskId, from[], to, set)` com `findOneAndUpdate` condicional (D7);
  - `complete(taskId, outputs, metrics)` cria os `videoAsset` e consolida a quota;
  - `fail(taskId, code)` e `cancel(taskId, code)` estornam se `quota_state = reserved`, fazem
    `$unset slotKey`, apagam `tmp_keys` e publicam `video_cancel`;
  - `log(task)` escreve uma linha JSON com tool, duration, queueMs, processingMs e status no
    `console`.
  Requisitos: COM-011, COM-012, COM-016, COM-018, COM-020 a COM-022, COM-025, COM-026, COM-048,
  COM-051.
- [ ] T024 [P] Criar `projects/tests/taskService.test.js` (com `mongodb-memory-server` e *mocks* de
  quota e de RabbitMQ):
  - limite de tarefas ativas Free 1 e Premium 3, incluindo pedidos concorrentes;
  - transição perdida ignorada;
  - estorno único em cancelamento e falha concorrentes;
  - estado final imutável;
  - rejeição por fila indisponível sem tarefa nem reserva;
  - estorno quando a publicação falha.
  Requisitos: COM-009, COM-012, COM-018, COM-022, COM-051.
- [ ] T025 Criar `projects/video/events.js`, consumidor de `video_events_queue` com `ack` manual:
  - `started` → `processing` + `deadlineAt`;
  - `progress` → `$set progress` só se a tarefa estiver `processing` e o progresso for maior;
  - `completed` → `complete`, e se a transição falhar apaga as chaves;
  - `failed` → `fail`.
  Todos publicam `send_video_ws`. Arrancar em `projects/app.js`. Requisitos: COM-013, COM-014,
  COM-026, COM-029.
- [ ] T026 `wsGateway/index.js`: ramo `type === "video-task"` (`contracts/ws-events.md`). Requisitos:
  COM-013, COM-052.

### Rotas

- [ ] T027 Criar `projects/routes/videos.js` com as rotas de `contracts/public-api.md` (exceto o
  upload, que fica no spec 001) e `GET /internal/video-tasks/:task` com `X-Internal-Token`. Usar
  `checkSharePermission` e `requireEditPermission` (`projects/middleware/shareAuth.js`) e
  `getCallerId` (`projects/utils/caller.js`). Montar em `projects/app.js` antes de `projectsRouter`.
  Requisitos: COM-001, COM-013, COM-016, COM-025, COM-031.
- [ ] T028 Criar `apiGateway/routes/videos.js` com o *proxy* das rotas públicas. Segue o padrão de
  `apiGateway/routes/projects.js`: `auth.checkToken`, `X-Caller-Id`, `httpsAgent` e
  `forwardAxiosError`. Montar em `apiGateway/app.js` em `/projects` antes de `projectsRouter`.
  Requisitos: COM-001, COM-050.

### Worker base

- [ ] T029 Criar `Tools/video_utils/` com:
  - `messages.py`: construtores dos eventos de `contracts/worker-messages.md`;
  - `ffmpeg.py`: `probe(path)`, `run(args, on_progress, timeout_s, cancel_event)` com
    `-progress pipe:1` e progresso por `out_time_us / duração`, e
    `verify(path, expected)` (formato, resolução, duração ±0,5 s, áudio);
  - `storage.py`: `download(url, path)` em *stream* e `upload(owner, project, stage, path)`;
  - `progress.py`: limitador de 2 a 4 s;
  - `worker.py`: classe `VideoWorker(tool, handler)` com as regras 1 a 10 de `worker-messages.md`
    (pika com `prefetch=1`, consumo do *exchange* `video_cancel` numa *thread* e `ack` no `finally`);
  - `requirements.txt` com `pika==1.3.2` e `requests`.
  Requisitos: COM-013, COM-014, COM-027 a COM-029, COM-039 a COM-042, COM-052.
- [ ] T030 [P] Criar `Tools/video_utils/tests/`:
  - `test_ffmpeg.py`: `verify` aceita a saída correta e rejeita uma duração +1 s, uma resolução
    errada e áudio em falta;
  - `test_worker.py`: mensagem `redelivered` → `failed worker_interrupted`; tarefa não `queued` →
    `ack` sem eventos; cancelamento termina o processo e apaga `/tmp/video/<id>`; *timeout* →
    `failed timeout`.
- [ ] T031 Criar `Tools/video_noop/` com `video_noop.py`, que copia a entrada com
  `ffmpeg -c copy`, emite progresso e aceita `params.sleepS` para testes de tempo, e um `Dockerfile`
  (`python:3.11-slim` + `ffmpeg` + `video_utils`). Registar `noop` em `VIDEO_TOOLS` só quando
  `NODE_ENV !== "production"` (`projects/video/tools/noop.js`). Requisito: COM-047.

**Checkpoint**: Com o `video_noop`, uma tarefa criada por `curl` passa por `queued`, `processing` e
`completed` e gera um resultado no armazenamento. Os specs 001 a 005 podem começar.

---

## Phase 3: User Story 1 — Acesso e validação por perfil (P1)

**Goal**: Rejeitar acessos e vídeos fora da matriz ou dos limites, com causa e sugestão de Premium.

**Independent Test**: Cenário 1 do [quickstart.md](./quickstart.md).

- [ ] T032 [US1] Aplicar `validateProfile` com o perfil atual em `taskService.accept` (passo 4) e
  devolver `toResponse`. Requisitos: COM-004 a COM-008.
- [ ] T033 [US1] Implementar e testar `GET /projects/:user/video-limits` nos `projects/routes/videos.js`
  e no gateway (perfil, limites, operações restantes, tarefas ativas). Requisitos: COM-023, COM-018.
- [ ] T034 [P] [US1] `frontend/lib/error-messages.ts`: mensagens dos códigos de vídeo. Em erros com
  `upgrade: true`, abrir o `upgrade-dialog.tsx` existente com o limite Premium correspondente.
  Requisitos: COM-007, COM-024.
- [ ] T035 [P] [US1] Criar `projects/tests/access.test.js`:
  - anónimo → `401`;
  - convidado “ver” → `403`;
  - convidado “editar” Free num projeto Premium → limites e quota do convidado;
  - *downgrade* Premium → Free → `VIDEO_TOO_LONG`.
  Requisitos: COM-001, COM-008, COM-025.

## Phase 4: User Story 2 — Ciclo de vida de uma tarefa (P1)

**Goal**: Tarefa visível em ≤ 2 s, com progresso, e resultado publicado só depois de verificado.

**Independent Test**: Cenário 2 do quickstart com `video_noop`.

- [ ] T036 [P] [US2] Criar `frontend/lib/videos.ts`, `lib/queries/videos.ts` e `lib/mutations/videos.ts`
  (`useVideos`, `useVideo`, `useVideoUrl`, `useVideoTasks`, `useVideoLimits`, `useCreateVideoTask`,
  `useCancelVideoTask`, `useDeleteVideo`), no estilo de `lib/projects.ts` e `lib/queries/projects.ts`.
- [ ] T037 [P] [US2] Criar `frontend/hooks/use-video-tasks.ts`: usar o *socket* de `useGetSocket`
  (`frontend/lib/queries/projects.ts:61`), subscrever `video-task-update`, atualizar a *cache* e, ao
  voltar a ligar, voltar a carregar as tarefas ativas (`contracts/ws-events.md`).
- [ ] T038 [US2] Criar `frontend/components/project-page/video-task-panel.tsx` com:
  - a lista de tarefas do projeto;
  - o estado em PT (Em fila, A processar, Concluída, Falhada, Cancelada);
  - a barra de progresso (`@radix-ui/react-progress`);
  - o motivo em `failed`/`cancelled`;
  - o botão Cancelar em tarefas ativas;
  - a ligação para o resultado.
  Requisitos: COM-013, COM-020, COM-031, COM-052.
- [ ] T039 [US2] Integrar o painel de tarefas e a área de vídeos em `frontend/app/dashboard/[pid]/page.tsx`
  com a mudança imagens/vídeos (`view-toggle.tsx`/`mode-toggle.tsx`), sem alterar a vista de imagens.
- [ ] T040 [P] [US2] Criar `projects/tests/lifecycle.test.js`, de integração com RabbitMQ real
  (`docker compose up rabbitmq projects_mongoDB`) e `video_noop`:
  - aceitação ≤ 2 s;
  - progresso a cada ≤ 5 s;
  - resultado novo com `source_video_id` e `source_task_id`;
  - *hash* do original inalterado;
  - saída inválida (`video_noop` com `params.corrupt: true`) → `failed` sem `videoAsset`.
  Requisitos: COM-011 a COM-014, COM-026, COM-027, COM-029, COM-036, COM-039.

## Phase 5: User Story 3 — Quota e tarefas ativas (P1)

**Goal**: 1 operação por tarefa, com reserva, consolidação e estorno, limites de tarefas ativas e
prioridade Premium.

**Independent Test**: Cenário 3 do quickstart.

- [ ] T041 [US3] Fazer chegar o saldo ao `operations-counter.tsx` existente nas vistas de vídeo e
  mostrar “N operações restantes” em `video-tool-menu.tsx` antes de cada confirmação (Free). Invalidar
  a *cache* do utilizador em cada `video-task-update` final. Requisito: COM-023.
- [ ] T042 [US3] Criar `frontend/components/project-page/video-tool-menu.tsx`, o ponto de entrada das
  ferramentas, que os specs 002 a 005 acrescentam. Fica desativado com o motivo (sem sessão, sem
  edição, formato, limite) a partir de `acceptedAsInput` e de `video-limits`. Requisitos: COM-001,
  COM-018, CONV-004.
- [ ] T043 [P] [US3] Criar `projects/tests/priority.test.js` (integração): com o `video_noop` parado,
  publicar uma tarefa Free e depois uma Premium, arrancar o *worker* e verificar que a Premium é a
  primeira a passar a `processing`. Requisito: COM-019.

## Phase 6: User Story 4 — Cancelamento, falhas e recuperação (P2)

**Goal**: Estado final coerente em todos os cenários de falha.

**Independent Test**: Cenário 4 do quickstart.

- [ ] T044 [US4] `POST .../video-tasks/:task/cancel` → `taskService.cancel(..., "user_cancelled")`;
  `409 TASK_FINAL` para tarefas já terminadas. Requisito: COM-016.
- [ ] T045 [US4] Criar `projects/video/watchdog.js` (60 s): tarefas `processing` com
  `deadlineAt < now` → `fail("timeout")` + `send_video_cancel`. Arrancar em `app.js`. Requisito: COM-040.
- [ ] T046 [US4] `DELETE .../videos/:video` e remoção de projeto: cancelar as tarefas ativas com origem
  no vídeo ou no projeto (`source_video_removed`) antes de apagar. Requisito: COM-017.
- [ ] T047 [P] [US4] Criar `projects/tests/failures.test.js`:
  - *timeout* com `video_noop` `sleepS` e `TIMEOUT.minMs` reduzido por variável de ambiente em teste;
  - reinício do *worker* a meio → `failed worker_interrupted` com estorno;
  - tarefas `queued` mantidas depois do reinício;
  - MP4 truncado em paralelo com um válido.
  Requisitos: COM-040 a COM-042.

## Phase 7: User Story 5 — Notificações e regresso (P2)

**Goal**: Notificações pendentes e estado das tarefas depois de reabrir a aplicação.

**Independent Test**: Cenário 5 do quickstart.

- [ ] T048 [US5] Implementar `GET /projects/:user/video-notifications` e `POST .../ack` no `projects`
  e no gateway (D14). Requisito: COM-015.
- [ ] T049 [US5] Criar `frontend/components/video-notifications.tsx`. Montado no
  `app/dashboard/layout.tsx`, mostra um *toast* (`use-toast.ts`) por tarefa pendente ou recebida por
  *socket* e confirma com `ack`. Requisitos: COM-015, COM-052.

## Phase 8: User Story 6 — Vídeos e resultados no projeto (P2)

**Goal**: Ver, reproduzir, descarregar, exportar e remover vídeos sem afetar as imagens.

**Independent Test**: Cenário 6 do quickstart.

- [ ] T050 [P] [US6] Criar `frontend/components/project-page/project-video-list.tsx` com os cartões de
  vídeo (nome, duração, resolução, tamanho, formato), a indicação de “resultado de <origem>” e o menu
  com Reproduzir, Descarregar, Ferramentas e Remover. Requisitos: COM-002, COM-031.
- [ ] T051 [P] [US6] Criar `frontend/components/project-page/video-player.tsx`: `<video controls>` com
  o URL de `useVideoUrl`, que renova o URL quando expira (evento `error` → novo pedido), e botão
  Descarregar (`download=1`). Requisitos: COM-030, COM-044, COM-050.
- [ ] T052 [US6] Exportação do projeto no frontend:
  - em `downloadProjectImages` (`frontend/lib/projects.ts:388`, ZIP), acrescentar os vídeos do projeto
    na pasta `videos/`, descarregados pelo URL de descarga;
  - em `downloadProjectPdf` (`frontend/lib/projects.ts:582`), ignorar os vídeos e mostrar “Os vídeos
    não são incluídos no PDF” quando o projeto os tiver.
  Requisito: COM-033.
- [ ] T053 [US6] `projects/routes/projects.js`:
  - em `DELETE /:user/:project` (linha ≈1751), apagar os `videoAsset` e os seus objetos e cancelar as
    tarefas;
  - em `deleteProjectAndResources` (linha ≈489, usada na eliminação da conta), apagar também os
    `videoAsset`, os objetos e os `videoTask`.
  Requisitos: COM-034, COM-035.
- [ ] T054 [P] [US6] Criar `projects/tests/isolation.test.js`: num projeto com 2 imagens, 1 vídeo e
  `rotate`, o `POST /process` gera 2 resultados e o vídeo fica igual. Correr a regressão das
  ferramentas de imagem (quickstart, cenário 6). Requisitos: COM-032, COM-046.
- [ ] T055 [P] [US6] Criar `projects/tests/deletion.test.js`:
  - remover um vídeo → objeto apagado e URL dá `403`/`404`;
  - remover o projeto;
  - eliminar a conta → nenhum `videoAsset`, `videoTask` ou objeto.
  Requisitos: COM-034, COM-035.

## Phase 9: User Story 7 — Operação e manutenção (P3)

**Independent Test**: Cenário 7 do quickstart.

- [ ] T056 [US7] Criar `projects/video/janitor.js` (10 min) com as regras de limpeza de D11. Arrancar
  em `app.js`. Requisito: COM-038.
- [ ] T057 [US7] `docker-compose.yaml`: `deploy.replicas` e `deploy.resources.limits` (`cpus: "1"`,
  `memory: 2g`) dos *workers* de vídeo, como em D10. Requisito: COM-037.
- [ ] T058 [P] [US7] Criar o *script* `specs/000-video-common/load-test.sh` (`curl` em paralelo):
  - 6 tarefas de 6 utilizadores, com 5 em `processing` e 1 em `queued`;
  - 101 tarefas `noop` que terminam todas.
  Requisito: COM-037.
- [ ] T059 [P] [US7] Acrescentar ao `README.md` da raiz a secção “Vídeo” (FFmpeg nos contentores,
  variáveis, réplicas e como correr os testes e o quickstart). Requisito: COM-049.

## Phase 10: Polish

- [ ] T060 Correr `/speckit-analyze` sobre 000 a 005 e corrigir incoerências.
- [ ] T061 Medir `COM-036` (validação de 500 MB) e registar o resultado no relatório (Cap. 8/9).
- [ ] T062 Verificar que nenhuma rota, evento ou fila de imagem mudou de contrato
  (`git diff` em `projects/routes/projects.js`, `wsGateway/index.js` e `Tools/utils`).

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 → (US1 ∥ US2 ∥ US3) → (US4 ∥ US5 ∥ US6) → US7 → Polish.
- O spec 001 pode começar no *checkpoint* da Phase 2. Os specs 002 a 005 precisam também de US2 e US3
  (painel e menu de ferramentas).
- Dentro da Phase 2: T008–T013 → T023; T016 → T022 → T023; T018–T020 → T023; T021 → T023 → T025 →
  T027 → T028; T029 → T031.

## Parallel Example

```text
Pessoa A: T008, T009, T012, T013, T023 (projects: modelos, validação, taskService)
Pessoa B: T016, T017, T022 (quota users)
Pessoa C: T018, T019, T020 (armazenamento)
Pessoa D: T029, T030, T031 (worker base)
Pessoa E: T002, T006, T007, T026 (infraestrutura e wsGateway)
```

## Implementation Strategy

1. MVP técnico: Phase 1 e Phase 2, mais o *checkpoint* com `video_noop`.
2. A seguir, US1 a US3 (P1) e o spec 001 (submissão).
3. Spec 002 (recorte) sobre a infraestrutura completa; depois US4 a US6, validadas com o recorte.
4. Specs 003 a 005 em paralelo; US7 e Polish antes da entrega.
