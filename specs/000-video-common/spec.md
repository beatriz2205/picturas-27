# Feature Specification: Infraestrutura comum de vídeo

**Feature Branch**: `000-video-common`

**Created**: 2026-10-19

**Status**: Ready for implementation

**Input**: Regras transversais RNG-01 a RNG-08 (Cap. 3.4) e requisitos `REQ-VID-COM-001` a
`REQ-VID-COM-052` (Cap. 5) do relatório da Fase 1. Este spec reúne o comportamento partilhado por
UC-VID-001 a UC-VID-005: acesso, validação, limites por perfil, ciclo de vida das tarefas, quota,
notificações, resultados, limpeza, retenção e qualidade.

## Clarifications

### Session 2026-10-19

- Os valores numéricos (limites por perfil, quota, tarefas ativas, tempo máximo, retenção) são os das
  RNG do relatório e são valores de trabalho do MVP; ficam centralizados num único ficheiro de
  configuração para poderem ser alterados sem mudar código.
- Os estados são guardados em inglês (`queued`, `processing`, `completed`, `failed`, `cancelled`) e
  apresentados em português (Em fila, A processar, Concluída, Falhada, Cancelada).
- O cancelamento de uma tarefa em `processing` passa-a de imediato a `cancelled`; a interrupção do
  *worker* é *best effort*, mas nenhum resultado dessa tarefa é publicado (UC-VID-005/Q6).
- Não há repetição automática de tarefas: uma mensagem reentregue a um *worker* depois de uma queda
  termina a tarefa em `failed` (RNG-06).

### Session 2026-10-21

- Cada vídeo e cada resultado de vídeo tem uma *thumbnail* (JPEG, 320 px de largura, fotograma a 10%
  da duração, no máximo a 1 s), gerada pelo `projects` com `ffmpeg` (D16). Os resultados de deteção
  não têm *thumbnail* própria: a interface usa a do vídeo de origem. Sem *thumbnail*, a interface
  mostra um ícone genérico (COM-057, UC-VID-001/RN8).
- A *thumbnail* nunca é motivo de falha: se não for gerada, o vídeo ou o resultado é publicado na
  mesma, com `thumbnail_key: null` (UC-VID-001/E6).

## User Scenarios & Testing

### User Story 1 - Acesso e validação de vídeos por perfil (Priority: P1)

Um utilizador registado com permissão de edição num projeto só consegue usar vídeos que respeitam a
matriz de formatos e os limites do seu perfil atual. Utilizadores anónimos, sem sessão ou com *link*
“ver” não submetem nem processam vídeos.

**Why this priority**: Todas as ferramentas dependem destas validações; sem elas, um vídeo inválido
chega aos *workers* e o controlo de custos dos perfis não existe.

**Independent Test**: Chamar a validação com vídeos de teste (MP4/H.264/AAC, MP4 sem áudio,
MP4/H.265, MOV, vídeos no limite e acima do limite de cada perfil) e com utilizadores anónimo, Free,
Premium e convidado “ver”/“editar”; verificar aceitação, rejeição e mensagem.

**Acceptance Scenarios**:

1. **Given** um utilizador anónimo, sem sessão ou com *link* “ver”, **When** tenta submeter ou
   processar um vídeo, **Then** o pedido é rejeitado sem alterar o projeto nem criar tarefa (COM-001).
2. **Given** um ficheiro `.mp4` com vídeo H.265, **When** é validado, **Then** é rejeitado com
   indicação do *codec* não suportado e do formato aceite (COM-003, COM-007, COM-045).
3. **Given** um utilizador Free, **When** valida vídeos de 100 MB, 60 s e 1080p, **Then** são aceites;
   **When** valida 101 MB, 61 s ou 4K, **Then** são rejeitados com o limite excedido e o valor do
   perfil (COM-004 a COM-007).
4. **Given** um vídeo de 5 min carregado como Premium e um utilizador que passou a Free, **When** pede
   qualquer processamento, **Then** o pedido é rejeitado pela duração (COM-008).
