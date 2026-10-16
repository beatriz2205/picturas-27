# Exercício 1 — Caso de Uso

### Fase 1: Suporte a Vídeo no PictuRAS

## 0. Identificação

| **Campo** | **Valor** |
| --- | --- |
| **Grupo / Equipa** |  |
| **Autores** |  |
| **Data** | 2026-10-13 |
| **Versão do documento** | v1.0 |
| **Unidade Curricular** | Requisitos e Arquiteturas de Software — MEI, Universidade do Minho |

---

## 1. Funcionalidade de vídeo escolhida

| **Campo** | **Valor** |
| --- | --- |
| **Funcionalidade** | Carregamento/submissão de vídeo para um projeto |
| **Perfil(s) de utilizador abrangido(s)** | Anónimo, registado Free e Premium. A submissão é uma funcionalidade base de gestão de conteúdo, não uma ferramenta avançada sujeita à quota diária de operações. |

**Justificação no contexto do MVP**

O carregamento é o primeiro passo necessário para que um utilizador possa trabalhar com vídeos no PictuRAS e permite validar o fluxo completo entre interface, API, projeto e armazenamento. Sem esta funcionalidade, as restantes operações de vídeo não têm um ficheiro de entrada sobre o qual atuar.

---

## 2. Caso de Uso

### 2.1 Cabeçalho

| **Secção** | **Detalhes** |
| --- | --- |
| **ID do Caso de Uso** | UC-VID-001 |
| **Nome** | Submeter vídeo a um projeto |
| **Versão** | v1.0 |
| **Autor** |  |
| **Data** | 2026-10-13 |
| **Objetivo** | Permitir que um utilizador carregue um vídeo local e o associe a um projeto PictuRAS, ficando o ficheiro disponível nesse projeto para funcionalidades de vídeo futuras. |
| **Âmbito** | Interface Web do PictuRAS, gestão de projetos e armazenamento de vídeo. |
| **Ator Principal** | Utilizador PictuRAS com sessão ativa (perfil anónimo, registado Free ou Premium). No perfil anónimo, a sessão é a sessão temporária criada automaticamente. |
| **Stakeholders e Interesses** | • **Utilizador**: carregar o vídeo pretendido, passando este a estar incorporado num projeto e a poder ser editado com as ferramentas que forem futuramente implementadas.<br>• **Equipa do projeto**: validar a integração funcional de carregamento e armazenamento de vídeo no MVP.<br>• **PictuRAS**: manter a associação entre o vídeo e o projeto correto e não apresentar como concluído um carregamento incompleto.<br>• **Operador da aplicação**: evitar aceitar ficheiros que excedam os limites acordados para o MVP. |
| **Pré-condições** | • O utilizador tem uma sessão PictuRAS ativa.<br>• O utilizador tem ou pode criar um projeto (adicionando pelo menos uma imagem ou um vídeo), para onde submete o vídeo.<br>• O utilizador tem acesso ao ficheiro de vídeo no seu dispositivo. |
| **Trigger** | O utilizador escolhe a opção de adicionar um vídeo a um projeto. |

### 2.2 Fluxo Principal

| **Passo** | **Ação do Ator** | **Resposta do Sistema** |
| --- | --- | --- |
| 1 | Abre um projeto existente. | Apresenta o projeto e a opção de adicionar vídeo. |
| 2 | Escolhe a opção de adicionar vídeo. | Abre o seletor de ficheiros do dispositivo. |
| 3 | Seleciona um ficheiro de vídeo. | Apresenta o nome e o tamanho do ficheiro antes do envio. |
| 4 | Confirma o carregamento. | Inicia o envio e apresenta o progresso. |
| 5 | Aguarda que o envio termine. | Recebe o ficheiro e valida o formato, o codec, a duração e o tamanho segundo as regras do MVP. Se as validações forem satisfeitas, guarda o ficheiro no armazenamento e associa-o ao projeto selecionado. |
| 6 | — | Informa que o vídeo foi submetido e apresenta-o na lista de conteúdos do projeto. |

### 2.3 Fluxos Alternativos

| **Fluxo** | **Descrição** |
| --- | --- |
| FA1 – Cancelar antes do envio | Antes de confirmar o carregamento, o utilizador cancela ou fecha o seletor, com ou sem ficheiro selecionado. O sistema não envia o ficheiro nem altera o projeto. |
| FA2 – Submeter outro vídeo | Após o passo 6, o utilizador escolhe adicionar outro vídeo. O sistema inicia uma nova submissão para o mesmo projeto, sem substituir o vídeo já carregado. |
| FA3 – Repetir após falha recuperável | O envio falha por uma interrupção temporária ou a confirmação não chega ao utilizador. O sistema informa que a submissão não foi concluída e permite ao utilizador tentar novamente. Se o carregamento anterior tiver sido confirmado, a repetição não cria uma segunda entrada. |
| FA4 – Criar projeto com o vídeo | No passo 1, o utilizador cria um projeto novo escolhendo um vídeo. O ficheiro escolhido segue os passos 3 a 6. Se o ficheiro for recusado, o projeto não é criado. |

