# Exercício 1 — Caso de Uso
### Casos de Uso · Fase 1: Suporte a Vídeo no PictuRAS

---

## 0. Identificação

| **Campo** | **Valor** |
|-----------|-----------|
| **Grupo / Equipa** |  |
| **Autores** |  |
| **Data** | 2026-10-13 |
| **Versão do documento** | v1.0 |
| **Unidade Curricular** | Requisitos e Arquiteturas de Software — MEI, Universidade do Minho |

---

## 1. Funcionalidade de vídeo escolhida

| **Campo** | **Valor** |
|-----------|-----------|
| **Funcionalidade** | Deteção de pessoas e objetos em vídeo, com resultados por fotograma |
| **Perfil(s) de utilizador abrangido(s)** | Utilizador registado com perfil gratuito ou premium. Utilizadores anónimos não podem executar ferramentas avançadas de IA. |

**Justificação no contexto do MVP**

O PictuRAS já disponibiliza as ferramentas `people_ai` e `obj_ai` para imagens. Esta funcionalidade reutiliza esse valor num conteúdo temporal, processando um vídeo fotograma a fotograma e permitindo consultar as deteções ao longo do tempo. É uma extensão adequada ao MVP porque valida a evolução do pipeline assíncrono existente sem alterar o objetivo principal da plataforma: processar conteúdos através de ferramentas independentes. Atualmente, a interface de carregamento aceita imagens PNG/JPEG e ficheiros ZIP de imagens; não aceita vídeo. As ferramentas `people_ai` e `obj_ai` consomem mensagens RabbitMQ e produzem ficheiros de texto com as deteções de uma imagem. Portanto, este caso de uso descreve uma extensão a implementar, não uma funcionalidade já disponível.

---

## 2. Caso de Uso

### 2.1 Cabeçalho

| **Secção** | **Detalhes** |
|------------|--------------|
| **ID do Caso de Uso** | UC-VID-001 |
| **Nome** | Detetar Pessoas e Objetos num Vídeo |
| **Versão** | v1.0 |
| **Autor** |  |
| **Data** | 2026- |
| **Objetivo** | Permitir ao utilizador submeter um vídeo, selecionar deteção de pessoas e/ou objetos e obter um resultado com as deteções identificadas em cada fotograma, sem alterar o vídeo original. |
| **Âmbito** | Frontend, API Gateway, serviço de projetos, armazenamento de objetos, RabbitMQ, workers de IA e WebSocket Gateway do PictuRAS. |
| **Ator Principal** | Utilizador registado com permissão de edição no projeto; pode ter perfil gratuito ou premium. |
| **Stakeholders e Interesses** | - **Utilizador**: pretende analisar pessoas e objetos ao longo de um vídeo e consultar ou descarregar os resultados.<br>- **Proprietário do sistema**: pretende disponibilizar uma funcionalidade diferenciadora, controlando o consumo de recursos e as operações avançadas.<br>- **Equipa de desenvolvimento**: pretende reutilizar a arquitetura assíncrona existente e manter o processamento isolado em workers.<br>- **Administrador da infraestrutura**: pretende que os ficheiros temporários e os resultados não comprometam o armazenamento ou a estabilidade dos serviços. |
| **Pré-condições** | - O utilizador tem sessão iniciada e pode editar o projeto selecionado.<br>- O projeto existe e pode receber um novo conteúdo.<br>- O vídeo está num formato suportado pela implementação de vídeo e respeita os limites de tamanho e duração definidos para o perfil.<br>- Pelo menos uma ferramenta (`people_ai` ou `obj_ai`) está disponível e foi selecionada.<br>- O sistema consegue aceder ao armazenamento de objetos, ao RabbitMQ e aos workers necessários. |
| **Trigger** | O utilizador seleciona ou carrega um vídeo, escolhe `people_ai` e/ou `obj_ai` e confirma a operação **Detetar no vídeo**. |

### 2.2 Fluxo Principal

