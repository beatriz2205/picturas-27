# Data Model: Infraestrutura comum de vídeo

Correspondência com o modelo de domínio do relatório (Cap. 3.3): **Vídeo** → `videoAsset`
(`kind: "video"`); **Resultado de deteção** → `videoAsset` (`kind: "detections"`); **Tarefa de
processamento** → `videoTask`; **Limites do perfil** → `projects/config/video.js`; **Quota diária** →
`user.operations` no serviço `users`; **Ferramenta de vídeo** → registo `VIDEO_TOOLS` em
`projects/config/video.js`.

## videoAsset (`projects/models/videoAsset.js`)

| Campo | Tipo | Regras |
|---|---|---|
| `_id` | ObjectId | Gerado |
| `project_id` | ObjectId | Obrigatório, indexado |
| `owner_id` | ObjectId | Dono do projeto (*bucket* `user-<owner_id>`) |
| `created_by` | ObjectId | Quem submeteu ou iniciou a tarefa |
| `kind` | `"video"` \| `"detections"` | Obrigatório |
| `origin` | `"upload"` \| `"task"` | `upload` para originais (UC-VID-001); `task` para resultados |
| `name` | String | Obrigatório; único por projeto entre os `videoAsset` (ver `TRIM-007`) |
| `storage_key` | String | Chave S3 `<projectId>/video_src/<uuid>.mp4` ou `<projectId>/video_out/<uuid>.<ext>`; nunca exposta ao cliente |
| `thumbnail_key` | String \| null | Chave S3 `<projectId>/video_thumb/<uuid>.jpg` (D16); `null` em `detections` e quando a geração falhou (`COM-057`); nunca exposta ao cliente |
| `size_bytes` | Number | > 0 |
| `sha256` | String | Calculado na receção ou no fim da tarefa (verificação de `COM-026`/`COM-039`) |
| `container` | `"mp4"` \| `"webm"` \| `"json"` | |
| `video_codec` | `"h264"` \| `"vp9"` \| null | null em `detections` |
| `audio_codec` | `"aac"` \| `"opus"` \| null | null sem áudio |
| `duration_s` | Number | > 0 em `video` |
| `width`, `height` | Number | > 0 em `video` |
| `fps` | Number | > 0 em `video` |
| `source_video_id` | ObjectId \| null | Obrigatório quando `origin = task` |
| `source_task_id` | ObjectId \| null | Obrigatório quando `origin = task` |
| `upload_id` | String \| null | UUID do cliente; índice único `(project_id, upload_id)` esparso (`SUBMIT-009`) |
| `accepted_as_input` | Boolean (virtual) | `container = mp4 ∧ video_codec = h264 ∧ audio_codec ∈ {aac, null}` (`CONV-004`) |
| `createdAt`, `updatedAt` | Date | `timestamps: true` |

Índices: `{project_id: 1, createdAt: -1}`, `{project_id: 1, upload_id: 1}` único esparso,
`{source_video_id: 1}`.

Regras:
- Um `videoAsset` com `origin = task` só é criado quando a tarefa passa a `completed`, na mesma
  operação (D7). Não existem `videoAsset` para resultados parciais (`COM-029`).
- Nenhuma operação de processamento altera um `videoAsset` existente (`COM-026`).
- A *thumbnail* é gerada antes de criar o `videoAsset` e guardada na mesma operação; uma falha na
  geração deixa `thumbnail_key: null` e não impede a criação (D16).
- A remoção de um `videoAsset` apaga o objeto e a *thumbnail* no armazenamento e cancela as tarefas ativas que o usam
  como origem (`COM-017`, `COM-034`). Os resultados derivados não são apagados em cascata: continuam a
  ser recursos do projeto, com `source_video_id` órfão, e a interface mostra "origem removida".

## videoTask (`projects/models/videoTask.js`)

