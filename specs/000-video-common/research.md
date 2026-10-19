# Research: Infraestrutura comum de vídeo

Cada decisão indica o ponto do código da baseline que a motiva. As referências são a `main` em
2026-10-19.

## D1. Vídeos e tarefas em coleções próprias do serviço `projects`

**Decision**: Criar os modelos `videoAsset` e `videoTask` no MongoDB do `projects`, ligados ao projeto
por `project_id`. Não acrescentar vídeos a `project.imgs`.

**Rationale**:
- A cadeia de ferramentas de imagem (`POST /:user/:project/process`, `projects/routes/projects.js:1378`)
  percorre `project.imgs` e envia cada imagem a cada ferramenta. Com os vídeos fora de `imgs`, ficam
  excluídos sem alterar essa rota (`COM-032`) e sem risco de regressão (`COM-046`).
- Os modelos `process` e `result` são de imagem: `process` guarda `img_id`, `cur_pos` e `token` e é
  apagado em cada passo, e `result` não tem estado. A baseline segue a execução por projeto
  (`activeToken`, `cancelToken`, `committedToken` em `projects/models/project.js`), não por tarefa
  (ALT `RF17`).
- O `version` do projeto e o `requireProjectVersion` servem a edição colaborativa da cadeia de
  imagem. As tarefas de vídeo não alteram o projeto e não incrementam `version`.

**Alternatives considered**: Um subdocumento `videos` em `project`, rejeitado porque cada atualização de
progresso reescreveria o documento do projeto e entraria em conflito com `version`. Um novo
microsserviço `videos`, rejeitado por duplicar a autorização por projeto (`checkSharePermission`,
`requireEditPermission`) e a partilha, que já vivem no `projects`.

## D2. Um *worker* Python por ferramenta e uma biblioteca comum

**Decision**: Criar `Tools/video_trim`, `Tools/video_convert`, `Tools/video_filter` e
`Tools/video_detect`, cada um com o seu `Dockerfile` e a sua fila (`video_trim_queue`, …), e a
biblioteca `Tools/video_utils` com o contrato de mensagens, os *wrappers* de FFmpeg/ffprobe, o envio de
progresso, a verificação de cancelamento, o tempo máximo e a transferência de ficheiros.

**Rationale**:
- Segue o padrão das ferramentas de imagem (`Tools/<tool>/<tool>.py` com `ToolMSG`, uma fila por
  ferramenta), como pressupõe UC-VID-002/A2.
- A deteção precisa de `torch`/`ultralytics` (imagem pesada, como `Tools/obj_ai/Dockerfile`), enquanto
  recortar, converter e filtrar só precisam de FFmpeg. Separar permite imagens leves e réplicas
  independentes.
- Acrescentar uma ferramenta passa a ser: novo *worker*, uma entrada no registo de ferramentas do
  `projects` (`projects/config/video.js`) e um serviço no `docker-compose.yaml` (`COM-047`).

**Alternatives considered**: Um único *worker* para todas as ferramentas de vídeo, rejeitado por obrigar
a uma imagem com FFmpeg e PyTorch e por concentrar as falhas. Reutilizar as filas das ferramentas de
imagem fotograma a fotograma, rejeitado por UC-VID-004/A17 (≈ 0,3 s por fotograma só em transporte;
≈ 6 h para 10 min em 4K, acima do tempo máximo).

## D3. Filas duráveis com prioridade, `ack` manual e `prefetch=1`

**Decision**: As filas `video_*_queue` são declaradas em `rabbitMQ/definitions.json` como duráveis, com
`x-max-priority: 10`. As mensagens são persistentes, com `priority` 10 (Premium) ou 1 (Free). Os
*workers* de vídeo usam `basic_qos(prefetch_count=1)` e fazem `ack` só no fim da tarefa (sucesso ou
falha).

**Rationale**:
- Os *workers* de imagem usam `auto_ack=True` (`Tools/utils/rabbit_mq.py`). Com `auto_ack`, a mensagem
  sai da fila quando é entregue: a prioridade deixa de ter efeito, porque o *broker* entrega tudo de
  imediato, e uma queda do *worker* perde a tarefa. Assim não se cumpriam `COM-019` nem `COM-041`.
- Com `prefetch=1`, cada réplica tem no máximo uma tarefa em curso. A soma das réplicas define a
  capacidade simultânea (`COM-037`: 5 no MVP, ver D10).
