# 📝 Exercício 1 — Entrega
### Casos de Uso · Fase 1: Suporte a Vídeo no PictuRAS

---

## 0. Identificação

| **Campo** | **Valor** |
|-----------|-----------|
| **Grupo / Equipa** | 1 |
| **Autores** | Diogo Araújo Machado (PG63944) |
| **Data** | 2026-10-14 |
| **Versão do documento** | v1.1 |
| **Unidade Curricular** | Requisitos e Arquiteturas de Software — MEI, Universidade do Minho |

---

## 1. Funcionalidade de vídeo escolhida

| **Campo** | **Valor** |
|-----------|-----------|
| **Funcionalidade** | Recorte temporal de vídeo (*trim*) |
| **Perfil(s) de utilizador abrangido(s)** | **Registado (plano gratuito) e Premium.** O recorte é um processamento demorado, com estados intermédios e consumo de quota diária, pelo que exige identidade persistente para associar o resultado a um projeto, acompanhar a tarefa e contabilizar a quota. O perfil **Anónimo** fica excluído (ver RN12 e Q3). O Premium difere do Registado nos limites e na prioridade na fila. |

**Justificação no contexto do MVP**

O recorte temporal é a operação de vídeo mais simples de explicar e mais pedida, e entrega valor imediato: o utilizador obtém só o excerto de que precisa. É das primeiras a valer a pena construir porque obriga a montar a infraestrutura comum a qualquer outra funcionalidade de vídeo (fila de processamento, estados e progresso, cancelamento, quotas por plano e armazenamento). Sem ela, ficam por validar o processamento assíncrono de vídeos completos e o impacto do vídeo nas quotas e nos planos existentes.

---

## 2. Caso de Uso

### 2.1 Cabeçalho

| **Secção** | **Detalhes** |
|------------|--------------|
| **ID do Caso de Uso** | UC-VID-001 |
| **Nome** | Recortar um Intervalo Temporal de um Vídeo |
| **Versão** | v1.1 |
| **Autor** | Diogo Araújo Machado |
| **Data** | 2026-10-14 |
| **Objetivo** | Permitir ao utilizador criar um novo vídeo a partir de um intervalo temporal (início–fim) de um vídeo existente num dos seus projetos, escolhendo o formato e a resolução de saída, e acompanhar o processamento até à conclusão. |
| **Âmbito** | Módulo de vídeo do PictuRAS: nova ferramenta de recorte temporal (microsserviço de processamento ligado à fila RabbitMQ), Project Service (projetos e orquestração de ferramentas), WebSocket Gateway (progresso em tempo real), serviços de utilizadores e subscrições (plano e quota diária), armazenamento de objetos e frontend (editor e barra de ferramentas). |
| **Ator Principal** | Utilizador Registado (plano gratuito). O Utilizador Premium segue o mesmo caso de uso, com limites e prioridade distintos. |
| **Stakeholders e Interesses** | - **Utilizador**: quer obter rapidamente só o excerto pretendido, saber em que ponto está o pedido e não perder o vídeo original<br>- **Proprietário do Sistema**: quer controlar o custo computacional e de armazenamento através de quotas e limites por plano, e incentivar a subscrição Premium<br>- **Equipa de Desenvolvimento**: quer validar a cadeia completa de processamento assíncrono (fila, estados, falhas, cancelamento) com uma operação bem delimitada, reutilizando a arquitetura existente<br>- **Operações / Infraestrutura**: quer evitar saturação da fila e dos *workers*, e tarefas órfãs ou ficheiros parciais por limpar |
| **Pré-condições** | - O utilizador tem sessão iniciada com plano gratuito ou Premium<br>- O vídeo pertence a um projeto do utilizador, com carregamento concluído e num formato/codec suportado<br>- A duração do vídeo não excede o limite do plano (RN1)<br>- A quota diária de operações do utilizador não está esgotada (RN3) |
| **Trigger** | O utilizador seleciona um vídeo num projeto e escolhe a ferramenta **Recortar** |

### 2.2 Fluxo Principal

| **Passo** | **Ação do Ator** | **Resposta do Sistema** |
|-----------|------------------|-------------------------|
| 1 | O utilizador abre um dos seus projetos | Apresenta os ficheiros do projeto (imagens e vídeos), com nome, duração e formato nos vídeos |
| 2 | O utilizador seleciona um vídeo e escolhe a ferramenta **Recortar** | Abre o editor de recorte com pré-visualização do vídeo, linha temporal, duração total e quota diária restante |
| 3 | O utilizador define o instante inicial e o instante final do intervalo (arrastando na linha temporal ou escrevendo os valores) | Valida em tempo real o intervalo (RN2, RN4) e mostra a duração do excerto resultante |
| 4 | O utilizador escolhe o formato de saída (MP4 ou WebM), a resolução de saída (original ou inferior) e o nome do novo vídeo | Valida as opções face ao plano (RN5) e apresenta um resumo do pedido, com uma estimativa do tempo de processamento |
| 5 | O utilizador confirma com **Iniciar recorte** | Revalida no servidor o pedido (formato do vídeo, intervalo, limites do plano, quota, limite de tarefas simultâneas) |
| 6 | — | Cria a tarefa de recorte com um identificador único, estado **Em fila**, e coloca-a na fila de processamento (com prioridade conforme o plano, RN6) |
| 7 | — | Apresenta a tarefa no projeto com o estado **Em fila** e a posição estimada |
| 8 | — | Quando um *worker* fica disponível, a tarefa passa a **A processar**: extrai o intervalo do vídeo original, aplica a conversão pedida e envia o progresso (percentagem) ao utilizador em tempo real |
| 9 | O utilizador acompanha o progresso, podendo navegar para outras áreas ou fechar a aplicação sem interromper a tarefa | Mantém o processamento independente da sessão do utilizador |
| 10 | — | Conclui o processamento e verifica o ficheiro de saída (legível, formato e resolução pedidos, duração dentro da tolerância, RN7) |
| 11 | — | Armazena o resultado como **novo vídeo** no mesmo projeto (RN8), passa a tarefa a **Concluída** e mantém o vídeo original inalterado |
| 12 | — | Contabiliza uma operação na quota diária (RN3) e notifica o utilizador da conclusão |
| 13 | O utilizador abre o novo vídeo para o pré-visualizar ou descarregar | Reproduz o vídeo recortado e disponibiliza o descarregamento |

### 2.3 Fluxos Alternativos

