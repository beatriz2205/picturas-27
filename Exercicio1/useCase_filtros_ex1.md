# 📝 Exercício 1 — Template de Entrega
### Casos de Uso · Fase 1

---

## 0. Identificação

| **Campo** | **Valor** |
|-----------|-----------|
| **Grupo / Equipa** | |
| **Autores** | |
| **Data** | 2026-10-15 |
| **Versão do documento** | v2.0 (Exercício 2: ver histórico na secção 4.4.3 do ficheiro `filtrosVideo_ex2.md`) |
| **Unidade Curricular** | Requisitos e Arquiteturas de Software — MEI, Universidade do Minho |

---

## 1. Funcionalidade de vídeo escolhida

| **Campo** | **Valor** |
|-----------|-----------|
| **Funcionalidade** | Aplicar filtros visuais e ajustes de cor a um vídeo |
| **Perfil(s) de utilizador abrangido(s)** | Utilizador registado e utilizador premium. Ambos podem aplicar estilos predefinidos (ex: Preto e Branco, Sépia) e ajustar parâmetros de cor (brilho, contraste, saturação). O perfil premium beneficia de limites superiores de duração, resolução e tamanho de ficheiro. |

**Justificação no contexto do MVP** *(2–3 linhas)*

Esta funcionalidade permite alterar a estética visual de um vídeo sem modificar o ficheiro original. É relevante para o MVP porque valida a leitura, a decomposição em fotogramas compatíveis com as ferramentas de imagem existentes, a aplicação de transformações parametrizadas, a recombinação sequencial com áudio, o processamento assíncrono e a publicação de um novo recurso na biblioteca.

---

## 2. Caso de Uso

### 2.1 Cabeçalho

| **Secção** | **Detalhes** |
|------------|--------------|
| **ID do Caso de Uso** | UC-VID-003 |
| **Nome** | Aplicar filtros visuais e ajustes de cor a um vídeo |
| **Versão** | v2.0 |
| **Autor** | A preencher pela equipa |
| **Data** | 2026-10-15 |
| **Objetivo** | Permitir ao utilizador selecionar um vídeo da biblioteca, aplicar um estilo visual predefinido (ex: Preto e Branco, Sépia) ou ajustar parâmetros de cor (brilho, contraste, saturação), obtendo o resultado como um novo ficheiro na sua biblioteca. |
| **Âmbito** | Módulo de vídeo do PictuRAS: biblioteca, edição visual, processamento assíncrono, armazenamento de objetos e notificações de progresso. |
| **Ator Principal** | Utilizador autenticado — perfil registado ou premium. |
| **Stakeholders e Interesses** | - **Utilizador**: quer personalizar o aspeto visual do seu vídeo sem perder o ficheiro original.<br>- **Proprietário do Sistema**: quer disponibilizar edição visual de vídeo controlada pelos limites de cada plano contratado.<br>- **Equipa de Operações**: quer que tarefas de processamento demoradas sejam acompanháveis e não bloqueiem o pedido de outros utilizadores.<br>- **Equipa de Desenvolvimento**: quer reutilizar a infraestrutura existente de projetos, as ferramentas existentes de processamento de imagem, o armazenamento de objetos e as notificações em tempo real. |
| **Pré-condições** | - O utilizador tem sessão iniciada.<br>- O vídeo pertence ao utilizador e está disponível na biblioteca.<br>- O vídeo terminou o carregamento inicial e não está a ser processado por outra operação.<br>- Existe espaço de armazenamento e quota de operações disponível para o perfil. |
| **Trigger** | O utilizador seleciona um vídeo, escolhe a opção de aplicar filtros ou ajustes de cor e confirma a operação. |

### 2.2 Fluxo Principal

| **Passo** | **Ação do Ator** | **Resposta do Sistema** |
|-----------|------------------|-------------------------|
| 1 | O utilizador abre a biblioteca e seleciona um vídeo | Apresenta os metadados do vídeo (título, duração, resolução, tamanho e formato), uma pré-visualização no leitor e o painel de ajustes visuais (filtros predefinidos e controlos de brilho, contraste e saturação) |
| 2 | O utilizador escolhe um estilo predefinido (ex: Preto e Branco) ou ajusta os marcadores manuais de cor | Valida que os valores inseridos estão dentro dos intervalos permitidos e atualiza dinamicamente a pré-visualização do vídeo |
| 3 | O utilizador confirma a aplicação dos filtros | Valida a compatibilidade técnica do vídeo (formato, codecs, tamanho e duração face ao perfil), verifica a quota diária e o espaço disponível no armazenamento de objetos da conta, reserva uma unidade da quota e cria a tarefa de processamento assíncrono |
| 4 | — | Coloca a tarefa na fila de processamento (*message broker*), associa-lhe um identificador único (UUID) e apresenta o estado **Em espera** |
| 5 | — | Um *worker* disponível recolhe a tarefa, extrai a faixa de áudio e decompõe o vídeo numa sequência numerada de fotogramas; aplica os filtros de imagem a cada fotograma mantendo a ordem estrita; recombina os fotogramas processados na sua ordem temporal original com a faixa de áudio original sincronizada; e emite periodicamente o progresso |
| 6 | O utilizador acompanha o estado na página do projeto (ou pode navegar para fora mantendo o processamento em segundo plano) | Apresenta a percentagem de progresso, o estado atual e a opção de cancelar a operação enquanto o processamento estiver em execução |
| 7 | — | Concluída a codificação, o sistema valida a integridade do ficheiro resultante, elimina artefactos temporários de fotogramas, regista o resultado como um novo recurso no armazenamento de objetos e na biblioteca, preserva o original intacto e confirma a dedução definitiva da quota reservada |
| 8 | O utilizador acede ao resultado na biblioteca | Apresenta o novo vídeo filtrado na biblioteca com os respetivos metadados e opções para o reproduzir no leitor, descarregar (*download*) ou reutilizar |

