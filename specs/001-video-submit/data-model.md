# Data Model: Submeter vídeo a um projeto

Usa o `videoAsset` definido em [000-video-common/data-model.md](../000-video-common/data-model.md),
incluindo o campo `thumbnail_key` (D16 do 000).

| Campo | Valor na submissão |
|---|---|
| `origin` | `"upload"` |
| `kind` | `"video"` |
| `created_by` | Chamador (`X-Caller-Id`) |
| `owner_id` | Dono do projeto |
| `name` | Nome do ficheiro; se existir, acrescenta ` (n)` antes da extensão |
| `storage_key` | `<projectId>/video_src/<uuid>.mp4` |
| `thumbnail_key` | `<projectId>/video_thumb/<uuid>.jpg`; `null` se a geração falhou (SUBMIT-013) |
| `upload_id` | `X-Upload-Id` (UUID v4) |
| `sha256` | Calculado durante a receção |
| `source_video_id`, `source_task_id` | `null` |
| Metadados técnicos | Do `ffprobe` |

Estados do envio (só no cliente; o servidor não guarda envios incompletos):

```text
selecionado ──confirmar──> a enviar (n%) ──201/200──> concluído
     │                        │  └─erro de rede──> falhado ──repetir (mesmo uploadId)──> a enviar
     └─cancelar─> (nada)      └─cancelar (abort)──> cancelado
                              └─4xx de validação──> recusado (mensagem)
```
