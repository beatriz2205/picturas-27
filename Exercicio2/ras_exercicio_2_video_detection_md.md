# 📝 Exercício 2 — Dossiê de Requisitos do Sistema
### Especificação de Requisitos do Sistema · Fase 1: Suporte a Vídeo no PictuRAS

---

## 0. Identificação

| **Campo** | **Valor** |
|-----------|-----------|
| **Grupo / Equipa** | 1.1 |
| **Autores** | José Miguel Fernandes Cação |
| **Data** | 2026-10-14 |
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
| **Versão** | v2.0 |
| **Autor** | José Miguel Fernandes Cação |
| **Data** | 2026-10-14 |
| **Objetivo** | Permitir ao utilizador submeter um vídeo, selecionar deteção de pessoas e/ou objetos e obter um resultado com as deteções identificadas em cada fotograma, sem alterar o vídeo original. |
| **Âmbito** | Frontend, API Gateway, serviço de projetos, armazenamento de objetos, RabbitMQ, workers de IA e WebSocket Gateway do PictuRAS. |
| **Ator Principal** | Utilizador registado com permissão de edição no projeto; pode ter perfil gratuito ou premium. |
| **Stakeholders e Interesses** | - **Utilizador**: pretende analisar pessoas e objetos ao longo de um vídeo e consultar ou descarregar os resultados.<br>- **Proprietário do sistema**: pretende disponibilizar uma funcionalidade diferenciadora, controlando o consumo de recursos e as operações avançadas.<br>- **Equipa de desenvolvimento**: pretende reutilizar a arquitetura assíncrona existente e manter o processamento isolado em workers.<br>- **Administrador da infraestrutura**: pretende que os ficheiros temporários e os resultados não comprometam o armazenamento ou a estabilidade dos serviços. |
| **Pré-condições** | - O utilizador tem sessão iniciada e pode editar o projeto selecionado.<br>- O projeto existe e pode receber um novo conteúdo.<br>- O vídeo está num formato suportado pela implementação de vídeo (MP4/H.264) e respeita os limites de tamanho (≤ 500 MB) e duração (≤ 180 s gratuito, ≤ 600 s premium).<br>- Pelo menos uma ferramenta (`people_ai` ou `obj_ai`) está disponível e foi selecionada.<br>- O sistema consegue aceder ao armazenamento de objetos, ao RabbitMQ e aos workers necessários. |
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
| 7 | — | Persiste o resultado estruturado e, quando essa opção estiver ativa, o vídeo anotado. O vídeo original permanece inalterado. Limpa os fotogramas temporários locais. |
| 8 | — | Marca a execução como concluída e publica uma notificação através da fila do WebSocket Gateway. |
| 9 | Consulta o resultado ou solicita a sua descarga. | Apresenta o estado final, as deteções por fotograma e os artefactos disponíveis para visualização ou descarga via URLs temporárias. |

### 2.3 Fluxos Alternativos

| **Fluxo** | **Descrição** |
|-----------|---------------|
| **FA1 — Apenas deteções estruturadas** | O utilizador não solicita vídeo anotado. O sistema guarda apenas um resultado estruturado JSON com o índice/instante do fotograma, classe, confiança e caixa delimitadora normalizada. |
| **FA2 — Vídeo anotado** | O utilizador solicita a visualização das deteções. O worker sobrepõe caixas e rótulos aos fotogramas e produz um vídeo anotado (MP4/H.264), mantendo também o resultado estruturado para consulta. |
| **FA3 — Duas ferramentas no mesmo vídeo** | O utilizador seleciona `people_ai` e `obj_ai`. O sistema executa as duas deteções no mesmo pipeline e combina os resultados por fotograma; a quota é calculada para as duas ferramentas. |
| **FA4 — Cancelamento** | O utilizador cancela uma execução pendente ou em processamento. O sistema invalida a execução através do token, encerra a inferência cooperativamente, limpa os ficheiros temporários e devolve as operações reservadas ainda não consumidas. |

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
| **Garantia de Sucesso** | O vídeo original continua disponível no projeto; a execução fica concluída; o resultado estruturado e, se solicitado, o vídeo anotado ficam associados ao projeto; a quota reflete as operações efetivamente reservadas/consumidas; os temporários de trabalho são limpos; o utilizador é notificado da conclusão. |
| **Garantia Mínima** | O vídeo original não é alterado; uma execução incompleta não é apresentada como concluída; os temporários são removidos tanto quanto possível; o erro é registado e comunicado; as operações não consumidas são devolvidas segundo a política de quota. |

### 2.6 Regras de Negócio e Restrições

| **ID** | **Regra** |
|--------|-----------|
| **RN1** | Apenas utilizadores autenticados com permissão de edição podem iniciar ou cancelar uma execução de deteção num projeto. |
| **RN2** | `people_ai` deteta apenas a classe pessoa; `obj_ai` deteta as classes de objetos suportadas pelo modelo YOLO configurado. |
| **RN3** | Cada deteção deve incluir, no mínimo, a classe, a confiança, o índice ou instante do fotograma e uma caixa delimitadora em coordenadas normalizadas. |
| **RN4** | A execução de ferramentas de IA está sujeita à quota diária do perfil gratuito; o perfil premium tem uso ilimitado segundo a regra atual do serviço de utilizadores. A cobrança no MVP é fixada por execução de ferramenta solicitada. |
| **RN5** | O vídeo original é imutável. Os resultados são armazenados como artefactos separados e devem manter uma referência à execução que os produziu. |
| **RN6** | Uma execução só pode ser considerada concluída quando todos os fotogramas e ferramentas selecionadas terminarem com sucesso. |
| **RN7** | O processamento deve permanecer assíncrono: o pedido web não deve esperar pela duração total do vídeo; o progresso e o estado final devem ser comunicados por eventos do WebSocket Gateway. |
| **RN8** | O acesso ao vídeo e aos resultados deve respeitar as permissões do projeto e as URLs temporárias pré-assinadas do serviço de armazenamento. |

### 2.7 Assunções

| **ID** | **Assunção** |
|--------|--------------|
| **A1** | O MVP suporta contentor MP4 com codec de vídeo H.264 (AVC) e áudio AAC opcional; outros formatos (MOV, AVI, WebM) são validados e rejeitados no carregamento. |
| **A2** | O armazenamento de objetos continua a ser o SeaweedFS compatível com S3 usado pelo projeto; o volume partilhado local é utilizado exclusivamente como espaço temporário volátil de processamento de fotogramas. |
| **A3** | A arquitetura atual de filas por ferramenta no RabbitMQ e a fila `ws_queue` no WebSocket Gateway são estendidas para vídeo sem quebrar a assincronia nem os eventos existentes. |
| **A4** | Os workers extraem e processam os fotogramas de forma sequencial ou em lotes temporais reduzidos, evitando carregar o vídeo completo ou todos os fotogramas em memória RAM. |
| **A5** | O resultado estruturado é fornecido obrigatoriamente em formato JSON normalizado; a geração do vídeo anotado MP4 é opcional sob pedido explícito do utilizador. |