### 2.3 Fluxos Alternativos

| **Fluxo** | **Descrição** |
|-----------|---------------|
| **FA1 – Seleção de filtro predefinido (Preset)** | O utilizador seleciona um estilo pronto (ex: *Vintage* ou *Preto e Branco*) $\rightarrow$ o sistema preenche e aplica automaticamente os parâmetros de cor correspondentes na interface e na pré-visualização. |
| **FA2 – Ajuste manual de cor** | O utilizador altera diretamente os marcadores de brilho, contraste ou saturação $\rightarrow$ o sistema atualiza a pré-visualização e mostra o resumo dos valores selecionados. |
| **FA3 – Reposição dos valores originais** | O utilizador escolhe *Repor* $\rightarrow$ o sistema restaura todos os marcadores para o estado neutro e limpa os efeitos da pré-visualização. |
| **FA4 – Tarefa cancelada pelo utilizador** | O utilizador escolhe *Cancelar* antes da conclusão $\rightarrow$ o sistema interrompe a execução do *worker*, elimina todos os fotogramas e ficheiros temporários em disco, estorna a quota reservada e não publica qualquer resultado incompleto. |
| **FA5 – Utilizador navega para fora da página ou fecha a sessão** | O utilizador sai da página do projeto ou encerra o navegador durante o processamento $\rightarrow$ o processamento assíncrono continua em segundo plano no servidor; ao regressar, o utilizador encontra a tarefa concluída e o novo vídeo publicado na sua biblioteca. |

### 2.4 Exceções

| **Condição** | **Comportamento do Sistema** |
|--------------|------------------------------|
| **Os valores de filtro inseridos excedem os limites permitidos** | O sistema sinaliza visualmente os campos inválidos, impede a submissão e indica os limites suportados. |
| **O vídeo de origem está corrompido, tem formato inválido ou codec de vídeo não suportado** | Rejeita o pedido de imediato, apresenta mensagem de erro explícita e não cria tarefa nem debita quota. |
| **A duração, o tamanho ou a resolução do vídeo excedem o limite do perfil do utilizador** | Impede a submissão, informa os limites do plano atual (60 s / 100 MB / 1080p registado; 10 min / 1 GB / 4K premium) e sugere atualização de plano. |
| **A quota diária ou o espaço de armazenamento do utilizador são insuficientes** | Bloqueia a submissão no Passo 3, informa que a quota ou espaço de armazenamento foram atingidos e não cria tarefa. |
| **O utilizador atinge o número máximo de tarefas ativas em simultâneo** | Impede a criação da tarefa e informa o utilizador que deve aguardar a conclusão de uma tarefa em execução. |
| **O processamento falha a meio por erro de codificação ou excede o tempo limite (timeout)** | Em caso de falha transitória (A16), repete automaticamente a tarefa até 2 vezes. Esgotadas as tentativas, num erro de codificação ou quando é excedido o tempo limite (15 × a duração do vídeo), marca a tarefa como **Falhada**, regista a causa do erro, elimina imediatamente todos os fotogramas e artefactos temporários, estorna a quota reservada e mantém o vídeo original intacto. |
| **O ficheiro final gerado falha na validação de integridade pós-codificação** | Não publica o resultado na biblioteca, marca a tarefa como falhada, limpa os temporários, estorna a quota e notifica o utilizador da falha de codificação. |

### 2.5 Pós-condições

| **Tipo** | **Resultado** |
|----------|---------------|
| **Garantia de Sucesso** | Existe um novo vídeo completo, válido e reproduzível na biblioteca e no armazenamento de objetos com os filtros visuais aplicados e áudio sincronizado; o vídeo original permanece rigorosamente inalterado; a tarefa fica marcada como concluída e a quota diária é debitada em 1 unidade. |
| **Garantia Mínima** | O vídeo original permanece disponível e inalterado na biblioteca; nenhum ficheiro parcial ou corrompido é visível; todos os fotogramas e artefactos temporários são eliminados do disco; a tarefa fica com estado explícito de falha ou cancelamento; e a unidade de quota reservada é estornada ao utilizador. |

### 2.6 Regras de Negócio e Restrições

