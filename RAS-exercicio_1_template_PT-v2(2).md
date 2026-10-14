# Exercício 1 — Casos de Uso
### Fase 1: Suporte a Vídeo no PictuRAS

## 0. Identificação

| **Campo** | **Valor** |
|-----------|-----------|
| **Grupo / Equipa** | 1 |
| **Autores** | Beatriz Miranda |
| **Data** | 2026-10-13 |
| **Versão do documento** | v1.0 |
| **Unidade Curricular** | Requisitos e Arquiteturas de Software — MEI, Universidade do Minho |

## 1. Funcionalidade de vídeo escolhida

| **Campo** | **Valor** |
|-----------|-----------|
| **Funcionalidade** | Conversão de um vídeo para outro formato ou resolução |
| **Perfil(s) de utilizador abrangido(s)** | Utilizador registado; o processamento é associado à sua conta e aos seus projetos |

**Justificação no contexto do MVP**

A conversão permite adaptar vídeos para diferentes utilizações, validando o primeiro fluxo completo
de edição de vídeo: seleção, processamento, armazenamento e disponibilização do resultado. Também
reutiliza capacidades existentes de projetos, limites de subscrição e notificações de processamento.

## 2. Caso de Uso

### 2.1 Cabeçalho

| **Secção** | **Detalhes** |
|------------|--------------|
| **ID do Caso de Uso** | UC-VID-001 |
| **Nome** | Converter vídeo para outro formato ou resolução |
| **Versão** | v1.0 |
| **Autor** | Beatriz Miranda |
| **Data** | 2026-10-13 |
| **Objetivo** | Permitir ao utilizador obter uma cópia do vídeo num formato ou resolução escolhidos |
| **Âmbito** | Frontend, API Gateway, serviço de projetos, processamento de vídeo, armazenamento e notificações |
| **Ator Principal** | Utilizador registado |
| **Stakeholders e Interesses** | - **Utilizador**: obter um vídeo compatível sem perder o original<br>- **PictuRAS**: processar dentro dos limites do perfil e preservar a integridade dos ficheiros<br>- **Equipa de operação**: receber estados claros quando uma operação termina ou falha |
| **Pré-condições** | - O utilizador está autenticado<br>- O vídeo pertence a um projeto acessível pelo utilizador<br>- O vídeo original está disponível e pode ser lido pelo sistema |
| **Trigger** | O utilizador escolhe um vídeo e inicia a opção de conversão |

### 2.2 Fluxo Principal

| **Passo** | **Ação do Ator** | **Resposta do Sistema** |
|-----------|------------------|-------------------------|
| 1 | Seleciona um vídeo da sua biblioteca e escolhe “Converter”. | Apresenta os formatos e resoluções de saída disponíveis para o perfil. |
| 2 | Escolhe o formato e/ou a resolução de saída e confirma. | Valida as opções e informa se o pedido foi aceite ou rejeitado. |
| 3 | — | Regista a operação e coloca-a em processamento, mantendo o vídeo original inalterado. |
| 4 | — | Processa o vídeo e atualiza o estado da operação. |
| 5 | — | Armazena o vídeo convertido como novo resultado associado ao projeto e ao original. |
| 6 | Abre ou descarrega o resultado. | Apresenta o vídeo convertido e os seus metadados de formato e resolução. |

### 2.3 Fluxos Alternativos

| **Fluxo** | **Descrição** |
|-----------|---------------|
| FA1 – Apenas alteração de formato | O utilizador mantém a resolução original e escolhe apenas um formato diferente; o sistema conserva a resolução quando suportada. |
| FA2 – Apenas alteração de resolução | O utilizador mantém o formato original e escolhe apenas uma resolução diferente; o sistema conserva o formato quando suportado. |
| FA3 – Cancelamento | O utilizador cancela antes do início do processamento; o sistema não cria resultado nem consome a operação. |

### 2.4 Exceções

| **Condição** | **Comportamento do Sistema** |
|--------------|------------------------------|
| O formato ou codec do vídeo de entrada não é suportado. | Rejeita o pedido, mantém o original intacto e informa o utilizador de que deve fornecer um vídeo compatível. |
| O formato ou resolução escolhidos não são suportados para o perfil. | Não inicia o processamento e apresenta as opções válidas. |
| A quota diária do perfil está esgotada. | Não inicia o processamento e informa o utilizador sobre o limite. |
| O processamento falha depois de começar. | Marca a operação como falhada, não publica um resultado incompleto, mantém o original e apresenta uma mensagem de erro. |

