# Contrato: submissão de vídeo

Formato de erro, `VideoDTO` e códigos: [000-video-common/contracts/public-api.md](../../000-video-common/contracts/public-api.md).

## Submeter vídeo a um projeto

`POST /api-gateway/projects/:user/:project/videos[?owner=&share=]`

Cabeçalhos: `Authorization: Bearer`, `X-Upload-Id: <uuid v4>`, `X-Video-Size: <bytes>`,
`Content-Type: multipart/form-data`. Corpo: campo `video` (um ficheiro).

| Resposta | Quando |
|---|---|
| `201 VideoDTO` | Vídeo validado, guardado e associado (SUBMIT-001, SUBMIT-006), com `thumbnailUrl` ou `null` se a *thumbnail* não foi gerada (SUBMIT-012, SUBMIT-013) |
| `200 VideoDTO` | `X-Upload-Id` já usado neste projeto; devolve o vídeo existente (SUBMIT-009) |
| `400 INVALID_PARAMS` | Sem ficheiro, mais de um ficheiro ou `X-Upload-Id` inválido |
| `401 AUTH_REQUIRED` / `403 EDIT_PERMISSION_REQUIRED` | COM-001 |
| `413 VIDEO_TOO_LARGE` | Tamanho declarado ou real acima do perfil, enviado antes de ler o corpo quando possível (SUBMIT-003) |
| `415 UNSUPPORTED_FORMAT` / `422 CORRUPTED_FILE` | COM-003, COM-045 |
| `422 VIDEO_TOO_LONG` / `422 RESOLUTION_TOO_HIGH` | COM-005, COM-006 |
| `410 PROJECT_REMOVED` | Projeto removido durante o envio (UC-VID-001/E5) |
| `503 SERVICE_UNAVAILABLE` | Armazenamento indisponível (UC-VID-001/E3) |

O pedido não passa pelo `requireProjectVersion`: adicionar um vídeo não altera a cadeia de imagem nem o
`version` do projeto.

## Criar projeto com vídeo

`POST /api-gateway/projects/:user/video-project`

Corpo *multipart*: `name` (texto), `video` (ficheiro), com os mesmos cabeçalhos.

| Resposta | Quando |
|---|---|
| `201 {"project": {"_id": "…", "name": "…"}, "video": VideoDTO}` | SUBMIT-002 |
| Erros de validação acima | Nenhum projeto criado |

Esta rota tem de ser declarada antes de `POST /:user/:project/...` no gateway e no `projects`.