### 2.8 Questões em Aberto

| **ID** | **Questão** | **Estado na Aula 02 / Exercício 2** |
|--------|-------------|-------------------------------------|
| **Q1** | Quais são exatamente os formatos, codecs, tamanhos máximos e durações máximas suportados na primeira versão? | **Fechada para o MVP via DQ-001:** MP4/H.264, máx 500 MB; duração ≤ 180 s (gratuito) e ≤ 600 s (premium). |
| **Q2** | A quota deve ser debitada por vídeo, por ferramenta selecionada, por duração ou por número de fotogramas processados? | **Fechada para o MVP via RN4:** débito fixo de 1 operação por ferramenta selecionada por execução; métrica granular por fotograma/duração fica em estudo para a Fase 2. |
| **Q3** | O resultado estruturado deve ser JSON, CSV ou ambos, e qual será o contrato de versionamento desse formato? | **Fechada para o MVP via DQ-005:** formato estruturado JSON com schema versionado v1.0; CSV delegado para evolução pós-MVP. |
| **Q4** | O vídeo anotado faz parte da primeira entrega ou fica limitado ao resultado estruturado? | **Fechada para o MVP via FA2 / REQ-VID-DETECT-014:** suportado como opção gerada sob pedido explícito. |
| **Q5** | O progresso deve ser comunicado por percentagem de fotogramas processados, por etapas do pipeline ou por ambos? | **Fechada para o MVP via REQ-VID-DETECT-029:** percentagem numérica de fotogramas calculada pelo worker e comunicada a cada 10% via WebSocket. |
| **Q6** | O cancelamento deve interromper imediatamente a inferência atual ou apenas impedir a publicação dos resultados e limpar a execução? | **Fechada para o MVP via DQ-006 / REQ-VID-DETECT-035:** cancelamento cooperativo: interrompe a extração de novos fotogramas, descarta os resultados pendentes e limpa temporários. |
| **Q7** | Deve ser possível retomar uma execução interrompida a partir do último fotograma concluído? | **Aberta para a Fase 2:** no MVP a falha aborta a execução sem retoma automática (*fail-fast* com garantia mínima consistente). |

---

## 3. Utilização de agentes de IA

| **Ferramenta / *skill*** | **Tarefa apoiada** | **Validação realizada pela equipa** |
|--------------------------|--------------------|--------------------------------------|
| Claude Code / Copilot | No Exercício 1: elaboração inicial da especificação dos fluxos e regras do caso de uso de vídeo. | Revisão manual do repositório, confirmação do funcionamento dos serviços atuais de imagens e restrições da arquitetura assíncrona. |
| Antigravity AI Assistant | No Exercício 2: derivação da ERS formal, classificação dos requisitos de qualidade segundo a ISO/IEC 25010, distinção entre alvos MVP e produção, definição dos critérios *Dado… Quando… Então…* e mapeamento da matriz de rastreabilidade completa. | Validação técnica pela equipa para assegurar que os alvos do MVP são realistas e executáveis na Fase 1, que o padrão "O sistema deve..." é rigorosamente seguido, e que não existem requisitos órfãos nem elementos descobertos. |

---

## 4. Especificação de Requisitos do Sistema (ERS)

**Caso de Uso:** UC-VID-001 — Detetar Pessoas e Objetos num Vídeo  
**Versão do dossiê:** v2.0  
**Baseline do Exercício 1:** v1.2 (REQ-VID-DETECT-001 a REQ-VID-DETECT-031)

### 4.1 Requisitos da ERS

#### 4.1.1 Requisitos Funcionais

