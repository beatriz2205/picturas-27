# Contratos internos

Chamadas entre serviços dentro da rede Docker. Não são expostas pelo Nginx nem pelo API Gateway.

## `users` (quota de vídeo, D8)

`POST https://users:10001/:user/video-ops/reserve` → `200 {"reserved": true, "day": "2026-10-19", "profile": "free"}`
ou `409 {"code": "QUOTA_EXHAUSTED", "remaining": 0}`. Premium: `200 {"reserved": false, "profile": "premium"}`
(sem contador). Anónimo: `403`.

`POST https://users:10001/:user/video-ops/refund` com `{"day": "2026-10-19"}` → `200`. Idempotência
garantida pelo chamador (`quota_state` da tarefa, D7); o `users` só decrementa até 0.

`GET https://users:10001/:user/type/` (existente) → `{"type": "free" | "premium" | "anonymous"}`. É
chamado em cada aceitação de tarefa e em cada submissão (`COM-008`).

A URL base `https://users:10001/` é a mesma que o `projects` já usa (`users_ms` em
`projects/routes/projects.js:68`).

## `projects` (para os *workers*)

`GET https://projects:9001/internal/video-tasks/:task` → `{"status": "queued", "deadlineAt": null}`.
Protegido por cabeçalho `X-Internal-Token` (variável `VIDEO_INTERNAL_TOKEN`, partilhada só com os
*workers*).

## `imageStorageService`

Base: `http://img_storage:11000` (`img_storage_ms` em `projects/utils/imageStorage.js:15`).

| Rota | Uso |
|---|---|
| `POST /video/:userId/:projectId/:stage` (novo; *multipart* `file`, `diskStorage`) | Carregar original (`video_src`), resultado (`video_out`), temporário (`video_tmp`) ou *thumbnail* (`video_thumb`, só `image/jpeg`, D16). Resposta `201 {"key": "<projectId>/<stage>/<uuid>.<ext>"}` |
| `GET /image/internal/:userId/:projectId/:stage/:name?expires=<s>` (existente; novo parâmetro `expires`) | URL interno pré-assinado para os *workers* descarregarem |
| `GET /image/public/:userId/:projectId/:stage/:name?expires=900&download=<nome>` (existente; novos parâmetros) | URL para o navegador através de `/s3/` |
| `DELETE /delete/:userId/:projectId/:stage/:name` (existente) | Remover objeto |

`utils/stages.js` passa a incluir `video_src`, `video_out`, `video_tmp` e `video_thumb`. A rota
`POST /video/...` aceita `image/jpeg` (extensão `jpg`) apenas no estágio `video_thumb`.
