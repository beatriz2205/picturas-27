# Exercício 2 — Especificação de Requisitos Consolidada
## Fase 1: Suporte a Vídeo no PictuRAS

**Versão:** 1.1 — consolidação dos Exercícios 1 e 2 do grupo
**Data:** 2026-10-17
**Âmbito:** carregamento, recorte, conversão, filtros e deteção em vídeo

> Este documento consolida os cinco casos de uso e os requisitos dos exercícios individuais.
> Os ficheiros individuais permanecem como histórico. Requisitos repetidos foram fundidos;
> requisitos incompatíveis foram substituídos pelas decisões comuns registadas na secção 4.6.

## 4. Casos de uso consolidados

Os textos abaixo preservam a estrutura e o nível de detalhe dos casos de uso originais. Foram apenas harmonizados os IDs globais e as decisões transversais de formato, limites, estados, quota e perfis.

### 4.1 UC-VID-001 — Carregar/submeter vídeo para um projeto


### 4.1.1 Cabeçalho

| **Secção** | **Detalhes** |
| --- | --- |
| **ID do Caso de Uso** | UC-VID-001 |
| **Nome** | Submeter vídeo a um projeto |
| **Versão** | v1.0 |
| **Autor** | Equipa PictuRAS |
| **Data** | 2026-10-13 |
| **Objetivo** | Permitir que um utilizador carregue um vídeo local e o associe a um projeto PictuRAS, ficando o ficheiro disponível nesse projeto para funcionalidades de vídeo futuras. |
| **Âmbito** | Interface Web do PictuRAS, gestão de projetos e armazenamento de vídeo. |
| **Ator Principal** | Utilizador PictuRAS com sessão ativa, incluindo uma sessão anónima. A submissão de vídeo é uma funcionalidade base de gestão de conteúdo; as operações avançadas de processamento exigem uma conta registada. |
| **Stakeholders e Interesses** | • **Utilizador**: carregar o vídeo pretendido, passando este a estar incorporado num projeto e a poder ser editado com as ferramentas que forem futuramente implementadas.<br>• **Equipa do projeto**: validar a integração funcional de carregamento e armazenamento de vídeo no MVP.<br>• **PictuRAS**: manter a associação entre o vídeo e o projeto correto e não apresentar como concluído um carregamento incompleto.<br>• **Operador da aplicação**: evitar aceitar ficheiros que excedam os limites acordados para o MVP. |
| **Pré-condições** | • O utilizador tem uma sessão PictuRAS ativa.<br>• O utilizador tem ou pode criar um projeto (adicionando pelo menos uma imagem ou um vídeo), para onde submete o vídeo.<br>• O utilizador tem acesso ao ficheiro de vídeo no seu dispositivo. |
| **Trigger** | O utilizador escolhe a opção de adicionar um vídeo a um projeto. |

### 4.1.2 Fluxo Principal

| **Passo** | **Ação do Ator** | **Resposta do Sistema** |
| --- | --- | --- |
| 1 | Abre um projeto existente. | Apresenta o projeto e a opção de adicionar vídeo. |
| 2 | Escolhe a opção de adicionar vídeo. | Abre o seletor de ficheiros do dispositivo. |
| 3 | Seleciona um ficheiro de vídeo. | Apresenta o nome e o tamanho do ficheiro antes do envio. |
| 4 | Confirma o carregamento. | Inicia o envio e apresenta o progresso. |
| 5 | Aguarda que o envio termine. | Recebe o ficheiro e valida o formato, o codec, a duração e o tamanho segundo as regras do MVP. Se as validações forem satisfeitas, guarda o ficheiro no armazenamento e associa-o ao projeto selecionado. |
| 6 | — | Informa que o vídeo foi submetido e apresenta-o na lista de conteúdos do projeto. |

### 4.1.3 Fluxos Alternativos

| **Fluxo** | **Descrição** |
| --- | --- |
| FA1 – Cancelar antes do envio | Antes de confirmar o carregamento, o utilizador cancela ou fecha o seletor, com ou sem ficheiro selecionado. O sistema não envia o ficheiro nem altera o projeto. |
| FA2 – Submeter outro vídeo | Após o passo 6, o utilizador escolhe adicionar outro vídeo. O sistema inicia uma nova submissão para o mesmo projeto, sem substituir o vídeo já carregado. |
| FA3 – Repetir após falha recuperável | O envio falha por uma interrupção temporária ou a confirmação não chega ao utilizador. O sistema informa que a submissão não foi concluída e permite ao utilizador tentar novamente. Se o carregamento anterior tiver sido confirmado, a repetição não cria uma segunda entrada. |
| FA4 – Criar projeto com o vídeo | No passo 1, o utilizador cria um projeto novo escolhendo um vídeo. O ficheiro escolhido segue os passos 3 a 6. Se o ficheiro for recusado, o projeto não é criado. |

### 4.1.4 Exceções

| **Condição** | **Comportamento do Sistema** |
| --- | --- |
| O ficheiro não é um vídeo MP4 com codec H.264, ou não é possível identificar o formato/codec. | Recusa o ficheiro antes de o associar ao projeto e informa o utilizador de que o formato não é suportado. |
| O ficheiro excede o tamanho máximo ou a duração máxima definidos para o MVP. | Não inicia a submissão, informa qual o limite excedido e não associa o vídeo ao projeto. |
| A ligação falha ou o armazenamento fica indisponível durante o envio. | Informa que o carregamento falhou; não confirma a submissão nem deixa uma entrada utilizável para um ficheiro incompleto. O utilizador pode tentar novamente. |
| O utilizador não tem sessão válida. | Recusa a submissão, informa que a sessão terminou e não altera o projeto. |
| O projeto deixa de estar disponível durante a submissão. | Cancela ou termina a operação com erro, informa o utilizador e não associa o vídeo a outro projeto. |

### 4.1.5 Pós-condições

| **Tipo** | **Resultado** |
| --- | --- |
| Garantia de Sucesso | O ficheiro de vídeo validado está guardado e associado ao projeto selecionado; o projeto apresenta uma entrada para o vídeo e o utilizador recebe confirmação. O ficheiro original não é transformado nesta funcionalidade. |
| Garantia Mínima | O sistema não apresenta como concluído um carregamento falhado. O projeto não contém uma entrada utilizável para um ficheiro parcial; o utilizador recebe informação suficiente para corrigir o problema ou tentar novamente. |

### 4.1.6 Regras de Negócio e Restrições

| **ID** | **Regra** |
| --- | --- |
| RN1 | O ator tem de possuir uma sessão ativa e um projeto de destino. A submissão pode ser feita por uma sessão anónima; as operações avançadas sobre o vídeo exigem uma conta registada. |
| RN2 | Para o MVP, só são aceites ficheiros MP4 com vídeo codificado em H.264. A extensão do ficheiro, por si só, não é suficiente para confirmar o formato/codec. |
| RN3 | O tamanho máximo por ficheiro é de 100 MB para o perfil Free e 500 MB para o perfil Premium; a duração máxima é de 60 segundos para o perfil Free e 10 minutos para o perfil Premium. O sistema deve validar ambos antes de confirmar a submissão. |
| RN4 | O carregamento de um vídeo não consome a quota diária de operações avançadas. Os limites de upload diferem por perfil: Free (100 MB/60 segundos) e Premium (500 MB/10 minutos). |
| RN5 | A submissão associa o ficheiro original a um único projeto. Recortar, converter, transcodificar, gerar miniaturas e aplicar ferramentas ao vídeo estão fora do âmbito deste caso de uso. |
| RN6 | Cada ação de submissão confirmada cria uma entrada distinta no projeto; carregar um vídeo novo não substitui automaticamente um vídeo já existente. A repetição de uma submissão cuja confirmação não chegou ao utilizador não cria entrada nova, ao contrário de uma nova submissão deliberada do mesmo ficheiro (mesmo ficheiro, nova ação, nova entrada). |
| RN7 | Os limites de 100 MB/60 segundos para Free e 500 MB/10 minutos para Premium são limites funcionais do MVP e devem ser validados antes da implementação. |
| RN8 | O sistema pode validar o ficheiro antes ou durante o envio, mas nunca associa ao projeto um ficheiro que não passou todas as validações. |

### 4.1.7 Assunções

| **ID** | **Assunção** |
| --- | --- |
| A1 | O perfil do utilizador não altera o direito de submeter vídeo. Esta decisão estende ao vídeo o modelo de acesso proposto para os projetos existentes. |
| A2 | O formato MP4/H.264 é escolhido para reduzir a variedade de formatos a validar no MVP. |
| A3 | Os limites de 100 MB/60 segundos para Free e 500 MB/10 minutos para Premium são valores de trabalho para permitir testes funcionais; não foram definidos no código existente e carecem de validação pela equipa. |
| A4 | Esta funcionalidade não processa o vídeo nem exige pré-visualização; a confirmação significa apenas que o ficheiro foi validado, guardado e associado ao projeto. |
| A5 | No MVP não existem quotas totais de armazenamento por perfil para vídeos. Os limites de tamanho e duração por ficheiro não equivalem a uma quota total de armazenamento. |

### 4.1.8 Questões em Aberto

| **ID** | **Questão** | **Resolução** |
| --- | --- | --- |
| Q1 | Devem ser aceites outros formatos de vídeos ou codecs, para além de MP4/H.264? | **Resolvida**: não no MVP; MP4/H.264/AAC é a matriz de referência (secção 4.6). |
| Q2 | Depois do MVP, devem ser impostos diferentes limites máximos de tamanho e duração dos vídeos aos diferentes perfis de utilizador? | **Resolvida para o MVP**: a diferenciação já se aplica: Free (100 MB/60 segundos/1080p) e Premium (500 MB/10 minutos/4K). |
| Q3 | Depois do MVP, será necessária uma quota total de armazenamento ou um número máximo de vídeos por projeto? | **Resolvida para o MVP**: não existe quota total de armazenamento por perfil; uma política posterior permanece fora do MVP. |
| Q4 | Deve ser permitida a pré-visualização do vídeo? | **Resolvida**: não faz parte deste caso de uso; a pré-visualização é tratada nas ferramentas de processamento. |
| Q5 | Como devem os vídeos ser apresentados no projeto e deve ser permitida a remoção do vídeo nesta funcionalidade? | **Resolvida para o MVP**: o vídeo é apresentado como recurso independente; a remoção segue a gestão normal de projetos e não é implementada pelo upload. |

---


### 4.2 UC-VID-002 — Recortar intervalo temporal de vídeo


### 4.2.1 Cabeçalho

| **Secção** | **Detalhes** |
|------------|--------------|
| **ID do Caso de Uso** | UC-VID-002 |
| **Nome** | Recortar um Intervalo Temporal de um Vídeo |
| **Versão** | v1.2 |
| **Autor** | Diogo Araújo Machado |
| **Data** | 2026-10-14 |
| **Objetivo** | Permitir ao utilizador criar um novo vídeo a partir de um intervalo temporal (início–fim) de um vídeo existente num dos seus projetos, escolhendo o formato e a resolução de saída, e acompanhar o processamento até à conclusão. |
| **Âmbito** | Módulo de vídeo do PictuRAS: nova ferramenta de recorte temporal (microsserviço de processamento ligado à fila RabbitMQ), Project Service (projetos e orquestração de ferramentas), WebSocket Gateway (progresso em tempo real), serviços de utilizadores e subscrições (plano e quota diária), armazenamento de objetos e frontend (editor e barra de ferramentas). |
| **Ator Principal** | Utilizador Registado. O perfil Free e o perfil Premium seguem o mesmo fluxo, mas têm limites, quota e prioridade de fila diferentes. |
| **Stakeholders e Interesses** | - **Utilizador**: quer obter rapidamente só o excerto pretendido, saber em que ponto está o pedido e não perder o vídeo original<br>- **Proprietário do Sistema**: quer controlar o custo computacional e de armazenamento através de quotas e limites por plano, e incentivar a subscrição Premium<br>- **Equipa de Desenvolvimento**: quer validar a cadeia completa de processamento assíncrono (fila, estados, falhas, cancelamento) com uma operação bem delimitada, reutilizando a arquitetura existente<br>- **Operações / Infraestrutura**: quer evitar saturação da fila e dos *workers*, e tarefas órfãs ou ficheiros parciais por limpar |
| **Pré-condições** | - O utilizador tem sessão iniciada com perfil Free ou Premium<br>- O vídeo pertence a um projeto do utilizador, com carregamento concluído e num formato/codec suportado<br>- A duração do vídeo não excede o limite do respetivo perfil (RN1)<br>- A quota diária de operações do utilizador não está esgotada (RN3) |
| **Trigger** | O utilizador seleciona um vídeo num projeto e escolhe a ferramenta **Recortar** |