### 2.5 Pós-condições

| **Tipo** | **Resultado** |
|----------|---------------|
| Garantia de Sucesso | O vídeo convertido é disponibilizado como novo resultado associado ao projeto e ao vídeo original; o original permanece inalterado. |
| Garantia Mínima | Nenhum resultado parcial ou ficheiro inválido é apresentado como concluído; o estado e a razão da falha ficam visíveis ao utilizador. |

### 2.6 Regras de Negócio e Restrições

| **ID** | **Regra** |
|--------|-----------|
| RN1 | Apenas utilizadores autenticados podem iniciar uma conversão. |
| RN2 | O vídeo de entrada deve pertencer a um projeto acessível pelo utilizador. |
| RN3 | O resultado é criado como novo ficheiro; o vídeo original nunca é substituído. |
| RN4 | O pedido deve respeitar a quota diária e os limites de formato, duração e tamanho definidos para o perfil. |
| RN5 | Apenas formatos e resoluções apresentados pelo sistema podem ser escolhidos. |

### 2.7 Assunções

| **ID** | **Assunção** |
|--------|--------------|
| A1 | O sistema já dispõe de autenticação, projetos, armazenamento, quotas e comunicação de estados de processamento. |
| A2 | A primeira versão suporta pelo menos MP4 como formato de saída e resoluções até 1080p, desde que o ambiente de execução consiga processar o vídeo. |
| A3 | O processamento pode ser assíncrono e o utilizador não precisa de manter a página aberta. |

### 2.8 Questões em Aberto

| **ID** | **Questão** |
|-------------|-------------|
| Q1 | [Decisão provisória — confirmar com o grupo em 2026-10-14] Quais são exatamente os formatos, codecs, durações e tamanhos máximos suportados na primeira versão? |
| Q2 | [Decisão provisória — confirmar com o grupo em 2026-10-14] Que resoluções devem aparecer como opções predefinidas, além da resolução original? |

## 3. Utilização de agentes de IA

| **Ferramenta / *skill*** | **Tarefa apoiada** | **Validação realizada pela equipa** |
|--------------------------|--------------------|--------------------------------------|
| GitHub Copilot + GitHub Spec Kit | Estruturação do caso de uso, requisitos derivados e rastreabilidade inicial | Revisão manual contra o enunciado, o código existente e o guia da Secção 4; assunções e questões em aberto foram identificadas explicitamente |

## Lista de verificação antes de entregar

- [x] Secções 0 a 3 preenchidas e texto de ajuda removido.
- [x] Funcionalidade escolhida e justificada no contexto do MVP.
- [x] Ator principal identificado, com o respetivo perfil.
- [x] Fluxo principal, fluxos alternativos e exceções específicas de vídeo incluídos.
- [x] Garantia de sucesso e garantia mínima preenchidas.
- [x] Regras de negócio, assunções e questões em aberto registadas.
- [x] Utilização de agentes de IA documentada.

## 4. Esboço de requisitos derivados

### 4.1 Requisitos de Sistema