5. **Given** um projeto partilhado com *link* “editar” e um convidado Free, **When** o convidado
   processa um vídeo do proprietário Premium, **Then** aplicam-se os limites e a quota do convidado
   (COM-025).

---

### User Story 2 - Ciclo de vida de uma tarefa de processamento (Priority: P1)

Depois de confirmar um pedido numa ferramenta de vídeo, o utilizador vê de imediato a tarefa “Em
fila”, acompanha o progresso e, no fim, encontra um novo vídeo (ou outro resultado) no projeto. O
original nunca muda.

**Why this priority**: É o percurso principal de UC-VID-002 a UC-VID-005; sem ele nenhuma ferramenta
entrega valor.

**Independent Test**: Com um *worker* de teste (`video_noop`, que copia o vídeo de entrada e emite
progresso), criar uma tarefa, observar `queued` → `processing` → `completed`, o progresso a cada ≤ 5 s
e o resultado publicado no projeto; confirmar que o *hash* do original não muda.

**Acceptance Scenarios**:

1. **Given** um pedido válido, **When** é confirmado, **Then** a resposta chega em ≤ 2 s com uma tarefa
   `queued` com ID único, utilizador, projeto, vídeo de origem e parâmetros (COM-011, COM-036).
2. **Given** uma tarefa em `processing`, **When** o utilizador está na página do projeto, **Then** vê
   o estado e a percentagem, atualizados pelo menos a cada 5 s (COM-013, COM-052).
3. **Given** uma tarefa em `processing`, **When** o utilizador fecha o navegador, **Then** a tarefa
   termina e o resultado aparece no projeto (COM-014).
4. **Given** um resultado ilegível ou com resolução ou duração diferentes das pedidas (±0,5 s),
   **When** o *worker* termina, **Then** a tarefa fica `failed` e o ficheiro não é publicado (COM-027).
5. **Given** uma tarefa concluída, **When** o utilizador consulta o projeto, **Then** o resultado é um
   recurso novo associado ao vídeo de origem e à tarefa, e o original tem o mesmo *hash* (COM-026,
   COM-039).
6. **Given** um vídeo com áudio, **When** é processado, **Then** o resultado tem áudio com
   dessincronização ≤ 40 ms; sem áudio na origem, o resultado não tem áudio (COM-028).
7. **Given** a fila de processamento ou o armazenamento indisponíveis, **When** o utilizador confirma
   um pedido, **Then** recebe “serviço temporariamente indisponível”, sem tarefa nem reserva de quota
   (COM-009).

---

### User Story 3 - Quota diária e limite de tarefas ativas (Priority: P1)

O utilizador Free gasta 1 operação por tarefa aceite, partilhada com as ferramentas avançadas de
imagem (5 por dia), e só pode ter 1 tarefa ativa; o Premium não tem limite diário, pode ter 3 tarefas
ativas e tem prioridade na fila. A operação só é efetivamente gasta se a tarefa terminar com sucesso.

**Why this priority**: É a regra de negócio que diferencia os perfis e controla o custo; erros aqui
afetam também as ferramentas de imagem existentes.

**Independent Test**: Com utilizadores Free e Premium, criar, concluir, falhar e cancelar tarefas e
verificar o saldo depois de cada passo; enviar 10 pedidos simultâneos com 1 operação restante.

**Acceptance Scenarios**:

1. **Given** um Free com 4 operações usadas, **When** submete uma deteção com duas ferramentas,
   **Then** é aceite e fica com 5 usadas; **When** submete outro pedido, **Then** é rejeitado por quota
   (COM-021).
2. **Given** um Free com 2 operações restantes, **When** submete uma tarefa, **Then** ficam 1; **When**
   a tarefa termina em `failed` ou `cancelled`, **Then** voltam a ser 2 (COM-022).
3. **Given** um Free, **When** abre uma ferramenta de vídeo, **Then** vê as operações restantes; após
   uma tarefa concluída vê menos uma (COM-023).
4. **Given** um Free rejeitado por quota ou por limite do perfil, **When** vê a mensagem, **Then** é
   sugerida a subscrição Premium com o limite correspondente (COM-024).