### 2.4 Exceções

| **Condição** | **Comportamento do Sistema** |
| --- | --- |
| O ficheiro não é um vídeo MP4 com codec H.264, ou não é possível identificar o formato/codec. | Recusa o ficheiro antes de o associar ao projeto e informa o utilizador de que o formato não é suportado. |
| O ficheiro excede o tamanho máximo ou a duração máxima definidos para o MVP. | Não inicia a submissão, informa qual o limite excedido e não associa o vídeo ao projeto. |
| A ligação falha ou o armazenamento fica indisponível durante o envio. | Informa que o carregamento falhou; não confirma a submissão nem deixa uma entrada utilizável para um ficheiro incompleto. O utilizador pode tentar novamente. |
| O utilizador não tem sessão válida. | Recusa a submissão, informa que a sessão terminou e não altera o projeto. |
| O projeto deixa de estar disponível durante a submissão. | Cancela ou termina a operação com erro, informa o utilizador e não associa o vídeo a outro projeto. |

### 2.5 Pós-condições

| **Tipo** | **Resultado** |
| --- | --- |
| Garantia de Sucesso | O ficheiro de vídeo validado está guardado e associado ao projeto selecionado; o projeto apresenta uma entrada para o vídeo e o utilizador recebe confirmação. O ficheiro original não é transformado nesta funcionalidade. |
| Garantia Mínima | O sistema não apresenta como concluído um carregamento falhado. O projeto não contém uma entrada utilizável para um ficheiro parcial; o utilizador recebe informação suficiente para corrigir o problema ou tentar novamente. |

### 2.6 Regras de Negócio e Restrições

| **ID** | **Regra** |
| --- | --- |
| RN1 | O ator tem de possuir uma sessão ativa e um projeto de destino. |
| RN2 | Para o MVP, só são aceites ficheiros MP4 com vídeo codificado em H.264. A extensão do ficheiro, por si só, não é suficiente para confirmar o formato/codec. |
| RN3 | O tamanho máximo proposto por ficheiro é 100 MB (100 × 1024 × 1024 bytes) e a duração máxima proposta é 10 minutos. O sistema deve validar ambos antes de confirmar a submissão. |
| RN4 | As regras de submissão são iguais para os perfis anónimo, Free e Premium. O carregamento de um vídeo não consome a quota diária de operações avançadas, que se aplica às ferramentas avançadas existentes, tal como a submissão de imagens. |
| RN5 | A submissão associa o ficheiro original a um único projeto. Recortar, converter, transcodificar, gerar miniaturas e aplicar ferramentas ao vídeo estão fora do âmbito deste caso de uso. |
| RN6 | Cada ação de submissão confirmada cria uma entrada distinta no projeto; carregar um vídeo novo não substitui automaticamente um vídeo já existente. A repetição de uma submissão cuja confirmação não chegou ao utilizador não cria entrada nova, ao contrário de uma nova submissão deliberada do mesmo ficheiro (mesmo ficheiro, nova ação, nova entrada). |
| RN7 | Os limites de 100 MB e 10 minutos são limites funcionais propostos para o MVP, não limites atualmente verificados no carregamento de imagens. A equipa deve confirmá-los antes da implementação. |
| RN8 | O sistema pode validar o ficheiro antes ou durante o envio, mas nunca associa ao projeto um ficheiro que não passou todas as validações. |

### 2.7 Assunções

| **ID** | **Assunção** |
| --- | --- |
| A1 | O perfil do utilizador não altera o direito de submeter vídeo. Esta decisão estende ao vídeo o modelo de acesso proposto para os projetos existentes. |
| A2 | O formato MP4/H.264 é escolhido para reduzir a variedade de formatos a validar no MVP. |
| A3 | Os limites iniciais de 100 MB por ficheiro e 10 minutos de duração são valores de trabalho para permitir testes funcionais; não foram definidos no código existente e carecem de validação pela equipa. |
| A4 | Esta funcionalidade não processa o vídeo nem exige pré-visualização; a confirmação significa apenas que o ficheiro foi validado, guardado e associado ao projeto. |
| A5 | No MVP não há quotas de armazenamento por perfil para vídeos. Os limites de tamanho e duração por ficheiro não equivalem a uma quota total de armazenamento. |

### 2.8 Questões em Aberto

| **ID** | **Questão** |
| --- | --- |
| Q1 | Devem ser aceites outros formatos de vídeos ou codecs, para além de MP4/H.264? |
| Q2 | Depois do MVP, devem ser impostos diferentes limites máximos de tamanho e duração dos vídeos aos diferentes perfis de utilizador? |
| Q3 | Depois do MVP, será necessária uma quota total de armazenamento ou um número máximo de vídeos por projeto? |
| Q4 | Deve ser permitida a pré-visualização do vídeo? |
| Q5 | Como devem os vídeos ser apresentados no projeto e deve ser permitida a remoção do vídeo nesta funcionalidade? |

