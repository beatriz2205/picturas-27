#import "../template.typ": *

== UC-VID-003 — Converter formato ou resolução

=== Cabeçalho
#tab([Caso de uso UC-VID-003 — Converter formato ou resolução],
  tabela-campos(
    [ID do Caso de Uso], [UC-VID-003],
    [Nome], [Converter formato ou resolução],
    [Versão], [v1.0],
    [Autor], [Grupo],
    [Data], [2026-10-17],
    [Objetivo], [Criar cópia do vídeo num formato ou resolução suportados.],
    [Âmbito], [Gestão e transcodificação de vídeo],
    [Ator Principal], [Utilizador registado Free ou Premium],
    [_Stakeholders_ e Interesses], [- *Utilizador*: obter o formato adequado.\n- *Proprietário*: controlar custos e armazenamento.],
    [Pré-condições], [- Vídeo validado e projeto acessível.\n- Opção de saída válida e quota disponível.],
    [_Trigger_], [O utilizador escolhe Converter],
  ),
)

=== Fluxo Principal
#tab([UC-VID-003 — Fluxo principal],
  tabela(
    colunas: (1.2cm, 1fr, 1fr),
    [Passo], [Ação do Ator], [Resposta do Sistema],
    [1], [Seleciona o vídeo e escolhe Converter.], [Apresenta formatos e resoluções disponíveis.],
    [2], [Escolhe formato e/ou resolução.], [Valida compatibilidade e alteração efetiva.],
    [3], [Confirma.], [Cria trabalho em fila e reserva quota.],
    [4], [—], [Converte, comunica progresso e verifica o resultado.],
    [5], [Consulta o resultado.], [Disponibiliza uma cópia associada ao original.],
  ),
)

=== Fluxos Alternativos
#tab([UC-VID-003 — Fluxos alternativos],
  tabela(
    colunas: (4cm, 1fr),
    [FA1 — Só formato], [Conserva a resolução quando a combinação for suportada.],
    [FA2 — Só resolução], [Conserva o formato quando a combinação for suportada.],
    [FA3 — Sem alteração], [Rejeita ou pede confirmação explícita antes de processar.],
  ),
)

=== Exceções
#tab([UC-VID-003 — Exceções],
  tabela(
    colunas: (1fr, 1fr),
    [Opção não suportada], [Rejeita antes de criar trabalho e apresenta alternativas válidas.],
    [Falha de transcodificação ou armazenamento], [Marca `failed`, limpa parciais e mantém o original.],
    [Quota ou autorização inválida], [Rejeita sem iniciar processamento.],
  ),
)

=== Pós-condições
#tabela(
  colunas: (4cm, 1fr),
  [Tipo], [Resultado],
  [Garantia de Sucesso], [Existe uma cópia no formato/resolução confirmados.],
  [Garantia Mínima], [Original intacto e sem ficheiro parcial acessível.],
)

=== Regras de Negócio e Restrições
#tabela(
  colunas: (1.4cm, 1fr),
  [ID], [Regra],
  [RN1], [Só são apresentadas combinações de formato e resolução suportadas.],
  [RN2], [A conversão cria novo recurso e reserva uma operação.],
  [RN3], [Cancelamento e falha não publicam resultados incompletos.],
)

=== Assunções
#tabela(
  colunas: (1.4cm, 1fr),
  [A1], [A proposta inicial de saída é MP4/H.264/AAC até 1080p, sujeita a aprovação.],
  [A2], [A diferenciação de limites entre planos fica fora do MVP.],
)

=== Questões em Aberto
#tabela(
  colunas: (1.4cm, 1fr, 5cm),
  [ID], [Questão], [Resolução],
  [Q1], [Quais os formatos/codecs de entrada?], [Adiada para aprovação da matriz de compatibilidade.],
  [Q2], [Quais as resoluções predefinidas?], [Adiada; a proposta inicial é registada em A1.],
)
