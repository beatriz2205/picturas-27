# Feature Specification: Submeter vídeo a um projeto

**Feature Branch**: `001-video-submit`

**Created**: 2026-10-19

**Status**: Ready for implementation

**Input**: UC-VID-001 (Cap. 4.1) e requisitos `REQ-VID-SUBMIT-001` a `013` (Cap. 5) do relatório da
Fase 1. Usa a infraestrutura de [000-video-common](../000-video-common/spec.md): validação, limites,
modelo `videoAsset` e armazenamento.

## Clarifications

### Session 2026-10-19

- A submissão não cria tarefa de processamento nem consome quota (RN4, RNG-04).
- O tamanho é verificado antes de iniciar a transferência (RN7). O formato, a duração e a resolução
  só podem ser verificados pelo conteúdo, depois de o ficheiro chegar ao servidor.
- A repetição de uma submissão cuja confirmação se perdeu reutiliza o mesmo identificador de envio e
  não cria uma segunda entrada. Uma nova seleção do mesmo ficheiro é uma nova submissão (RN6).

### Session 2026-10-21

- A submissão gera uma *thumbnail* do vídeo (UC-VID-001/RN8): JPEG com 320 px de largura, fotograma a
  10% da duração (no máximo a 1 s). É gerada pelo servidor, de forma síncrona, entre a validação e a
  confirmação; não cria tarefa nem conta como operação (decisão D16 do 000).
- Se a *thumbnail* não puder ser gerada, o vídeo é aceite na mesma e aparece com o ícone genérico
  (UC-VID-001/E6).
- O tempo de confirmação de `SUBMIT-011` (≤ 5 s após o fim da transferência) inclui a geração da
  *thumbnail*.

## User Scenarios & Testing

### User Story 1 - Submeter um vídeo a um projeto existente (Priority: P1)

O utilizador abre um projeto, escolhe “Adicionar vídeo”, seleciona um ficheiro, vê o nome e o tamanho,
confirma e acompanha o progresso do envio. No fim, o vídeo aparece no projeto com a sua *thumbnail*,
nome, duração, resolução, tamanho e formato.

**Why this priority**: É a entrada de todas as ferramentas de vídeo (UC-VID-002 a 005).

**Independent Test**: Com um utilizador Free e um projeto editável, submeter um MP4/H.264/AAC de 30 s
e 720p e verificar a entrada no projeto, os metadados e o objeto no armazenamento.

**Acceptance Scenarios**:

1. **Given** um utilizador autenticado com projeto editável, **When** submete um vídeo válido, **Then**
   o vídeo é guardado e associado ao projeto (SUBMIT-001).
2. **Given** um envio de 100 MB em curso, **When** decorre, **Then** a percentagem é atualizada até 100%
   (SUBMIT-004).
3. **Given** um envio interrompido a 90%, **When** o utilizador consulta o projeto, **Then** não existe
   entrada para o vídeo e não foi apresentada confirmação (SUBMIT-006).
4. **Given** um projeto com um vídeo, **When** o utilizador submete outro vídeo válido, **Then** o
   projeto tem os dois (SUBMIT-007).
5. **Given** um utilizador Free sem operações restantes, **When** submete um vídeo válido, **Then** a
   submissão é aceite e o contador não muda (SUBMIT-010).
6. **Given** um vídeo válido de 30 s, **When** a submissão é confirmada, **Then** o cartão mostra uma
   *thumbnail* JPEG com 320 px de largura e a proporção do vídeo, e o original tem o mesmo `sha256`
   que o ficheiro enviado (SUBMIT-012).
7. **Given** a geração da *thumbnail* forçada a falhar, **When** o utilizador submete um vídeo válido,
   **Then** o vídeo é associado ao projeto (`201`) e o cartão mostra o ícone genérico (SUBMIT-013).
8. **Given** um vídeo de 500 MB, **When** a transferência termina, **Then** a confirmação, com a
   *thumbnail*, chega em ≤ 5 s (SUBMIT-011).

---

### User Story 2 - Rejeitar ficheiros inválidos cedo (Priority: P1)

O sistema recusa ficheiros com formato não suportado ou acima dos limites do perfil, explica a causa e
não deixa nada no projeto. Ficheiros demasiado grandes são recusados antes de a transferência
começar.