---

## 3. Utilização de agentes de IA

| **Ferramenta / *skill*** | **Tarefa apoiada** | **Validação realizada pela equipa** |
| --- | --- | --- |
| Assistente de IA usando Copilot SDK no VS Code | Análise do template, do enunciado, dos diferentes privilégios dos perfis e do fluxo existente de projetos e uploads; elaboração de uma primeira versão do caso de uso de submissão de vídeo. | Conteúdo cruzado com o template e o enunciado; decisões não definidas no código foram registadas como assunções ou questões em aberto. |
| Assistente de IA usando Copilot SDK no VS Code | Análise do guia da secção 4 e derivação dos requisitos de sistema, tabela de impacto e matriz de rastreabilidade para o caso de uso de submissão de vídeo. | Requisitos revistos quanto à atomicidade, verificabilidade, origem no caso de uso e cobertura da matriz; a tabela de impacto foi confrontada com a arquitetura existente do PictuRAS. |
| Assistente de IA (Claude, interface de chat) | Análise do template e do guia do Exercício 2 e reescrita da secção 4 como ERS: classificação dos requisitos funcionais e não funcionais (ISO/IEC 25010) com alvos MVP e de produção, verificação de completude, impacto no sistema existente, matriz de rastreabilidade e decisões de qualidade. | Origem e cobertura de cada requisito verificadas face ao caso de uso. |

---

---

## 4. Especificação de Requisitos do Sistema (ERS)

### 4.1 Requisitos da ERS

#### 4.1.1 Requisitos Funcionais