### 4.2.2 Fluxo Principal

| **Passo** | **Ação do Ator** | **Resposta do Sistema** |
|-----------|------------------|-------------------------|
| 1 | O utilizador abre um dos seus projetos | Apresenta os ficheiros do projeto (imagens e vídeos), com nome, duração e formato nos vídeos |
| 2 | O utilizador seleciona um vídeo e escolhe a ferramenta **Recortar** | Abre o editor de recorte com pré-visualização do vídeo, linha temporal, duração total e quota diária restante |
| 3 | O utilizador define o instante inicial e o instante final do intervalo (arrastando na linha temporal ou escrevendo os valores) | Valida em tempo real o intervalo (RN2, RN4) e mostra a duração do excerto resultante |
| 4 | O utilizador escolhe o formato de saída (MP4), a resolução de saída (original ou inferior) e o nome do novo vídeo | Valida as opções face ao plano (RN5) e apresenta um resumo do pedido, com uma estimativa do tempo de processamento |
| 5 | O utilizador confirma com **Iniciar recorte** | Revalida no servidor o pedido (formato do vídeo, intervalo, limites do plano, quota, limite de tarefas simultâneas) |
| 6 | — | Cria a tarefa de recorte com um identificador único, estado **Em fila**, e coloca-a na fila de processamento (com prioridade conforme o plano, RN6) |
| 7 | — | Apresenta a tarefa no projeto com o estado **Em fila** e a posição estimada |
| 8 | — | Quando um *worker* fica disponível, a tarefa passa a **A processar**: extrai o intervalo do vídeo original, aplica a conversão pedida e envia o progresso (percentagem) ao utilizador em tempo real |
| 9 | O utilizador acompanha o progresso, podendo navegar para outras áreas ou fechar a aplicação sem interromper a tarefa | Mantém o processamento independente da sessão do utilizador |
| 10 | — | Conclui o processamento e verifica o ficheiro de saída (legível, formato e resolução pedidos, duração dentro da tolerância, RN7) |
| 11 | — | Armazena o resultado como **novo vídeo** no mesmo projeto (RN8), passa a tarefa a **Concluída** e mantém o vídeo original inalterado |
| 12 | — | Contabiliza uma operação na quota diária (RN3) e notifica o utilizador da conclusão |
| 13 | O utilizador abre o novo vídeo para o pré-visualizar ou descarregar | Reproduz o vídeo recortado e disponibiliza o descarregamento |

### 4.2.3 Fluxos Alternativos

| **Fluxo** | **Descrição** |
|-----------|---------------|
| FA1 – Cancelamento com a tarefa em fila | No passo 7, o utilizador cancela a tarefa **Em fila** → O sistema remove-a da fila, passa-a a **Cancelada**, não consome quota e não cria nenhum vídeo |
| FA2 – Cancelamento durante o processamento | Nos passos 8–9, o utilizador cancela a tarefa **A processar** → O sistema interrompe o *worker*, elimina o resultado parcial, passa a tarefa a **Cancelada**, não consome quota e mantém o original inalterado |
| FA3 – Instante final omitido | No passo 3, o utilizador define apenas o instante inicial → O sistema assume como instante final o fim do vídeo e mostra-o no resumo |
| FA4 – Nome já existente | No passo 4, já existe um ficheiro com o nome escolhido no projeto → O sistema sugere um nome alternativo (por exemplo, com sufixo numérico) e pede confirmação antes de avançar |
| FA5 – Limite de tarefas simultâneas atingido | No passo 5, o utilizador já tem o número máximo de tarefas ativas (RN6) → O sistema rejeita o pedido, informa que deve aguardar a conclusão de uma tarefa em curso e não cria tarefa nem reserva quota |
| FA6 – Perfil do utilizador | Em qualquer passo, o ator tem perfil Free ou Premium → o sistema aplica os limites e a prioridade correspondentes ao perfil: Free até 1080p, uma tarefa ativa e fila normal; Premium até 4K, três tarefas ativas e fila prioritária |
| FA7 – Regresso após ausência | O utilizador fecha a aplicação no passo 9 e regressa mais tarde → O sistema mostra, no projeto, o estado atual de cada tarefa (a processar, concluída, falhada ou cancelada) e apresenta a notificação pendente, mesmo que o utilizador não estivesse ligado quando o evento ocorreu |
| FA8 – Pedido idêntico duplicado | No passo 5, existe uma tarefa ativa do mesmo utilizador, sobre o mesmo vídeo, com o mesmo intervalo e as mesmas opções → O sistema informa que o pedido já está em curso e apresenta essa tarefa, sem criar outra |

### 4.2.4 Exceções

| **Condição** | **Comportamento do Sistema** |
|--------------|------------------------------|
| Utilizador sem sessão tenta recortar um vídeo (RN12) | A ferramenta **Recortar** aparece indisponível, com a indicação *“Inicie sessão para recortar vídeos”* e acesso ao registo/login. Não é criada nenhuma tarefa |
| **(Vídeo)** Formato ou codec do vídeo original não suportado | No passo 2, a ferramenta **Recortar** fica indisponível, com a indicação *“Formato de vídeo não suportado para recorte”* e a lista dos formatos suportados. Não é criada nenhuma tarefa |
| **(Vídeo)** Duração do vídeo ou do intervalo selecionado excede o limite do perfil (RN1) | Impede o avanço nos passos 3 ou 5 com a mensagem *“Excede o limite do seu plano (X min)”*, indicando o limite aplicável. Não é criada nenhuma tarefa |
| Intervalo inválido (início ≥ fim, instante fora da duração do vídeo ou duração inferior ao mínimo, RN2) | Marca o campo em erro, mostra a mensagem correspondente e mantém o botão **Iniciar recorte** desativado |
| **(Vídeo)** Quota diária de operações esgotada (RN3) | No passo 2 ou 5, o sistema não cria a tarefa e informa *“Quota diária esgotada”*. No Free aplica-se o limite diário de 5 operações; no Premium não há limite diário de operações de vídeo. |
| **(Vídeo)** Falha a meio do processamento (erro do *worker*, ficheiro corrompido a meio da leitura, falta de recursos) | O sistema passa a tarefa a **Falhou**, elimina o resultado parcial, não consome quota, mantém o original inalterado e notifica o utilizador com a mensagem *“Não foi possível recortar o vídeo. Tente novamente.”*. Uma nova tentativa tem de ser iniciada explicitamente pelo utilizador. |
| **(Vídeo)** Tempo máximo de processamento excedido (RN9) | Interrompe a tarefa e trata-a como falha a meio do processamento (elimina o parcial, não consome quota, notifica o utilizador) |
| O vídeo original (ou o projeto) é removido pelo utilizador enquanto a tarefa está em fila ou a processar | O sistema cancela a tarefa (como em FA1/FA2) e informa o utilizador de que o vídeo de origem deixou de existir |
| Perda de ligação do cliente durante o processamento | O processamento prossegue no servidor (passo 9). Quando o cliente se voltar a ligar, aplica-se o FA7 |
| Falha na verificação do ficheiro de saída (passo 10: duração fora da tolerância ou ficheiro ilegível) | Trata-se como falha a meio do processamento (RN9): o resultado é descartado e a tarefa passa a **Falhou** |

### 4.2.5 Pós-condições

| **Tipo** | **Resultado** |
|----------|---------------|
| Garantia de Sucesso | Existe um novo vídeo no projeto do utilizador, com o intervalo, formato e resolução pedidos; a tarefa está **Concluída**; o vídeo original está inalterado; foi consumida exatamente uma operação da quota diária; o utilizador foi notificado |
| Garantia Mínima | O vídeo original permanece inalterado e nenhum ficheiro parcial fica no projeto nem no armazenamento temporário; a tarefa termina num estado final identificável (**Falhou** ou **Cancelada**) com o motivo registado; não é consumida quota; o utilizador é informado do resultado |

### 4.2.6 Regras de Negócio e Restrições

| **ID** | **Regra** |
|--------|-----------|
| RN1 | Duração máxima do vídeo de origem: 60 segundos para o perfil Free e 10 minutos para o perfil Premium |
| RN2 | O intervalo é definido por instantes de início e fim, com 0 ≤ início < fim ≤ duração do vídeo; duração mínima do excerto de 1 s |
| RN3 | Cada recorte aceite reserva uma operação; o perfil Free está limitado a 5 operações diárias e o perfil Premium não tem limite diário de operações de vídeo. A operação só é consumida após sucesso e tarefas rejeitadas, falhadas ou canceladas antes do consumo não contam |
| RN4 | O recorte é feito ao fotograma: o instante pedido é aproximado ao fotograma mais próximo |
| RN5 | No MVP, o formato de saída é MP4 (H.264/AAC). A resolução de saída nunca excede a do vídeo original; o perfil Free está limitado a 1080p e o Premium pode escolher até 4K |
| RN6 | Tarefas ativas em simultâneo por utilizador: 1 no perfil Free e 3 no perfil Premium. As tarefas Premium são colocadas na fila prioritária |
| RN7 | A duração do vídeo resultante deve corresponder ao intervalo pedido com tolerância máxima de ±0,5 s |
| RN8 | O resultado é sempre um novo vídeo, guardado no mesmo projeto; o vídeo original nunca é alterado nem substituído |
| RN9 | Tempo máximo de processamento por tarefa: 15 min; em caso de falha, a tarefa passa a **Falhou** sem retoma automática (decisão transversal, secção 4.6) |
| RN10 | Estados internos da tarefa: `queued`, `processing`, `completed`, `failed` e `cancelled`; a interface pode apresentar as traduções **Em fila**, **A processar**, **Concluída**, **Falhou** e **Cancelada** |
| RN11 | O resultado parcial e os ficheiros temporários de tarefas falhadas ou canceladas são eliminados no prazo máximo de 1 hora |
| RN12 | Utilizadores sem sessão não têm acesso a esta funcionalidade |
| RN13 | O pedido de recorte é confirmado ao utilizador (tarefa visível no estado **Em fila**) em ≤ 2 s após a confirmação, independentemente da duração do vídeo |
| RN14 | O progresso apresentado ao utilizador é atualizado pelo menos a cada 5 s durante o processamento |

### 4.2.7 Assunções