| **Passo** | **Ação do Ator** | **Resposta do Sistema** |
|-----------|------------------|-------------------------|
| 1 | Abre um projeto e escolhe a opção para adicionar um vídeo. | Verifica a sessão, a permissão de edição e apresenta os formatos, limites e operações disponíveis para o perfil. |
| 2 | Seleciona um vídeo compatível. | Valida extensão, tipo MIME, tamanho, duração e integridade do ficheiro. |
| 3 | Seleciona `people_ai`, `obj_ai` ou ambas as ferramentas e, se disponível, configura o limiar de confiança. | Apresenta a configuração e valida que existe pelo menos uma ferramenta de deteção. |
| 4 | Confirma o processamento. | Calcula as operações avançadas necessárias, verifica a quota do utilizador e reserva as operações antes de iniciar o processamento. |
| 5 | — | Guarda o vídeo original no armazenamento de objetos e cria uma execução associada ao projeto, com estado **pendente**. |
| 6 | — | Enfileira a execução no RabbitMQ. O worker extrai os fotogramas, executa as ferramentas selecionadas e associa cada deteção ao instante ou índice do fotograma. |
| 7 | — | Persiste o resultado estruturado e, quando essa opção estiver ativa, o vídeo anotado. O vídeo original permanece inalterado. |
| 8 | — | Marca a execução como concluída e publica uma notificação através da fila do WebSocket Gateway. |
| 9 | Consulta o resultado ou solicita a sua descarga. | Apresenta o estado final, as deteções por fotograma e os artefactos disponíveis para visualização ou descarga. |

### 2.3 Fluxos Alternativos

| **Fluxo** | **Descrição** |
|-----------|---------------|
| **FA1 — Apenas deteções estruturadas** | O utilizador não solicita vídeo anotado. O sistema guarda apenas um resultado estruturado, por exemplo JSON ou CSV, com o índice/instante do fotograma, classe, confiança e caixa delimitadora normalizada. |
| **FA2 — Vídeo anotado** | O utilizador solicita a visualização das deteções. O worker sobrepõe caixas e rótulos aos fotogramas e produz um vídeo anotado, mantendo também o resultado estruturado para consulta. |
| **FA3 — Duas ferramentas no mesmo vídeo** | O utilizador seleciona `people_ai` e `obj_ai`. O sistema executa as duas deteções no mesmo pipeline e combina os resultados por fotograma; a quota é calculada para as duas ferramentas. |
| **FA4 — Cancelamento** | O utilizador cancela uma execução pendente ou em processamento. O sistema invalida a execução, impede que resultados parciais sejam publicados como resultado final, limpa os temporários e devolve as operações ainda não consumidas, quando aplicável. |

### 2.4 Exceções

| **Condição** | **Comportamento do Sistema** |
|--------------|------------------------------|
| O utilizador não está autenticado ou não tem permissão de edição no projeto. | Rejeita o pedido sem guardar o vídeo nem reservar operações e apresenta um erro de autenticação/autorização. |
| O formato, codec, tamanho ou duração do vídeo não é suportado. | Rejeita o ficheiro antes de o enfileirar, explica a restrição aplicável e mantém o projeto e a quota inalterados. |
| A quota diária do perfil gratuito não é suficiente. | Não inicia a execução, não publica mensagem para o worker e informa que o limite diário foi atingido. O perfil premium não fica sujeito ao limite diário definido para o perfil gratuito. |
| O armazenamento, RabbitMQ ou worker não está disponível. | Regista o erro, marca a execução como falhada, remove os recursos temporários que tenham sido criados e devolve as operações reservadas que ainda não tenham sido consumidas. |
| O worker falha durante a extração ou deteção de um fotograma. | Termina a execução com estado **falhado**, não disponibiliza um resultado incompleto como resultado final, conserva o vídeo original e apresenta uma mensagem que permite tentar novamente. |
| O utilizador inicia uma nova execução ou cancela a execução atual antes da conclusão. | O sistema invalida a execução anterior através do mecanismo de tokens existente e só aceita como resultado final uma execução que continue a ser a ativa. |

