# Exercício 2 — Especificação de Requisitos do Sistema
### Fase 1: Suporte a Vídeo no PictuRAS

Este documento continua o dossiê do Exercício 1. As secções 0 a 3, incluindo a funcionalidade,
o caso de uso, o ator e a utilização de IA, são preservadas em
[RAS-exercicio_1_template_PT-v2(2).md](./RAS-exercicio_1_template_PT-v2(2).md).

## 4. Especificação de Requisitos do Sistema (ERS)

**Caso de Uso:** UC-VID-001 — Converter vídeo para outro formato ou resolução  
**Versão do dossiê:** v1.1  
**Baseline do Exercício 1:** v1.0.1; requisitos REQ-VID-CONV-001 a REQ-VID-CONV-027

O catálogo 4.1 é a fonte única dos requisitos desta ERS. A matriz 4.3 rastreia cada requisito
até ao caso de uso, às regras de negócio ou às decisões de qualidade.

### 4.1 Requisitos da ERS

#### 4.1.1 Requisitos Funcionais

| **ID** | **Requisito** | **Prioridade** | **Evolução** | **Novo/Alt** | **Origem (UC / RN / decisão)** | **Justificação** | **Critério de aceitação / verificação** |
|--------|---------------|----------------|--------------|--------------|--------------------------------|-----------------|----------------------------------------|
| REQ-VID-CONV-001 | O sistema deve permitir ao utilizador registado selecionar um vídeo de um projeto acessível e iniciar uma conversão. | Deve ter | Refinado | NOVO | UC-VID-001, passo 1; RN1; RN2 | É a entrada funcional da conversão e aplica autenticação e autorização. | Dado um utilizador autenticado com acesso ao projeto, quando seleciona um vídeo e inicia a conversão, então o sistema deve aceitar o pedido se as restantes validações passarem. |
| REQ-VID-CONV-002 | O sistema deve apresentar apenas formatos e resoluções de saída válidos para o vídeo e para o perfil do utilizador. | Deve ter | Mantido | ALT | UC-VID-001, passo 1; RN5 | Evita que o utilizador submeta combinações que o serviço não consegue produzir. | Dado um vídeo e um perfil, quando o utilizador consulta as opções, então apenas são apresentadas opções suportadas. |
| REQ-VID-CONV-003 | O sistema deve validar o formato e o codec do vídeo de entrada antes de aceitar o pedido. | Deve ter | Refinado | NOVO | UC-VID-001, passo 2; exceção 1 | A conversão só pode começar depois de o conteúdo ser reconhecido. | Dado um vídeo com formato ou codec não suportado, quando o utilizador confirma, então o pedido deve ser rejeitado antes do processamento. |
| REQ-VID-CONV-004 | O sistema deve validar o tamanho e a duração do vídeo antes de aceitar o pedido. | Deve ter | Refinado | NOVO | RN4 | Impede que sejam submetidos ficheiros acima dos limites do perfil e do MVP. | Dado um vídeo acima de qualquer limite aplicável, quando o utilizador confirma, então o pedido deve ser rejeitado com a razão correspondente. |
| REQ-VID-CONV-005 | O sistema deve validar a quota diária do utilizador antes de iniciar o processamento. | Deve ter | Mantido | ALT | RN4; exceção 3 | A operação deve respeitar o modelo de utilização existente. | Dado um utilizador sem quota disponível, quando confirma uma conversão, então o sistema não deve criar trabalho de processamento. |
| REQ-VID-CONV-006 | O sistema deve informar o utilizador se o pedido foi aceite ou rejeitado e indicar a razão da rejeição quando aplicável. | Deve ter | Refinado | NOVO | UC-VID-001, passo 2 | O utilizador precisa de distinguir uma operação aceite de uma validação falhada. | Dado um pedido, quando terminam as validações, então o sistema apresenta um resultado inequívoco e, em caso de rejeição, uma mensagem acionável. |
| REQ-VID-CONV-007 | O sistema deve registar cada pedido aceite como uma operação de conversão. | Deve ter | Mantido | NOVO | UC-VID-001, passo 3 | Permite acompanhar, auditar e relacionar o resultado com o original. | Dado um pedido aceite, quando é criado, então deve existir um registo único associado ao utilizador, projeto e vídeo original. |
| REQ-VID-CONV-008 | O sistema deve colocar uma operação aceite no estado `em processamento` ou `em fila` antes de iniciar o trabalho efetivo. | Deve ter | Refinado | NOVO | UC-VID-001, passos 3-4 | Torna visível o ciclo de vida desde a aceitação até à execução. | Dado um pedido aceite, quando é registado, então o utilizador deve conseguir consultar um estado inicial válido. |
| REQ-VID-CONV-009 | O sistema deve manter o vídeo original inalterado durante e após a conversão. | Deve ter | Mantido | NOVO | UC-VID-001, passo 3; RN3; garantia de sucesso | Evita perda de dados e preserva a possibilidade de repetir a operação. | Dado um vídeo original, quando uma conversão termina com sucesso ou falha, então o conteúdo e os metadados do original devem permanecer inalterados. |
| REQ-VID-CONV-010 | O sistema deve processar a conversão de forma assíncrona quando esta não puder terminar durante a submissão. | Deve ter | Refinado | ALT | UC-VID-001, passo 4; A3 | O utilizador não deve ficar bloqueado à espera da transcodificação. | Dado um pedido aceite, quando a conversão demora mais do que a submissão, então a resposta inicial deve terminar e o trabalho deve continuar. |
| REQ-VID-CONV-011 | O sistema deve apresentar o estado atual de cada operação ao utilizador autorizado. | Deve ter | Mantido | ALT | UC-VID-001, passo 4; A3 | O estado é necessário para acompanhamento e recuperação após a saída da página. | Dado um identificador de operação e um utilizador autorizado, quando consulta o estado, então recebe o estado atual da operação. |
| REQ-VID-CONV-012 | O sistema deve apresentar o progresso da conversão quando este estiver disponível. | Deveria ter | Refinado | ALT | UC-VID-001, passo 4; DQ-003 | O progresso melhora a compreensão de operações demoradas sem exigir uma estimativa falsa. | Dado um trabalho ativo, quando o worker comunicar progresso, então o valor apresentado deve ser atualizado; quando não existir progresso fiável, o sistema deve indicar essa indisponibilidade. |
| REQ-VID-CONV-013 | O sistema deve permitir cancelar uma operação aceite antes do início efetivo do processamento. | Deveria ter | Mantido | NOVO | FA3 | Permite ao utilizador corrigir uma submissão antes de consumir recursos. | Dado um pedido aceite ainda não iniciado, quando o utilizador cancela, então o estado deve ficar `cancelada`, não deve haver resultado e a quota reservada deve ser libertada. |
| REQ-VID-CONV-014 | O sistema deve armazenar o vídeo convertido como um novo ficheiro. | Deve ter | Mantido | NOVO | UC-VID-001, passo 5; RN3 | O original nunca deve ser substituído. | Dado um processamento concluído, quando o resultado é armazenado, então deve existir um ficheiro diferente do original. |
| REQ-VID-CONV-015 | O sistema deve associar o novo ficheiro ao projeto e ao vídeo original. | Deve ter | Mantido | NOVO | UC-VID-001, passo 5; garantia de sucesso | Mantém a relação entre origem, resultado e projeto. | Dado um resultado concluído, quando o utilizador consulta o projeto, então o resultado aparece associado ao projeto e ao original. |
| REQ-VID-CONV-016 | O sistema deve disponibilizar o vídeo convertido para abertura ou descarga após a conclusão. | Deve ter | Mantido | NOVO | UC-VID-001, passo 6 | O resultado só tem valor se puder ser utilizado pelo ator. | Dado um resultado concluído e um utilizador autorizado, quando este o abre ou descarrega, então o ficheiro deve estar disponível. |
| REQ-VID-CONV-017 | O sistema deve apresentar os metadados de formato, codec e resolução do resultado. | Deveria ter | Refinado | NOVO | UC-VID-001, passo 6 | Permite confirmar que a conversão produziu a variante pedida. | Dado um resultado convertido, quando o utilizador o consulta, então são apresentados pelo menos o formato, codec e resolução de saída. |
| REQ-VID-CONV-018 | O sistema deve rejeitar vídeos cujo formato ou codec de entrada não sejam suportados. | Deve ter | Mantido | NOVO | Exceção 1 | Evita falhas previsíveis no worker. | Dado um vídeo incompatível, quando é submetido, então o pedido é rejeitado e o original permanece acessível. |
| REQ-VID-CONV-019 | O sistema deve rejeitar opções de formato, codec ou resolução que não sejam suportadas para o perfil. | Deve ter | Refinado | ALT | Exceção 2; RN5 | Impede que o cliente contorne as opções válidas apresentadas. | Dada uma opção não suportada, quando é submetida, então o pedido não inicia e as opções válidas são apresentadas. |
| REQ-VID-CONV-020 | O sistema deve informar o utilizador quando a quota diária estiver esgotada. | Deve ter | Mantido | ALT | Exceção 3; RN4 | A mensagem deve explicar por que motivo o pedido não começou. | Dado um perfil sem quota, quando tenta iniciar uma conversão, então recebe uma mensagem sobre o limite atingido. |
| REQ-VID-CONV-021 | O sistema deve marcar como `falhada` uma operação cujo processamento termine com erro. | Deve ter | Mantido | NOVO | Exceção 4 | O estado final deve representar a falha sem a mascarar. | Dado um worker que comunica erro, quando o sistema o processa, então a operação fica `falhada`. |
| REQ-VID-CONV-022 | O sistema não deve apresentar um resultado parcial como concluído quando o processamento falhar. | Deve ter | Mantido | NOVO | Exceção 4; garantia mínima | Impede que ficheiros inválidos sejam tratados como resultados válidos. | Dado um processamento falhado, quando o utilizador consulta os resultados, então nenhum ficheiro parcial aparece como concluído ou descarregável. |
| REQ-VID-CONV-023 | O sistema deve apresentar uma mensagem consultável sobre a falha do processamento. | Deve ter | Mantido | NOVO | Exceção 4; garantia mínima | Permite ao utilizador compreender o resultado da operação. | Dado um processamento falhado, quando o utilizador consulta a operação, então consegue ver uma razão não sensível para a falha. |
| REQ-VID-CONV-024 | O sistema deve manter a resolução original quando apenas o formato for alterado e a resolução for suportada. | Deveria ter | Mantido | NOVO | FA1 | Evita alterações não solicitadas pelo utilizador. | Dado um pedido que altera apenas o formato, quando termina, então a resolução do resultado deve ser igual à original, se suportada. |
| REQ-VID-CONV-025 | O sistema deve manter o formato original quando apenas a resolução for alterada e o formato for suportado. | Deveria ter | Mantido | NOVO | FA2 | Evita alterações não solicitadas pelo utilizador. | Dado um pedido que altera apenas a resolução, quando termina, então o formato do resultado deve ser igual ao original, se suportado. |
| REQ-VID-CONV-026 | O sistema deve rejeitar uma conversão sem alteração efetiva ou solicitar confirmação explícita para criar uma cópia. | Poderia ter | Refinado | NOVO | Caso de fronteira; garantia mínima | Evita consumo acidental de quota e armazenamento. | Dado um pedido com formato e resolução iguais às originais, quando é confirmado, então o sistema deve rejeitar ou pedir confirmação explícita antes de criar uma cópia. |
| REQ-VID-CONV-027 | O sistema deveria concluir pelo menos 95% das conversões de vídeos até 2 minutos e 500 MB em até 2 minutos, em condições de teste definidas pela equipa. | Deveria ter | Refinado | NOVO | A2; DQ-001 | Cria um alvo mensurável de capacidade para o MVP sem o confundir com produção. | Dado um conjunto de pelo menos 20 vídeos elegíveis no ambiente de teste documentado, quando são convertidos, então pelo menos 19 devem concluir em até 2 minutos. |
| REQ-VID-CONV-028 | O sistema deve manter os ficheiros de entrada e de saída acessíveis durante a vida útil do projeto ou até o utilizador os eliminar, salvo política de retenção aprovada. | Deve ter | Novo | NOVO | DQ-004 | O serviço precisa de uma regra explícita de persistência para evitar resultados inacessíveis ou indefinidamente retidos. | Dado um vídeo pertencente a um projeto ativo, quando o utilizador consulta o projeto, então o original e os resultados concluídos devem permanecer acessíveis até eliminação autorizada. |
| REQ-VID-CONV-029 | O sistema deve eliminar ou tornar inacessível um ficheiro de saída incompleto ou associado a uma operação falhada. | Deve ter | Novo | NOVO | Exceção 4; DQ-004 | Completa a garantia mínima do caso de uso. | Dado um processamento que falha, quando a limpeza termina, então o ficheiro parcial não deve ser acessível através do projeto ou de um URL público. |
| REQ-VID-CONV-030 | O sistema deve contar cada conversão aceite como uma operação do perfil segundo a política de quota definida para a Fase 1. | Deve ter | Novo | NOVO | RN4; DQ-005 | Liga a conversão ao modelo de perfis sem inventar uma quota diferente. | Dado um pedido aceite, quando a reserva de quota é confirmada, então a contagem do perfil deve refletir a operação; uma operação rejeitada não deve ser contada. |
| REQ-VID-CONV-031 | O sistema não deve incluir a conversão no encadeamento de ferramentas de imagem nem no processamento em lote de imagens da Fase 1. | Deve ter | Novo | NOVO | Limite de âmbito; DQ-006 | Evita alargar o caso de uso e confundir pipelines de imagem com operações de vídeo. | Dado um projeto com ferramentas de imagem ou lote ativo, quando o utilizador inicia uma conversão de vídeo, então a conversão deve ser uma operação separada e não deve alterar esse pipeline. |