| **ID** | **Requisito** | **Prioridade** | **Evolução** | **Novo/Alt** | **Origem (UC / RN / decisão)** | **Justificação** | **Critério de aceitação / verificação** |
|--------|---------------|----------------|--------------|--------------|--------------------------------|------------------|----------------------------------------|
| REQ-VID-DETECT-001 | O sistema deve permitir ao utilizador registado com permissão de edição submeter um ficheiro de vídeo num projeto. | Deve ter | Mantido | NOVO | Passo 1; RN1 | Ponto de entrada fundamental da funcionalidade de vídeo na plataforma. | Dado um utilizador autenticado com permissão de edição num projeto existente, quando submete um ficheiro de vídeo, então o sistema aceita o pedido e inicia a cadeia de validação. |
| REQ-VID-DETECT-002 | O sistema deve validar a extensão, o tipo MIME, a integridade do contentor, o tamanho e a duração do ficheiro de vídeo antes de aceitar a submissão. | Deve ter | Refinado | NOVO | Passo 2; Exceção 2; DQ-001 | Impede o enfileiramento de ficheiros maliciosos, corrompidos ou que ultrapassem a capacidade computacional dimensionada. | Dado um ficheiro submetido, quando o sistema inspeciona o ficheiro, então valida extensão `.mp4`, MIME `video/mp4`, integridade do contentor, tamanho ≤ 500 MB e duração dentro do limite do perfil do utilizador. |
| REQ-VID-DETECT-003 | O sistema deve permitir ao utilizador selecionar a ferramenta de deteção de pessoas (`people_ai`), a ferramenta de deteção de objetos (`obj_ai`) ou ambas em simultâneo. | Deve ter | Mantido | ALT | Passo 3; FA3; RN2 | Permite flexibilidade de análise e reutiliza os modelos de IA disponíveis na plataforma para imagens. | Dado um vídeo válido no projeto, quando o utilizador acede à configuração de análise, então pode selecionar individualmente ou em conjunto as ferramentas `people_ai` e `obj_ai`. |
| REQ-VID-DETECT-004 | O sistema deve permitir ao utilizador configurar o limiar de confiança (score mínimo de deteção entre 0.0 e 1.0) para as ferramentas selecionadas. | Deveria ter | Mantido | NOVO | Passo 3 | Permite filtrar falsos positivos ou afinar a sensibilidade da deteção de acordo com as necessidades do utilizador. | Dado um utilizador que selecionou uma ferramenta de deteção, quando ajusta o limiar de confiança para um valor válido (e.g. 0.65), então o worker aplica esse filtro a todas as caixas detetadas nos fotogramas. |
| REQ-VID-DETECT-005 | O sistema deve rejeitar a submissão de processamento quando nenhuma ferramenta de deteção estiver selecionada. | Deve ter | Mantido | NOVO | Passo 3 | Garante que não são criadas execuções vazias nem consumidos recursos computacionais sem objetivo. | Dado um vídeo válido sem qualquer ferramenta assinalada, quando o utilizador clica em confirmar processamento, então o sistema bloqueia o envio e exibe um aviso orientando a selecionar pelo menos uma ferramenta. |
| REQ-VID-DETECT-006 | O sistema deve calcular as operações avançadas necessárias com base nas ferramentas de deteção selecionadas e na política de quota ativa. | Deve ter | Refinado | ALT | Passo 4; RN4 | Garante previsibilidade e transparência no consumo de quota antes de iniciar o processamento intensivo. | Dado um utilizador com vídeo validado, quando confirma o pedido com 1 ou 2 ferramentas selecionadas, então o sistema calcula o débito de 1 operação avançada por ferramenta de IA requerida. |
| REQ-VID-DETECT-007 | O sistema deve verificar o saldo da quota diária do utilizador e efetuar a reserva atómica das operações antes de autorizar o processamento. | Deve ter | Mantido | ALT | Passo 4; Exceção 3; RN4 | Evita condição de corrida na utilização de quotas e garante que utilizadores gratuitos não excedem o limite estabelecido. | Dado um utilizador gratuito com saldo insuficiente para as operações calculadas, quando tenta submeter a análise, então o sistema rejeita a operação com mensagem explícita e não altera o saldo nem cria execução. |
| REQ-VID-DETECT-008 | O sistema deve persistir o ficheiro de vídeo original no armazenamento de objetos SeaweedFS sem qualquer alteração do seu conteúdo binário. | Deve ter | Mantido | ALT | Passo 5; RN5; Pós-condição de sucesso | Preserva a integridade e rastreabilidade do ficheiro de entrada para reprocessamento ou descarga. | Dado um vídeo validado e aceite, quando é transferido para o armazenamento do projeto, então o hash criptográfico do ficheiro armazenado corresponde exatamente ao do ficheiro submetido. |
| REQ-VID-DETECT-009 | O sistema deve criar um registo de execução no serviço de projetos com estado inicial `pendente`, associando os identificadores do projeto, utilizador, vídeo e ferramentas. | Deve ter | Mantido | NOVO | Passo 5; RN6 | Permite o acompanhamento unificado do ciclo de vida da tarefa e auditoria operacional. | Dado um vídeo armazenado com reserva de quota bem-sucedida, quando o sistema regista a tarefa, então é gerado um ID de execução exclusivo com estado `pendente` e token de versão associado. |
| REQ-VID-DETECT-010 | O sistema deve enfileirar a mensagem de execução na fila RabbitMQ correspondente para processamento assíncrono pelos workers. | Deve ter | Mantido | ALT | Passo 6; RN7; A3 | Desacopla o tempo de resposta da interface Web do tempo de computação de visão computacional. | Dada uma execução com estado `pendente`, quando a mensagem é publicada no RabbitMQ, então o endpoint HTTP responde imediatamente ao utilizador sem aguardar pela conclusão do vídeo. |
| REQ-VID-DETECT-011 | O worker do sistema deve extrair os fotogramas sequencialmente do vídeo e executar os modelos de deteção selecionados sobre cada fotograma. | Deve ter | Mantido | NOVO | Passo 6; FA3; RN2; RN6 | Garante a cobertura temporal completa da análise visual de pessoas e objetos ao longo de todo o conteúdo. | Dado um vídeo enfileirado para processamento, quando o worker inicia a tarefa, então itera sobre cada fotograma válido do vídeo e submete-o à inferência das ferramentas indicadas. |
| REQ-VID-DETECT-012 | O sistema deve estruturar cada deteção encontrada com o instante temporal em segundos, número de índice do fotograma, rótulo da classe, score de confiança e coordenadas normalizadas da caixa delimitadora `[ymin, xmin, ymax, xmax]`. | Deve ter | Mantido | NOVO | Passo 6; FA1; RN3 | Padroniza a representação espacial e temporal dos resultados independentemente da resolução nativa do vídeo. | Dado um fotograma com deteções reconhecidas pelo modelo YOLO, quando o worker regista o resultado, então cada ocorrência inclui exatamente os cinco campos normalizados obrigatórios. |
| REQ-VID-DETECT-013 | O sistema deve consolidar e persistir um ficheiro estruturado em formato JSON com o sumário e as deteções completas organizadas por fotograma. | Deve ter | Refinado | NOVO | Passo 7; FA1; RN3; DQ-005 | Fornece um contrato estruturado legível por máquina para consumo pela interface e integração externa. | Dado um processamento terminado com sucesso, quando os resultados são consolidados, então é gerado um ficheiro `detections.json` em conformidade com o schema versionado da plataforma. |
| REQ-VID-DETECT-014 | O sistema deve gerar um novo ficheiro de vídeo anotado com caixas delimitadoras e rótulos sobrepostos quando essa opção for solicitada pelo utilizador. | Deveria ter | Mantido | NOVO | Passo 7; FA2 | Permite inspeção visual intuitiva e imediata das deteções diretamente no leitor de vídeo. | Dado um pedido de processamento com a opção de anotação ativa, quando o worker conclui a inferência, então codifica um novo ficheiro de vídeo MP4 contendo as anotações visuais sobrepostas. |
| REQ-VID-DETECT-015 | O sistema deve armazenar o resultado estruturado e o vídeo anotado como artefactos independentes, preservando intacto o ficheiro original. | Deve ter | Mantido | NOVO | Passo 7; RN5; Pós-condição de sucesso | Garante idempotência, imutabilidade da fonte de dados e suporte a múltiplas versões de análise sobre o mesmo vídeo. | Dado o término da geração de resultados, quando os artefactos são persistidos no SeaweedFS, então são criados novos caminhos de armazenamento mantendo inalterado o ficheiro de origem. |
| REQ-VID-DETECT-016 | O sistema deve atualizar o estado da execução para `concluido` apenas após a persistência bem-sucedida de todos os artefactos previstos. | Deve ter | Mantido | NOVO | Passo 8; RN6 | Evita que execuções truncadas ou incompletas sejam publicitadas como válidas aos utilizadores. | Dado o processamento do último fotograma, quando a escrita de todos os ficheiros de resultado for confirmada pelo armazenamento, então o estado da execução passa a `concluido`. |
| REQ-VID-DETECT-017 | O sistema deve publicar notificações de atualização de estado, percentagem de progresso e conclusão através do WebSocket Gateway para a sala do projeto. | Deve ter | Mantido | ALT | Passo 8; Exceções 4 e 5; RN7 | Mantém o utilizador informado em tempo real na interface sem necessidade de polling HTTP periódico. | Dado um cliente com WebSocket subscrito ao tópico do projeto, quando o estado da tarefa muda ou a percentagem atinge novo patamar, então o cliente recebe imediatamente uma mensagem de evento formatada. |
| REQ-VID-DETECT-018 | O sistema deve permitir ao utilizador autorizado consultar os metadados de deteção e descarregar os artefactos gerados da execução. | Deve ter | Mantido | NOVO | Passo 9; RN8 | Concretiza a entrega de valor da funcionalidade permitindo a exploração e exportação dos resultados. | Dado um utilizador com permissão de leitura no projeto, quando solicita o resultado de uma execução concluída, então recebe as URLs de descarga válidas para o JSON e para o vídeo anotado. |
| REQ-VID-DETECT-019 | O sistema deve rejeitar pedidos de submissão de utilizadores não autenticados ou sem permissão de escrita no projeto selecionado. | Deve ter | Mantido | ALT | Exceção 1; RN1 | Assegura a integridade do controlo de acessos e impede utilização indevida da infraestrutura de IA. | Dado um pedido sem token JWT válido ou de utilizador sem papel de editor no projeto, quando tenta submeter vídeo, então a API Gateway rejeita com HTTP 401 ou 403 sem criar recursos. |
| REQ-VID-DETECT-020 | O sistema deve rejeitar o ficheiro antes do enfileiramento caso apresente formato inválido, codec incompatível, duração ou tamanho superiores ao limite. | Deve ter | Mantido | NOVO | Exceção 2; DQ-001 | Protege os nós de computação de receberem tarefas impossíveis de concluir, poupando largura de banda e filas. | Dado um ficheiro `.avi` ou um `.mp4` de 700 MB, quando a validação preliminar é executada, então o pedido é recusado com erro 400 descritivo e nenhuma operação é debitada. |
| REQ-VID-DETECT-021 | O sistema deve apresentar mensagem informativa contextual quando a quota diária do utilizador gratuito for atingida. | Deve ter | Mantido | ALT | Exceção 3; RN4 | Melhora a usabilidade e elucida o utilizador sobre os limites do seu plano e opções de upgrade para premium. | Dado um utilizador sem saldo diário de operações, quando acede à tela de processamento, então visualiza aviso de limite diário atingido com a indicação da hora de renovação da quota. |
| REQ-VID-DETECT-022 | O sistema deve marcar a execução com estado `falhado` e registar logs detalhados quando ocorrer indisponibilidade de RabbitMQ, SeaweedFS ou workers. | Deve ter | Mantido | ALT | Exceção 4 | Garante visibilidade operacional de erros de infraestrutura e evita que trabalhos fiquem bloqueados indefinidamente. | Dada a queda de ligação com o broker de mensagens ou armazenamento, quando o serviço deteta o timeout, então atualiza o estado para `falhado` e emite alerta operacional. |
| REQ-VID-DETECT-023 | O sistema deve libertar os recursos temporários e estornar a reserva de quota de operações quando a execução terminar em estado `falhado`. | Deve ter | Mantido | ALT | Exceção 4; Pós-condição mínima | Garante justiça comercial e integridade do armazenamento em situações de falha não imputáveis ao utilizador. | Dada uma execução que falhou durante o processamento, quando a rotina de encerramento é acionada, então os ficheiros temporários são apagados e a quota reservada é reposta na totalidade. |
| REQ-VID-DETECT-024 | O sistema deve impedir a disponibilização de resultados parciais ou inconsistentes como resultado final em caso de interrupção abrupta do worker. | Deve ter | Mantido | NOVO | Exceção 5; RN6; Pós-condição mínima | Evita a contaminação da tomada de decisão do utilizador com dados parciais considerados definitivos. | Dado que um worker falha a meio da inferência (e.g. aos 50% dos fotogramas), quando o watchdog sinaliza a falha, então nenhum artefacto parcial é publicado no projeto como resultado concluído. |
| REQ-VID-DETECT-025 | O sistema deve invalidar qualquer execução ativa quando o utilizador iniciar uma nova execução no mesmo projeto ou submeter cancelamento. | Deve ter | Mantido | ALT | Exceção 6; FA4 | Assegura consistência de estado prevenindo condições de corrida entre execuções concorrentes no mesmo projeto. | Dada uma execução A em curso, quando o utilizador submete uma nova execução B, então o token de A é revogado e qualquer mensagem remanescente de A é ignorada no retorno. |
| REQ-VID-DETECT-026 | O sistema deve permitir ao utilizador cancelar a qualquer momento uma execução com estado `pendente` ou `em_processamento`. | Deveria ter | Mantido | ALT | FA4; DQ-006 | Concede controlo ao utilizador sobre tarefas longas iniciadas por engano ou tornadas desnecessárias. | Dado um processamento em curso, quando o utilizador prime **Cancelar**, então a API Gateway emite sinal de interrupção e a execução transita para o estado `cancelado`. |
| REQ-VID-DETECT-027 | O sistema deve devolver à quota do utilizador as operações reservadas e não consumidas quando ocorre um cancelamento com sucesso. | Deveria ter | Mantido | ALT | FA4; Pós-condição mínima | Harmoniza o modelo de cobrança com o princípio de apenas faturar computação efetivamente concluída. | Dado um cancelamento aceite pelo sistema, quando a confirmação de interrupção é processada, então as operações previamente retidas são reintegradas no saldo do utilizador. |
| REQ-VID-DETECT-032 | O sistema deve restringir o suporte no MVP estritamente a contentores MP4 codificados em H.264/AVC com resolução até 1080p, duração máxima de 180 s (gratuito) ou 600 s (premium) e tamanho até 500 MB. | Deve ter | Novo | NOVO | Passo 2; RN1; DQ-001 | Foca o esforço da Fase 1 num padrão universal e estável, reduzindo riscos de decodificação e transcodificação. | Dado um vídeo com codec H.264 e 1080p ≤ 180 s, quando submetido por utilizador gratuito, então é validado com sucesso; se tiver 200 s, é rejeitado com mensagem de duração excedida. |
| REQ-VID-DETECT-033 | O sistema deve eliminar automaticamente do volume partilhado local todos os fotogramas temporários descompactados e ficheiros de trabalho logo após o término (sucesso, falha ou cancelamento) de cada execução. | Deve ter | Novo | NOVO | Passo 7; Pós-condição mínima; DQ-004 | Previne a exaustão rápida de espaço em disco nos nós de execução resultante do grande volume de imagens geradas. | Dado o término do processamento de um vídeo de 1000 fotogramas, quando a execução fecha, então o diretório temporário correspondente em `/tmp/picturas_frames/` encontra-se completamente vazio. |
| REQ-VID-DETECT-034 | O sistema deve processar cada submissão de vídeo como uma tarefa independente, excluindo explicitamente o encadeamento com ferramentas de imagem e o processamento em lote no MVP. | Deve ter | Novo | ALT | RN7; DQ-006 | Mantém o âmbito do MVP delimitado e viável, evitando complexidade combinatória prematura entre pipelines heterogéneos. | Dado um vídeo submetido, quando o utilizador consulta as opções de processamento, então o sistema apenas disponibiliza deteção isolada de vídeo, impedindo o encadeamento com filtros de imagem. |
| REQ-VID-DETECT-035 | O worker deve verificar periodicamente o token da execução entre lotes de fotogramas e abortar a inferência imediatamente caso a execução tenha sido cancelada ou substituída. | Deve ter | Novo | NOVO | FA4; Exceção 6; DQ-006 | Evita desperdício contínuo de ciclos de CPU/GPU em tarefas cujo utilizador já cancelou o interesse. | Dado um vídeo de 3000 fotogramas em processamento no fotograma 500, quando o utilizador cancela a tarefa, então o worker deteta a revogação do token e encerra a computação em menos de 3 segundos. |