| **ID** | **Regra** |
|--------|-----------|
| **RN1** | Os valores de brilho, contraste e saturação são indicados numa escala de -100 a +100, em que 0 corresponde ao valor original (ver A18). |
| **RN2** | A duração máxima do vídeo processado é de 60 segundos para utilizadores com perfil registado e de até 10 minutos para utilizadores com perfil premium. |
| **RN3** | O tamanho máximo do ficheiro de vídeo de entrada é de 100 MB para o perfil registado e de 1 GB para o perfil premium. |
| **RN4** | A operação de aplicação de filtros gera sempre um novo recurso independente no armazenamento e na biblioteca; o vídeo original nunca é substituído, truncado ou modificado. |
| **RN5** | O formato de exportação gerado pelo sistema é obrigatoriamente contentor MP4 com codecs de vídeo H.264 e de áudio AAC. |
| **RN6** | Para o perfil registado, cada tarefa de filtragem de vídeo reserva 1 unidade da quota diária de operações (partilhada com as ferramentas avançadas) no momento da submissão; a dedução só é consolidada após o sucesso; cancelamentos ou falhas estornam integralmente a unidade. O perfil premium não tem limite diário de operações. |
| **RN7** | O novo vídeo só é publicado e disponibilizado para reprodução e descarregamento após aprovação na validação de integridade pós-processamento. |
| **RN8** | Cada utilizador só pode ter, no máximo, 1 tarefa de processamento de vídeo ativa em simultâneo (perfil registado) ou 3 tarefas em simultâneo (perfil premium). |
| **RN9** | A resolução máxima do vídeo processado é de 1920 × 1080 px para o perfil registado e de 3840 × 2160 px para o perfil premium. |

### 2.7 Assunções

| **ID** | **Assunção** |
|--------|--------------|
| **A1** | O sistema consegue decompor o vídeo em fotogramas e aplicar transformações visuais reutilizando as ferramentas existentes de imagem do PictuRAS. |
| **A2** | A preservação do identificador sequencial de cada fotograma garante a reconstrução temporal exata do fluxo de vídeo e a sincronização com o áudio. |
| **A3** | O armazenamento de objetos (*Object Storage*) suporta o aumento de volume gerado pela persistência dos novos vídeos criados. |
| **A4** | A interface do utilizador consegue apresentar uma pré-visualização aproximada dos efeitos em tempo real recorrendo a filtros no cliente. |
| **A5** | A combinação da filtragem de vídeo com outras ferramentas (rotação, recorte, IA) e o processamento em lote (*batch*) de múltiplos vídeos estão fora do âmbito do MVP da Fase 1. O encadeamento interno de `brightness`, `contrast` e `saturation` é reutilizado. *(revista na v2.0)* |
| **A6** | Os limites de 60 s / 100 MB (registado) e 10 min / 1 GB (premium) assumem vídeos até 1080p em H.264 a cerca de 8 Mbit/s (≈ 60 MB por minuto), com margem para débitos mais altos. No premium, um vídeo 4K atinge o limite de 1 GB antes dos 10 min; aplica-se o limite que for atingido primeiro. |
| **A7** | Os alvos de desempenho são medidos num ambiente de referência: execução local via `docker-compose`, *worker* com 1 vCPU e 2 GB de RAM, e vídeo de teste 1080p a 30 fps em H.264. |
| **A8** | O tempo de confirmação da submissão (≤ 2 s) não inclui o carregamento do vídeo, que já está na biblioteca (pré-condição do UC). |
| **A9** | O limite de 50 ms de dessincronização áudio/vídeo fica abaixo do limiar de deteção indicado na Recomendação ITU-R BT.1359 (≈ 45 ms com o áudio adiantado, ≈ 125 ms com o áudio atrasado), arredondado. |
| **A10** | O ambiente MVP dispõe de 5 réplicas de *worker* de vídeo, o que sustenta 5 tarefas em simultâneo com espera em fila ≤ 30 s. |
| **A11** | Uma validade de 15 min é suficiente para iniciar a reprodução ou o *download*; quando expira, o cliente pede um novo URL. |
| **A12** | O canal WebSocket existente (`wsGateway`, evento `process-update`) consegue transportar atualizações de progresso de vídeo com a cadência exigida. |
| **A13** | Cada tarefa de filtragem de vídeo conta como **1 operação** para o perfil registado, no mesmo limite diário já usado pelas ferramentas avançadas (`FREE_DAILY_OP` = 5), independentemente do número de fotogramas e de ajustes. O perfil premium mantém-se sem limite diário, como no sistema atual. |
| **A14** | Limite de espaço de armazenamento por conta: **2 GB** (registado) e **50 GB** (premium). São valores provisórios, pois o PictuRAS atual não tem este limite. O tamanho do vídeo de origem serve de estimativa do tamanho do resultado. |
| **A15** | Codecs de áudio aceites na entrada: AAC, MP3, Opus e AC-3. Vídeos sem faixa de áudio são aceites e produzem um MP4 sem áudio. |
| **A16** | "Falha transitória" é a terminação abrupta do *worker*, a perda de ligação ao *broker* ou ao armazenamento, ou o *timeout*. Erros determinísticos de codificação não são repetidos. |
| **A17** | Estimativa do débito do MVP: a filtragem reutiliza as ferramentas de imagem existentes, que trocam cada fotograma via RabbitMQ e armazenamento de objetos. Estima-se ≈ 0,3 s de CPU por fotograma 1080p para os 3 ajustes, ou seja ≈ 10 min para os 1800 fotogramas de um vídeo de 60 s a 30 fps. O valor tem de ser confirmado por medição no protótipo. |
| **A18** | A escala [-100, +100] da RN1 (0 = neutro) é a apresentada ao utilizador. É convertida no fator multiplicativo das ferramentas existentes `brightness`, `contrast` e `saturation` (intervalo [0, 2], 1 = neutro) pela fórmula fator = 1 + valor / 100. |

### 2.8 Questões em Aberto