| **ID** | **Requisito** | **Prioridade** | **Evolução** | **Novo/Alt** | **Origem (UC / RN / decisão)** | **Justificação** | **Critério de aceitação / verificação** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| REQ-VID-UPLOAD-001 | O sistema deve permitir ao utilizador com sessão ativa selecionar e submeter um ficheiro de vídeo local para o projeto que abriu ou criou. | Deve ter | Mantido | NOVO | Ator Principal; Pré-condições; Passos 1–5; RN1; A1 | Porta de entrada de toda a funcionalidade de vídeo. | Submeter um vídeo válido com e sem sessão ativa e confirmar o resultado em cada caso |
| REQ-VID-UPLOAD-002 | O sistema deve permitir criar um projeto a partir de pelo menos um vídeo ou uma imagem. | Deve ter | Mantido | ALT | Passo 1; FA4 | A criação de projetos hoje exige uma imagem; o vídeo passa a ser alternativa. | Criar um projeto só com um vídeo válido e outro sem ficheiros; confirmar que só o primeiro é criado |
| REQ-VID-UPLOAD-003 | O sistema deve apresentar o nome e o tamanho do ficheiro selecionado antes do envio. | Deve ter | Mantido | NOVO | Passo 3 | Permite ao utilizador confirmar o ficheiro antes de o enviar. | Selecionar um ficheiro de nome e tamanho conhecidos e comparar com os dados apresentados |
| REQ-VID-UPLOAD-004 | O sistema deve aceitar apenas ficheiros MP4 com vídeo codificado em H.264, identificando o formato e o codec pelo conteúdo do ficheiro e não pela extensão. | Deve ter | Refinado | NOVO | Passo 5; RN2; A2 | A extensão não prova o formato; um só formato reduz a variedade a validar no MVP. | Submeter um MP4/H.264, um ficheiro de outro formato ou codec e um ficheiro renomeado para .mp4; confirmar que só o MP4/H.264 é aceite |
| REQ-VID-UPLOAD-005 | O sistema deve aceitar apenas ficheiros de vídeo com tamanho igual ou inferior a 100 MB (100 × 1024 × 1024 bytes) (limite provisório, RN7). | Deve ter | Refinado | NOVO | Passo 5; Exceção: tamanho excedido; RN3; A3 | Protege o armazenamento e o tempo de envio. Reclassificado como funcional por ser regra de validação de entrada. | Submeter vídeos de 100 MB e de tamanho superior; confirmar que só o primeiro é aceite |
| REQ-VID-UPLOAD-006 | O sistema deve aceitar apenas ficheiros de vídeo com duração igual ou inferior a 10 minutos (limite provisório, RN7). | Deve ter | Refinado | NOVO | Passo 5; Exceção: duração excedida; RN3; A3 | Limita a dimensão dos vídeos no MVP. Reclassificado como funcional por ser regra de validação de entrada. | Submeter vídeos de 10 minutos e de duração superior; confirmar que só o primeiro é aceite |
| REQ-VID-UPLOAD-007 | O sistema deve apresentar o progresso do envio enquanto este estiver em curso. | Deve ter | Mantido | NOVO | Passo 4 | Um envio de vídeo demora; o utilizador precisa de o acompanhar. | Submeter um vídeo grande e confirmar que o progresso é apresentado durante o envio |
| REQ-VID-UPLOAD-008 | O sistema deve guardar o ficheiro original sem o alterar. | Deve ter | Mantido | NOVO | Passo 5; Pós-condição de sucesso; RN5; A4 | Garante que o original fica disponível, intacto, para funcionalidades futuras. | Comparar o resumo criptográfico do ficheiro submetido com o do ficheiro guardado |
| REQ-VID-UPLOAD-009 | O sistema deve associar o vídeo submetido ao projeto aberto pelo utilizador. | Deve ter | Mantido | NOVO | Passo 5; Pós-condição de sucesso | Sem associação ao projeto, o vídeo não pode ser usado. | Submeter um vídeo num projeto e confirmar que fica associado a esse projeto |
| REQ-VID-UPLOAD-010 | O sistema deve apresentar o vídeo submetido, com o nome e o tamanho, na lista de conteúdos do projeto. | Deve ter | Mantido | NOVO | Passo 6; Pós-condição de sucesso | Torna visível o resultado da submissão. | Submeter um vídeo e confirmar que a lista do projeto mostra o seu nome e tamanho |
| REQ-VID-UPLOAD-011 | O sistema deve permitir ao utilizador cancelar ou fechar o seletor antes de confirmar o envio, com ou sem ficheiro selecionado, sem alterar o projeto. | Deveria ter | Mantido | NOVO | FA1 | Evita envios acidentais. | Abrir o seletor e cancelar, com e sem ficheiro selecionado; confirmar que o projeto não muda |
| REQ-VID-UPLOAD-012 | O sistema deve adicionar o novo vídeo ao projeto sem substituir os vídeos já existentes. | Deve ter | Mantido | NOVO | FA2; RN6 | Evita a perda de conteúdo já carregado. | Submeter um segundo vídeo e confirmar que o primeiro continua no projeto |
| REQ-VID-UPLOAD-013 | O sistema deve informar o utilizador da causa quando recusa um ficheiro por formato, codec, tamanho ou duração não suportados. | Deve ter | Mantido | NOVO | Exceções: formato/codec e limites excedidos; RN2; RN3 | Permite ao utilizador corrigir o problema. | Submeter ficheiros com formato, codec, tamanho e duração inválidos e confirmar que a causa é indicada em cada caso |
| REQ-VID-UPLOAD-014 | O sistema deve informar o utilizador quando o envio falha ou o projeto deixa de estar disponível. | Deve ter | Mantido | NOVO | FA3; Exceções: falha de ligação/armazenamento e projeto indisponível | Evita que o utilizador assuma que o vídeo foi guardado. | Interromper a ligação durante o envio e confirmar que o utilizador é informado da falha |
| REQ-VID-UPLOAD-015 | O sistema deve permitir ao utilizador tentar novamente uma submissão após uma falha. | Deveria ter | Mantido | NOVO | FA3 | Permite recuperar de falhas temporárias. | Após uma falha, repetir a submissão e confirmar que é possível tentar de novo |
| REQ-VID-UPLOAD-016 | O sistema não deve contabilizar a submissão de um vídeo como operação avançada diária. | Deve ter | Mantido | NOVO | RN4; quota diária de operações avançadas existente | Tal como a submissão de imagens, é uma funcionalidade base e não deve gastar a quota. | Comparar a quota de operações avançadas restantes de um utilizador Free antes e depois de submeter um vídeo |
| REQ-VID-UPLOAD-017 | O sistema deve informar o utilizador de que o vídeo foi submetido com sucesso. | Deve ter | Mantido | NOVO | Passo 6; Pós-condição de sucesso | Confirma ao utilizador que o objetivo foi alcançado. | Submeter um vídeo e confirmar que é apresentada a confirmação de sucesso |
| REQ-VID-UPLOAD-018 | O sistema deve recusar a submissão sem sessão válida, informar o utilizador e não alterar o projeto. | Deve ter | Mantido | NOVO | Exceção: sessão inválida; RN1; A1 | Protege o projeto de submissões sem autorização. | Submeter um vídeo sem sessão válida e confirmar que é recusado, com aviso, e que o projeto fica inalterado |
| REQ-VID-UPLOAD-019 | O sistema não deve apresentar como disponível nem associar ao projeto um vídeo cujo envio não terminou ou que não passou as validações. | Deve ter | Mantido | NOVO | Garantia Mínima; RN8; Exceções: falha no envio e projeto indisponível | Mantém o projeto consistente após falhas e recusas. | Interromper um envio e submeter um ficheiro inválido; confirmar que nenhum aparece no projeto |
| REQ-VID-UPLOAD-020 | O sistema não deve criar uma segunda entrada quando a repetição se segue a uma submissão já confirmada, mas deve criar uma nova entrada quando o utilizador submete deliberadamente o mesmo ficheiro outra vez. | Deveria ter | Mantido | NOVO | FA3; RN6 | Distingue a repetição após falha de uma nova submissão deliberada. | Repetir uma submissão já confirmada e confirmar que só há uma entrada; submeter deliberadamente o mesmo ficheiro e confirmar que há duas |
| REQ-VID-UPLOAD-021 | O sistema deve manter o vídeo guardado enquanto o projeto existir e removê-lo quando o projeto for eliminado. | Deve ter | Novo | ALT | Pós-condição de sucesso; DQ-007 | Garante a persistência do vídeo e evita ficheiros órfãos no armazenamento. | Eliminar um projeto com vídeo e confirmar que o ficheiro deixa de existir no armazenamento |
| REQ-VID-UPLOAD-022 | O sistema deve permitir ao utilizador cancelar um envio em curso, sem associar o vídeo ao projeto. | Deveria ter | Novo | NOVO | Passo 4; FA1 (extensão ao envio em curso) | Um envio de vídeo pode demorar; o utilizador deve poder desistir. | Cancelar um envio a meio e confirmar que o vídeo não aparece no projeto |
| REQ-VID-UPLOAD-023 | O sistema deve aplicar os mesmos limites de formato, tamanho e duração aos perfis anónimo, Free e Premium. | Deve ter | Novo | NOVO | RN4; A1 | Torna verificável a igualdade entre perfis assumida no caso de uso. | Submeter o mesmo vídeo de 100 MB com os três perfis e confirmar que é aceite em todos |