### 2.5 Pós-condições

| **Tipo** | **Resultado** |
|----------|---------------|
| **Garantia de Sucesso** | O vídeo original continua disponível no projeto; a execução fica concluída; o resultado estruturado e, se solicitado, o vídeo anotado ficam associados ao projeto; a quota reflete as operações efetivamente reservadas/consumidas; o utilizador é notificado da conclusão. |
| **Garantia Mínima** | O vídeo original não é alterado; uma execução incompleta não é apresentada como concluída; os temporários são removidos tanto quanto possível; o erro é registado e comunicado; as operações não consumidas são devolvidas segundo a política de quota. |

### 2.6 Regras de Negócio e Restrições

| **ID** | **Regra** |
|--------|-----------|
| **RN1** | Apenas utilizadores autenticados com permissão de edição podem iniciar ou cancelar uma execução de deteção num projeto. |
| **RN2** | `people_ai` deteta apenas a classe pessoa; `obj_ai` deteta as classes de objetos suportadas pelo modelo YOLO configurado. |
| **RN3** | Cada deteção deve incluir, no mínimo, a classe, a confiança, o índice ou instante do fotograma e uma caixa delimitadora em coordenadas normalizadas. |
| **RN4** | A execução de ferramentas de IA está sujeita à quota diária do perfil gratuito; o perfil premium tem uso ilimitado segundo a regra atual do serviço de utilizadores. A unidade de cobrança específica para vídeo deve ser definida antes da implementação. |
| **RN5** | O vídeo original é imutável. Os resultados são armazenados como artefactos separados e devem manter uma referência à execução que os produziu. |
| **RN6** | Uma execução só pode ser considerada concluída quando todos os fotogramas e ferramentas selecionadas terminarem com sucesso. |
| **RN7** | O processamento deve permanecer assíncrono: o pedido web não deve esperar pela duração total do vídeo; o progresso e o estado final devem ser comunicados por eventos do WebSocket Gateway. |
| **RN8** | O acesso ao vídeo e aos resultados deve respeitar as permissões do projeto e as URLs temporárias do serviço de armazenamento. |

### 2.7 Assunções

| **ID** | **Assunção** |
|--------|--------------|
| **A1** | A primeira versão suporta um conjunto limitado de formatos e codecs, definido pela implementação e validado antes de a execução entrar na fila. |
| **A2** | O armazenamento de objetos continua a ser o SeaweedFS compatível com S3 usado pelo projeto; o volume partilhado existente pode ser usado apenas como espaço temporário de processamento. |
| **A3** | A arquitetura atual de filas por ferramenta e a fila `ws_queue` podem ser estendidas para vídeo sem tornar o processamento síncrono. |
| **A4** | Os workers conseguem processar os fotogramas de forma sequencial ou em lotes sem carregar o vídeo inteiro em memória. |
| **A5** | O resultado estruturado é a saída obrigatória da primeira versão; a geração de vídeo anotado pode ser ativada como opção se o custo de armazenamento e processamento for aceitável. |

### 2.8 Questões em Aberto

| **ID** | **Questão** |
|--------|-------------|
| **Q1** | Quais são exatamente os formatos, codecs, tamanhos máximos e durações máximas suportados na primeira versão? |
| **Q2** | A quota deve ser debitada por vídeo, por ferramenta selecionada, por duração ou por número de fotogramas processados? |
| **Q3** | O resultado estruturado deve ser JSON, CSV ou ambos, e qual será o contrato de versionamento desse formato? |
| **Q4** | O vídeo anotado faz parte da primeira entrega ou fica limitado ao resultado estruturado? |
| **Q5** | O progresso deve ser comunicado por percentagem de fotogramas processados, por etapas do pipeline ou por ambos? |
| **Q6** | O cancelamento deve interromper imediatamente a inferência atual ou apenas impedir a publicação dos resultados e limpar a execução? |
| **Q7** | Deve ser possível retomar uma execução interrompida a partir do último fotograma concluído? |