5. **Given** um Free com 1 tarefa ativa, **When** submete outra, **Then** é rejeitada sem tarefa nem
   reserva; **Given** um Premium com 2 ativas, **When** submete outra, **Then** é aceite (COM-018).
6. **Given** uma tarefa Free e depois uma Premium em fila com os *workers* ocupados, **When** um
   *worker* fica livre, **Then** inicia a Premium (COM-019).
7. **Given** um Free com 1 operação restante, **When** envia 10 pedidos em simultâneo, **Then** só 1 é
   aceite (COM-051).

---

### User Story 4 - Cancelamento, falhas e recuperação (Priority: P2)

O utilizador pode cancelar uma tarefa em fila ou em processamento. Falhas, *timeouts*, ficheiros
malformados e reinícios de serviços deixam sempre a tarefa num estado final coerente, com motivo
registado e operação devolvida, sem resultados parciais.

**Why this priority**: Garantia mínima de todos os casos de uso; pode ser entregue logo a seguir ao
percurso principal.

**Independent Test**: Cancelar tarefas em `queued` e `processing`; simular um *worker* bloqueado, um
MP4 truncado, a remoção do vídeo de origem e o reinício do *worker* e do serviço `projects`.

**Acceptance Scenarios**:

1. **Given** uma tarefa `queued` ou `processing`, **When** o utilizador a cancela, **Then** passa a
   `cancelled`, nada é publicado e a operação é devolvida (COM-016).
2. **Given** uma tarefa ativa, **When** o vídeo de origem ou o projeto é removido, **Then** a tarefa
   passa a `cancelled` com motivo “vídeo de origem removido” e devolução (COM-017).
3. **Given** uma tarefa terminada em `failed` ou `cancelled`, **When** se consulta o registo, **Then**
   o motivo está registado e visível ao utilizador (COM-020).
4. **Given** um *worker* bloqueado com um vídeo de 30 s, **When** passam 15 min, **Then** a tarefa fica
   `failed` por tempo máximo, com devolução, e a vaga de tarefa ativa fica livre (COM-040).
5. **Given** 1 tarefa em `processing` e 2 em `queued`, **When** o *worker* e o `projects` reiniciam,
   **Then** a primeira fica `failed` com devolução e as outras terminam `completed` (COM-041).
6. **Given** um MP4 truncado e um válido em simultâneo, **When** são processados, **Then** o primeiro
   fica `failed`, o segundo `completed` e o *worker* continua disponível (COM-042).

---

### User Story 5 - Notificações e regresso à aplicação (Priority: P2)

O utilizador pode sair durante o processamento. Quando regressa, vê o estado atual de todas as tarefas
do projeto e as notificações de tarefas terminadas enquanto esteve ausente.

**Why this priority**: Torna o processamento assíncrono utilizável; depende das US2 e US4.

**Independent Test**: Concluir uma tarefa com o utilizador desligado; ao reabrir a aplicação, verificar
a notificação pendente e a lista de tarefas.

**Acceptance Scenarios**:

1. **Given** uma tarefa terminada com o utilizador desligado, **When** o utilizador reabre a aplicação,
   **Then** vê a notificação de conclusão, falha ou cancelamento uma única vez (COM-015).
2. **Given** um utilizador que fecha e reabre a aplicação, **When** consulta o projeto, **Then** vê as
   tarefas e os resultados anteriores com o respetivo estado (COM-031).

---

### User Story 6 - Vídeos e resultados no projeto (Priority: P2)

Os vídeos e os resultados aparecem no projeto com os seus metadados, podem ser reproduzidos e
descarregados por quem tem acesso ao projeto, entram no ZIP do projeto e são removidos do
armazenamento quando o utilizador os remove, remove o projeto ou elimina a conta. As ferramentas de
imagem continuam a funcionar e ignoram os vídeos.

**Why this priority**: Fecha o ciclo de vida dos ficheiros e protege as funcionalidades existentes.

