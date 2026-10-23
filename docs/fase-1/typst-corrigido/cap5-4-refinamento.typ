// Cap. 5.4 — nova secção no fim do capitulo 5 (Exercício 3).
// Os textos refinados substituem os das Tabelas 25 e 26; os IDs novos (COM-053, COM-054, SUBMIT-011)
// entram nessas tabelas pela ordem dos IDs.

== Refinamento dos requisitos

Os requisitos das Tabelas 25 e 26 foram revistos contra quatro critérios: termos vagos, requisitos compostos, ausência de critério mensurável e mais do que uma interpretação possível. O domínio do vídeo é particularmente sujeito a ambiguidade, porque quase todas as grandezas têm unidades (MB, s, px, fps) e porque "rápido" pode querer dizer tempo de resposta ou tempo até ao resultado. A tabela seguinte regista cada requisito alterado; os textos refinados já estão nas Tabelas 25 e 26. Os IDs dos requisitos divididos não se reutilizam: a parte separada recebe um ID novo.

#tab([Requisitos refinados],
  tabela(
    colunas: (2.4cm, 1fr, 1fr, 1fr),
    tamanho: 8.5pt,
    [ID], [Requisito original], [Requisito refinado], [Ambiguidade resolvida],
    [COM-002], [... apresentar os metadados do vídeo selecionado: nome, duração, resolução, tamanho e formato.], [O sistema deve apresentar, para o vídeo selecionado, o nome, a duração (mm:ss), a resolução (largura × altura em px), o tamanho (MB) e o formato (contentor e _codecs_ de vídeo e de áudio).], ["Formato" podia ser só a extensão; ficam definidas as unidades de cada campo.],
    [COM-003], [... validar o contentor, o _codec_ e a integridade de um vídeo a partir do conteúdo do ficheiro ...], [O sistema deve rejeitar um vídeo cujo contentor ou _codecs_, lidos do conteúdo do ficheiro, não pertençam à matriz de RNG-02, ou cuja faixa de vídeo não possa ser lida do primeiro ao último pacote.], ["Integridade" não era verificável; passa a ser a leitura completa da faixa de vídeo.],
    [COM-004], [... tamanho superior a 100 MB no perfil Free ou a 500 MB no perfil Premium.], [O sistema deve rejeitar vídeos com mais de 104 857 600 bytes (100 MB) no perfil _Free_ ou mais de 524 288 000 bytes (500 MB) no perfil Premium.], ["MB" tinha duas leituras (10⁶ ou 2²⁰ bytes); fica o valor exato em bytes, igual ao implementado.],
    [COM-006], [... resolução superior a 1920 × 1080 px no perfil Free ou a 3840 × 2160 px ...], [O sistema deve rejeitar vídeos cujo lado maior exceda 1920 px ou cujo lado menor exceda 1080 px no perfil _Free_ (3840 px e 2160 px no Premium).], [Não era claro se um vídeo vertical de 1080 × 1920 px excede o limite; passa a ser aceite.],
    [COM-015], [... notificar o utilizador quando uma tarefa termina ..., mantendo a notificação pendente se o utilizador não estiver ligado.], [O sistema deve apresentar na interface, em ≤ 5 s após o estado final da tarefa, uma notificação com a ferramenta, o estado final e o motivo; se o utilizador não estiver ligado, deve apresentá-la na próxima abertura da aplicação.], [Faltavam o meio (notificação na interface, sem e-mail), o prazo e o comportamento com a sessão terminada.],
    [COM-022], [... reservar a operação quando aceita a tarefa, consolidá-la quando ... `completed` e estorná-la quando termina em `failed` ou `cancelled`.], [O sistema deve devolver ao saldo diário, no dia em que foi reservada, a operação de uma tarefa que termine em `failed` ou `cancelled`.], [Requisito composto: a reserva já está em COM-021 e a consolidação não tem efeito observável. Fica o dia da devolução, que antes era ambíguo depois da meia-noite.],
    [COM-028], [... preservar a faixa de áudio do original nos vídeos resultantes, sincronizada com a imagem.], [O sistema deve preservar a faixa de áudio do original nos vídeos resultantes com uma diferença de início entre as faixas de áudio e de vídeo ≤ 40 ms; um original sem áudio produz um resultado sem áudio.], ["Sincronizada" não tinha valor nem forma de medir; o limite só estava no critério de aceitação.],
    [COM-033], [... incluir os vídeos ... no descarregamento do projeto em ZIP e excluí-los do descarregamento em PDF, informando o utilizador.], [O sistema deve incluir os vídeos e os resultados de vídeo do projeto numa pasta `videos/` do descarregamento em ZIP.], [Requisito composto; a exclusão do PDF e o aviso passam a COM-053.],
    [COM-053 (novo)], [— (parte de COM-033)], [O sistema deve gerar o descarregamento em PDF só com as imagens do projeto e avisar o utilizador de que os vídeos não estão incluídos.], [Separado de COM-033 para ser verificado isoladamente.],
    [COM-036], [... confirmar a aceitação ou a rejeição ... sem aguardar o processamento. Alvo: ≤ 2 s; validação de um vídeo de 500 MB ≤ 5 s após a receção.], [O sistema deve responder a um pedido de processamento, com aceitação ou rejeição, em ≤ 2 s medidos entre a receção do pedido e o envio da resposta, no ambiente de referência (UC-VID-004/A7).], [Juntava dois alvos de natureza diferente; a validação do envio passa a SUBMIT-011. Fica definido onde começa e acaba a medição.],
    [SUBMIT-011 (novo)], [— (parte de COM-036)], [O sistema deve confirmar ou rejeitar a submissão de um vídeo de até 500 MB em ≤ 5 s medidos a partir do fim da transferência, no ambiente de referência.], [Separa o tempo de resposta da submissão do tempo de transferência, que depende da rede.],
    [COM-041], [... após o reinício de um serviço de vídeo, manter as tarefas em `queued` e terminar como `failed`, com estorno, as que estavam em `processing`.], [O sistema deve, após o reinício de um _worker_ de vídeo, terminar como `failed`, com a operação devolvida, a tarefa que esse _worker_ estava a processar, e manter em `queued` as restantes; o reinício do serviço de projetos não deve alterar o estado de nenhuma tarefa.], ["Serviço de vídeo" tinha várias leituras; o efeito de cada reinício passa a estar definido.],
    [COM-044], [... reproduzíveis nas versões atuais de Chrome e Firefox sem extensões.], [O sistema deve produzir vídeos reproduzíveis sem extensões na última versão estável do Chrome e do Firefox à data do teste, em Windows e Linux.], ["Versões atuais" e o sistema operativo não estavam definidos.],
    [COM-046], [... manter o funcionamento das ferramentas e dos lotes de imagem depois da integração do vídeo.], [O sistema deve produzir, para um projeto de referência com 3 imagens e cada uma das ferramentas de imagem da _baseline_, os mesmos resultados antes e depois da integração do vídeo, incluindo o processamento em lote de um ficheiro ZIP.], [A _baseline_ não tem testes de regressão; o critério "zero regressões" não era verificável sem definir o conjunto de teste.],
    [COM-047], [... acrescentar uma nova ferramenta de vídeo sem alterar os serviços centrais.], [O sistema deve permitir acrescentar uma ferramenta de vídeo alterando apenas o novo _worker_, o registo de ferramentas, o validador dos parâmetros da ferramenta e a entrada no menu da interface.], ["Serviços centrais" não estava definido; passa a ser uma lista fechada do que pode mudar.],
    [COM-049], [... contentores reproduzíveis a partir da documentação.], [O sistema deve arrancar os _workers_ de vídeo e as suas dependências com um único comando documentado, numa máquina com Docker Engine 24 ou superior, 8 GB de RAM e 15 GB de disco livres.], ["Máquina limpa" não tinha requisitos mínimos.],
    [COM-050], [... restringir vídeos, tarefas e resultados a utilizadores autorizados no projeto e usar identificadores e URLs não adivinháveis e temporários.], [O sistema deve recusar o acesso a vídeos, tarefas e resultados a quem não tenha acesso ao projeto, identificando-os por valores não sequenciais.], [Requisito composto; a validade dos URLs passa a COM-054.],
    [COM-054 (novo)], [— (parte de COM-050)], [O sistema deve fornecer URLs de reprodução e de descarga de vídeo válidos durante 15 min a partir da sua emissão.], [Separado de COM-050; torna explícita a diferença face aos URLs de imagem da _baseline_ (60 min).],
    [COM-052], [... apresentar estados, erros, quota e progresso de forma compreensível, atualizando o progresso pelo menos a cada 5 s.], [O sistema deve atualizar o progresso de uma tarefa em `processing` com intervalos ≤ 5 s entre atualizações consecutivas apresentadas ao utilizador.], ["Compreensível" não era verificável; as mensagens de erro já estão em COM-007 e os estados em COM-012. Fica a cadência medida.],
    [FLT-005], [... atualizar a pré-visualização aproximada e o resumo dos valores sempre que um ajuste muda ...], [O sistema deve atualizar a pré-visualização e o resumo dos valores em ≤ 1 s após cada alteração de um ajuste, sem criar tarefa nem consumir quota.], ["Aproximada" e "sempre que" não tinham prazo; fica explícito que a pré-visualização não gasta operações.],
    [SUBMIT-004], [... apresentar o progresso do envio durante a submissão de um vídeo.], [O sistema deve apresentar a percentagem enviada de um vídeo, atualizada pelo menos uma vez por segundo até 100%.], [Faltava a cadência de atualização.],
    [TRIM-011, CONV-006, FLT-008, DET-009], [... concluir o recorte (conversão, filtragem, deteção) de um vídeo de 60 s em 1080p em ≤ 1 min (2, 3, 10 min).], [Mesmo texto, com o tempo medido entre a passagem da tarefa a `processing` e a passagem a `completed`, sem o tempo em fila, no ambiente de referência (UC-VID-004/A7).], ["Concluir em" podia incluir o tempo de espera na fila, que depende da carga.],
  ),
)

