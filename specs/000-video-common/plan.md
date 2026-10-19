# Implementation Plan: Infraestrutura comum de vídeo

**Branch**: `000-video-common` | **Date**: 2026-10-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/000-video-common/spec.md`

## Summary

Acrescentar ao PictuRAS o suporte partilhado por todas as ferramentas de vídeo:
- modelos `videoAsset` e `videoTask` no serviço `projects`;
- validação com `ffprobe` contra a matriz de formatos e os limites por perfil;
- API pública de vídeos e tarefas;
- quota atómica no `users`;
- filas RabbitMQ com prioridade e `ack` manual;
- biblioteca Python `video_utils` para os *workers*;
- eventos de progresso pelo `wsGateway`;
- cancelamento, *timeout*, limpeza e retenção.

A interface tem uma área de vídeos no projeto, um painel de tarefas e notificações. Para validar a
cadeia antes das ferramentas reais, há um *worker* de teste `video_noop`.

## Technical Context

**Language/Version**: Node.js (imagem `node`, CommonJS) nos serviços; TypeScript/Next.js 15 no
frontend; Python 3.11 nos *workers*

**Primary Dependencies**:
- Node: Express, Mongoose, Multer, Axios, amqplib, Socket.IO, aws-sdk v2 (`imageStorageService`).
- Python: pika (já em `Tools/utils`), requests.
- Ferramentas: FFmpeg/ffprobe (apt `ffmpeg` nas imagens `projects` e `video_*`).

**Storage**: MongoDB 4.4 (`projects_mongoDB`, `users_mongoDB`); SeaweedFS S3 através do
`imageStorageService` (*stages* `video_src`, `video_out`, `video_tmp`); disco local temporário
(`/app/images/tmp/uploads` no `projects`, `/tmp/video/<taskId>` nos *workers*)

**Testing**: `node --test` com `mongodb-memory-server` (dev) nos serviços Node; `pytest` nos *workers*;
cenários de integração do [quickstart.md](./quickstart.md) com `docker compose`

**Target Platform**: Linux, Docker Compose, acesso HTTPS pelo Nginx

**Project Type**: Aplicação web distribuída (Next.js + microsserviços Node + *workers* Python)

**Performance Goals**:
- aceitação de pedido ≤ 2 s;
- validação de um vídeo de 500 MB ≤ 5 s após a receção;
- progresso a cada ≤ 5 s;
- 5 tarefas em simultâneo e 100 em fila.

**Constraints**:
- matriz de formatos de RNG-02;
- limites de RNG-03;
- quota de RNG-04 partilhada com as imagens;
- sem repetição automática;
- temporários ≤ 1 h;
- original imutável;
- zero regressões nas ferramentas de imagem.

**Scale/Scope**: MVP da Fase 1, um ambiente `docker compose`, 4 ferramentas de vídeo mais o *worker*
de teste

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Architecture Integrity — PASS.**
  - O frontend só fala com o API Gateway.
  - O `projects` é o único dono do estado das tarefas (D4).
  - Os *workers* só falam com RabbitMQ, `imageStorageService` e uma rota interna do `projects`
    protegida por *token*.
  - Nenhuma porta nova é exposta no *host*.
- **II. Security and Privacy — PASS.**
  - JWT no gateway e permissões de projeto no `projects` (`checkSharePermission`,
    `requireEditPermission`).
  - URLs pré-assinados de 15 min; chaves de armazenamento nunca expostas.
  - `VIDEO_INTERNAL_TOKEN` em variável de ambiente.
  - Eliminação de dados na remoção da conta (`COM-035`).
- **III. Evidence-Driven Delivery — PASS.**
  - Cada tarefa referencia `REQ-VID-*`.
  - Testes `node --test` e `pytest` acrescentados.
  - Cenários de integração no quickstart.
- **IV. Quality and Observability — PASS.**
  - Estados explícitos, motivo de falha e progresso via WebSocket.
  - Registo estruturado por tarefa (`COM-048`) no `stdout`, recolhido pelo ELK existente.
- **V. Simple, Sustainable Evolution — PASS.**
  - Reutiliza serviços, filas e padrões existentes; sem serviço novo.
  - As rotas e os eventos de imagem não mudam.

## Project Structure

### Documentation (this feature)

```text
specs/000-video-common/
├── plan.md
├── research.md          # D1–D15
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── public-api.md
│   ├── internal-api.md
│   ├── worker-messages.md
│   └── ws-events.md
├── checklists/requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
nginx/nginx.conf                         # client_max_body_size na rota de upload de vídeo
docker-compose.yaml                      # video_noop_worker, variáveis, réplicas, volumes
rabbitMQ/definitions.json                # video_*_queue (prioridade), video_events_queue, exchange video_cancel

apiGateway/routes/videos.js              # NOVO: proxy de /projects/:user/... vídeo, tarefas, notificações, limites
apiGateway/app.js                        # montar videos.js antes de projects.js em /projects