| **ID** | **Questão** | **Estado (v2.0)** |
|--------|-------------|-------------------|
| **Q1** | A pré-visualização dos filtros na interface deve ser gerada localmente no navegador ou através de um fotograma processado pelo servidor? | Em aberto (A4 assume no cliente) |
| **Q2** | O utilizador deve poder guardar combinações de ajustes manuais como estilos personalizados? | Em aberto — o PictuRAS já tem *presets* de utilizador para imagem, que podem ser reutilizados |
| **Q3** | Devem ser disponibilizados outros formatos de saída além de MP4/H.264 no MVP? | Fechada: só MP4/H.264/AAC no MVP (RN5) |
| **Q4** | Os ficheiros de vídeo na biblioteca do utilizador devem ter prazo de expiração automático ou persistência indefinida sujeita ao limite de espaço da conta? | Fechada: persistência indefinida, sujeita ao limite de espaço da conta (A14) |

---

## 3. Utilização de agentes de IA

| **Ferramenta / *skill*** | **Tarefa apoiada** | **Validação realizada pela equipa** |
|--------------------------|----------------------|--------------------------------------|
| Copilot SDK em VS Code | Apoio no detalhamento dos passos assíncronos do fluxo principal, decomposição de fotogramas e garantia de ordenação sequencial, mapeamento de exceções e regras de negócio de vídeo. | A equipa reviu todos os passos para garantir aderência ao modelo brownfield do PictuRAS, manteve limites realistas para perfis registado/premium e validou o reaproveitamento das ferramentas de imagem existentes. |
| Claude Code (Anthropic) | Exercício 2: revisão da ERS face ao enunciado e ao código do PictuRAS (perfis, quota de operações, armazenamento, ferramentas de imagem); deteção de inconsistências na coluna Evolução, entre a cópia direta de áudio e a RN5, e entre a quota assumida e a implementada; proposta de requisitos de completude (estados, limpeza de temporários, tempo limite, resolução) e das assunções A6–A18. | A equipa decidiu manter o limite de espaço por conta (REQ-VID-FLT-042) e *[a completar pela equipa: o que foi revisto, alterado ou rejeitado nas propostas]*. |

---

## ✅ Lista de verificação antes de entregar (Exercício 1)

- [x] Secções 0 a 3 preenchidas e texto de ajuda removido.
- [x] Funcionalidade de vídeo escolhida e justificada no contexto do MVP.
- [x] Ator principal identificado, com o respetivo perfil.
- [x] Caso de uso com fluxo principal, fluxos alternativos e exceções específicas de vídeo.
- [x] Pós-condições com garantia de sucesso e garantia mínima.
- [x] Regras de negócio e restrições preenchidas.
- [x] Assunções e questões em aberto registadas.
- [x] Utilização de agentes de IA documentada.

---
---

## 4. Esboço de requisitos derivados

> **Nota (v2.0):** esta secção é a baseline do Exercício 1 (v1.3) e mantém-se inalterada. A versão atual dos requisitos é a ERS do Exercício 2, no ficheiro `filtrosVideo_ex2.md`.

### 4.1 Requisitos de Sistema