#### 4.1.2 Requisitos Não Funcionais e de Qualidade

| **ID** | **Requisito** | **Característica ISO/IEC 25010** | **Alvo MVP** | **Alvo produção** | **Evolução** | **Origem (UC / DQ)** | **Critério de aceitação / verificação** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| REQ-VID-UPLOAD-024 | O sistema deve apresentar o resultado da validação e a confirmação da submissão em menos de 5 s após a receção completa de um ficheiro de até 100 MB. | Eficiência de Desempenho | 5 s | 2 s | Novo | Passo 5; DQ-001 | Submeter ficheiros de 10 MB e 100 MB e medir o tempo entre o fim do envio e a confirmação |
| REQ-VID-UPLOAD-025 | O sistema deve atualizar o indicador de progresso do envio pelo menos de 2 em 2 s. | Usabilidade | 2 s | 1 s | Novo | Passo 4; DQ-001 | Submeter um vídeo de 100 MB e registar os instantes de atualização do progresso |
| REQ-VID-UPLOAD-026 | O sistema deve suportar 5 envios simultâneos de vídeos de 100 MB, cumprindo o REQ-VID-UPLOAD-024 e sem falhas. | Eficiência de Desempenho (capacidade) | 5 envios | 50 envios | Novo | Passos 4–5; DQ-002 | Executar 5 envios simultâneos de 100 MB e confirmar que todos terminam com sucesso |
| REQ-VID-UPLOAD-027 | O sistema deve guardar o vídeo e associá-lo ao projeto de forma atómica: ou ambas as operações ficam concluídas, ou nenhuma. | Fiabilidade | Obrigatório | Obrigatório | Novo | Passo 5; Garantia Mínima; DQ-003 | Injetar uma falha entre a gravação do ficheiro e a associação e confirmar que o projeto não fica com o vídeo |
| REQ-VID-UPLOAD-028 | O sistema deve remover os ficheiros parciais de envios falhados ou cancelados no prazo de 24 horas. | Fiabilidade | 24 h | 1 h | Novo | Exceção: falha no envio; Garantia Mínima; DQ-003 | Interromper um envio, aguardar o prazo e confirmar que o ficheiro parcial já não existe no armazenamento |
| REQ-VID-UPLOAD-029 | O sistema deve permitir concluir uma submissão após uma falha de ligação durante o envio. | Fiabilidade (recuperabilidade) | Recomeçar o envio do início | Retomar a partir do último bloco recebido | Novo | FA3; DQ-003 | Interromper a ligação a 80% do envio e repetir; confirmar que a submissão termina com sucesso |
| REQ-VID-UPLOAD-030 | O sistema deve restringir o acesso ao vídeo submetido ao utilizador proprietário do projeto. | Segurança | Obrigatório | Obrigatório | Novo | Pós-condição de sucesso; DQ-004 | Aceder ao vídeo a partir de outra sessão e confirmar que devolve erro de autorização |
| REQ-VID-UPLOAD-031 | O sistema deve referenciar cada vídeo guardado por um identificador aleatório e não sequencial. | Segurança | Identificador aleatório de pelo menos 128 bits | Identificador aleatório e URLs de acesso temporários e assinados | Novo | Passo 5; DQ-004 | Submeter dois vídeos seguidos e confirmar que os identificadores não são sequenciais nem previsíveis |
| REQ-VID-UPLOAD-032 | A adição de um novo formato ou codec suportado não deve exigir alterações à lógica de validação dos formatos já suportados. | Manutenibilidade | Objetivo | Obrigatório | Novo | Q1; DQ-005 | Acrescentar um segundo formato de teste e confirmar que o código de validação do MP4/H.264 não é alterado |
| REQ-VID-UPLOAD-033 | O sistema deve analisar o formato, o codec e a duração do vídeo num componente isolado, executável nos contentores do próprio serviço e sem instalações manuais. | Portabilidade | Obrigatório | Obrigatório, com a versão da ferramenta fixada | Novo | Passo 5; DQ-005 | Construir o serviço de raiz num ambiente limpo e submeter um MP4/H.264 válido e um ficheiro inválido |
| REQ-VID-UPLOAD-034 | O sistema deve permitir a submissão de vídeos nas versões atuais do Chrome e do Firefox. | Compatibilidade | Chrome e Firefox | Chrome, Firefox, Edge e Safari | Novo | Passos 2–4; DQ-006 | Submeter um vídeo válido em cada navegador e confirmar que a submissão termina com sucesso |

