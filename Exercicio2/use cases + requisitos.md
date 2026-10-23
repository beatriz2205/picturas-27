# Exercício 2 — Especificação de Requisitos Consolidada
## Fase 1: Suporte a Vídeo no PictuRAS

**Versão:** 1.3 — *thumbnail* gerada na submissão de vídeo (UC-VID-001)
**Data:** 2026-10-21
**Âmbito:** carregamento, recorte, conversão, filtros, deteção e velocidade em vídeo

> Este documento consolida os seis casos de uso e os requisitos dos exercícios individuais.
> Requisitos repetidos foram fundidos; requisitos incompatíveis foram substituídos pelas regras
> transversais RNG-01 a RNG-08 (secção 4.7, a mover para o Cap. 3.4 do relatório).
> A versão de referência é a fonte Typst em `docs/fase-1/typst-corrigido/`; a correspondência
> entre os IDs antigos e os novos está em `docs/fase-1/typst-corrigido/mapa-ids.md`.

## 4. Casos de uso consolidados

As exceções de cada caso de uso estão numeradas (E1, E2, …) para serem referidas nas tabelas
partilhadas (por exemplo, `UC-VID-002/E8`). Nas origens dos requisitos, `Pn` é o passo *n* do
fluxo principal.

### 4.1 UC-VID-001 — Submeter vídeo a um projeto

### 4.1.1 Cabeçalho

| **Secção** | **Detalhes** |
|---|---|
| **ID do Caso de Uso** | UC-VID-001 |
| **Nome** | Submeter vídeo a um projeto |
| **Versão** | v1.2 |
| **Autor** | Equipa PictuRAS |
| **Data** | 2026-10-21 |
| **Objetivo** | Permitir que um utilizador carregue um vídeo local e o associe a um projeto PictuRAS, ficando o ficheiro disponível nesse projeto para as ferramentas de vídeo (UC-VID-002 a UC-VID-005). |
| **Âmbito** | Interface Web do PictuRAS, gestão de projetos e armazenamento de objetos. |
| **Ator Principal** | Utilizador registado (perfil Free ou Premium) com sessão ativa e permissão de edição no projeto. O perfil Anónimo não tem acesso a esta funcionalidade (RNG-01). |
| **Stakeholders e Interesses** | • **Utilizador**: carregar o vídeo pretendido para um projeto, para depois o processar com as ferramentas de vídeo.<br>• **Proprietário do Sistema**: controlar o custo de armazenamento através dos limites por perfil e incentivar a subscrição Premium.<br>• **Equipa de Desenvolvimento**: validar a integração do carregamento e do armazenamento de vídeo no MVP.<br>• **Equipa de Operações**: evitar ficheiros que excedam os limites acordados e entradas incompletas no armazenamento. |
| **Pré-condições** | • O utilizador está registado e tem uma sessão PictuRAS ativa.<br>• O utilizador tem permissão de edição no projeto de destino ou vai criar um projeto novo (FA4).<br>• O utilizador tem acesso ao ficheiro de vídeo no seu dispositivo. |
| **Trigger** | O utilizador escolhe a opção de adicionar um vídeo a um projeto. |

### 4.1.2 Fluxo Principal

| **Passo** | **Ação do Ator** | **Resposta do Sistema** |
|---|---|---|
| 1 | Abre um projeto existente. | Apresenta o projeto e a opção de adicionar vídeo. |
| 2 | Escolhe a opção de adicionar vídeo. | Abre o seletor de ficheiros do dispositivo. |
| 3 | Seleciona um ficheiro de vídeo. | Apresenta o nome e o tamanho do ficheiro antes do envio. |
| 4 | Confirma o carregamento. | Inicia o envio e apresenta o progresso. |
| 5 | Aguarda que o envio termine. | Valida o contentor, o *codec*, a duração, a resolução e o tamanho segundo as regras do MVP (RN2, RN3). Se as validações forem satisfeitas, guarda o ficheiro no armazenamento, gera uma *thumbnail* a partir de um fotograma do vídeo (RN8) e associa ambos ao projeto selecionado. |
| 6 | — | Informa que o vídeo foi submetido e apresenta-o nos conteúdos do projeto com a sua *thumbnail*, nome, duração, resolução, tamanho e formato. |

### 4.1.3 Fluxos Alternativos

| **Fluxo** | **Descrição (passo de origem: condição → comportamento → retorno)** |
|---|---|
| FA1 – Cancelar antes ou durante o envio | Passos 2–5: o utilizador fecha o seletor ou cancela o envio em curso → o sistema interrompe o envio, descarta os dados recebidos e não altera o projeto → o caso de uso termina. |
| FA2 – Submeter outro vídeo | Após o passo 6: o utilizador escolhe adicionar outro vídeo → o sistema inicia uma nova submissão para o mesmo projeto, sem substituir o vídeo já carregado → regressa ao passo 2. |
| FA3 – Repetir após falha recuperável | Passos 4–6: o envio falha por uma interrupção temporária ou a confirmação não chega ao utilizador → o sistema informa que a submissão não foi concluída e permite tentar novamente; se o carregamento anterior tiver sido confirmado, a repetição não cria uma segunda entrada (RN6) → regressa ao passo 4. |
| FA4 – Criar projeto com o vídeo | Passo 1: o utilizador cria um projeto novo escolhendo um vídeo → o ficheiro segue os passos 3 a 6; se o ficheiro for recusado, o projeto não é criado. |

### 4.1.4 Exceções

| **Condição** | **Comportamento do Sistema** |
|---|---|
| **E1** — **(Vídeo)** O ficheiro não é MP4 com vídeo H.264 e áudio AAC (ou sem áudio), ou não é possível identificar o contentor ou o *codec*. | Recusa o ficheiro sem o associar ao projeto e informa que o formato não é suportado, indicando o formato aceite. |
| **E2** — **(Vídeo)** O ficheiro excede o tamanho, a duração ou a resolução máximos do perfil (RN3). | Recusa o ficheiro antes ou durante o envio (RN7), indica qual o limite excedido e o valor aplicável ao perfil e não associa o vídeo ao projeto. |
| **E3** — A ligação falha ou o armazenamento fica indisponível durante o envio. | Informa que o carregamento falhou; não confirma a submissão nem deixa uma entrada utilizável para um ficheiro incompleto. O utilizador pode tentar novamente (FA3). |
| **E4** — O utilizador não tem sessão válida ou não tem permissão de edição no projeto. | Recusa a submissão, informa o motivo e não altera o projeto. |
| **E5** — O projeto é removido durante a submissão. | Termina a operação com erro, descarta o ficheiro recebido, informa o utilizador e não associa o vídeo a outro projeto. |
| **E6** — Não é possível gerar a *thumbnail* de um vídeo que passou todas as validações. | Aceita e associa o vídeo na mesma, sem *thumbnail*; a interface apresenta uma imagem genérica de vídeo no seu lugar (RN8). |

### 4.1.5 Pós-condições

| **Tipo** | **Resultado** |
|---|---|
| Garantia de Sucesso | O ficheiro de vídeo validado está guardado e associado ao projeto selecionado; o projeto apresenta uma entrada para o vídeo, com a sua *thumbnail* (ou a imagem genérica, E6), e o utilizador recebe confirmação. O ficheiro original não é transformado nesta funcionalidade e a quota diária não é alterada. |
| Garantia Mínima | O sistema não apresenta como concluído um carregamento falhado. O projeto não contém uma entrada utilizável para um ficheiro parcial; o utilizador recebe informação suficiente para corrigir o problema ou tentar novamente. |

### 4.1.6 Regras de Negócio e Restrições

| **ID** | **Regra** |
|---|---|
| RN1 | O ator tem de estar registado, ter sessão ativa e permissão de edição no projeto de destino (RNG-01, RNG-07). |
| RN2 | Só são aceites ficheiros MP4 com vídeo H.264 e áudio AAC ou sem áudio (RNG-02). A extensão do ficheiro, por si só, não é suficiente para confirmar o formato e o *codec*. |
| RN3 | Limites por ficheiro: 100 MB, 60 s e 1080p no perfil Free; 500 MB, 10 min e 4K no perfil Premium (RNG-03). |
| RN4 | O carregamento de um vídeo não consome a quota diária de operações (RNG-04). |
| RN5 | A submissão associa o ficheiro original a um único projeto. Recortar, converter, filtrar e detetar estão fora do âmbito deste caso de uso; a geração da *thumbnail* (RN8) faz parte da submissão e não altera o original. |
| RN6 | Cada submissão confirmada cria uma entrada distinta no projeto; um vídeo novo não substitui um vídeo existente. A repetição de uma submissão cuja confirmação não chegou ao utilizador não cria entrada nova; uma nova submissão deliberada do mesmo ficheiro cria uma nova entrada. |
| RN7 | O sistema pode validar o ficheiro antes ou durante o envio, mas nunca associa ao projeto um ficheiro que não passou todas as validações. O tamanho é verificado antes de iniciar a transferência. |
| RN8 | Cada vídeo submetido tem uma *thumbnail*: uma imagem JPEG com 320 px de largura, mantendo a proporção, extraída do fotograma a 10% da duração (no máximo a 1 s do início, para evitar fotogramas negros iniciais). A *thumbnail* é gerada pelo servidor durante a submissão, não conta como operação (RN4) nem cria tarefa de processamento. Se a geração falhar, o vídeo é aceite na mesma (E6). |

### 4.1.7 Assunções

| **ID** | **Assunção** |
|---|---|
| A1 | Os perfis Free e Premium têm o mesmo direito de submeter vídeo; o perfil apenas determina os limites de RN3. |
| A2 | O formato MP4/H.264/AAC é escolhido por ser reproduzível nativamente nos navegadores atuais e para reduzir a variedade de formatos a validar no MVP. |
| A3 | Os limites de RN3 são valores de trabalho para permitir testes funcionais; não existem no código da baseline e foram definidos pela equipa (ver Cap. 2, elicitação). |
| A4 | Esta funcionalidade não transforma o vídeo nem oferece pré-visualização durante a seleção; extrai apenas um fotograma para a *thumbnail* (RN8). A confirmação significa que o ficheiro foi validado, guardado e associado ao projeto. |
| A6 | Extrair um único fotograma com a ferramenta já usada na validação (FFmpeg) demora uma fração de segundo, pelo que a *thumbnail* pode ser gerada de forma síncrona, dentro do tempo de validação de `REQ-VID-SUBMIT-011`. |
| A5 | Não há quota total de armazenamento por perfil no MVP (RNG-08); os limites por ficheiro não equivalem a uma quota total. |

### 4.1.8 Questões em Aberto

| **ID** | **Questão** | **Resolução** |
|---|---|---|
| Q1 | Devem ser aceites outros formatos ou *codecs* de vídeo além de MP4/H.264? | **Resolvida**: não no MVP; matriz MP4/H.264/AAC (RN2, RNG-02, `REQ-VID-COM-045`). |
| Q2 | Devem ser impostos limites de tamanho, duração e resolução diferentes por perfil? | **Resolvida**: sim; Free 100 MB/60 s/1080p e Premium 500 MB/10 min/4K (RN3, RNG-03, `REQ-VID-COM-004` a `006`). |
| Q3 | Será necessária uma quota total de armazenamento ou um número máximo de vídeos por projeto? | **Adiada**: fora do MVP, por não ser necessária para a validação funcional (A5, RNG-08). |
| Q4 | Deve ser permitida a pré-visualização do vídeo nesta funcionalidade? | **Revista (v1.2)**: não há pré-visualização durante a seleção, mas a submissão gera uma *thumbnail* que identifica o vídeo no projeto (RN8, A4; `REQ-VID-SUBMIT-012`, `REQ-VID-SUBMIT-013`); a pré-visualização com reprodução continua a fazer parte das ferramentas de processamento (`REQ-VID-TRIM-002`, `REQ-VID-FLT-005`). |
| Q5 | Como são apresentados os vídeos no projeto e pode ser removido um vídeo? | **Resolvida**: o vídeo é um recurso independente do projeto (RN6, `REQ-VID-SUBMIT-007`), apresentado com a sua *thumbnail* (RN8, `REQ-VID-COM-057`); a remoção segue a gestão de conteúdos do projeto (UC04 da baseline) e elimina o ficheiro (`REQ-VID-COM-034`). |

---

### 4.2 UC-VID-002 — Recortar um intervalo temporal de um vídeo

### 4.2.1 Cabeçalho

| **Secção** | **Detalhes** |
|---|---|
| **ID do Caso de Uso** | UC-VID-002 |
| **Nome** | Recortar um intervalo temporal de um vídeo |
| **Versão** | v1.2 |
| **Autor** | Diogo Araújo Machado |
| **Data** | 2026-10-18 |
| **Objetivo** | Permitir ao utilizador criar um novo vídeo a partir de um intervalo temporal (início–fim) de um vídeo existente num projeto, escolhendo a resolução de saída, e acompanhar o processamento até à conclusão. |
| **Âmbito** | Módulo de vídeo do PictuRAS: nova ferramenta de recorte temporal, serviço de projetos (projetos e orquestração de ferramentas), notificações em tempo real, serviços de utilizadores e subscrições (perfil e quota diária), armazenamento de objetos e frontend (editor e barra de ferramentas). |
| **Ator Principal** | Utilizador registado (perfil Free ou Premium) com permissão de edição no projeto. Os dois perfis seguem o mesmo fluxo, mas têm limites, quota e prioridade de fila diferentes (RNG-03 a RNG-05). |
| **Stakeholders e Interesses** | • **Utilizador**: obter rapidamente só o excerto pretendido, saber em que ponto está o pedido e não perder o vídeo original.<br>• **Proprietário do Sistema**: controlar o custo computacional e de armazenamento através de quotas e limites por perfil, e incentivar a subscrição Premium.<br>• **Equipa de Desenvolvimento**: validar a cadeia completa de processamento assíncrono (fila, estados, falhas, cancelamento) com uma operação bem delimitada, reutilizando a arquitetura existente.<br>• **Equipa de Operações**: evitar a saturação da fila e dos *workers*, tarefas órfãs e ficheiros parciais por limpar. |
| **Pré-condições** | • O utilizador tem sessão iniciada com perfil Free ou Premium e permissão de edição no projeto.<br>• O vídeo está num projeto, com carregamento concluído (UC-VID-001). |
| **Trigger** | O utilizador seleciona um vídeo num projeto e escolhe a ferramenta **Recortar**. |

### 4.2.2 Fluxo Principal

| **Passo** | **Ação do Ator** | **Resposta do Sistema** |
|---|---|---|
| 1 | Abre um dos seus projetos. | Apresenta os ficheiros do projeto (imagens e vídeos), com nome, duração e formato nos vídeos. |
| 2 | Seleciona um vídeo e escolhe a ferramenta **Recortar**. | Verifica que o vídeo respeita a matriz de formatos e os limites do perfil atual (RN1) e abre o editor de recorte com pré-visualização do vídeo, linha temporal, duração total e quota diária restante. |
| 3 | Define o instante inicial e o instante final do intervalo (arrastando na linha temporal ou escrevendo os valores). | Valida em tempo real o intervalo (RN2, RN4) e mostra a duração do excerto resultante. |
| 4 | Escolhe a resolução de saída (original ou inferior) e o nome do novo vídeo. | Valida as opções face ao perfil (RN5) e apresenta um resumo do pedido, incluindo o formato de saída MP4/H.264/AAC. |
| 5 | Confirma com **Iniciar recorte**. | Revalida no servidor o pedido (vídeo, intervalo, limites do perfil, quota e limite de tarefas ativas). |
| 6 | — | Cria a tarefa de recorte com um identificador único e estado **Em fila**, reserva uma operação (RN3) e coloca-a na fila de processamento com a prioridade do perfil (RN6). |
| 7 | — | Apresenta a tarefa no projeto com o estado **Em fila** em ≤ 2 s (RN13). |
| 8 | — | Quando um *worker* fica disponível, a tarefa passa a **A processar**: extrai o intervalo do vídeo original, aplica a resolução pedida e envia o progresso (percentagem) ao utilizador (RN14). |
| 9 | Acompanha o progresso, podendo navegar para outras áreas ou fechar a aplicação. | Mantém o processamento independente da sessão do utilizador. |
| 10 | — | Conclui o processamento e verifica o ficheiro de saída (legível, formato e resolução pedidos, duração dentro da tolerância, RN7). |
| 11 | — | Armazena o resultado como **novo vídeo** no mesmo projeto (RN8), passa a tarefa a **Concluída** e mantém o vídeo original inalterado. |
| 12 | — | Consolida a operação reservada na quota diária (RN3) e notifica o utilizador da conclusão. |
| 13 | Abre o novo vídeo para o pré-visualizar ou descarregar. | Reproduz o vídeo recortado e disponibiliza o descarregamento. |

### 4.2.3 Fluxos Alternativos

| **Fluxo** | **Descrição (passo de origem: condição → comportamento → retorno)** |
|---|---|
| FA1 – Cancelamento com a tarefa em fila | Passo 7: o utilizador cancela a tarefa **Em fila** → o sistema remove-a da fila, passa-a a **Cancelada**, estorna a operação reservada e não cria nenhum vídeo → o caso de uso termina. |
| FA2 – Cancelamento durante o processamento | Passos 8–9: o utilizador cancela a tarefa **A processar** → o sistema interrompe o processamento, elimina o resultado parcial, passa a tarefa a **Cancelada**, estorna a operação reservada e mantém o original inalterado → o caso de uso termina. |
| FA3 – Instante final omitido | Passo 3: o utilizador define apenas o instante inicial → o sistema assume como instante final o fim do vídeo e mostra-o no resumo → regressa ao passo 4. |
| FA4 – Nome já existente | Passo 4: já existe um ficheiro com o nome escolhido no projeto → o sistema sugere um nome alternativo (sufixo numérico) e pede confirmação → regressa ao passo 4. |
| FA5 – Regresso após ausência | Passo 9: o utilizador fecha a aplicação e regressa mais tarde → o sistema mostra, no projeto, o estado atual de cada tarefa (**A processar**, **Concluída**, **Falhada** ou **Cancelada**) e apresenta a notificação pendente, mesmo que o utilizador não estivesse ligado quando o evento ocorreu. |
| FA6 – Pedido idêntico duplicado | Passo 5: existe uma tarefa ativa do mesmo utilizador sobre o mesmo vídeo, com o mesmo intervalo e as mesmas opções → o sistema informa que o pedido já está em curso e apresenta essa tarefa, sem criar outra nem reservar quota. |

### 4.2.4 Exceções