| **ID** | **Requisito** | **Tipo** | **Prioridade** | **Novo/Alt** | **Origem** | **Como verificar** |
|--------|---------------|----------|----------------|--------------|------------|--------------------|
| **REQ-VID-FLT-001** | O sistema deve apresentar os metadados (título, duração, resolução, tamanho e formato) do vídeo selecionado na página do projeto. | F | Deve ter | Alt | Passo 1 | Dado um vídeo existente na biblioteca, quando o utilizador o seleciona na página do projeto, então os metadados de título, duração, resolução, tamanho e formato são exibidos na interface. |
| **REQ-VID-FLT-002** | O sistema deve apresentar uma pré-visualização do vídeo selecionado no leitor da página do projeto. | F | Deve ter | Alt | Passo 1 | Dado um vídeo válido selecionado, quando a página do projeto é carregada, então o leitor de vídeo exibe o primeiro fotograma e permite reprodução prévia. |
| **REQ-VID-FLT-003** | O sistema deve apresentar no painel de edição as opções de filtros predefinidos (*presets*) e os marcadores de cor (brilho, contraste e saturação). | F | Deve ter | Alt | Passo 1 | Dado um vídeo aberto no projeto, quando o utilizador acede ao painel de ajustes, então são exibidos os seletores de estilos predefinidos e os controlos deslizantes de cor. |
| **REQ-VID-FLT-004** | O sistema deve validar se os valores dos marcadores de brilho, contraste e saturação respeitam os intervalos permitidos pelo sistema. | F | Deve ter | Alt | Passo 2, RN1 | Dado um ajuste manual de parâmetros, quando o utilizador introduz um valor fora dos limites permitidos, então o sistema sinaliza o campo inválido e impede a submissão. |
| **REQ-VID-FLT-005** | O sistema deve preencher automaticamente os parâmetros de brilho, contraste e saturação ao selecionar um estilo predefinido (*preset*). | F | Deve ter | Alt | FA1 | Dado o painel de filtros aberto, quando o utilizador seleciona um preset predefinido, então os marcadores de brilho, contraste e saturação assumem de imediato os valores correspondentes. |
| **REQ-VID-FLT-006** | O sistema deve restaurar todos os marcadores de cor para o estado neutro de origem através da opção "Repor". | F | Deveria ter | Alt | FA3 | Dado que os marcadores de cor foram modificados, quando o utilizador clica em "Repor", então todos os valores regressam ao ponto neutro original e a pré-visualização é limpa. |
| **REQ-VID-FLT-007** | O sistema deve validar que o vídeo de origem possui formato e codec de vídeo suportados antes de submeter a tarefa. | F | Deve ter | Novo | Passo 3, Exceção 2 | Dado um ficheiro de origem com codec ou formato não suportado, quando o utilizador tenta submeter a operação, então o sistema rejeita o pedido com mensagem de erro explícita antes de criar a tarefa. |
| **REQ-VID-FLT-008** | O sistema deve impedir a aplicação de filtros em vídeos com duração superior a 60 segundos ou tamanho superior a 100 MB para o perfil registado. | F | Deve ter | Novo | Passo 3, RN2, RN3, Exceção 3 | Dado um utilizador registado com um vídeo com mais de 60 s ou mais de 100 MB, quando tenta submeter a operação, então a submissão é bloqueada com mensagem informativa do limite aplicável. |
| **REQ-VID-FLT-009** | O sistema deve permitir a aplicação de filtros em vídeos com duração até 10 minutos e tamanho até 1 GB para utilizadores com perfil premium. | F | Deve ter | Novo | Passo 3, RN2, RN3 | Dado um utilizador premium com vídeo de até 10 minutos e até 1 GB, quando confirma a aplicação de filtros, então o pedido é validado e aceite para processamento. |
| **REQ-VID-FLT-010** | O sistema deve verificar o limite de tarefas de vídeo ativas em simultâneo por perfil antes de criar uma nova tarefa. | F | Deve ter | Novo | Passo 3, RN8, Exceção 5 | Dado um utilizador registado com 1 tarefa de vídeo já em execução, quando tenta submeter outra, então o sistema bloqueia a submissão informando que deve aguardar a conclusão da tarefa ativa. |
| **REQ-VID-FLT-011** | O sistema deve verificar a disponibilidade de espaço no armazenamento de objetos e reservar uma unidade da quota diária no momento da submissão da tarefa. | F | Deve ter | Alt | Passo 3, RN6, Exceção 4 | Dado um utilizador com quota diária e armazenamento disponíveis, quando confirma a submissão, então o sistema reserva 1 unidade de quota e prossegue para a criação da tarefa. |
| **REQ-VID-FLT-012** | O sistema deve associar um identificador único (UUID) à tarefa de processamento criada e colocá-la na fila de trabalho. | F | Deve ter | Alt | Passo 4 | Dado um pedido de filtro confirmado e válido, quando o sistema cria a tarefa, então atribui-lhe um UUID único e envia a mensagem para a fila do *broker*. |
| **REQ-VID-FLT-013** | O sistema deve apresentar, na página do projeto, o estado "Em espera" enquanto a tarefa aguarda recolha por um *worker*. | F | Deveria ter | Alt | Passo 4 | Dado que uma tarefa foi colocada na fila de processamento, quando o utilizador consulta a página do projeto, então é exibido o estado "Em espera". |
| **REQ-VID-FLT-014** | O sistema deve extrair o fluxo de áudio e decompor o fluxo de vídeo numa sequência ordenada de fotogramas individuais compatíveis com o formato das ferramentas de imagem. | F | Deve ter | Novo | Passo 5, A1 | Dado um vídeo de entrada a ser processado pelo worker, quando se inicia a fase de extração, então o áudio é preservado num ficheiro isolado e o vídeo é decomposto em fotogramas individuais indexados. |
| **REQ-VID-FLT-015** | O sistema deve aplicar as transformações visuais solicitadas (estilo predefinido ou ajustes de cor) a cada fotograma individual, reutilizando as ferramentas de processamento de imagem existentes. | F | Deve ter | Alt | Passo 5, A1 | Dado o conjunto de fotogramas extraídos e os parâmetros configurados, quando o worker processa a imagem, então as transformações de brilho, contraste e saturação são aplicadas a cada fotograma. |
| **REQ-VID-FLT-016** | O sistema deve preservar o identificador sequencial e o índice temporal de cada fotograma durante a aplicação dos filtros visuais. | F | Deve ter | Novo | Passo 5, A2 | Dado um conjunto de fotogramas em processamento, quando a transformação visual de cada fotograma termina, então o seu número sequencial e carimbo de tempo permanecem rigorosamente mantidos. |
| **REQ-VID-FLT-017** | O sistema deve reconstruir o fluxo de vídeo recombinando os fotogramas processados na sua ordem sequencial original, preservando a resolução espacial e a cadência de fotogramas (*framerate*) de origem. | F | Deve ter | Novo | Passo 5, A2 | Dado o conjunto de fotogramas filtrados, quando se executa a recombinação, então o vídeo resultante mantém rigorosamente a cadência temporal e a resolução original sem inversão de fotogramas. |
| **REQ-VID-FLT-018** | O sistema deve multiplexar o fluxo de vídeo reconstruído com o fluxo de áudio original sem recodificação desnecessária da faixa sonora (*stream copy*). | F | Deve ter | Novo | Passo 5, A1 | Dado o vídeo reconstruído e a faixa de áudio extraída, quando o contentor de saída é gerado, então o áudio original é copiado diretamente sem perda de qualidade e sincronizado com a imagem. |
| **REQ-VID-FLT-019** | O sistema deve apresentar a percentagem de progresso do processamento na página do projeto, atualizada periodicamente conforme o avanço dos fotogramas. | F | Deve ter | Alt | Passo 5, Passo 6 | Dado um vídeo em execução no worker, quando um bloco de fotogramas é processado, então a percentagem apresentada na interface é atualizada em conformidade. |
| **REQ-VID-FLT-020** | O sistema deve manter o processamento da tarefa assíncrona em execução no servidor caso o utilizador navegue para fora da página ou encerre a sessão. | F | Deve ter | Alt | Passo 6, FA5 | Dado um processamento em curso, quando o utilizador fecha o navegador e volta mais tarde, então verifica que o processamento continuou e o novo recurso foi publicado. |
| **REQ-VID-FLT-021** | O sistema deve disponibilizar a opção de cancelamento da tarefa na página do projeto durante a execução do processamento. | F | Deveria ter | Alt | Passo 6, FA4 | Dado que a tarefa se encontra em processamento ativo, quando o utilizador visualiza a página do projeto, então o botão "Cancelar" está disponível e acionável. |
| **REQ-VID-FLT-022** | O sistema deve interromper imediatamente a execução do *worker* e eliminar todos os fotogramas e ficheiros temporários em disco caso a tarefa seja cancelada. | F | Deveria ter | Alt | Passo 6, FA4 | Dado um processamento em curso, quando o utilizador confirma o cancelamento, então a execução do worker termina de imediato e todos os fotogramas temporários são purgados do disco. |
| **REQ-VID-FLT-023** | O sistema deve estornar a unidade de quota diária previamente reservada caso a tarefa seja cancelada pelo utilizador ou termine em falha. | F | Deve ter | Alt | RN6, FA4, Exceção 6, Garantia Mínima | Dado que uma unidade de quota foi reservada na submissão, quando a tarefa falha ou é cancelada, então o sistema estorna imediatamente 1 unidade ao saldo do utilizador. |
| **REQ-VID-FLT-024** | O sistema deve validar a integridade técnica e reprodutibilidade do ficheiro de vídeo gerado antes de o registar na biblioteca e no armazenamento de objetos. | F | Deve ter | Novo | Passo 7, RN7, Exceção 7 | Dado o término da codificação pelo worker, quando o ficheiro final é gerado, o sistema valida que o contentor e as faixas não estão corrompidos antes de criar o recurso. |
| **REQ-VID-FLT-025** | O sistema deve registar e guardar o vídeo gerado como um novo recurso independente no armazenamento de objetos e na biblioteca do utilizador. | F | Deve ter | Alt | Passo 7, RN4, Garantia de Sucesso | Dado um processamento concluído com sucesso e validado, quando o resultado é guardado, então é criado um novo recurso independente sem sobrescrever outros ficheiros. |
| **REQ-VID-FLT-026** | O sistema deve confirmar a dedução definitiva da unidade de quota diária previamente reservada após a publicação do novo vídeo com sucesso. | F | Deve ter | Alt | Passo 7, RN6, Garantia de Sucesso | Dado um processamento concluído com êxito, quando o novo vídeo é disponibilizado na biblioteca, então a unidade de quota reservada é consolidada como consumida. |
| **REQ-VID-FLT-027** | O sistema deve atribuir o estado explícito de falha à tarefa e apresentar mensagem explicativa com a causa do erro caso ocorra uma falha técnica. | F | Deve ter | Alt | Exceção 6, Exceção 7, Garantia Mínima | Dado um erro durante o processamento ou validação, quando o worker deteta a falha, então a tarefa é registada com o estado de falha e a causa é apresentada ao utilizador. |
| **REQ-VID-FLT-028** | O sistema deve apresentar o novo vídeo filtrado na biblioteca, permitindo a sua reprodução no leitor integrado, consulta de metadados e opção de descarregar (*download*). | F | Deve ter | Alt | Passo 8, RN7, Garantia de Sucesso | Dado o novo vídeo publicado na biblioteca, quando o utilizador acede ao recurso, então pode consultar os seus metadados, reproduzi-lo no leitor e descarregar o ficheiro. |
| **REQ-VID-FLT-029** | O sistema deve manter o ficheiro de vídeo original intacto e inalterado no armazenamento e na biblioteca após qualquer operação. | NF (Fiabilidade) | Deve ter | Alt | Passo 7, RN4, Pós-condição, Garantia Mínima | Dado um ficheiro de vídeo original com hash SHA-256 conhecido, quando uma tarefa de filtro é concluída, cancelada ou falha, então o hash SHA-256 do ficheiro original permanece inalterado. |
| **REQ-VID-FLT-030** | O sistema deve exportar o novo vídeo gerado no formato contentor MP4 com codecs de vídeo H.264 e de áudio AAC. | NF (Compatibilidade) | Deve ter | Novo | RN5 | Dado um vídeo gerado com sucesso, quando o ficheiro é analisado tecnicamente, então o formato contentor é MP4 com codificação de vídeo H.264 e codificação de áudio AAC. |
| **REQ-VID-FLT-031** | O sistema deve preservar a sincronização temporal entre a faixa de áudio e a faixa de vídeo sem introduzir atraso superior a 50 ms. | NF (Fiabilidade) | Deve ter | Novo | Passo 5, A1, A2 | Dado um vídeo de entrada com áudio sincronizado, quando o vídeo resultante é processado e reproduzido, então a discrepância temporal entre áudio e vídeo não ultrapassa 50 ms. |
| **REQ-VID-FLT-032** | O sistema deve confirmar a criação da tarefa e registá-la na fila em tempo inferior ou igual a 2 segundos após a confirmação da submissão. | NF (Desempenho) | Deve ter | Alt | Passo 3, Passo 4 | Dado o clique no botão de confirmação com dados válidos, quando a requisição é submetida, então a resposta com o identificador da tarefa na fila é devolvida em $\le 2\text{ s}$. |