#### 4.1.3 Verificação da completude e dos limites do âmbito

| **Tópico a verificar** | **Aplicável?** | **Decisão / justificação** | **Requisito(s) relacionado(s)** |
| --- | --- | --- | --- |
| Formato, codec, duração e dimensão do vídeo | Sim | Formato e codec MP4/H.264, identificados pelo conteúdo; tamanho e duração limitados a 100 MB e 10 minutos. A resolução e o débito binário não são validados no MVP, pois os dois limites já restringem a carga. | REQ-VID-UPLOAD-004, 005, 006, 013, 032, 033 |
| Estado, progresso, cancelamento e resultado | Sim | O progresso é apresentado durante o envio e o utilizador pode cancelar antes e durante o envio. O resultado é sucesso, falha ou recusa, sempre comunicado. Não há estados de processamento, porque o vídeo não é processado (RN5). O cancelamento durante o envio estende a FA1 e fica proposto como extensão do caso de uso. | REQ-VID-UPLOAD-007, 011, 013, 014, 017, 022, 025 |
| Falhas durante o processamento | Sim, adaptado | Não há processamento (RN5), mas há falhas durante o envio e a gravação. O vídeo falhado não fica acessível, a gravação e a associação são atómicas e os ficheiros parciais são removidos. | REQ-VID-UPLOAD-014, 015, 019, 027, 028, 029 |
| Persistência e expiração dos ficheiros | Sim | O vídeo persiste enquanto o projeto existir e é removido com ele. Não há expiração própria do vídeo no MVP e a remoção de um vídeo individual fica em aberto (Q5). Só os ficheiros parciais expiram (24 h). A regra é uma extensão do âmbito justificada: sem ela, o ficheiro ficaria órfão. | REQ-VID-UPLOAD-021, 028, 030, 031 |
| Perfis e contagem de operações | Sim | Os limites são iguais para os três perfis e a submissão não consome a quota de operações avançadas (RN4). As quotas de armazenamento ficam fora do MVP (A5, Q3). | REQ-VID-UPLOAD-016, 023 |
| Encadeamento de ferramentas e processamento em lote | Não | Fora do âmbito: o caso de uso apenas guarda o original (RN5). Cada submissão envolve um único ficheiro e várias submissões fazem-se uma de cada vez (FA2). O vídeo submetido é o ponto de partida das ferramentas futuras. | N/A |

**Evolução:** *Mantido* = requisito preservado; *Refinado* = clarificado ou tornado verificável sem mudar a intenção; *Novo* = acrescentado para completar a ERS. **NOVO/ALT** indica o impacto face ao PictuRAS existente, não a novidade face ao Exercício 1.

### 4.2 Impacto no sistema existente