| **ID** | **Assunção** |
|--------|--------------|
| A1 | O vídeo original está integralmente armazenado e acessível ao serviço de processamento no momento do pedido |
| A2 | A nova ferramenta pode ser integrada seguindo o padrão das ferramentas existentes (microsserviço que consome a sua fila RabbitMQ e publica o resultado e o progresso), reutilizando o WebSocket Gateway para o progresso |
| A3 | O mecanismo atual de quota diária pode ser estendido a operações de vídeo sem alterar o modelo de planos; aplica-se o limite de 5 operações ao Free e não há limite diário de operações de vídeo para Premium |
| A4 | Os limites numéricos de RN1, RN5, RN6, RN9, RN13 e RN14 são valores de trabalho do MVP, a confirmar com o docente/proprietário do sistema; a quota e os limites aplicáveis variam conforme o perfil, segundo a secção 4.6 |
| A5 | O estado das tarefas é guardado de forma persistente (por exemplo, no Project Service), de modo que o FA7 funcione; não se assume que os eventos atuais do WebSocket sejam guardados |
| A6 | O formato de entrada de referência do MVP é MP4 com vídeo H.264/AVC e áudio AAC |
| A7 | O armazenamento de objetos existente aceita ficheiros de vídeo de dezenas ou centenas de MB. A verificação de uma quota total por utilizador fica fora do MVP. |
| A8 | A análise desta versão assenta na descrição geral do repositório (README); o código dos serviços ainda não foi analisado, pelo que as assunções A2, A3 e A5 devem ser verificadas no código |

### 4.2.8 Questões em Aberto

| **ID** | **Questão** | **Resolução** |
|--------|-------------|----------------|
| Q1 | Os limites de duração, quota e tarefas simultâneas (RN1, RN3, RN6) estão corretos para cada plano? Qual é o limite diário atual do plano Premium? | **Resolvida para o MVP**: Free: 60 segundos, 5 operações/dia e 1 tarefa ativa; Premium: 10 minutos, sem limite diário de operações de vídeo e 3 tarefas ativas. |
| Q2 | Uma operação de vídeo conta como uma operação da quota partilhada com as imagens ou tem quota própria? E deve pesar o mesmo que uma operação sobre uma imagem? | **Resolvida para o MVP**: cada tarefa aceite reserva uma operação; Free usa a quota partilhada de 5 operações/dia e Premium não tem limite diário de operações de vídeo. |
| Q3 | O perfil Anónimo deve ter acesso a uma versão limitada desta funcionalidade (por exemplo, vídeos muito curtos)? | **Resolvida**: o recorte exige uma conta registada; uma sessão anónima pode apenas submeter o vídeo através do UC-VID-001. |
| Q4 | O utilizador deve poder encadear, num mesmo pedido, o recorte com outras ferramentas existentes (pipeline ou processamento em lote)? | **Resolvida**: fora do MVP; operações de vídeo são independentes (secção 4.6). |
| Q5 | Os vídeos devem ficar no mesmo armazenamento das imagens ou num armazenamento próprio, dado o tamanho? Há um limite de armazenamento por conta? | **Resolvida para o MVP**: os vídeos usam o armazenamento de objetos existente; não é introduzida uma quota total por conta no MVP. |
| Q6 | As ferramentas atuais suportam cancelamento e prioridade na fila? Se não, o cancelamento (FA1, FA2) e a fila prioritária (FA6) implicam alterar a arquitetura existente? | **Resolvida para o MVP**: o cancelamento é best effort; a fila normal aplica-se ao Free e a fila prioritária ao Premium. A capacidade da fila deve ser validada na implementação. |
| Q7 | Deve existir recorte sem re-codificação (mais rápido, mas só em fotogramas-chave) como alternativa ao recorte preciso ao fotograma? | Em aberto para uma evolução posterior; não faz parte do MVP. |
| Q8 | Por quanto tempo devem ser conservadas as tarefas concluídas, falhadas ou canceladas no histórico do projeto? | Em aberto; a retenção de registos está definida no Capítulo 5, mas a política final requer confirmação. |
| Q9 | O áudio deve poder ser removido ou mantido por opção, ou é sempre mantido? | **Resolvida para o MVP**: o áudio é preservado quando existir; remoção opcional fica fora do âmbito. |

---


### 4.3 UC-VID-003 — Converter formato ou resolução


### 4.3.1 Cabeçalho

| **Secção** | **Detalhes** |
|------------|--------------|
| **ID do Caso de Uso** | UC-VID-003 |
| **Nome** | Converter vídeo para outro formato ou resolução |
| **Versão** | v1.0.2 |
| **Autor** | Beatriz Miranda |
| **Data** | 2026-10-13 |
| **Objetivo** | Permitir ao utilizador obter uma cópia do vídeo no formato suportado e na resolução escolhida |
| **Âmbito** | Frontend, API Gateway, serviço de projetos, processamento de vídeo, armazenamento e notificações |
| **Ator Principal** | Utilizador registado |
| **Stakeholders e Interesses** | - **Utilizador**: obter um vídeo compatível sem perder o original<br>- **PictuRAS**: processar dentro dos limites do perfil e preservar a integridade dos ficheiros<br>- **Equipa de operação**: receber estados claros quando uma operação termina ou falha |
| **Pré-condições** | - O utilizador está autenticado<br>- O vídeo pertence a um projeto acessível pelo utilizador<br>- O vídeo original está disponível e pode ser lido pelo sistema |
| **Trigger** | O utilizador escolhe um vídeo e inicia a opção de conversão |

### 4.3.2 Fluxo Principal

| **Passo** | **Ação do Ator** | **Resposta do Sistema** |
|-----------|------------------|-------------------------|
| 1 | Seleciona um vídeo da sua biblioteca e escolhe “Converter”. | Apresenta o formato de saída suportado no MVP e as resoluções disponíveis para o perfil. |
| 2 | Escolhe a resolução de saída e confirma. | Valida a opção e informa se o pedido foi aceite ou rejeitado. |
| 3 | — | Regista a operação e coloca-a em processamento, mantendo o vídeo original inalterado. |
| 4 | — | Processa o vídeo e atualiza o estado da operação. |
| 5 | — | Armazena o vídeo convertido como novo resultado associado ao projeto e ao original. |
| 6 | Abre ou descarrega o resultado. | Apresenta o vídeo convertido e os seus metadados de formato e resolução. |

### 4.3.3 Fluxos Alternativos

| **Fluxo** | **Descrição** |
|-----------|---------------|
| FA1 – Formato de saída suportado | O utilizador mantém a resolução original e confirma a conversão para o formato de saída suportado no MVP (MP4/H.264/AAC). |
| FA2 – Apenas alteração de resolução | O utilizador mantém o formato de saída MP4/H.264/AAC e escolhe apenas uma resolução diferente, desde que suportada pelo perfil e não superior à resolução original. |
| FA3 – Cancelamento | O utilizador cancela antes do início do processamento; o sistema não cria resultado e liberta a quota eventualmente reservada. |

### 4.3.4 Exceções

| **Condição** | **Comportamento do Sistema** |
|--------------|------------------------------|
| O formato ou codec do vídeo de entrada não é suportado. | Rejeita o pedido, mantém o original intacto e informa o utilizador de que deve fornecer um vídeo compatível. |
| O formato ou resolução escolhidos não são suportados para o perfil. | Não inicia o processamento e apresenta as opções válidas. |
| A quota diária do perfil está esgotada. | Não inicia o processamento e informa o utilizador sobre o limite. |
| O processamento falha depois de começar. | Marca a operação como falhada, não publica um resultado incompleto, mantém o original e apresenta uma mensagem de erro. |
| O vídeo original ou o projeto é removido enquanto a tarefa está em fila ou em processamento. | Cancela a tarefa, estorna a quota reservada e informa o utilizador de que o vídeo de origem deixou de existir. |

### 4.3.5 Pós-condições

| **Tipo** | **Resultado** |
|----------|---------------|
| Garantia de Sucesso | O vídeo convertido é disponibilizado como novo resultado associado ao projeto e ao vídeo original; o original permanece inalterado. |
| Garantia Mínima | Nenhum resultado parcial ou ficheiro inválido é apresentado como concluído; o estado e a razão da falha ficam visíveis ao utilizador. |

### 4.3.6 Regras de Negócio e Restrições

| **ID** | **Regra** |
|--------|-----------|
| RN1 | Apenas utilizadores autenticados podem iniciar uma conversão. |
| RN2 | O vídeo de entrada deve pertencer a um projeto acessível pelo utilizador. |
| RN3 | O resultado é criado como novo ficheiro; o vídeo original nunca é substituído. |
| RN4 | O pedido deve respeitar a quota diária aplicável ao perfil e os limites de formato, duração, tamanho e resolução definidos para o MVP. |
| RN5 | No MVP, o formato de saída é MP4 com vídeo H.264 e áudio AAC; apenas resoluções apresentadas pelo sistema podem ser escolhidas. |

### 4.3.7 Assunções

| **ID** | **Assunção** |
|--------|--------------|
| A1 | O sistema já dispõe de autenticação, projetos, armazenamento, quotas e comunicação de estados de processamento. |
| A2 | A primeira versão suporta MP4/H.264/AAC; o Free pode escolher até 1080p e o Premium até 4K, respeitando os limites de tamanho e duração do respetivo perfil. |
| A3 | O processamento pode ser assíncrono e o utilizador não precisa de manter a página aberta. |

### 4.3.8 Questões em Aberto

| **ID** | **Questão** | **Resolução** |
|-------------|-------------|-------------|
| Q1 | Quais são exatamente os formatos, codecs, durações e tamanhos máximos suportados na primeira versão? | **Resolvida para o MVP**: MP4/H.264/AAC; Free: 100 MB/60 segundos/1080p; Premium: 500 MB/10 minutos/4K (secção 4.6). |
| Q2 | Que resoluções devem aparecer como opções predefinidas, além da resolução original? | **Resolvida para o MVP**: a resolução original ou uma resolução inferior, sem exceder 1080p no Free ou 4K no Premium. |


### 4.4 UC-VID-004 — Aplicar filtros visuais e ajustes de cor


### 4.4.1 Cabeçalho

| **Secção** | **Detalhes** |
|------------|--------------|
| **ID do Caso de Uso** | UC-VID-004 |
| **Nome** | Aplicar filtros visuais e ajustes de cor a um vídeo |
| **Versão** | v2.1 |
| **Autor** | Equipa PictuRAS |
| **Data** | 2026-10-15 |
| **Objetivo** | Permitir ao utilizador selecionar um vídeo da biblioteca, aplicar um estilo visual predefinido (ex: Preto e Branco, Sépia) ou ajustar parâmetros de cor (brilho, contraste, saturação), obtendo o resultado como um novo ficheiro na sua biblioteca. |
| **Âmbito** | Módulo de vídeo do PictuRAS: biblioteca, edição visual, processamento assíncrono, armazenamento de objetos e notificações de progresso. |
| **Ator Principal** | Utilizador autenticado — perfil registado ou premium. |
| **Stakeholders e Interesses** | - **Utilizador**: quer personalizar o aspeto visual do seu vídeo sem perder o ficheiro original.<br>- **Proprietário do Sistema**: quer disponibilizar edição visual de vídeo controlada pelos limites de cada plano contratado.<br>- **Equipa de Operações**: quer que tarefas de processamento demoradas sejam acompanháveis e não bloqueiem o pedido de outros utilizadores.<br>- **Equipa de Desenvolvimento**: quer reutilizar a infraestrutura existente de projetos, as ferramentas existentes de processamento de imagem, o armazenamento de objetos e as notificações em tempo real. |
| **Pré-condições** | - O utilizador tem sessão iniciada.<br>- O vídeo pertence ao utilizador e está disponível na biblioteca.<br>- O vídeo terminou o carregamento inicial e não está a ser processado por outra operação.<br>- Existe quota de operações disponível para o perfil. |
| **Trigger** | O utilizador seleciona um vídeo, escolhe a opção de aplicar filtros ou ajustes de cor e confirma a operação. |

### 4.4.2 Fluxo Principal