#### 4.1.2 Requisitos Não Funcionais e de Qualidade

| **ID** | **Requisito** | **Característica ISO/IEC 25010** | **Alvo MVP** | **Alvo produção** | **Evolução** | **Origem (UC / DQ)** | **Critério de aceitação / verificação** |
|--------|---------------|----------------------------------|--------------|------------------|--------------|----------------------|----------------------------------------|
| REQ-VID-CONV-032 | O sistema deve responder à aceitação ou rejeição da submissão sem esperar pela conclusão da conversão. | Eficiência de Desempenho | 95% das respostas em até 5 s no ambiente de demonstração | 99% das respostas em até 1 s sob carga definida | Novo | DQ-001 | Medir desde a confirmação até à resposta em pelo menos 20 submissões válidas e inválidas. |
| REQ-VID-CONV-033 | O sistema deve manter uma operação falhada num estado consistente e sem resultado parcial acessível. | Fiabilidade | Sem retoma automática; estado `falhada` e limpeza do parcial | Retoma ou repetição automática com limite e recuperação documentada | Refinado | DQ-002; exceção 4 | Injetar falha a 80% e verificar estado, limpeza, mensagem e preservação do original. |
| REQ-VID-CONV-034 | O sistema deve restringir o acesso ao vídeo original, à operação e ao resultado a utilizadores autorizados pelo projeto. | Segurança | 100% dos testes de acesso não autorizado são rejeitados | Autorização centralizada, URLs temporários e auditoria de acessos | Novo | RN1; RN2; DQ-003 | Tentar consultar e descarregar com outro utilizador e verificar rejeição sem exposição do URL de armazenamento. |
| REQ-VID-CONV-035 | O sistema deve comunicar estados de fila, processamento, conclusão, cancelamento e falha de forma compreensível. | Usabilidade | Estado visível e mensagem de erro em todos os cenários definidos | Estados, progresso, notificações e recuperação de ligação consistentes | Refinado | UC-VID-001, passos 3-6; DQ-003 | Executar um cenário de sucesso, cancelamento e falha e verificar que cada transição é visível ao utilizador. |
| REQ-VID-CONV-036 | O sistema deve aceitar e produzir apenas os contentores e codecs definidos para a versão em uso. | Compatibilidade | Entrada e saída suportadas documentadas; saída MP4/H.264/AAC quando aplicável | Matriz de compatibilidade versionada e extensível | Refinado | RN4; A2; DQ-006 | Testar pelo menos um formato suportado e um não suportado, verificando aceitação e rejeição corretas. |
| REQ-VID-CONV-037 | O sistema deve separar o processamento de vídeo do código das ferramentas de imagem existentes. | Manutenibilidade | Adição da conversão sem alterar o comportamento das ferramentas de imagem | Nova ferramenta de vídeo adicionável através de contrato versionado | Novo | Limite de âmbito; DQ-006 | Executar os testes/regressões das ferramentas de imagem antes e depois da integração da conversão. |
| REQ-VID-CONV-038 | O sistema deve permitir executar a conversão no ambiente de demonstração documentado sem depender de serviços externos não aprovados. | Portabilidade | Reprodutível com a configuração da equipa e dependências documentadas | Imagens versionadas e execução reproduzível em ambientes suportados | Novo | A1; DQ-007 | Recriar o ambiente a partir da documentação e executar o cenário de sucesso do caso de uso. |