- Uma mensagem reentregue (`redelivered=True`) significa que o *worker* que a recebeu caiu antes do
  `ack`. O *worker* não a processa e publica `failed` com o motivo `worker_interrupted`, porque o MVP
  não tem repetição automática (RNG-06). Se a tarefa já estiver num estado final, apenas faz `ack`.

**Alternatives considered**: Uma fila por perfil (Free/Premium) com consumo preferencial, rejeitada por
duplicar filas e porque o RabbitMQ já suporta prioridade nativa.

## D4. Eventos dos *workers* para o `projects` e do `projects` para o cliente

**Decision**: Os *workers* publicam `progress`, `completed` e `failed` na fila `video_events_queue`,
consumida pelo `projects`. O `projects` é o único que muda o estado das tarefas, e depois de cada
mudança publica na `ws_queue` uma mensagem `type: "video-task"`. O `wsGateway` emite
`video-task-update` para a sala do utilizador que iniciou a tarefa e para `project:<id>`.

**Rationale**:
- Um único dono do estado evita corridas entre *worker*, cancelamento e *timeout*. Cada transição é um
  `findOneAndUpdate` condicional ao estado atual (D7).
- O `wsGateway` já distingue mensagens por `type` (`project-op`, `project-updated` em
  `wsGateway/index.js`). Acrescenta-se um ramo sem alterar os eventos de imagem (`process-update`,
  `process-error`).
- O progresso é limitado no *worker* a no máximo 1 evento a cada 2 s e no mínimo 1 a cada 4 s, o que
  cumpre os ≤ 5 s de `COM-052` sem inundar a fila.

**Alternatives considered**: Os *workers* escreverem diretamente no MongoDB, rejeitado porque viola a
separação de responsabilidades (Constituição, princípio I). *Polling* no cliente, mantido apenas como
recurso quando o *socket* cai.

## D5. Transferência de vídeos por disco, em *streaming*

**Decision**:
- Nginx: `client_max_body_size 510m` só na rota de carregamento de vídeo.
- API Gateway: a rota de carregamento de vídeo não usa o `multer.memoryStorage()` (`apiGateway/routes/projects.js:23`).
  Reencaminha o pedido em *stream* para o `projects` (`axios` com `maxBodyLength: Infinity`).
- `projects`: `multer.diskStorage` em `/app/images/tmp/uploads`, com `limits.fileSize` igual ao limite
  do perfil. Valida com `ffprobe` e envia o ficheiro ao `imageStorageService` em *stream*.
- `imageStorageService`: nova rota `POST /video/:userId/:projectId/:stage` com `diskStorage` e
  `s3.upload` sobre `fs.createReadStream` (*multipart* gerido pelo SDK).
- *Workers*: descarregam a entrada por URL interno pré-assinado e carregam o resultado na mesma rota
  do `imageStorageService`.

**Rationale**: Os três saltos usam hoje `multer.memoryStorage()` (gateway, `projects:55`,
`imageStorageService/route/upload.js:6`) e o Nginx não define `client_max_body_size` (por omissão,
1 MB). Um vídeo Premium de 500 MB ficaria em memória três vezes. Isto aparece no Cap. 2 como risco
da Equipa de Desenvolvimento.

**Alternatives considered**: Carregamento direto do navegador para o SeaweedFS com URL pré-assinado
`PUT`, rejeitado no MVP porque a validação por conteúdo (`COM-003`) teria de ser feita depois do
carregamento e porque o *proxy* `/s3/` está pensado para leituras.

## D6. Validação de vídeo com `ffprobe` no `projects`

**Decision**: Instalar `ffmpeg` na imagem do `projects` e validar com
`ffprobe -v error -print_format json -show_format -show_streams`:
- contentor `mov,mp4,m4a,3gp,3g2,mj2` com `major_brand` MP4;
- exatamente uma faixa de vídeo `h264`;
- zero ou uma faixa de áudio `aac`;
- `duration`, `width`, `height` e `size` dentro dos limites;
- leitura completa sem erros, verificada com `ffprobe -count_packets` sobre a faixa de vídeo.

**Rationale**: `COM-003` exige validação pelo conteúdo. O `ffprobe` lê o cabeçalho e os pacotes sem
descodificar, por isso um ficheiro de 500 MB valida-se em poucos segundos (`COM-036`: ≤ 5 s, a confirmar
na medição).