**Independent Test**: Num projeto com 2 imagens e 1 vídeo, processar a cadeia de imagem, descarregar
em ZIP e PDF, reproduzir o vídeo, remover o vídeo, remover o projeto e eliminar a conta, verificando o
armazenamento.

**Acceptance Scenarios**:

1. **Given** um vídeo no projeto, **When** o utilizador o seleciona, **Then** vê nome, duração,
   resolução, tamanho e formato (COM-002).
2. **Given** um resultado `completed`, **When** o utilizador o abre e o descarrega, **Then** o vídeo é
   reproduzido no Chrome e no Firefox atuais e o ficheiro descarregado é igual ao guardado (COM-030,
   COM-044).
3. **Given** um projeto com 2 imagens, 1 vídeo e a ferramenta `rotate`, **When** o projeto é
   processado, **Then** há 2 resultados de imagem, o vídeo não muda e não há erro (COM-032, COM-046).
4. **Given** um projeto com imagens e vídeos, **When** é descarregado em ZIP, **Then** inclui os
   vídeos; **When** em PDF, **Then** só tem imagens e é mostrado um aviso (COM-033).
5. **Given** um vídeo removido do projeto, **When** se consulta o armazenamento, **Then** o ficheiro e
   a *thumbnail* já não existem e os URLs devolvem erro (COM-034).
6. **Given** um utilizador com 2 vídeos e 1 tarefa, **When** elimina a conta, **Then** não resta
   nenhum desses ficheiros ou registos (COM-035).
7. **Given** outro utilizador ou um URL expirado (15 min), **When** tenta aceder a um vídeo, a uma
   *thumbnail* ou a um resultado, **Then** o acesso é recusado (COM-050).
8. **Given** um projeto com um vídeo submetido, um resultado de recorte e um resultado de deteção,
   **When** o utilizador abre o projeto, **Then** cada cartão tem uma *thumbnail* e a do resultado de
   deteção é a do vídeo de origem; um vídeo sem *thumbnail* mostra o ícone genérico (COM-057).

---

### User Story 7 - Operação e manutenção (Priority: P3)

A Equipa de Operações consegue arrancar o sistema com `docker compose`, diagnosticar cada tarefa pelo
seu registo, contar com a limpeza automática de temporários e acrescentar uma ferramenta de vídeo sem
alterar os serviços centrais.

**Why this priority**: Requisitos de qualidade que não bloqueiam a demonstração, mas são verificados na
avaliação.

**Independent Test**: Recriar o ambiente numa máquina limpa; executar uma tarefa por ferramenta e
consultar o registo; deixar uma tarefa falhar e verificar a limpeza após 1 h; acrescentar o *worker*
`video_noop` só com configuração.

**Acceptance Scenarios**:

1. **Given** uma tarefa terminada, **When** passa 1 h, **Then** os temporários e parciais foram
   eliminados; envios falhados em ≤ 24 h (COM-038).
2. **Given** 6 utilizadores distintos, **When** submetem 6 tarefas em simultâneo, **Then** 5 processam
   e a 6.ª fica `queued`; 101 tarefas em fila terminam todas (COM-037).
3. **Given** uma tarefa terminada, **When** se consulta o seu registo, **Then** tem ferramenta, duração
   do vídeo, tempo de fila, tempo de processamento e estado final (COM-048).
4. **Given** um vídeo e o seu resultado, **When** passam 30 dias, **Then** ambos continuam no projeto e
   o registo da tarefa é removido (COM-043).
5. **Given** a ferramenta simulada `video_noop`, **When** é acrescentada, **Then** só mudam o novo
   *worker* e a configuração (COM-047).
6. **Given** uma máquina limpa, **When** se segue a documentação, **Then** o cenário de sucesso de uma
   ferramenta de vídeo corre com `docker compose` (COM-049).

### Edge Cases

- Mudança de perfil (Premium → Free) entre a submissão e o processamento: revalidação no pedido
  (COM-008); tarefas já aceites terminam com as regras do momento da aceitação.
- Mudança de dia entre a reserva e a devolução: a devolução é feita no dia em que a operação foi reservada.
- Cancelamento concorrente com a conclusão: a primeira transição para estado final ganha; a outra é
  ignorada e, se o resultado já tiver sido carregado, é apagado.