#### 4.1.3 Verificação da completude e dos limites do âmbito

| **Tópico a verificar** | **Aplicável?** | **Decisão / justificação** | **Requisito(s) relacionado(s)** |
|-----------------------|---------------|----------------------------|--------------------------------|
| Formato, codec, duração e dimensão do vídeo | Sim | São necessários para validar a entrada e fixar o limite do MVP. A proposta inicial é MP4/H.264/AAC, até 1080p, 10 minutos e 500 MB; a decisão final fica pendente de aprovação do grupo. | REQ-VID-CONV-003, 004, 018, 019, 036 |
| Estado, progresso, cancelamento e resultado | Sim | O processamento pode demorar e o utilizador precisa de acompanhar, cancelar quando possível e obter um resultado separado. | REQ-VID-CONV-008 a 017, 021 a 023, 035 |
| Falhas durante o processamento | Sim | Uma falha não pode publicar um resultado incompleto nem alterar o original. | REQ-VID-CONV-009, 021 a 023, 029, 033 |
| Persistência e expiração dos ficheiros | Sim | O resultado deve permanecer acessível no projeto e os parciais devem ser eliminados ou ocultados. A política de retenção definitiva requer decisão do grupo. | REQ-VID-CONV-014 a 016, 028, 029 |
| Perfis e contagem de operações | Sim | A funcionalidade usa autenticação, permissões e quota do perfil existente. | REQ-VID-CONV-001, 005, 019, 020, 030, 034 |
| Encadeamento de ferramentas e processamento em lote | Sim, para exclusão | A conversão de vídeo fica fora dos pipelines de imagem e do lote da Fase 1, para manter o âmbito controlado. | REQ-VID-CONV-031, 037 |

