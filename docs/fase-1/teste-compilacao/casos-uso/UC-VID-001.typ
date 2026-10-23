#import "../template.typ": *
== UC-VID-001 — Carregar/submeter vídeo para um projeto
=== Cabeçalho
#tab([Caso de uso UC-VID-001 — Carregar/submeter vídeo],
  tabela-campos(
    [ID do Caso de Uso], [UC-VID-001], [Nome], [Carregar/submeter vídeo para um projeto],
    [Versão], [v1.0], [Autor], [Grupo], [Data], [2026-10-17],
    [Objetivo], [Guardar um vídeo validado num projeto para uso nas operações de vídeo.],
    [Âmbito], [Projetos, armazenamento e validação de vídeo],
    [Ator Principal], [Utilizador registado Free ou Premium],
    [_Stakeholders_ e Interesses], [- *Utilizador*: carregar vídeo sem perder informação.\n- *Proprietário*: controlar espaço e segurança.],
    [Pré-condições], [- Sessão ativa.\n- Projeto acessível.\n- Ficheiro disponível.],
    [_Trigger_], [O utilizador escolhe adicionar vídeo ao projeto],
  ),
)
=== Fluxo Principal
#tab([UC-VID-001 — Fluxo principal], tabela(
  colunas: (1.2cm, 1fr, 1fr), [Passo], [Ação do Ator], [Resposta do Sistema],
  [1], [Abre projeto e escolhe adicionar vídeo.], [Apresenta seletor e limites aplicáveis.],
  [2], [Seleciona ficheiro e confirma.], [Inicia carregamento e apresenta progresso.],
  [3], [—], [Valida formato, codec, dimensão, duração e integridade.],
  [4], [—], [Guarda ficheiro completo e associa-o ao projeto.],
  [5], [Consulta projeto.], [Apresenta vídeo carregado.],
))
=== Fluxos Alternativos
#tab([UC-VID-001 — Fluxos alternativos], tabela(
  colunas: (4cm, 1fr), [FA1 — Cancelar confirmação], [Cancela sem alterar o projeto.],
  [FA2 — Repetir carregamento], [Confirmação repetida não duplica; nova submissão deliberada cria nova entrada.],
))
=== Exceções
#tab([UC-VID-001 — Exceções], tabela(
  colunas: (1fr, 1fr), [Formato, codec ou limite inválido], [Rejeita antes da associação e apresenta a razão.],
  [Sessão ou projeto inválido], [Rejeita sem revelar dados.],
  [Falha de rede ou armazenamento], [Limpa parcial e não cria `VideoAsset` utilizável.],
))
=== Pós-condições
#tabela(colunas: (4cm, 1fr), [Tipo], [Resultado],
  [Garantia de Sucesso], [Existe `VideoAsset` completo associado ao projeto.],
  [Garantia Mínima], [Nenhum ficheiro incompleto é utilizável ou visível.],
)
=== Regras de Negócio e Restrições
#tabela(colunas: (1.4cm, 1fr), [ID], [Regra],
  [RN1], [Só utilizadores autenticados e autorizados podem carregar vídeo.],
  [RN2], [O upload não consome quota de operações de processamento.],
  [RN3], [O MVP propõe MP4/H.264/AAC, até 500 MB, 10 minutos e 1080p; a matriz final requer aprovação.],
)
=== Assunções
#tabela(colunas: (1.4cm, 1fr), [A1], [O armazenamento de projetos existente suporta `VideoAsset`.],
  [A2], [Os limites Free e Premium são comuns no MVP.],
)
=== Questões em Aberto
#tabela(colunas: (1.4cm, 1fr, 5cm), [ID], [Questão], [Resolução],
  [Q1], [WebM e outros codecs entram no MVP?], [Adiada para aprovação da matriz de compatibilidade.],
  [Q2], [É permitido carregamento anónimo?], [Decidida: não no MVP; é necessária sessão.],
)