**Alternatives considered**: Validar no *worker*, rejeitado porque a submissão (UC-VID-001) tem de
recusar o ficheiro antes de o associar ao projeto. Bibliotecas JS de leitura de MP4 (`mp4box`),
rejeitadas porque não detetam ficheiros truncados com a mesma fiabilidade.

## D7. Transições de estado atómicas e idempotentes

**Decision**: As transições são feitas com
`VideoTask.findOneAndUpdate({_id, status: {$in: from}}, {$set: {status: to, ...}})`. Transições
válidas:

```text
queued     -> processing | cancelled | failed
processing -> completed  | cancelled | failed
```

Se o `findOneAndUpdate` não encontrar o documento, a transição perdeu a corrida. O evento é ignorado e,
se trouxer ficheiros, estes são apagados.

**Rationale**: Cancelamento, *timeout*, remoção do vídeo e eventos do *worker* podem chegar ao mesmo
tempo. A condição sobre o estado garante que um estado final não muda (`COM-012`) e que a devolução
acontece uma só vez.

## D8. Quota de vídeo atómica no serviço `users`

**Decision**: Novos *endpoints* internos no `users`:
- `POST /:user/video-ops/reserve` → `{reserved: true, day}` ou `409 QUOTA_EXHAUSTED`;
- `POST /:user/video-ops/refund` com `{day}`.

A reserva é feita com uma única atualização condicional. Para Free:
`updateOne({_id, operations: {$elemMatch: {day, processed: {$lt: 5}}}}, {$inc: {"operations.$.processed": 1}})`,
mais um `updateOne` com `{"operations.day": {$ne: day}}` e `$push` para o primeiro uso do dia. Premium
devolve sempre `reserved: true` sem incrementar. A "consolidação" (`COM-022`) não muda o contador:
marca `quotaState: "consumed"` na tarefa. A devolução decrementa o dia da reserva, sem ir abaixo de 0.

**Rationale**:
- O `GET /:user/process/:advanced_tools` e o `PUT` (`users/routes/users.js:131`, `:265`) leem o
  utilizador, alteram o *array* em memória e gravam. Dois pedidos simultâneos podem ler o mesmo saldo,
  o que viola `COM-051`.
- O *refund* existente (`:317`) usa sempre o dia atual. Uma tarefa reservada antes da meia-noite e
  falhada depois devolveria o dia errado.
- O contador continua a ser `operations[].processed`, por isso o limite de 5 fica partilhado com as
  ferramentas avançadas de imagem (`COM-021`), e o `remaining_operations` que o frontend já mostra
  (`operations-counter.tsx`) inclui o vídeo sem alterações (`COM-023`).

**Alternatives considered**: Uma coleção de reservas no `projects`, rejeitada porque separaria o saldo
de vídeo do saldo de imagem.

## D9. Limite de tarefas ativas com chave única

**Decision**: Cada tarefa ativa tem `slotKey = "<userId>:<n>"`, com `n` entre 0 e `limite - 1`, e um
índice único esparso em `slotKey`. Na criação, tenta-se inserir com `n = 0, 1, …`. Um erro de chave
duplicada passa ao `n` seguinte, e se todos falharem o pedido é rejeitado com `ACTIVE_TASK_LIMIT`. Num
estado final faz-se `$unset: {slotKey: ""}`.

**Rationale**: Contar as tarefas ativas e depois inserir não é atómico (`COM-051`). O MongoDB 4.4 do
`projects_mongoDB` não suporta `$in` em `partialFilterExpression`, mas suporta índices esparsos únicos.

**Ordem na aceitação**:
1. Validações (perfil, vídeo, parâmetros).
2. Disponibilidade do RabbitMQ e do armazenamento (`COM-009`).
3. Inserir a tarefa com `slotKey` (`ACTIVE_TASK_LIMIT`).
4. Reservar a quota (`QUOTA_EXHAUSTED` apaga a tarefa).
5. Publicar na fila (se falhar, devolve e apaga a tarefa, `SERVICE_UNAVAILABLE`).
6. Responder `202`.

## D10. Capacidade e réplicas