---

#### 4.1.2 Requisitos Não Funcionais e de Qualidade

Classificados de acordo com o modelo de qualidade de software **ISO/IEC 25010**.

| **ID** | **Requisito** | **Característica ISO/IEC 25010** | **Alvo MVP** | **Alvo produção** | **Evolução** | **Origem (UC / DQ)** | **Critério de aceitação / verificação** |
|--------|---------------|----------------------------------|--------------|-------------------|--------------|----------------------|----------------------------------------|
| REQ-VID-DETECT-028 | O sistema deve responder à submissão do vídeo confirmando a aceitação do pedido e devolvendo a resposta HTTP em tempo estritamente limitado, desacoplado da duração do vídeo. | Eficiência de Desempenho (Comportamento temporal) | ≤ 2,0 segundos para vídeos até 500 MB em rede local/teste | ≤ 1,0 segundo para vídeos até 1 GB com carregamento direto (*direct-to-S3*) | Refinado | Passo 6; RN7; A3 | Medição do tempo entre o início do POST HTTP de submissão do vídeo e a receção do payload JSON 202 Accepted contendo o ID da execução. |
| REQ-VID-DETECT-029 | O sistema deve publicar atualizações incrementais do progresso do processamento de vídeo via WebSocket, mantendo a cadência e latência de notificação final dentro dos limites definidos. | Usabilidade (Reconhecimento de estado) / Desempenho | Atualizações a cada múltiplo de 10% de fotogramas processados; estado final emitido em ≤ 5,0 s após último fotograma | Atualizações a cada 2% de fotogramas (ou a cada 1 segundo); estado final emitido em ≤ 1,0 s após conclusão | Refinado | Passo 8; A4; DQ-005 | Monitorização das mensagens no tópico WebSocket durante o processamento de um vídeo de teste de 60 segundos com 1800 fotogramas. |
| REQ-VID-DETECT-030 | O sistema deve garantir a retenção e disponibilidade contínua do vídeo original e de todos os artefactos gerados durante um período temporal mínimo garantido. | Fiabilidade (Disponibilidade / Maturidade) | Retenção garantida de 30 dias no SeaweedFS, salvo eliminação manual pelo utilizador | Retenção configurável por projeto (mínimo 90 dias) com transição automática para armazenamento hierárquico frio (*cold storage*) | Refinado | Pós-condições; RN5; RN8 | Verificação periódica de integridade e acessibilidade de artefactos gerados 30 dias após a execução num ambiente de persistência persistente. |
| REQ-VID-DETECT-031 | O sistema deve garantir que qualquer execução terminada em falha ou cancelamento não sobrescreve, corrompe ou torna inacessível o resultado concluído da execução anterior do mesmo vídeo. | Fiabilidade (Tolerância a falhas / Integridade) | Imutabilidade garantida: o resultado da execução v_anterior permanece associado ao projeto intacto | Versionamento completo com histórico de revisões auditável e possibilidade de reversão (*rollback*) em 1 clique | Refinado | Exceções 4–6; Pós-condição mínima | Injeção de falha deliberada na execução v2; validação de que a execução v1 continua ativa, consultável e sem corrupção no frontend. |
| REQ-VID-DETECT-036 | O worker de deteção deve processar os fotogramas de vídeo mantendo um débito mínimo médio de inferência sustentado em nós de computação padrão. | Eficiência de Desempenho (Utilização de recursos) | Débito médio sustentado ≥ 5 fotogramas por segundo (fps) em CPU padrão x86_64 com resolução 720p/1080p | Débito em tempo real ≥ 30 fps (ou tempo total de inferência inferior à duração do próprio vídeo) com aceleração GPU | Novo | Passo 6; A4; DQ-002 | Benchmark de execução com vídeo de 30 segundos (900 fotogramas); o tempo total de inferência do worker não pode exceder 180 segundos em CPU de referência. |
| REQ-VID-DETECT-037 | O acesso aos vídeos originais e resultados estruturados deve ser restrito exclusivamente a utilizadores autenticados com permissão, através de URLs pré-assinadas temporárias. | Segurança (Confidencialidade / Autenticidade) | URLs temporárias geradas pelo SeaweedFS com expiração estrita de 60 minutos | URLs temporárias pré-assinadas com expiração de 15 minutos, assinatura criptográfica HMAC-SHA256 e validação de IP/User-Agent | Novo | RN8; DQ-003 | Tentativa de acesso sem autenticação resulta em HTTP 403; tentativa de reutilização de URL após 61 minutos resulta em HTTP 403 Expired. |
| REQ-VID-DETECT-038 | O vídeo anotado produzido pelo sistema deve ser codificado num contentor e formato compatíveis com reprodução direta nativa nos navegadores Web modernos sem necessidade de plugins externos. | Compatibilidade (Interoperabilidade / Coexistência) | Contentor MP4 (vídeo H.264 Baseline/Main Profile, áudio AAC se presente) reproduzível em Chrome, Firefox e Safari | MP4 (H.264/H.265) e WebM (VP9/AV1) com geração adaptativa multi-resolução HLS/DASH | Novo | Passo 7; FA2; DQ-001 | Teste de reprodução do vídeo anotado gerado diretamente na tag `<video>` do frontend nos 3 principais browsers sem erros de decodificação. |
| REQ-VID-DETECT-039 | A arquitetura de ferramentas de vídeo deve manter desacoplamento modular, permitindo adicionar novos modelos de análise sem alterar o código dos serviços centrais ou de outras ferramentas. | Manutenibilidade (Modularidade / Modificabilidade) | Nova ferramenta implementada como consumidor RabbitMQ independente, consumindo formato de mensagem padrão sem tocar no API Gateway | Registo dinâmico de ferramentas via *Service Discovery* e especificação OpenAPI/gRPC com provisionamento dinâmico em Kubernetes | Novo | RN7; DQ-005 | Adição de um worker experimental (`face_ai`) ouvindo numa fila nova sem necessitar de recompilação ou redeployment dos workers `people_ai`/`obj_ai`. |
| REQ-VID-DETECT-040 | O ambiente de execução dos workers de vídeo deve ser completamente isolado e conteinerizado em Docker, incluindo todas as dependências nativas de multimédia e visão computacional. | Portabilidade (Adaptabilidade / Instalação) | Imagem Docker com Ubuntu/Debian, Python 3.10+, FFmpeg 5+ e dependências PyTorch/OpenCV pré-configuradas e testadas | Imagens multi-arquitetura (amd64 e arm64) otimizadas com camadas mínimas (*distroless/alpine*) e suporte dinâmico a drivers NVIDIA CUDA | Novo | A3; A4; DQ-005 | Execução de teste do contentor do worker a partir de imagem padrão em máquina virgem sem necessidade de instalar pacotes manuais no host. |