### 4.2 Impacto no sistema existente

| **Elemento existente afetado** | **Impacto (Manter / Estender / Alterar)** | **Descrição do impacto** | **Requisitos relacionados** |
|--------------------------------|-------------------------------------------|--------------------------|--------------------------------|
| **Gestão de Perfis e Limites de Operação** | **Alterar** | O sistema passa a aplicar regras de duração e tamanho máximos diferenciadas por perfil para operações de vídeo (60 s / 100 MB para perfil registado e 10 min / 1 GB para perfil premium), além do controlo de concorrência de tarefas simultâneas (1 para registado, 3 para premium). | REQ-VID-FLT-008, REQ-VID-FLT-009, REQ-VID-FLT-010 |
| **Sistema de Quota Diária** | **Estender** | O mecanismo de reserva imediata na submissão e estorno (*refund*) em caso de falha ou cancelamento é estendido ao processamento de vídeo, contabilizando 1 unidade de quota por vídeo processado com sucesso. | REQ-VID-FLT-011, REQ-VID-FLT-023, REQ-VID-FLT-026 |
| **Motor de Fila e Processamento Assíncrono (*Worker*)** | **Estender** | A infraestrutura assíncrona baseada em RabbitMQ é expandida para orquestrar pipelines de vídeo pesados, gerando identificador UUID único, emitindo progresso periódico por fotograma, permitindo execução em segundo plano mesmo sem sessão ativa e suportando cancelamento em tempo real com limpeza de fotogramas temporários. | REQ-VID-FLT-012, REQ-VID-FLT-013, REQ-VID-FLT-019, REQ-VID-FLT-020, REQ-VID-FLT-021, REQ-VID-FLT-022, REQ-VID-FLT-027, REQ-VID-FLT-032 |
| **Biblioteca de Recursos e Interface do Projeto** | **Estender** | A interface gráfica e os serviços de catálogo passam a suportar recursos de vídeo, incorporando metadados completos (duração, resolução, tamanho, formato), pré-visualização no leitor, controlos de parâmetros visuais (*presets* e *sliders*), barra de progresso e ações de reposição, reprodução e descarregamento (*download*). | REQ-VID-FLT-001, REQ-VID-FLT-002, REQ-VID-FLT-003, REQ-VID-FLT-005, REQ-VID-FLT-006, REQ-VID-FLT-028 |
| **Módulo de Ferramentas e Filtros de Imagem** | **Estender** | As ferramentas existentes de manipulação de imagem (`brightness`, `contrast`, `saturation`) são reutilizadas para processar sequências individuais de fotogramas extraídos, garantindo a preservação estrita do índice sequencial, resolução e framerate, culminando na recombinação ordenada com a faixa de áudio original. | REQ-VID-FLT-004, REQ-VID-FLT-014, REQ-VID-FLT-015, REQ-VID-FLT-016, REQ-VID-FLT-017, REQ-VID-FLT-018, REQ-VID-FLT-030, REQ-VID-FLT-031 |
| **Armazenamento de Objetos (*Object Storage Service*)** | **Estender** | O serviço de armazenamento de ficheiros (`imageStorageService`) passa a armazenar binários pesados de vídeo (MP4) e a calcular hashes SHA-256 de integridade, mantendo a regra de imutabilidade do original e alojando o novo ficheiro gerado dentro do espaço de armazenamento do utilizador. | REQ-VID-FLT-011, REQ-VID-FLT-025, REQ-VID-FLT-029 |
| **Gestão de Artefactos Temporários e Validação Técnica** | **Estender** | Incorporação de rotinas de validação prévia de codecs e integridade de entrada, validação técnica pós-codificação antes da publicação e purga automática de sequências temporárias de fotogramas em caso de cancelamento ou falha. | REQ-VID-FLT-007, REQ-VID-FLT-022, REQ-VID-FLT-024, REQ-VID-FLT-027 |

