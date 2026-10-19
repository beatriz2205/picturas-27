# Contrato WebSocket: atualizações de tarefas de vídeo

## `projects` → `ws_queue`

```json
{ "type": "video-task", "userId": "66ab…", "projectId": "670e…", "timestamp": 1729332000000,
  "task": { /* TaskDTO, ver public-api.md */ } }
```

Publicado depois de cada transição de estado e de cada evento `progress` aceite.

## `wsGateway` → cliente

Novo ramo em `wsGateway/index.js`, antes dos testes por `messageId`:

```js
else if (msg_content.type === "video-task") {
  io.to(msg_content.userId).to(`project:${msg_content.projectId}`)
    .emit("video-task-update", msg_content.task);
}
```

Evento `video-task-update` com o `TaskDTO`. Os eventos de imagem (`process-update`, `process-error`,
`preview-ready`, `project-op`, `project-updated`) não mudam.

O evento nunca inclui URLs de armazenamento. O cliente pede o URL do resultado com
`GET .../videos/:video/url` (`COM-050`).

## Cliente

- `frontend/hooks/use-video-tasks.ts` subscreve `video-task-update` e atualiza a *cache* React Query
  `["video-tasks", projectId]`. Num estado final, invalida `["videos", projectId]` e
  `["video-limits"]`.
- Quando o *socket* volta a ligar, chama `GET .../video-tasks?status=active` para recuperar
  eventos perdidos.