### 4.2 Impacto no sistema existente

| **Elemento existente afetado** | **Impacto (Manter / Estender / Alterar)** | **Descrição do impacto** | **Requisito(s) relacionado(s)** |
|--------------------------------|-------------------------------------------|--------------------------|--------------------------------|
| Frontend | Estender | Permitir selecionar um vídeo, consultar opções, submeter, cancelar, acompanhar estados e abrir/descarregar resultados. | REQ-VID-CONV-001, 002, 006, 011, 012, 013, 016, 017, 020, 023, 035 |
| API Gateway | Estender | Encaminhar pedidos autenticados, consultas de estado, cancelamentos e acesso a resultados sem expor credenciais de armazenamento. | REQ-VID-CONV-001, 005, 006, 011, 013, 016, 020, 034 |
| Serviço de projetos | Estender | Validar projeto, permissões, metadados, opções e quota; registar operações, estados e associação ao resultado. | REQ-VID-CONV-003 a 009, 011, 013 a 015, 018 a 023, 026, 028 a 031 |
| Serviço de processamento | Estender | Adicionar a conversão de vídeo como operação separada, com progresso, conclusão e falha sem alterar as ferramentas de imagem. | REQ-VID-CONV-008, 010, 012, 021, 022, 029, 033, 037 |
| Serviço de armazenamento | Estender | Guardar entradas e resultados como ficheiros separados, controlar acesso e limpar parciais. | REQ-VID-CONV-009, 014 a 016, 022, 028, 029, 034 |
| Serviço de subscrições/perfis | Estender | Aplicar quota, limites de duração, tamanho e opções permitidas ao perfil. | REQ-VID-CONV-002, 004, 005, 019, 020, 030 |
| Encadeamento e lote de imagens | Manter | Permanecem fora do âmbito; a conversão de vídeo não altera nem participa nesses fluxos na Fase 1. | REQ-VID-CONV-031, 037 |