| **Condição** | **Comportamento do Sistema** |
|---|---|
| **E1** — Utilizador sem sessão ou sem permissão de edição tenta recortar um vídeo (RN12). | A ferramenta **Recortar** aparece indisponível, com a indicação *“Inicie sessão para recortar vídeos”* (sem sessão) ou *“Não tem permissão de edição neste projeto”*. Não é criada nenhuma tarefa. |
| **E2** — **(Vídeo)** Formato ou *codec* do vídeo original não suportado (por exemplo, um resultado WebM do UC-VID-003). | No passo 2, a ferramenta **Recortar** fica indisponível, com a indicação *“Formato de vídeo não suportado para recorte”* e o formato suportado. Não é criada nenhuma tarefa. |
| **E3** — **(Vídeo)** O vídeo excede a duração, o tamanho ou a resolução do perfil atual do utilizador (RN1), por exemplo após passar de Premium a Free. | Nos passos 2 ou 5, impede o avanço com a mensagem *“Excede o limite do seu plano”*, indicando o limite aplicável e sugerindo a subscrição Premium. Não é criada nenhuma tarefa. |
| **E4** — Intervalo inválido (início ≥ fim, instante fora da duração do vídeo ou duração inferior ao mínimo, RN2). | Marca o campo em erro, mostra a mensagem correspondente e mantém o botão **Iniciar recorte** desativado. |
| **E5** — **(Vídeo)** Quota diária de operações esgotada (RN3). | No passo 2 ou 5, o sistema não cria a tarefa, informa *“Quota diária esgotada”* e sugere a subscrição Premium. Só se aplica ao perfil Free. |
| **E6** — Limite de tarefas ativas atingido (RN6). | No passo 5, o sistema rejeita o pedido sem criar tarefa nem reservar quota e informa que deve aguardar a conclusão de uma tarefa em curso. |
| **E7** — O armazenamento ou a fila de processamento não estão disponíveis no momento da confirmação. | No passo 5, o sistema rejeita o pedido sem criar tarefa nem reservar quota e informa que o serviço está temporariamente indisponível. |
| **E8** — **(Vídeo)** Falha a meio do processamento (erro do *worker*, ficheiro corrompido, falta de recursos). | O sistema passa a tarefa a **Falhada**, regista o motivo, elimina o resultado parcial, estorna a operação reservada, mantém o original inalterado e notifica o utilizador com a mensagem *“Não foi possível recortar o vídeo. Tente novamente.”*. Uma nova tentativa tem de ser iniciada explicitamente pelo utilizador. |
| **E9** — **(Vídeo)** Tempo máximo de processamento excedido (RN9). | Interrompe a tarefa e trata-a como em E8. |
| **E10** — Falha na verificação do ficheiro de saída (passo 10: duração fora da tolerância ou ficheiro ilegível). | Trata-a como em E8: o resultado é descartado e a tarefa passa a **Falhada**. |
| **E11** — O vídeo original ou o projeto é removido enquanto a tarefa está em fila ou a processar. | O sistema cancela a tarefa (como em FA1/FA2) e informa o utilizador de que o vídeo de origem deixou de existir. |
| **E12** — Perda de ligação do cliente durante o processamento. | O processamento prossegue no servidor (passo 9). Quando o cliente se voltar a ligar, aplica-se o FA5. |

### 4.2.5 Pós-condições

| **Tipo** | **Resultado** |
|---|---|
| Garantia de Sucesso | Existe um novo vídeo no projeto, com o intervalo e a resolução pedidos, em MP4/H.264/AAC; a tarefa está **Concluída**; o vídeo original está inalterado; foi consumida exatamente uma operação da quota diária (Free); o utilizador foi notificado. |
| Garantia Mínima | O vídeo original permanece inalterado e nenhum ficheiro parcial fica visível no projeto; os temporários são eliminados no prazo de RN11; a tarefa termina num estado final identificável (**Falhada** ou **Cancelada**) com o motivo registado; a operação reservada é estornada; o utilizador é informado do resultado. |

### 4.2.6 Regras de Negócio e Restrições

| **ID** | **Regra** |
|---|---|
| RN1 | O vídeo de origem tem de respeitar a matriz de formatos (RNG-02) e os limites de duração, tamanho e resolução do perfil que o utilizador tem no momento do pedido (RNG-03). |
| RN2 | O intervalo é definido por instantes de início e fim, com 0 ≤ início < fim ≤ duração do vídeo; duração mínima do excerto de 1 s. |
| RN3 | Cada recorte aceite conta como 1 operação: é reservada quando a tarefa é aceite, consolidada no sucesso e estornada em falha ou cancelamento. Free: 5 operações por dia, partilhadas com as ferramentas avançadas de imagem; Premium: sem limite diário (RNG-04). |
| RN4 | O recorte é feito ao fotograma: o instante pedido é aproximado ao fotograma mais próximo. |
| RN5 | O formato de saída é MP4 (H.264/AAC). A resolução de saída nunca excede a do vídeo original nem o máximo do perfil (1080p no Free, 4K no Premium). |
| RN6 | Tarefas ativas em simultâneo por utilizador: 1 no Free e 3 no Premium; um pedido acima do limite é rejeitado. As tarefas Premium em fila são iniciadas primeiro (RNG-05). |
| RN7 | A duração do vídeo resultante corresponde ao intervalo pedido com tolerância máxima de ±0,5 s. |
| RN8 | O resultado é sempre um novo vídeo, guardado no mesmo projeto; o vídeo original nunca é alterado nem substituído (RNG-08). |
| RN9 | Tempo máximo de processamento por tarefa: 15 min por minuto de vídeo de origem, com mínimo de 15 min; em caso de falha a tarefa passa a **Falhada**, sem retoma automática (RNG-06). |
| RN10 | Estados da tarefa: `queued` (**Em fila**), `processing` (**A processar**), `completed` (**Concluída**), `failed` (**Falhada**) e `cancelled` (**Cancelada**) (RNG-05). |
| RN11 | O resultado parcial e os ficheiros temporários de tarefas terminadas são eliminados no prazo máximo de 1 hora (RNG-06). |
| RN12 | Utilizadores sem sessão, anónimos ou sem permissão de edição no projeto não têm acesso a esta funcionalidade (RNG-01, RNG-07). |
| RN13 | O pedido de recorte é confirmado ao utilizador (tarefa visível no estado **Em fila**) em ≤ 2 s após a confirmação, independentemente da duração do vídeo. |
| RN14 | O progresso apresentado ao utilizador é atualizado pelo menos a cada 5 s durante o processamento. |

### 4.2.7 Assunções

| **ID** | **Assunção** |
|---|---|
| A1 | O vídeo original está integralmente armazenado e acessível ao serviço de processamento no momento do pedido. |
| A2 | A nova ferramenta pode ser integrada seguindo o padrão das ferramentas existentes (microsserviço que consome a sua fila RabbitMQ e publica o resultado e o progresso), reutilizando o WebSocket Gateway (fila `ws_queue`) para o progresso. |
| A3 | O mecanismo de quota diária do serviço de utilizadores pode ser estendido a tarefas de vídeo. Na baseline a quota é debitada no início do processamento, por cada ferramenta avançada; RNG-04 altera esta regra para vídeo. |
| A4 | Os limites numéricos de RN5, RN6, RN9, RN13 e RN14 são valores de trabalho do MVP definidos pela equipa e a confirmar com o docente (Proprietário do Sistema). |
| A5 | O estado das tarefas de vídeo é guardado de forma persistente, para que o FA5 funcione. Na baseline só existe um *token* de execução por projeto (`activeToken`, `committedToken`); os eventos do WebSocket não são guardados, pelo que é necessário um registo de tarefa próprio. |
| A6 | A matriz de entrada do MVP é MP4 com vídeo H.264/AVC e áudio AAC ou sem áudio (RNG-02). |
| A7 | O armazenamento de objetos existente (SeaweedFS compatível com S3) aceita ficheiros de vídeo de dezenas ou centenas de MB. |
| A8 | As assunções A2, A3 e A5 foram verificadas no código da baseline: filas por ferramenta e `ws_queue` (serviço `projects`), verificação de quota em `users/routes/users.js` (`check_process`) e *tokens* de execução no modelo de projeto. |

### 4.2.8 Questões em Aberto

| **ID** | **Questão** | **Resolução** |
|---|---|---|
| Q1 | Os limites de duração, quota e tarefas simultâneas estão corretos para cada perfil? | **Resolvida para o MVP**: Free 60 s, 5 operações/dia e 1 tarefa ativa; Premium 10 min, sem limite diário e 3 tarefas ativas (RNG-03 a RNG-05). |
| Q2 | Uma operação de vídeo conta como uma operação da quota partilhada com as imagens? Deve pesar o mesmo que uma operação sobre uma imagem? | **Resolvida**: cada tarefa aceite conta como 1 operação da quota partilhada (RN3, RNG-04, `REQ-VID-COM-021`). |
| Q3 | O perfil Anónimo deve ter acesso a uma versão limitada desta funcionalidade? | **Resolvida**: não; o perfil Anónimo não tem acesso a nenhuma funcionalidade de vídeo (RN12, RNG-01, `REQ-VID-COM-001`). |
| Q4 | O utilizador deve poder encadear o recorte com outras ferramentas num mesmo pedido (pipeline ou lote)? | **Adiada**: fora do MVP; cada operação de vídeo é uma tarefa independente (secção 5.3). |
| Q5 | Os vídeos devem ficar no mesmo armazenamento das imagens? Há um limite de armazenamento por conta? | **Resolvida**: usam o armazenamento de objetos existente (A7); sem quota total por conta no MVP (RNG-08). |
| Q6 | As ferramentas atuais suportam cancelamento e prioridade na fila? | **Resolvida**: o cancelamento da baseline é por projeto (T-01) e não há prioridade; o MVP acrescenta cancelamento por tarefa e fila prioritária para Premium (`REQ-VID-COM-016`, `REQ-VID-COM-019`; ver Cap. 6). |
| Q7 | Deve existir recorte sem recodificação (mais rápido, mas só em fotogramas-chave)? | **Adiada**: incompatível com a precisão ao fotograma de RN4; avaliar numa fase posterior. |
| Q8 | Por quanto tempo devem ser conservadas as tarefas terminadas no histórico do projeto? | **Resolvida**: 30 dias (RNG-08, `REQ-VID-COM-043`). |
| Q9 | O áudio deve poder ser removido ou é sempre mantido? | **Resolvida para o MVP**: o áudio é preservado quando existir (`REQ-VID-COM-028`); a remoção opcional fica fora do âmbito. |

---

### 4.3 UC-VID-003 — Converter vídeo para outro formato ou resolução

### 4.3.1 Cabeçalho

| **Secção** | **Detalhes** |
|---|---|
| **ID do Caso de Uso** | UC-VID-003 |
| **Nome** | Converter vídeo para outro formato ou resolução |
| **Versão** | v1.1 |
| **Autor** | Beatriz Miranda |
| **Data** | 2026-10-18 |
| **Objetivo** | Permitir ao utilizador obter, a partir de um vídeo do projeto, uma cópia num formato de saída suportado (MP4/H.264/AAC ou WebM/VP9/Opus) e/ou numa resolução inferior, sem alterar o original. |
| **Âmbito** | Frontend, API Gateway, serviço de projetos, nova ferramenta de conversão de vídeo, armazenamento de objetos e notificações em tempo real. |
| **Ator Principal** | Utilizador registado (perfil Free ou Premium) com permissão de edição no projeto. |
| **Stakeholders e Interesses** | • **Utilizador**: obter um vídeo compatível com o destino pretendido (por exemplo, WebM para publicação na Web ou uma resolução menor para partilha) sem perder o original.<br>• **Proprietário do Sistema**: processar dentro dos limites do perfil e controlar o custo computacional da recodificação.<br>• **Equipa de Desenvolvimento**: reutilizar o mesmo ciclo de vida de tarefas dos restantes casos de uso de vídeo.<br>• **Equipa de Operações**: receber estados claros quando uma tarefa termina ou falha e não acumular ficheiros parciais. |
| **Pré-condições** | • O utilizador está autenticado e tem permissão de edição no projeto.<br>• O vídeo está num projeto, com carregamento concluído (UC-VID-001), e pode ser lido pelo sistema. |
| **Trigger** | O utilizador seleciona um vídeo do projeto e escolhe a opção **Converter**. |

### 4.3.2 Fluxo Principal

| **Passo** | **Ação do Ator** | **Resposta do Sistema** |
|---|---|---|
| 1 | Seleciona um vídeo do projeto e escolhe **Converter**. | Apresenta os metadados do vídeo (formato, *codec*, resolução, duração, tamanho), os formatos de saída suportados (RN3), as resoluções disponíveis para o vídeo e o perfil (RN4) e a quota diária restante. |
| 2 | Escolhe o formato de saída e a resolução de saída, indica o nome do novo vídeo e confirma. | Revalida no servidor o pedido: vídeo de entrada, opções, existência de alteração efetiva (RN6), limites do perfil, quota e limite de tarefas ativas. |
| 3 | — | Cria a tarefa de conversão com estado **Em fila**, reserva uma operação (RN5) e coloca-a na fila de processamento com a prioridade do perfil. |
| 4 | Acompanha o progresso, podendo navegar para outras áreas ou fechar a aplicação. | Quando um *worker* fica disponível, passa a tarefa a **A processar**, recodifica o vídeo (e o áudio, quando existir) e envia o progresso pelo menos a cada 5 s, mantendo o processamento independente da sessão do utilizador. |
| 5 | — | Verifica o ficheiro de saída (legível, formato, *codec* e resolução pedidos, duração igual à do original, RN8). |
| 6 | — | Armazena o vídeo convertido como novo recurso associado ao projeto e ao original, passa a tarefa a **Concluída**, consolida a operação reservada e notifica o utilizador. |
| 7 | Abre ou descarrega o resultado. | Reproduz o vídeo convertido e apresenta os seus metadados de formato, *codec* e resolução. |

### 4.3.3 Fluxos Alternativos

| **Fluxo** | **Descrição (passo de origem: condição → comportamento → retorno)** |
|---|---|
| FA1 – Apenas alteração de formato | Passo 2: o utilizador escolhe WebM/VP9/Opus e mantém a resolução original → o sistema converte o vídeo mantendo a resolução → continua no passo 3. |
| FA2 – Apenas alteração de resolução | Passo 2: o utilizador mantém MP4/H.264/AAC e escolhe uma resolução inferior à original → o sistema reduz a resolução mantendo o formato → continua no passo 3. |
| FA3 – Cancelamento com a tarefa em fila | Passo 3: o utilizador cancela a tarefa **Em fila** → o sistema passa-a a **Cancelada**, estorna a operação reservada e não cria resultado → o caso de uso termina. |
| FA4 – Cancelamento durante o processamento | Passo 4: o utilizador cancela a tarefa **A processar** → o sistema interrompe a conversão, elimina o resultado parcial, passa a tarefa a **Cancelada** e estorna a operação reservada → o caso de uso termina. |
| FA5 – Regresso após ausência | Passo 4: o utilizador fecha a aplicação e regressa mais tarde → o sistema mostra o estado atual da tarefa e a notificação pendente (conclusão ou falha); se concluída, continua no passo 7. |

### 4.3.4 Exceções

| **Condição** | **Comportamento do Sistema** |
|---|---|
| **E1** — O utilizador não tem sessão válida ou não tem permissão de edição no projeto (RN1). | A opção **Converter** fica indisponível com a indicação do motivo; não é criada nenhuma tarefa. |
| **E2** — **(Vídeo)** O formato ou *codec* do vídeo de entrada não é suportado (inclui um resultado WebM de uma conversão anterior, RN7). | Rejeita o pedido, mantém o original intacto e informa que só são aceites vídeos MP4/H.264/AAC como entrada. |
| **E3** — **(Vídeo)** O vídeo excede a duração, o tamanho ou a resolução do perfil atual do utilizador. | Não cria a tarefa, indica o limite excedido e o valor aplicável ao perfil e sugere a subscrição Premium. |
| **E4** — O formato ou a resolução escolhidos não são suportados para o vídeo ou o perfil. | Não cria a tarefa e apresenta as opções válidas. |
| **E5** — O pedido não altera nem o formato nem a resolução (RN6). | Rejeita o pedido sem criar tarefa nem reservar quota e informa que o resultado seria igual ao original. |
| **E6** — **(Vídeo)** A quota diária do perfil está esgotada. | Não cria a tarefa, informa o utilizador sobre o limite e sugere a subscrição Premium (só no perfil Free). |
| **E7** — O utilizador já tem o número máximo de tarefas ativas. | Rejeita o pedido sem criar tarefa nem reservar quota e informa que deve aguardar. |
| **E8** — O armazenamento ou a fila de processamento não estão disponíveis no momento da confirmação. | Rejeita o pedido sem criar tarefa nem reservar quota e informa que o serviço está temporariamente indisponível. |
| **E9** — **(Vídeo)** O processamento falha depois de começar ou excede o tempo máximo (RNG-06). | Marca a tarefa como **Falhada**, regista o motivo, não publica um resultado incompleto, estorna a operação, mantém o original e notifica o utilizador com uma mensagem de erro. |
| **E10** — O ficheiro de saída falha a verificação do passo 5. | Trata-a como em E9: o resultado é descartado e a tarefa passa a **Falhada**. |
| **E11** — O vídeo original ou o projeto é removido enquanto a tarefa está em fila ou em processamento. | Cancela a tarefa, estorna a operação reservada e informa o utilizador de que o vídeo de origem deixou de existir. |

### 4.3.5 Pós-condições

| **Tipo** | **Resultado** |
|---|---|
| Garantia de Sucesso | O vídeo convertido, no formato e na resolução pedidos, é um novo recurso associado ao projeto e ao vídeo original; o original permanece inalterado; a tarefa está **Concluída**; foi consumida 1 operação (Free); o utilizador foi notificado. |
| Garantia Mínima | Nenhum resultado parcial ou inválido é apresentado como concluído; o original não é alterado; a operação reservada é estornada; o estado final (**Falhada** ou **Cancelada**) e o motivo ficam visíveis ao utilizador. |

### 4.3.6 Regras de Negócio e Restrições

| **ID** | **Regra** |
|---|---|
| RN1 | Só utilizadores registados com permissão de edição no projeto podem iniciar uma conversão (RNG-01, RNG-07). |
| RN2 | O resultado é criado como novo recurso; o vídeo original nunca é substituído (RNG-08). |
| RN3 | Formatos de saída: MP4 (vídeo H.264, áudio AAC) ou WebM (vídeo VP9, áudio Opus) (RNG-02). |
| RN4 | A resolução de saída é a original ou uma resolução inferior das predefinidas (2160p, 1440p, 1080p, 720p, 480p, 360p), sem exceder a original nem o máximo do perfil (1080p no Free, 4K no Premium). A proporção do vídeo é mantida. |
| RN5 | Cada conversão aceite conta como 1 operação, reservada na aceitação, consolidada no sucesso e estornada em falha ou cancelamento (RNG-04). Aplicam-se os limites de tarefas ativas e de tempo de RNG-05 e RNG-06. |
| RN6 | Um pedido que mantenha o formato e a resolução do original é rejeitado. |
| RN7 | Um vídeo WebM resultante pode ser reproduzido e descarregado, mas não é aceite como entrada de outras ferramentas de vídeo no MVP (RNG-02). |
| RN8 | A duração do resultado é igual à do original, com tolerância de ±0,5 s; o áudio é preservado quando existir. |

### 4.3.7 Assunções

| **ID** | **Assunção** |
|---|---|
| A1 | O sistema já dispõe de autenticação, projetos, armazenamento, quotas e comunicação de estados de processamento, que são estendidos para vídeo. |
| A2 | A recodificação pode ser feita por uma biblioteca multimédia de uso livre (por exemplo, FFmpeg) dentro de um *worker* dedicado, sem alterar os serviços centrais. |
| A3 | O processamento é assíncrono e o utilizador não precisa de manter a página aberta. |
| A4 | A codificação VP9 é mais lenta do que H.264; o alvo de desempenho (`REQ-VID-CONV-006`) tem de ser confirmado por medição no protótipo. |

### 4.3.8 Questões em Aberto

| **ID** | **Questão** | **Resolução** |
|---|---|---|
| Q1 | Quais são exatamente os formatos, *codecs*, durações e tamanhos máximos suportados na primeira versão? | **Resolvida**: entrada MP4/H.264/AAC; saída MP4/H.264/AAC ou WebM/VP9/Opus; limites por perfil de RNG-03 (RN3, `REQ-VID-COM-045`, `REQ-VID-COM-004` a `006`). |
| Q2 | Que resoluções devem aparecer como opções predefinidas, além da original? | **Resolvida**: 2160p, 1440p, 1080p, 720p, 480p e 360p, limitadas pela original e pelo perfil (RN4, `REQ-VID-COM-010`). |
| Q3 | Porquê WebM como segundo formato de saída? | **Resolvida**: é um formato aberto, reproduzível nativamente em Chrome e Firefox (`REQ-VID-COM-044`) e comum na Web; outros formatos (MOV, AVI, GIF) ficam para depois do MVP. |