---

#### 4.1.3 Verificação da completude e dos limites do âmbito

| **Tópico a verificar** | **Aplicável?** | **Decisão / justificação** | **Requisito(s) relacionado(s)** |
|------------------------|---------------|----------------------------|---------------------------------|
| **Formato, codec, duração e dimensão do vídeo** | **Sim** | O MVP suporta contentores MP4 com codec H.264/AVC, com limite máximo de 500 MB por ficheiro. A duração máxima permitida é de 180 s para utilizadores registados gratuitos e 600 s para utilizadores premium. Outros formatos são rejeitados na validação preliminar. | REQ-VID-DETECT-002, 020, 032, 038 |
| **Estado, progresso, cancelamento e resultado** | **Sim** | O ciclo de vida compreende os estados `pendente`, `em_processamento`, `concluido`, `falhado` e `cancelado`. O progresso é publicado por WebSocket a cada 10% de fotogramas. O utilizador pode cancelar a execução a qualquer momento, sendo a inferência interrompida cooperativamente. O resultado consiste em JSON estruturado e, opcionalmente, vídeo anotado. | REQ-VID-DETECT-009, 010, 013, 014, 016, 017, 025, 026, 029, 035 |
| **Falhas durante o processamento** | **Sim** | Falhas de infraestrutura (broker, storage) ou erros na decodificação de fotogramas colocam a execução em estado `falhado`. Resultados parciais são descartados, o vídeo original é preservado intacto, os ficheiros temporários são purgados e a quota reservada não consumida é estornada na totalidade. Não há retoma automática no MVP (*fail-fast* limpo). | REQ-VID-DETECT-022, 023, 024, 031, 033 |
| **Persistência e expiração dos ficheiros** | **Sim** | O vídeo original e os artefactos finais gerados (JSON estruturado e vídeo anotado) são persistidos no SeaweedFS com garantia de retenção de 30 dias. Os fotogramas intermediários descompactados no volume local são apagados imediatamente após o término do trabalho. O acesso aos ficheiros expira via URLs pré-assinadas com validade de 60 minutos. | REQ-VID-DETECT-008, 015, 018, 030, 033, 037 |
| **Perfis e contagem de operações** | **Sim** | Aplica-se a utilizadores autenticados com perfil gratuito ou premium. Utilizadores anónimos não têm acesso. No MVP, cada execução de vídeo consome 1 operação avançada por ferramenta de IA solicitada (1 operação se apenas `people_ai`, 2 se `people_ai` + `obj_ai`). A quota é validada e reservada antes do enfileiramento e estornada em caso de falha ou cancelamento. | REQ-VID-DETECT-001, 006, 007, 019, 021, 023, 027, 032 |
| **Encadeamento de ferramentas e processamento em lote** | **Não (Fora do âmbito do MVP)** | **Exclusão explícita fundamentada:** No MVP, cada vídeo é submetido e processado isoladamente; não é permitido encadeamento sequencial com outras ferramentas de manipulação de imagem nem submissão em lote (*batch*) de múltiplos vídeos. Esta decisão decorre da necessidade de estabilizar o pipeline assíncrono de vídeo e o consumo de recursos antes de suportar grafos de execução complexos. | REQ-VID-DETECT-034 |