- Mensagem do *worker* para uma tarefa já em estado final: ignorada; ficheiros associados apagados.
- Pedido duplicado por duplo clique: tratado pela ferramenta (ex.: `TRIM-008`) e pelo limite de tarefas
  ativas.
- Resultado WebM: reproduzível e descarregável, mas recusado como entrada (`CONV-004`).
- Projeto removido durante o carregamento do resultado: o resultado é apagado e a tarefa cancelada.
- URL de reprodução expirado durante a visualização: o cliente pede um novo URL.

## Requirements

### Functional Requirements

Os IDs são os do Cap. 5 do relatório, sem o prefixo `REQ-VID-`.

- **COM-001**: Só utilizadores registados com sessão ativa e permissão de edição no projeto submetem e
  processam vídeos (ALT `RNF44`; RNG-01, RNG-07).
- **COM-002**: Apresentar nome, duração (mm:ss), resolução (largura × altura em px), tamanho (MB) e
  formato (contentor e *codecs* de vídeo e de áudio) do vídeo selecionado.
- **COM-003**: Rejeitar um vídeo cujo contentor ou *codecs*, lidos do conteúdo do ficheiro, não
  pertençam à matriz de RNG-02, ou cuja faixa de vídeo não possa ser lida do primeiro ao último pacote.
- **COM-004 / 005 / 006**: Rejeitar vídeos com mais de 104 857 600 bytes (100 MB) / 60 s / lado maior
  acima de 1920 px ou lado menor acima de 1080 px (Free), ou 524 288 000 bytes (500 MB) / 10 min /
  3840 px e 2160 px (Premium) (RNG-03).
- **COM-007**: Indicar a causa específica de cada rejeição, com o limite e o valor do perfil.
- **COM-008**: Revalidar no servidor vídeo, parâmetros, limites do perfil atual e quota sempre que
  aceita uma tarefa.
- **COM-009**: Rejeitar o pedido sem tarefa nem reserva quando o armazenamento ou a fila estão
  indisponíveis.
- **COM-010**: Resolução de saída: a original ou uma predefinida inferior (2160p, 1440p, 1080p, 720p,
  480p, 360p), sem exceder a original nem o máximo do perfil, mantendo a proporção.
- **COM-011**: Registar cada tarefa com ID único, utilizador, projeto, vídeo de origem, parâmetros e
  estado.
- **COM-012**: Estados apenas `queued`, `processing`, `completed`, `failed`, `cancelled`; estados finais
  não mudam.
- **COM-013**: Apresentar estado e percentagem de progresso de cada tarefa ativa.
- **COM-014**: Continuar o processamento sem o cliente ligado.
- **COM-015**: Apresentar na interface, em ≤ 5 s após o estado final, uma notificação com a ferramenta,
  o estado final e o motivo; se o utilizador não estiver ligado, na próxima abertura da aplicação.
- **COM-016**: Cancelar tarefas em `queued` ou `processing` sem publicar resultado (ALT `RF17`).
- **COM-017**: Cancelar tarefas ativas cujo vídeo de origem ou projeto seja removido.
- **COM-018**: Rejeitar pedidos acima do limite de tarefas ativas (Free 1, Premium 3).
- **COM-019**: Iniciar tarefas Premium em fila antes das Free.
- **COM-020**: Registar o motivo de cada tarefa `failed` ou `cancelled`.
- **COM-021**: 1 operação por tarefa aceite; Free 5/dia partilhadas com ferramentas avançadas de
  imagem; Premium sem limite (ALT `RNF48`).
- **COM-022**: Devolver ao saldo diário, no dia em que foi reservada, a operação de uma tarefa que
  termine em `failed` ou `cancelled` (ALT `RNF48`). A reserva está em COM-021.
- **COM-023**: Mostrar ao Free as operações restantes antes da confirmação (ALT `RNF48`).
- **COM-024**: Sugerir Premium quando um Free é rejeitado por quota ou limite (ALT `RF64`).
- **COM-025**: Aplicar quota, limites e tarefas ativas de quem inicia a tarefa, mesmo em projeto
  partilhado (ALT `UC07`, `RF53`).