---

## 3. Utilização de agentes de IA

| **Ferramenta / *skill*** | **Tarefa apoiada** | **Validação realizada pela equipa** |
|--------------------------|--------------------|--------------------------------------|
| Copilot SDK no VS Code | Revisão do caso de uso existente, comparação com o código do PictuRAS e reformulação dos fluxos, exceções e regras de negócio. | Leitura manual do repositório, da documentação da Fase 1 e da arquitetura; confirmação de que a entrada atual é imagem/ZIP, de que `people_ai`/`obj_ai` produzem resultados de texto para imagens e de que vídeo ainda é uma extensão proposta. |

---

## Lista de verificação antes de entregar (Exercício 1)

- [x] Secções 0 a 3 preenchidas e texto de ajuda (`>` e `{…}`) removido.
- [x] Funcionalidade de vídeo escolhida **e justificada** no contexto do MVP.
- [x] Ator principal identificado, com o respetivo perfil.
- [x] Caso de uso com fluxo principal, **≥1 fluxo alternativo** e **≥1 exceção específica de vídeo**.
- [x] Pós-condições com garantia de sucesso **e** garantia mínima.
- [x] Regras de negócio e restrições preenchidas.
- [x] Assunções e questões em aberto registadas.
- [x] Utilização de agentes de IA documentada.

---
---

## 4. Esboço de requisitos derivados

Os requisitos seguintes são derivados diretamente dos passos, fluxos alternativos, exceções,
regras de negócio e pós-condições definidos na secção 2. Os limites ainda em decisão são
identificados como questões em aberto e não são tratados como requisitos fechados.

### 4.1 Requisitos de Sistema