| **Fluxo** | **Descrição** |
|-----------|---------------|
| FA1 – Cancelamento com a tarefa em fila | No passo 7, o utilizador cancela a tarefa **Em fila** → O sistema remove-a da fila, passa-a a **Cancelada**, não consome quota e não cria nenhum vídeo |
| FA2 – Cancelamento durante o processamento | Nos passos 8–9, o utilizador cancela a tarefa **A processar** → O sistema interrompe o *worker*, elimina o resultado parcial, passa a tarefa a **Cancelada**, não consome quota e mantém o original inalterado |
| FA3 – Instante final omitido | No passo 3, o utilizador define apenas o instante inicial → O sistema assume como instante final o fim do vídeo e mostra-o no resumo |
| FA4 – Nome já existente | No passo 4, já existe um ficheiro com o nome escolhido no projeto → O sistema sugere um nome alternativo (por exemplo, com sufixo numérico) e pede confirmação antes de avançar |
| FA5 – Limite de tarefas simultâneas atingido | No passo 6, o utilizador já tem o número máximo de tarefas ativas (RN6) → O sistema aceita o pedido, mas mantém a tarefa no estado **Em espera** até uma tarefa anterior terminar, informando o utilizador |
| FA6 – Utilizador Premium | Em qualquer passo, o ator tem plano Premium → O sistema aplica os limites mais elevados (RN1, RN3, RN6) e coloca a tarefa na fila prioritária |
| FA7 – Regresso após ausência | O utilizador fecha a aplicação no passo 9 e regressa mais tarde → O sistema mostra, no projeto, o estado atual de cada tarefa (a processar, concluída, falhada ou cancelada) e apresenta a notificação pendente, mesmo que o utilizador não estivesse ligado quando o evento ocorreu |
| FA8 – Pedido idêntico duplicado | No passo 5, existe uma tarefa ativa do mesmo utilizador, sobre o mesmo vídeo, com o mesmo intervalo e as mesmas opções → O sistema informa que o pedido já está em curso e apresenta essa tarefa, sem criar outra |

### 2.4 Exceções

| **Condição** | **Comportamento do Sistema** |
|--------------|------------------------------|
| Utilizador anónimo tenta recortar um vídeo (RN12) | A ferramenta **Recortar** aparece indisponível, com a indicação *“Inicie sessão para recortar vídeos”* e acesso ao registo/login. Não é criada nenhuma tarefa |
| **(Vídeo)** Formato ou codec do vídeo original não suportado | No passo 2, a ferramenta **Recortar** fica indisponível, com a indicação *“Formato de vídeo não suportado para recorte”* e a lista dos formatos suportados. Não é criada nenhuma tarefa |
| **(Vídeo)** Duração do vídeo ou do intervalo selecionado excede o limite do plano (RN1) | Impede o avanço nos passos 3 ou 5 com a mensagem *“Excede o limite do seu plano (X min)”*, indicando o limite e a alternativa Premium. Não é criada nenhuma tarefa |
| Intervalo inválido (início ≥ fim, instante fora da duração do vídeo ou duração inferior ao mínimo, RN2) | Marca o campo em erro, mostra a mensagem correspondente e mantém o botão **Iniciar recorte** desativado |
| **(Vídeo)** Quota diária de operações esgotada (RN3) | No passo 2 ou 5, o sistema não cria a tarefa e informa *“Quota diária esgotada”*, indicando quando é reposta e a alternativa Premium |
| **(Vídeo)** Falha a meio do processamento (erro do *worker*, ficheiro corrompido a meio da leitura, falta de recursos) | O sistema tenta automaticamente uma segunda execução (RN9). Se voltar a falhar, passa a tarefa a **Falhou**, elimina o resultado parcial, não consome quota, mantém o original inalterado e notifica o utilizador com a mensagem *“Não foi possível recortar o vídeo. Tente novamente.”* |
| **(Vídeo)** Tempo máximo de processamento excedido (RN9) | Interrompe a tarefa e trata-a como falha a meio do processamento (elimina o parcial, não consome quota, notifica o utilizador) |
| Espaço de armazenamento do utilizador insuficiente para guardar o resultado | No passo 5, rejeita o pedido com a indicação do espaço necessário. Se o problema surgir no passo 11, a tarefa passa a **Falhou**, sem consumir quota, e o resultado é eliminado |
| O vídeo original (ou o projeto) é removido pelo utilizador enquanto a tarefa está em fila ou a processar | O sistema cancela a tarefa (como em FA1/FA2) e informa o utilizador de que o vídeo de origem deixou de existir |
| Perda de ligação do cliente durante o processamento | O processamento prossegue no servidor (passo 9). Quando o cliente se voltar a ligar, aplica-se o FA7 |
| Falha na verificação do ficheiro de saída (passo 10: duração fora da tolerância ou ficheiro ilegível) | Trata-se como falha a meio do processamento (RN9): o resultado é descartado e a tarefa passa a **Falhou** |

### 2.5 Pós-condições

| **Tipo** | **Resultado** |
|----------|---------------|
| Garantia de Sucesso | Existe um novo vídeo no projeto do utilizador, com o intervalo, formato e resolução pedidos; a tarefa está **Concluída**; o vídeo original está inalterado; foi consumida exatamente uma operação da quota diária; o utilizador foi notificado |
| Garantia Mínima | O vídeo original permanece inalterado e nenhum ficheiro parcial fica no projeto nem no armazenamento temporário; a tarefa termina num estado final identificável (**Falhou** ou **Cancelada**) com o motivo registado; não é consumida quota; o utilizador é informado do resultado |

### 2.6 Regras de Negócio e Restrições

| **ID** | **Regra** |
|--------|-----------|
| RN1 | Duração máxima do vídeo de origem: Registado ≤ 10 min; Premium ≤ 60 min |
| RN2 | O intervalo é definido por instantes de início e fim, com 0 ≤ início < fim ≤ duração do vídeo; duração mínima do excerto de 1 s |
| RN3 | Quota diária de operações por plano: Registado 5 (valor atual da quota gratuita); Premium 50. Cada recorte concluído com sucesso conta como uma operação; tarefas falhadas ou canceladas não contam |
| RN4 | O recorte é feito ao fotograma: o instante pedido é aproximado ao fotograma mais próximo |
| RN5 | Formatos de saída: MP4 (H.264/AAC) e WebM (VP9/Opus). A resolução de saída nunca excede a do vídeo original (não há *upscaling*); o plano gratuito está limitado a 1080p e o Premium pode escolher até à resolução original |
| RN6 | Tarefas ativas em simultâneo por utilizador: Registado 1; Premium 3. As tarefas de Premium são colocadas na fila prioritária |
| RN7 | A duração do vídeo resultante deve corresponder ao intervalo pedido com tolerância máxima de ±0,5 s |
| RN8 | O resultado é sempre um novo vídeo, guardado no mesmo projeto; o vídeo original nunca é alterado nem substituído |
| RN9 | Tempo máximo de processamento por tarefa: 15 min; em caso de falha, é feita no máximo 1 nova tentativa automática |
| RN10 | Estados da tarefa: **Em espera**, **Em fila**, **A processar**, **Concluída**, **Falhou**, **Cancelada**. Os três últimos são finais |
| RN11 | O resultado parcial e os ficheiros temporários de tarefas falhadas ou canceladas são eliminados no prazo máximo de 1 hora |
| RN12 | O perfil Anónimo não tem acesso a esta funcionalidade |
| RN13 | O pedido de recorte é confirmado ao utilizador (tarefa visível no estado **Em fila**) em ≤ 2 s após a confirmação, independentemente da duração do vídeo |
| RN14 | O progresso apresentado ao utilizador é atualizado pelo menos a cada 5 s durante o processamento |

### 2.7 Assunções