=== Conflitos com o sistema existente

Os requisitos refinados foram confrontados com a tabela de impacto (Cap. 6) e com o comportamento real da _baseline_. Os conflitos encontrados e a decisão tomada:

#tab([Conflitos com a solução de base],
  tabela(
    colunas: (3cm, 1fr, 1fr, 2.4cm),
    tamanho: 9pt,
    [Elemento], [Regra da _baseline_], [Decisão para vídeo], [Requisitos],
    [Contagem de operações], [1 operação por ferramenta avançada e por imagem; as básicas não contam.], [1 operação por tarefa de vídeo, qualquer que seja a ferramenta, no mesmo contador diário; as regras de imagem não mudam.], [COM-021],
    [Devolução de operações], [Só no cancelamento e sempre no dia atual; uma falha do _worker_ não devolve.], [Devolução em `failed` e `cancelled`, no dia da reserva, de forma atómica; a regra de imagem mantém-se.], [COM-022, COM-051],
    [Validade dos URLs], [60 min para imagens.], [15 min para vídeos; as imagens mantêm 60 min.], [COM-054],
    [Perfil Anónimo], [Faz operações básicas sobre imagens.], [Sem acesso ao vídeo; mantém as operações sobre imagens.], [COM-001],
    [Tamanho dos pedidos], [Nginx com o limite por omissão (1 MB); ficheiros recebidos em memória.], [Rota de vídeo até 510 MB, com envio em _streaming_.], [SUBMIT-001, SUBMIT-003],
    [Criação de projeto], [Exige pelo menos uma imagem (só no frontend).], [Pode ser criado a partir de um vídeo.], [SUBMIT-002],
    [Eliminação de conta], [Na prática não apagava os projetos (o serviço de utilizadores chamava um endereço errado do serviço de projetos).], [Corrigido nesta fase (Cap. 11); a eliminação apaga projetos, vídeos e tarefas.], [COM-035],
  ),
)