projects/
├── Dockerfile                           # apt-get install ffmpeg
├── config/video.js                      # NOVO: limites, matriz, tempos, VIDEO_TOOLS
├── models/videoAsset.js                 # NOVO
├── models/videoTask.js                  # NOVO
├── video/
│   ├── probe.js                         # NOVO: ffprobe → metadados; validateInput(meta, profile)
│   ├── limits.js                        # NOVO: limites, resoluções permitidas (COM-010)
│   ├── errors.js                        # NOVO: VideoError(code, http, message, limit, upgrade)
│   ├── quota.js                         # NOVO: reserve/refund no users
│   ├── taskService.js                   # NOVO: aceitar, transitar, cancelar, publicar (D7, D9)
│   ├── events.js                        # NOVO: consumidor de video_events_queue
│   ├── messages.js                      # NOVO: contrato de mensagens e textos por código
│   ├── storage.js                       # NOVO: upload em stream, URLs, delete
│   ├── watchdog.js                      # NOVO: timeout (D11)
│   ├── janitor.js                       # NOVO: limpeza (D11)
│   └── tools/noop.js                    # NOVO: validador do worker de teste
├── routes/videos.js                     # NOVO: rotas públicas e /internal
├── routes/projects.js                   # remoção de projeto e conta apagam vídeos (COM-034, COM-035)
├── utils/project_msg.js                 # send_video_task, send_video_ws, send_video_cancel
├── app.js                               # montar routes/videos.js antes do router de projetos; arrancar consumidor, watchdog, janitor
└── tests/                               # NOVO: *.test.js

users/routes/users.js                    # POST /:user/video-ops/reserve | refund
users/tests/videoOps.test.js             # NOVO

imageStorageService/
├── route/video.js                       # NOVO: upload diskStorage + stream
├── services/uploadVideo.js              # NOVO
├── route/images.js, services/getPresignedUrl.js   # parâmetros expires e download
└── utils/stages.js                      # + video_src, video_out, video_tmp

wsGateway/index.js                       # ramo type === "video-task"

Tools/
├── video_utils/                         # NOVO: worker.py, messages.py, ffmpeg.py, storage.py, progress.py, tests/
└── video_noop/                          # NOVO: worker de teste (copia a entrada)

frontend/
├── lib/videos.ts                        # NOVO: chamadas à API
├── lib/queries/videos.ts                # NOVO: useVideos, useVideoTasks, useVideoLimits
├── lib/mutations/videos.ts              # NOVO: createTask, cancelTask, deleteVideo, ackNotifications
├── lib/error-messages.ts                # códigos de erro de vídeo
├── hooks/use-video-tasks.ts             # NOVO: socket video-task-update
├── components/project-page/
│   ├── project-video-list.tsx           # NOVO: lista de vídeos e resultados (COM-002)
│   ├── video-player.tsx                 # NOVO: reprodução e descarga (COM-030)
│   ├── video-task-panel.tsx             # NOVO: tarefas, progresso, cancelar, motivo
│   └── video-tool-menu.tsx              # NOVO: ponto de entrada das ferramentas (preenchido por 002–005)
├── components/video-notifications.tsx   # NOVO: notificações pendentes (COM-015)
├── components/upgrade-dialog.tsx        # reutilizado para COM-024
└── app/dashboard/[pid]/page.tsx         # integrar área de vídeos e painel de tarefas
```

**Structure Decision**: Estender os serviços existentes. As rotas novas ficam em ficheiros próprios
(`routes/videos.js`) para não aumentar o `projects/routes/projects.js`, que já tem 2565 linhas, e para
ser fácil rever as alterações. Os *workers* seguem a convenção `Tools/<ferramenta>/` com `Dockerfile` a
partir do contexto `./Tools`.

## Fluxo de aceitação de uma tarefa (`taskService.accept`)

1. Carregar o projeto e verificar o acesso (middlewares) → `404`/`403`.
2. `GET users/:caller/type` → perfil; anónimo → `401 AUTH_REQUIRED` (`COM-001`).
3. Carregar `videoAsset` → `404`; `acceptedAsInput` falso → `415` (`CONV-004`).
4. Revalidar os limites do perfil atual sobre os metadados guardados (`COM-008`).
5. `VIDEO_TOOLS[tool].validate(params, video, profile)` → `400 INVALID_PARAMS`.
6. Pedido duplicado ativo (`dedupKey`) → `409 DUPLICATE_TASK` (só para ferramentas que o pedem).
7. Verificar a ligação ao RabbitMQ (canal aberto) e ao `imageStorageService` (`GET /health`, *timeout*
   500 ms) → `503` (`COM-009`).
8. Inserir `videoTask` com `slotKey` (D9) → `429 ACTIVE_TASK_LIMIT`.
9. Free: `reserve` → `429 QUOTA_EXHAUSTED` (apaga a tarefa).
10. Gerar URL interno de entrada e publicar `video_<tool>_queue` com prioridade. Se falhar: estorno,
    apaga a tarefa, `503`.
11. Publicar `video-task-update` e responder `202 TaskDTO`.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Nenhuma | — | — |