| **ID** | **Assunção** |
|--------|--------------|
| A1 | O vídeo original está integralmente armazenado e acessível ao serviço de processamento no momento do pedido |
| A2 | A nova ferramenta pode ser integrada seguindo o padrão das ferramentas existentes (microsserviço que consome a sua fila RabbitMQ e publica o resultado e o progresso), reutilizando o WebSocket Gateway para o progresso |
| A3 | O mecanismo atual de quota diária por plano (operações/dia, 5 no plano gratuito) pode ser estendido a operações de vídeo sem alterar o modelo de planos |
| A4 | Os limites numéricos de RN1, RN3 (valor Premium), RN5, RN6, RN9, RN13 e RN14 são valores de trabalho, a confirmar com o docente/proprietário do sistema. O valor atual da quota Premium ainda não foi confirmado |
| A5 | O estado das tarefas é guardado de forma persistente (por exemplo, no Project Service), de modo que o FA7 funcione; não se assume que os eventos atuais do WebSocket sejam guardados |
| A6 | Os formatos de entrada suportados incluem pelo menos MP4 e WebM, os mesmos formatos aceites para saída |
| A7 | O armazenamento de objetos existente aceita ficheiros de vídeo de dezenas ou centenas de MB, e é possível calcular o espaço disponível de cada utilizador |
| A8 | A análise desta versão assenta na descrição geral do repositório (README); o código dos serviços ainda não foi analisado, pelo que as assunções A2, A3 e A5 devem ser verificadas no código |

### 2.8 Questões em Aberto

| **ID** | **Questão** |
|--------|-------------|
| Q1 | Os limites de duração, quota e tarefas simultâneas (RN1, RN3, RN6) estão corretos para cada plano? Qual é o limite diário atual do plano Premium? |
| Q2 | Uma operação de vídeo conta como uma operação da quota partilhada com as imagens ou tem quota própria? E deve pesar o mesmo que uma operação sobre uma imagem? |
| Q3 | O perfil Anónimo deve ter acesso a uma versão limitada desta funcionalidade (por exemplo, vídeos muito curtos)? |
| Q4 | O utilizador deve poder encadear, num mesmo pedido, o recorte com outras ferramentas existentes (pipeline ou processamento em lote)? |
| Q5 | Os vídeos devem ficar no mesmo armazenamento das imagens ou num armazenamento próprio, dado o tamanho? Há um limite de armazenamento por conta? |
| Q6 | As ferramentas atuais suportam cancelamento e prioridade na fila? Se não, o cancelamento (FA1, FA2) e a fila prioritária (FA6) implicam alterar a arquitetura existente? |
| Q7 | Deve existir recorte sem re-codificação (mais rápido, mas só em fotogramas-chave) como alternativa ao recorte preciso ao fotograma? |
| Q8 | Por quanto tempo devem ser conservadas as tarefas concluídas, falhadas ou canceladas no histórico do projeto? |
| Q9 | O áudio deve poder ser removido ou mantido por opção, ou é sempre mantido? |

---

## 3. Utilização de agentes de IA

| **Ferramenta / *skill*** | **Tarefa apoiada** | **Validação realizada pela equipa** |
|--------------------------|--------------------|--------------------------------------|
| Claude (Anthropic) | Primeira versão completa das secções 0 a 4, a partir do template e dos exemplos de Login e de Vídeo; adaptação ao contexto do PictuRAS com base na leitura do README do repositório (arquitetura, planos, quota diária, WebSocket, fila RabbitMQ) | Revisão manual de todos os passos e regras, verificação do código das assunções A2, A3 e A5, ajuste dos limites de RN1–RN9 ao contexto do projeto, descarte dos fluxos e exceções que não se aplicavam e confirmação da coerência entre o fluxo principal, as exceções e as pós-condições. |
---

## 4. Esboço de requisitos derivados

### 4.1 Requisitos de Sistema

