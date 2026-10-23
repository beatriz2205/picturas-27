#import "../template.typ": *
== UC-VID-005 — Detetar pessoas e objetos por fotograma
=== Cabeçalho
#tab([Caso de uso UC-VID-005 — Detetar pessoas e objetos],
  tabela-campos(
    [ID do Caso de Uso], [UC-VID-005], [Nome], [Detetar pessoas e objetos por fotograma],
    [Versão], [v1.0], [Autor], [Grupo], [Data], [2026-10-17],
    [Objetivo], [Executar deteção de pessoas e/ou objetos e guardar resultados temporais.],
    [Âmbito], [Workers de IA, resultados estruturados e projetos],
    [Ator Principal], [Utilizador registado Free ou Premium],
    [_Stakeholders_ e Interesses], [- *Utilizador*: consultar deteções.\n- *Proprietário*: controlar custo e privacidade.],
    [Pré-condições], [- Vídeo validado e projeto acessível.\n- Ferramenta e quota disponíveis.],
    [_Trigger_], [O utilizador escolhe Detetar no vídeo],
  ),
)
=== Fluxo Principal
#tab([UC-VID-005 — Fluxo principal], tabela(
  colunas: (1.2cm, 1fr, 1fr), [Passo], [Ação do Ator], [Resposta do Sistema],
  [1], [Seleciona `people_ai`, `obj_ai` ou ambas.], [Valida configuração e permissões.],
  [2], [Confirma.], [Reserva uma operação e cria trabalho `queued`.],
  [3], [—], [Extrai fotogramas e executa ferramentas.],
  [4], [—], [Associa deteções ao índice/instante e guarda resultado estruturado.],
  [5], [Consulta resultados.], [Disponibiliza dados quando `completed`.],
))
=== Fluxos Alternativos
#tab([UC-VID-005 — Fluxos alternativos], tabela(
  colunas: (4cm, 1fr), [FA1 — Duas ferramentas], [Executa ambas no mesmo trabalho e conta como uma operação.],
  [FA2 — Cancelamento], [Invalida, limpa temporários e liberta quota não consumida.],
  [FA3 — Vídeo anotado], [Guarda apenas dados estruturados no MVP; vídeo anotado fica adiado.],
))
=== Exceções
#tab([UC-VID-005 — Exceções], tabela(
  colunas: (1fr, 1fr), [Ferramenta indisponível], [Rejeita ou marca `failed` sem publicar incompleto.],
  [Falha de fila, worker ou armazenamento], [Regista falha, limpa temporários e preserva original.],
  [Sem quota ou autorização], [Rejeita antes de iniciar.],
))
=== Pós-condições
#tabela(colunas: (4cm, 1fr), [Tipo], [Resultado],
  [Garantia de Sucesso], [Deteções estruturadas consultáveis por fotograma/instante.],
  [Garantia Mínima], [Original preservado e resultado incompleto não publicado.],
)
=== Regras de Negócio e Restrições
#tabela(colunas: (1.4cm, 1fr), [ID], [Regra],
  [RN1], [Pelo menos uma ferramenta deve ser selecionada.],
  [RN2], [Duas ferramentas no mesmo vídeo correspondem a uma operação de quota.],
  [RN3], [Cada deteção conserva referência temporal ao fotograma.],
)
=== Assunções
#tabela(colunas: (1.4cm, 1fr), [A1], [Workers existentes de IA são reutilizados através de adaptador de vídeo.],
  [A2], [Vídeo anotado não faz parte do MVP.],
)
=== Questões em Aberto
#tabela(colunas: (1.4cm, 1fr, 5cm), [ID], [Questão], [Resolução],
  [Q1], [O vídeo anotado é obrigatório?], [Adiada; o MVP guarda dados estruturados.],
  [Q2], [A quota é uma por ferramenta?], [Decidida: uma por trabalho, mesmo com duas ferramentas.],
)
