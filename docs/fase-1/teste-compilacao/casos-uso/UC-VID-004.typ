#import "../template.typ": *
== UC-VID-004 — Aplicar filtros visuais e ajustes de cor
=== Cabeçalho
#tab([Caso de uso UC-VID-004 — Aplicar filtros em vídeo],
  tabela-campos(
    [ID do Caso de Uso], [UC-VID-004], [Nome], [Aplicar filtros visuais e ajustes de cor],
    [Versão], [v1.0], [Autor], [Grupo], [Data], [2026-10-17],
    [Objetivo], [Aplicar preset ou ajustes de brilho, contraste e saturação a um vídeo.],
    [Âmbito], [Filtros, workers de vídeo e armazenamento],
    [Ator Principal], [Utilizador registado Free ou Premium],
    [_Stakeholders_ e Interesses], [- *Utilizador*: personalizar o vídeo.\n- *Proprietário*: preservar original, quota e desempenho.],
    [Pré-condições], [- Vídeo validado e projeto acessível.\n- Parâmetros válidos.],
    [_Trigger_], [O utilizador escolhe filtro ou ajuste],
  ),
)
=== Fluxo Principal
#tab([UC-VID-004 — Fluxo principal], tabela(
  colunas: (1.2cm, 1fr, 1fr), [Passo], [Ação do Ator], [Resposta do Sistema],
  [1], [Escolhe preset ou ajusta brilho, contraste e saturação.], [Apresenta configuração e valida intervalos.],
  [2], [Confirma.], [Reserva quota e cria trabalho `queued`.],
  [3], [—], [Extrai fotogramas e aplica ajustes pela ordem original.],
  [4], [—], [Recompõe, valida, guarda novo vídeo e comunica progresso.],
  [5], [Consulta resultado.], [Apresenta resultado `completed` e metadados.],
))
=== Fluxos Alternativos
#tab([UC-VID-004 — Fluxos alternativos], tabela(
  colunas: (4cm, 1fr), [FA1 — Preset], [Preenche os parâmetros correspondentes.],
  [FA2 — Repor], [Volta ao estado neutro antes da confirmação.],
  [FA3 — Sair da página], [O trabalho continua e pode ser consultado depois.],
))
=== Exceções
#tab([UC-VID-004 — Exceções], tabela(
  colunas: (1fr, 1fr), [Parâmetro inválido], [Rejeita sem criar trabalho.],
  [Falha durante processamento], [Marca `failed`, remove temporários e preserva original.],
  [Quota esgotada], [Rejeita sem alterar o contador de operações.],
))
=== Pós-condições
#tabela(colunas: (4cm, 1fr), [Tipo], [Resultado],
  [Garantia de Sucesso], [Novo vídeo filtrado e validado associado ao projeto.],
  [Garantia Mínima], [Original intacto e sem fotogramas parciais acessíveis.],
)
=== Regras de Negócio e Restrições
#tabela(colunas: (1.4cm, 1fr), [ID], [Regra],
  [RN1], [Brilho, contraste e saturação devem estar nos intervalos definidos pela interface.],
  [RN2], [O resultado é novo recurso; o original não é substituído.],
  [RN3], [Uma operação aceite reserva quota e é cancelável quando possível.],
)
=== Assunções
#tabela(colunas: (1.4cm, 1fr), [A1], [A lógica de filtros de imagem é reutilizada através de adaptador de vídeo.],
  [A2], [Presets básicos entram no MVP; presets personalizados ficam para evolução.],
)
=== Questões em Aberto
#tabela(colunas: (1.4cm, 1fr, 5cm), [ID], [Questão], [Resolução],
  [Q1], [Existem limites diferentes por plano?], [Decidida: limites comuns no MVP; diferenciação adiada.],
  [Q2], [Entram presets personalizados no MVP?], [Adiada; apenas presets básicos no MVP.],
)