| **ID** | **Requisito** | **Tipo** | **Prioridade** | **Novo/Alt** | **Origem** | **Como verificar** |
|--------|---------------|----------|----------------|--------------|------------|--------------------|
| REQ-VID-TRIM-001 | O sistema deve apresentar, na vista de um projeto, o nome, a duração e o formato de cada vídeo do projeto. | F | Deve ter | ALT | Passo 1 | Dado um projeto com um vídeo MP4 de 03:20, quando o utilizador abre o projeto, então a lista mostra o nome, a duração 03:20 e o formato MP4 desse vídeo. |
| REQ-VID-TRIM-002 | O sistema deve disponibilizar a ferramenta Recortar sobre os vídeos do projeto do Utilizador Registado. | F | Deve ter | NOVO | Trigger, Passo 2 | Dado um Utilizador Registado com um vídeo suportado no projeto, quando seleciona o vídeo, então a ferramenta Recortar está disponível e pode ser escolhida. |
| REQ-VID-TRIM-003 | O sistema deve abrir, ao escolher a ferramenta Recortar, um editor com pré-visualização do vídeo, linha temporal e duração total. | F | Deve ter | NOVO | Passo 2 | Dado um vídeo de 03:20, quando o utilizador escolhe Recortar, então o editor mostra a pré-visualização, a linha temporal e a duração 03:20. |
| REQ-VID-TRIM-004 | O sistema deve apresentar no editor de recorte o número de operações diárias restantes do utilizador. | F | Deveria ter | ALT | Passo 2 | Dado um utilizador do plano gratuito com 2 operações já usadas hoje, quando abre o editor, então vê 3 operações restantes. |
| REQ-VID-TRIM-005 | O sistema deve permitir ao utilizador definir os instantes inicial e final do intervalo arrastando marcadores na linha temporal. | F | Deve ter | NOVO | Passo 3 | Dado o editor aberto, quando o utilizador arrasta os marcadores, então os instantes inicial e final passam a refletir as posições escolhidas. |
| REQ-VID-TRIM-006 | O sistema deve permitir ao utilizador definir os instantes inicial e final do intervalo escrevendo os seus valores. | F | Deveria ter | NOVO | Passo 3 | Dado o editor aberto, quando o utilizador escreve 00:10 e 00:40, então o intervalo definido é 00:10–00:40. |
| REQ-VID-TRIM-007 | O sistema deve assinalar como inválido, enquanto o utilizador o define, o intervalo que não cumpra 0 ≤ início < fim ≤ duração do vídeo, indicando o campo em erro. | F | Deve ter | NOVO | Passo 3, RN2, Exceção 4 | Dado um vídeo de 60 s, quando o utilizador define o intervalo 50 s–70 s, então o campo do instante final é assinalado em erro. |
| REQ-VID-TRIM-008 | O sistema deve rejeitar intervalos com duração inferior a 1 s. | F | Deve ter | NOVO | RN2, Exceção 4 | Dado um vídeo de 60 s, quando o utilizador define o intervalo 10,0 s–10,5 s, então o intervalo é rejeitado. |
| REQ-VID-TRIM-009 | O sistema deve manter desativada a confirmação do recorte enquanto o intervalo for inválido. | F | Deve ter | NOVO | Exceção 4 | Dado um intervalo inválido, quando o utilizador observa o botão Iniciar recorte, então este está desativado. |
| REQ-VID-TRIM-010 | O sistema deve apresentar a duração do excerto resultante do intervalo definido. | F | Deveria ter | NOVO | Passo 3 | Dado o intervalo 00:10–00:40, quando o utilizador o define, então é apresentada a duração 00:30. |
| REQ-VID-TRIM-011 | O sistema deve aproximar cada instante do intervalo ao fotograma mais próximo. | F | Deve ter | NOVO | RN4 | Dado um vídeo a 25 fotogramas/s, quando o utilizador define o início em 1,03 s, então o início efetivo é 1,04 s (fotograma 26). |
| REQ-VID-TRIM-012 | O sistema deve assumir o fim do vídeo como instante final quando apenas o instante inicial for definido. | F | Deveria ter | NOVO | FA3 | Dado um vídeo de 60 s, quando o utilizador define apenas o início em 20 s, então o intervalo considerado é 20 s–60 s. |
| REQ-VID-TRIM-013 | O sistema deve permitir ao utilizador escolher o formato de saída entre MP4 e WebM. | F | Deve ter | NOVO | Passo 4, RN5 | Dado o editor aberto, quando o utilizador abre as opções de formato, então estão disponíveis MP4 e WebM e nenhum outro. |
| REQ-VID-TRIM-014 | O sistema deve permitir ao utilizador escolher como resolução de saída a resolução original ou uma resolução inferior. | F | Deve ter | NOVO | Passo 4, RN5 | Dado um vídeo 1080p, quando o utilizador abre as opções de resolução, então estão disponíveis 1080p e resoluções inferiores. |
| REQ-VID-TRIM-015 | O sistema não deve oferecer uma resolução de saída superior à resolução do vídeo original. | F | Deve ter | NOVO | RN5 | Dado um vídeo 720p, quando o utilizador abre as opções de resolução, então não existe nenhuma opção acima de 720p. |
| REQ-VID-TRIM-016 | O sistema deve limitar a 1080p a resolução de saída dos utilizadores do plano gratuito. | NF (Capacidade / limites) | Deve ter | ALT | RN5, FA6 | Dado um vídeo 4K, quando um utilizador gratuito abre as opções de resolução, então o máximo é 1080p; para um Utilizador Premium, o máximo é 4K. |
| REQ-VID-TRIM-017 | O sistema deve permitir ao utilizador definir o nome do novo vídeo. | F | Deveria ter | NOVO | Passo 4 | Dado o editor aberto, quando o utilizador escreve um nome, então o novo vídeo é criado com esse nome. |
| REQ-VID-TRIM-018 | O sistema deve apresentar, antes da confirmação, um resumo do pedido com intervalo, formato, resolução e nome do novo vídeo. | F | Deveria ter | NOVO | Passo 4, FA3 | Dadas todas as opções escolhidas, quando o utilizador avança, então o resumo mostra os quatro valores escolhidos. |
| REQ-VID-TRIM-019 | O sistema deve apresentar uma estimativa do tempo de processamento no resumo do pedido. | F | Poderia ter | NOVO | Passo 4 | Dado o resumo do pedido, quando é apresentado, então inclui uma estimativa de tempo expressa em segundos ou minutos. |
| REQ-VID-TRIM-020 | O sistema deve sugerir um nome alternativo e pedir confirmação quando o nome escolhido já existir no projeto. | F | Deveria ter | NOVO | FA4 | Dado um projeto com o vídeo “Aula”, quando o utilizador escolhe o nome “Aula”, então o sistema sugere outro nome (por exemplo, “Aula (2)”) e pede confirmação. |
| REQ-VID-TRIM-021 | O sistema deve permitir ao utilizador confirmar o pedido de recorte através da ação Iniciar recorte. | F | Deve ter | NOVO | Passo 5 | Dado um pedido válido, quando o utilizador aciona Iniciar recorte, então o pedido é submetido. |
| REQ-VID-TRIM-022 | O sistema deve aplicar, no momento da confirmação do pedido, todas as regras de aceitação (RN1, RN2, RN3, RN5 e RN6), independentemente das validações feitas no editor. | F | Deve ter | NOVO | Passo 5, RN1, RN2, RN3, RN5, RN6 | Dado um pedido com intervalo inválido submetido sem passar pelo editor, quando o sistema o recebe, então rejeita-o e não cria nenhuma tarefa. |
| REQ-VID-TRIM-023 | O sistema deve criar, ao aceitar o pedido, uma tarefa de recorte com identificador único e estado Em fila. | F | Deve ter | NOVO | Passo 6, RN10 | Dado um pedido aceite, quando a tarefa é criada, então tem um identificador que não existe noutra tarefa e o estado Em fila. |
| REQ-VID-TRIM-024 | O sistema deve apresentar no projeto a tarefa de recorte com o estado Em fila. | F | Deve ter | NOVO | Passo 7 | Dada uma tarefa criada, quando o utilizador observa o projeto, então vê a tarefa com o estado Em fila. |
| REQ-VID-TRIM-025 | O sistema deve apresentar a posição estimada da tarefa Em fila. | F | Poderia ter | NOVO | Passo 7 | Dadas 3 tarefas à frente, quando o utilizador observa a tarefa Em fila, então vê a posição estimada 4. |
| REQ-VID-TRIM-026 | O sistema deve iniciar as tarefas de utilizadores Premium antes das tarefas Em fila de utilizadores do plano gratuito. | F | Deveria ter | ALT | Passo 6, RN6, FA6 | Dada uma tarefa gratuita mais antiga e uma tarefa Premium mais recente, ambas Em fila, quando fica um processador livre, então a tarefa Premium inicia primeiro. |
| REQ-VID-TRIM-027 | O sistema deve passar a tarefa ao estado A processar quando o seu processamento iniciar. | F | Deve ter | NOVO | Passo 8, RN10 | Dada uma tarefa Em fila, quando o processamento começa, então o estado passa a A processar. |
| REQ-VID-TRIM-028 | O sistema deve extrair do vídeo original o intervalo pedido. | F | Deve ter | NOVO | Passo 8 | Dado o intervalo 00:10–00:40, quando a tarefa termina, então o primeiro e o último fotogramas do resultado coincidem com os fotogramas do original nesses instantes. |
| REQ-VID-TRIM-029 | O sistema deve converter o excerto para o formato e a resolução pedidos. | F | Deve ter | NOVO | Passo 8, RN5 | Dado um pedido WebM 720p, quando a tarefa termina, então o ficheiro resultante é WebM com resolução 720p. |
| REQ-VID-TRIM-030 | O sistema deve apresentar ao utilizador, em tempo real, o progresso da tarefa em percentagem. | F | Deve ter | ALT | Passo 8 | Dada uma tarefa A processar, quando o utilizador observa o projeto, então vê a percentagem de progresso a evoluir de 0 % a 100 %. |
| REQ-VID-TRIM-031 | O sistema deve atualizar o progresso apresentado pelo menos a cada 5 s durante o processamento. | NF (Usabilidade) | Deveria ter | NOVO | Passo 8, RN14 | Dada uma tarefa A processar de 60 s ou mais, quando se observa o progresso, então o valor é atualizado em intervalos ≤ 5 s. |
| REQ-VID-TRIM-032 | O sistema deve concluir o processamento da tarefa mesmo que o utilizador feche a aplicação ou perca a ligação. | NF (Fiabilidade) | Deve ter | NOVO | Passo 9, Exceção 10 | Dada uma tarefa A processar, quando o utilizador fecha o navegador e regressa depois do tempo previsto, então a tarefa está Concluída. |
| REQ-VID-TRIM-033 | O sistema deve verificar que o ficheiro de saída é legível antes de o guardar. | F | Deve ter | NOVO | Passo 10, Exceção 11 | Dado um ficheiro de saída corrompido (simulado), quando a verificação é feita, então é detetado como ilegível e não é guardado. |
| REQ-VID-TRIM-034 | O sistema deve verificar que o formato e a resolução do ficheiro de saída correspondem aos pedidos. | F | Deveria ter | NOVO | Passo 10, Exceção 11 | Dado um ficheiro de saída com formato diferente do pedido (simulado), quando a verificação é feita, então é detetada a discrepância. |
| REQ-VID-TRIM-035 | O sistema deve produzir um vídeo cuja duração difira da duração do intervalo pedido em, no máximo, 0,5 s. | NF (Fiabilidade) | Deve ter | NOVO | Passo 10, RN7 | Dados vários intervalos de teste, quando as tarefas terminam, então |duração do resultado − duração pedida| ≤ 0,5 s em todos. |
| REQ-VID-TRIM-036 | O sistema deve descartar o ficheiro de saída e passar a tarefa ao estado Falhou quando a verificação do ficheiro de saída falhar. | F | Deve ter | NOVO | Exceção 11, Passo 10 | Dada uma verificação que falha (simulada), quando a tarefa termina, então o ficheiro é descartado e o estado é Falhou. |
| REQ-VID-TRIM-037 | O sistema deve guardar o resultado como novo vídeo no mesmo projeto do vídeo original. | F | Deve ter | ALT | Passo 11, RN8, Pós-condição de sucesso | Dada uma tarefa com sucesso, quando termina, então o projeto contém o vídeo original e um novo vídeo com o nome escolhido. |
| REQ-VID-TRIM-038 | O sistema deve passar a tarefa ao estado Concluída depois de guardar o resultado. | F | Deve ter | NOVO | Passo 11, RN10, Pós-condição de sucesso | Dado o resultado guardado, quando o utilizador consulta a tarefa, então o estado é Concluída. |
| REQ-VID-TRIM-039 | O sistema deve manter inalterado o ficheiro do vídeo original após o recorte, qualquer que seja o estado final da tarefa. | NF (Fiabilidade) | Deve ter | NOVO | Passo 11, RN8, Pós-condição de sucesso, Pós-condição mínima | Dado o resumo criptográfico do original antes do recorte, quando a tarefa termina em Concluída, Falhou ou Cancelada, então o resumo é idêntico. |
| REQ-VID-TRIM-040 | O sistema deve contabilizar uma operação na quota diária do utilizador por cada tarefa que termine em Concluída. | F | Deve ter | ALT | Passo 12, RN3, Pós-condição de sucesso | Dado um utilizador com 2 operações usadas, quando uma tarefa termina em Concluída, então passa a ter 3 operações usadas. |
| REQ-VID-TRIM-041 | O sistema não deve contabilizar na quota diária as tarefas que terminem em Falhou ou Cancelada. | F | Deve ter | ALT | FA1, FA2, Exceção 6, Exceção 7, Exceção 8, RN3, Pós-condição mínima | Dado um utilizador com 2 operações usadas, quando uma tarefa termina em Falhou ou Cancelada, então continua com 2 operações usadas. |
| REQ-VID-TRIM-042 | O sistema deve notificar o utilizador quando a tarefa passar ao estado Concluída. | F | Deve ter | ALT | Passo 12, Pós-condição de sucesso | Dada uma tarefa A processar, quando passa a Concluída, então o utilizador recebe uma notificação de conclusão. |
| REQ-VID-TRIM-043 | O sistema deve reproduzir o vídeo recortado quando o utilizador o abrir. | F | Deve ter | NOVO | Passo 13 | Dado um vídeo recortado, quando o utilizador o abre, então a reprodução começa e termina nos instantes do intervalo. |
| REQ-VID-TRIM-044 | O sistema deve permitir ao utilizador descarregar o vídeo recortado. | F | Deveria ter | NOVO | Passo 13 | Dado um vídeo recortado, quando o utilizador pede o descarregamento, então obtém um ficheiro idêntico ao guardado no projeto. |
| REQ-VID-TRIM-045 | O sistema deve impedir o recorte de vídeos com duração superior ao limite do plano: 10 min (plano gratuito) e 60 min (Premium). | NF (Capacidade / limites) | Deve ter | ALT | Pré-condição 3, RN1, Exceção 3, FA6 | Dado um vídeo de 15 min, quando um utilizador gratuito tenta recortá-lo, então o pedido é impedido; para um Utilizador Premium, é aceite. |
| REQ-VID-TRIM-046 | O sistema deve apresentar, quando a duração exceder o limite do plano, a mensagem “Excede o limite do seu plano (X min)”, indicando o limite aplicável e a alternativa Premium. | F | Deveria ter | ALT | Exceção 3 | Dado um vídeo de 15 min e um utilizador gratuito, quando tenta recortá-lo, então vê “Excede o limite do seu plano (10 min)” e a indicação do plano Premium. |
| REQ-VID-TRIM-047 | O sistema deve impedir o pedido de recorte quando o utilizador tiver esgotado a quota diária de operações (5 no plano gratuito, 50 no Premium). | NF (Capacidade / limites) | Deve ter | ALT | Pré-condição 4, RN3, Exceção 5, FA6 | Dado um utilizador gratuito com 5 operações usadas hoje, quando confirma um recorte, então o pedido é impedido e não é criada nenhuma tarefa. |
| REQ-VID-TRIM-048 | O sistema deve apresentar a mensagem “Quota diária esgotada”, indicando quando a quota é reposta e a alternativa Premium. | F | Deveria ter | ALT | Exceção 5 | Dada a quota esgotada, quando o utilizador tenta recortar, então vê a mensagem, a hora de reposição e a indicação do plano Premium. |
| REQ-VID-TRIM-049 | O sistema deve limitar o número de tarefas de recorte Em fila ou A processar, por utilizador, a 1 (plano gratuito) e a 3 (Premium). | NF (Capacidade / limites) | Deve ter | ALT | RN6, FA5, FA6 | Dado um utilizador gratuito com uma tarefa A processar, quando pede outro recorte, então a nova tarefa não fica Em fila nem A processar. |
| REQ-VID-TRIM-050 | O sistema deve colocar no estado Em espera a tarefa pedida quando o utilizador já tiver o número máximo de tarefas ativas. | F | Deveria ter | NOVO | FA5, RN6, RN10 | Dado um utilizador gratuito com uma tarefa ativa, quando pede outro recorte, então a nova tarefa fica Em espera e o utilizador é informado. |
| REQ-VID-TRIM-051 | O sistema deve passar a tarefa de Em espera para Em fila quando uma tarefa ativa do mesmo utilizador terminar. | F | Deveria ter | NOVO | FA5 | Dada uma tarefa Em espera, quando a tarefa ativa termina, então a tarefa em espera passa a Em fila. |
| REQ-VID-TRIM-052 | O sistema deve permitir ao utilizador cancelar uma tarefa Em fila. | F | Deveria ter | NOVO | FA1 | Dada uma tarefa Em fila, quando o utilizador a cancela, então a ação é aceite. |
| REQ-VID-TRIM-053 | O sistema deve permitir ao utilizador cancelar uma tarefa A processar. | F | Deveria ter | NOVO | FA2 | Dada uma tarefa A processar, quando o utilizador a cancela, então a ação é aceite. |
| REQ-VID-TRIM-054 | O sistema deve passar a tarefa ao estado Cancelada quando o utilizador a cancelar. | F | Deveria ter | NOVO | FA1, FA2, RN10 | Dada uma tarefa cancelada, quando o utilizador a consulta, então o estado é Cancelada. |
| REQ-VID-TRIM-055 | O sistema não deve iniciar nem continuar o processamento de uma tarefa Cancelada. | F | Deveria ter | NOVO | FA1, FA2 | Dada uma tarefa cancelada Em fila ou A processar, quando passa o tempo, então nunca passa a A processar ou o progresso deixa de avançar, e nenhum vídeo novo é criado. |
| REQ-VID-TRIM-056 | O sistema não deve criar uma nova tarefa quando o utilizador já tiver uma tarefa ativa com o mesmo vídeo, intervalo e opções. | F | Poderia ter | NOVO | FA8 | Dada uma tarefa ativa, quando o utilizador repete exatamente o pedido, então o número de tarefas do utilizador não aumenta. |
| REQ-VID-TRIM-057 | O sistema deve apresentar a tarefa ativa existente e informar que o pedido já está em curso quando detetar um pedido duplicado. | F | Poderia ter | NOVO | FA8 | Dado um pedido duplicado, quando é submetido, então o utilizador vê a tarefa existente e a indicação de que o pedido já está em curso. |
| REQ-VID-TRIM-058 | O sistema deve apresentar no projeto o estado atual de cada tarefa de recorte do utilizador. | F | Deve ter | ALT | FA7, Passo 7, RN10 | Dadas tarefas nos estados A processar, Concluída e Falhou, quando o utilizador abre o projeto, então vê o estado correto de cada uma. |
| REQ-VID-TRIM-059 | O sistema deve apresentar ao utilizador, quando regressar, as notificações geradas enquanto não tinha sessão ativa. | F | Deveria ter | ALT | FA7 | Dada uma tarefa que termina com o utilizador sem sessão, quando este inicia sessão, então vê a notificação de conclusão. |
| REQ-VID-TRIM-060 | O sistema não deve disponibilizar a ferramenta Recortar ao utilizador anónimo. | F | Deve ter | ALT | Pré-condição 1, RN12, Exceção 1 | Dado um utilizador anónimo com um vídeo, quando abre as ferramentas, então a ferramenta Recortar está indisponível. |
| REQ-VID-TRIM-061 | O sistema deve apresentar ao utilizador anónimo a indicação “Inicie sessão para recortar vídeos”, com acesso ao registo e ao início de sessão. | F | Deveria ter | ALT | Exceção 1 | Dado um utilizador anónimo, quando observa a ferramenta Recortar, então vê a indicação e as ligações para registo e início de sessão. |
| REQ-VID-TRIM-062 | O sistema deve aceitar para recorte vídeos nos formatos MP4 e WebM. | NF (Compatibilidade) | Deve ter | NOVO | Pré-condição 2, Exceção 2 | Dados um vídeo MP4 e um vídeo WebM, quando o utilizador pede o recorte de cada um, então ambos são aceites. |
| REQ-VID-TRIM-063 | O sistema deve tornar indisponível a ferramenta Recortar sobre vídeos num formato ou codec não suportado. | F | Deve ter | NOVO | Pré-condição 2, Exceção 2 | Dado um vídeo num formato não suportado, quando o utilizador o seleciona, então a ferramenta Recortar está indisponível e não é criada nenhuma tarefa. |
| REQ-VID-TRIM-064 | O sistema deve apresentar, nesse caso, a mensagem “Formato de vídeo não suportado para recorte” e a lista de formatos suportados. | F | Deveria ter | NOVO | Exceção 2 | Dado um vídeo não suportado, quando o utilizador o seleciona, então vê a mensagem e a lista de formatos suportados. |
| REQ-VID-TRIM-065 | O sistema deve repetir automaticamente, uma única vez, a tarefa cujo processamento falhe a meio. | F | Deve ter | NOVO | Exceção 6, RN9 | Dada uma falha simulada a meio do processamento, quando ocorre, então a tarefa é executada de novo exatamente uma vez. |
| REQ-VID-TRIM-066 | O sistema deve passar a tarefa ao estado Falhou quando a segunda tentativa de processamento também falhar. | F | Deve ter | NOVO | Exceção 6, RN9, RN10 | Dadas duas falhas simuladas consecutivas, quando a segunda ocorre, então o estado é Falhou. |
| REQ-VID-TRIM-067 | O sistema deve notificar o utilizador com a mensagem “Não foi possível recortar o vídeo. Tente novamente.” quando a tarefa passar ao estado Falhou. | F | Deveria ter | NOVO | Exceção 6, Exceção 7 | Dada uma tarefa que passa a Falhou, quando isso acontece, então o utilizador recebe a mensagem indicada. |
| REQ-VID-TRIM-068 | O sistema deve interromper, tratando-a como falha, a tarefa cujo processamento exceda 15 min. | NF (Desempenho) | Deve ter | NOVO | Exceção 7, RN9 | Dada uma tarefa simulada que excede 15 min, quando se atinge esse tempo, então é interrompida e tratada como falha. |
| REQ-VID-TRIM-069 | O sistema deve rejeitar o pedido, indicando o espaço necessário, quando o espaço disponível do utilizador for insuficiente para guardar o resultado. | F | Poderia ter | NOVO | Exceção 8 | Dado um utilizador sem espaço para o resultado estimado, quando confirma o pedido, então é rejeitado com a indicação do espaço necessário. |
| REQ-VID-TRIM-070 | O sistema deve passar a tarefa ao estado Falhou e eliminar o resultado quando o espaço do utilizador se esgotar ao guardar o resultado. | F | Poderia ter | NOVO | Exceção 8 | Dado o espaço esgotado ao guardar (simulado), quando ocorre, então a tarefa fica Falhou e não existe resultado guardado. |
| REQ-VID-TRIM-071 | O sistema deve cancelar a tarefa e informar o utilizador quando o vídeo original ou o projeto for removido enquanto a tarefa estiver Em fila ou A processar. | F | Deveria ter | NOVO | Exceção 9 | Dada uma tarefa A processar, quando o utilizador remove o vídeo original, então a tarefa passa a Cancelada e o utilizador é informado. |
| REQ-VID-TRIM-072 | O sistema deve eliminar o resultado parcial e os ficheiros temporários de tarefas Falhou ou Cancelada no prazo máximo de 1 h. | NF (Fiabilidade) | Deveria ter | NOVO | RN11, Pós-condição mínima | Dada uma tarefa que passa a Falhou ou Cancelada, quando decorre 1 h, então não existem ficheiros parciais ou temporários dessa tarefa. |
| REQ-VID-TRIM-073 | O sistema deve registar o motivo do estado final de cada tarefa Falhou ou Cancelada. | F | Deveria ter | NOVO | Pós-condição mínima | Dada uma tarefa Falhou ou Cancelada, quando se consulta o seu registo, então contém o motivo. |
| REQ-VID-TRIM-074 | O sistema deve permitir pedir o recorte de um vídeo apenas ao proprietário do vídeo. | NF (Segurança) | Deve ter | NOVO | Pré-condição 2 | Dado o vídeo do utilizador A, quando o utilizador B tenta pedir o seu recorte, então o pedido é rejeitado. |
| REQ-VID-TRIM-075 | O sistema deve mostrar a tarefa Em fila em ≤ 2 s após a confirmação do pedido, independentemente da duração do vídeo. | NF (Desempenho) | Deve ter | NOVO | Passo 5, Passo 6, Passo 7, RN13 | Dados vídeos de 1 min e de 10 min, quando o utilizador confirma o pedido, então a tarefa Em fila é visível em ≤ 2 s em ambos os casos. |