### 4.3 Matriz de Rastreabilidade Atualizada

| **Elemento de origem** | **Descrição abreviada** | **Requisito(s) relacionado(s)** |
|------------------------|-------------------------|--------------------------------|
| Passo 1 | Seleção do vídeo e apresentação das opções | REQ-VID-CONV-001, 002 |
| Passo 2 | Escolha, validação e resposta ao pedido | REQ-VID-CONV-003 a 006, 018 a 020 |
| Passo 3 | Registo, estado inicial e preservação do original | REQ-VID-CONV-007 a 009, 030 |
| Passo 4 | Processamento, estado e progresso | REQ-VID-CONV-008, 010 a 012, 021, 023, 035 |
| Passo 5 | Armazenamento e associação do resultado | REQ-VID-CONV-014, 015, 022, 028, 029 |
| Passo 6 | Abertura, descarga e metadados | REQ-VID-CONV-016, 017, 034 |
| FA1 | Alteração apenas do formato | REQ-VID-CONV-024 |
| FA2 | Alteração apenas da resolução | REQ-VID-CONV-025 |
| FA3 | Cancelamento antes do processamento | REQ-VID-CONV-013, 030, 035 |
| Exceção 1 | Formato ou codec de entrada não suportado | REQ-VID-CONV-003, 018, 036 |
| Exceção 2 | Opção não suportada para o perfil | REQ-VID-CONV-002, 019 |
| Exceção 3 | Quota diária esgotada | REQ-VID-CONV-005, 020, 030 |
| Exceção 4 | Falha sem resultado parcial | REQ-VID-CONV-021 a 023, 029, 033 |
| Garantia de sucesso | Resultado novo, associado e original preservado | REQ-VID-CONV-009, 014 a 017, 028 |
| Garantia mínima | Sem resultado inválido e falha visível | REQ-VID-CONV-022, 023, 029, 033 |
| RN1 | Apenas utilizadores autenticados | REQ-VID-CONV-001, 034 |
| RN2 | Vídeo pertencente a projeto acessível | REQ-VID-CONV-001, 034 |
| RN3 | Original nunca substituído | REQ-VID-CONV-009, 014 |
| RN4 | Quota e limites do perfil | REQ-VID-CONV-004, 005, 019, 020, 030, 036 |
| RN5 | Apenas opções apresentadas pelo sistema | REQ-VID-CONV-002, 019 |
| A1 | Reutilização de autenticação, projetos, armazenamento e estados | REQ-VID-CONV-001, 005, 007, 015, 030, 034 |
| A2 | Limites e formatos do MVP | REQ-VID-CONV-003, 004, 018, 027, 036 |
| A3 | Processamento assíncrono | REQ-VID-CONV-010 a 012, 032, 035 |
| DQ-001 | Resposta de submissão e capacidade do MVP | REQ-VID-CONV-027, 032 |
| DQ-002 | Consistência após falha | REQ-VID-CONV-022, 029, 033 |
| DQ-003 | Autorização, estados e mensagens compreensíveis | REQ-VID-CONV-012, 017, 023, 034, 035 |
| DQ-004 | Persistência, retenção e limpeza | REQ-VID-CONV-028, 029 |
| DQ-005 | Contagem de operações e quota | REQ-VID-CONV-005, 013, 020, 030 |
| DQ-006 | Compatibilidade e separação das ferramentas | REQ-VID-CONV-031, 036, 037 |
| DQ-007 | Execução reproduzível no ambiente da equipa | REQ-VID-CONV-038 |

