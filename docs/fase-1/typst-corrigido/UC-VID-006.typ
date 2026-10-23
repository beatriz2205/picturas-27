#import "../template.typ": *

== UC-VID-006 — Alterar a velocidade de um vídeo

=== Cabeçalho

#tab([Caso de uso UC-VID-006 — Alterar a velocidade de um vídeo],
  tabela-campos(
    [ID do Caso de Uso], [UC-VID-006],
    [Nome], [Alterar a velocidade de um vídeo],
    [Versão], [v1.0],
    [Autor], [Beatriz Miranda],
    [Data], [2026-10-21],
    [Objetivo], [Permitir ao utilizador obter, a partir de um vídeo do projeto, uma versão em câmara lenta ou acelerada, com o áudio a acompanhar a nova velocidade, sem alterar o original.],
    [Âmbito], [Frontend, API Gateway, serviço de projetos, nova ferramenta de velocidade, armazenamento de objetos e notificações em tempo real.],
    [Ator Principal], [Utilizador registado (perfil Free ou Premium) com permissão de edição no projeto.],
    [_Stakeholders_ e Interesses], [
      - *Utilizador*: criar uma versão em câmara lenta ou acelerada de um vídeo sem perder o original e sem que o áudio fique desfasado ou com o tom alterado.
      - *Proprietário do Sistema*: oferecer mais uma operação de edição dentro dos limites de cada perfil, com custo de processamento previsível.
      - *Equipa de Desenvolvimento*: acrescentar uma ferramenta de vídeo sem alterar os serviços centrais, reutilizando o ciclo de vida de tarefas comum.
      - *Equipa de Operações*: limitar a duração dos resultados, para que a câmara lenta não gere ficheiros nem tarefas desproporcionados.
    ],
    [Pré-condições], [
      - O utilizador tem sessão iniciada e permissão de edição no projeto.
      - O vídeo está num projeto, com carregamento concluído (UC-VID-001).
    ],
    [_Trigger_], [O utilizador seleciona um vídeo do projeto e escolhe a opção *Alterar velocidade*.],
  ),
)

=== Fluxo Principal

#tab([UC-VID-006 — Fluxo principal],
  tabela(
    colunas: (1.2cm, 1fr, 1fr),
    [Passo], [Ação do Ator], [Resposta do Sistema],
    [1], [Seleciona um vídeo do projeto e escolhe *Alterar velocidade*.], [Verifica que o vídeo respeita a matriz de formatos e os limites do perfil atual (RN1) e apresenta as velocidades disponíveis (RN2), o nome proposto para o resultado e a quota diária restante.],
    [2], [Escolhe uma velocidade.], [Apresenta a duração que o resultado vai ter e se é câmara lenta ou aceleração.],
    [3], [Confirma o pedido.], [Revalida no servidor o pedido (vídeo, velocidade, limites do perfil, quota e limite de tarefas ativas), cria a tarefa com estado *Em fila*, reserva uma operação (RN7) e coloca-a na fila com a prioridade do perfil.],
    [4], [Acompanha o progresso, podendo navegar para outras áreas ou fechar a aplicação.], [Quando um _worker_ fica disponível, passa a tarefa a *A processar*, altera a velocidade do vídeo e do áudio (RN4, RN5) e envia o progresso pelo menos a cada 5 s, independentemente da sessão do utilizador.],
    [5], [—], [Verifica o ficheiro de saída: legível, MP4/H.264/AAC, com a resolução e a cadência da origem e a duração esperada (RN3).],
    [6], [—], [Guarda o resultado como novo vídeo do projeto, associado ao original e à tarefa, passa a tarefa a *Concluída*, consolida a operação e notifica o utilizador.],
    [7], [Abre o novo vídeo.], [Reproduz o vídeo e disponibiliza o descarregamento.],
  ),
)

=== Fluxos Alternativos

#tab([UC-VID-006 — Fluxos alternativos],
  tabela(
    colunas: (4cm, 1fr),
    [Fluxo], [Descrição (passo de origem: condição → comportamento → retorno)],
    [FA1 – Vídeo sem áudio], [Passo 4: a origem não tem faixa de áudio → o sistema altera só a velocidade do vídeo e o resultado fica sem áudio → continua no passo 5.],
    [FA2 – Cancelamento], [Passos 3–4: o utilizador cancela a tarefa *Em fila* ou *A processar* → o sistema passa-a a *Cancelada*, elimina os temporários, devolve a operação reservada e não publica nenhum resultado → o caso de uso termina.],
    [FA3 – Regresso após ausência], [Passo 4: o utilizador fecha a aplicação e regressa mais tarde → o sistema mostra o estado atual da tarefa e a notificação pendente; se concluída, continua no passo 7.],
    [FA4 – Pedido idêntico em curso], [Passo 3: já existe uma tarefa ativa do mesmo utilizador sobre o mesmo vídeo com a mesma velocidade → o sistema informa que o pedido já está em curso e apresenta essa tarefa, sem criar outra nem reservar quota.],
  ),
)

=== Exceções

