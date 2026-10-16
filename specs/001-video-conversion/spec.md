# Feature Specification: Conversão de Vídeo

**Feature Branch**: `001-video-conversion`
**Created**: 2026-10-16
**Status**: Draft
**Input**: User description: Implementar a conversão de vídeos para outro formato ou resolução
no PictuRAS, com validação, processamento assíncrono, preservação do original e disponibilização
do resultado.

## Clarifications

### Session 2026-10-16

- A especificação usa como proposta de trabalho MP4 com H.264/AAC, até 1080p, 10 minutos e
  500 MB. Esta proposta corresponde à assunção A2 do caso de uso, mas continua dependente da
  confirmação das questões Q1 e Q2 pelo grupo.

## User Scenarios & Testing

### User Story 1 - Submeter conversão de vídeo (Priority: P1)

Um utilizador registado seleciona um vídeo acessível num projeto e escolhe um formato e/ou uma
resolução de saída permitidos. O sistema valida o vídeo, as opções, as permissões e a quota antes
de aceitar o pedido.

**Why this priority**: A submissão validada é o ponto de entrada obrigatório da funcionalidade.

**Independent Test**: Com um utilizador autenticado e um vídeo compatível, selecionar uma
conversão e confirmar o pedido deve criar uma operação aceite; entradas inválidas devem ser
rejeitadas sem alterar o vídeo original.

**Acceptance Scenarios**:

1. **Given** um utilizador autenticado com acesso a um vídeo compatível, **When** escolhe
   “Converter”, seleciona uma opção apresentada e confirma, **Then** o sistema aceita o pedido,
   regista a operação e informa que o processamento foi iniciado.
2. **Given** um utilizador sem quota disponível, **When** confirma uma conversão, **Then** o
   sistema rejeita o pedido, informa que a quota foi atingida e não inicia processamento.
3. **Given** um vídeo que excede os limites permitidos ou usa formato/codec não suportado,
   **When** o utilizador confirma a conversão, **Then** o sistema rejeita o pedido e mantém o
   original intacto.
4. **Given** um utilizador sem acesso ao projeto, **When** tenta converter um vídeo desse projeto,
   **Then** o sistema não revela nem processa o vídeo.

### User Story 2 - Acompanhar processamento e resultado (Priority: P1)

Depois de o pedido ser aceite, o utilizador acompanha o estado da operação sem precisar de manter
essa página aberta. Quando termina com sucesso, encontra um novo vídeo associado ao projeto e ao
original, disponível para abrir ou descarregar.

**Why this priority**: O resultado utilizável e a visibilidade do processamento completam o valor
principal da conversão.

**Independent Test**: Submeter uma conversão válida, acompanhar os estados e verificar que o
resultado final é um novo ficheiro com o formato e a resolução escolhidos.

**Acceptance Scenarios**:

1. **Given** uma operação aceite, **When** o processamento decorre, **Then** o estado indica
   `em processamento` e o progresso é atualizado quando existir informação fiável, ou é
   explicitamente indicado como indisponível.
2. **Given** uma conversão concluída com sucesso, **When** o utilizador consulta o projeto,
   **Then** vê um novo ficheiro associado ao projeto e ao original, com metadados de formato e
   resolução, e pode abri-lo ou descarregá-lo.
3. **Given** um vídeo original e uma operação de conversão, **When** a operação termina com
   sucesso, **Then** o conteúdo do original permanece inalterado.

### User Story 3 - Cancelar ou tratar falhas (Priority: P1)

O utilizador pode cancelar uma operação antes do início efetivo do processamento. Se ocorrer uma
falha durante o processamento, o sistema apresenta um estado de falha e uma explicação sem
publicar um resultado parcial como concluído.

**Why this priority**: Cancelamento e falhas previsíveis protegem os dados do utilizador e tornam
o MVP demonstrável e recuperável.

**Independent Test**: Cancelar uma operação pendente e simular uma falha de processamento,
verificando o estado, a mensagem apresentada, a ausência de resultado inválido e a preservação do
original.

**Acceptance Scenarios**:

1. **Given** uma operação aceite mas ainda não iniciada, **When** o utilizador a cancela,
   **Then** a operação fica `cancelada`, não é criado resultado e a quota não é consumida.
2. **Given** uma operação em processamento que falha, **When** o sistema deteta a falha,
   **Then** a operação fica `falhada`, o utilizador consegue consultar a razão e nenhum resultado
   parcial aparece como concluído.