---

### 4.4 UC-VID-004 — Aplicar filtros visuais e ajustes de cor

### 4.4.1 Cabeçalho

| **Secção** | **Detalhes** |
|---|---|
| **ID do Caso de Uso** | UC-VID-004 |
| **Nome** | Aplicar filtros visuais e ajustes de cor a um vídeo |
| **Versão** | v2.2 |
| **Autor** | Equipa PictuRAS |
| **Data** | 2026-10-18 |
| **Objetivo** | Permitir ao utilizador selecionar um vídeo do projeto, aplicar um estilo visual predefinido (ex.: Preto e Branco, Sépia) ou ajustar parâmetros de cor (brilho, contraste, saturação), obtendo o resultado como um novo vídeo no projeto. |
| **Âmbito** | Módulo de vídeo do PictuRAS: projetos, edição visual, processamento assíncrono, armazenamento de objetos e notificações de progresso. |
| **Ator Principal** | Utilizador registado (perfil Free ou Premium) com permissão de edição no projeto. |
| **Stakeholders e Interesses** | • **Utilizador**: personalizar o aspeto visual do vídeo sem perder o ficheiro original.<br>• **Proprietário do Sistema**: disponibilizar edição visual de vídeo controlada pelos limites de cada perfil.<br>• **Equipa de Operações**: garantir que tarefas demoradas são acompanháveis e não bloqueiam os pedidos de outros utilizadores.<br>• **Equipa de Desenvolvimento**: reutilizar a infraestrutura de projetos, as transformações das ferramentas de imagem existentes, o armazenamento de objetos e as notificações em tempo real. |
| **Pré-condições** | • O utilizador tem sessão iniciada e permissão de edição no projeto.<br>• O vídeo está num projeto, com carregamento concluído (UC-VID-001). |
| **Trigger** | O utilizador seleciona um vídeo e escolhe a opção de aplicar filtros ou ajustes de cor. |

### 4.4.2 Fluxo Principal

| **Passo** | **Ação do Ator** | **Resposta do Sistema** |
|---|---|---|
| 1 | Abre o projeto, seleciona um vídeo e escolhe **Filtros**. | Apresenta os metadados do vídeo (nome, duração, resolução, tamanho e formato), uma pré-visualização no leitor, o painel de ajustes visuais (estilos predefinidos e controlos de brilho, contraste e saturação) e a quota diária restante. |
| 2 | Escolhe um estilo predefinido (ex.: Preto e Branco). | Preenche os parâmetros de cor correspondentes, atualiza a pré-visualização aproximada e mostra o resumo dos valores. |
| 3 | Confirma a aplicação dos filtros. | Revalida no servidor o pedido (formato, *codec* e limites do perfil, valores dos parâmetros, quota e limite de tarefas ativas), cria a tarefa com identificador único, reserva uma operação (RN6) e apresenta o estado **Em fila**. |
| 4 | — | Quando um *worker* fica disponível, a tarefa passa a **A processar**: o sistema aplica os ajustes a todos os fotogramas, mantendo a ordem, a resolução e a cadência originais e o áudio original sincronizado, e envia o progresso pelo menos a cada 5 s. |
| 5 | Acompanha o progresso na página do projeto ou navega para outras áreas. | Apresenta a percentagem de progresso, o estado atual e a opção de cancelar enquanto a tarefa não estiver terminada. |
| 6 | — | Concluída a codificação, verifica o ficheiro resultante (RN7), elimina os temporários, guarda o resultado como novo vídeo no projeto, preserva o original, passa a tarefa a **Concluída**, consolida a operação reservada e notifica o utilizador. |
| 7 | Abre o resultado no projeto. | Apresenta o novo vídeo filtrado com os metadados e opções para o reproduzir e descarregar. |

### 4.4.3 Fluxos Alternativos

| **Fluxo** | **Descrição (passo de origem: condição → comportamento → retorno)** |
|---|---|
| FA1 – Ajuste manual de cor | Passo 2: o utilizador altera diretamente os controlos de brilho, contraste ou saturação, partindo do estado neutro ou de um estilo escolhido → o sistema valida os valores (RN1), atualiza a pré-visualização e o resumo → regressa ao passo 3. |
| FA2 – Reposição dos valores originais | Passo 2: o utilizador escolhe *Repor* → o sistema restaura todos os controlos para o estado neutro (0) e limpa os efeitos da pré-visualização → regressa ao passo 2. |
| FA3 – Tarefa cancelada pelo utilizador | Passos 3–5: o utilizador escolhe *Cancelar* antes da conclusão → o sistema interrompe o processamento, elimina os temporários, passa a tarefa a **Cancelada**, estorna a operação reservada e não publica nenhum resultado → o caso de uso termina. |
| FA4 – Utilizador sai da página ou fecha a sessão | Passo 5: o utilizador sai da página ou fecha o navegador → o processamento continua no servidor → ao regressar, o utilizador vê o estado atual da tarefa (**Concluída**, **Falhada** ou **Cancelada**) e a notificação pendente; se concluída, continua no passo 7. |

### 4.4.4 Exceções

| **Condição** | **Comportamento do Sistema** |
|---|---|
| **E1** — O utilizador não tem sessão válida ou não tem permissão de edição no projeto. | A opção **Filtros** fica indisponível com a indicação do motivo; não é criada nenhuma tarefa. |
| **E2** — Os valores dos ajustes estão fora do intervalo permitido (RN1). | Sinaliza os campos inválidos, impede a submissão e indica os limites suportados. |
| **E3** — **(Vídeo)** O vídeo de origem está corrompido ou não respeita a matriz de formatos (RN5). | Rejeita o pedido, apresenta mensagem de erro explícita e não cria tarefa nem reserva quota. |
| **E4** — **(Vídeo)** A duração, o tamanho ou a resolução do vídeo excedem o limite do perfil atual do utilizador (RN2, RN3, RN9). | Impede a submissão e informa os limites do perfil: Free (60 s, 100 MB, 1080p) ou Premium (10 min, 500 MB, 4K), sugerindo a subscrição Premium quando aplicável. |
| **E5** — **(Vídeo)** A quota diária do utilizador está esgotada. | Bloqueia a submissão no passo 3, informa que a quota foi atingida, sugere a subscrição Premium e não cria tarefa (só no perfil Free). |
| **E6** — O utilizador atinge o número máximo de tarefas ativas (RN8). | Rejeita o pedido sem criar tarefa nem reservar quota e informa que deve aguardar a conclusão de uma tarefa em curso. |
| **E7** — O armazenamento ou a fila de processamento não estão disponíveis no momento da confirmação. | Rejeita o pedido sem criar tarefa nem reservar quota e informa que o serviço está temporariamente indisponível. |
| **E8** — **(Vídeo)** O processamento falha a meio ou excede o tempo máximo (RNG-06). | Marca a tarefa como **Falhada**, regista o motivo, elimina os temporários (RNG-06), estorna a operação reservada, mantém o vídeo original e notifica o utilizador. Não há retoma automática. |
| **E9** — O ficheiro final falha a verificação de integridade (RN7). | Trata-a como em E8: não publica o resultado e marca a tarefa como **Falhada**. |
| **E10** — O vídeo original ou o projeto é removido enquanto a tarefa está em fila ou em processamento. | Cancela a tarefa, elimina os temporários, estorna a operação reservada e informa o utilizador de que o vídeo de origem deixou de existir. |

### 4.4.5 Pós-condições

| **Tipo** | **Resultado** |
|---|---|
| Garantia de Sucesso | Existe um novo vídeo completo, válido e reproduzível no projeto, com os ajustes aplicados e o áudio sincronizado; o vídeo original permanece inalterado; a tarefa está **Concluída**; foi consumida 1 operação (Free); o utilizador foi notificado. |
| Garantia Mínima | O vídeo original permanece inalterado; nenhum ficheiro parcial ou corrompido é visível; os temporários são eliminados no prazo de RNG-06; a tarefa fica **Falhada** ou **Cancelada**, com o motivo registado; a operação reservada é estornada. |

### 4.4.6 Regras de Negócio e Restrições

| **ID** | **Regra** |
|---|---|
| RN1 | Os valores de brilho, contraste e saturação são indicados numa escala de −100 a +100, em que 0 corresponde ao valor original (ver A18). |
| RN2 | Duração máxima do vídeo: 60 s no perfil Free e 10 min no perfil Premium (RNG-03). |
| RN3 | Tamanho máximo do vídeo: 100 MB no perfil Free e 500 MB no perfil Premium (RNG-03). |
| RN4 | A operação gera sempre um novo vídeo no projeto; o vídeo original nunca é substituído, truncado ou modificado (RNG-08). |
| RN5 | Entrada e saída em MP4 com vídeo H.264 e áudio AAC (ou sem áudio) (RNG-02). |
| RN6 | Cada tarefa de filtragem conta como 1 operação, reservada na submissão, consolidada no sucesso e estornada em falha ou cancelamento. Free: 5 operações por dia, partilhadas com as ferramentas avançadas de imagem; Premium: sem limite diário (RNG-04). |
| RN7 | O novo vídeo só é publicado depois de verificado: legível, com a resolução, a cadência e a duração do original e o áudio sincronizado. |
| RN8 | Tarefas ativas por utilizador: 1 no perfil Free e 3 no perfil Premium; um pedido acima do limite é rejeitado (RNG-05). |
| RN9 | Resolução máxima do vídeo: 1920 × 1080 px no perfil Free e 3840 × 2160 px no perfil Premium (RNG-03). |

### 4.4.7 Assunções

| **ID** | **Assunção** |
|---|---|
| A1 | As transformações de brilho, contraste e saturação das ferramentas de imagem existentes podem ser aplicadas a cada fotograma do vídeo, produzindo o mesmo efeito visual que numa imagem. |
| A2 | A preservação da ordem dos fotogramas garante a reconstrução temporal exata do vídeo e a sincronização com o áudio. |
| A3 | O armazenamento de objetos (SeaweedFS) suporta o volume dos novos vídeos criados. |
| A4 | A interface consegue apresentar uma pré-visualização aproximada dos efeitos em tempo real com filtros no cliente. |
| A5 | A combinação da filtragem com outras ferramentas e o processamento em lote de vários vídeos estão fora do âmbito do MVP. O encadeamento interno de brilho, contraste e saturação numa só tarefa é suportado. |
| A6 | Os limites de RN2, RN3 e RN9 aplicam-se em conjunto; o primeiro limite excedido determina a rejeição. |
| A7 | Os alvos de desempenho são medidos num ambiente de referência: execução local via `docker-compose`, *worker* com 1 vCPU e 2 GB de RAM, e vídeo de teste 1080p a 30 fps em H.264. |
| A8 | O tempo de confirmação da submissão (≤ 2 s) não inclui o carregamento do vídeo, que já está no projeto (pré-condição). |
| A9 | A dessincronização áudio/vídeo máxima de 40 ms fica abaixo do limiar de deteção indicado na Recomendação ITU-R BT.1359 (≈ 45 ms com o áudio adiantado, ≈ 125 ms com o áudio atrasado). |
| A10 | O ambiente MVP dispõe de 5 réplicas de *worker* de vídeo, o que sustenta 5 tarefas em simultâneo. |
| A11 | Os URLs temporários de reprodução e descarregamento têm uma validade de 15 min; quando expiram, o cliente pede um novo URL. |
| A12 | O canal WebSocket existente (`wsGateway`, fila `ws_queue`) consegue transportar atualizações de progresso de vídeo com a cadência de 5 s. |
| A13 | Cada tarefa de filtragem conta como 1 operação, independentemente do número de fotogramas e de ajustes (RNG-04). |
| A14 | Não existe quota total de armazenamento por conta no MVP (RNG-08). |
| A15 | Vídeos sem faixa de áudio são aceites e produzem um MP4 sem áudio. Outros *codecs* de áudio (MP3, Opus, AC-3) não são aceites no MVP (RNG-02). |
| A16 | “Falha transitória” é a terminação abrupta do *worker*, a perda de ligação ao *broker* ou ao armazenamento, ou o *timeout*. Nenhuma falha é repetida automaticamente no MVP (RNG-06). |
| A17 | Enviar cada fotograma às ferramentas de imagem através do RabbitMQ e do armazenamento custaria ≈ 0,3 s por fotograma 1080p: ≈ 9 min para 60 s a 30 fps, mas ≈ 90 min para 10 min e ≈ 6 h para 10 min em 4K, acima do tempo máximo de RNG-06. Por isso assume-se que as transformações são aplicadas dentro do *worker* de vídeo (A1), sem troca de fotogramas pela fila; o valor tem de ser confirmado por medição no protótipo (decisão arquitetural no Cap. 8). |
| A18 | A escala de −100 a +100 da RN1 (0 = neutro) é convertida no fator multiplicativo das ferramentas existentes `brightness`, `contrast` e `saturation` (intervalo de 0 a 2, 1 = neutro) pela fórmula fator = 1 + valor / 100. |

### 4.4.8 Questões em Aberto

| **ID** | **Questão** | **Resolução** |
|---|---|---|
| Q1 | A pré-visualização dos filtros deve ser gerada no navegador ou através de um fotograma processado pelo servidor? | **Resolvida**: pré-visualização aproximada no cliente (A4, `REQ-VID-FLT-005`). |
| Q2 | O utilizador deve poder guardar combinações de ajustes como estilos personalizados? | **Adiada**: não no MVP; só estilos predefinidos. A reutilização dos *presets* personalizados da baseline (RF39, RF66) fica para uma fase posterior. |
| Q3 | Devem ser disponibilizados outros formatos de saída além de MP4/H.264? | **Resolvida**: não nesta ferramenta; só MP4/H.264/AAC (RN5). A conversão para WebM é feita no UC-VID-003. |
| Q4 | Os vídeos devem expirar automaticamente ou persistir indefinidamente? | **Resolvida**: persistem durante a vida do projeto, sem quota total de armazenamento (RNG-08, `REQ-VID-COM-043`); uma política de quota fica para uma fase posterior. |

---

### 4.5 UC-VID-005 — Detetar pessoas e objetos num vídeo

### 4.5.1 Cabeçalho

| **Secção** | **Detalhes** |
|---|---|
| **ID do Caso de Uso** | UC-VID-005 |
| **Nome** | Detetar pessoas e objetos num vídeo |
| **Versão** | v1.2 |
| **Autor** | José Miguel Fernandes Cação |
| **Data** | 2026-10-18 |
| **Objetivo** | Permitir ao utilizador selecionar um vídeo do projeto, escolher a deteção de pessoas e/ou objetos e obter um resultado com as deteções identificadas em cada fotograma, sem alterar o vídeo original. |
| **Âmbito** | Frontend, API Gateway, serviço de projetos, armazenamento de objetos, RabbitMQ, *workers* de IA (`people_ai`, `obj_ai`) e WebSocket Gateway do PictuRAS. |
| **Ator Principal** | Utilizador registado (perfil Free ou Premium) com permissão de edição no projeto. |
| **Stakeholders e Interesses** | • **Utilizador**: analisar pessoas e objetos ao longo de um vídeo e consultar ou descarregar os resultados.<br>• **Proprietário do Sistema**: disponibilizar uma funcionalidade diferenciadora, controlando o consumo de recursos e as operações avançadas.<br>• **Equipa de Desenvolvimento**: reutilizar a arquitetura assíncrona e os modelos de deteção existentes e manter o processamento isolado em *workers*.<br>• **Equipa de Operações**: evitar que ficheiros temporários e resultados comprometam o armazenamento ou a estabilidade dos serviços. |
| **Pré-condições** | • O utilizador tem sessão iniciada e permissão de edição no projeto.<br>• O vídeo está num projeto, com carregamento concluído (UC-VID-001), ou é carregado no início deste caso de uso (FA5). |
| **Trigger** | O utilizador seleciona um vídeo do projeto e escolhe a opção **Detetar no vídeo**. |

### 4.5.2 Fluxo Principal

| **Passo** | **Ação do Ator** | **Resposta do Sistema** |
|---|---|---|
| 1 | Abre um projeto, seleciona um vídeo e escolhe **Detetar no vídeo**. | Verifica a sessão e a permissão de edição e apresenta os metadados do vídeo, as ferramentas de deteção disponíveis, o limiar de confiança (por omissão 0,5) e a quota diária restante. |
| 2 | Seleciona `people_ai`, `obj_ai` ou ambas, ajusta o limiar de confiança se quiser e indica se pretende também o vídeo anotado. | Valida que existe pelo menos uma ferramenta selecionada e que o limiar está entre 0 e 1. |
| 3 | Confirma o processamento. | Revalida no servidor o vídeo (formato e limites do perfil atual), a quota e o limite de tarefas ativas; cria a tarefa com estado **Em fila** e reserva 1 operação (RN4). |
| 4 | — | Quando um *worker* fica disponível, a tarefa passa a **A processar**: o sistema percorre os fotogramas, executa as ferramentas selecionadas, associa cada deteção ao instante e ao índice do fotograma e envia o progresso pelo menos a cada 5 s. |
| 5 | Acompanha o progresso, podendo navegar para outras áreas ou fechar a aplicação. | Mantém o processamento independente da sessão do utilizador. |
| 6 | — | Guarda o resultado estruturado (JSON) e, se pedido, o vídeo anotado, como recursos novos associados ao vídeo de origem. O vídeo original permanece inalterado. |
| 7 | — | Depois de guardar todos os artefactos pedidos, passa a tarefa a **Concluída**, consolida a operação reservada e notifica o utilizador. |
| 8 | Consulta o resultado ou pede a sua descarga. | Apresenta as deteções por fotograma (classe, confiança, instante) e os artefactos disponíveis para visualização ou descarga. |

### 4.5.3 Fluxos Alternativos

| **Fluxo** | **Descrição (passo de origem: condição → comportamento → retorno)** |
|---|---|
| FA1 – Apenas deteções estruturadas | Passo 2: o utilizador não pede o vídeo anotado → no passo 6, o sistema guarda apenas o resultado JSON, com índice e instante do fotograma, classe, confiança e caixa delimitadora normalizada. |
| FA2 – Vídeo anotado | Passo 2: o utilizador pede o vídeo anotado → no passo 6, o sistema produz também um vídeo MP4/H.264/AAC com caixas e rótulos sobrepostos, com a resolução e a duração do original, mantendo o resultado JSON. |
| FA3 – Duas ferramentas no mesmo vídeo | Passo 2: o utilizador seleciona `people_ai` e `obj_ai` → o sistema executa as duas deteções na mesma tarefa e combina os resultados por fotograma; a tarefa conta como 1 operação (RN4). |
| FA4 – Cancelamento | Passos 3–5: o utilizador cancela a tarefa **Em fila** ou **A processar** → o sistema passa-a a **Cancelada**, não publica resultados parciais, elimina os temporários e estorna a operação reservada → o caso de uso termina. |
| FA5 – Carregar um vídeo novo | Passo 1: o vídeo ainda não está no projeto → o utilizador carrega-o através do UC-VID-001 → regressa ao passo 1 com o vídeo carregado. |
| FA6 – Regresso após ausência | Passo 5: o utilizador fecha a aplicação e regressa mais tarde → o sistema mostra o estado atual da tarefa e a notificação pendente (conclusão ou falha); se concluída, continua no passo 8. |

### 4.5.4 Exceções