| **ID** | **Requisito** | **Tipo** | **Prioridade** | **Novo/Alt** | **Origem** | **Como verificar** |
|--------|---------------|----------|----------------|--------------|------------|--------------------|
| REQ-VID-CONV-001 | O sistema deve permitir ao utilizador registado selecionar um vídeo da sua biblioteca e iniciar uma conversão. | F | Deve ter | NOVO | Passo 1; RN1 | Dado um utilizador autenticado com um vídeo acessível, quando seleciona “Converter”, então deve conseguir iniciar o pedido. |
| REQ-VID-CONV-002 | O sistema deve apresentar apenas formatos e resoluções de saída válidos para o vídeo e para o perfil do utilizador. | F | Deve ter | ALT | Passo 1; RN5 | Dado um vídeo e um perfil, quando o utilizador seleciona “Converter”, então só devem ser apresentadas opções válidas. |
| REQ-VID-CONV-003 | O sistema deve validar o formato e o codec do vídeo de entrada antes de iniciar o processamento. | F | Deve ter | NOVO | Passo 2; Exceção 1 | Dado um vídeo, quando o utilizador confirma a conversão, então o sistema deve validar o formato e o codec antes de aceitar o pedido. |
| REQ-VID-CONV-004 | O sistema deve validar o tamanho e a duração do vídeo antes de iniciar o processamento. | NF (Capacidade) | Deve ter | NOVO | RN4 | Dado um vídeo, quando o utilizador confirma a conversão, então o sistema deve rejeitar o vídeo se exceder os limites definidos para o perfil. |
| REQ-VID-CONV-005 | O sistema deve validar a quota diária do utilizador antes de iniciar o processamento. | F | Deve ter | ALT | RN4; Exceção 3 | Dado um utilizador sem quota disponível, quando confirma uma conversão, então o pedido não deve ser iniciado. |
| REQ-VID-CONV-006 | O sistema deve informar o utilizador se o pedido de conversão foi aceite ou rejeitado. | F | Deve ter | NOVO | Passo 2 | Dado um pedido de conversão, quando termina a validação, então o sistema deve apresentar o resultado da aceitação ou rejeição. |
| REQ-VID-CONV-007 | O sistema deve registar a operação depois de aceitar um pedido de conversão válido. | F | Deve ter | NOVO | Passo 3 | Dado um pedido aceite, quando o sistema inicia a operação, então deve ser criado um registo da conversão. |
| REQ-VID-CONV-008 | O sistema deve colocar a operação no estado `em processamento` depois de aceitar o pedido. | F | Deve ter | NOVO | Passo 3 | Dado um pedido aceite, quando o processamento começa, então o estado apresentado deve ser `em processamento`. |
| REQ-VID-CONV-009 | O sistema deve manter o vídeo original inalterado durante e após a conversão. | NF (Fiabilidade) | Deve ter | NOVO | Passo 3; Pós-condição de sucesso; RN3 | Dado um vídeo original, quando uma conversão termina com sucesso ou falha, então o conteúdo do original deve permanecer inalterado. |
| REQ-VID-CONV-010 | O sistema deve processar o pedido de conversão de forma assíncrona quando a duração do processamento impedir uma resposta imediata. | F | Deveria ter | ALT | Passo 4; A3 | Dado um pedido aceite, quando o processamento demora mais do que a submissão, então o pedido deve continuar sem exigir que o utilizador mantenha a página aberta. |
| REQ-VID-CONV-011 | O sistema deve apresentar o estado atual da operação de conversão ao utilizador. | F | Deve ter | ALT | Passo 4; A3 | Dado uma operação registada, quando o utilizador consulta a operação, então o estado atual deve ser apresentado. |
| REQ-VID-CONV-012 | O sistema deve apresentar a percentagem de progresso da conversão, atualizada pelo menos a cada 5 segundos enquanto o processamento estiver ativo. | NF (Usabilidade) | Deveria ter | ALT | Passo 4 | Dado um processamento ativo, quando decorrem 5 segundos, então a percentagem de progresso deve ser atualizada ou o estado deve indicar que o progresso não está disponível. |
| REQ-VID-CONV-013 | O sistema deve permitir ao utilizador cancelar uma operação antes do início do processamento. | F | Deveria ter | NOVO | FA3 | Dado uma operação ainda não iniciada, quando o utilizador a cancela, então a operação deve ficar cancelada e não deve ser criado nenhum resultado. |
| REQ-VID-CONV-014 | O sistema deve armazenar o vídeo convertido como um novo ficheiro. | F | Deve ter | NOVO | Passo 5; RN3 | Dado um processamento concluído, quando o resultado é armazenado, então deve ser criado um ficheiro diferente do original. |
| REQ-VID-CONV-015 | O sistema deve associar o novo ficheiro convertido ao projeto e ao vídeo original. | F | Deve ter | NOVO | Passo 5; Pós-condição de sucesso | Dado um resultado convertido, quando o utilizador consulta o projeto, então o resultado deve aparecer associado ao projeto e ao vídeo original. |
| REQ-VID-CONV-016 | O sistema deve disponibilizar o vídeo convertido para abertura ou descarga depois de o processamento terminar com sucesso. | F | Deve ter | NOVO | Passo 6 | Dado um processamento concluído, quando o utilizador abre ou descarrega o resultado, então o vídeo deve estar disponível. |
| REQ-VID-CONV-017 | O sistema deve apresentar os metadados de formato e resolução do vídeo convertido. | F | Deveria ter | NOVO | Passo 6 | Dado um resultado convertido, quando o utilizador o consulta, então devem ser apresentados o formato e a resolução de saída. |
| REQ-VID-CONV-018 | O sistema deve rejeitar vídeos cujo formato ou codec de entrada não sejam suportados. | F | Deve ter | NOVO | Exceção 1 | Dado um vídeo incompatível, quando o utilizador confirma a conversão, então o pedido deve ser rejeitado e o original deve permanecer disponível. |
| REQ-VID-CONV-019 | O sistema deve rejeitar opções de formato ou resolução que não sejam suportadas para o perfil do utilizador. | F | Deve ter | ALT | Exceção 2; RN5 | Dado uma opção não permitida, quando é submetida, então o sistema não deve iniciar o processamento e deve apresentar as opções válidas. |
| REQ-VID-CONV-020 | O sistema deve informar o utilizador quando a quota diária do perfil estiver esgotada. | F | Deve ter | ALT | Exceção 3; RN4 | Dado um perfil sem quota, quando o utilizador tenta iniciar uma conversão, então deve ser apresentada uma mensagem sobre o limite atingido. |
| REQ-VID-CONV-021 | O sistema deve marcar como falhada uma operação cujo processamento termine com erro. | F | Deve ter | NOVO | Exceção 4 | Dado um processamento que termina com erro, quando a falha é detetada, então o estado da operação deve ser `falhada`. |
| REQ-VID-CONV-022 | O sistema não deve apresentar um resultado parcial como concluído quando o processamento falhar. | NF (Fiabilidade) | Deve ter | NOVO | Exceção 4; Garantia mínima | Dado um processamento falhado, quando o utilizador consulta os resultados, então nenhum ficheiro parcial deve aparecer como concluído. |
| REQ-VID-CONV-023 | O sistema deve apresentar uma mensagem de erro quando o processamento falhar. | F | Deve ter | NOVO | Exceção 4; Garantia mínima | Dado um processamento falhado, quando a operação termina, então o utilizador deve conseguir consultar a razão da falha. |
| REQ-VID-CONV-024 | O sistema deve manter a resolução original quando o utilizador alterar apenas o formato e a resolução for suportada. | F | Deveria ter | NOVO | FA1 | Dado um pedido que altera apenas o formato, quando a conversão termina, então a resolução original deve ser mantida. |
| REQ-VID-CONV-025 | O sistema deve manter o formato original quando o utilizador alterar apenas a resolução e o formato for suportado. | F | Deveria ter | NOVO | FA2 | Dado um pedido que altera apenas a resolução, quando a conversão termina, então o formato original deve ser mantido. |
| REQ-VID-CONV-026 | O sistema deve rejeitar uma conversão quando o formato e a resolução escolhidos forem iguais aos do vídeo original, salvo quando o utilizador confirmar explicitamente a criação de uma cópia. | F | Poderia ter | NOVO | Caso de fronteira; Garantia mínima | Dado um vídeo e opções iguais às originais, quando o utilizador confirma, então o sistema deve rejeitar o pedido ou solicitar confirmação explícita de cópia. |
| REQ-VID-CONV-027 | O sistema deve concluir pelo menos 95% das conversões de vídeos até 2 minutos e 500 MB em até 2 minutos, em condições normais de execução. | NF (Desempenho) | Deveria ter | NOVO | A2; Pós-condição de sucesso | Dado um conjunto de testes com vídeos até 2 minutos e 500 MB, quando forem executadas conversões em condições normais, então pelo menos 95% devem terminar em até 2 minutos. |