3. **Given** uma operação já iniciada, **When** o utilizador tenta cancelá-la, **Then** o sistema
   informa que o cancelamento já não está disponível e mantém o estado real da operação.

### Edge Cases

- O formato e a resolução escolhidos são iguais aos do original; o sistema deve rejeitar o pedido
  ou pedir confirmação explícita para criar uma cópia.
- O vídeo tem duração, tamanho ou resolução acima do limite definido para o perfil; o pedido deve
  ser rejeitado antes do processamento.
- O utilizador altera ou perde permissões sobre o projeto depois da submissão; o acesso ao estado
  e ao resultado deve continuar sujeito às regras de autorização.
- O utilizador fecha a página ou perde a ligação; o processamento deve continuar e o estado deve
  estar disponível quando voltar.
- O serviço de processamento fica indisponível; a operação deve terminar em erro visível, sem
  publicar um ficheiro incompleto.
- O armazenamento falha ao guardar o resultado; o sistema não deve marcar a operação como
  concluída sem confirmar que o ficheiro está disponível.

## Requirements

### Functional Requirements

- **FR-001**: O sistema MUST permitir a um utilizador registado selecionar um vídeo de um projeto
  acessível e iniciar uma conversão. (REQ-VID-CONV-001)
- **FR-002**: O sistema MUST apresentar apenas formatos e resoluções válidos para o vídeo e o
  perfil do utilizador. (REQ-VID-CONV-002)
- **FR-003**: O sistema MUST validar formato, codec, tamanho e duração do vídeo antes de aceitar
  o pedido. (REQ-VID-CONV-003, REQ-VID-CONV-004)
- **FR-004**: O sistema MUST validar a quota diária e as permissões do utilizador antes de iniciar
  o processamento. (REQ-VID-CONV-005, RN1, RN2, RN4)
- **FR-005**: O sistema MUST informar o utilizador se o pedido foi aceite ou rejeitado, incluindo
  a razão quando for rejeitado. (REQ-VID-CONV-006)
- **FR-006**: O sistema MUST registar cada pedido aceite com estado inicial `em processamento`
  ou equivalente claramente visível. (REQ-VID-CONV-007, REQ-VID-CONV-008)
- **FR-007**: O sistema MUST manter o vídeo original inalterado em qualquer resultado da operação.
  (REQ-VID-CONV-009, RN3)
- **FR-008**: O sistema MUST continuar o processamento de forma assíncrona quando este não puder
  terminar durante a submissão. (REQ-VID-CONV-010, A3)
- **FR-009**: O sistema MUST disponibilizar o estado atual da operação e MUST disponibilizar o
  progresso quando existir informação fiável; quando não existir, MUST indicar que o progresso
  está indisponível. (REQ-VID-CONV-011, REQ-VID-CONV-012)
- **FR-010**: O sistema MUST permitir cancelar uma operação aceite antes do início efetivo do
  processamento. (REQ-VID-CONV-013)
- **FR-011**: O sistema MUST guardar o vídeo convertido como um novo ficheiro associado ao projeto
  e ao vídeo original. (REQ-VID-CONV-014, REQ-VID-CONV-015)
- **FR-012**: O sistema MUST disponibilizar o resultado para abertura ou descarga e apresentar o
  seu formato e resolução. (REQ-VID-CONV-016, REQ-VID-CONV-017)
- **FR-013**: O sistema MUST rejeitar formatos, codecs, resoluções e opções não suportados e
  apresentar as opções válidas quando aplicável. (REQ-VID-CONV-018, REQ-VID-CONV-019, RN5)
- **FR-014**: O sistema MUST informar o utilizador quando a quota diária estiver esgotada.
  (REQ-VID-CONV-020)
- **FR-015**: O sistema MUST marcar como `falhada` uma operação com erro e MUST mostrar uma
  mensagem consultável com a razão da falha. (REQ-VID-CONV-021, REQ-VID-CONV-023)
- **FR-016**: O sistema MUST NOT apresentar um resultado parcial como concluído quando a operação
  falhar. (REQ-VID-CONV-022)
- **FR-017**: Ao alterar apenas o formato, o sistema SHOULD manter a resolução original quando
  suportada; ao alterar apenas a resolução, SHOULD manter o formato original quando suportado.
  (REQ-VID-CONV-024, REQ-VID-CONV-025)