| **Condição** | **Comportamento do Sistema** |
|---|---|
| **E1** — O utilizador não está autenticado ou não tem permissão de edição no projeto. | Rejeita o pedido sem criar tarefa nem reservar quota e apresenta um erro de autenticação ou autorização. |
| **E2** — Nenhuma ferramenta selecionada ou limiar fora de [0, 1]. | Mantém o botão de confirmação desativado e indica o campo em erro. |
| **E3** — **(Vídeo)** O vídeo não respeita a matriz de formatos ou excede a duração, o tamanho ou a resolução do perfil atual. | Rejeita o pedido antes de criar a tarefa, explica a restrição aplicável, sugere a subscrição Premium quando aplicável e mantém o projeto e a quota inalterados. |
| **E4** — **(Vídeo)** A quota diária não é suficiente. | Não cria a tarefa, informa que o limite diário foi atingido e sugere a subscrição Premium (só no perfil Free). |
| **E5** — O utilizador já tem o número máximo de tarefas ativas (RNG-05). | Rejeita o pedido sem criar tarefa nem reservar quota e informa que deve aguardar. |
| **E6** — O armazenamento ou a fila de processamento não estão disponíveis no momento da confirmação. | Rejeita o pedido sem criar tarefa nem reservar quota e informa que o serviço está temporariamente indisponível. |
| **E7** — **(Vídeo)** O *worker* falha durante a extração ou a deteção, ou excede o tempo máximo (RNG-06). | Passa a tarefa a **Falhada**, regista o motivo, não disponibiliza resultados parciais, elimina os temporários, estorna a operação, conserva o vídeo original e notifica o utilizador com uma mensagem que permite tentar novamente. |
| **E8** — O vídeo original ou o projeto é removido enquanto a tarefa está em fila ou em processamento. | Cancela a tarefa, elimina os temporários, estorna a operação reservada e informa o utilizador de que o vídeo de origem deixou de existir. |

### 4.5.5 Pós-condições

| **Tipo** | **Resultado** |
|---|---|
| Garantia de Sucesso | O vídeo original continua inalterado no projeto; a tarefa está **Concluída**; o resultado JSON e, se pedido, o vídeo anotado estão associados ao vídeo de origem; foi consumida 1 operação (Free); o utilizador foi notificado. |
| Garantia Mínima | O vídeo original não é alterado; uma tarefa incompleta não é apresentada como concluída; os temporários são eliminados no prazo de RNG-06; o motivo da falha é registado e comunicado; a operação reservada é estornada. |

### 4.5.6 Regras de Negócio e Restrições

| **ID** | **Regra** |
|---|---|
| RN1 | Só utilizadores registados com permissão de edição no projeto podem iniciar ou cancelar uma tarefa de deteção (RNG-01, RNG-07). |
| RN2 | `people_ai` deteta apenas a classe pessoa; `obj_ai` deteta as classes de objetos suportadas pelo modelo de deteção já usado pela ferramenta de imagem. |
| RN3 | Cada deteção inclui, no mínimo, a classe, a confiança, o índice e o instante do fotograma e uma caixa delimitadora em coordenadas normalizadas [0, 1]. Só são incluídas deteções com confiança ≥ ao limiar escolhido. |
| RN4 | Cada tarefa de deteção aceite conta como 1 operação, mesmo que combine `people_ai` e `obj_ai`; é reservada na aceitação, consolidada no sucesso e estornada em falha ou cancelamento. Free: 5 operações por dia; Premium: sem limite diário (RNG-04). Na baseline, cada ferramenta avançada conta como uma operação. |
| RN5 | O vídeo original é imutável. Os resultados são guardados como recursos separados e mantêm uma referência ao vídeo de origem e à tarefa que os produziu (RNG-08). |
| RN6 | Uma tarefa só é considerada concluída quando todos os fotogramas e ferramentas selecionadas terminarem com sucesso e todos os artefactos pedidos estiverem guardados. |
| RN7 | O processamento é assíncrono: a confirmação do pedido não espera pelo processamento do vídeo; o progresso e o estado final são comunicados ao utilizador em tempo real. |
| RN8 | O acesso ao vídeo e aos resultados respeita as permissões do projeto; os *links* de descarga são temporários. |

### 4.5.7 Assunções

| **ID** | **Assunção** |
|---|---|
| A1 | A matriz de formatos de entrada é a de RNG-02 (MP4/H.264/AAC ou sem áudio) e é validada antes de a tarefa entrar na fila. |
| A2 | O armazenamento de objetos é o SeaweedFS compatível com S3 usado pelo projeto (substituiu o MinIO descrito no documento de arquitetura de base); o volume partilhado existente pode ser usado apenas como espaço temporário. |
| A3 | A arquitetura de filas por ferramenta e a fila `ws_queue` podem ser estendidas para vídeo sem tornar o processamento síncrono. |
| A4 | Os *workers* processam os fotogramas sequencialmente ou em lotes, sem carregar o vídeo inteiro em memória. |
| A5 | O resultado JSON é obrigatório; o vídeo anotado é opcional (FA2) e pedido explicitamente pelo utilizador. |

### 4.5.8 Questões em Aberto

| **ID** | **Questão** | **Resolução** |
|---|---|---|
| Q1 | Quais são os formatos, *codecs*, tamanhos e durações máximos suportados na primeira versão? | **Resolvida**: MP4/H.264/AAC; Free 100 MB/60 s/1080p; Premium 500 MB/10 min/4K (RNG-02, RNG-03). |
| Q2 | A quota deve ser debitada por vídeo, por ferramenta selecionada, por duração ou por fotogramas? | **Resolvida**: 1 operação por tarefa aceite, mesmo com as duas ferramentas (RN4, RNG-04, `REQ-VID-COM-021`). |
| Q3 | O resultado estruturado deve ser JSON, CSV ou ambos, e qual o contrato de versionamento? | **Resolvida**: só JSON, com um campo `schemaVersion` no documento (`REQ-VID-DET-004`). |
| Q4 | O vídeo anotado faz parte da primeira entrega? | **Resolvida**: é opcional e pedido pelo utilizador (FA2, A5, `REQ-VID-DET-005`). |
| Q5 | O progresso é comunicado por percentagem de fotogramas, por etapas ou por ambos? | **Resolvida**: percentagem de fotogramas processados e estado da tarefa, atualizados pelo menos a cada 5 s (`REQ-VID-COM-013`). |
| Q6 | O cancelamento interrompe a inferência atual ou só impede a publicação? | **Resolvida**: a tarefa passa de imediato a **Cancelada** e nada é publicado; a interrupção do *worker* é *best effort* (`REQ-VID-COM-016`). |
| Q7 | Deve ser possível retomar uma tarefa interrompida a partir do último fotograma concluído? | **Resolvida**: não há retoma no MVP; o utilizador submete uma nova tarefa (RNG-06). |

---

### 4.6 UC-VID-006 — Alterar a velocidade de um vídeo

### 4.6.1 Cabeçalho

| **Secção** | **Detalhes** |
|---|---|
| **ID do Caso de Uso** | UC-VID-006 |
| **Nome** | Alterar a velocidade de um vídeo |
| **Versão** | v1.0 |
| **Autor** | Beatriz Miranda |
| **Data** | 2026-10-21 |
| **Objetivo** | Permitir ao utilizador obter, a partir de um vídeo do projeto, uma versão em câmara lenta ou acelerada, com o áudio a acompanhar a nova velocidade, sem alterar o original. |
| **Âmbito** | Frontend, API Gateway, serviço de projetos, nova ferramenta de velocidade, armazenamento de objetos e notificações em tempo real. |
| **Ator Principal** | Utilizador registado (perfil Free ou Premium) com permissão de edição no projeto. |
| **Stakeholders e Interesses** | • **Utilizador**: criar uma versão em câmara lenta ou acelerada de um vídeo sem perder o original e sem que o áudio fique desfasado ou com o tom alterado.<br>• **Proprietário do Sistema**: oferecer mais uma operação de edição dentro dos limites de cada perfil, com custo de processamento previsível.<br>• **Equipa de Desenvolvimento**: acrescentar uma ferramenta de vídeo sem alterar os serviços centrais, reutilizando o ciclo de vida de tarefas comum.<br>• **Equipa de Operações**: limitar a duração dos resultados, para que a câmara lenta não gere ficheiros nem tarefas desproporcionados. |
| **Pré-condições** | • O utilizador tem sessão iniciada e permissão de edição no projeto.<br>• O vídeo está num projeto, com carregamento concluído (UC-VID-001). |
| **Trigger** | O utilizador seleciona um vídeo do projeto e escolhe a opção **Alterar velocidade**. |

### 4.6.2 Fluxo Principal

| **Passo** | **Ação do Ator** | **Resposta do Sistema** |
|---|---|---|
| 1 | Seleciona um vídeo do projeto e escolhe **Alterar velocidade**. | Verifica que o vídeo respeita a matriz de formatos e os limites do perfil atual (RN1) e apresenta as velocidades disponíveis (RN2), o nome proposto para o resultado e a quota diária restante. |
| 2 | Escolhe uma velocidade. | Apresenta a duração que o resultado vai ter e se é câmara lenta ou aceleração. |
| 3 | Confirma o pedido. | Revalida no servidor o pedido (vídeo, velocidade, limites do perfil, quota e limite de tarefas ativas), cria a tarefa com estado **Em fila**, reserva uma operação (RN7) e coloca-a na fila com a prioridade do perfil. |
| 4 | Acompanha o progresso, podendo navegar para outras áreas ou fechar a aplicação. | Quando um *worker* fica disponível, passa a tarefa a **A processar**, altera a velocidade do vídeo e do áudio (RN4, RN5) e envia o progresso pelo menos a cada 5 s, independentemente da sessão do utilizador. |
| 5 | — | Verifica o ficheiro de saída: legível, MP4/H.264/AAC, com a resolução e a cadência da origem e a duração esperada (RN3). |
| 6 | — | Guarda o resultado como novo vídeo do projeto, associado ao original e à tarefa, passa a tarefa a **Concluída**, consolida a operação e notifica o utilizador. |
| 7 | Abre o novo vídeo. | Reproduz o vídeo e disponibiliza o descarregamento. |

### 4.6.3 Fluxos Alternativos

| **Fluxo** | **Descrição (passo de origem: condição → comportamento → retorno)** |
|---|---|
| FA1 – Vídeo sem áudio | Passo 4: a origem não tem faixa de áudio → o sistema altera só a velocidade do vídeo e o resultado fica sem áudio → continua no passo 5. |
| FA2 – Cancelamento | Passos 3–4: o utilizador cancela a tarefa **Em fila** ou **A processar** → o sistema passa-a a **Cancelada**, elimina os temporários, devolve a operação reservada e não publica nenhum resultado → o caso de uso termina. |
| FA3 – Regresso após ausência | Passo 4: o utilizador fecha a aplicação e regressa mais tarde → o sistema mostra o estado atual da tarefa e a notificação pendente; se concluída, continua no passo 7. |
| FA4 – Pedido idêntico em curso | Passo 3: já existe uma tarefa ativa do mesmo utilizador sobre o mesmo vídeo com a mesma velocidade → o sistema informa que o pedido já está em curso e apresenta essa tarefa, sem criar outra nem reservar quota. |

### 4.6.4 Exceções

| **Condição** | **Comportamento do Sistema** |
|---|---|
| **E1** — O utilizador não tem sessão válida ou não tem permissão de edição no projeto. | A opção **Alterar velocidade** fica indisponível com a indicação do motivo; não é criada nenhuma tarefa. |
| **E2** — A velocidade pedida não é uma das disponíveis (RN2). | Rejeita o pedido sem criar tarefa nem reservar quota e indica as velocidades aceites. |
| **E3** — **(Vídeo)** O vídeo de origem não respeita a matriz de formatos (por exemplo, um resultado WebM) ou excede os limites do perfil atual. | Não cria a tarefa, indica a restrição e, no perfil Free, sugere a subscrição Premium. |
| **E4** — **(Vídeo)** A quota diária está esgotada. | Não cria a tarefa, informa que o limite diário foi atingido e sugere a subscrição Premium (só no perfil Free). |
| **E5** — O utilizador já tem o número máximo de tarefas ativas. | Rejeita o pedido sem criar tarefa nem reservar quota e informa que deve aguardar. |
| **E6** — O armazenamento ou a fila de processamento não estão disponíveis. | Rejeita o pedido sem criar tarefa nem reservar quota e informa que o serviço está temporariamente indisponível. |
| **E7** — **(Vídeo)** O processamento falha, excede o tempo máximo (RNG-06) ou o resultado falha a verificação do passo 5. | Passa a tarefa a **Falhada**, regista o motivo, não publica o resultado, devolve a operação, mantém o original e notifica o utilizador. |
| **E8** — O vídeo original ou o projeto é removido enquanto a tarefa está ativa. | Cancela a tarefa, devolve a operação e informa o utilizador de que o vídeo de origem deixou de existir. |

### 4.6.5 Pós-condições

| **Tipo** | **Resultado** |
|---|---|
| Garantia de Sucesso | Existe um novo vídeo no projeto, à velocidade pedida, com a resolução e a cadência da origem e o áudio a acompanhar a velocidade; o original está inalterado; a tarefa está **Concluída**; foi consumida 1 operação (Free); o utilizador foi notificado. |
| Garantia Mínima | O original não é alterado; nenhum resultado parcial fica visível; a tarefa termina **Falhada** ou **Cancelada** com o motivo registado; a operação reservada é devolvida. |

### 4.6.6 Regras de Negócio e Restrições

| **ID** | **Regra** |
|---|---|
| RN1 | O vídeo de origem tem de respeitar a matriz de formatos (RNG-02) e os limites do perfil que o utilizador tem no momento do pedido (RNG-03). |
| RN2 | Velocidades disponíveis: 0,5×, 0,75×, 1,25×, 1,5× e 2×. O resultado tem, no máximo, o dobro e, no mínimo, metade da duração da origem. |
| RN3 | A duração do resultado é a da origem a dividir pela velocidade, com tolerância de ±0,5 s. |
| RN4 | A resolução e a cadência (fotogramas por segundo) do resultado são as da origem; em câmara lenta há fotogramas repetidos e na aceleração há fotogramas descartados. |
| RN5 | O áudio, quando existe, passa a ter a mesma velocidade que o vídeo, sem alteração do tom, e mantém-se sincronizado (`REQ-VID-COM-028`). |
| RN6 | O resultado pode exceder a duração máxima do perfil (por exemplo, 120 s a partir de um vídeo Free de 60 s a 0,5×), porque é gerado e não submetido; para ser usado como origem de outra ferramenta, aplica-se RN1. |
| RN7 | Cada pedido aceite conta como 1 operação, reservada na aceitação, consolidada no sucesso e devolvida em falha ou cancelamento; aplicam-se o limite de tarefas ativas e o tempo máximo (RNG-04 a RNG-06). |
| RN8 | O formato de saída é MP4 (H.264/AAC) (RNG-02); o resultado é um novo vídeo e o original nunca é alterado (RNG-08). |

### 4.6.7 Assunções

| **ID** | **Assunção** |
|---|---|
| A1 | A alteração de velocidade pode ser feita por uma biblioteca multimédia de uso livre (FFmpeg) num *worker* dedicado, como as restantes ferramentas de vídeo. |
| A2 | Os fatores de 0,5× a 2× cobrem os usos mais comuns (câmara lenta e aceleração moderadas); são valores de trabalho da equipa, a confirmar com utilizadores. |
| A3 | O custo de processamento depende da maior das duas durações, a da origem e a do resultado, porque o *worker* descodifica a origem inteira e codifica o resultado inteiro; com o limite de RN2, uma tarefa custa no máximo cerca do dobro de uma conversão do mesmo vídeo. |

### 4.6.8 Questões em Aberto

| **ID** | **Questão** | **Resolução** |
|---|---|---|
| Q1 | Devem ser aceites fatores mais extremos (0,25× ou 4×)? | **Adiada**: não no MVP, para limitar o tamanho e o custo dos resultados (RN2, A3). |
| Q2 | O utilizador deve poder escolher manter o tom original do áudio ou alterá-lo? | **Resolvida para o MVP**: o tom é sempre mantido (RN5); a opção fica para depois do MVP. |
| Q3 | Deve ser possível alterar a velocidade só de um intervalo do vídeo? | **Adiada**: fora do MVP; o utilizador pode recortar primeiro (UC-VID-002) e alterar a velocidade do excerto. |
| Q4 | O resultado pode exceder os limites de duração do perfil? | **Resolvida**: sim, por ser um resultado gerado (RN6). |

---

### 4.7 Regras de negócio transversais (RNG)

Decisões comuns a todos os casos de uso de vídeo. No relatório, pertencem ao Cap. 3.4.

| **ID** | **Regra** | **Elemento de base afetado** |
|---|---|---|
| RNG-01 | **Perfis com acesso a vídeo.** Só utilizadores registados (Free ou Premium) com sessão ativa podem submeter e processar vídeos. O perfil Anónimo não tem acesso a nenhuma funcionalidade de vídeo. | Perfis do enunciado; RNF44 |
| RNG-02 | **Matriz de formatos.** Entrada aceite: contentor MP4 com vídeo H.264 e áudio AAC ou sem faixa de áudio. Saída: MP4/H.264/AAC em todas as ferramentas; a conversão (UC-VID-003) pode também produzir WebM/VP9/Opus. Um resultado WebM não é aceite como entrada de outras ferramentas no MVP. | — |
| RNG-03 | **Limites por perfil.** Free: 100 MB, 60 s, 1920 × 1080 px. Premium: 500 MB, 10 min, 3840 × 2160 px. Os limites são validados na submissão e de novo em cada pedido de processamento, contra o perfil que o utilizador tem **no momento do pedido** (cobre o caso de *downgrade* de Premium para Free). | — |
| RNG-04 | **Contagem de operações.** Cada tarefa de processamento de vídeo aceite (recortar, converter, filtrar, detetar, alterar velocidade) conta como 1 operação, independentemente da duração, do número de fotogramas e do número de ferramentas combinadas. O Free partilha o limite diário de 5 operações com as ferramentas avançadas de imagem; o Premium não tem limite diário. A submissão de vídeo não conta. A operação é reservada quando a tarefa é aceite, consolidada quando termina em `completed` e estornada quando termina em `failed` ou `cancelled`. | RNF48; T-07 (contagem por ferramenta avançada, debitada no início) |
| RNG-05 | **Tarefas.** Estados: `queued` (Em fila), `processing` (A processar), `completed` (Concluída), `failed` (Falhada), `cancelled` (Cancelada). Máximo de tarefas em `queued` ou `processing` por utilizador: 1 no Free e 3 no Premium; um pedido acima do limite é rejeitado. As tarefas Premium em fila são iniciadas antes das tarefas Free. | RF17; T-01 |
| RNG-06 | **Falhas e limpeza.** Tempo máximo de processamento por tarefa: 15 min por cada minuto de vídeo de origem, com mínimo de 15 min. Uma tarefa que falhe ou exceda o tempo termina em `failed`, sem retoma automática. Resultados parciais nunca são publicados; temporários e parciais são eliminados em ≤ 1 h após o estado final. | — |
| RNG-07 | **Projetos partilhados.** Pode processar vídeos quem tiver permissão de edição no projeto (proprietário ou convidado com *link* “editar”, UC07 da baseline). A quota e os limites aplicados são os de quem inicia a tarefa. Um convidado com *link* “ver” só pode reproduzir e descarregar. | UC07; RF53 |
| RNG-08 | **Resultados.** Cada resultado é um novo recurso do projeto, associado ao vídeo de origem e à tarefa que o produziu; o vídeo original nunca é alterado. Vídeos e resultados persistem durante a vida do projeto; os registos de tarefas são conservados 30 dias. Não existe quota total de armazenamento no MVP. | UC04 |

