# Contrato público: vídeos e tarefas

Todas as rotas passam pelo Nginx (`/api-gateway/`) e pelo API Gateway (`/projects/...`). Exigem
`Authorization: Bearer <jwt>` (`auth.checkToken`). Em projetos partilhados, seguem a convenção
existente: o `:user` do caminho é o dono do projeto (`?owner=`/`req.params.user`) e o chamador é
enviado ao `projects` em `X-Caller-Id`. O `projects` aplica `checkSharePermission` e, nas escritas,
`requireEditPermission`.

As rotas `/:user/video-limits` e `/:user/video-notifications*` têm de ser declaradas **antes** de
`/:user/:project` em `apiGateway/routes/projects.js` e `projects/routes/projects.js`.

## Formato de erro

```json
{ "code": "VIDEO_TOO_LONG", "message": "O vídeo tem 75 s; o limite do plano Free é 60 s.",
  "limit": { "name": "duration", "value": 60, "unit": "s", "profile": "free" },
  "upgrade": true }
```

`upgrade: true` só para utilizadores Free rejeitados por quota ou limite (`COM-024`).

| `code` | HTTP | Quando |
|---|---|---|
| `AUTH_REQUIRED` | 401 | Sem sessão / anónimo (`COM-001`) |
| `EDIT_PERMISSION_REQUIRED` | 403 | Sem permissão de edição (`COM-001`) |
| `UNSUPPORTED_FORMAT` | 415 | Contentor/*codec* fora da matriz (`COM-003`, `COM-045`, `CONV-004`) |
| `CORRUPTED_FILE` | 422 | Ficheiro ilegível ou truncado (`COM-003`) |
| `VIDEO_TOO_LARGE` | 413 | `COM-004` |
| `VIDEO_TOO_LONG` | 422 | `COM-005` |
| `RESOLUTION_TOO_HIGH` | 422 | `COM-006` |
| `INVALID_PARAMS` | 400 | Parâmetros da ferramenta inválidos; `fields: {campo: mensagem}` |
| `QUOTA_EXHAUSTED` | 429 | `COM-021` |
| `ACTIVE_TASK_LIMIT` | 429 | `COM-018` |
| `DUPLICATE_TASK` | 409 | Pedido idêntico ativo; inclui `task` (`TRIM-008`) |
| `SERVICE_UNAVAILABLE` | 503 | Fila ou armazenamento indisponíveis (`COM-009`) |
| `TASK_FINAL` | 409 | Cancelar tarefa já terminada |
| `NOT_FOUND` | 404 | Vídeo, tarefa ou projeto inexistente ou sem acesso (não revela existência) |

## Limites do perfil

`GET /projects/:user/video-limits`

```json
{ "profile": "free",
  "limits": { "maxBytes": 104857600, "maxDurationS": 60, "maxWidth": 1920, "maxHeight": 1080, "maxActiveTasks": 1 },
  "remainingOperations": 3, "dailyOperations": 5, "activeTasks": 0, "tools": ["trim", "convert"] }
```

`tools` lista as ferramentas que o servidor aceita (`VIDEO_TOOLS`); o frontend só mostra essas.

`remainingOperations` e `dailyOperations` são `null` no Premium.

## Vídeos

`GET /projects/:user/:project/videos[?sourceTaskId=&sourceVideoId=]` → `200 [VideoDTO]` (originais e
resultados, mais recentes primeiro; os filtros são opcionais).

`GET /projects/:user/:project/videos/:video` → `200 VideoDTO`.

`GET /projects/:user/:project/videos/:video/url?download=1` → `200 {"url": "...", "expiresAt": "..."}`.
URL pré-assinado de 15 min através do *proxy* `/s3/`; com `download=1`, inclui
`ResponseContentDisposition=attachment; filename="<name>"` (`COM-030`, `COM-050`).

`DELETE /projects/:user/:project/videos/:video` → `204`. Apaga o objeto e a *thumbnail* no armazenamento e cancela as
tarefas ativas com esta origem (`COM-017`, `COM-034`). Exige permissão de edição.

```json
// VideoDTO
{ "id": "6710…", "kind": "video", "origin": "task", "name": "clip (1).mp4",
  "sizeBytes": 10485760, "durationS": 30.0, "width": 1280, "height": 720, "fps": 30,
  "container": "mp4", "videoCodec": "h264", "audioCodec": "aac",
  "acceptedAsInput": true, "sourceVideoId": "670f…", "sourceTaskId": "6711…",
  "thumbnailUrl": "https://…/s3/user-…/670e…/video_thumb/….jpg?X-Amz-…",
  "createdAt": "2026-10-19T10:00:00Z" }
```

As chaves de armazenamento nunca são devolvidas. `thumbnailUrl` é um URL pré-assinado de 15 min
(D13, D16), gerado em cada resposta de `GET .../videos`, `GET .../videos/:video` e da submissão; é
`null` quando o vídeo não tem *thumbnail* (resultados de deteção e falhas de geração). Nos resultados
de deteção, o cliente usa a `thumbnailUrl` do vídeo de origem (`COM-057`). O cliente volta a pedir a
lista quando o URL expira.

## Tarefas

`POST /projects/:user/:project/video-tasks`

```json
{ "tool": "trim", "videoId": "670f…", "outputName": "clip.mp4",
  "params": { "startS": 10, "endS": 40, "height": 720 } }
```

→ `202 TaskDTO` em ≤ 2 s (`COM-036`). O esquema de `params` está definido no contrato de cada
ferramenta (specs 002 a 005).

`GET /projects/:user/:project/video-tasks?status=active|final|all` → `200 [TaskDTO]` (`COM-031`).

`GET /projects/:user/:project/video-tasks/:task` → `200 TaskDTO`.

`POST /projects/:user/:project/video-tasks/:task/cancel` → `200 TaskDTO` com `status: "cancelled"`, ou
`409 TASK_FINAL` (`COM-016`). Exige permissão de edição.

```json
// TaskDTO
{ "id": "6711…", "tool": "trim", "projectId": "670e…", "status": "processing", "progress": 42,
  "sourceVideoId": "670f…", "outputName": "clip.mp4", "params": { "startS": 10, "endS": 40, "height": 720 },
  "reason": null, "resultIds": [], "startedBy": "66aa…",
  "queuedAt": "…", "startedAt": "…", "finishedAt": null }
// reason, quando existe: { "code": "timeout", "message": "Tempo máximo de processamento excedido." }
```

## Notificações pendentes

`GET /projects/:user/video-notifications` → `200 [TaskDTO + ownerId]`: tarefas iniciadas por `:user` em
estado final com `notifiedAt = null`. O `ownerId` permite abrir o projeto (pode ser de outro utilizador).

`POST /projects/:user/video-notifications/ack` com `{"taskIds": ["…"]}` → `204` (`COM-015`).