---

### 4.2 Impacto no sistema existente

| **Elemento existente afetado** | **Impacto (Manter / Estender / Alterar)** | **Descrição do impacto** | **Requisito(s) relacionado(s)** |
|--------------------------------|-------------------------------------------|--------------------------|--------------------------------|
| **Interface de carregamento** (`AppDropzone`, dashboard e área de submissão) | **Estender** | Passa a aceitar ficheiros `.mp4` até 500 MB em complemento a PNG/JPEG/ZIP; integra controlos de seleção de ferramentas de vídeo e ajuste opcional do limiar de confiança; adiciona validações no cliente para formatos e limites de duração antes do envio. | REQ-VID-DETECT-001, REQ-VID-DETECT-002, REQ-VID-DETECT-003, REQ-VID-DETECT-004, REQ-VID-DETECT-005, REQ-VID-DETECT-019, REQ-VID-DETECT-020, REQ-VID-DETECT-032 |
| **Frontend do projeto e biblioteca de resultados** | **Estender** | Adiciona leitor de vídeo com capacidade de sobreposição de anotações ou reprodução do vídeo anotado; apresenta barra de progresso em tempo real; disponibiliza visualizador de tabela/JSON de deteções e botões para descarga e cancelamento da tarefa. | REQ-VID-DETECT-013, REQ-VID-DETECT-014, REQ-VID-DETECT-017, REQ-VID-DETECT-018, REQ-VID-DETECT-026, REQ-VID-DETECT-029, REQ-VID-DETECT-038 |
| **API Gateway e serviço de projetos** | **Estender** | Cria novos endpoints REST (`POST /projects/:id/videos`, `POST /projects/:id/videos/:vid/detect`, `POST /executions/:id/cancel`); armazena o modelo de dados de execuções de vídeo com suporte a tokens de invalidação e estados do ciclo de vida assíncrono. | REQ-VID-DETECT-001, REQ-VID-DETECT-005, REQ-VID-DETECT-008, REQ-VID-DETECT-009, REQ-VID-DETECT-016, REQ-VID-DETECT-019, REQ-VID-DETECT-025, REQ-VID-DETECT-026, REQ-VID-DETECT-028, REQ-VID-DETECT-031, REQ-VID-DETECT-034, REQ-VID-DETECT-035 |
| **Quota de operações avançadas** (serviço de utilizadores / `users`) | **Alterar** | Adapta o subsistema de contabilidade de operações para aceitar débitos parametrizados por execução de ferramenta em vídeo, suportando o ciclo de pré-reserva, confirmação no sucesso e devolução atómica em caso de cancelamento ou falha. | REQ-VID-DETECT-006, REQ-VID-DETECT-007, REQ-VID-DETECT-021, REQ-VID-DETECT-023, REQ-VID-DETECT-027 |
| **Pipeline de mensagens RabbitMQ** | **Estender** | Introduz filas dedicadas para mensagens de processamento de vídeo (e.g. `video_detect_queue`), definindo payload com referências de armazenamento S3, parâmetros de confiança e correlação com a fila `ws_queue` para reporte de eventos. | REQ-VID-DETECT-010, REQ-VID-DETECT-011, REQ-VID-DETECT-012, REQ-VID-DETECT-016, REQ-VID-DETECT-022, REQ-VID-DETECT-028, REQ-VID-DETECT-039 |
| **Workers de Inteligência Artificial** (`people_ai` e `obj_ai`) | **Estender** | O código de inferência YOLO existente é reutilizado como motor de deteção de fotogramas individuais; é adicionada a lógica de orquestração de decodificação sequencial de fotogramas com OpenCV/FFmpeg, agregação de resultados e geração do vídeo anotado. | REQ-VID-DETECT-011, REQ-VID-DETECT-012, REQ-VID-DETECT-013, REQ-VID-DETECT-014, REQ-VID-DETECT-035, REQ-VID-DETECT-036, REQ-VID-DETECT-039, REQ-VID-DETECT-040 |
| **WebSocket Gateway** e fila `ws_queue` | **Estender** | Amplia os schemas de mensagens WebSocket para suportar eventos granulares de vídeo: `video_processing_progress` (com percentagem e fotograma atual), `video_processing_success`, `video_processing_failed` e `video_processing_cancelled`. | REQ-VID-DETECT-017, REQ-VID-DETECT-025, REQ-VID-DETECT-029 |
| **Serviço de Armazenamento** (SeaweedFS / Image Storage) e volume temporário | **Estender** | Configura buckets específicos para ficheiros de vídeo e resultados agregados; implementa geração de URLs pré-assinadas com expiração de 60 min; estabelece volume de disco partilhado com rotina de limpeza estrita de ficheiros intermediários. | REQ-VID-DETECT-008, REQ-VID-DETECT-014, REQ-VID-DETECT-015, REQ-VID-DETECT-018, REQ-VID-DETECT-023, REQ-VID-DETECT-030, REQ-VID-DETECT-033, REQ-VID-DETECT-037 |
| **Processamento atual de imagens estáticas** | **Manter** | Os pipelines de processamento de imagens isoladas (PNG, JPEG e arquivos ZIP) continuam a operar inalterados, preservando as suas filas, workers e endpoints existentes sem qualquer interrupção ou regressão. | REQ-VID-DETECT-008, REQ-VID-DETECT-015, REQ-VID-DETECT-031, REQ-VID-DETECT-034 |