## 5. Especificação de Requisitos do Sistema (ERS)

`NOVO` significa que a capacidade não existe na baseline. `ALT (ID)` significa que a extensão altera o elemento da baseline indicado (ver Cap. 6).

Os requisitos usam o prefixo da área a que pertencem: `COM` (comuns a vários casos de uso), `SUBMIT` (UC-VID-001), `TRIM` (UC-VID-002), `CONV` (UC-VID-003), `FLT` (UC-VID-004), `DET` (UC-VID-005) e `SPD` (UC-VID-006). Os requisitos não funcionais usam o mesmo prefixo da funcionalidade ou da área a que dizem respeito, continuando a sua numeração; a característica ISO/IEC 25010 é indicada na respetiva coluna. Nas origens, `Pn` é o passo *n* do fluxo principal e `En` a exceção *n* do caso de uso. Os textos já incluem o refinamento da secção 5.5.

### 5.1 Requisitos funcionais

| **ID** | **Requisito** | **Prioridade** | **Novo/Alt** | **Origem** | **Justificação** | **Critério de aceitação** |
|---|---|---|---|---|---|---|
| `REQ-VID-COM-001` | O sistema deve permitir a submissão e o processamento de vídeos apenas a utilizadores registados com sessão ativa e permissão de edição no projeto. | Must | ALT (`RNF44`; perfil Anónimo da baseline) | UC-VID-001/RN1, E4; UC-VID-002/RN12, E1; UC-VID-003/RN1, E1; UC-VID-004/E1; UC-VID-005/RN1, E1; RNG-01; RNG-07 | As operações de vídeo exigem identidade persistente para quota, tarefas e resultados; o perfil Anónimo, que na baseline faz operações básicas sobre imagens, fica excluído do vídeo. | Dado utilizador anónimo, sem sessão ou com *link* “ver”, quando tenta submeter ou processar um vídeo, então o pedido é rejeitado sem alterar o projeto nem criar tarefa; dado utilizador registado com permissão de edição, então o pedido é aceite se as restantes validações passarem. |
| `REQ-VID-COM-002` | O sistema deve apresentar, para o vídeo selecionado, o nome, a duração (mm:ss), a resolução (largura × altura em px), o tamanho (MB) e o formato (contentor e *codecs* de vídeo e de áudio). | Must | NOVO | UC-VID-001/P6; UC-VID-002/P1–P2; UC-VID-003/P1; UC-VID-004/P1; UC-VID-005/P1 | Permite ao utilizador confirmar que selecionou o vídeo correto antes de iniciar uma operação. | Dado vídeo no projeto, quando o utilizador o seleciona, então são apresentados nome, duração, resolução, tamanho e formato. |
| `REQ-VID-COM-003` | O sistema deve rejeitar um vídeo cujo contentor ou *codecs*, lidos do conteúdo do ficheiro, não pertençam à matriz de RNG-02, ou cuja faixa de vídeo não possa ser lida do primeiro ao último pacote. | Must | NOVO | UC-VID-001/P5, RN2, E1; UC-VID-002/E2; UC-VID-003/E2; UC-VID-004/E3; UC-VID-005/E3 | Impede a entrada de ficheiros inválidos que causariam falhas nos *workers*. | Dado ficheiro `.mp4` cujo vídeo está em H.265, quando é submetido, então o sistema rejeita-o e indica o *codec* não suportado. |
| `REQ-VID-COM-004` | O sistema deve rejeitar vídeos com mais de 104 857 600 bytes (100 MB) no perfil Free ou mais de 524 288 000 bytes (500 MB) no perfil Premium. | Must | NOVO | UC-VID-001/RN3, E2; UC-VID-002/E3; UC-VID-003/E3; UC-VID-004/RN3, E4; UC-VID-005/E3; RNG-03 | Controla o custo de armazenamento e processamento e diferencia os perfis. | Para cada perfil, dado um vídeo com o tamanho do limite e outro 1 MB acima, quando são submetidos, então o primeiro é aceite e o segundo rejeitado com indicação do limite. |
| `REQ-VID-COM-005` | O sistema deve rejeitar vídeos com duração superior a 60 s no perfil Free ou a 10 min no perfil Premium. | Must | NOVO | UC-VID-001/RN3, E2; UC-VID-002/RN1, E3; UC-VID-003/E3; UC-VID-004/RN2, E4; UC-VID-005/E3; RNG-03 | Limita o tempo de processamento por tarefa e diferencia os perfis. | Para cada perfil, dado um vídeo com a duração do limite e outro 1 s acima, quando são submetidos, então o primeiro é aceite e o segundo rejeitado com indicação do limite. |
| `REQ-VID-COM-006` | O sistema deve rejeitar vídeos cujo lado maior exceda 1920 px ou cujo lado menor exceda 1080 px no perfil Free (3840 px e 2160 px no Premium). | Must | NOVO | UC-VID-001/RN3, E2; UC-VID-002/E3; UC-VID-003/E3; UC-VID-004/RN9, E4; UC-VID-005/E3; RNG-03 | Limita o custo por fotograma e diferencia os perfis. | Dado utilizador Free, quando submete um vídeo 4K, então o vídeo é rejeitado com indicação do limite de 1080p. |
| `REQ-VID-COM-007` | O sistema deve indicar ao utilizador a causa específica de cada rejeição de um vídeo ou de um pedido de processamento. | Must | NOVO | UC-VID-001/E1–E2; UC-VID-002/E2–E6; UC-VID-003/E2–E7; UC-VID-004/E2–E6; UC-VID-005/E2–E5 | Torna a rejeição acionável pelo utilizador. | Dado pedido rejeitado por exceder a duração do perfil, quando o sistema responde, então a mensagem indica o limite excedido e o valor aplicável ao perfil. |
| `REQ-VID-COM-008` | O sistema deve validar no servidor o vídeo, os parâmetros, os limites do perfil atual do utilizador e a quota sempre que aceita uma tarefa. | Must | NOVO | UC-VID-002/P5; UC-VID-003/P2; UC-VID-004/P3; UC-VID-005/P3; RNG-03 | Impede que as validações da interface sejam contornadas e cobre a mudança de perfil depois da submissão (*downgrade*). | Dado vídeo de 5 min carregado como Premium e utilizador que passou a Free, quando pede um recorte, então o pedido é rejeitado com indicação do limite; dado pedido fora da interface com parâmetros inválidos, então é rejeitado sem criar tarefa. |
| `REQ-VID-COM-009` | O sistema deve rejeitar um pedido de processamento, sem criar tarefa nem reservar quota, quando o armazenamento ou a fila de processamento estão indisponíveis. | Must | NOVO | UC-VID-002/E7; UC-VID-003/E8; UC-VID-004/E7; UC-VID-005/E6 | Evita tarefas que nunca vão ser processadas e quota reservada sem contrapartida. | Dada a fila de processamento parada, quando o utilizador confirma um recorte, então recebe a indicação de serviço indisponível, não existe tarefa nova e o saldo de operações não muda. |
| `REQ-VID-COM-010` | O sistema deve permitir escolher a resolução de saída entre a original e as resoluções predefinidas inferiores, sem exceder a original nem o máximo do perfil, mantendo a proporção. | Must | NOVO | UC-VID-002/P4, RN5; UC-VID-003/P2, RN4, E4 | Partilhado pelo recorte e pela conversão, evita duplicar a mesma regra em dois requisitos. | Dado vídeo 4K e utilizador Free, quando abre as opções de resolução, então só vê 1080p e inferiores; dado vídeo 720p, então não vê resoluções acima de 720p. |
| `REQ-VID-COM-011` | O sistema deve registar cada tarefa de processamento de vídeo com identificador único, utilizador, projeto, vídeo de origem, parâmetros e estado. | Must | NOVO | UC-VID-002/P6; UC-VID-003/P3; UC-VID-004/P3; UC-VID-005/P3 | Permite acompanhamento, auditoria e consulta posterior das tarefas; a baseline só tem um *token* de execução por projeto. | Dado pedido aceite, quando a tarefa é criada, então existe um registo com ID único, utilizador, projeto, vídeo, parâmetros e estado `queued`. |
| `REQ-VID-COM-012` | O sistema deve gerir cada tarefa de vídeo apenas com os estados `queued`, `processing`, `completed`, `failed` e `cancelled`. | Must | NOVO | UC-VID-002/RN10; UC-VID-003/P3–P6; UC-VID-004/P3–P6; UC-VID-005/P3–P7; RNG-05 | Define um ciclo de vida comum e verificável para todas as operações assíncronas de vídeo. | Dado qualquer tarefa, quando o estado muda, então assume apenas um dos cinco valores e um estado final (`completed`, `failed`, `cancelled`) não volta a mudar. |
| `REQ-VID-COM-013` | O sistema deve apresentar ao utilizador o estado e a percentagem de progresso de cada tarefa ativa. | Must | NOVO | UC-VID-002/P7–P8, RN14; UC-VID-003/P4; UC-VID-004/P5; UC-VID-005/P4, Q5 | O processamento de vídeo é demorado; sem progresso o utilizador não sabe se a tarefa avança. | Dada tarefa em `processing`, quando o utilizador está na página do projeto, então vê o estado e a percentagem, atualizados com a cadência de `REQ-VID-COM-052`. |
| `REQ-VID-COM-014` | O sistema deve continuar o processamento de uma tarefa quando o utilizador sai da página, fecha a aplicação ou perde a ligação. | Must | NOVO | UC-VID-002/P9, E12; UC-VID-003/P4; UC-VID-004/FA4; UC-VID-005/P5 | O processamento pode demorar minutos; não pode depender de o cliente estar ligado. | Dada tarefa em `processing`, quando o utilizador fecha o navegador, então a tarefa termina em `completed` e o resultado aparece no projeto. |
| `REQ-VID-COM-015` | O sistema deve apresentar na interface, em ≤ 5 s após o estado final da tarefa, uma notificação com a ferramenta, o estado final e o motivo; se o utilizador não estiver ligado, deve apresentá-la na próxima abertura da aplicação. | Must | NOVO | UC-VID-002/P12, FA5; UC-VID-003/P6, FA5; UC-VID-004/P6, FA4; UC-VID-005/P7, FA6 | O utilizador pode sair durante o processamento; tem de saber do resultado quando regressa. | Dada tarefa concluída com o utilizador desligado, quando o utilizador volta a abrir a aplicação, então vê a notificação de conclusão. |
| `REQ-VID-COM-016` | O sistema deve permitir ao utilizador cancelar uma tarefa em `queued` ou `processing`, passando-a a `cancelled` sem publicar resultado. | Must | ALT (`RF17`; T-01) | UC-VID-002/FA1–FA2; UC-VID-003/FA3–FA4; UC-VID-004/FA3; UC-VID-005/FA4, Q6 | Permite desistir de uma tarefa e libertar recursos; na baseline o cancelamento é por projeto (*token* de execução), não por tarefa. | Dada tarefa em `queued` ou em `processing`, quando o utilizador a cancela, então a tarefa passa a `cancelled`, nenhum resultado é publicado e a operação reservada é devolvida. |
| `REQ-VID-COM-017` | O sistema deve cancelar as tarefas em `queued` ou `processing` cujo vídeo de origem ou projeto seja removido. | Should | NOVO | UC-VID-002/E11; UC-VID-003/E11; UC-VID-004/E10; UC-VID-005/E8 | Evita tarefas presas e *workers* a ler ficheiros que já não existem. | Dada tarefa em `processing`, quando o utilizador remove o vídeo de origem, então a tarefa passa a `cancelled`, a operação é devolvida e o utilizador é informado. |
| `REQ-VID-COM-018` | O sistema deve rejeitar um pedido de processamento quando o utilizador já tiver o máximo de tarefas em `queued` ou `processing` do seu perfil (Free: 1; Premium: 3). | Must | NOVO | UC-VID-002/RN6, E6; UC-VID-003/RN5, E7; UC-VID-004/RN8, E6; UC-VID-005/E5; RNG-05 | Controla a ocupação dos *workers* e impede que um utilizador ocupe a fila sozinho. | Dado utilizador Free com 1 tarefa ativa, quando submete outro pedido, então o sistema rejeita-o sem criar tarefa nem reservar quota; dado utilizador Premium com 2 tarefas ativas, quando submete outro pedido válido, então é aceite. |
| `REQ-VID-COM-019` | O sistema deve iniciar as tarefas em `queued` de utilizadores Premium antes das tarefas em `queued` de utilizadores Free. | Should | NOVO | UC-VID-002/P6, RN6; UC-VID-003/P3; RNG-05 | Concretiza a diferenciação de serviço do perfil Premium. | Dada uma tarefa Free e, depois, uma tarefa Premium em `queued` com todos os *workers* ocupados, quando um *worker* fica livre, então é iniciada a tarefa Premium. |
| `REQ-VID-COM-020` | O sistema deve registar o motivo de cada tarefa que termine em `failed` ou `cancelled`. | Should | NOVO | UC-VID-002/E8, Garantia mínima; UC-VID-003/E9; UC-VID-004/E8; UC-VID-005/E7 | Sem retoma automática, o motivo é a única forma de diagnosticar a falha e de a explicar ao utilizador. | Dada tarefa terminada em `failed` por tempo máximo excedido, quando se consulta o registo da tarefa, então o motivo está registado. |
| `REQ-VID-COM-021` | O sistema deve contar cada tarefa de vídeo aceite como 1 operação da quota diária, com limite de 5 operações partilhadas com as ferramentas avançadas de imagem no perfil Free e sem limite no perfil Premium. | Must | ALT (`RNF48`; T-07) | UC-VID-002/RN3, E5; UC-VID-003/RN5, E6; UC-VID-004/RN6, E5; UC-VID-005/RN4, FA3, E4; RNG-04 | Liga o vídeo ao modelo de quota existente; altera a regra da baseline, que conta uma operação por ferramenta avançada e não conta ferramentas básicas. | Dado utilizador Free com 4 operações usadas, quando submete uma deteção com `people_ai` e `obj_ai`, então é aceite e fica com 5 usadas; quando submete outro pedido, então é rejeitado; dado utilizador Premium, então nenhum pedido é rejeitado por quota. |
| `REQ-VID-COM-022` | O sistema deve devolver ao saldo diário, no dia em que foi reservada, a operação de uma tarefa que termine em `failed` ou `cancelled`. | Must | ALT (`RNF48`; T-07) | UC-VID-002/RN3, P6, P12; UC-VID-003/RN5; UC-VID-004/RN6; UC-VID-005/RN4; RNG-04 | Impede que o utilizador perca quota por falhas do sistema; na baseline a operação é debitada no início e só é reposta em caso de cancelamento. | Dado utilizador Free com 2 operações restantes, quando submete uma tarefa, então ficam 1; quando a tarefa termina em `failed`, então voltam a ser 2. |
| `REQ-VID-COM-023` | O sistema deve apresentar as operações diárias restantes do utilizador Free antes da confirmação de uma tarefa de vídeo. | Should | ALT (`RNF48`) | UC-VID-002/P2; UC-VID-003/P1; UC-VID-004/P1; UC-VID-005/P1 | Estende às ferramentas de vídeo a visibilidade do saldo de operações. | Dado utilizador Free com 3 operações restantes, quando abre uma ferramenta de vídeo, então vê “3 operações restantes”; após uma tarefa concluída, vê 2. |
| `REQ-VID-COM-024` | O sistema deve sugerir a subscrição Premium quando um pedido de um utilizador Free é rejeitado por quota ou por limite do perfil. | Could | ALT (`RF64`) | UC-VID-002/E3, E5; UC-VID-003/E3, E6; UC-VID-004/E4, E5; UC-VID-005/E3, E4 | Estende ao vídeo o incentivo à subscrição da baseline, que se aplica às ferramentas de imagem. | Dado utilizador Free que submete um vídeo de 90 s, quando o pedido é rejeitado, então a mensagem indica o limite Premium (10 min) e a opção de subscrever. |
| `REQ-VID-COM-025` | O sistema deve aplicar a quota, os limites do perfil e o limite de tarefas ativas do utilizador que inicia a tarefa, mesmo num projeto partilhado. | Must | ALT (`UC07`; `RF53`) | RNG-07; UC-VID-002/Ator principal; UC-VID-005/Ator principal | Na partilha da baseline, um convidado com *link* “editar” pode processar; é preciso definir quem paga a operação. | Dado proprietário Premium e convidado Free com *link* “editar”, quando o convidado submete uma deteção, então é descontada 1 operação ao convidado e aplicam-se os limites Free. |
| `REQ-VID-COM-026` | O sistema deve guardar cada resultado de processamento como novo recurso do projeto, associado ao vídeo de origem e à tarefa, sem alterar o original. | Must | NOVO | UC-VID-002/P11, RN8; UC-VID-003/P6, RN2; UC-VID-004/P6, RN4; UC-VID-005/P6, RN5; RNG-08 | Garante a integridade do original e a rastreabilidade dos resultados. | Dado processamento concluído, quando o utilizador consulta o projeto, então o original tem o mesmo *hash* que antes e o resultado aparece como recurso novo associado ao original. |
| `REQ-VID-COM-027` | O sistema deve verificar, antes de publicar um vídeo resultante, que é legível e tem o formato e a resolução pedidos e a duração esperada com tolerância de ±0,5 s. | Must | NOVO | UC-VID-002/P10, RN7, E10; UC-VID-003/P5, RN8, E10; UC-VID-004/P6, RN7, E9; UC-VID-005/FA2 | Garante que só são publicados resultados válidos. | Dado vídeo resultante ilegível ou com resolução diferente da pedida, quando o processamento termina, então a tarefa passa a `failed` e o ficheiro não é publicado. |
| `REQ-VID-COM-028` | O sistema deve preservar a faixa de áudio do original nos vídeos resultantes com uma diferença de início entre as faixas de áudio e de vídeo ≤ 40 ms; um original sem áudio produz um resultado sem áudio. | Must | NOVO | UC-VID-002/Q9; UC-VID-003/RN8; UC-VID-004/P4, A9; UC-VID-005/FA2 | Mantém a experiência do vídeo original após o processamento. | Dado vídeo com áudio, quando processado por qualquer ferramenta, então o resultado tem áudio e a dessincronização medida é ≤ 40 ms; dado vídeo sem áudio, então o resultado não tem áudio. |
| `REQ-VID-COM-029` | O sistema deve impedir o acesso a artefactos parciais e temporários de qualquer tarefa ou submissão. | Must | NOVO | UC-VID-001/Garantia mínima; UC-VID-002/FA2, E8; UC-VID-003/E9; UC-VID-004/E8; UC-VID-005/FA4, E7 | Impede que ficheiros parciais sejam confundidos com resultados válidos. | Dada tarefa terminada em `failed` ou `cancelled`, quando o utilizador consulta o projeto ou tenta descarregar, então nenhum ficheiro parcial é visível ou descarregável. |
| `REQ-VID-COM-030` | O sistema deve permitir reproduzir e descarregar cada vídeo resultante a utilizadores com acesso ao projeto. | Must | ALT (`RF13`) | UC-VID-002/P13; UC-VID-003/P7; UC-VID-004/P7; UC-VID-005/P8 | O resultado só tem valor se puder ser usado; estende o descarregamento da baseline (imagens em ZIP/PDF) a vídeos. | Dado resultado `completed`, quando o utilizador o abre e o descarrega, então o vídeo é reproduzido no navegador e o ficheiro descarregado é igual ao guardado. |
| `REQ-VID-COM-031` | O sistema deve apresentar as tarefas e os resultados de um projeto depois de o utilizador fechar e reabrir a aplicação. | Should | NOVO | UC-VID-002/FA5; UC-VID-003/FA5; UC-VID-004/FA4; UC-VID-005/FA6 | Garante que o trabalho do utilizador sobrevive ao fim da sessão. | Dado utilizador que fecha e reabre a aplicação, quando consulta o projeto, então as tarefas e os resultados anteriores estão visíveis com o respetivo estado. |
| `REQ-VID-COM-032` | O sistema deve excluir os vídeos do processamento das ferramentas de imagem aplicadas a um projeto. | Must | ALT (`UC04`; `RF15`) | UC-VID-001/RN5; RNG-08 | Um projeto passa a misturar imagens e vídeos; a cadeia de ferramentas de imagem da baseline processa todos os ficheiros do projeto e falharia ou cobraria operações por vídeos. | Dado projeto com 2 imagens e 1 vídeo e a ferramenta de imagem `rotate` adicionada, quando o utilizador processa o projeto, então são produzidos 2 resultados de imagem, o vídeo não é alterado e não há erro. |
| `REQ-VID-COM-033` | O sistema deve incluir os vídeos e os resultados de vídeo do projeto numa pasta `videos/` do descarregamento em ZIP. | Should | ALT (`RF13`; T-09) | UC-VID-001/RN5; RNG-08 | O descarregamento da baseline (ZIP ou PDF) só prevê imagens. | Dado projeto com imagens e vídeos, quando o utilizador descarrega em ZIP, então o ficheiro contém os vídeos e os resultados de vídeo na pasta `videos/`. |
| `REQ-VID-COM-034` | O sistema deve eliminar do armazenamento um vídeo ou resultado de vídeo, incluindo a sua *thumbnail*, quando o utilizador o remove do projeto ou remove o projeto. | Should | NOVO | UC-VID-001/Q5, RN8; UC-VID-002/E11; UC-VID-003/E11; UC-VID-004/E10; UC-VID-005/E8; RNG-08 | Os vídeos ocupam muito espaço; um vídeo removido não pode continuar a ocupar armazenamento nem ficar acessível. | Dado vídeo removido do projeto, quando se consulta o armazenamento de objetos, então o ficheiro e a *thumbnail* já não existem e os seus URLs devolvem erro. |
| `REQ-VID-COM-035` | O sistema deve eliminar todos os vídeos, resultados de vídeo e registos de tarefas de um utilizador quando a sua conta é eliminada. | Must | ALT (`RF23`; T-08) | RNG-08; `RNF44` | Cumprimento do RGPD; a remoção de conta da baseline só considera projetos de imagem. | Dado utilizador com 2 vídeos e 1 tarefa registada, quando elimina a conta, então nenhum desses ficheiros ou registos permanece no sistema. |
| `REQ-VID-COM-053` | O sistema deve gerar o descarregamento em PDF só com as imagens do projeto e avisar o utilizador de que os vídeos não estão incluídos. | Should | ALT (`RF13`; T-09) | UC-VID-001/RN5; RNG-08 | Um vídeo não pode ser incluído num PDF; separado de COM-033 para ser verificado isoladamente. | Dado projeto com imagens e vídeos, quando o utilizador descarrega em PDF, então o PDF só tem as imagens e é mostrado um aviso de que os vídeos não estão incluídos. |
| `REQ-VID-COM-057` | O sistema deve apresentar cada vídeo e cada resultado de vídeo nos conteúdos do projeto com uma *thumbnail*: a do próprio vídeo, a do vídeo de origem nos resultados de deteção, ou uma imagem genérica quando não existe *thumbnail*. | Should | ALT (`UC04`) | UC-VID-001/P6, RN8, E6, Q5; UC-VID-002/P11; UC-VID-003/P6; UC-VID-004/P6; UC-VID-005/P6; RNG-08 | Sem *thumbnail*, os vídeos do projeto só se distinguem pelo nome e pelos metadados técnicos, ao contrário das imagens, que a baseline mostra em *thumbnail*. | Dado projeto com um vídeo submetido, um resultado de recorte e um resultado de deteção, quando o utilizador abre o projeto, então cada um tem uma *thumbnail* e a do resultado de deteção é a do vídeo de origem. |
| `REQ-VID-CONV-001` | O sistema deve oferecer como formatos de saída da conversão apenas MP4 (H.264/AAC) e WebM (VP9/Opus). | Must | NOVO | UC-VID-003/P1, RN3; RNG-02 | Limita as opções ao que o sistema consegue produzir e reproduzir. | Dado vídeo selecionado, quando o utilizador abre a conversão, então vê exatamente os dois formatos. |
| `REQ-VID-CONV-002` | O sistema deve manter a resolução original quando só muda o formato e o formato original quando só muda a resolução. | Should | NOVO | UC-VID-003/FA1–FA2 | Evita alterações não pedidas. | Dado pedido só para WebM, quando termina, então o resultado tem a resolução original; dado pedido só para 720p, então o resultado é MP4. |
| `REQ-VID-CONV-003` | O sistema deve rejeitar um pedido de conversão que mantenha o formato e a resolução do original. | Should | NOVO | UC-VID-003/RN6, E5 | Evita consumir quota e armazenamento com uma cópia idêntica. | Dado vídeo MP4 1080p, quando o utilizador pede MP4 em 1080p, então o pedido é rejeitado sem criar tarefa. |
| `REQ-VID-CONV-004` | O sistema deve recusar um vídeo WebM resultante como entrada das ferramentas de vídeo, permitindo apenas reproduzi-lo e descarregá-lo. | Must | NOVO | UC-VID-003/RN7, E2; UC-VID-002/E2; RNG-02 | Mantém uma única matriz de entrada no MVP. | Dado resultado WebM, quando o utilizador tenta recortá-lo, então a ferramenta está indisponível com a indicação do formato suportado. |
| `REQ-VID-DET-001` | O sistema deve permitir selecionar `people_ai`, `obj_ai` ou ambas para um vídeo, rejeitando pedidos sem ferramenta. | Must | ALT (`RF46`) | UC-VID-005/P2, E2 | Estende a deteção de pessoas e objetos da baseline, feita em imagens, a vídeos. | Dado nenhuma ferramenta selecionada, quando o utilizador tenta confirmar, então o pedido é rejeitado. |
| `REQ-VID-DET-002` | O sistema deve permitir definir um limiar de confiança entre 0 e 1, com valor por omissão 0,5, e excluir do resultado as deteções abaixo do limiar. | Should | NOVO | UC-VID-005/P1–P2, RN3, E2 | Permite filtrar deteções de baixa confiança. | Dado limiar 0,7, quando a tarefa termina, então todas as deteções do JSON têm confiança ≥ 0,7. |
| `REQ-VID-DET-003` | O sistema deve executar `people_ai` e `obj_ai` na mesma tarefa quando ambas são escolhidas, combinando os resultados por fotograma. | Should | NOVO | UC-VID-005/FA3 | Evita duas tarefas e duas operações para a mesma análise. | Dado pedido com as duas ferramentas, quando termina, então existe uma só tarefa e um só JSON com deteções de pessoas e objetos. |
| `REQ-VID-DET-004` | O sistema deve registar cada deteção com índice e instante do fotograma, classe, confiança e caixa delimitadora normalizada, num documento JSON com versão do formato. | Must | NOVO | UC-VID-005/P4, P6, RN3, FA1, Q3 | Permite consultar e filtrar deteções por tempo e classe e evoluir o formato sem quebrar clientes. | Dada tarefa concluída, quando o utilizador descarrega o JSON, então tem `schemaVersion` e cada deteção tem os cinco campos, com coordenadas em [0, 1]. |
| `REQ-VID-DET-005` | O sistema deve gerar, quando pedido, um vídeo anotado com caixas e rótulos das deteções, com a resolução e a duração do original. | Should | ALT (`RF46`) | UC-VID-005/FA2, A5 | Estende ao vídeo a visualização com contornos e etiquetas da baseline. | Dado pedido com vídeo anotado, quando a tarefa termina, então existe um MP4 com caixas e rótulos, com a resolução e a duração do original. |
| `REQ-VID-DET-006` | O sistema deve passar uma tarefa de deteção a `completed` apenas depois de guardar todos os artefactos pedidos. | Must | NOVO | UC-VID-005/P7, RN6 | Impede a publicação de resultados parciais. | Dado pedido com JSON e vídeo anotado, quando a gravação do vídeo anotado falha, então a tarefa fica `failed` e o JSON não é publicado. |
| `REQ-VID-DET-007` | O sistema deve apresentar as deteções de um resultado por fotograma, permitindo navegar no tempo e filtrar por classe. | Should | NOVO | UC-VID-005/P8 | O JSON sozinho não é consultável pelo utilizador final; o passo 8 exige a apresentação das deteções. | Dado resultado com pessoas e carros, quando o utilizador filtra por “pessoa” e avança para 5 s, então vê só as deteções de pessoas nos fotogramas de 5 s. |
| `REQ-VID-FLT-001` | O sistema deve apresentar os estilos predefinidos Preto e Branco, Sépia e Vintage e controlos de brilho, contraste e saturação. | Must | NOVO | UC-VID-004/P1 | Fornece os controlos necessários para a edição visual do vídeo. | Dado vídeo selecionado, quando abre os filtros, então vê os três estilos e os três controlos. |
| `REQ-VID-FLT-002` | O sistema deve preencher os valores dos controlos com os do estilo predefinido escolhido. | Should | NOVO | UC-VID-004/P2 | Permite partir de um estilo e afinar manualmente (FA1). | Dado estilo Preto e Branco, quando escolhido, então a saturação fica em −100. |
| `REQ-VID-FLT-003` | O sistema deve aceitar valores de brilho, contraste e saturação apenas entre −100 e +100. | Must | NOVO | UC-VID-004/RN1, FA1, E2 | Impede parâmetros fora do intervalo suportado pelas transformações. | Dado valor 150, quando o utilizador tenta confirmar, então o campo é marcado em erro e a submissão é bloqueada. |
| `REQ-VID-FLT-004` | O sistema deve repor todos os controlos no valor neutro 0 quando o utilizador escolhe Repor. | Should | NOVO | UC-VID-004/FA2 | Permite recomeçar sem sair do editor. | Dados ajustes não neutros, quando o utilizador escolhe Repor, então os três controlos ficam a 0 e a pré-visualização volta ao original. |
| `REQ-VID-FLT-005` | O sistema deve atualizar a pré-visualização e o resumo dos valores em ≤ 1 s após cada alteração de um ajuste, sem criar tarefa nem consumir quota. | Should | NOVO | UC-VID-004/P1–P2, FA1, A4 | Permite ver o efeito antes de consumir quota. | Dado ajuste de brilho para +50, quando o utilizador solta o controlo, então a pré-visualização e o resumo refletem o novo valor em ≤ 1 s. |
| `REQ-VID-FLT-006` | O sistema deve aplicar os ajustes a todos os fotogramas, preservando a ordem, a resolução e a cadência originais. | Must | NOVO | UC-VID-004/P4, RN7 | Garante que o filtro é uniforme e o vídeo não fica alterado no tempo. | Dado vídeo de 60 s a 30 fps, quando filtrado, então o resultado tem 1800 fotogramas, a mesma resolução e 30 fps. |
| `REQ-VID-SPD-001` | O sistema deve permitir escolher a velocidade de um vídeo entre 0,5×, 0,75×, 1,25×, 1,5× e 2× e apresentar, antes da confirmação, a duração que o resultado vai ter. | Must | NOVO | UC-VID-006/P1–P2, RN2 | É a escolha central da funcionalidade; mostrar a duração evita surpresas antes de gastar quota. | Dado vídeo de 60 s, quando o utilizador escolhe 0,5×, então vê as cinco velocidades e a duração prevista de 2:00. |
| `REQ-VID-SPD-002` | O sistema deve produzir um resultado cuja duração é a da origem a dividir pela velocidade, com tolerância de ±0,5 s. | Must | NOVO | UC-VID-006/P5, RN3 | Torna a alteração de velocidade verificável. | Dado vídeo de 10 s, quando processado a 2× e a 0,5×, então os resultados têm entre 4,5 e 5,5 s e entre 19,5 e 20,5 s. |
| `REQ-VID-SPD-003` | O sistema deve manter no resultado a resolução e a cadência do vídeo de origem. | Must | NOVO | UC-VID-006/P5, RN4 | A velocidade não deve alterar a qualidade de imagem nem a fluidez da reprodução. | Dado vídeo 640 × 360 a 30 fps, quando processado a 0,5×, então o resultado tem 640 × 360 e 30 fps. |
| `REQ-VID-SPD-004` | O sistema deve alterar a velocidade do áudio no mesmo fator que a do vídeo, sem alterar o tom. | Should | NOVO | UC-VID-006/P4, RN5, FA1 | Áudio à velocidade original ficaria desfasado; áudio só acelerado ficaria com o tom alterado. | Dado vídeo com um tom de 440 Hz, quando processado a 2×, então o resultado tem áudio com a duração do vídeo e o tom continua em 440 Hz (±5 %); dado vídeo sem áudio, então o resultado não tem áudio. |
| `REQ-VID-SPD-005` | O sistema deve rejeitar um pedido com uma velocidade fora das disponíveis, sem criar tarefa nem reservar quota. | Must | NOVO | UC-VID-006/E2, RN2 | Impede pedidos fora da interface que gerariam resultados desproporcionados. | Dado pedido com 1×, 3× ou 0,25×, quando enviado à API, então é rejeitado com a indicação das velocidades aceites e não existe tarefa nova. |
| `REQ-VID-SUBMIT-001` | O sistema deve permitir submeter um vídeo a um projeto em que o utilizador tenha permissão de edição. | Must | ALT (modelo de domínio: `Projeto`) | UC-VID-001/P1–P6; UC-VID-005/FA5 | É a entrada funcional do suporte a vídeo; o projeto, que na baseline só contém imagens, passa a conter vídeos. | Dado utilizador autenticado com projeto editável, quando submete um vídeo válido, então o vídeo é guardado e associado ao projeto. |
| `REQ-VID-SUBMIT-002` | O sistema deve permitir criar um projeto novo a partir de um vídeo, não criando o projeto se o vídeo for recusado. | Could | ALT (modelo de domínio: `Projeto`) | UC-VID-001/FA4 | Atalho para o caso frequente de começar o trabalho por um vídeo; na baseline, um projeto só é criado com imagens. | Dado utilizador que cria um projeto com um vídeo de formato inválido, quando o vídeo é recusado, então nenhum projeto novo aparece na lista. |
| `REQ-VID-SUBMIT-003` | O sistema deve rejeitar um ficheiro cujo tamanho exceda o limite do perfil antes de iniciar a transferência. | Should | NOVO | UC-VID-001/RN7, E2 | Evita transferir centenas de MB que vão ser recusados. | Dado utilizador Free que seleciona um ficheiro de 150 MB, quando confirma, então o envio não começa e é indicado o limite de 100 MB. |
| `REQ-VID-SUBMIT-004` | O sistema deve apresentar a percentagem enviada de um vídeo, atualizada pelo menos uma vez por segundo até 100%. | Must | NOVO | UC-VID-001/P4 | Evita deixar o utilizador sem *feedback* durante transferências de centenas de MB. | Dado envio de 100 MB em curso, quando decorre o envio, então a percentagem é atualizada pelo menos uma vez por segundo até 100%. |
| `REQ-VID-SUBMIT-005` | O sistema deve permitir cancelar a seleção ou o envio de um vídeo sem alterar o projeto. | Should | NOVO | UC-VID-001/FA1 | Garante que cancelar não produz efeitos laterais no projeto. | Dado envio em curso, quando o utilizador cancela, então o projeto não tem nova entrada e nenhum ficheiro parcial fica acessível. |
| `REQ-VID-SUBMIT-006` | O sistema deve confirmar a submissão apenas depois de o ficheiro completo estar guardado e associado ao projeto. | Must | NOVO | UC-VID-001/P5–P6, E3, E5 | Impede que um carregamento incompleto seja apresentado como concluído. | Dado envio interrompido a 90%, quando o utilizador consulta o projeto, então não existe entrada para o vídeo e não foi apresentada confirmação. |
| `REQ-VID-SUBMIT-007` | O sistema deve adicionar cada vídeo submetido como nova entrada do projeto, sem substituir conteúdos existentes. | Must | NOVO | UC-VID-001/FA2, RN6 | Preserva os vídeos existentes ao adicionar novos. | Dado projeto com um vídeo, quando o utilizador submete outro vídeo válido, então o projeto tem os dois vídeos. |
| `REQ-VID-SUBMIT-008` | O sistema deve permitir repetir a submissão de um vídeo após uma falha do envio. | Should | NOVO | UC-VID-001/FA3, E3 | Permite recuperar de falhas temporárias de rede. | Dado envio falhado, quando o utilizador tenta novamente e o envio termina, então o projeto tem exatamente uma entrada para o vídeo. |
| `REQ-VID-SUBMIT-009` | O sistema deve manter uma só entrada no projeto quando uma submissão já confirmada é repetida. | Should | NOVO | UC-VID-001/FA3, RN6 | Evita duplicados quando a confirmação se perde na rede. | Dada submissão confirmada no servidor cuja resposta não chegou ao cliente, quando o cliente repete o envio, então o projeto continua com uma só entrada. |
| `REQ-VID-SUBMIT-010` | O sistema deve manter inalterado o saldo de operações diárias quando um vídeo é submetido. | Must | NOVO | UC-VID-001/RN4; RNG-04 | Delimita a regra de contagem de operações: só o processamento conta. | Dado utilizador Free sem operações restantes, quando submete um vídeo válido, então a submissão é aceite e o contador não muda. |
| `REQ-VID-SUBMIT-012` | O sistema deve gerar, durante a submissão, uma *thumbnail* JPEG de 320 px de largura a partir do fotograma a 10% da duração do vídeo (no máximo a 1 s) e associá-la ao vídeo, sem alterar o original. | Should | NOVO | UC-VID-001/P5–P6, RN5, RN8, A4, A6, Q4 | Permite identificar visualmente o vídeo no projeto sem o reproduzir. | Dado vídeo válido de 30 s, quando a submissão é confirmada, então existe uma *thumbnail* de 320 px de largura com a proporção do vídeo, o original tem o mesmo *hash* que o ficheiro enviado e o saldo de operações não muda. |
| `REQ-VID-SUBMIT-013` | O sistema deve aceitar a submissão de um vídeo válido mesmo quando não consegue gerar a sua *thumbnail*. | Should | NOVO | UC-VID-001/E6, RN8 | A *thumbnail* é acessória; a sua falha não pode impedir a entrada de um vídeo que passou todas as validações. | Dada a geração da *thumbnail* forçada a falhar, quando o utilizador submete um vídeo válido, então o vídeo é associado ao projeto e é apresentado com a imagem genérica. |
| `REQ-VID-TRIM-001` | O sistema deve permitir definir o início e o fim do recorte por marcadores na linha temporal ou por valores numéricos, apresentando a duração resultante. | Must | NOVO | UC-VID-002/P3 | É a interface principal de definição do intervalo. | Dado vídeo selecionado, quando o utilizador define início e fim por qualquer dos dois meios, então vê a duração do excerto. |
| `REQ-VID-TRIM-002` | O sistema deve reproduzir o vídeo no editor de recorte e posicionar a reprodução no instante inicial e no instante final escolhidos. | Should | NOVO | UC-VID-002/P2 | Permite confirmar visualmente o intervalo antes de consumir quota. | Dado início em 12 s, quando o utilizador escolhe “ver início”, então a reprodução começa em 12 s. |
| `REQ-VID-TRIM-003` | O sistema deve aceitar apenas intervalos com 0 ≤ início < fim ≤ duração e duração ≥ 1 s. | Must | NOVO | UC-VID-002/P3, RN2, E4 | Impede tarefas com intervalos inválidos. | Dado intervalo com início ≥ fim ou duração < 1 s, quando o utilizador tenta confirmar, então o botão está desativado e é mostrada a mensagem de erro. |
| `REQ-VID-TRIM-004` | O sistema deve usar o fim do vídeo como instante final quando este não é indicado. | Should | NOVO | UC-VID-002/FA3 | Simplifica o caso frequente de cortar só o início. | Dado vídeo de 50 s e início em 10 s sem fim indicado, quando o utilizador abre o resumo, então o fim apresentado é 50 s. |
| `REQ-VID-TRIM-005` | O sistema deve aproximar cada limite do intervalo ao fotograma mais próximo. | Should | NOVO | UC-VID-002/RN4 | Garante um resultado determinístico. | Dado vídeo a 30 fps e início em 1,01 s, quando o recorte é concluído, então o primeiro fotograma do resultado é o de 1,000 s. |
| `REQ-VID-TRIM-006` | O sistema deve apresentar, antes da confirmação, um resumo com intervalo, duração, resolução, formato de saída MP4/H.264/AAC e nome do novo vídeo. | Must | NOVO | UC-VID-002/P4, RN5 | Permite ao utilizador rever o pedido antes de consumir quota. | Dado editor de recorte configurado, quando o utilizador abre o resumo, então vê os cinco elementos. |
| `REQ-VID-TRIM-007` | O sistema deve sugerir um nome alternativo quando o nome escolhido já existe no projeto. | Could | NOVO | UC-VID-002/FA4 | Evita resultados com nomes iguais e confusão no projeto. | Dado projeto com `clip.mp4`, quando o utilizador escolhe esse nome, então o sistema sugere `clip (1).mp4` e pede confirmação. |
| `REQ-VID-TRIM-008` | O sistema deve recusar um pedido de recorte idêntico (mesmo vídeo, intervalo e opções) a uma tarefa ainda ativa do mesmo utilizador, indicando essa tarefa. | Should | NOVO | UC-VID-002/FA6 | Evita duplicar trabalho e consumir quota por duplo clique. | Dada tarefa de recorte em `queued`, quando o utilizador submete o mesmo pedido, então não é criada nova tarefa e é apresentada a existente. |
| `REQ-VID-TRIM-009` | O sistema deve produzir um excerto cuja duração difere no máximo 0,5 s do intervalo pedido. | Must | NOVO | UC-VID-002/P10, RN7 | Estabelece uma tolerância mensurável para a precisão do recorte. | Dado intervalo de 10 s, quando o excerto é produzido, então a duração está entre 9,5 s e 10,5 s. |
| `REQ-VID-TRIM-010` | O sistema deve aceitar como entrada de um recorte um vídeo resultante de um recorte anterior. | Should | NOVO | UC-VID-002/RN8 | Permite recortar iterativamente. | Dado resultado de um recorte, quando o utilizador escolhe Recortar nesse resultado, então a tarefa é aceite e o resultado anterior permanece no projeto. |