| **Passo** | **Ação do Ator** | **Resposta do Sistema** |
|-----------|------------------|-------------------------|
| 1 | O utilizador abre a biblioteca e seleciona um vídeo | Apresenta os metadados do vídeo (título, duração, resolução, tamanho e formato), uma pré-visualização no leitor e o painel de ajustes visuais (filtros predefinidos e controlos de brilho, contraste e saturação) |
| 2 | O utilizador escolhe um estilo predefinido (ex: Preto e Branco) ou ajusta os marcadores manuais de cor | Valida que os valores inseridos estão dentro dos intervalos permitidos e atualiza dinamicamente a pré-visualização do vídeo |
| 3 | O utilizador confirma a aplicação dos filtros | Valida a compatibilidade técnica do vídeo (formato, codecs, tamanho e duração face ao perfil), verifica a quota diária, reserva uma unidade da quota e cria a tarefa de processamento assíncrono |
| 4 | — | Coloca a tarefa na fila de processamento (*message broker*), associa-lhe um identificador único (UUID) e apresenta o estado **Em fila** (`queued`) |
| 5 | — | Um *worker* disponível recolhe a tarefa, extrai a faixa de áudio e decompõe o vídeo numa sequência numerada de fotogramas; aplica os filtros de imagem a cada fotograma mantendo a ordem estrita; recombina os fotogramas processados na sua ordem temporal original com a faixa de áudio original sincronizada; e emite periodicamente o progresso |
| 6 | O utilizador acompanha o estado na página do projeto (ou pode navegar para fora mantendo o processamento em segundo plano) | Apresenta a percentagem de progresso, o estado atual e a opção de cancelar a operação enquanto o processamento estiver em execução |
| 7 | — | Concluída a codificação, o sistema valida a integridade do ficheiro resultante, elimina artefactos temporários de fotogramas, regista o resultado como um novo recurso no armazenamento de objetos e na biblioteca, preserva o original intacto e confirma a dedução definitiva da quota reservada |
| 8 | O utilizador acede ao resultado na biblioteca | Apresenta o novo vídeo filtrado na biblioteca com os respetivos metadados e opções para o reproduzir no leitor, descarregar (*download*) ou reutilizar |

### 4.4.3 Fluxos Alternativos

| **Fluxo** | **Descrição** |
|-----------|---------------|
| **FA1 – Seleção de filtro predefinido (Preset)** | O utilizador seleciona um estilo pronto (ex: *Vintage* ou *Preto e Branco*) $\rightarrow$ o sistema preenche e aplica automaticamente os parâmetros de cor correspondentes na interface e na pré-visualização. |
| **FA2 – Ajuste manual de cor** | O utilizador altera diretamente os marcadores de brilho, contraste ou saturação $\rightarrow$ o sistema atualiza a pré-visualização e mostra o resumo dos valores selecionados. |
| **FA3 – Reposição dos valores originais** | O utilizador escolhe *Repor* $\rightarrow$ o sistema restaura todos os marcadores para o estado neutro e limpa os efeitos da pré-visualização. |
| **FA4 – Tarefa cancelada pelo utilizador** | O utilizador escolhe *Cancelar* antes da conclusão $\rightarrow$ o sistema interrompe a execução do *worker*, elimina todos os fotogramas e ficheiros temporários em disco, estorna a quota reservada e não publica qualquer resultado incompleto. |
| **FA5 – Utilizador navega para fora da página ou fecha a sessão** | O utilizador sai da página do projeto ou encerra o navegador durante o processamento $\rightarrow$ o processamento assíncrono continua em segundo plano no servidor; ao regressar, o utilizador encontra a tarefa concluída e o novo vídeo publicado na sua biblioteca. |

### 4.4.4 Exceções

| **Condição** | **Comportamento do Sistema** |
|--------------|------------------------------|
| **Os valores de filtro inseridos excedem os limites permitidos** | O sistema sinaliza visualmente os campos inválidos, impede a submissão e indica os limites suportados. |
| **O vídeo de origem está corrompido, tem formato inválido ou codec de vídeo não suportado** | Rejeita o pedido de imediato, apresenta mensagem de erro explícita e não cria tarefa nem debita quota. |
| **A duração, o tamanho ou a resolução do vídeo excedem o limite do perfil do utilizador** | Impede a submissão e informa os limites do plano atual: Free (60 s / 100 MB / 1080p) ou Premium (10 min / 500 MB / 4K), sugerindo atualização de plano quando aplicável. |
| **A quota diária do utilizador é insuficiente** | Bloqueia a submissão no Passo 3, informa que a quota foi atingida e não cria tarefa. Não é verificada uma quota total de armazenamento no MVP. |
| **O utilizador atinge o número máximo de tarefas ativas em simultâneo** | Impede a criação da tarefa e informa o utilizador que deve aguardar a conclusão de uma tarefa em execução. |
| **O processamento falha a meio por erro de codificação ou excede o tempo limite de 15 min** | Marca a tarefa como **Falhada**, regista a causa do erro, elimina imediatamente todos os fotogramas e artefactos temporários, estorna a quota reservada e mantém o vídeo original intacto. Não há retoma automática (decisão transversal, secção 4.6). |
| **O ficheiro final gerado falha na validação de integridade pós-codificação** | Não publica o resultado na biblioteca, marca a tarefa como falhada, limpa os temporários, estorna a quota e notifica o utilizador da falha de codificação. |
| **O vídeo original ou o projeto é removido enquanto a tarefa está em fila ou em processamento** | Cancela a tarefa, elimina os fotogramas e artefactos temporários, estorna a quota reservada e informa o utilizador de que o vídeo de origem deixou de existir. |

### 4.4.5 Pós-condições

| **Tipo** | **Resultado** |
|----------|---------------|
| **Garantia de Sucesso** | Existe um novo vídeo completo, válido e reproduzível na biblioteca e no armazenamento de objetos com os filtros visuais aplicados e áudio sincronizado; o vídeo original permanece rigorosamente inalterado; a tarefa fica marcada como concluída e a quota diária é debitada em 1 unidade. |
| **Garantia Mínima** | O vídeo original permanece disponível e inalterado na biblioteca; nenhum ficheiro parcial ou corrompido é visível; todos os fotogramas e artefactos temporários são eliminados do disco; a tarefa fica com estado explícito de falha ou cancelamento; e a unidade de quota reservada é estornada ao utilizador. |

### 4.4.6 Regras de Negócio e Restrições

| **ID** | **Regra** |
|--------|-----------|
| **RN1** | Os valores de brilho, contraste e saturação são indicados numa escala de -100 a +100, em que 0 corresponde ao valor original (ver A18). |
| **RN2** | A duração máxima do vídeo processado é de 60 segundos para o perfil Free e de 10 minutos para o perfil Premium. |
| **RN3** | O tamanho máximo do ficheiro de vídeo de entrada é de 100 MB para o perfil Free e de 500 MB para o perfil Premium. |
| **RN4** | A operação de aplicação de filtros gera sempre um novo recurso independente no armazenamento e na biblioteca; o vídeo original nunca é substituído, truncado ou modificado. |
| **RN5** | O formato de exportação gerado pelo sistema é obrigatoriamente contentor MP4 com codecs de vídeo H.264 e de áudio AAC. |
| **RN6** | Cada tarefa de filtragem de vídeo reserva 1 unidade no momento da submissão; a dedução só é consolidada após o sucesso. O perfil Free partilha o limite diário de 5 operações das ferramentas avançadas; o Premium não tem limite diário de operações de vídeo. Cancelamentos ou falhas estornam integralmente a unidade. |
| **RN7** | O novo vídeo só é publicado e disponibilizado para reprodução e descarregamento após aprovação na validação de integridade pós-processamento. |
| **RN8** | Cada utilizador pode ter, no máximo, 1 tarefa de processamento de vídeo ativa no perfil Free e 3 tarefas no perfil Premium. |
| **RN9** | A resolução máxima do vídeo processado é 1920 × 1080 px para o perfil Free e 3840 × 2160 px para o perfil Premium. |

### 4.4.7 Assunções

| **ID** | **Assunção** |
|--------|--------------|
| **A1** | O sistema consegue decompor o vídeo em fotogramas e aplicar transformações visuais reutilizando as ferramentas existentes de imagem do PictuRAS. |
| **A2** | A preservação do identificador sequencial de cada fotograma garante a reconstrução temporal exata do fluxo de vídeo e a sincronização com o áudio. |
| **A3** | O armazenamento de objetos (*Object Storage*) suporta o aumento de volume gerado pela persistência dos novos vídeos criados. |
| **A4** | A interface do utilizador consegue apresentar uma pré-visualização aproximada dos efeitos em tempo real recorrendo a filtros no cliente. |
| **A5** | A combinação da filtragem de vídeo com outras ferramentas (rotação, recorte, IA) e o processamento em lote (*batch*) de múltiplos vídeos estão fora do âmbito do MVP da Fase 1. O encadeamento interno de `brightness`, `contrast` e `saturation` é reutilizado. *(revista na v2.0)* |
| **A6** | Os limites de 60 segundos/100 MB/1080p para Free e 10 minutos/500 MB/4K para Premium assumem vídeos H.264; o limite que for atingido primeiro determina a rejeição. |
| **A7** | Os alvos de desempenho são medidos num ambiente de referência: execução local via `docker-compose`, *worker* com 1 vCPU e 2 GB de RAM, e vídeo de teste 1080p a 30 fps em H.264. |
| **A8** | O tempo de confirmação da submissão (≤ 2 s) não inclui o carregamento do vídeo, que já está na biblioteca (pré-condição do UC). |
| **A9** | O limite de 50 ms de dessincronização áudio/vídeo fica abaixo do limiar de deteção indicado na Recomendação ITU-R BT.1359 (≈ 45 ms com o áudio adiantado, ≈ 125 ms com o áudio atrasado), arredondado. |
| **A10** | O ambiente MVP dispõe de 5 réplicas de *worker* de vídeo, o que sustenta 5 tarefas em simultâneo com espera em fila ≤ 30 s. |
| **A11** | Uma validade de 15 min é suficiente para iniciar a reprodução ou o *download*; quando expira, o cliente pede um novo URL. |
| **A12** | O canal WebSocket existente (`wsGateway`, evento `process-update`) consegue transportar atualizações de progresso de vídeo com a cadência exigida. |
| **A13** | Cada tarefa de filtragem de vídeo conta como **1 operação**, independentemente do número de fotogramas e de ajustes; o perfil Free partilha o limite diário de 5 operações e o Premium não tem limite diário de operações de vídeo. |
| **A14** | Não existe quota total de armazenamento por conta no MVP. O armazenamento de objetos deve suportar os ficheiros de vídeo previstos, e a gestão de espaço por perfil fica para uma evolução posterior. |
| **A15** | Codecs de áudio aceites na entrada: AAC, MP3, Opus e AC-3. Vídeos sem faixa de áudio são aceites e produzem um MP4 sem áudio. |
| **A16** | "Falha transitória" é a terminação abrupta do *worker*, a perda de ligação ao *broker* ou ao armazenamento, ou o *timeout*. Nenhuma falha é repetida automaticamente no MVP (decisão transversal, secção 4.6). |
| **A17** | Estimativa do débito do MVP: a filtragem reutiliza as ferramentas de imagem existentes, que trocam cada fotograma via RabbitMQ e armazenamento de objetos. Estima-se ≈ 0,3 s de CPU por fotograma 1080p para os 3 ajustes, ou seja ≈ 10 min para os 1800 fotogramas de um vídeo de 60 s a 30 fps. O valor tem de ser confirmado por medição no protótipo. |
| **A18** | A escala [-100, +100] da RN1 (0 = neutro) é a apresentada ao utilizador. É convertida no fator multiplicativo das ferramentas existentes `brightness`, `contrast` e `saturation` (intervalo [0, 2], 1 = neutro) pela fórmula fator = 1 + valor / 100. |