- **FR-018**: O sistema MUST rejeitar ou confirmar explicitamente uma conversão sem alteração
  efetiva de formato ou resolução. (REQ-VID-CONV-026)
- **FR-019**: O sistema MUST respeitar os limites de formato, codec, resolução, duração e tamanho
  definidos para o perfil e para a versão aprovada do MVP. A proposta atual é MP4 com H.264/AAC,
  até 1080p, 10 minutos e 500 MB. (REQ-VID-CONV-027, RN4, A2, Q1, Q2)

### Key Entities

- **Vídeo original**: Ficheiro pertencente a um projeto, com formato, codec, resolução, tamanho
  e duração, que nunca é substituído pela conversão.
- **Pedido de conversão**: Operação iniciada pelo utilizador, com opções de saída, estado,
  progresso, timestamps, quota consumida e eventual razão de falha.
- **Vídeo convertido**: Novo ficheiro produzido por uma operação concluída, associado ao projeto
  e ao vídeo original, com metadados de saída.
- **Projeto**: Espaço ao qual pertencem o vídeo original, o resultado e as permissões de acesso.
- **Perfil de utilizador**: Perfil autenticado que determina permissões, quota e limites aplicáveis.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Pelo menos 95% dos pedidos válidos apresentados durante a demonstração são aceites
  ou rejeitados com uma resposta clara em até 5 segundos.
- **SC-002**: 100% dos testes de conversão concluída confirmam que o original permanece inalterado
  e que o resultado é um ficheiro separado.
- **SC-003**: 100% dos pedidos que excedem quota, permissões ou limites são rejeitados antes de
  iniciar o processamento.
- **SC-004**: Em pelo menos 95% das operações concluídas com sucesso, o utilizador consegue
  localizar e descarregar o resultado no projeto em até 30 segundos após a conclusão.
- **SC-005**: 100% das falhas reproduzidas deixam a operação num estado explícito, apresentam uma
  razão consultável e não publicam resultados parciais como concluídos.
- **SC-006**: Um utilizador que feche a página durante o processamento consegue consultar o estado
  e o resultado ao regressar, sem submeter novamente a operação.

## Assumptions

- A autenticação, os projetos, as permissões, as quotas, o armazenamento e as notificações de
  processamento existentes serão reutilizados.
- A primeira versão propõe MP4 como formato de saída, com codec H.264 para vídeo e AAC para
  áudio, até 1080p, 10 minutos de duração e 500 MB por ficheiro. Os formatos e codecs de entrada
  e as resoluções predefinidas continuam dependentes das questões Q1 e Q2.
- Vídeos acima dos limites definidos para o perfil ou para o MVP aprovado são rejeitados antes do
  processamento.
- A conversão é assíncrona e o utilizador não precisa de manter a página aberta.
- Uma operação aceite reserva quota; uma operação rejeitada não conta e uma operação cancelada
  antes do início efetivo liberta a quota eventualmente reservada.
- O MVP privilegia validação funcional e demonstração integrada, sem prometer características de
  produção como transcodificação distribuída, escalabilidade horizontal ou recuperação automática
  avançada.

## Scope and Traceability

The feature is limited to converting an existing video into one supported format and/or
resolution. Video editing effects, trimming, subtitles, live streaming, and batch conversion are
out of scope for this feature. The conversion is also a separate operation from the existing
image-processing tools and does not extend their pipelines.

The exact supported input formats/codecs, predefined resolutions, quota cost and retention policy
remain open decisions from the use case and must be confirmed before implementation.

| Source requirement | Covered by |
|---|---|
| REQ-VID-CONV-001 to REQ-VID-CONV-006 | User Story 1, FR-001 to FR-005 |
| REQ-VID-CONV-007 to REQ-VID-CONV-012 | User Story 2, FR-006 to FR-009 |
| REQ-VID-CONV-013 | User Story 3, FR-010 |
| REQ-VID-CONV-014 to REQ-VID-CONV-017 | User Story 2, FR-011 to FR-012 |
| REQ-VID-CONV-018 to REQ-VID-CONV-020 | User Story 1, FR-003 to FR-004, FR-013 to FR-014 |
| REQ-VID-CONV-021 to REQ-VID-CONV-023 | User Story 3, FR-015 to FR-016 |
| REQ-VID-CONV-024 to REQ-VID-CONV-027 | FR-017 to FR-019, Edge Cases |