| **Elemento existente afetado** | **Impacto (Manter / Estender / Alterar)** | **Descrição do impacto** | **Requisito(s) relacionado(s)** |
| --- | --- | --- | --- |
| Interface de criação de projetos | Alterar | A interface atual exige pelo menos uma imagem para criar um projeto. Deve passar a aceitar pelo menos uma imagem ou um vídeo. | REQ-VID-UPLOAD-002 |
| Interface de seleção e submissão de ficheiros | Estender | A interface atual aceita imagens e ZIP. Deve também permitir selecionar vídeo, apresentar os dados do ficheiro, mostrar e atualizar o progresso, permitir cancelar e informar do resultado, no Chrome e no Firefox. | REQ-VID-UPLOAD-001, 003, 007, 011, 013, 017, 018, 022, 025, 034 |
| Modelo de projeto e lista de conteúdos | Estender | O modelo atual representa imagens e ferramentas, não vídeos. Deve guardar a associação do vídeo ao projeto, apresentá-lo na lista de conteúdos e garantir que a associação é atómica. | REQ-VID-UPLOAD-008, 009, 010, 012, 014, 019, 027 |
| API Gateway, serviço de projetos e armazenamento | Estender | O percurso de carregamento atual é orientado a imagens. Deve aceitar submissões de vídeo, validar formato, codec, tamanho e duração no servidor, guardar o original com identificador aleatório, restringir o acesso ao proprietário, remover ficheiros parciais e suportar envios simultâneos. | REQ-VID-UPLOAD-004, 005, 006, 008, 009, 013, 014, 015, 020, 023, 024, 026, 028, 029, 030, 031, 032, 033 |
| Eliminação de projetos | Alterar | Ao eliminar um projeto, os vídeos associados têm de ser removidos do armazenamento. | REQ-VID-UPLOAD-021 |
| Nginx (limite do corpo do pedido HTTP) | Alterar | O limite predefinido do Nginx é inferior ao tamanho máximo de vídeo proposto; o ponto de entrada terá de permitir pedidos com um vídeo de até 100 MB (100 MiB). | REQ-VID-UPLOAD-005 |
| Perfis de utilizador | Manter | Os perfis anónimo, Free e Premium mantêm-se; os três têm os mesmos limites de submissão de vídeo. | REQ-VID-UPLOAD-001, 018, 023 |
| Contagem de operações avançadas | Manter | A submissão de vídeo não consome a quota de operações avançadas usada pelas ferramentas existentes. | REQ-VID-UPLOAD-016 |
| Processamento de imagens | Manter | A funcionalidade limita-se a submeter e guardar o vídeo original; não altera o processamento de imagens existente. | REQ-VID-UPLOAD-008 |
| Encadeamento de ferramentas e processamento em lote | Manter | Fora do âmbito deste caso de uso; o vídeo submetido apenas fica disponível para ferramentas futuras. | N/A |

### 4.3 Matriz de Rastreabilidade Atualizada

| **Elemento de origem** | **Descrição abreviada** | **Requisito(s) relacionado(s)** |
| --- | --- | --- |
| Pré-condições | Sessão ativa, projeto disponível e ficheiro local | REQ-VID-UPLOAD-001 |
| Trigger | Escolher a opção de adicionar vídeo | REQ-VID-UPLOAD-001 |
| Passo 1 | Abrir ou criar projeto | REQ-VID-UPLOAD-001, 002 |
| Passo 2 | Escolher adicionar vídeo | REQ-VID-UPLOAD-001, 034 |
| Passo 3 | Selecionar ficheiro e ver nome e tamanho | REQ-VID-UPLOAD-001, 003, 034 |
| Passo 4 | Confirmar carregamento; envio com progresso | REQ-VID-UPLOAD-007, 022, 025, 026, 034 |
| Passo 5 | Validar ficheiro, guardar original e associar ao projeto | REQ-VID-UPLOAD-004, 005, 006, 008, 009, 013, 024, 026, 027, 031, 033 |
| Passo 6 | Confirmar sucesso e apresentar vídeo na lista do projeto | REQ-VID-UPLOAD-010, 017 |
| FA1 | Cancelar antes (e, por extensão, durante) o envio | REQ-VID-UPLOAD-011, 022 |
| FA2 | Submeter outro vídeo sem substituir o existente | REQ-VID-UPLOAD-012 |
| FA3 | Informar da falha, permitir tentar novamente e evitar duplicados | REQ-VID-UPLOAD-014, 015, 020, 029 |
| FA4 | Criar projeto com o vídeo | REQ-VID-UPLOAD-002, 004, 005, 006, 009 |
| Exceção: formato/codec não suportado | Recusar ficheiro incompatível e informar a causa | REQ-VID-UPLOAD-004, 013 |
| Exceção: tamanho excedido | Recusar vídeo acima de 100 MB e informar a causa | REQ-VID-UPLOAD-005, 013 |
| Exceção: duração excedida | Recusar vídeo acima de 10 minutos e informar a causa | REQ-VID-UPLOAD-006, 013 |
| Exceção: falha no envio | Informar da falha e não apresentar vídeo incompleto como disponível | REQ-VID-UPLOAD-014, 015, 019, 028 |
| Exceção: sessão inválida | Recusar a submissão, informar e não alterar o projeto | REQ-VID-UPLOAD-018 |
| Exceção: projeto indisponível | Informar da falha e não associar o vídeo a outro projeto | REQ-VID-UPLOAD-009, 014, 019 |
| Pós-condição de sucesso | Vídeo guardado, associado, apresentado, confirmado, persistente e protegido | REQ-VID-UPLOAD-008, 009, 010, 017, 021, 030 |
| Garantia mínima | Falha não é apresentada como sucesso nem deixa vídeo incompleto disponível | REQ-VID-UPLOAD-014, 019, 027, 028 |
| RN1 | Sessão ativa e projeto de destino | REQ-VID-UPLOAD-001, 018 |
| RN2 | Apenas MP4/H.264 | REQ-VID-UPLOAD-004, 013 |
| RN3 | Máximo de 100 MB e 10 minutos | REQ-VID-UPLOAD-005, 006, 013 |
| RN4 | Não consome quota de operações avançadas; limites iguais para todos os perfis | REQ-VID-UPLOAD-016, 023 |
| RN5 | Guardar original; sem processamento neste caso de uso | REQ-VID-UPLOAD-008 |
| RN6 | Novo vídeo não substitui existentes; repetição não duplica entrada | REQ-VID-UPLOAD-012, 020 |
| RN7 | Limites propostos para o MVP, a confirmar | REQ-VID-UPLOAD-005, 006 |
| RN8 | Nunca associar ao projeto um ficheiro que não passou as validações | REQ-VID-UPLOAD-019 |
| A1 | Perfil não altera o direito de submissão | REQ-VID-UPLOAD-001, 018, 023 |
| A2 | Formato MP4/H.264 | REQ-VID-UPLOAD-004 |
| A3 | Limites propostos de tamanho e duração | REQ-VID-UPLOAD-005, 006 |
| A4 | Sem processamento nem pré-visualização nesta funcionalidade | REQ-VID-UPLOAD-008 |
| A5 | Sem quota total de armazenamento por perfil no MVP | Sem requisito derivado; a quota depois do MVP continua por decidir (Q3) |
| Q1 | Outros formatos ou codecs no futuro | REQ-VID-UPLOAD-032 |
| DQ-001 | Tempos de resposta | REQ-VID-UPLOAD-024, 025 |
| DQ-002 | Capacidade | REQ-VID-UPLOAD-026 |
| DQ-003 | Fiabilidade do envio | REQ-VID-UPLOAD-027, 028, 029 |
| DQ-004 | Controlo de acesso | REQ-VID-UPLOAD-030, 031 |
| DQ-005 | Extensibilidade e isolamento | REQ-VID-UPLOAD-032, 033 |
| DQ-006 | Navegadores suportados | REQ-VID-UPLOAD-034 |
| DQ-007 | Persistência | REQ-VID-UPLOAD-021 |