### 4.4.8 Questões em Aberto

| **ID** | **Questão** | **Estado (v2.0)** |
|--------|-------------|-------------------|
| **Q1** | A pré-visualização dos filtros na interface deve ser gerada localmente no navegador ou através de um fotograma processado pelo servidor? | **Resolvida para o MVP**: pré-visualização aproximada no cliente, conforme A4. |
| **Q2** | O utilizador deve poder guardar combinações de ajustes manuais como estilos personalizados? | **Resolvida para o MVP**: não; podem ser reutilizados *presets* existentes, mas guardar novos estilos fica fora do âmbito. |
| **Q3** | Devem ser disponibilizados outros formatos de saída além de MP4/H.264 no MVP? | Fechada: só MP4/H.264/AAC no MVP (RN5) |
| **Q4** | Os ficheiros de vídeo na biblioteca do utilizador devem ter prazo de expiração automático ou persistência indefinida sujeita ao limite de espaço da conta? | **Resolvida no MVP**: os recursos persistem durante a vida do projeto, sem quota total de armazenamento por perfil; a política de quota fica fora do MVP. |

---


### 4.5 UC-VID-005 — Detetar pessoas e objetos por fotograma


### 4.5.1 Cabeçalho

| **Secção** | **Detalhes** |
|------------|--------------|
| **ID do Caso de Uso** | UC-VID-005 |
| **Nome** | Detetar Pessoas e Objetos num Vídeo |
| **Versão** | v1.1 |
| **Autor** | José Miguel Fernandes Cação |
| **Data** | 2026-10-17 |
| **Objetivo** | Permitir ao utilizador submeter um vídeo, selecionar deteção de pessoas e/ou objetos e obter um resultado com as deteções identificadas em cada fotograma, sem alterar o vídeo original. |
| **Âmbito** | Frontend, API Gateway, serviço de projetos, armazenamento de objetos, RabbitMQ, workers de IA e WebSocket Gateway do PictuRAS. |
| **Ator Principal** | Utilizador registado com permissão de edição no projeto; pode ter perfil gratuito ou premium. |
| **Stakeholders e Interesses** | - **Utilizador**: pretende analisar pessoas e objetos ao longo de um vídeo e consultar ou descarregar os resultados.<br>- **Proprietário do sistema**: pretende disponibilizar uma funcionalidade diferenciadora, controlando o consumo de recursos e as operações avançadas.<br>- **Equipa de desenvolvimento**: pretende reutilizar a arquitetura assíncrona existente e manter o processamento isolado em workers.<br>- **Administrador da infraestrutura**: pretende que os ficheiros temporários e os resultados não comprometam o armazenamento ou a estabilidade dos serviços. |
| **Pré-condições** | - O utilizador tem sessão iniciada e pode editar o projeto selecionado.<br>- O projeto existe e pode receber um novo conteúdo.<br>- O vídeo está num formato suportado pela implementação de vídeo e respeita os limites de tamanho e duração definidos para o perfil.<br>- Pelo menos uma ferramenta (`people_ai` ou `obj_ai`) está disponível e foi selecionada.<br>- O sistema consegue aceder ao armazenamento de objetos, ao RabbitMQ e aos workers necessários.<br>- O carregamento do vídeo nos passos 1–2 segue as regras do UC-VID-001; a deteção exige conta registada (secção 4.6). |
| **Trigger** | O utilizador seleciona ou carrega um vídeo, escolhe `people_ai` e/ou `obj_ai` e confirma a operação **Detetar no vídeo**. |

### 4.5.2 Fluxo Principal

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

### 4.5.3 Fluxos Alternativos

| **Fluxo** | **Descrição** |
|-----------|---------------|
| **FA1 — Apenas deteções estruturadas** | O utilizador não solicita vídeo anotado. O sistema guarda apenas um resultado estruturado, por exemplo JSON ou CSV, com o índice/instante do fotograma, classe, confiança e caixa delimitadora normalizada. |
| **FA2 — Vídeo anotado** | O utilizador solicita a visualização das deteções. O worker sobrepõe caixas e rótulos aos fotogramas e produz um vídeo anotado, mantendo também o resultado estruturado para consulta. |
| **FA3 — Duas ferramentas no mesmo vídeo** | O utilizador seleciona `people_ai` e `obj_ai`. O sistema executa as duas deteções no mesmo pipeline e combina os resultados por fotograma; a execução conta como uma operação aceite |
| **FA4 — Cancelamento** | O utilizador cancela uma execução pendente ou em processamento. O sistema invalida a execução, impede que resultados parciais sejam publicados como resultado final, limpa os temporários e devolve as operações ainda não consumidas, quando aplicável. |

### 4.5.4 Exceções

| **Condição** | **Comportamento do Sistema** |
|--------------|------------------------------|
| O utilizador não está autenticado ou não tem permissão de edição no projeto. | Rejeita o pedido sem guardar o vídeo nem reservar operações e apresenta um erro de autenticação/autorização. |
| O formato, codec, tamanho ou duração do vídeo não é suportado. | Rejeita o ficheiro antes de o enfileirar, explica a restrição aplicável e mantém o projeto e a quota inalterados. |
| A quota diária não é suficiente. | Não inicia a execução, não publica mensagem para o worker e informa que o limite diário foi atingido. No perfil Free aplica-se o limite de 5 operações; o Premium não tem limite diário de operações de vídeo. |
| O armazenamento, RabbitMQ ou worker não está disponível. | Regista o erro, marca a execução como falhada, remove os recursos temporários que tenham sido criados e devolve as operações reservadas que ainda não tenham sido consumidas. |
| O worker falha durante a extração ou deteção de um fotograma. | Termina a execução com estado **falhado**, não disponibiliza um resultado incompleto como resultado final, conserva o vídeo original e apresenta uma mensagem que permite tentar novamente. |
| O utilizador inicia uma nova execução ou cancela a execução atual antes da conclusão. | O sistema invalida a execução anterior através do mecanismo de tokens existente e só aceita como resultado final uma execução que continue a ser a ativa. |
| O vídeo original ou o projeto é removido enquanto a execução está pendente ou em processamento. | Cancela a execução, limpa os temporários, devolve as operações reservadas e informa o utilizador de que o vídeo de origem deixou de existir. |

### 4.5.5 Pós-condições

| **Tipo** | **Resultado** |
|----------|---------------|
| **Garantia de Sucesso** | O vídeo original continua disponível no projeto; a execução fica concluída; o resultado estruturado e, se solicitado, o vídeo anotado ficam associados ao projeto; a quota reflete as operações efetivamente reservadas/consumidas; o utilizador é notificado da conclusão. |
| **Garantia Mínima** | O vídeo original não é alterado; uma execução incompleta não é apresentada como concluída; os temporários são removidos tanto quanto possível; o erro é registado e comunicado; as operações não consumidas são devolvidas segundo a política de quota. |

### 4.5.6 Regras de Negócio e Restrições

| **ID** | **Regra** |
|--------|-----------|
| **RN1** | Apenas utilizadores autenticados com permissão de edição podem iniciar ou cancelar uma execução de deteção num projeto. |
| **RN2** | `people_ai` deteta apenas a classe pessoa; `obj_ai` deteta as classes de objetos suportadas pelo modelo YOLO configurado. |
| **RN3** | Cada deteção deve incluir, no mínimo, a classe, a confiança, o índice ou instante do fotograma e uma caixa delimitadora em coordenadas normalizadas. |
| **RN4** | A execução de ferramentas de IA está sujeita à quota diária de 5 operações no perfil Free; o perfil Premium não tem limite diário de operações de vídeo. Uma execução que combine `people_ai` e `obj_ai` conta como uma operação aceite. |
| **RN5** | O vídeo original é imutável. Os resultados são armazenados como artefactos separados e devem manter uma referência à execução que os produziu. |
| **RN6** | Uma execução só pode ser considerada concluída quando todos os fotogramas e ferramentas selecionadas terminarem com sucesso. |
| **RN7** | O processamento deve permanecer assíncrono: o pedido web não deve esperar pela duração total do vídeo; o progresso e o estado final devem ser comunicados por eventos do WebSocket Gateway. |
| **RN8** | O acesso ao vídeo e aos resultados deve respeitar as permissões do projeto e as URLs temporárias do serviço de armazenamento. |

### 4.5.7 Assunções

| **ID** | **Assunção** |
|--------|--------------|
| **A1** | A primeira versão suporta um conjunto limitado de formatos e codecs, definido pela implementação e validado antes de a execução entrar na fila. |
| **A2** | O armazenamento de objetos continua a ser o SeaweedFS compatível com S3 usado pelo projeto; o volume partilhado existente pode ser usado apenas como espaço temporário de processamento. |
| **A3** | A arquitetura atual de filas por ferramenta e a fila `ws_queue` podem ser estendidas para vídeo sem tornar o processamento síncrono. |
| **A4** | Os workers conseguem processar os fotogramas de forma sequencial ou em lotes sem carregar o vídeo inteiro em memória. |
| **A5** | O resultado estruturado é a saída obrigatória da primeira versão; a geração de vídeo anotado pode ser ativada como opção se o custo de armazenamento e processamento for aceitável. |

### 4.5.8 Questões em Aberto

| **ID** | **Questão** | **Resolução** |
|--------|-------------|----------------|
| **Q1** | Quais são exatamente os formatos, codecs, tamanhos máximos e durações máximas suportados na primeira versão? | **Resolvida para o MVP**: MP4/H.264/AAC; Free: 100 MB/60 segundos/1080p; Premium: 500 MB/10 minutos/4K (secção 4.6). |
| **Q2** | A quota deve ser debitada por vídeo, por ferramenta selecionada, por duração ou por número de fotogramas processados? | **Resolvida para o MVP**: uma operação por execução aceite; `people_ai` e `obj_ai` combinados contam como uma operação. |
| **Q3** | O resultado estruturado deve ser JSON, CSV ou ambos, e qual será o contrato de versionamento desse formato? | **Resolvida para o MVP**: JSON obrigatório; versionamento do contrato será definido na implementação. |
| **Q4** | O vídeo anotado faz parte da primeira entrega ou fica limitado ao resultado estruturado? | **Resolvida**: JSON é obrigatório; vídeo anotado é opcional e não bloqueia a conclusão (secção 4.6). |
| **Q5** | O progresso deve ser comunicado por percentagem de fotogramas processados, por etapas do pipeline ou por ambos? | **Resolvida para o MVP**: percentagem de progresso e estado da tarefa; a cadência é no máximo 5 segundos quando houver informação. |
| **Q6** | O cancelamento deve interromper imediatamente a inferência atual ou apenas impedir a publicação dos resultados e limpar a execução? | **Resolvida para o MVP**: cancelamento best effort; impede a publicação, limpa temporários e estorna quota não consumida. |
| **Q7** | Deve ser possível retomar uma execução interrompida a partir do último fotograma concluído? | **Resolvida**: não há retoma automática no MVP; uma nova execução deve ser submetida explicitamente. |

---


### 4.6 Decisões transversais de consolidação