---

### 4.3 Matriz de Rastreabilidade Atualizada

| **Elemento de origem** | **Descrição abreviada** | **Requisito(s) de Sistema** |
|------------------------|-------------------------|------------------------------|
| **Passo 1** | Aceder ao projeto e iniciar adição de vídeo | REQ-VID-DETECT-001, REQ-VID-DETECT-019 |
| **Passo 2** | Selecionar ficheiro e executar validação de conformidade | REQ-VID-DETECT-002, REQ-VID-DETECT-020, REQ-VID-DETECT-032 |
| **Passo 3** | Escolher ferramentas e ajustar limiar de confiança | REQ-VID-DETECT-003, REQ-VID-DETECT-004, REQ-VID-DETECT-005 |
| **Passo 4** | Confirmar pedido, calcular custo e reservar quota | REQ-VID-DETECT-006, REQ-VID-DETECT-007 |
| **Passo 5** | Persistir vídeo de origem e registar execução pendente | REQ-VID-DETECT-008, REQ-VID-DETECT-009 |
| **Passo 6** | Enfileirar no RabbitMQ, extrair fotogramas e detetar | REQ-VID-DETECT-010, REQ-VID-DETECT-011, REQ-VID-DETECT-012, REQ-VID-DETECT-028, REQ-VID-DETECT-036 |
| **Passo 7** | Gravar resultado estruturado, codificar vídeo anotado e limpar temporários | REQ-VID-DETECT-013, REQ-VID-DETECT-014, REQ-VID-DETECT-015, REQ-VID-DETECT-033, REQ-VID-DETECT-038 |
| **Passo 8** | Concluir ciclo de execução e emitir notificação WebSocket | REQ-VID-DETECT-016, REQ-VID-DETECT-017, REQ-VID-DETECT-029 |
| **Passo 9** | Aceder, visualizar e descarregar artefactos produzidos | REQ-VID-DETECT-018, REQ-VID-DETECT-030, REQ-VID-DETECT-037 |
| **FA1 — Apenas deteções estruturadas** | Produção obrigatória de resultado estruturado JSON por fotograma | REQ-VID-DETECT-012, REQ-VID-DETECT-013 |
| **FA2 — Vídeo anotado** | Produção opcional sob pedido de vídeo anotado MP4 compatível | REQ-VID-DETECT-014, REQ-VID-DETECT-015, REQ-VID-DETECT-038 |
| **FA3 — Duas ferramentas em simultâneo** | Execução combinada de pessoas e objetos no mesmo vídeo | REQ-VID-DETECT-003, REQ-VID-DETECT-006, REQ-VID-DETECT-011, REQ-VID-DETECT-012 |
| **FA4 — Cancelamento da tarefa** | Abortar execução, limpar temporários e estornar saldo de operações | REQ-VID-DETECT-025, REQ-VID-DETECT-026, REQ-VID-DETECT-027, REQ-VID-DETECT-031, REQ-VID-DETECT-035 |
| **Exceção 1** | Sessão inexistente ou permissão de edição insuficiente | REQ-VID-DETECT-019 |
| **Exceção 2** | Ficheiro com formato, codec, tamanho ou duração inválidos | REQ-VID-DETECT-002, REQ-VID-DETECT-020, REQ-VID-DETECT-032 |
| **Exceção 3** | Saldo insuficiente na quota do perfil gratuito | REQ-VID-DETECT-007, REQ-VID-DETECT-021 |
| **Exceção 4** | Indisponibilidade de serviços centrais (Broker, Storage, Worker) | REQ-VID-DETECT-022, REQ-VID-DETECT-023, REQ-VID-DETECT-031 |
| **Exceção 5** | Falha de worker ou erro a meio da inferência | REQ-VID-DETECT-024, REQ-VID-DETECT-031, REQ-VID-DETECT-033 |
| **Exceção 6** | Invalidação cooperativa de tarefas substituídas ou canceladas | REQ-VID-DETECT-025, REQ-VID-DETECT-027, REQ-VID-DETECT-031, REQ-VID-DETECT-035 |
| **Pós-condição de sucesso** | Vídeo original preservado, artefactos gerados, quota correta e notificação | REQ-VID-DETECT-008, REQ-VID-DETECT-013, REQ-VID-DETECT-014, REQ-VID-DETECT-015, REQ-VID-DETECT-016, REQ-VID-DETECT-017, REQ-VID-DETECT-018, REQ-VID-DETECT-030 |
| **Pós-condição mínima** | Não alteração do original, limpeza de temporários, estorno de quota e sem resultados parciais | REQ-VID-DETECT-015, REQ-VID-DETECT-023, REQ-VID-DETECT-024, REQ-VID-DETECT-031, REQ-VID-DETECT-033 |
| **RN1** | Autenticação obrigatória e controlo de acesso por perfil | REQ-VID-DETECT-001, REQ-VID-DETECT-019, REQ-VID-DETECT-032 |
| **RN2** | Deteção restrita às classes de modelo de `people_ai` e `obj_ai` | REQ-VID-DETECT-003, REQ-VID-DETECT-011 |
| **RN3** | Especificação dos atributos obrigatórios de cada deteção | REQ-VID-DETECT-012, REQ-VID-DETECT-013 |
| **RN4** | Políticas de consumo de operações e regras para perfis gratuito e premium | REQ-VID-DETECT-006, REQ-VID-DETECT-007, REQ-VID-DETECT-021, REQ-VID-DETECT-023, REQ-VID-DETECT-027 |
| **RN5** | Imutabilidade do vídeo original e armazenamento de artefactos independentes | REQ-VID-DETECT-008, REQ-VID-DETECT-015, REQ-VID-DETECT-030 |
| **RN6** | Atomicidade da conclusão: exige término com sucesso de todos os fotogramas | REQ-VID-DETECT-009, REQ-VID-DETECT-011, REQ-VID-DETECT-016, REQ-VID-DETECT-024 |
| **RN7** | Natureza assíncrona mandatória com notificação desacoplada por eventos | REQ-VID-DETECT-010, REQ-VID-DETECT-017, REQ-VID-DETECT-028, REQ-VID-DETECT-029, REQ-VID-DETECT-034, REQ-VID-DETECT-039 |
| **RN8** | Acesso seguro e autorizado aos ficheiros via URLs pré-assinadas | REQ-VID-DETECT-018, REQ-VID-DETECT-030, REQ-VID-DETECT-037 |
| **A1** | Restrição de formatos validados antes da aceitação | REQ-VID-DETECT-002, REQ-VID-DETECT-020, REQ-VID-DETECT-032 |
| **A2** | Utilização do SeaweedFS para persistência e volume volátil temporário | REQ-VID-DETECT-008, REQ-VID-DETECT-015, REQ-VID-DETECT-023, REQ-VID-DETECT-033 |
| **A3** | Extensão das filas RabbitMQ e compatibilidade com workers | REQ-VID-DETECT-010, REQ-VID-DETECT-017, REQ-VID-DETECT-028, REQ-VID-DETECT-039, REQ-VID-DETECT-040 |
| **A4** | Decodificação e inferência em lotes reduzidos sem saturação de memória | REQ-VID-DETECT-011, REQ-VID-DETECT-028, REQ-VID-DETECT-029, REQ-VID-DETECT-036, REQ-VID-DETECT-040 |
| **A5** | JSON estruturado como entrega primordial e vídeo anotado como opcional | REQ-VID-DETECT-013, REQ-VID-DETECT-014, REQ-VID-DETECT-038 |
| **DQ-001** | Padronização dos limites e compatibilidade de vídeo para o MVP | REQ-VID-DETECT-002, REQ-VID-DETECT-020, REQ-VID-DETECT-032, REQ-VID-DETECT-038 |
| **DQ-002** | Critério de desempenho e dimensionamento de cadência computacional em CPU | REQ-VID-DETECT-036 |
| **DQ-003** | Política de segurança e proteção de URLs temporárias de visualização | REQ-VID-DETECT-018, REQ-VID-DETECT-037 |
| **DQ-004** | Estratégia de gestão de armazenamento local e eliminação de fotogramas voláteis | REQ-VID-DETECT-023, REQ-VID-DETECT-033 |
| **DQ-005** | Formato de contrato de dados, modularidade e conteinerização isolada | REQ-VID-DETECT-013, REQ-VID-DETECT-039, REQ-VID-DETECT-040 |
| **DQ-006** | Delimitação estrita do âmbito do MVP: exclusão de lote, encadeamento e suporte a cancelamento cooperativo | REQ-VID-DETECT-026, REQ-VID-DETECT-034, REQ-VID-DETECT-035 |