### 4.2 Impacto no sistema existente

| **Elemento existente afetado** | **Impacto (Manter / Estender / Alterar)** | **Descrição do impacto** | **Requisitos relacionados** |
|--------------------------------|-------------------------------------------|--------------------------|------------------------------|
| Vista do projeto (lista de ficheiros) | Estender | Passa a listar vídeos, com nome, duração e formato, além das imagens; o resultado do recorte passa a ser guardado como novo vídeo no mesmo projeto. | REQ-VID-TRIM-001, REQ-VID-TRIM-037 |
| Barra de ferramentas e editor | Estender | Nova ferramenta Recortar, aplicável a vídeos, com editor de linha temporal, opções de saída e confirmação do pedido; fica indisponível para formatos não suportados e para o perfil anónimo. | REQ-VID-TRIM-002, REQ-VID-TRIM-003, REQ-VID-TRIM-005, REQ-VID-TRIM-006, REQ-VID-TRIM-063, REQ-VID-TRIM-060 |
| Perfil anónimo | Estender | O acesso do anónimo passa a diferir por tipo de ficheiro: mantém as ferramentas de imagem e não tem acesso à ferramenta de vídeo. | REQ-VID-TRIM-060, REQ-VID-TRIM-061 |
| Limite de operações por dia (5 no plano gratuito) | Alterar | Um recorte de vídeo concluído conta como 1 operação; falhas e cancelamentos não contam; o utilizador vê as operações restantes e é bloqueado quando esgota. Falta decidir se a quota é partilhada com as imagens (Q2). | REQ-VID-TRIM-040, REQ-VID-TRIM-041, REQ-VID-TRIM-004, REQ-VID-TRIM-047, REQ-VID-TRIM-048 |
| Limites por plano (gratuito / Premium) | Estender | Novos limites específicos de vídeo: duração máxima, resolução máxima de saída e tarefas simultâneas, diferentes para cada plano. | REQ-VID-TRIM-045, REQ-VID-TRIM-046, REQ-VID-TRIM-016, REQ-VID-TRIM-049 |
| Fila de processamento e ferramentas de processamento | Alterar | Nova ferramenta consumidora da fila; prioridade para Premium, estado Em espera, cancelamento, repetição automática e tempo máximo de processamento. Só se confirma no código se a fila atual suporta prioridade e cancelamento (Q6). | REQ-VID-TRIM-026, REQ-VID-TRIM-050, REQ-VID-TRIM-051, REQ-VID-TRIM-052, REQ-VID-TRIM-053, REQ-VID-TRIM-055, REQ-VID-TRIM-065, REQ-VID-TRIM-066, REQ-VID-TRIM-068 |
| Progresso em tempo real (WebSocket) | Estender | Os eventos de progresso passam a abranger tarefas de vídeo, com atualização mínima a cada 5 s. | REQ-VID-TRIM-030, REQ-VID-TRIM-031 |
| Estado das tarefas e notificações | Alterar | O estado das tarefas (incluindo Concluída, Falhou, Cancelada) e as notificações passam a persistir e a poder ser consultados no regresso do utilizador (A5), em vez de dependerem da ligação ativa. | REQ-VID-TRIM-058, REQ-VID-TRIM-059, REQ-VID-TRIM-042, REQ-VID-TRIM-032, REQ-VID-TRIM-073 |
| Armazenamento de objetos | Estender | Passa a guardar vídeos de grande dimensão e resultados novos; exige verificar o espaço disponível do utilizador e limpar ficheiros parciais e temporários. | REQ-VID-TRIM-037, REQ-VID-TRIM-069, REQ-VID-TRIM-070, REQ-VID-TRIM-072, REQ-VID-TRIM-039 |
| Exportação / descarregamento | Estender | O descarregamento passa a incluir vídeos recortados. | REQ-VID-TRIM-044 |
| Encadeamento de ferramentas e processamento em lote | Manter | Fora do âmbito deste caso de uso: o recorte funciona como operação isolada. A possibilidade de encadear fica em aberto (Q4). | — |