### 5.2 Requisitos não funcionais e de qualidade

| **ID** | **Requisito** | **ISO/IEC 25010** | **Alvo** | **Prioridade** | **Origem** | **Critério de aceitação** |
|---|---|---|---|---|---|---|
| `REQ-VID-COM-036` | O sistema deve responder a um pedido de processamento, com aceitação ou rejeição, em ≤ 2 s medidos entre a receção do pedido e o envio da resposta, no ambiente de referência (UC-VID-004/A7). | Eficiência de Desempenho (comportamento temporal) | MVP: ≤ 2 s; produção: 99% ≤ 1 s sob carga definida. | Must | DQ-001; UC-VID-002/P7, RN13; UC-VID-004/A8; UC-VID-005/RN7 | Medir a latência em ≥ 20 pedidos válidos e inválidos no ambiente de referência (UC-VID-004/A7); todos ≤ 2 s. |
| `REQ-VID-COM-037` | O sistema deve processar 5 tarefas em simultâneo e manter até 100 tarefas em fila sem perda. | Eficiência de Desempenho (capacidade) | MVP: 5 tarefas ativas e 100 em fila; produção: escalabilidade horizontal e fila persistente. | Should | UC-VID-004/A10 | Com 6 utilizadores distintos, submeter 6 tarefas em simultâneo e verificar que a 6.ª fica em `queued`; com 101 tarefas de utilizadores distintos, verificar que todas terminam. |
| `REQ-VID-COM-038` | O sistema deve eliminar os temporários e parciais de uma tarefa terminada em ≤ 1 h e os de um envio falhado em ≤ 24 h. | Eficiência de Desempenho (utilização de recursos) | MVP: ≤ 1 h e ≤ 24 h; produção: ≤ 15 min, com limpeza monitorizada. | Must | UC-VID-002/RN11; UC-VID-001/E3; RNG-06 | Aguardar 1 h após uma tarefa `failed` e verificar que os temporários foram eliminados do armazenamento. |
| `REQ-VID-COM-039` | O sistema deve manter o original inalterado e não publicar resultados parciais em falhas, cancelamentos e interrupções. | Fiabilidade (tolerância a falhas) | 100% dos cenários de falha, cancelamento e interrupção. | Must | DQ-002; Garantias mínimas de UC-VID-002 a UC-VID-005 | Terminar o *worker* a meio do processamento e verificar que o original tem o mesmo *hash* e que nenhum resultado parcial é acessível. |
| `REQ-VID-COM-040` | O sistema deve terminar como `failed` uma tarefa cujo processamento exceda 15 min por minuto de vídeo de origem, com mínimo de 15 min. | Fiabilidade (tolerância a falhas) | MVP: max(15 min, 15 min × duração em minutos); produção: limite calibrado por ferramenta. | Must | RNG-06; UC-VID-002/RN9, E9; UC-VID-003/E9; UC-VID-004/E8, A17; UC-VID-005/E7 | Simular um *worker* bloqueado com um vídeo de 30 s; ao fim de 15 min a tarefa passa a `failed`, a operação é devolvida e a vaga de tarefa ativa fica livre. |
| `REQ-VID-COM-041` | O sistema deve, após o reinício de um *worker* de vídeo, terminar como `failed`, com a operação devolvida, a tarefa que esse *worker* estava a processar, e manter em `queued` as restantes. | Fiabilidade (recuperabilidade) | 100% das tarefas num estado coerente após o reinício; nenhuma fica em `processing` indefinidamente. | Must | RNG-06; UC-VID-004/A16 | Com 1 tarefa em `processing` e 2 em `queued`, reiniciar o *worker*; a primeira fica `failed` com a operação devolvida e as outras duas terminam `completed`. |
| `REQ-VID-COM-042` | O sistema deve isolar o processamento de um ficheiro malformado, terminando só a respetiva tarefa como `failed`. | Fiabilidade (tolerância a falhas) | 100% dos ficheiros de teste malformados sem impacto noutras tarefas. | Must | UC-VID-002/E8; UC-VID-003/E9; UC-VID-004/E8; UC-VID-005/E7 | Processar em simultâneo um MP4 truncado e um válido; o primeiro termina `failed`, o segundo `completed` e o *worker* continua a aceitar tarefas. |
| `REQ-VID-COM-043` | O sistema deve conservar vídeos e resultados durante a vida do projeto e os registos de tarefas durante 30 dias. | Fiabilidade (disponibilidade) | Vida do projeto e 30 dias; produção: política configurável por tipo e perfil. | Must | DQ-004; UC-VID-002/Q8; UC-VID-004/Q4; RNG-08 | Verificar que vídeo e resultado continuam acessíveis após fechar e reabrir a sessão; verificar que o registo da tarefa existe 30 dias depois (relógio simulado). |
| `REQ-VID-COM-044` | O sistema deve produzir vídeos reproduzíveis sem extensões na última versão estável do Chrome e do Firefox à data do teste. | Compatibilidade (interoperabilidade) | MVP: Chrome e Firefox; produção: Safari e Edge. | Must | UC-VID-002/P13; UC-VID-003/P7, Q3; UC-VID-004/P7; UC-VID-005/P8 | Reproduzir um resultado MP4/H.264/AAC e um WebM/VP9/Opus na última versão estável do Chrome e do Firefox sem erros. |
| `REQ-VID-COM-045` | O sistema deve aceitar como entrada apenas MP4/H.264 com áudio AAC ou sem áudio e produzir apenas MP4/H.264/AAC ou, na conversão, WebM/VP9/Opus. | Compatibilidade (interoperabilidade) | MVP: matriz de RNG-02; produção: matriz versionada e extensível. | Must | RNG-02; UC-VID-001/RN2; UC-VID-003/RN3; UC-VID-004/RN5, A15 | Submeter um MP4/H.264/AAC, um MP4 sem áudio, um MP4/H.265 e um MOV; verificar que só os dois primeiros são aceites. |
| `REQ-VID-COM-046` | O sistema deve produzir, para um projeto de referência com 3 imagens, resultados iguais antes e depois da integração do vídeo com cada ferramenta básica de imagem, e concluir sem erro cada ferramenta avançada. | Manutenibilidade (modularidade) | MVP: zero diferenças nas básicas e zero erros nas avançadas; produção: regressão automatizada e contratos versionados. | Must | DQ-006; `UC04` | Processar o projeto de referência com cada ferramenta antes e depois da integração; comparar os resultados das básicas e verificar que as avançadas terminam sem erro. |
| `REQ-VID-COM-047` | O sistema deve permitir acrescentar uma ferramenta de vídeo alterando apenas o novo *worker*, o registo de ferramentas, o validador dos parâmetros da ferramenta e a entrada no menu da interface. | Manutenibilidade (modificabilidade) | MVP: só os quatro elementos alterados; produção: contrato versionado. | Should | UC-VID-004/A1; UC-VID-005/A3 | Acrescentar uma ferramenta de vídeo simulada e verificar que só são alterados os quatro elementos indicados. |
| `REQ-VID-COM-048` | O sistema deve registar, para cada tarefa, a ferramenta, a duração do vídeo, o tempo de fila, o tempo de processamento e o estado final. | Manutenibilidade (analisabilidade) | 100% das tarefas registadas; produção: métricas agregadas e alertas. | Should | Interesses da Equipa de Operações (UC-VID-002 a 005) | Executar uma tarefa de cada ferramenta e verificar que os cinco campos estão no registo. |
| `REQ-VID-COM-049` | O sistema deve arrancar os *workers* de vídeo e as suas dependências com um único comando documentado, numa máquina com Docker Engine 24 ou superior, 8 GB de RAM e 15 GB de disco livres. | Portabilidade (instalabilidade) | MVP: arranque com `docker-compose` no ambiente documentado; produção: imagens versionadas. | Should | DQ-007; UC-VID-004/A7 | Recriar o ambiente a partir da documentação numa máquina com os requisitos mínimos e executar o cenário de sucesso de um caso de uso de vídeo. |
| `REQ-VID-COM-050` | O sistema deve recusar o acesso a vídeos, *thumbnails*, tarefas e resultados a quem não tenha acesso ao projeto, identificando-os por valores não sequenciais. | Segurança (confidencialidade) | 100% das tentativas não autorizadas rejeitadas. | Must | `RNF44` (ALT); `RNF49`; UC-VID-001/RN8; UC-VID-005/RN8; UC-VID-004/A11 | Tentar aceder a um vídeo, a uma *thumbnail* e a um resultado com outro utilizador; verificar a rejeição e que os identificadores não são sequenciais. |
| `REQ-VID-COM-051` | O sistema deve garantir que pedidos simultâneos do mesmo utilizador não ultrapassam a quota diária nem o limite de tarefas ativas. | Segurança (integridade) | 0 pedidos aceites acima dos limites. | Must | DQ-005; RNG-04; RNG-05 | Enviar 10 pedidos em simultâneo de um utilizador Free com 1 operação restante; só 1 é aceite. |
| `REQ-VID-COM-052` | O sistema deve atualizar o progresso de uma tarefa em `processing` com intervalos ≤ 5 s entre atualizações consecutivas apresentadas ao utilizador. | Usabilidade (operabilidade) | MVP: ≤ 5 s; produção: notificações *push* e religação automática. | Should | DQ-003; UC-VID-002/RN14; UC-VID-004/A12; UC-VID-005/Q5 | Executar uma tarefa e medir o intervalo entre atualizações de progresso apresentadas; todos ≤ 5 s. |
| `REQ-VID-COM-054` | O sistema deve fornecer URLs de reprodução e de descarga de vídeo válidos durante 15 min a partir da sua emissão. | Segurança (confidencialidade) | 15 min (as imagens da baseline mantêm 60 min). | Must | `RNF49`; UC-VID-004/A11 | Pedir um URL de um vídeo, usá-lo aos 14 min e aos 16 min; o primeiro acesso é aceite e o segundo rejeitado. |
| `REQ-VID-COM-055` | O sistema deve manter o estado de todas as tarefas quando o serviço de projetos é reiniciado. | Fiabilidade (recuperabilidade) | 100% das tarefas com o mesmo estado após o reinício. | Must | RNG-06; UC-VID-004/A16 | Com tarefas em `queued`, `processing` e `completed`, reiniciar o serviço de projetos e verificar que os estados se mantêm. |
| `REQ-VID-COM-056` | O sistema deve processar um lote de imagens submetido em ZIP da mesma forma antes e depois da integração do vídeo. | Manutenibilidade (modularidade) | Zero diferenças no lote de referência. | Must | DQ-006; `UC04` | Submeter o mesmo ZIP de imagens antes e depois da integração com as mesmas ferramentas básicas e comparar os resultados. |
| `REQ-VID-CONV-006` | O sistema deve concluir a conversão para MP4 de um vídeo de 60 s em 1080p em ≤ 2 min, medidos entre a passagem da tarefa a `processing` e a passagem a `completed`; o alvo da conversão para WebM fica por fixar até ser medido no protótipo. | Eficiência de Desempenho (comportamento temporal) | MVP: 95% das conversões para MP4 de vídeos Free (≤ 60 s, ≤ 1080p) em ≤ 2 min; vídeos Premium em ≤ 2 × a sua duração; WebM a fixar; produção: 99% em ≤ 90 s. | Should | UC-VID-003/A4 | Executar ≥ 20 conversões para MP4 de vídeos de 60 s 1080p no ambiente de referência e verificar a percentagem dentro do prazo. |
| `REQ-VID-DET-008` | O sistema deve produzir, para cada fotograma, as mesmas deteções que `people_ai` e `obj_ai` produzem na imagem desse fotograma. | Adequação Funcional (correção) | ≥ 95% das deteções coincidentes (mesma classe e IoU ≥ 0,9) nos fotogramas amostrados. | Must | UC-VID-005/RN2; `RF46` (ALT) | Extrair 20 fotogramas, processá-los com as ferramentas de imagem e comparar com as deteções do JSON nos mesmos instantes. |
| `REQ-VID-DET-009` | O sistema deve concluir a deteção de um vídeo de 60 s em 1080p a 30 fps em ≤ 10 min, medidos entre a passagem da tarefa a `processing` e a passagem a `completed`. | Eficiência de Desempenho (comportamento temporal) | MVP: 95% em ≤ 10 min no ambiente de referência; produção: ≤ 2 min. | Should | UC-VID-005; UC-VID-004/A7 | Executar ≥ 10 deteções com as duas ferramentas e verificar a percentagem dentro do prazo. |
| `REQ-VID-FLT-007` | O sistema deve produzir em cada fotograma filtrado o mesmo efeito que as ferramentas de imagem `brightness`, `contrast` e `saturation` produzem nessa imagem. | Adequação Funcional (correção) | PSNR ≥ 35 dB entre o fotograma do vídeo e o resultado da ferramenta de imagem (a diferença deve-se só à compressão). | Must | UC-VID-004/A1, A18 | Extrair 10 fotogramas do original, aplicar-lhes as ferramentas de imagem com os mesmos valores e comparar com os fotogramas correspondentes do resultado. |
| `REQ-VID-FLT-008` | O sistema deve concluir a filtragem de um vídeo de 60 s em 1080p a 30 fps em ≤ 3 min, medidos entre a passagem da tarefa a `processing` e a passagem a `completed`. | Eficiência de Desempenho (comportamento temporal) | MVP: 95% em ≤ 3 min no ambiente de referência; produção: ≤ 1 min. | Should | UC-VID-004/A7, A17 | Executar ≥ 20 filtragens com os três ajustes e verificar a percentagem dentro do prazo. |
| `REQ-VID-SPD-006` | O sistema deve concluir a alteração de velocidade de um vídeo em 1080p em ≤ 2 min por minuto de vídeo resultante, medidos entre a passagem da tarefa a `processing` e a passagem a `completed`. | Eficiência de Desempenho (comportamento temporal) | MVP: 95% em ≤ 2 min por minuto de resultado no ambiente de referência (1 vCPU); produção: ≤ 1 min por minuto de resultado. | Should | UC-VID-006; UC-VID-004/A7; A3 | Executar ≥ 10 pedidos a 0,5× e 10 a 2× de `ok_1080p_60s.mp4` e verificar a percentagem dentro do prazo (≤ 4 min a 0,5×; ≤ 1 min a 2×). |
| `REQ-VID-SUBMIT-011` | O sistema deve confirmar ou rejeitar a submissão de um vídeo de até 500 MB, incluindo a geração da *thumbnail*, em ≤ 5 s medidos a partir do fim da transferência, no ambiente de referência. | Eficiência de Desempenho (comportamento temporal) | MVP: ≤ 5 s; produção: ≤ 2 s. | Must | DQ-001; UC-VID-001/P5–P6, RN8, A6 | Submeter vídeos de 10 MB e de 500 MB e medir o tempo entre o fim da transferência e a confirmação; todos ≤ 5 s. |
| `REQ-VID-TRIM-011` | O sistema deve concluir o recorte de um vídeo de 60 s em 1080p em ≤ 1 min, medidos entre a passagem da tarefa a `processing` e a passagem a `completed`. | Eficiência de Desempenho (comportamento temporal) | MVP: 95% em ≤ 1 min no ambiente de referência; produção: ≤ 30 s. | Should | UC-VID-002; UC-VID-004/A7 | Executar ≥ 20 recortes de 30 s de um vídeo de 60 s em 1080p e verificar a percentagem dentro do prazo. |