**Decision**: No `docker-compose.yaml`, `video_trim_worker` com 2 réplicas e `video_convert_worker`,
`video_filter_worker` e `video_detect_worker` com 1 cada (`deploy.replicas`), o que dá 5 tarefas em
simultâneo (`COM-037`, UC-VID-004/A10). Limites de 1 vCPU e 2 GB por réplica (`deploy.resources`),
como o ambiente de referência.

## D11. Tempo máximo, recuperação e limpeza

**Decision**:
- `deadlineAt = startedAt + max(15 min, 15 min × duração_s / 60)`, calculado quando a tarefa passa a
  `processing`. O *worker* aplica o mesmo prazo ao processo FFmpeg (`subprocess` com *timeout*).
- O *watchdog* do `projects` (`setInterval` de 60 s) passa a `failed`, com motivo `timeout`, as
  tarefas com `deadlineAt` ultrapassado e publica o cancelamento ao *worker*.
- No arranque, o `projects` não muda as tarefas `processing`: os *workers* podem continuar vivos. Se a
  mensagem voltar a ser entregue (`redelivered`), o *worker* falha a tarefa (D3). O *watchdog* trata as
  restantes. Se for o *worker* a cair, a mensagem volta à fila e cai na regra de D3.
- O janitor do `projects` (`setInterval` de 10 min) apaga:
  - os objetos `video_tmp/` de tarefas em estado final há mais de 1 h;
  - os ficheiros de `/app/images/tmp/uploads` com mais de 24 h;
  - os resultados carregados de tarefas que não terminaram em `completed`.
- Os *workers* apagam sempre o diretório temporário da tarefa (`finally`).
- Os registos de `videoTask` têm um índice TTL de 30 dias sobre `finishedAt` (`COM-043`). Os
  `videoAsset` não expiram.

**Rationale**: RNG-06 e `COM-038` a `COM-041`. Com o TTL, a remoção fica a cargo do MongoDB, sem
código.

## D12. Cancelamento

**Decision**: `POST .../video-tasks/:task/cancel` passa a tarefa a `cancelled` (D7), devolve e publica
`{taskId}` no *exchange fanout* `video_cancel`. Cada *worker* tem uma fila exclusiva ligada a esse
*exchange*: se a tarefa em curso for a cancelada, mata o FFmpeg ou interrompe a inferência e apaga
os temporários. Uma tarefa ainda em fila é descartada pelo *worker* quando chega, depois de consultar
o estado com `GET /internal/video-tasks/:id`.

**Rationale**: Cancelamento imediato do ponto de vista do utilizador e *best effort* no *worker*
(UC-VID-005/Q6). Como o estado já está em `cancelled`, um `completed` que chegue depois é ignorado e os
ficheiros são apagados (D7).

## D13. URLs de reprodução e descarga

**Decision**: Os URLs de vídeo e resultados são gerados a pedido (`GET .../videos/:video/url`) com
validade de 15 min, através do `getPublicUrl` do `imageStorageService`, que passa a aceitar
`expires`. A validade de 60 min das imagens mantém-se.

**Rationale**: `COM-050` (15 min) e UC-VID-004/A11. O *proxy* `/s3/` do Nginx já suporta pedidos
`Range`, que o elemento `<video>` usa.

## D14. Notificações pendentes

**Decision**: `videoTask.notifiedAt` fica a `null` até o cliente confirmar que mostrou a notificação.
O frontend, ao arrancar, chama `GET /projects/:user/video-notifications` (tarefas do utilizador em
estado final com `notifiedAt: null`), mostra-as e confirma com
`POST /projects/:user/video-notifications/ack` e `{taskIds}`.

**Rationale**: O `wsGateway` não guarda eventos (UC-VID-002/A5). `COM-015` exige a notificação
pendente.

## D15. Testes

**Decision**:
- Serviços Node: `node --test` (embutido; a imagem `node` é a mais recente) com testes em
  `<serviço>/tests/*.test.js`, `mongodb-memory-server` para os modelos e *mocks* de `axios`.
- *Workers*: `pytest` em `Tools/video_utils/tests` e `Tools/video_*/tests`, com vídeos de teste gerados
  por `ffmpeg -f lavfi` (sem ficheiros binários no repositório).
- Integração: o *script* `specs/000-video-common/quickstart.md` com `docker compose`.

**Rationale**: O repositório não tem testes nem *scripts* `test`. A Constituição (princípio III) exige
validação reproduzível. `node --test` evita dependências novas no *runtime*.