### 4.3 Matriz de Rastreabilidade

| **Elemento do Caso de Uso** | **Descrição abreviada** | **Requisito(s) de Sistema** |
|------------------------------|-------------------------|------------------------------|
| Pré-condição 1 | Sessão iniciada (plano gratuito ou Premium) | REQ-VID-TRIM-060 |
| Pré-condição 2 | Vídeo do projeto do utilizador, carregado e em formato suportado | REQ-VID-TRIM-062, REQ-VID-TRIM-063, REQ-VID-TRIM-074 |
| Pré-condição 3 | Duração do vídeo dentro do limite do plano | REQ-VID-TRIM-045 |
| Pré-condição 4 | Quota diária não esgotada | REQ-VID-TRIM-047 |
| Trigger | Seleção do vídeo e escolha da ferramenta Recortar | REQ-VID-TRIM-002 |
| Passo 1 | Abrir o projeto e ver os ficheiros | REQ-VID-TRIM-001 |
| Passo 2 | Selecionar vídeo e escolher Recortar; abertura do editor | REQ-VID-TRIM-002, REQ-VID-TRIM-003, REQ-VID-TRIM-004 |
| Passo 3 | Definir instantes inicial e final; validação | REQ-VID-TRIM-005, REQ-VID-TRIM-006, REQ-VID-TRIM-007, REQ-VID-TRIM-010 |
| Passo 4 | Escolher formato, resolução e nome; resumo | REQ-VID-TRIM-013, REQ-VID-TRIM-014, REQ-VID-TRIM-017, REQ-VID-TRIM-018, REQ-VID-TRIM-019 |
| Passo 5 | Confirmar com Iniciar recorte; revalidação | REQ-VID-TRIM-021, REQ-VID-TRIM-022, REQ-VID-TRIM-075 |
| Passo 6 | Criar tarefa Em fila | REQ-VID-TRIM-023, REQ-VID-TRIM-026, REQ-VID-TRIM-075 |
| Passo 7 | Apresentar tarefa Em fila e posição | REQ-VID-TRIM-024, REQ-VID-TRIM-025, REQ-VID-TRIM-058, REQ-VID-TRIM-075 |
| Passo 8 | Processar e enviar progresso | REQ-VID-TRIM-027, REQ-VID-TRIM-028, REQ-VID-TRIM-029, REQ-VID-TRIM-030, REQ-VID-TRIM-031 |
| Passo 9 | Acompanhar sem interromper a tarefa | REQ-VID-TRIM-032 |
| Passo 10 | Verificar o ficheiro de saída | REQ-VID-TRIM-033, REQ-VID-TRIM-034, REQ-VID-TRIM-035, REQ-VID-TRIM-036 |
| Passo 11 | Guardar novo vídeo; tarefa Concluída | REQ-VID-TRIM-037, REQ-VID-TRIM-038, REQ-VID-TRIM-039 |
| Passo 12 | Contabilizar quota e notificar | REQ-VID-TRIM-040, REQ-VID-TRIM-042 |
| Passo 13 | Reproduzir ou descarregar o vídeo | REQ-VID-TRIM-043, REQ-VID-TRIM-044 |
| FA1 | Cancelamento com a tarefa em fila | REQ-VID-TRIM-041, REQ-VID-TRIM-052, REQ-VID-TRIM-054, REQ-VID-TRIM-055 |
| FA2 | Cancelamento durante o processamento | REQ-VID-TRIM-041, REQ-VID-TRIM-053, REQ-VID-TRIM-054, REQ-VID-TRIM-055 |
| FA3 | Instante final omitido | REQ-VID-TRIM-012, REQ-VID-TRIM-018 |
| FA4 | Nome já existente | REQ-VID-TRIM-020 |
| FA5 | Limite de tarefas simultâneas atingido | REQ-VID-TRIM-049, REQ-VID-TRIM-050, REQ-VID-TRIM-051 |
| FA6 | Utilizador Premium | REQ-VID-TRIM-016, REQ-VID-TRIM-026, REQ-VID-TRIM-045, REQ-VID-TRIM-047, REQ-VID-TRIM-049 |
| FA7 | Regresso após ausência | REQ-VID-TRIM-058, REQ-VID-TRIM-059 |
| FA8 | Pedido idêntico duplicado | REQ-VID-TRIM-056, REQ-VID-TRIM-057 |
| Exceção 1 | Utilizador anónimo | REQ-VID-TRIM-060, REQ-VID-TRIM-061 |
| Exceção 2 | Formato ou codec não suportado | REQ-VID-TRIM-062, REQ-VID-TRIM-063, REQ-VID-TRIM-064 |
| Exceção 3 | Duração acima do limite do plano | REQ-VID-TRIM-045, REQ-VID-TRIM-046 |
| Exceção 4 | Intervalo inválido | REQ-VID-TRIM-007, REQ-VID-TRIM-008, REQ-VID-TRIM-009 |
| Exceção 5 | Quota diária esgotada | REQ-VID-TRIM-047, REQ-VID-TRIM-048 |
| Exceção 6 | Falha a meio do processamento | REQ-VID-TRIM-041, REQ-VID-TRIM-065, REQ-VID-TRIM-066, REQ-VID-TRIM-067 |
| Exceção 7 | Tempo máximo de processamento excedido | REQ-VID-TRIM-041, REQ-VID-TRIM-067, REQ-VID-TRIM-068 |
| Exceção 8 | Armazenamento insuficiente | REQ-VID-TRIM-041, REQ-VID-TRIM-069, REQ-VID-TRIM-070 |
| Exceção 9 | Vídeo ou projeto removido durante a tarefa | REQ-VID-TRIM-071 |
| Exceção 10 | Perda de ligação do cliente | REQ-VID-TRIM-032 |
| Exceção 11 | Falha na verificação do ficheiro de saída | REQ-VID-TRIM-033, REQ-VID-TRIM-034, REQ-VID-TRIM-036 |
| Pós-condição de sucesso | Novo vídeo no projeto, original inalterado, 1 operação contabilizada, utilizador notificado | REQ-VID-TRIM-037, REQ-VID-TRIM-038, REQ-VID-TRIM-039, REQ-VID-TRIM-040, REQ-VID-TRIM-042 |
| Pós-condição mínima | Original inalterado, sem parciais, estado final com motivo, sem quota consumida | REQ-VID-TRIM-039, REQ-VID-TRIM-041, REQ-VID-TRIM-072, REQ-VID-TRIM-073 |
| RN1 | Duração máxima do vídeo por plano | REQ-VID-TRIM-022, REQ-VID-TRIM-045 |
| RN2 | Intervalo válido e duração mínima de 1 s | REQ-VID-TRIM-007, REQ-VID-TRIM-008, REQ-VID-TRIM-022 |
| RN3 | Quota diária por plano | REQ-VID-TRIM-022, REQ-VID-TRIM-040, REQ-VID-TRIM-041, REQ-VID-TRIM-047 |
| RN4 | Recorte ao fotograma | REQ-VID-TRIM-011 |
| RN5 | Formatos e resolução de saída | REQ-VID-TRIM-013, REQ-VID-TRIM-014, REQ-VID-TRIM-015, REQ-VID-TRIM-016, REQ-VID-TRIM-022, REQ-VID-TRIM-029 |
| RN6 | Tarefas simultâneas e prioridade | REQ-VID-TRIM-022, REQ-VID-TRIM-026, REQ-VID-TRIM-049, REQ-VID-TRIM-050 |
| RN7 | Tolerância de duração de ±0,5 s | REQ-VID-TRIM-035 |
| RN8 | Resultado é sempre um novo vídeo | REQ-VID-TRIM-037, REQ-VID-TRIM-039 |
| RN9 | Tempo máximo e repetição automática | REQ-VID-TRIM-065, REQ-VID-TRIM-066, REQ-VID-TRIM-068 |
| RN10 | Estados da tarefa | REQ-VID-TRIM-023, REQ-VID-TRIM-027, REQ-VID-TRIM-038, REQ-VID-TRIM-050, REQ-VID-TRIM-054, REQ-VID-TRIM-058, REQ-VID-TRIM-066 |
| RN11 | Limpeza de parciais em 1 h | REQ-VID-TRIM-072 |
| RN12 | Anónimo sem acesso | REQ-VID-TRIM-060 |
| RN13 | Confirmação do pedido em ≤ 2 s | REQ-VID-TRIM-075 |
| RN14 | Progresso atualizado a cada 5 s | REQ-VID-TRIM-031 |