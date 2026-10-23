# Quickstart: validar a infraestrutura comum de vídeo

## Pré-requisitos

- Docker e Docker Compose.
- Vídeos de teste gerados com `bash projects/tests/fixtures/make-videos.sh`.
- Para cenários manuais, criar três contas próprias (os emails seguintes são exemplos, não contas
  pré-carregadas): `free@test`, `free2@test` (Free) e `premium@test` (Premium), e um projeto do Premium
  partilhado com *link* “editar” e outro com *link* “ver”.

```bash
docker compose up --build -d
# aplicação em https://localhost:8080
```

Variável útil para os testes de tempo: `VIDEO_TIMEOUT_MIN_MS=60000` no `projects` reduz o tempo
mínimo para 1 min. Não usar em demonstração.

Os scripts `checkpoint.sh` e `load-test.sh` criam as suas próprias contas de teste.
Para os testes locais, instalar as dependências com `npm install` em `projects` e `users`;
os lockfiles não estão versionados. Usar Node ≥ 18.17 e Python 3.11 com FFmpeg/ffprobe.
Os testes MongoDB exigem `TEST_MONGO_URL`; sem essa variável, os cenários correspondentes são ignorados.
Para os workers, instalar os `requirements-dev.txt` de `video_trim`, `video_filter` e `video_speed`
num ambiente virtual, a partir da raiz. Estes incluem as dependências comuns, NumPy e Pillow.

Testes automáticos:

```bash
(cd projects && npm test)
(cd users && npm test)
(cd Tools && python -m pytest video_utils/tests)
```

## Cenários

Em cada cenário, registar o pedido, os estados observados, o saldo de operações e o resultado.

1. **Acesso e validação (US1)**
   - Sem sessão e com *link* “ver”: a ferramenta está indisponível e o pedido direto dá `401`/`403`.
   - Free: o vídeo de 61 s, o 4K e o H.265 são rejeitados com a mensagem do limite ou do formato e a
     sugestão de Premium.
   - Passar o Premium a Free com um vídeo de 5 min no projeto: o pedido dá `VIDEO_TOO_LONG`.
2. **Ciclo de vida (US2)**
   - Criar uma tarefa `noop`: aparece “Em fila” em ≤ 2 s, passa a “A processar” com percentagem e
     termina “Concluída”.
   - Fechar o separador a meio e reabrir: a tarefa está concluída e o resultado está na lista.
   - `sha256sum` do original antes e depois é igual.
   - `noop` com `corrupt: true`: a tarefa fica “Falhada” e não aparece nenhum resultado.
3. **Quota e tarefas ativas (US3)**
   - Free com 4 operações usadas: uma tarefa é aceite (5/5) e a seguinte é rejeitada por quota.
   - Uma tarefa que falha devolve a operação; uma tarefa cancelada também.
   - Com uma tarefa ativa no Free, a segunda é rejeitada. No Premium, a 3.ª é aceite e a 4.ª é
     rejeitada.
   - Os casos de reservas concorrentes são cobertos por `users/tests/videoOps.test.js` e
     `projects/tests/taskService.test.js` com `TEST_MONGO_URL`. O `load-test.sh` recebe um número
     de tarefas, não o argumento `concurrency`.
4. **Falhas (US4)**
   - Cancelar em fila e em processamento: a tarefa fica “Cancelada” e a operação é devolvida.
   - `noop` com `sleepS` acima do tempo máximo: “Falhada” com o motivo “Tempo máximo excedido”.
   - `docker compose restart video_noop_worker` a meio: “Falhada” com o motivo de interrupção, e as
     tarefas em fila continuam e terminam.
   - Remover o vídeo de origem com uma tarefa ativa: “Cancelada” com o motivo “vídeo de origem
     removido”.
5. **Notificações (US5)**
   - Fechar a aplicação, deixar a tarefa terminar e voltar a entrar: aparece uma notificação, uma
     única vez.
6. **Projeto (US6)**
   - Projeto com 2 imagens, 1 vídeo e `rotate`: processar dá 2 resultados de imagem.
   - Repetir o fluxo de imagem completo da baseline (carregar, ferramentas, pré-visualização,
     processar, descarregar ZIP e PDF) sem erros novos.
   - O ZIP contém `videos/`; o PDF mostra o aviso.
   - Reproduzir no Chrome e no Firefox.
   - Abrir um URL de vídeo 16 min depois: é recusado.
   - Remover o vídeo, o projeto e a conta e verificar no SeaweedFS (`/s3-console/`) que os objetos
     desapareceram.
7. **Operação (US7)**
   - `bash specs/000-video-common/load-test.sh capacity`: 5 em processamento e 1 em fila; 101 tarefas
     concluídas.
   - `docker compose logs projects | grep video-task` mostra ferramenta, duração, tempos e estado.
   - Uma hora depois de uma falha, não há objetos em `video_tmp/` dessa tarefa.