### 4.2 Impacto no sistema existente

| **Elemento existente afetado** | **Impacto (Manter / Estender / Alterar)** | **Descrição do impacto** | **Requisitos relacionados** |
|--------------------------------|-------------------------------------------|--------------------------|------------------------------|
| Frontend | Estender | Permitir selecionar um vídeo, apresentar opções válidas, confirmar ou cancelar a operação, consultar estados, progresso e resultados. | REQ-VID-CONV-001, 002, 006, 008, 011, 012, 013, 016, 017, 020, 023 |
| API Gateway | Estender | Expor a operação de conversão e encaminhar pedidos autenticados, consultas de estado, cancelamentos e acesso ao resultado. | REQ-VID-CONV-001, 005, 006, 011, 013, 016, 018, 019, 020 |
| Serviço de projetos | Estender | Validar o vídeo, o projeto, as opções e a quota; registar a operação e associar o resultado ao original. | REQ-VID-CONV-003, 004, 005, 007, 009, 014, 015, 018, 019, 021, 022, 024, 025, 026 |
| Serviços de processamento | Estender | Processar a conversão e comunicar estados de processamento, conclusão e falha. | REQ-VID-CONV-008, 010, 011, 012, 021, 023, 027 |
| Serviço de armazenamento | Estender | Armazenar e disponibilizar o novo ficheiro sem substituir o original. | REQ-VID-CONV-009, 014, 016, 022 |
| Serviço de subscrições | Alterar | Aplicar à conversão as quotas e os limites de formato, duração, tamanho e resolução definidos para o perfil. | REQ-VID-CONV-002, 004, 005, 019, 020 |