- **COM-026**: Guardar cada resultado como novo recurso do projeto associado ao vídeo de origem e à
  tarefa, sem alterar o original.
- **COM-027**: Verificar o vídeo resultante (legível, formato, resolução, duração ±0,5 s) antes de o
  publicar.
- **COM-028**: Preservar a faixa de áudio sincronizada (≤ 40 ms); sem áudio na origem, sem áudio no
  resultado.
- **COM-029**: Impedir o acesso a artefactos parciais e temporários.
- **COM-030**: Reproduzir e descarregar resultados para quem tem acesso ao projeto (ALT `RF13`).
- **COM-031**: Apresentar tarefas e resultados depois de fechar e reabrir a aplicação.
- **COM-032**: Excluir os vídeos da cadeia de ferramentas de imagem (ALT `UC04`, `RF15`).
- **COM-033**: Incluir os vídeos e os resultados de vídeo numa pasta `videos/` do ZIP do projeto
  (ALT `RF13`).
- **COM-053**: Gerar o PDF do projeto só com as imagens e avisar que os vídeos não estão incluídos
  (ALT `RF13`; separado de COM-033 no refinamento).
- **COM-034**: Eliminar do armazenamento o vídeo ou resultado removido, incluindo a *thumbnail*, ou
  todos os do projeto removido.
- **COM-035**: Eliminar vídeos, resultados e registos de tarefas na eliminação da conta (ALT `RF23`).
- **COM-057**: Apresentar cada vídeo e resultado com *thumbnail*: a própria, a do vídeo de origem nos
  resultados de deteção, ou uma imagem genérica quando não existe (ALT `UC04`).

### Non-Functional Requirements

- **COM-036**: Responder a um pedido de processamento, com aceitação ou rejeição, em ≤ 2 s, medidos
  entre a receção do pedido e o envio da resposta (a validação do envio passou a SUBMIT-011).
- **COM-037**: 5 tarefas em simultâneo e até 100 em fila sem perda.
- **COM-038**: Temporários e parciais eliminados em ≤ 1 h após o estado final; envios falhados ≤ 24 h.
- **COM-039**: Original inalterado e nenhum resultado parcial em 100% dos cenários de falha,
  cancelamento e interrupção.
- **COM-040**: Tempo máximo max(15 min, 15 min × duração em minutos); depois, `failed` com devolução.
- **COM-041**: Após o reinício de um *worker*, a tarefa que estava a processar termina em `failed` com
  a operação devolvida e as restantes ficam em `queued`.
- **COM-055**: O estado de todas as tarefas mantém-se quando o `projects` é reiniciado (separado de
  COM-041).
- **COM-042**: Ficheiro malformado termina só a sua tarefa como `failed`.
- **COM-043**: Vídeos e resultados durante a vida do projeto; registos de tarefas 30 dias.
- **COM-044**: Resultados reproduzíveis sem extensões na última versão estável do Chrome e do Firefox à
  data do teste.
- **COM-045**: Entrada só MP4/H.264 com AAC ou sem áudio; saída MP4/H.264/AAC ou, na conversão,
  WebM/VP9/Opus.
- **COM-046**: Num projeto de referência com 3 imagens, resultados iguais antes e depois da integração
  do vídeo com cada ferramenta básica, e cada ferramenta avançada concluída sem erro.
- **COM-056**: Um lote de imagens em ZIP é processado da mesma forma antes e depois da integração do
  vídeo (separado de COM-046).
- **COM-047**: Acrescentar uma ferramenta de vídeo alterando apenas o novo *worker* e a sua configuração
  (serviço no `docker-compose.yaml` e fila no `definitions.json`), o registo de ferramentas, o validador
  dos parâmetros e a entrada no menu da interface.
- **COM-048**: Registo por tarefa com ferramenta, duração do vídeo, tempo de fila, tempo de
  processamento e estado final.