**Decisões de qualidade introduzidas nesta aula**

| **ID** | **Decisão de qualidade** | **Justificação** | **Requisito(s) relacionado(s)** |
| --- | --- | --- | --- |
| DQ-001 | A confirmação da submissão surge em menos de 5 s após a receção completa do ficheiro (MVP) e o progresso é atualizado a cada 2 s; em produção, 2 s e 1 s. | A validação do codec e da duração obriga a analisar o ficheiro; 5 s é exequível para 100 MB no MVP e a produção exige resposta quase imediata. | REQ-VID-UPLOAD-024, 025 |
| DQ-002 | O MVP suporta 5 envios simultâneos de 100 MB; a produção, 50. | O MVP serve para validação funcional com poucos utilizadores em simultâneo; a produção cresce com a base de utilizadores. | REQ-VID-UPLOAD-026 |
| DQ-003 | A guarda e a associação são atómicas, os ficheiros parciais são removidos em 24 h e o MVP não retoma envios (recomeça do início); a produção remove em 1 h e retoma do último bloco. | O limite de 100 MB torna aceitável recomeçar um envio no MVP; a retoma custa mais a implementar. | REQ-VID-UPLOAD-027, 028, 029 |
| DQ-004 | O acesso ao vídeo é restrito ao proprietário do projeto e cada vídeo tem um identificador aleatório; só a produção usa URLs temporários e assinados. | Os vídeos são conteúdo privado e identificadores sequenciais permitiriam adivinhar URLs. | REQ-VID-UPLOAD-030, 031 |
| DQ-005 | A validação é extensível a novos formatos e a análise do vídeo corre num componente isolado, sem instalações manuais. | A Q1 deixa em aberto novos formatos e a análise depende de uma ferramenta externa (por exemplo, FFmpeg) que tem de ser reproduzível. | REQ-VID-UPLOAD-032, 033 |
| DQ-006 | O MVP suporta o Chrome e o Firefox; a produção acrescenta Edge e Safari. | Concentra os testes do MVP nos navegadores mais usados pela equipa e alarga depois. | REQ-VID-UPLOAD-034 |
| DQ-007 | O vídeo tem o ciclo de vida do projeto: persiste enquanto este existir e é removido com ele, sem expiração própria no MVP. | Evita ficheiros órfãos e dispensa uma política de retenção, a definir se houver quotas (Q3). | REQ-VID-UPLOAD-021 |