| **ID** | **Requisito** | **Tipo** | **Prioridade** | **Novo/Alt** | **Origem** | **Como verificar** |
|--------|---------------|----------|----------------|--------------|------------|---------------------|
| REQ-VID-DETECT-001 | O sistema deve permitir ao utilizador registado com permissão de edição submeter um vídeo num projeto. | F | Deve ter | NOVO | Passo 1; RN1 | Dado um utilizador autenticado com permissão de edição, quando submete um vídeo num projeto, então o sistema aceita o pedido e inicia a validação. |
| REQ-VID-DETECT-002 | O sistema deve validar o tipo MIME, a extensão, o tamanho, a duração e a integridade do vídeo antes de o enfileirar. | F | Deve ter | NOVO | Passo 2; Exceção 2 | Dado um vídeo, quando o utilizador o submete, então cada validação é executada antes da criação da execução. |
| REQ-VID-DETECT-003 | O sistema deve permitir ao utilizador selecionar `people_ai`, `obj_ai` ou ambas as ferramentas. | F | Deve ter | ALT | Passo 3; FA3; RN2 | Dado um projeto com vídeo válido, quando o utilizador abre a configuração, então pode selecionar cada uma das ferramentas disponíveis. |
| REQ-VID-DETECT-004 | O sistema deve permitir ao utilizador configurar o limiar de confiança para as ferramentas de deteção selecionadas, quando essa opção estiver disponível. | F | Deveria ter | NOVO | Passo 3 | Dado um utilizador com uma ferramenta selecionada e a configuração de limiar disponível, quando ajusta o valor, então o processamento aplica o limiar definido às deteções. |
| REQ-VID-DETECT-005 | O sistema deve rejeitar a confirmação quando o utilizador não tiver selecionado pelo menos uma ferramenta de deteção. | F | Deve ter | NOVO | Passo 3 | Dado um vídeo válido sem ferramenta selecionada, quando o utilizador confirma, então o sistema rejeita o pedido e não cria uma execução. |
| REQ-VID-DETECT-006 | O sistema deve calcular as operações avançadas necessárias com base nas ferramentas selecionadas e na política de cobrança ativa para vídeo. | F | Deve ter | ALT | Passo 4; RN4 | Dado um vídeo e uma seleção de ferramentas, quando o utilizador confirma, então o número de operações calculado corresponde à política de cobrança ativa. |
| REQ-VID-DETECT-007 | O sistema deve verificar e reservar a quota antes de enfileirar uma execução. | F | Deve ter | ALT | Passo 4; Exceção 3; RN4 | Dado um utilizador com quota insuficiente, quando confirma o processamento, então a execução não é enfileirada nem são reservadas operações. |
| REQ-VID-DETECT-008 | O sistema deve guardar o vídeo original sem o alterar e associá-lo ao projeto antes do processamento. | F | Deve ter | ALT | Passo 5; RN5; Pós-condição de sucesso | Dado um vídeo aceite, quando a execução é criada, então o vídeo original pode ser recuperado do projeto e mantém o seu conteúdo. |
| REQ-VID-DETECT-009 | O sistema deve criar uma execução com estado `pendente` e uma referência ao projeto e ao vídeo submetido. | F | Deve ter | NOVO | Passo 5; RN6 | Dado um vídeo validado, quando é aceite para processamento, então existe uma execução pendente com as referências corretas. |
| REQ-VID-DETECT-010 | O sistema deve enfileirar a execução para processamento assíncrono. | F | Deve ter | ALT | Passo 6; RN7; A3 | Dada uma execução pendente, quando a reserva de quota termina com sucesso, então é publicada uma mensagem para o processamento sem bloquear o pedido web até ao fim do vídeo. |
| REQ-VID-DETECT-011 | O sistema deve extrair os fotogramas do vídeo e executar todas as ferramentas selecionadas em cada fotograma. | F | Deve ter | NOVO | Passo 6; FA3; RN2; RN6 | Dado um vídeo e uma ou duas ferramentas selecionadas, quando o worker processa a execução, então todos os fotogramas válidos são processados por todas as ferramentas selecionadas. |
| REQ-VID-DETECT-012 | O sistema deve associar a cada deteção o índice ou instante do fotograma, a classe, a confiança e a caixa delimitadora normalizada. | F | Deve ter | NOVO | Passo 6; FA1; RN3 | Dado um fotograma com deteções, quando o processamento termina, então cada registo contém os quatro campos obrigatórios. |
| REQ-VID-DETECT-013 | O sistema deve gerar um resultado estruturado com as deteções por fotograma. | F | Deve ter | NOVO | Passo 7; FA1; RN3 | Dado um processamento concluído, quando o utilizador consulta o resultado estruturado, então os registos estão agrupados ou identificados pelo respetivo fotograma. |
| REQ-VID-DETECT-014 | O sistema deve gerar um vídeo anotado quando o utilizador solicitar essa opção. | F | Deveria ter | NOVO | Passo 7; FA2 | Dado um processamento concluído com a opção de anotação ativa, quando o utilizador consulta os artefactos, então existe um vídeo com as caixas e os rótulos das deteções. |
| REQ-VID-DETECT-015 | O sistema deve manter o vídeo original separado dos resultados estruturados e do vídeo anotado. | F | Deve ter | NOVO | Passo 7; RN5; Pós-condição de sucesso | Dado um vídeo processado, quando se comparam o original e os resultados, então o original não foi sobrescrito. |
| REQ-VID-DETECT-016 | O sistema deve marcar a execução como concluída apenas depois de todas as ferramentas e fotogramas terminarem com sucesso. | F | Deve ter | NOVO | Passo 8; RN6 | Dado um processamento parcial, quando ainda existir um fotograma ou ferramenta por processar, então a execução não fica no estado concluído. |
| REQ-VID-DETECT-017 | O sistema deve notificar o utilizador da conclusão ou falha da execução através do WebSocket Gateway. | F | Deve ter | ALT | Passo 8; Exceções 4 e 5 | Dado um utilizador ligado ao projeto, quando a execução termina ou falha, então recebe um evento com o estado correspondente. |
| REQ-VID-DETECT-018 | O sistema deve permitir ao utilizador consultar e descarregar os resultados autorizados da execução. | F | Deve ter | NOVO | Passo 9; RN8 | Dado um resultado concluído e um utilizador autorizado, quando solicita a consulta ou descarga, então o sistema disponibiliza o artefacto correspondente. |
| REQ-VID-DETECT-019 | O sistema deve rejeitar um pedido de utilizador não autenticado ou sem permissão de edição sem guardar o vídeo nem reservar operações. | F | Deve ter | ALT | Exceção 1; RN1 | Dado um pedido sem autenticação ou permissão, quando tenta iniciar uma execução, então recebe erro e não são criados vídeo, execução ou reserva. |
| REQ-VID-DETECT-020 | O sistema deve rejeitar um vídeo inválido antes de o enfileirar e deve manter inalterados o projeto e a quota. | F | Deve ter | NOVO | Exceção 2 | Dado um vídeo com formato, codec, tamanho, duração ou conteúdo inválido, quando é submetido, então recebe erro e o estado do projeto e da quota não muda. |
| REQ-VID-DETECT-021 | O sistema deve informar o utilizador quando a quota diária do perfil gratuito for insuficiente. | F | Deve ter | ALT | Exceção 3 | Dado um utilizador gratuito sem quota suficiente, quando confirma o processamento, então recebe uma mensagem de limite diário e não é iniciado processamento. |
| REQ-VID-DETECT-022 | O sistema deve marcar a execução como falhada quando o armazenamento, o RabbitMQ ou um worker ficar indisponível. | F | Deve ter | ALT | Exceção 4 | Dado um serviço de infraestrutura indisponível, quando a execução tenta avançar, então fica falhada e o erro é registado. |
| REQ-VID-DETECT-023 | O sistema deve remover os recursos temporários e devolver as operações reservadas que não tenham sido consumidas quando uma execução falhar. | F | Deve ter | ALT | Exceção 4; Pós-condição mínima | Dado uma execução falhada com operações reservadas, quando termina a limpeza, então não existem temporários da execução e a parte não consumida é devolvida. |
| REQ-VID-DETECT-024 | O sistema deve impedir que resultados parciais sejam publicados como resultado final quando um worker falhar. | F | Deve ter | NOVO | Exceção 5; RN6; Pós-condição mínima | Dado um erro num fotograma, quando a execução termina, então o resultado não aparece como concluído nem substitui um resultado válido anterior. |
| REQ-VID-DETECT-025 | O sistema deve invalidar uma execução anterior quando o utilizador a cancelar ou iniciar uma nova execução. | F | Deve ter | ALT | Exceção 6; FA4 | Dada uma execução ativa, quando é cancelada ou substituída, então as mensagens tardias dessa execução não podem publicar um resultado final. |
| REQ-VID-DETECT-026 | O sistema deve permitir ao utilizador cancelar uma execução pendente ou em processamento. | F | Deveria ter | ALT | FA4 | Dada uma execução pendente ou em processamento, quando o utilizador autorizado cancela, então o pedido é aceite e a execução deixa de poder ser concluída. |
| REQ-VID-DETECT-027 | O sistema deve devolver as operações reservadas que não tenham sido consumidas após um cancelamento. | F | Deveria ter | ALT | FA4; Pós-condição mínima | Dado um cancelamento com operações ainda não consumidas, quando o cancelamento termina, então a quota do utilizador é corrigida pelo valor correspondente. |
| REQ-VID-DETECT-028 | O sistema deve processar o vídeo de forma assíncrona e devolver a confirmação de aceitação do pedido em, no máximo, 2 segundos para vídeos até 500 MB. | NF (Desempenho) | Deve ter | ALT | Passo 6; RN7; A3 | Dado um vídeo válido até 500 MB e serviços disponíveis, quando o utilizador confirma, então recebe a aceitação HTTP em até 2 segundos, sem esperar pelo processamento total. |
| REQ-VID-DETECT-029 | O sistema deve emitir pelo menos uma atualização de estado a cada 10% de fotogramas processados e emitir o estado final no máximo 5 segundos depois do último fotograma. | NF (Desempenho) | Deveria ter | ALT | Passo 8; A4 | Dado um vídeo com processamento em curso, quando cada múltiplo de 10% é atingido, então é emitida uma atualização; quando termina o último fotograma, então o estado final chega em até 5 segundos. |
| REQ-VID-DETECT-030 | O sistema deve conservar o vídeo original e os resultados concluídos durante pelo menos 30 dias, salvo eliminação explícita pelo utilizador. | NF (Fiabilidade) | Deveria ter | ALT | Pós-condições; RN5; RN8 | Dado um resultado concluído, quando passam 30 dias sem eliminação explícita, então o vídeo original e os artefactos continuam recuperáveis. |
| REQ-VID-DETECT-031 | O sistema deve garantir que uma execução cancelada ou falhada não altera o resultado concluído da execução anterior. | NF (Fiabilidade) | Deve ter | ALT | Exceções 4–6; Pós-condição mínima | Dado um resultado concluído anterior, quando uma nova execução falha ou é cancelada, então o resultado anterior permanece disponível e inalterado. |