---

#### Decisões de qualidade introduzidas nesta aula

| **ID** | **Decisão de qualidade** | **Justificação** | **Requisito(s) relacionado(s)** |
|--------|--------------------------|------------------|--------------------------------|
| **DQ-001** | Fixar no MVP suporte estrito a contentores MP4 codificados em H.264/AVC (áudio AAC opcional), com tamanho ≤ 500 MB e duração máxima de 180 s para perfil gratuito e 600 s para premium. | Garante interoperabilidade universal direta em navegadores Web sem necessidade de transcodificação preliminar pesada na entrada, reduzindo o risco de falhas de decodificação na Fase 1. | REQ-VID-DETECT-002, 020, 032, 038 |
| **DQ-002** | Estabelecer como meta de desempenho no MVP uma taxa de inferência mínima sustentada de 5 fps em CPU de referência, delegando metas de tempo real (≥ 30 fps) com aceleração de GPU para a produção. | Reconhece o contexto do MVP em ambiente de testes académicos sem exigir infraestrutura dedicada de GPUs, estabelecendo ao mesmo tempo um limite inferior que previne saturação extrema de filas. | REQ-VID-DETECT-036 |
| **DQ-003** | Adotar URLs pré-assinadas geradas pelo SeaweedFS com expiração estrita de 60 minutos para acesso ao vídeo e artefactos. | Assegura confidencialidade e impede a exposição de endpoints diretos ou URLs estáticas adivinháveis, alinhando a solução com as melhores práticas de segurança na nuvem. | REQ-VID-DETECT-018, 037 |
| **DQ-004** | Impor a purga imediata de todos os fotogramas temporários descompactados no volume local logo após o fecho da execução (sucesso, falha ou cancelamento). | O processamento de vídeos decompõe o ficheiro em milhares de imagens JPEG/PNG intermediárias que consumiriam dezenas de gigabytes em poucas horas; a purga local estrita evita negação de serviço por disco cheio. | REQ-VID-DETECT-023, 033 |
| **DQ-005** | Adotar JSON Schema versionado v1.0 para o resultado estruturado e empacotar os workers em contentores Docker independentes com dependências de FFmpeg e PyTorch isoladas. | Promove modularidade e portabilidade total, permitindo evoluir os modelos de IA e adicionar novas ferramentas de vídeo no futuro sem impacto nos serviços centrais existentes. | REQ-VID-DETECT-013, 039, 040 |
| **DQ-006** | Excluir formalmente do MVP o encadeamento de ferramentas e o processamento em lote para vídeo, e adotar cancelamento cooperativo via verificação periódica de tokens. | Reduz a complexidade arquitetural da Fase 1 a um fluxo comprovável e robusto, assegurando que o cancelamento de uma tarefa longa não continua a consumir CPU inutilmente. | REQ-VID-DETECT-026, 034, 035 |

---

#### Verificações de cobertura

- [x] Cada requisito funcional (REQ-VID-DETECT-001 a 027 e 032 a 035) e não funcional (REQ-VID-DETECT-028 a 031 e 036 a 040) aparece na matriz.
- [x] Cada requisito tem origem identificada: elemento do caso de uso, regra de negócio ou decisão de qualidade.
- [x] Todos os elementos relevantes do caso de uso (passos 1 a 9, FA1 a FA4, exceções 1 a 6, pós-condições e regras RN1 a RN8) têm requisitos associados.
- [x] Os tópicos excluídos na secção 4.1.3 (encadeamento e processamento em lote) estão formalmente justificados.
- [x] O impacto no sistema existente está atualizado e correlacionado com todos os requisitos relevantes.

---

## ✅ Lista de verificação antes de entregar

- [x] As secções 0 a 3 do dossiê foram preservadas; as assunções, questões em aberto e utilização de IA foram atualizadas.
- [x] A funcionalidade, o caso de uso e o perfil do Exercício 1 foram mantidos.
- [x] Requisitos funcionais estão completos para o âmbito e têm critérios verificáveis.
- [x] Requisitos de qualidade estão classificados e distinguem os alvos MVP e produção.
- [x] Os IDs existentes foram preservados quando a intenção não mudou.
- [x] A análise de completude não alargou o âmbito sem decisão explícita.
- [x] A matriz de rastreabilidade não tem requisitos órfãos nem elementos relevantes por cobrir.
- [x] As decisões de qualidade e os respetivos requisitos estão identificados.

---