### 4.3 Matriz de Rastreabilidade

| **Elemento do Caso de Uso** | **Descrição abreviada** | **Requisito(s) de Sistema** |
|------------------------------|-------------------------|------------------------------|
| **Passo 1** | Seleção de vídeo e apresentação de metadados, leitor e controlos visuais | REQ-VID-FLT-001, REQ-VID-FLT-002, REQ-VID-FLT-003 |
| **Passo 2** | Ajuste de parâmetros de cor ou seleção de preset e validação dos limites | REQ-VID-FLT-004 |
| **Passo 3** | Validação técnica, limites de perfil/tamanho, concorrência, reserva de quota e criação rápida | REQ-VID-FLT-007, REQ-VID-FLT-008, REQ-VID-FLT-009, REQ-VID-FLT-010, REQ-VID-FLT-011, REQ-VID-FLT-032 |
| **Passo 4** | Enfileiramento da tarefa em $\le 2\text{ s}$, atribuição de UUID e apresentação do estado "Em espera" | REQ-VID-FLT-012, REQ-VID-FLT-013, REQ-VID-FLT-032 |
| **Passo 5** | Decomposição em fotogramas, filtros reaproveitando tools, indexação temporal, recombinação, cópia de áudio e progresso | REQ-VID-FLT-014, REQ-VID-FLT-015, REQ-VID-FLT-016, REQ-VID-FLT-017, REQ-VID-FLT-018, REQ-VID-FLT-019, REQ-VID-FLT-031 |
| **Passo 6** | Acompanhamento do progresso, continuidade em segundo plano e opção de cancelamento | REQ-VID-FLT-019, REQ-VID-FLT-020, REQ-VID-FLT-021, REQ-VID-FLT-022 |
| **Passo 7** | Validação de integridade pós-codificação, novo recurso na biblioteca, preservação do original e consolidação da quota | REQ-VID-FLT-024, REQ-VID-FLT-025, REQ-VID-FLT-026, REQ-VID-FLT-029 |
| **Passo 8** | Apresentação do vídeo filtrado na biblioteca, reprodução no leitor, detalhes e download | REQ-VID-FLT-028 |
| **FA1** | Seleção de estilo predefinido preenche automaticamente marcadores de cor | REQ-VID-FLT-005 |
| **FA2** | Ajuste manual dos marcadores de cor com atualização de resumo e pré-visualização | REQ-VID-FLT-004 |
| **FA3** | Reposição dos marcadores de cor para o estado neutro original | REQ-VID-FLT-006 |
| **FA4** | Cancelamento do processamento, paragem do worker, purga de fotogramas temporários e estorno da quota | REQ-VID-FLT-021, REQ-VID-FLT-022, REQ-VID-FLT-023 |
| **FA5** | Continuidade do processamento em segundo plano perante navegação ou fecho de sessão | REQ-VID-FLT-020 |
| **Exceção 1** | Parâmetros fora dos intervalos permitidos bloqueiam a submissão | REQ-VID-FLT-004 |
| **Exceção 2** | Vídeo de origem corrompido, formato inválido ou codec não suportado | REQ-VID-FLT-007 |
| **Exceção 3** | Duração ou tamanho do vídeo excede o limite do perfil | REQ-VID-FLT-008, REQ-VID-FLT-009 |
| **Exceção 4** | Quota diária esgotada ou espaço de armazenamento insuficiente | REQ-VID-FLT-011 |
| **Exceção 5** | Limite máximo de tarefas ativas em simultâneo atingido pelo utilizador | REQ-VID-FLT-010 |
| **Exceção 6** | Falha técnica durante o processamento, estado explícito de erro, limpeza de fotogramas e estorno | REQ-VID-FLT-022, REQ-VID-FLT-023, REQ-VID-FLT-027, REQ-VID-FLT-029 |
| **Exceção 7** | Ficheiro gerado falha na validação de integridade pós-processamento | REQ-VID-FLT-022, REQ-VID-FLT-023, REQ-VID-FLT-024, REQ-VID-FLT-027 |
| **Garantia de Sucesso** | Novo vídeo íntegro e validado na biblioteca, original inalterado, tarefa concluída e quota deduzida | REQ-VID-FLT-024, REQ-VID-FLT-025, REQ-VID-FLT-026, REQ-VID-FLT-028, REQ-VID-FLT-029 |
| **Garantia Mínima** | Original inalterado, sem fotogramas temporários, estado explícito de falha/cancelamento e quota estornada | REQ-VID-FLT-022, REQ-VID-FLT-023, REQ-VID-FLT-027, REQ-VID-FLT-029 |
| **RN1** | Intervalos válidos permitidos para os valores de brilho, contraste e saturação | REQ-VID-FLT-004 |
| **RN2** | Duração máxima por perfil: até 60 s para registado e até 10 min para premium | REQ-VID-FLT-008, REQ-VID-FLT-009 |
| **RN3** | Tamanho máximo por perfil: até 100 MB para registado e até 1 GB para premium | REQ-VID-FLT-008, REQ-VID-FLT-009 |
| **RN4** | Operação gera sempre novo recurso; vídeo original nunca é sobrescrito ou alterado | REQ-VID-FLT-025, REQ-VID-FLT-029 |
| **RN5** | Formato de saída obrigatório em contentor MP4 com codecs H.264 e AAC | REQ-VID-FLT-030 |
| **RN6** | Reserva de 1 unidade de quota na submissão, consumo definitivo no sucesso e estorno na falha/cancelamento | REQ-VID-FLT-011, REQ-VID-FLT-023, REQ-VID-FLT-026 |
| **RN7** | Resultado só fica visível e disponível para reprodução/download após validação de integridade | REQ-VID-FLT-024, REQ-VID-FLT-028 |
| **RN8** | Concorrência máxima de tarefas de vídeo em simultâneo por perfil (1 registado / 3 premium) | REQ-VID-FLT-010 |
| **A1** | Decomposição em fotogramas reutilizando as ferramentas de imagem existentes | REQ-VID-FLT-014, REQ-VID-FLT-015, REQ-VID-FLT-018, REQ-VID-FLT-031 |
| **A2** | Preservação de identificadores sequenciais e timestamps para recombinação fiel | REQ-VID-FLT-016, REQ-VID-FLT-017, REQ-VID-FLT-031 |
| **A5** | Encadeamento e processamento em lote fora do âmbito do MVP de vídeo | *(Exclusão explícita fundamentada na arquitetura)* |