### 4.3 Matriz de Rastreabilidade

| **Elemento do Caso de Uso** | **Descrição abreviada** | **Requisito(s) de Sistema** |
|------------------------------|-------------------------|------------------------------|
| Passo 1 | Seleção do vídeo e apresentação das opções | REQ-VID-CONV-001, REQ-VID-CONV-002 |
| Passo 2 | Escolha, validação e resposta ao pedido | REQ-VID-CONV-003, REQ-VID-CONV-004, REQ-VID-CONV-005, REQ-VID-CONV-006 |
| Passo 3 | Registo, início e preservação do original | REQ-VID-CONV-007, REQ-VID-CONV-008, REQ-VID-CONV-009 |
| Passo 4 | Processamento, estado e progresso | REQ-VID-CONV-010, REQ-VID-CONV-011, REQ-VID-CONV-012 |
| Passo 5 | Armazenamento e associação do resultado | REQ-VID-CONV-014, REQ-VID-CONV-015 |
| Passo 6 | Abertura, descarga e metadados do resultado | REQ-VID-CONV-016, REQ-VID-CONV-017 |
| FA1 | Alteração apenas do formato | REQ-VID-CONV-024 |
| FA2 | Alteração apenas da resolução | REQ-VID-CONV-025 |
| FA3 | Cancelamento antes do processamento | REQ-VID-CONV-013 |
| Exceção 1 | Formato ou codec de entrada não suportado | REQ-VID-CONV-018 |
| Exceção 2 | Opção não suportada para o perfil | REQ-VID-CONV-019 |
| Exceção 3 | Quota diária esgotada | REQ-VID-CONV-020 |
| Exceção 4 | Falha sem resultado parcial | REQ-VID-CONV-021, REQ-VID-CONV-022, REQ-VID-CONV-023 |
| Garantia de sucesso | Resultado novo, associado e original preservado | REQ-VID-CONV-009, REQ-VID-CONV-014, REQ-VID-CONV-015, REQ-VID-CONV-016 |
| Garantia mínima | Sem resultado inválido e falha visível | REQ-VID-CONV-022, REQ-VID-CONV-023 |
| RN1 | Apenas utilizadores autenticados | REQ-VID-CONV-001 |
| RN2 | Vídeo pertencente a projeto acessível | REQ-VID-CONV-001, REQ-VID-CONV-003 |
| RN3 | Original nunca substituído | REQ-VID-CONV-009, REQ-VID-CONV-014 |
| RN4 | Quota e limites do perfil | REQ-VID-CONV-004, REQ-VID-CONV-005, REQ-VID-CONV-020 |
| RN5 | Apenas opções apresentadas pelo sistema | REQ-VID-CONV-002, REQ-VID-CONV-019 |
| A2 | MP4 e resoluções até 1080p | REQ-VID-CONV-002, REQ-VID-CONV-027 |
| A3 | Processamento assíncrono | REQ-VID-CONV-010, REQ-VID-CONV-011 |