#tab([UC-VID-006 — Exceções],
  tabela(
    colunas: (1fr, 1fr),
    [Condição], [Comportamento do Sistema],
    [*E1* — O utilizador não tem sessão válida ou não tem permissão de edição no projeto.], [A opção *Alterar velocidade* fica indisponível com a indicação do motivo; não é criada nenhuma tarefa.],
    [*E2* — A velocidade pedida não é uma das disponíveis (RN2).], [Rejeita o pedido sem criar tarefa nem reservar quota e indica as velocidades aceites.],
    [*E3* — *(Vídeo)* O vídeo de origem não respeita a matriz de formatos (por exemplo, um resultado WebM) ou excede os limites do perfil atual.], [Não cria a tarefa, indica a restrição e, no perfil Free, sugere a subscrição Premium.],
    [*E4* — *(Vídeo)* A quota diária está esgotada.], [Não cria a tarefa, informa que o limite diário foi atingido e sugere a subscrição Premium (só no perfil Free).],
    [*E5* — O utilizador já tem o número máximo de tarefas ativas.], [Rejeita o pedido sem criar tarefa nem reservar quota e informa que deve aguardar.],
    [*E6* — O armazenamento ou a fila de processamento não estão disponíveis.], [Rejeita o pedido sem criar tarefa nem reservar quota e informa que o serviço está temporariamente indisponível.],
    [*E7* — *(Vídeo)* O processamento falha, excede o tempo máximo (RNG-06) ou o resultado falha a verificação do passo 5.], [Passa a tarefa a *Falhada*, regista o motivo, não publica o resultado, devolve a operação, mantém o original e notifica o utilizador.],
    [*E8* — O vídeo original ou o projeto é removido enquanto a tarefa está ativa.], [Cancela a tarefa, devolve a operação e informa o utilizador de que o vídeo de origem deixou de existir.],
  ),
)

=== Pós-condições

#tabela(
  colunas: (4cm, 1fr),
  [Tipo], [Resultado],
  [Garantia de Sucesso], [Existe um novo vídeo no projeto, à velocidade pedida, com a resolução e a cadência da origem e o áudio a acompanhar a velocidade; o original está inalterado; a tarefa está *Concluída*; foi consumida 1 operação (Free); o utilizador foi notificado.],
  [Garantia Mínima], [O original não é alterado; nenhum resultado parcial fica visível; a tarefa termina *Falhada* ou *Cancelada* com o motivo registado; a operação reservada é devolvida.],
)

=== Regras de Negócio e Restrições

#tabela(
  colunas: (1.4cm, 1fr),
  [ID], [Regra],
  [RN1], [O vídeo de origem tem de respeitar a matriz de formatos (RNG-02) e os limites do perfil que o utilizador tem no momento do pedido (RNG-03).],
  [RN2], [Velocidades disponíveis: 0,5×, 0,75×, 1,25×, 1,5× e 2×. O resultado tem, no máximo, o dobro e, no mínimo, metade da duração da origem.],
  [RN3], [A duração do resultado é a da origem a dividir pela velocidade, com tolerância de ±0,5 s.],
  [RN4], [A resolução e a cadência (fotogramas por segundo) do resultado são as da origem; em câmara lenta há fotogramas repetidos e na aceleração há fotogramas descartados.],
  [RN5], [O áudio, quando existe, passa a ter a mesma velocidade que o vídeo, sem alteração do tom, e mantém-se sincronizado (REQ-VID-COM-028).],
  [RN6], [O resultado pode exceder a duração máxima do perfil (por exemplo, 120 s a partir de um vídeo Free de 60 s a 0,5×), porque é gerado e não submetido; para ser usado como origem de outra ferramenta, aplica-se RN1.],
  [RN7], [Cada pedido aceite conta como 1 operação, reservada na aceitação, consolidada no sucesso e devolvida em falha ou cancelamento; aplicam-se o limite de tarefas ativas e o tempo máximo (RNG-04 a RNG-06).],
  [RN8], [O formato de saída é MP4 (H.264/AAC) (RNG-02); o resultado é um novo vídeo e o original nunca é alterado (RNG-08).],
)

=== Assunções

#tabela(
  colunas: (1.4cm, 1fr),
  [ID], [Assunção],
  [A1], [A alteração de velocidade pode ser feita por uma biblioteca multimédia de uso livre (FFmpeg) num _worker_ dedicado, como as restantes ferramentas de vídeo.],
  [A2], [Os fatores de 0,5× a 2× cobrem os usos mais comuns (câmara lenta e aceleração moderadas); são valores de trabalho da equipa, a confirmar com utilizadores.],
  [A3], [O custo de processamento depende sobretudo da duração do resultado; com o limite de RN2, uma tarefa de câmara lenta custa no máximo cerca do dobro de uma conversão do mesmo vídeo.],
)

=== Questões em Aberto

#tabela(
  colunas: (1.4cm, 1fr, 5cm),
  [ID], [Questão], [Resolução],
  [Q1], [Devem ser aceites fatores mais extremos (0,25× ou 4×)?], [*Adiada*: não no MVP, para limitar o tamanho e o custo dos resultados (RN2, A3).],
  [Q2], [O utilizador deve poder escolher manter o tom original do áudio ou alterá-lo?], [*Resolvida para o MVP*: o tom é sempre mantido (RN5); a opção fica para depois do MVP.],
  [Q3], [Deve ser possível alterar a velocidade só de um intervalo do vídeo?], [*Adiada*: fora do MVP; o utilizador pode recortar primeiro (UC-VID-002) e alterar a velocidade do excerto.],
  [Q4], [O resultado pode exceder os limites de duração do perfil?], [*Resolvida*: sim, por ser um resultado gerado (RN6).],
)