| Tema | Decisão comum |
|---|---|
| Perfis | O upload base pode ser realizado por uma sessão anónima com acesso ao projeto; as operações de processamento exigem conta registada, autenticação e permissão no projeto. Free e Premium mantêm limites, quota e prioridade de fila diferentes; não há quota total de armazenamento por perfil no MVP. |
| Formato | MP4/H.264/AVC com AAC é a matriz de referência; WebM/MKV ficam adiados. |
| Limites | Free: 100 MB, 60 segundos e 1080p; Premium: 500 MB, 10 minutos e 4K. O limite que for atingido primeiro determina a rejeição. |
| Estados | `queued`, `processing`, `completed`, `failed`, `cancelled`; a interface pode traduzir os estados. |
| Quota | Upload não conta. Free: 5 operações diárias partilhadas com as ferramentas avançadas; Premium: sem limite diário de operações de vídeo. Cada tarefa aceite reserva uma operação; rejeição, cancelamento ou falha antes do consumo estorna a reserva. |
| Armazenamento | Os vídeos e resultados são guardados no armazenamento de objetos existente. Não há quota total de armazenamento por perfil no MVP; os limites de 2 GB/50 GB ficam para uma evolução posterior. |
| Concorrência | Free: uma tarefa ativa e fila normal; Premium: três tarefas ativas e fila prioritária. |
| Resultados | O original nunca é substituído; os resultados são recursos independentes e só são publicados após validação. |
| Retries | O upload pode ser repetido explicitamente pelo utilizador após uma falha; as tarefas de processamento não têm retry automático no MVP. |
| Encadeamento/lote | Fora do MVP; as operações de vídeo são independentes das ferramentas e lotes de imagem. |

## 5. Especificação de Requisitos do Sistema (ERS)

### 5.1 Requisitos funcionais

`NOVO` significa que a capacidade não existe na baseline de imagem. `ALT (ID)` significa que
a extensão altera ou expande o comportamento do elemento da baseline indicado.

Na notação `REQ-VID-{FUNC}-nnn`, `COM` identifica a área comum/transversal a várias funcionalidades de vídeo. Um requisito comum aparece uma única vez; em `Origem`, listam-se apenas os casos de uso e elementos que realmente lhe dão origem. Se o requisito se aplicar a todos os cinco casos, então indicam-se UC-VID-001 a UC-VID-005.

