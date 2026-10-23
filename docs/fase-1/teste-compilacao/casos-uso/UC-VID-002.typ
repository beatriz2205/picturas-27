#import "../template.typ": *

== UC-VID-002 — Recortar intervalo temporal de vídeo

=== Cabeçalho

#tab([Caso de uso UC-VID-002 — Recortar intervalo temporal de vídeo],
  tabela-campos(
    [ID do Caso de Uso], [UC-VID-002],
    [Nome], [Recortar intervalo temporal de vídeo],
    [Versão], [v1.0],
    [Autor], [Grupo],
    [Data], [2026-10-17],
    [Objetivo], [Criar um novo vídeo contendo um intervalo do original.],
    [Âmbito], [Gestão e processamento de vídeo],
    [Ator Principal], [Utilizador registado Free ou Premium],
    [_Stakeholders_ e Interesses], [
      - *Utilizador*: obter um excerto sem perder o original.
      - *Proprietário*: controlar quota, armazenamento e resultados.
    ],
    [Pré-condições], [- O vídeo está validado e associado a projeto acessível.\n- Existe quota disponível.],
    [_Trigger_], [O utilizador escolhe Recortar num vídeo],
  ),
)

=== Fluxo Principal
#tab([UC-VID-002 — Fluxo principal],
  tabela(
    colunas: (1.2cm, 1fr, 1fr),
    [Passo], [Ação do Ator], [Resposta do Sistema],
    [1], [Seleciona um vídeo e escolhe Recortar.], [Apresenta o editor temporal.],
    [2], [Define início, fim e opções de saída.], [Valida intervalo, autorização e limites.],
    [3], [Confirma a operação.], [Cria trabalho em fila e reserva quota.],
    [4], [—], [Processa, comunica progresso, valida e guarda o resultado.],
    [5], [Consulta o resultado.], [Disponibiliza o novo vídeo e o estado concluído.],
  ),
)

=== Fluxos Alternativos
#tab([UC-VID-002 — Fluxos alternativos],
  tabela(
    colunas: (4cm, 1fr),
    [FA1 — Fim omitido], [No passo 2, o sistema usa o fim do vídeo como instante final.],
    [FA2 — Cancelamento em fila], [No passo 3, cancela o trabalho, liberta a reserva e não cria resultado.],
    [FA3 — Pedido repetido], [No passo 3, reutiliza o trabalho ativo com os mesmos parâmetros.],
  ),
)

=== Exceções
#tab([UC-VID-002 — Exceções],
  tabela(
    colunas: (1fr, 1fr),
    [Intervalo vazio, invertido ou fora da duração], [Rejeita e apresenta a razão; não cria trabalho.],
    [Quota esgotada ou vídeo inacessível], [Rejeita sem revelar conteúdo e sem alterar o projeto.],
    [Falha do worker ou armazenamento], [Marca `failed`, limpa parciais e liberta quota aplicável.],
  ),
)

=== Pós-condições
#tabela(
  colunas: (4cm, 1fr),
  [Tipo], [Resultado],
  [Garantia de Sucesso], [Novo vídeo associado ao projeto, com o intervalo solicitado.],
  [Garantia Mínima], [Original intacto e nenhum resultado parcial acessível.],
)

=== Regras de Negócio e Restrições
#tabela(
  colunas: (1.4cm, 1fr),
  [ID], [Regra],
  [RN1], [O intervalo deve ser não vazio e estar contido na duração do original.],
  [RN2], [Um trabalho aceite reserva uma operação; um cancelamento sem processamento liberta-a.],
  [RN3], [O original nunca é alterado e resultados parciais não são publicados.],
)

=== Assunções
#tabela(
  colunas: (1.4cm, 1fr),
  [A1], [O áudio é preservado quando suportado pelo formato de saída.],
  [A2], [A saída do MVP segue a matriz de formatos aprovada para vídeo.],
)

=== Questões em Aberto
#tabela(
  colunas: (1.4cm, 1fr, 5cm),
  [ID], [Questão], [Resolução],
  [Q1], [A saída WebM é obrigatória no MVP?], [Adiada; o MVP segue a matriz aprovada.],
  [Q2], [O cancelamento durante processamento é garantido?], [Decidida: best effort; nunca publica parcial.],
)