**Decisões de qualidade introduzidas nesta aula**

| **ID** | **Decisão de qualidade** | **Justificação** | **Requisito(s) relacionado(s)** |
|--------|--------------------------|-----------------|--------------------------------|
| DQ-001 | A submissão deve ser desacoplada da duração da conversão e responder em até 5 segundos em 95% dos casos no ambiente de demonstração. | Permite validar a aceitação sem transformar a conversão numa operação síncrona. | REQ-VID-CONV-027, 032 |
| DQ-002 | O MVP não retoma automaticamente uma conversão falhada; marca-a como falhada e limpa o resultado parcial. | Mantém o âmbito adequado à Fase 1 e preserva a consistência dos dados. | REQ-VID-CONV-022, 029, 033 |
| DQ-003 | Estados, progresso disponível e mensagens de erro devem ser visíveis apenas ao utilizador autorizado. | Combina usabilidade com proteção de informação sobre ficheiros e operações. | REQ-VID-CONV-012, 023, 034, 035 |
| DQ-004 | O original e os resultados concluídos persistem enquanto o projeto existir; parciais de falhas não ficam acessíveis. | Evita perda prematura do resultado e exposição de artefactos inválidos. | REQ-VID-CONV-028, 029 |
| DQ-005 | Uma conversão aceite reserva uma operação de quota; uma rejeitada não conta e um cancelamento antes do início liberta a reserva. | Torna a relação com perfis e limites verificável. | REQ-VID-CONV-005, 013, 020, 030 |
| DQ-006 | A conversão de vídeo é uma operação separada das ferramentas de imagem e do processamento em lote na Fase 1. | Controla o âmbito e evita alterar fluxos existentes sem decisão do grupo. | REQ-VID-CONV-031, 036, 037 |
| DQ-007 | A validação do MVP deve ser reproduzível no ambiente documentado pela equipa. | Permite demonstrar a funcionalidade e comparar resultados entre elementos do grupo. | REQ-VID-CONV-038 |