| ID | Requisito | Prioridade | Novo/Alt | Origem | Justificação | Critério de aceitação |
|---|---|---|---|---|---|---|
| `REQ-VID-COM-001` | O sistema deve autenticar e autorizar o utilizador antes de qualquer operação de processamento de vídeo; o upload base deve validar apenas a sessão e o acesso ao projeto. | Must | ALT (`RF70`, `RNF44`) | UC-VID-001/RN1; UC-VID-002/RN12; UC-VID-003/RN1–2; UC-VID-004/Pré-condições; UC-VID-005/RN1 | Mantém o upload como gestão base de conteúdo e exige identidade persistente para operações assíncronas, quota e resultados. | Dado utilizador sem sessão ou sem acesso ao projeto, quando tenta upload ou processamento, então o sistema rejeita; dado processamento iniciado por sessão anónima, então rejeita sem criar tarefa. |
| `REQ-VID-COM-002` | O sistema deve apresentar metadados do vídeo selecionado, incluindo nome, duração, resolução, tamanho e formato. | Must | NOVO | UC-VID-001/Passo 3; UC-VID-002/Passos 1–2; UC-VID-003/Passo 1; UC-VID-004/Passo 1; UC-VID-005/Passos 1–2 | Permite ao utilizador confirmar que selecionou o vídeo correto antes de iniciar qualquer operação. | Dado vídeo no projeto, quando o utilizador o seleciona, então são apresentados nome, duração, resolução, tamanho e formato. |
| `REQ-VID-COM-003` | O sistema deve validar conteúdo pelo ficheiro, e não apenas pela extensão, incluindo contentor, MIME, codec, integridade, tamanho, duração e resolução. | Must | NOVO | UC-VID-001/Passo 5; UC-VID-002/Exceções; UC-VID-003/Exceções; UC-VID-004/Passo 3; UC-VID-005/Passo 2 | Impede submissão de ficheiros inválidos que causariam falhas nos workers. | Dado ficheiro com extensão válida mas conteúdo inválido, quando submetido, então o sistema rejeita e indica o critério falhado. |
| `REQ-VID-COM-004` | O sistema deve rejeitar entradas fora da matriz aprovada e indicar a causa. | Must | NOVO | UC-VID-001/Exceções; UC-VID-002/Exceções; UC-VID-003/Exceções; UC-VID-004/Exceções; UC-VID-005/Exceções | Torna a rejeição acionável pelo utilizador. | Dado pedido rejeitado, quando o sistema responde, então a mensagem indica a causa específica da rejeição. |
| `REQ-VID-COM-005` | O sistema deve criar uma tarefa com identificador único, utilizador, projeto, vídeo, parâmetros e estado. | Must | NOVO | UC-VID-002/Passos 5–7; UC-VID-003/Passos 2–3; UC-VID-004/Passos 3–4; UC-VID-005/Passos 4–5 | Permite acompanhamento, auditoria e recuperação de tarefas. | Dado pedido aceite, quando a tarefa é criada, então existe um registo com ID único, utilizador, projeto, vídeo, parâmetros e estado. |
| `REQ-VID-COM-006` | O sistema deve usar os estados `queued`, `processing`, `completed`, `failed` e `cancelled`. | Must | NOVO | UC-VID-002/RN10; UC-VID-003/Passos 3–5; UC-VID-004/Passos 4–7; UC-VID-005/Passos 5–8 | Define um ciclo de vida comum e verificável para todas as operações assíncronas de vídeo. | Dado qualquer tarefa, quando o estado muda, então assume apenas um dos valores: queued, processing, completed, failed ou cancelled. |
| `REQ-VID-COM-007` | O sistema deve comunicar estado e progresso disponível apenas a utilizadores autorizados. | Should | ALT (`RNF43`, `RNF44`) | UC-VID-002/FA7; UC-VID-003/Passos 3–6; UC-VID-004/Passos 4–8; UC-VID-005/Passos 8–9 | Protege o estado e o progresso de operações contra acesso não autorizado. | Dado utilizador sem permissão no projeto, quando consulta o estado ou progresso de uma tarefa, então o sistema rejeita o pedido. |
| `REQ-VID-COM-008` | O sistema deve permitir cancelar tarefas não finais quando o worker o permitir. | Should | NOVO | UC-VID-002/FA1–FA2; UC-VID-003/FA3; UC-VID-004/FA4; UC-VID-005/FA4 | Permite recuperar recursos quando o utilizador desiste antes de consumir processamento. | Dado tarefa em estado queued, quando o utilizador a cancela, então a tarefa fica cancelled e a quota reservada é estornada. |
| `REQ-VID-COM-009` | O sistema deve reservar uma operação ao aceitar uma tarefa, aplicar o limite diário de 5 operações ao perfil Free, não limitar operações de vídeo do Premium, não contar rejeições e estornar reserva não consumida. | Must | ALT (`RNF48`) | UC-VID-002/RN3; UC-VID-003/RN4; UC-VID-004/RN6; UC-VID-005/RN4 | Liga as operações de vídeo ao modelo de quota existente, preservando a diferenciação dos planos. | Dado pedido Free que exceda 5 operações ou pedido rejeitado, quando o sistema responde, então não cria tarefa; dado pedido Premium válido, então não é bloqueado por quota diária de vídeo. |
| `REQ-VID-COM-010` | O sistema deve manter o original inalterado e guardar cada resultado como recurso independente associado ao projeto e origem. | Must | NOVO | UC-VID-002/RN8; UC-VID-003/RN3; UC-VID-004/RN4; UC-VID-005/RN5 | Garante integridade dos ativos e rastreabilidade dos resultados. | Dado processamento concluído, quando o utilizador consulta o projeto, então o original está inalterado e o resultado aparece como recurso independente associado ao original. |
| `REQ-VID-COM-011` | O sistema deve remover ou ocultar artefactos parciais e temporários após sucesso, falha ou cancelamento. | Must | NOVO | UC-VID-001/Garantia mínima; UC-VID-002/FA1–FA2; UC-VID-003/Exceções; UC-VID-004/Garantia mínima; UC-VID-005/FA4 e Exceções | Impede que ficheiros parciais sejam confundidos com resultados válidos. | Dado tarefa terminada (sucesso, falha ou cancelamento), quando o utilizador consulta o projeto, então nenhum ficheiro parcial é visível ou descarregável. |
| `REQ-VID-COM-012` | O sistema deve permitir consultar tarefas e resultados depois de fechar e reabrir a aplicação. | Should | ALT (`RNF45`) | UC-VID-002/FA7; UC-VID-003/Passos 5–6; UC-VID-004/Passo 8; UC-VID-005/Passo 9 | Garante persistência do trabalho do utilizador entre sessões. | Dado utilizador que fecha e reabre a aplicação, quando consulta o projeto, então as tarefas e resultados anteriores estão visíveis com o respetivo estado. |
| `REQ-VID-COM-013` | O sistema deve rejeitar um pedido de processamento quando o utilizador já tiver o número máximo de tarefas em `queued` ou `processing` do seu perfil (Free: 1; Premium: 3). | Must | NOVO | UC-VID-002/RN6 e FA5; UC-VID-004/RN8 e Exceção 5; secção 4.6/Concorrência | Controla a ocupação dos workers e impede que um utilizador ocupe a fila sozinho. | Dado utilizador Free com 1 tarefa ativa, quando submete outro pedido, então o sistema rejeita-o sem criar tarefa nem reservar quota; dado utilizador Premium com 2 tarefas ativas, quando submete outro pedido válido, então o pedido é aceite. |
| `REQ-VID-COM-014` | O sistema deve iniciar as tarefas em `queued` de utilizadores Premium antes das tarefas em `queued` de utilizadores Free. | Should | NOVO | UC-VID-002/RN6 e FA6; secção 4.6/Concorrência | Concretiza a diferenciação de serviço do perfil Premium. | Dado uma tarefa Free e, depois, uma tarefa Premium em `queued` com todos os workers ocupados, quando um worker fica livre, então é iniciada a tarefa Premium. |
| `REQ-VID-COM-015` | O sistema deve cancelar as tarefas em `queued` ou `processing` cujo vídeo de origem ou projeto seja removido. | Should | NOVO | UC-VID-002/Exceção de remoção; UC-VID-003/Exceção de remoção; UC-VID-004/Exceção de remoção; UC-VID-005/Exceção de remoção | Evita tarefas presas e workers a ler ficheiros que já não existem. | Dado tarefa em `processing`, quando o utilizador remove o vídeo de origem, então a tarefa passa a `cancelled`, a quota reservada é estornada e o utilizador é informado. |
| `REQ-VID-COM-016` | O sistema deve validar novamente o vídeo, os parâmetros, os limites do perfil e a quota no momento em que aceita cada tarefa, independentemente das validações feitas na interface. | Must | NOVO | UC-VID-002/Passo 5; UC-VID-003/Passo 2; UC-VID-004/Passo 3; UC-VID-005/Passo 4 | Impede que as validações da interface sejam contornadas e que entrem na fila pedidos inválidos. | Dado pedido enviado sem passar pela interface, com parâmetros fora dos limites, quando o sistema o recebe, então rejeita-o sem criar tarefa nem reservar quota. |
| `REQ-VID-COM-017` | O sistema deve registar o motivo do estado final de cada tarefa que termine em `failed` ou `cancelled`. | Should | NOVO | UC-VID-002/Garantia mínima; UC-VID-004/Exceção 6; UC-VID-005/Exceção 4 | Sem retry automático, o motivo é a única forma de diagnosticar a falha e de a explicar ao utilizador. | Dado tarefa terminada em `failed` por tempo máximo excedido, quando se consulta o registo da tarefa, então o motivo está registado. |
| `REQ-VID-COM-018` | O sistema deve verificar que o vídeo resultante é legível e corresponde ao formato e à resolução pedidos antes de o publicar. | Must | NOVO | UC-VID-002/Passo 10 e exceção de validação; UC-VID-003/Garantia mínima; UC-VID-004/Passo 7 e RN7; secção 4.6/Resultados | Garante que só são publicados resultados válidos, em todas as ferramentas que produzem vídeo. | Dado vídeo resultante ilegível ou com resolução diferente da pedida, quando o processamento termina, então a tarefa passa a `failed` e o ficheiro não é publicado. |
| `REQ-VID-UPL-001` | O sistema deve permitir submeter vídeo para projeto acessível e, quando aplicável, criar projeto a partir de vídeo. | Must | ALT (`UC04`, `RF50`) | UC-VID-001 | É a entrada funcional do suporte a vídeo e valida a integração upload–projeto. | Dado utilizador autenticado com projeto acessível, quando submete vídeo válido, então o vídeo é guardado e associado ao projeto. |
| `REQ-VID-UPL-002` | O sistema deve apresentar progresso durante o upload e confirmar associação apenas após guardar ficheiro completo. | Must | NOVO | UC-VID-001 | Impede que o utilizador fique sem feedback durante transferências de centenas de MB. | Dado upload em curso, quando decorre tempo, então o progresso é atualizado; quando termina, a confirmação só aparece após guardar o ficheiro completo. |
| `REQ-VID-UPL-003` | O sistema deve permitir cancelar upload ou fechar seletor sem alterar projeto. | Should | NOVO | UC-VID-001 | Garante que cancelar a seleção ou o upload não produz efeitos laterais no projeto. | Dado seletor aberto ou upload em curso, quando o utilizador cancela, então o projeto não tem nova entrada e nenhum ficheiro parcial fica acessível. |
| `REQ-VID-UPL-004` | O sistema deve adicionar vídeo sem substituir conteúdos existentes e manter o original. | Must | ALT (`UC04`, `RNF45`) | UC-VID-001 | Preserva vídeos existentes ao adicionar novos. | Dado projeto com vídeo existente, quando o utilizador submete outro vídeo válido, então o vídeo original permanece acessível e um novo recurso independente é criado. |
| `REQ-VID-UPL-005` | O sistema deve permitir repetir submissão após falha e evitar duplicação de confirmação repetida. | Should | NOVO | UC-VID-001 | Evita duplicação por re-submit e permite recuperação de falha. | Dado upload falhado, quando o utilizador tenta novamente, então é criada exatamente uma entrada; dado confirmação repetida da mesma submissão, então não é criada entrada duplicada. |
| `REQ-VID-UPL-006` | O sistema não deve contabilizar a submissão de um vídeo como operação da quota diária. | Must | ALT (`RNF48`) | UC-VID-001 RN4; secção 4.6 (Quota) | Mantém o upload como gestão base de conteúdo e delimita a regra de contagem de operações para vídeo. | Dado utilizador Free sem operações restantes, quando submete um vídeo válido, então a submissão é aceite e o contador de operações não muda. |
| `REQ-VID-TRIM-001` | O sistema deve permitir definir início e fim por marcadores ou valores e mostrar duração do resultado. | Must | NOVO | UC-VID-002 | É a interface principal de definição do intervalo de recorte. | Dado vídeo selecionado, quando o utilizador acede à ferramenta Recortar, então pode definir início e fim por marcadores ou campos numéricos e vê a duração do resultado. |
| `REQ-VID-TRIM-002` | O sistema deve validar `0 ≤ início < fim ≤ duração` e rejeitar intervalos inferiores a 1 segundo. | Must | NOVO | UC-VID-002 | Impede a criação de tarefas com intervalos geometricamente inválidos. | Dado intervalo com início ≥ fim ou duração < 1 s, quando o utilizador tenta confirmar, então o botão está desativado e é mostrada mensagem de erro. |
| `REQ-VID-TRIM-003` | O sistema deve aproximar limites ao fotograma mais próximo e usar o fim do vídeo quando omitido. | Should | NOVO | UC-VID-002 | Garante resultado determinístico sem sub-frame e suporte ao caso de fim omitido. | Dado instante não coincidente com fotograma, quando o utilizador define esse limite, então o sistema usa o fotograma mais próximo; dado fim omitido, então usa o fim do vídeo. |
| `REQ-VID-TRIM-004` | O sistema deve permitir escolher nome e resolução não superior ao original e apresentar o formato de saída MP4/H.264/AAC e um resumo antes da confirmação. | Must | NOVO | UC-VID-002 | Permite ao utilizador controlar o resultado sem oferecer formatos fora da matriz do MVP e ver o resumo antes de consumir quota. | Dado editor de recorte, quando o utilizador está a configurar, então pode escolher nome e resolução ≤ original, vê o formato MP4/H.264/AAC e vê o resumo antes de confirmar. |
| `REQ-VID-TRIM-005` | O sistema deve produzir excerto com duração até 0,5 s diferente do intervalo solicitado e preservar áudio quando aplicável. | Must | NOVO | UC-VID-002 | Estabelece tolerância mensurável para a precisão temporal do recorte e preservação de áudio. | Dado excerto produzido, quando comparado com o intervalo solicitado, então a duração difere no máximo 0,5 s; dado vídeo original com áudio, então o áudio está presente no excerto. |
| `REQ-VID-TRIM-006` | O sistema deve conservar tarefas concluídas e permitir recortar resultados anteriores. | Should | NOVO | UC-VID-002 | Permite recortar iterativamente a partir de resultados anteriores. | Dado vídeo resultado de recorte anterior, quando o utilizador escolhe Recortar, então a operação é aceite e o resultado anterior permanece acessível. |
| `REQ-VID-CONV-001` | O sistema deve apresentar apenas formatos/codecs e resoluções suportados para vídeo e perfil. | Must | NOVO | UC-VID-003 | Evita que o utilizador submeta combinações inválidas que o serviço não consegue produzir. | Dado vídeo e perfil, quando o utilizador consulta opções de conversão, então apenas formatos/codecs e resoluções suportados são apresentados. |
| `REQ-VID-CONV-002` | O sistema deve aceitar conversão apenas após validar entrada, limites, autorização, quota e alteração efetiva. | Must | NOVO | UC-VID-003 | Garante que só são aceites pedidos completos e válidos antes de consumir recursos. | Dado pedido de conversão, quando o utilizador confirma, então o sistema valida entrada, limites, autorização, quota e existência de alteração efetiva antes de criar tarefa. |
| `REQ-VID-CONV-003` | O sistema deve manter formato quando só muda resolução e resolução quando só muda formato, se suportados. | Should | NOVO | UC-VID-003 | Evita alterações não solicitadas quando o utilizador muda apenas uma dimensão. | Dado pedido que altera só o formato, quando termina, então a resolução é igual à original (se suportada); dado pedido que altera só a resolução, então o formato é mantido. |
| `REQ-VID-CONV-004` | O sistema deve rejeitar ou confirmar explicitamente conversão sem alteração efetiva. | Could | NOVO | UC-VID-003 | Evita consumo acidental de quota e armazenamento por cópia idêntica. | Dado pedido com formato e resolução iguais ao original, quando confirmado, então o sistema rejeita ou pede confirmação explícita antes de criar tarefa. |
| `REQ-VID-CONV-005` | O sistema deve disponibilizar resultado para reprodução/download e apresentar formato, codec e resolução. | Must | NOVO | UC-VID-003 | O resultado só tem valor se estiver acessível para uso e verificável. | Dado processamento concluído e utilizador autorizado, quando abre ou descarrega resultado, então o ficheiro está disponível e são apresentados formato, codec e resolução. |
| `REQ-VID-FLT-001` | O sistema deve apresentar pré-visualização, metadados, presets e marcadores de brilho, contraste e saturação. | Must | ALT (`RF39`, `RF66`) | UC-VID-004 | Fornece ao utilizador informação e controlos suficientes para fazer uma escolha informada. | Dado vídeo selecionado, quando abre o painel de filtros, então são apresentados metadados, pré-visualização, presets e marcadores de brilho, contraste e saturação. |
| `REQ-VID-FLT-002` | O sistema deve validar intervalos dos ajustes, preencher preset e permitir Repor ao estado neutro. | Must | ALT (`RF39`, `RF66`–`RF68`) | UC-VID-004 | Impede submissão de parâmetros fora dos intervalos aceites pelos workers. | Dado marcador fora do intervalo válido, quando o utilizador tenta confirmar, então o sistema indica o limite e bloqueia a submissão; dado preset selecionado, então preenche os parâmetros; dado Repor, então restaura valores neutros. |
| `REQ-VID-FLT-003` | O sistema deve atualizar pré-visualização e resumo antes da submissão. | Should | NOVO | UC-VID-004 | Garante que o utilizador vê o efeito dos filtros antes de consumir quota. | Dado ajuste de filtros, quando o utilizador altera parâmetros, então a pré-visualização e o resumo são atualizados antes da confirmação. |
| `REQ-VID-FLT-004` | O sistema deve extrair e processar fotogramas sequencialmente, preservando ordem, resolução e cadência. | Must | NOVO | UC-VID-004 | Garante que os filtros são aplicados uniformemente a todos os fotogramas sem artefactos de ordem. | Dado processamento de vídeo com filtros, quando concluído, então a ordem, resolução e cadência dos fotogramas são preservadas. |
| `REQ-VID-FLT-005` | O sistema deve preservar áudio AAC ou recodificar áudio suportado para AAC e manter sincronização até 50 ms. | Must | NOVO | UC-VID-004 | Mantém a experiência auditiva do vídeo original após filtragem. | Dado vídeo com áudio AAC ou suportado, quando filtrado, então o áudio está presente no resultado e a dessincronização áudio/vídeo é ≤ 50 ms. |
| `REQ-VID-FLT-006` | O sistema deve validar e guardar o vídeo filtrado como novo recurso reproduzível e descarregável. | Must | ALT (`UC04`, `RNF45`) | UC-VID-004 | Garante que o resultado filtrado é um recurso utilizável e independente. | Dado processamento concluído, quando o utilizador acede ao resultado, então é um novo recurso reproduzível e descarregável, com o original intacto. |
| `REQ-VID-DET-001` | O sistema deve permitir selecionar `people_ai`, `obj_ai` ou ambas e rejeitar ausência de ferramenta. | Must | ALT (`RF46`) | UC-VID-005 | Permite ao utilizador escolher a análise pretendida e impede execuções sem alvo. | Dado nenhuma ferramenta selecionada, quando o utilizador confirma, então o pedido é rejeitado; dado pelo menos uma ferramenta, então o pedido é aceite se as demais validações passarem. |
| `REQ-VID-DET-002` | O sistema deve permitir score mínimo entre 0 e 1 quando configurável. | Should | NOVO | UC-VID-005 | Permite filtrar deteções de baixa confiança. | Dado score mínimo configurável entre 0 e 1, quando o utilizador define um valor e confirma, então apenas deteções com score ≥ ao valor definido são incluídas no resultado. |
| `REQ-VID-DET-003` | O sistema deve enfileirar execução assíncrona após reserva atómica de quota. | Must | NOVO | UC-VID-005 | Garante que a quota é reservada antes de enviar para a fila, evitando condições de corrida. | Dado pedido aceite, quando a quota é reservada atomicamente, então a execução é enfileirada; dado falha na reserva, então não é criada execução. |
| `REQ-VID-DET-004` | O sistema deve guardar deteções com instante, índice, classe, score e caixa normalizada. | Must | NOVO | UC-VID-005 | Permite consultar e filtrar deteções por posição temporal e classe. | Dado execução concluída, quando o utilizador consulta resultados, então cada deteção tem instante ou índice do fotograma, classe, score e caixa delimitadora normalizada. |
| `REQ-VID-DET-005` | O sistema deve consolidar JSON e, se solicitado, vídeo anotado como artefactos independentes. | Should | NOVO | UC-VID-005 | Garante que os artefactos de deteção são recursos independentes e rastreáveis. | Dado execução concluída, quando o utilizador acede aos resultados, então existe JSON de deteções; se vídeo anotado foi solicitado, existe também como artefacto independente. |
| `REQ-VID-DET-006` | O sistema deve publicar deteções e artefactos apenas depois de persistir todos os artefactos previstos. | Must | NOVO | UC-VID-005 | Impede publicação parcial de resultados inconsistentes. | Dado execução com múltiplos artefactos previstos, quando todos estão persistidos, então o estado muda para completed; se algum falhar, o estado fica failed. |