### 4.2 Impacto no sistema existente

| **Elemento existente afetado** | **Impacto (Manter / Estender / Alterar)** | **Descrição do impacto** | **Requisitos relacionados** |
|--------------------------------|-------------------------------------------|--------------------------|-------------------------------|
| Interface de carregamento (`AppDropzone`, dashboard e área de submissão) | Estender | Aceitar vídeos além de PNG/JPEG/ZIP, apresentar validações específicas e permitir a seleção da operação de vídeo. | REQ-VID-DETECT-001, 002, 003, 004, 019, 020 |
| Frontend do projeto e biblioteca de resultados | Estender | Apresentar estado, progresso, deteções estruturadas, vídeo anotado e ações de consulta/descarga. | REQ-VID-DETECT-013, 014, 017, 018, 029 |
| API Gateway e serviço de projetos | Estender | Criar endpoints e modelos de execução de vídeo, mantendo autenticação, permissões de edição, versionamento e tokens de execução. | REQ-VID-DETECT-001, 005, 008, 009, 016, 019, 025, 026, 031 |
| Quota de operações avançadas do serviço de utilizadores | Alterar | Definir e aplicar a unidade de cobrança para vídeo, sem permitir débito quando a validação falha e com devolução do saldo não consumido. | REQ-VID-DETECT-006, 007, 021, 023, 027 |
| Pipeline de ferramentas e filas RabbitMQ | Estender | Adicionar mensagens de vídeo, extração de fotogramas, correlação por execução e combinação de `people_ai`/`obj_ai`, mantendo o processamento assíncrono. | REQ-VID-DETECT-010, 011, 012, 016, 022, 028 |
| Workers `people_ai` e `obj_ai` | Estender | Reutilizar a inferência existente para fotogramas e produzir deteções com referência temporal e formato comum. | REQ-VID-DETECT-011, 012, 013 |
| WebSocket Gateway e `ws_queue` | Estender | Publicar progresso, conclusão, falha e cancelamento na sala autorizada do utilizador/projeto. | REQ-VID-DETECT-017, 025, 029 |
| Image Storage Service / SeaweedFS e volume temporário | Estender | Armazenar o vídeo original e artefactos separados, fornecer acesso autorizado e limpar temporários após falha ou cancelamento. | REQ-VID-DETECT-008, 014, 015, 018, 023, 030 |
| Processamento atual de imagens | Manter | As ferramentas e projetos de imagens continuam a funcionar sem alteração para entradas PNG/JPEG/ZIP. | REQ-VID-DETECT-008, 015, 031 |