### 5.3 Verificação da completude e dos limites do âmbito

Nesta tabela, os IDs aparecem sem o prefixo `REQ-VID-`.

| **Tópico a verificar** | **Caso de uso** | **Aplicável?** | **Decisão / justificação** | **Requisito(s)** |
|---|---|---|---|---|
| Formato, *codec*, duração e dimensão do vídeo | UC-VID-001 | Sim | Validados na submissão contra a matriz e os limites do perfil; o tamanho é verificado antes da transferência. | COM-003 a 006, SUBMIT-003, COM-045 |
|  | UC-VID-002 | Sim | Revalidados no pedido contra o perfil atual; saída MP4 na resolução escolhida. | COM-008, COM-010 |
|  | UC-VID-003 | Sim | Entrada MP4; saída MP4 ou WebM; resolução ≤ original e perfil. | CONV-001, CONV-004, COM-010 |
|  | UC-VID-004 | Sim | Revalidados no pedido; resolução e cadência preservadas. | COM-008, FLT-006 |
|  | UC-VID-005 | Sim | Revalidados no pedido; vídeo anotado com a resolução do original. | COM-008, DET-005 |
| Estado, progresso, cancelamento e resultado | UC-VID-001 | Parcial | Não cria tarefa: tem progresso e cancelamento do envio, mas não estados de tarefa. A *thumbnail* é gerada de forma síncrona na submissão e a sua falha não impede a submissão. | SUBMIT-004 a 006, SUBMIT-012, SUBMIT-013, COM-057 |
|  | UC-VID-002 a 004 | Sim | Ciclo de vida comum de tarefa, notificação e acesso ao resultado. | COM-011 a 016, COM-030 |
|  | UC-VID-005 | Sim | Ciclo de vida comum; conclusão só depois de guardar todos os artefactos. | COM-011 a 016, DET-006, DET-007 |
| Falhas durante o processamento | UC-VID-001 | Sim | Falhas de envio: sem entrada parcial, repetição possível. | SUBMIT-006, SUBMIT-008, SUBMIT-009 |
|  | UC-VID-002 a 005 | Sim | Serviço indisponível rejeita o pedido; falha e *timeout* levam a `failed`, sem retoma, com motivo e estorno; o reinício e os ficheiros malformados não deixam tarefas presas. | COM-009, COM-020, COM-022, COM-027, COM-039 a COM-042, COM-055 |
| Persistência e expiração dos ficheiros | UC-VID-001 | Sim | O vídeo e a sua *thumbnail* persistem durante a vida do projeto e são eliminados com ele; envios falhados limpos em ≤ 24 h. | COM-043, COM-038, COM-034 |
|  | UC-VID-002 a 005 | Sim | Resultados persistem durante a vida do projeto; registos de tarefas 30 dias; temporários ≤ 1 h; a remoção do vídeo, do projeto ou da conta elimina os ficheiros; sem quota total de armazenamento (RNG-08). | COM-031, COM-034, COM-035, COM-043, COM-038 |
| Perfis e contagem de operações | UC-VID-001 | Sim | Só registados; a submissão não conta como operação. | COM-001, SUBMIT-010 |
|  | UC-VID-002 a 004 | Sim | 1 operação por tarefa; Free 5/dia partilhadas; Premium sem limite; limites de tarefas ativas e prioridade; quota de quem inicia a tarefa. | COM-018, COM-019, COM-021 a 025, COM-051 |
|  | UC-VID-005 | Sim | 1 operação por tarefa, mesmo com as duas ferramentas. | COM-021, DET-003 |
| Encadeamento de ferramentas e processamento em lote | UC-VID-001 | Não | Fora do âmbito: submissão de um vídeo de cada vez (sem `.zip` de vídeos). | N/A |
|  | UC-VID-002 a 004 | Não | Fora do MVP: cada operação é uma tarefa independente; o resultado de um recorte pode ser recortado de novo. A cadeia de ferramentas de imagem ignora os vídeos do projeto. | TRIM-010, COM-032 |
|  | UC-VID-005 | Parcial | As duas ferramentas de deteção podem ser combinadas numa só tarefa; o encadeamento com outras ferramentas fica fora do MVP. | DET-003 |