**Why this priority**: Protege o armazenamento e os *workers* e evita esperas inúteis.

**Independent Test**: Como Free, selecionar um ficheiro de 150 MB e verificar que o envio não começa;
submeter H.265, MOV, 61 s e 4K e verificar as mensagens.

**Acceptance Scenarios**:

1. **Given** um utilizador Free que seleciona um ficheiro de 150 MB, **When** confirma, **Then** o
   envio não começa e é indicado o limite de 100 MB (SUBMIT-003, COM-004).
2. **Given** um `.mp4` com H.265, um MOV, um MP4 de 61 s ou um MP4 4K (Free), **When** termina o envio,
   **Then** é recusado, com o formato aceite ou o limite indicado, e o projeto não muda (COM-003 a
   COM-007).
3. **Given** um utilizador sem sessão ou com *link* “ver”, **When** tenta submeter, **Then** a opção
   não está disponível e um pedido direto é recusado (COM-001).

---

### User Story 3 - Cancelar e repetir a submissão (Priority: P2)

O utilizador pode cancelar antes ou durante o envio, sem efeitos no projeto, e repetir depois de uma
falha de rede sem criar duplicados.

**Why this priority**: Robustez da submissão; o percurso principal funciona sem isto.

**Independent Test**: Cancelar a meio de um envio; cortar a rede a meio e repetir; simular a perda da
resposta de confirmação e repetir.

**Acceptance Scenarios**:

1. **Given** um envio em curso, **When** o utilizador cancela, **Then** o projeto não tem entrada nova
   e nenhum ficheiro parcial fica acessível (SUBMIT-005, COM-029).
2. **Given** um envio falhado, **When** o utilizador tenta novamente e o envio termina, **Then** o
   projeto tem exatamente uma entrada (SUBMIT-008).
3. **Given** uma submissão confirmada no servidor cuja resposta não chegou ao cliente, **When** o
   cliente repete o envio, **Then** o projeto continua com uma só entrada (SUBMIT-009).
4. **Given** um projeto removido durante o envio, **When** o envio termina, **Then** o ficheiro é
   descartado, o utilizador é informado e o vídeo não é associado a outro projeto (UC-VID-001/E5).

---

### User Story 4 - Criar um projeto a partir de um vídeo (Priority: P3)

Na criação de um projeto, o utilizador pode escolher um vídeo em vez de imagens. Se o vídeo for
recusado, o projeto não é criado.

**Why this priority**: Atalho; o mesmo resultado obtém-se criando o projeto e depois submetendo.

**Independent Test**: Criar um projeto com um vídeo válido e outro com um vídeo inválido; verificar a
lista de projetos.

**Acceptance Scenarios**:

1. **Given** um vídeo válido, **When** o utilizador cria um projeto com ele, **Then** o projeto existe
   e contém o vídeo (SUBMIT-002).
2. **Given** um vídeo com formato inválido, **When** o vídeo é recusado, **Then** nenhum projeto novo
   aparece na lista (SUBMIT-002).

### Edge Cases

- Ficheiro com extensão `.mp4` e conteúdo WebM: é recusado pelo conteúdo (COM-003).
- Vídeo vertical 1080 × 1920 no Free: é aceite (limite aplicado à orientação, data-model do 000).
- Dois separadores a submeter ao mesmo projeto: duas entradas distintas, cada uma com o seu
  identificador de envio.
- Nome igual a um vídeo existente: o sistema acrescenta o sufixo “(1)”, sem substituir nada (RN6).
- Sessão expirada durante um envio longo: o servidor recusa no fim com `401` e descarta o ficheiro;
  o utilizador pode repetir depois de voltar a entrar.
- Vídeo com mais de uma faixa de vídeo ou áudio: é recusado como formato não suportado.
- Vídeo com menos de 1 s: a *thumbnail* é o fotograma a 10% da duração.
- Vídeo vertical (1080 × 1920): a *thumbnail* tem 320 px de largura e mantém a proporção (320 × 568).
- Repetição de um envio já confirmado (`200`): devolve o vídeo existente com a *thumbnail* já gerada,
  sem gerar outra.