### 4.3 Matriz de Rastreabilidade

| **Elemento do Caso de Uso** | **Descrição abreviada** | **Requisito(s) de Sistema** |
|------------------------------|-------------------------|-------------------------------|
| Passo 1 | Abrir projeto e adicionar vídeo | REQ-VID-DETECT-001, 019 |
| Passo 2 | Selecionar e validar vídeo | REQ-VID-DETECT-002, 020 |
| Passo 3 | Selecionar ferramentas e configurar deteção | REQ-VID-DETECT-003, 004, 005 |
| Passo 4 | Confirmar, calcular e reservar quota | REQ-VID-DETECT-006, 007 |
| Passo 5 | Guardar original e criar execução pendente | REQ-VID-DETECT-008, 009 |
| Passo 6 | Enfileirar, extrair fotogramas e detetar | REQ-VID-DETECT-010, 011, 012, 028 |
| Passo 7 | Guardar resultados e vídeo anotado | REQ-VID-DETECT-013, 014, 015 |
| Passo 8 | Concluir e notificar | REQ-VID-DETECT-016, 017, 029 |
| Passo 9 | Consultar e descarregar | REQ-VID-DETECT-018, 030 |
| FA1 — Apenas deteções estruturadas | Produzir JSON/CSV por fotograma | REQ-VID-DETECT-013 |
| FA2 — Vídeo anotado | Produzir vídeo com caixas e rótulos | REQ-VID-DETECT-014, 015 |
| FA3 — Duas ferramentas | Combinar pessoas e objetos por fotograma | REQ-VID-DETECT-003, 006, 011, 012 |
| FA4 — Cancelamento | Invalidar execução e devolver quota não consumida | REQ-VID-DETECT-025, 026, 027, 031 |
| Exceção 1 | Rejeitar autenticação/permissão inválida | REQ-VID-DETECT-019 |
| Exceção 2 | Rejeitar vídeo não suportado | REQ-VID-DETECT-002, 020 |
| Exceção 3 | Rejeitar quota insuficiente | REQ-VID-DETECT-007, 021 |
| Exceção 4 | Tratar indisponibilidade de infraestrutura | REQ-VID-DETECT-022, 023, 031 |
| Exceção 5 | Tratar falha durante processamento | REQ-VID-DETECT-024, 031 |
| Exceção 6 | Invalidar execução substituída/cancelada | REQ-VID-DETECT-025, 027, 031 |
| Pós-condição de sucesso | Original, resultados, quota e notificação corretos | REQ-VID-DETECT-008, 013, 014, 015, 016, 017, 018 |
| Pós-condição mínima | Original preservado, sem resultado incompleto, limpeza e erro | REQ-VID-DETECT-015, 023, 024, 031 |
| RN1 | Autenticação e permissão de edição | REQ-VID-DETECT-001, 019 |
| RN2 | Classes e ferramentas suportadas | REQ-VID-DETECT-003, 011 |
| RN3 | Campos obrigatórios de cada deteção | REQ-VID-DETECT-012, 013 |
| RN4 | Quota free/premium e unidade de cobrança | REQ-VID-DETECT-006, 007, 021, 023, 027 |
| RN5 | Original imutável e artefactos separados | REQ-VID-DETECT-008, 015, 030 |
| RN6 | Conclusão apenas após pipeline completo | REQ-VID-DETECT-009, 011, 016, 024 |
| RN7 | Processamento assíncrono e eventos | REQ-VID-DETECT-010, 017, 028, 029 |
| RN8 | Acesso autorizado aos artefactos | REQ-VID-DETECT-018, 030 |
| A1 | Formatos e limites definidos antes da execução | REQ-VID-DETECT-002, 020 |
| A2 | SeaweedFS e espaço temporário | REQ-VID-DETECT-008, 015, 023 |
| A3 | Extensão das filas por ferramenta | REQ-VID-DETECT-010, 017 |
| A4 | Processamento sem carregar vídeo inteiro em memória | REQ-VID-DETECT-011, 028, 029 |
| A5 | Resultado estruturado obrigatório e anotação opcional | REQ-VID-DETECT-013, 014 |
| Garantia de cobertura | Todos os 31 requisitos aparecem na matriz; as questões Q1–Q7 permanecem decisões em aberto e não originam requisitos fechados. | REQ-VID-DETECT-001 a REQ-VID-DETECT-031 |