**Questões em aberto para aprovação do grupo**

| **ID** | **Questão** | **Impacto** |
|---------|-------------|-------------|
| Q1 | Quais são os formatos e codecs de entrada aceites, além do formato de saída MP4/H.264/AAC? | Afeta compatibilidade e testes. |
| Q2 | Quais são as resoluções predefinidas: 360p, 480p, 720p, 1080p ou outra combinação? | Afeta a interface e a validação de opções. |
| Q3 | A conversão consome exatamente uma operação de quota, independentemente da duração e resolução? | Afeta perfis, subscrições e critérios de aceitação. |
| Q4 | Os vídeos convertidos usam o mesmo modelo de resultados das imagens ou um modelo específico de vídeo? | Afeta armazenamento e integração. |
| Q5 | Qual é a política de expiração ou eliminação quando um projeto é apagado? | Afeta persistência, armazenamento e limpeza. |

**Verificações de cobertura**

- [x] Cada requisito funcional e não funcional aparece na matriz.
- [x] Cada requisito tem origem identificada no caso de uso, regra de negócio ou decisão de qualidade.
- [x] Todos os elementos relevantes do caso de uso têm requisito associado ou justificação.
- [x] Os tópicos excluídos estão justificados sem alargar o âmbito.
- [x] O impacto no sistema existente está ligado aos requisitos relevantes.

## Lista de verificação antes de entregar

- [x] As secções 0 a 3 foram preservadas no dossiê do Exercício 1 e as questões/assunções foram revistas.
- [x] A funcionalidade, o caso de uso e o perfil do Exercício 1 foram mantidos.
- [x] Os requisitos funcionais estão completos e têm critérios verificáveis.
- [x] Os requisitos de qualidade estão classificados segundo a ISO/IEC 25010.
- [x] Os alvos MVP e produção estão distinguidos.
- [x] Os IDs existentes foram preservados quando a intenção não mudou.
- [x] A análise de completude não inclui encadeamento ou lote no âmbito sem decisão explícita.
- [x] A matriz de rastreabilidade não tem requisitos órfãos.
- [x] As decisões de qualidade e questões pendentes estão identificadas.