- **COM-049**: Arrancar os *workers* de vídeo e as dependências com um único comando documentado,
  numa máquina com Docker Engine 24+, 8 GB de RAM e 15 GB de disco livres.
- **COM-050**: Recusar o acesso a vídeos, *thumbnails*, tarefas e resultados a quem não tenha acesso
  ao projeto, identificando-os por valores não sequenciais.
- **COM-054**: URLs de reprodução e de descarga de vídeo válidos durante 15 min (separado de COM-050).
- **COM-051**: Pedidos simultâneos não ultrapassam a quota nem o limite de tarefas ativas.
- **COM-052**: Atualizar o progresso de uma tarefa em `processing` com intervalos ≤ 5 s entre
  atualizações consecutivas apresentadas ao utilizador.

### Key Entities

- **Vídeo** (`videoAsset`): ficheiro de vídeo de um projeto, original ou resultado, com metadados
  técnicos, chave de armazenamento, chave da *thumbnail*, *hash*, e, se for resultado, referência ao vídeo de origem e à
  tarefa. Inclui também o resultado de deteção (JSON).
- **Tarefa de processamento** (`videoTask`): pedido de uma ferramenta de vídeo sobre um vídeo, com
  parâmetros, estado, progresso, motivo, tempos, estado da quota e prioridade.
- **Limites do perfil**: tamanho, duração, resolução, operações por dia e tarefas ativas de Free e
  Premium (configuração).
- **Quota diária**: operações usadas por dia no serviço `users` (estrutura existente
  `operations[{day, processed}]`).
- **Ferramenta de vídeo**: entrada do registo de ferramentas (`trim`, `convert`, `filter`, `detect`),
  com fila, validador de parâmetros e tipo de resultado.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% dos pedidos anónimos, sem permissão ou fora dos limites são rejeitados sem tarefa
  nem alteração de quota.
- **SC-002**: 100% das tarefas terminam num estado final com motivo (quando `failed`/`cancelled`) e com
  a quota coerente (consolidada ou devolvida).
- **SC-003**: 0 pedidos aceites acima da quota ou do limite de tarefas ativas em testes de concorrência.
- **SC-004**: Aceitação de pedidos em ≤ 2 s e progresso a cada ≤ 5 s em todas as medições no ambiente
  de referência.
- **SC-005**: Os testes de regressão das ferramentas de imagem passam antes e depois da integração.
- **SC-006**: Nenhum temporário com mais de 1 h após o estado final da tarefa.

## Assumptions

- Ambiente de referência (UC-VID-004/A7): `docker compose` local, *worker* com 1 vCPU e 2 GB de RAM,
  vídeo de teste 1080p a 30 fps H.264.
- O armazenamento é o SeaweedFS (S3) através do `imageStorageService`; os URLs para o navegador passam
  pelo *proxy* `/s3/` do Nginx.
- O `users` mantém a quota em `operations[{day, processed}]` e o `check_process` das ferramentas de
  imagem continua a ser usado para imagens; o vídeo usa novos *endpoints* atómicos sobre a mesma
  estrutura, pelo que o limite de 5 é partilhado.
- As notificações em tempo real usam o `wsGateway` existente (salas por utilizador e
  `project:<id>`).
- Não há quota total de armazenamento no MVP (RNG-08).

## Scope and Traceability

Fora do âmbito: encadeamento de ferramentas de vídeo, processamento em lote, repetição automática,
quota total de armazenamento, retoma de tarefas, *presets* de vídeo.

| Requisitos | User Story |
|---|---|
| COM-001, COM-003 a COM-008, COM-025, COM-045, COM-050 | US1 |
| COM-009 a COM-014, COM-026 a COM-029, COM-036, COM-039, COM-052 | US2 |
| COM-018, COM-019, COM-021 a COM-024, COM-051 | US3 |
| COM-016, COM-017, COM-020, COM-040 a COM-042 | US4 |
| COM-015, COM-031 | US5 |
| COM-002, COM-030, COM-032 a COM-035, COM-044, COM-046, COM-057 | US6 |
| COM-037, COM-038, COM-043, COM-047 a COM-049 | US7 |