| Campo | Tipo | Regras |
|---|---|---|
| `_id` | ObjectId | ID público da tarefa (`COM-011`) |
| `tool` | String | Chave de `VIDEO_TOOLS` (`trim`, `convert`, `filter`, `detect`) |
| `user_id` | ObjectId | Quem iniciou; quota e limites deste utilizador (`COM-025`) |
| `owner_id` | ObjectId | Dono do projeto |
| `project_id` | ObjectId | Indexado |
| `source_video_id` | ObjectId | `videoAsset` de entrada, indexado |
| `params` | Mixed | Validado pelo validador da ferramenta |
| `output_name` | String \| null | Nome pedido para o resultado |
| `profile` | `"free"` \| `"premium"` | Perfil no momento da aceitação |
| `priority` | Number | 10 Premium, 1 Free |
| `status` | enum | `queued`, `processing`, `completed`, `failed`, `cancelled` (`COM-012`) |
| `progress` | Number | 0 a 100 |
| `reason_code` | String \| null | Obrigatório em `failed` e `cancelled` (`COM-020`) |
| `reason_message` | String \| null | Texto para o utilizador |
| `quota_state` | `"reserved"` \| `"consumed"` \| `"refunded"` \| `"none"` | `none` para Premium |
| `quota_day` | Date \| null | Dia da reserva (devolução no dia certo, D8) |
| `slotKey` | String \| undefined | `<user_id>:<n>` enquanto ativa; índice único esparso (D9) |
| `result_asset_ids` | [ObjectId] | Preenchido em `completed` |
| `tmp_keys` | [String] | Chaves S3 temporárias e de resultados ainda não publicados (janitor) |
| `queuedAt`, `startedAt`, `finishedAt` | Date | `COM-048` |
| `deadlineAt` | Date \| null | D11 |
| `source_duration_s` | Number | Copiado do vídeo (`COM-048`) |
| `notifiedAt` | Date \| null | D14 |
| `dedupKey` | String | `sha1(user_id, source_video_id, tool, params canónicos)`; pedidos idênticos ativos (`TRIM-008`) |

Índices: `{user_id: 1, status: 1}`, `{project_id: 1, queuedAt: -1}`, `{slotKey: 1}` único esparso,
`{finishedAt: 1}` com `expireAfterSeconds: 2592000` (30 dias, `COM-043`), `{status: 1, deadlineAt: 1}`,
`{dedupKey: 1, status: 1}`.

## Transições

```text
            ┌──────────── cancel / origem removida ───────────┐
            │                                                  ▼
 (aceitação) queued ── worker started ──> processing ── ok ──> completed
            │                                │
            │                                ├─ erro / timeout / redelivered ──> failed
            └─ falha ao publicar ──> (tarefa apagada, sem estado)      └─ cancel ──> cancelled
```

| De | Para | Efeitos |
|---|---|---|
| — | `queued` | `slotKey` atribuído, quota reservada (Free), mensagem publicada, `queuedAt` |
| `queued` | `processing` | `startedAt`, `deadlineAt` |
| `processing` | `completed` | Cria `videoAsset` de resultados, `quota_state = consumed`, `$unset slotKey`, `finishedAt`, `progress = 100` |
| `queued`/`processing` | `failed` | `reason_*`, devolução, `$unset slotKey`, `finishedAt`, apagar `tmp_keys` |
| `queued`/`processing` | `cancelled` | `reason_*`, devolução, `$unset slotKey`, `finishedAt`, mensagem `video_cancel`, apagar `tmp_keys` |

Todas as transições publicam `video-task-update` (ver `contracts/ws-events.md`).

## Configuração (`projects/config/video.js`)

```js
module.exports = {
  PROFILE_LIMITS: {
    free:    { maxBytes: 100 * 1024 ** 2, maxDurationS: 60,  maxWidth: 1920, maxHeight: 1080, maxActiveTasks: 1, dailyOps: 5 },
    premium: { maxBytes: 500 * 1024 ** 2, maxDurationS: 600, maxWidth: 3840, maxHeight: 2160, maxActiveTasks: 3, dailyOps: null },
  },
  PRESET_HEIGHTS: [2160, 1440, 1080, 720, 480, 360],
  INPUT_MATRIX: { container: "mp4", videoCodec: "h264", audioCodecs: ["aac", null] },
  TIMEOUT: { minMs: 15 * 60e3, perVideoMinuteMs: 15 * 60e3 },
  CLEANUP: { tmpAfterFinalMs: 60 * 60e3, failedUploadMs: 24 * 3600e3 },
  TASK_RETENTION_S: 30 * 24 * 3600,
  URL_EXPIRES_S: 15 * 60,
  PRIORITY: { premium: 10, free: 1 },
  VIDEO_TOOLS: {
    // preenchido por cada spec de ferramenta (002 a 005)
    // trim: { queue: "video_trim_queue", validate: require("../video/tools/trim"), outputs: ["video"] },
  },
};
```

A resolução respeita o perfil se `min(w,h) ≤ min(maxW,maxH)` e `max(w,h) ≤ max(maxW,maxH)`, o que
aceita vídeos verticais (1080 × 1920 é válido no Free).

## Quota (`users/models/user.js`, sem alteração de esquema)

`operations: [{day: Date, processed: Number}]` mantém-se. O vídeo usa os novos *endpoints* atómicos
(`contracts/internal-api.md`). `remaining_operations` continua a ser
`max(0, 5 - processed(hoje))` no Free.