### 5.2 Requisitos não funcionais e de qualidade

| ID | Requisito | ISO/IEC 25010 | Alvo MVP | Alvo produção | Evolução | Prioridade | Origem | Critério de aceitação |
|---|---|---|---|---|---|---|---|---|
| `REQ-VID-NF-001` | O sistema deve responder à aceitação/rejeição sem aguardar processamento. | Eficiência de Desempenho | ≤ 2 s para submissão; validação de upload até 500 MB ≤ 5 s após receção | 99% das respostas ≤ 1 s sob carga definida | Novo | Must | DQ-001, todos | Medir latência de submissão em ≥ 20 pedidos válidos e inválidos; verificar que a validação não bloqueia a confirmação ao utilizador. |
| `REQ-VID-NF-002` | O sistema deve processar conversão de vídeos dentro dos limites do perfil em ≤ 2 min em 95% dos testes definidos. | Eficiência de Desempenho | 95% das conversões elegíveis no ambiente de demonstração completam em ≤ 2 min | 99% em ≤ 90 s sob carga definida | Novo | Should | UC-VID-003 | Executar ≥ 20 conversões elegíveis por perfil no ambiente documentado e verificar a percentagem de conclusão dentro do prazo. |
| `REQ-VID-NF-003` | O sistema deve suportar cinco tarefas simultâneas e manter até 100 em fila sem perda. | Eficiência de Desempenho | 5 tarefas ativas / 100 em fila sem perda | Escalável horizontalmente; fila persistente | Novo | Should | UC-VID-002/004 | Submeter 6 tarefas simultâneas e verificar que a 6.ª fica em fila sem erro; submeter 101 e verificar ausência de perda. |
| `REQ-VID-NF-004` | O sistema deve impedir alteração do original e publicação de parcial em falhas, cancelamentos e interrupções. | Fiabilidade | 100% dos cenários de falha, cancelamento e interrupção | 100% com recuperação documentada e testes automatizados | Novo | Must | DQ-002, todos | Injetar falha durante processamento e verificar que o original está inalterado e nenhum resultado parcial é acessível. |
| `REQ-VID-NF-005` | O sistema deve limpar temporários e parciais no máximo uma hora após tarefa final; uploads falhados em 24 h. | Fiabilidade | Temporários limpos ≤ 1 h após tarefa final; uploads falhados ≤ 24 h | ≤ 15 min para temporários; limpeza monitorizada | Novo | Must | UC-VID-001—005 | Aguardar 1 h após tarefa falhada e verificar que ficheiros temporários foram eliminados ou são inacessíveis. |
| `REQ-VID-NF-006` | O sistema deve conservar vídeo e resultados durante a vida do projeto e registos de tarefas durante 30 dias. | Fiabilidade | Recursos acessíveis durante vida do projeto; registos de tarefas 30 dias | Política de retenção configurável por tipo e perfil | Novo | Must | DQ-004 | Verificar que vídeo e resultado continuam acessíveis após encerrar e reabrir sessão; verificar que registo de tarefa existe após 30 dias. |
| `REQ-VID-NF-007` | O sistema deve restringir conteúdo, tarefas e artefactos a utilizadores autorizados e usar identificadores/URLs não adivinháveis. | Segurança | 100% das tentativas de acesso não autorizado rejeitadas | URLs temporários, auditoria e autorização centralizada | Novo | Must | `RF70`, `RNF44`, todos | Tentar aceder a vídeo e resultado com utilizador diferente do proprietário e verificar rejeição sem exposição de URL de armazenamento. |
| `REQ-VID-NF-008` | O sistema deve apresentar estados, erros, quota e progresso de forma compreensível. | Usabilidade | Atualização de progresso ≤ 5 s quando disponível; mensagem de erro em todos os cenários | Notificações push e recuperação automática de ligação | Novo | Should | DQ-003 | Executar cenário de sucesso, falha e cancelamento e verificar que estado, progresso, quota e erro são apresentados de forma compreensível. |
| `REQ-VID-NF-009` | O sistema deve produzir vídeos reproduzíveis nas versões atuais de Chrome e Firefox sem extensões. | Compatibilidade | Reproduzível no Chrome e Firefox atuais sem extensões | Alargado a Safari e Edge | Novo | Must | UC-VID-002/003/004 | Reproduzir vídeo MP4/H.264 resultante no Chrome e Firefox atuais sem extensões e verificar ausência de erros de reprodução. |
| `REQ-VID-NF-010` | O sistema deve aceitar a matriz MP4/H.264/AAC e validar futuras extensões por componente isolado. | Compatibilidade | Aceitar e produzir MP4/H.264/AAC; rejeitar formatos fora da matriz | Matriz de compatibilidade versionada e extensível | Novo | Must | UC-VID-001—004 | Testar pelo menos um formato suportado e um não suportado; verificar aceitação e rejeição corretas. |
| `REQ-VID-NF-011` | O sistema deve isolar processamento de vídeo das ferramentas e lotes de imagem. | Manutenibilidade | 0 regressões nas ferramentas de imagem após integração de vídeo | Contratos versionados entre serviços; regressão automatizada | Novo | Must | DQ-006, `UC04` | Executar testes de regressão das ferramentas de imagem antes e depois de integrar vídeo e verificar ausência de falhas. |
| `REQ-VID-NF-012` | O sistema deve permitir adicionar filtros/modelos através de módulos desacoplados. | Manutenibilidade | Nova ferramenta de vídeo adicionável sem alterar serviços centrais | Contrato versionado para novas ferramentas | Novo | Should | UC-VID-004/005 | Adicionar ferramenta de vídeo simulada e verificar que não é necessário alterar serviços centrais. |
| `REQ-VID-NF-013` | Workers e dependências multimédia/visão devem executar em contentores Docker reproduzíveis. | Portabilidade | Worker e dependências executáveis com docker-compose no ambiente documentado | Imagens versionadas e reproduzíveis em ambientes suportados | Novo | Should | DQ-007, todos | Recriar o ambiente a partir da documentação e executar o cenário de sucesso de pelo menos um caso de uso de vídeo. |
| `REQ-VID-NF-014` | O sistema deve rejeitar vídeos com tamanho superior a 100 MB (Free) ou 500 MB (Premium). | Eficiência de Desempenho (capacidade) | Free ≤ 100 MB; Premium ≤ 500 MB | Limites configuráveis por perfil | Novo | Must | UC-VID-001 RN3; UC-VID-004 RN3; secção 4.6 | Para cada perfil, submeter um vídeo com o tamanho exato do limite e outro 1 MB acima; verificar que o primeiro é aceite e o segundo rejeitado, com indicação do limite. |
| `REQ-VID-NF-015` | O sistema deve rejeitar vídeos com duração superior a 60 s (Free) ou 10 min (Premium). | Eficiência de Desempenho (capacidade) | Free ≤ 60 s; Premium ≤ 10 min | Limites configuráveis por perfil | Novo | Must | UC-VID-001 RN3; UC-VID-002 RN1; UC-VID-004 RN2; secção 4.6 | Para cada perfil, submeter um vídeo com a duração exata do limite e outro 1 s acima; verificar que o primeiro é aceite e o segundo rejeitado, com indicação do limite. |
| `REQ-VID-NF-016` | O sistema deve rejeitar pedidos de processamento de vídeos com resolução superior a 1920 × 1080 px (Free) ou 3840 × 2160 px (Premium). | Eficiência de Desempenho (capacidade) | Free ≤ 1080p; Premium ≤ 4K | Limites configuráveis por perfil | Novo | Must | UC-VID-004 RN9; UC-VID-002 RN5; secção 4.6 | Pedir, com o perfil Free, o processamento de um vídeo 4K; verificar a rejeição com indicação do limite e que não é criada tarefa. |
| `REQ-VID-NF-017` | O sistema deve terminar como `failed` a tarefa cujo processamento exceda 15 min. | Fiabilidade | ≤ 15 min por tarefa | Limite proporcional à duração do vídeo | Novo | Must | UC-VID-002 RN9, Exceção 7; UC-VID-004 Exceção 6 | Simular um worker bloqueado; verificar que ao fim de 15 min a tarefa passa a `failed`, a quota é estornada e a vaga de tarefa ativa fica livre. |

### 5.3 Verificação da completude e dos limites do âmbito

| Tópico | Caso(s) | Aplicável? | Decisão/justificação | Requisitos |
|---|---|---|---|---|
| Formato, codec, duração e dimensão | Todos | Sim | Validar no upload e novamente antes de cada tarefa; aplicar matriz e limites por perfil: Free 100 MB/60 segundos/1080p; Premium 500 MB/10 minutos/4K. | `COM-003/004`, `COM-016`, `NF-010`, `NF-014` a `016` |
| Estado, progresso, cancelamento e resultado | Todos | Sim | Upload tem progresso próprio; tarefas usam ciclo de vida comum e cancelamento best effort. | `COM-005` a `018`, `NF-001`, `NF-008` |
| Falhas durante processamento | UC-VID-002—005 | Sim | `failed`, mensagem, limpeza e ausência de parcial; sem retoma automática no MVP. | `COM-011`, `COM-017`, `NF-004/005`, `NF-017` |
| Falhas durante upload | UC-VID-001 | Sim | Associação atómica, retry explícito e limpeza posterior. | `UPL-002/003/005`, `NF-005` |
| Persistência e expiração | Todos | Sim | Recursos persistem enquanto projeto existir; registos 30 dias; política após remoção fica adiada. | `COM-010/012`, `NF-006` |
| Perfis e contagem de operações | Todos | Sim | Autenticação obrigatória; upload não conta; uma tarefa aceite conta uma operação. | `COM-001/009`, `COM-013/014`, `UPL-006`, `DET-003` |
| Encadeamento e processamento em lote | Todos | Não no MVP | Operações independentes; integração com lotes de imagem explicitamente excluída. | `NF-011` |
| Resultados de deteção | UC-VID-005 | Sim | JSON é obrigatório; vídeo anotado é opcional e não bloqueia conclusão quando não solicitado. | `DET-004` a `006` |

### 5.4 Conflitos resolvidos e requisitos removidos por duplicação

Foram fundidos requisitos que descreviam o mesmo comportamento, especialmente validação,
autorização, estados, quota, cancelamento, preservação do original, limpeza, persistência,
progresso e publicação do resultado. Foram removidas as contradições entre:

- 100 MB/60 s/1080p para Free e 500 MB/10 min/4K para Premium;
- MP4 apenas, MP4/WebM e MP4/MKV: prevalece MP4/H.264/AAC; WebM/MKV ficam adiados;
- estados em português e inglês: armazenamento usa estados canónicos em inglês, interface pode
  traduzi-los;
- quota Free de 5 operações/dia e quota Premium sem limite diário de operações de vídeo;
- vídeo anotado obrigatório e opcional: JSON é obrigatório, vídeo anotado é opcional;
- cancelamento que invalida execução anterior automaticamente: só cancelamento explícito ou
  política de concorrência aprovada invalida execução;
- upload com retry explícito pelo utilizador, mas sem retry automático das tarefas de processamento no MVP.