- Projeto removido depois de gerar a *thumbnail* (E5): a *thumbnail* é apagada com o vídeo.

## Requirements

### Functional Requirements

- **SUBMIT-001**: Submeter um vídeo a um projeto em que o utilizador tem permissão de edição (ALT
  modelo de domínio: `Projeto`).
- **SUBMIT-002**: Criar um projeto novo a partir de um vídeo; se o vídeo for recusado, o projeto não é
  criado (ALT modelo de domínio: `Projeto`).
- **SUBMIT-003**: Rejeitar o ficheiro acima do limite de tamanho do perfil antes de iniciar a
  transferência.
- **SUBMIT-004**: Apresentar a percentagem enviada, atualizada pelo menos uma vez por segundo até 100%.
- **SUBMIT-005**: Permitir cancelar a seleção ou o envio sem alterar o projeto.
- **SUBMIT-006**: Confirmar só depois de o ficheiro completo estar guardado e associado ao projeto.
- **SUBMIT-007**: Cada vídeo submetido é uma nova entrada; não substitui conteúdos.
- **SUBMIT-008**: Permitir repetir a submissão após uma falha.
- **SUBMIT-009**: Repetir uma submissão já confirmada mantém uma só entrada.
- **SUBMIT-010**: A submissão não altera o saldo de operações.
- **SUBMIT-012**: Gerar, para cada vídeo aceite na submissão, uma *thumbnail* JPEG com 320 px de
  largura e altura proporcional à do vídeo.
- **SUBMIT-013**: Aceitar a submissão de um vídeo válido mesmo quando a *thumbnail* não é gerada.
- **SUBMIT-014**: Extrair a *thumbnail* do fotograma no instante t = min(0,1 × duração; 1 s) (separado
  de SUBMIT-012 no refinamento).

### Non-Functional Requirements

- **SUBMIT-011**: Confirmar ou rejeitar a submissão de um vídeo de até 500 MB, incluindo a geração da
  *thumbnail*, em ≤ 5 s após o fim da transferência, no ambiente de referência (separado de COM-036 no
  refinamento do relatório).

Requisitos comuns usados (implementados no 000): COM-001 a COM-007, COM-029, COM-034 (inclui a
*thumbnail*), COM-038 (envios falhados ≤ 24 h), COM-045, COM-050, COM-057.

### Key Entities

- **Vídeo** (`videoAsset` com `origin: "upload"`): ver o data-model do 000. Esta funcionalidade usa
  `upload_id` para a idempotência e preenche `thumbnail_key`.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% dos ficheiros acima do limite de tamanho são recusados sem transferência (0 bytes de
  corpo recebidos no servidor).
- **SC-002**: 100% dos ficheiros fora da matriz ou dos limites são recusados sem entrada no projeto.
- **SC-003**: 0 entradas duplicadas em repetições com o mesmo identificador de envio.
- **SC-004**: Validação e geração da *thumbnail* de um vídeo de 500 MB em ≤ 5 s após a receção
  (SUBMIT-011).
- **SC-005**: 0 ficheiros parciais acessíveis depois de cancelamentos e falhas de envio.
- **SC-006**: 100% dos vídeos válidos submetidos têm *thumbnail* ou, se a geração falhar, são aceites na
  mesma (0 submissões recusadas por causa da *thumbnail*).

## Assumptions

- A1 a A5 de UC-VID-001 (Cap. 4.1.7).
- O navegador fornece o tamanho do ficheiro antes do envio (`File.size`).
- O limite global do Nginx para esta rota é 510 MB (500 MB + *overhead multipart*).

## Scope and Traceability

Fora do âmbito: pré-visualização com reprodução durante a seleção do ficheiro (Q4; a *thumbnail* é
gerada depois da validação), envio de vários vídeos de uma vez, `.zip` de vídeos e retoma de envios
interrompidos (*resumable upload*).

| Requisito | User Story |
|---|---|
| SUBMIT-001, SUBMIT-004, SUBMIT-006, SUBMIT-007, SUBMIT-010 a SUBMIT-013 | US1 |
| SUBMIT-003 (+ COM-001, COM-003 a COM-007) | US2 |
| SUBMIT-005, SUBMIT-008, SUBMIT-009 | US3 |
| SUBMIT-002 | US4 |