### 5.4 Conflitos resolvidos e requisitos removidos por duplicação

Foram fundidos requisitos que descreviam o mesmo comportamento (validação, autorização, estados,
quota, cancelamento, preservação do original, limpeza, persistência, progresso e publicação do
resultado). Foram resolvidas as contradições entre:

- **perfil Anónimo**: uma versão permitia-lhe submeter vídeo e outra não; prevalece RNG-01, sem acesso a vídeo;
- **limites por perfil**: resoluções trocadas numa das regras; prevalece Free 100 MB/60 s/1080p e Premium 500 MB/10 min/4K (RNG-03);
- **formatos**: entrada MP4/H.264 com AAC ou sem áudio; saída MP4/H.264/AAC e, na conversão, WebM/VP9/Opus; MKV e outros _codecs_ de áudio ficam fora do MVP (RNG-02);
- **quota**: prevalece 1 operação por tarefa aceite, reservada na aceitação, consolidada no sucesso e estornada em falha ou cancelamento (RNG-04);
- **limite de tarefas ativas**: “colocar em espera” e “rejeitar”; prevalece a rejeição (RNG-05);
- **estados**: armazenamento com estados canónicos em inglês; a interface usa Em fila, A processar, Concluída, Falhada e Cancelada (RNG-05);
- **tempo máximo**: os 15 min fixos tornavam impossível processar vídeos Premium longos; passa a 15 min por minuto de vídeo, com mínimo de 15 min (RNG-06);
- **limpeza de temporários**: “imediatamente” e “≤ 1 h”; prevalece ≤ 1 h (RNG-06);
- **vídeo anotado**: o JSON é obrigatório e o vídeo anotado é opcional;
- **cancelamento**: só o cancelamento explícito ou a remoção do vídeo de origem cancelam uma tarefa;
- **repetição**: o upload pode ser repetido explicitamente pelo utilizador; as tarefas de processamento não têm repetição automática no MVP;
- **pré-visualização na submissão** (v1.3): a Q4 do UC-VID-001 excluía qualquer pré-visualização; passa a ser gerada uma *thumbnail* na submissão (RN8), sem pré-visualização com reprodução, que continua nas ferramentas de processamento.

Foram eliminados por duplicação ou por descreverem uma solução técnica os antigos `CONV-002`,
`FLT-006` e `DET-003`; os requisitos não funcionais `NF-nnn` passaram a usar o prefixo da
funcionalidade ou da área a que dizem respeito, continuando a sua numeração (`COM-036` a `COM-052`,
`CONV-006`, `DET-008`, `DET-009`, `FLT-007`, `FLT-008`, `SPD-006`, `SUBMIT-011`, `TRIM-011`; ver `mapa-ids.md`).

### 5.5 Refinamento dos requisitos

Os requisitos das secções 5.1 e 5.2 foram revistos à procura de termos vagos, requisitos compostos, ausência de critério mensurável e frases com mais do que uma interpretação, e depois confrontados com as seis regras de qualidade: clareza, testabilidade, atomicidade, exequibilidade, consistência e necessidade. O domínio do vídeo é particularmente sujeito a ambiguidade, porque quase todas as grandezas têm unidades (MB, s, px, fps) e porque "rápido" pode querer dizer tempo de resposta ou tempo até ao resultado. A tabela seguinte regista cada requisito alterado; os textos refinados já estão nas secções 5.1 e 5.2. Os IDs dos requisitos divididos não se reutilizam: a parte separada recebe um ID novo.

| **ID** | **Requisito original** | **Requisito refinado** | **Ambiguidade resolvida** |
|---|---|---|---|
| COM-002 | ... apresentar os metadados do vídeo selecionado: nome, duração, resolução, tamanho e formato. | O sistema deve apresentar, para o vídeo selecionado, o nome, a duração (mm:ss), a resolução (largura × altura em px), o tamanho (MB) e o formato (contentor e *codecs* de vídeo e de áudio). | "Formato" podia ser só a extensão; ficam definidas as unidades de cada campo. |
| COM-003 | ... validar o contentor, o *codec* e a integridade de um vídeo a partir do conteúdo do ficheiro ... | O sistema deve rejeitar um vídeo cujo contentor ou *codecs*, lidos do conteúdo do ficheiro, não pertençam à matriz de RNG-02, ou cuja faixa de vídeo não possa ser lida do primeiro ao último pacote. | "Integridade" não era verificável; passa a ser a leitura completa da faixa de vídeo. |
| COM-004 | ... tamanho superior a 100 MB no perfil Free ou a 500 MB no perfil Premium. | O sistema deve rejeitar vídeos com mais de 104 857 600 bytes (100 MB) no perfil Free ou mais de 524 288 000 bytes (500 MB) no perfil Premium. | "MB" tinha duas leituras (10⁶ ou 2²⁰ bytes); fica o valor exato em bytes, igual ao implementado. |
| COM-006 | ... resolução superior a 1920 × 1080 px no perfil Free ou a 3840 × 2160 px ... | O sistema deve rejeitar vídeos cujo lado maior exceda 1920 px ou cujo lado menor exceda 1080 px no perfil Free (3840 px e 2160 px no Premium). | Não era claro se um vídeo vertical de 1080 × 1920 px excede o limite; passa a ser aceite. |
| COM-015 | ... notificar o utilizador quando uma tarefa termina ..., mantendo a notificação pendente se o utilizador não estiver ligado. | O sistema deve apresentar na interface, em ≤ 5 s após o estado final da tarefa, uma notificação com a ferramenta, o estado final e o motivo; se o utilizador não estiver ligado, deve apresentá-la na próxima abertura da aplicação. | Faltavam o meio (notificação na interface, sem e-mail), o prazo e o comportamento com a sessão terminada. |
| COM-022 | ... reservar a operação quando aceita a tarefa, consolidá-la quando ... `completed` e estorná-la quando termina em `failed` ou `cancelled`. | O sistema deve devolver ao saldo diário, no dia em que foi reservada, a operação de uma tarefa que termine em `failed` ou `cancelled`. | Requisito composto: a reserva já está em COM-021 e a consolidação não tem efeito observável. Fica o dia da devolução, que antes era ambíguo depois da meia-noite. |
| COM-028 | ... preservar a faixa de áudio do original nos vídeos resultantes, sincronizada com a imagem. | O sistema deve preservar a faixa de áudio do original nos vídeos resultantes com uma diferença de início entre as faixas de áudio e de vídeo ≤ 40 ms; um original sem áudio produz um resultado sem áudio. | "Sincronizada" não tinha valor nem forma de medir; o limite só estava no critério de aceitação. |
| COM-033 | ... incluir os vídeos ... no descarregamento do projeto em ZIP e excluí-los do descarregamento em PDF, informando o utilizador. | O sistema deve incluir os vídeos e os resultados de vídeo do projeto numa pasta `videos/` do descarregamento em ZIP. | Requisito composto; a exclusão do PDF e o aviso passam a COM-053. |
| COM-053 (novo) | — (parte de COM-033) | O sistema deve gerar o descarregamento em PDF só com as imagens do projeto e avisar o utilizador de que os vídeos não estão incluídos. | Separado de COM-033 para ser verificado isoladamente. |
| COM-036 | ... confirmar a aceitação ou a rejeição ... sem aguardar o processamento. Alvo: ≤ 2 s; validação de um vídeo de 500 MB ≤ 5 s após a receção. | O sistema deve responder a um pedido de processamento, com aceitação ou rejeição, em ≤ 2 s medidos entre a receção do pedido e o envio da resposta, no ambiente de referência (UC-VID-004/A7). | Juntava dois alvos de natureza diferente; a validação do envio passa a SUBMIT-011. Fica definido onde começa e acaba a medição. |
| SUBMIT-011 (novo) | — (parte de COM-036) | O sistema deve confirmar ou rejeitar a submissão de um vídeo de até 500 MB em ≤ 5 s medidos a partir do fim da transferência, no ambiente de referência. | Separa o tempo de resposta da submissão do tempo de transferência, que depende da rede. Com a *thumbnail* (v1.3), o prazo passa a incluir a sua geração. |
| COM-041 | ... após o reinício de um serviço de vídeo, manter as tarefas em `queued` e terminar como `failed`, com estorno, as que estavam em `processing`. | O sistema deve, após o reinício de um *worker* de vídeo, terminar como `failed`, com a operação devolvida, a tarefa que esse *worker* estava a processar, e manter em `queued` as restantes. | "Serviço de vídeo" tinha várias leituras (*worker* ou serviço de projetos); este requisito fica com o reinício do *worker* e o do serviço de projetos passa a COM-055. |
| COM-055 (novo) | — (parte de COM-041) | O sistema deve manter o estado de todas as tarefas quando o serviço de projetos é reiniciado. | Separado de COM-041: os dois reinícios têm efeitos diferentes e testam-se em separado. |
| COM-044 | ... reproduzíveis nas versões atuais de Chrome e Firefox sem extensões. | O sistema deve produzir vídeos reproduzíveis sem extensões na última versão estável do Chrome e do Firefox à data do teste. | "Versões atuais" não era verificável ao longo do tempo; fica a versão à data do teste. O sistema operativo não é fixado, por não haver origem para o restringir. |
| COM-046 | ... manter o funcionamento das ferramentas e dos lotes de imagem depois da integração do vídeo. | O sistema deve produzir, para um projeto de referência com 3 imagens, resultados iguais antes e depois da integração do vídeo com cada ferramenta básica de imagem, e concluir sem erro cada ferramenta avançada. | A baseline não tem testes de regressão, por isso "zero regressões" não era verificável sem um conjunto de teste. As ferramentas avançadas (IA) não dão sempre o mesmo resultado, por isso só se exige que terminem sem erro (exequibilidade). O lote passa a COM-056. |
| COM-056 (novo) | — (parte de COM-046) | O sistema deve processar um lote de imagens submetido em ZIP da mesma forma antes e depois da integração do vídeo. | Separado de COM-046 para ser verificado isoladamente. |
| COM-047 | ... acrescentar uma nova ferramenta de vídeo sem alterar os serviços centrais. | O sistema deve permitir acrescentar uma ferramenta de vídeo alterando apenas o novo *worker*, o registo de ferramentas, o validador dos parâmetros da ferramenta e a entrada no menu da interface. | "Serviços centrais" não estava definido; passa a ser uma lista fechada do que pode mudar. |
| COM-049 | ... contentores reproduzíveis a partir da documentação. | O sistema deve arrancar os *workers* de vídeo e as suas dependências com um único comando documentado, numa máquina com Docker Engine 24 ou superior, 8 GB de RAM e 15 GB de disco livres. | "Máquina limpa" não tinha requisitos mínimos. |
| COM-050 | ... restringir vídeos, tarefas e resultados a utilizadores autorizados no projeto e usar identificadores e URLs não adivinháveis e temporários. | O sistema deve recusar o acesso a vídeos, tarefas e resultados a quem não tenha acesso ao projeto, identificando-os por valores não sequenciais. | Requisito composto; a validade dos URLs passa a COM-054. Com a *thumbnail* (v1.3), passa a abranger também as *thumbnails*. |
| COM-054 (novo) | — (parte de COM-050) | O sistema deve fornecer URLs de reprodução e de descarga de vídeo válidos durante 15 min a partir da sua emissão. | Separado de COM-050; torna explícita a diferença face aos URLs de imagem da baseline (60 min). |
| COM-052 | ... apresentar estados, erros, quota e progresso de forma compreensível, atualizando o progresso pelo menos a cada 5 s. | O sistema deve atualizar o progresso de uma tarefa em `processing` com intervalos ≤ 5 s entre atualizações consecutivas apresentadas ao utilizador. | "Compreensível" não era verificável; as mensagens de erro já estão em COM-007 e os estados em COM-012. Fica a cadência medida. |
| FLT-005 | ... atualizar a pré-visualização aproximada e o resumo dos valores sempre que um ajuste muda ... | O sistema deve atualizar a pré-visualização e o resumo dos valores em ≤ 1 s após cada alteração de um ajuste, sem criar tarefa nem consumir quota. | "Aproximada" e "sempre que" não tinham prazo; fica explícito que a pré-visualização não gasta operações. |
| SUBMIT-004 | ... apresentar o progresso do envio durante a submissão de um vídeo. | O sistema deve apresentar a percentagem enviada de um vídeo, atualizada pelo menos uma vez por segundo até 100%. | Faltava a cadência de atualização. |
| TRIM-011, CONV-006, FLT-008, DET-009 | ... concluir o recorte (conversão, filtragem, deteção) de um vídeo de 60 s em 1080p em ≤ 1 min (2, 3, 10 min). | Mesmo texto, com o tempo medido entre a passagem da tarefa a `processing` e a passagem a `completed`, sem o tempo em fila, no ambiente de referência (UC-VID-004/A7). | "Concluir em" podia incluir o tempo de espera na fila, que depende da carga. |
| CONV-006 | ... concluir a conversão de um vídeo de 60 s em 1080p em ≤ 2 min. | O sistema deve concluir a conversão para MP4 de um vídeo de 60 s em 1080p em ≤ 2 min (medição como acima); o alvo da conversão para WebM fica por fixar até ser medido no protótipo. | Exequibilidade: a codificação VP9 é bem mais lenta do que H.264 (UC-VID-003/A4) e um alvo único de 2 min com 1 vCPU pode ser impossível para WebM. |

#### 5.5.1 Aplicação das regras de qualidade

| **Regra** | **Requisitos revistos** | **Decisão** |
|---|---|---|
| Clareza | COM-002, COM-003, COM-004, COM-006, COM-044, COM-052 | Termos com mais de uma leitura ("formato", "integridade", "MB", "superior a 1920 × 1080", "versões atuais", "compreensível") substituídos por definições com unidades. |
| Testabilidade | COM-015, COM-028, COM-036, COM-046, FLT-005, SUBMIT-004, TRIM-011, CONV-006, FLT-008, DET-009 | Cada valor passa a ter condição de medição: o que se mede, onde começa e acaba, e em que ambiente. |
| Atomicidade | COM-022, COM-033, COM-036, COM-041, COM-046, COM-050 | Requisitos com mais de uma ideia divididos, com IDs novos para a parte separada (COM-053 a COM-056, SUBMIT-011); COM-022 deixa de repetir a reserva, que já está em COM-021. |
| Exequibilidade | COM-046, CONV-006 | Retirada a exigência de resultados iguais nas ferramentas de IA, que não são deterministas; o alvo do WebM fica por fixar até haver medição. Os alvos de COM-036 e SUBMIT-011 foram confirmados por medição (Cap. 10). |
| Consistência | COM-021, COM-022, COM-054, COM-001, SUBMIT-001, SUBMIT-002, SUBMIT-003, COM-035 | Confrontados com a solução de base; conflitos e decisões na tabela seguinte. |
| Necessidade | SUBMIT-002; COM-044 | SUBMIT-002 só tem origem no *brainstorming* da equipa: mantém-se como atalho de usabilidade, mas passa de *Should* a *Could* até ser confirmado com utilizadores (Cap. 2.3). Em COM-044 não se fixou o sistema operativo, por falta de origem. Os valores sem origem identificável estão listados nas lacunas do Cap. 2.3. |

#### 5.5.2 Conflitos com o sistema existente

Os requisitos refinados foram confrontados com a tabela de impacto (Cap. 6) e com o comportamento real da baseline. Os conflitos encontrados e a decisão tomada:

| **Elemento** | **Regra da baseline** | **Decisão para vídeo** | **Requisitos** |
|---|---|---|---|
| Contagem de operações | 1 operação por ferramenta avançada e por imagem; as básicas não contam. | 1 operação por tarefa de vídeo, qualquer que seja a ferramenta, no mesmo contador diário; as regras de imagem não mudam. | COM-021 |
| Devolução de operações | Só no cancelamento e sempre no dia atual; uma falha do *worker* não devolve. | Devolução em `failed` e `cancelled`, no dia da reserva, de forma atómica; a regra de imagem mantém-se. | COM-022, COM-051 |
| Validade dos URLs | 60 min para imagens. | 15 min para vídeos; as imagens mantêm 60 min. | COM-054 |
| Perfil Anónimo | Faz operações básicas sobre imagens. | Sem acesso ao vídeo; mantém as operações sobre imagens. | COM-001 |
| Tamanho dos pedidos | Nginx com o limite por omissão (1 MB); ficheiros recebidos em memória. | Rota de vídeo até 510 MB, com envio em *streaming*. | SUBMIT-001, SUBMIT-003 |
| Criação de projeto | Exige pelo menos uma imagem (só no frontend). | Pode ser criado a partir de um vídeo. | SUBMIT-002 |
| Eliminação de conta | Na prática não apagava os projetos (o serviço de utilizadores chamava um endereço errado do serviço de projetos). | Corrigido nesta fase (Cap. 11); a eliminação apaga projetos, vídeos e tarefas. | COM-035 |
