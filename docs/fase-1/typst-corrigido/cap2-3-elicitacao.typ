// Cap. 2.3 — substitui a secção "Elicitação de requisitos" do capitulo 2 (Exercício 4).

== Elicitação de requisitos

O PictuRAS é um sistema _brownfield_: já tem documento de requisitos, documento de arquitetura e uma implementação feita por equipas anteriores. Isto mudou a elicitação em dois pontos. Primeiro, a documentação e o código da _baseline_ foram tratados como fontes de requisitos de primeira ordem, e não só como leitura de contexto. Segundo, decisões tomadas para imagem e nunca escritas como requisito (a quota diária só para ferramentas avançadas, o processamento por projeto com _tokens_ de execução, o descarregamento em ZIP e PDF) condicionam o que é razoável fazer para vídeo e deram origem aos requisitos ALT.

Muitos dos valores fixados nos Cap. 3 a 5 (limites por perfil, tempos, formatos, contagem de operações) foram *decididos pela equipa* e não recolhidos junto de ninguém. Esta secção distingue o que foi elicitado do que foi assumido, indica como cada assunção seria validada e lista as lacunas que ficam.

=== Partes interessadas

#tab([Partes interessadas na elicitação do vídeo],
  tabela(
    colunas: (3.2cm, 1fr, 1fr),
    [Parte interessada], [O que sabe que as outras não sabem], [Envolvimento nesta fase],
    [Utilizador final _Free_ e Premium], [Que vídeos tem de facto (dispositivo, formato, duração), quanto tempo está disposto a esperar e se percebe a interface (linha temporal do recorte, pré-visualização dos filtros, painel de tarefas).], [Não foi envolvido diretamente; representado pela equipa. É a lacuna principal (ver testes de usabilidade abaixo).],
    [Utilizador Anónimo], [Se a exclusão do vídeo (RNG-01) o leva a registar-se ou a desistir.], [Não envolvido; decisão tomada pela equipa.],
    [Convidado por _link_], [Se espera usar a quota do proprietário ou a sua (RNG-07).], [Não envolvido; regra derivada da partilha da _baseline_.],
    [Docente (Cliente e Proprietário do Sistema)], [Âmbito do MVP, critérios de aceitação e os valores de negócio: limites por perfil, quota, retenção, prioridade Premium.], [Orientações das aulas e do enunciado; os valores de RNG-03 a RNG-05 ficam a confirmar com o docente.],
    [Equipa da solução de base], [Porque é que a arquitetura é como é e o que é caro alterar.], [Indisponível; substituída pela análise da documentação e do código.],
    [Equipa de Operações], [Custo de CPU, memória e armazenamento de cada ferramenta; o que é preciso para diagnosticar falhas.], [Papel assumido pela equipa; valores medidos no protótipo (Cap. 10).],
    [Equipa de Desenvolvimento], [O que é exequível até ao fim da Fase 1 e com que risco.], [Toda a equipa, em _brainstorming_ e na implementação.],
  ),
)

=== Técnicas de elicitação

Foram aplicadas três técnicas e propostas outras três. A escolha segue o contexto _brownfield_: a análise da documentação e do código foi a fonte mais produtiva, porque responde a perguntas que mais ninguém disponível sabia responder; a prototipagem é a única forma de validar a interface com quem a vai usar.

#tab([Técnicas de elicitação aplicadas e propostas],
  tabela(
    colunas: (2.8cm, 1.6cm, 1fr, 1fr, 2.6cm),
    tamanho: 9pt,
    [Técnica], [Estado], [Porquê neste contexto e que informação procura], [Exemplos de perguntas ou atividades], [Requisitos ligados],
    [Análise da documentação e do código da _baseline_], [Aplicada], [Num sistema existente, é a fonte das restrições herdadas. Procura: modelo de quota, processamento por projeto, filas, limites da infraestrutura para ficheiros grandes.], [Que pontos do código assumem que o artefacto é uma imagem? Como é contada e reposta uma operação (`users/routes/users.js`)? Que tamanho máximo aceita o Nginx?], [ALT: COM-001, COM-016, COM-021, COM-022, COM-032, COM-033, COM-035; RNG-01, RNG-04, RNG-05],
    [_Brainstorming_ da equipa], [Aplicada], [Escolher funcionalidades que reutilizem as ferramentas de imagem existentes e cubram o ciclo completo de uma tarefa.], [Que ferramentas de imagem fazem sentido por fotograma? Que funcionalidade obriga a montar a infraestrutura comum (fila, estados, quota)?], [UC-VID-001 a UC-VID-005; RNG-02],
    [Prototipagem (protótipo funcional)], [Aplicada às medições; proposta para a interface], [O MVP serviu de protótipo para medir os alvos de desempenho (Cap. 10). Falta usá-lo para validar a interface com utilizadores finais (ver abaixo).], [Medir a aceitação de 20 pedidos; validar um vídeo de 500 MB; 101 tarefas em fila.], [COM-036, COM-037; TRIM-001, TRIM-002, FLT-005, COM-013, COM-052],
    [Entrevista ao docente (Proprietário do Sistema)], [Proposta], [Os valores de negócio não estão em nenhum documento; só o cliente os pode confirmar.], ["Os limites de 100 MB e 60 s no _Free_ servem a oferta? Uma tarefa de vídeo deve pesar o mesmo que uma operação avançada de imagem? 30 dias de histórico chegam?"], [COM-004 a COM-006, COM-018, COM-019, COM-021, COM-043],
    [Análise de concorrentes (_benchmarking_)], [Proposta], [Mostra o que os utilizadores já esperam de editores de vídeo online (formatos, limites gratuitos, tempos de espera).], [Comparar formatos aceites, duração e tamanho máximos do plano gratuito e saídas disponíveis em 3 editores online (por exemplo, Kapwing, Clipchamp, Canva).], [COM-003, COM-004 a COM-006, COM-045, CONV-001],
    [Questionário curto], [Proposta], [Recolhe dados quantitativos que o _benchmarking_ não dá: dispositivos e vídeos reais dos utilizadores.], ["De que dispositivo saem os seus vídeos?" "Que duração têm normalmente?" "Quanto tempo esperaria por um recorte antes de desistir?"], [COM-005, COM-045, TRIM-011, CONV-006],
  ),
)

*Prototipagem e validação da interface com o utilizador final.* As funcionalidades de vídeo dependem muito da interface: a linha temporal do recorte (TRIM-001, TRIM-002), a pré-visualização aproximada dos filtros (FLT-005), o painel de tarefas com progresso e cancelamento (COM-013, COM-016), as mensagens de rejeição com o limite e a sugestão Premium (COM-007, COM-024) e a consulta das deteções por fotograma (DET-007). Todas estas decisões foram tomadas pela equipa sem um utilizador final as ver. A validação proposta tem duas etapas:

+ *Protótipos de baixa fidelidade* (esboços dos ecrãs de recorte, filtros e painel de tarefas), mostrados a 3 a 5 utilizadores antes da implementação, para corrigir o fluxo cedo.
+ *Testes de usabilidade com o protótipo funcional*: 5 utilizadores com perfil _Free_, método _think-aloud_, com tarefas como "recortar os segundos 10 a 20 de um vídeo", "aplicar Sépia e aumentar o brilho", "cancelar uma tarefa em curso" e "perceber porque é que um vídeo foi recusado". Medidas: taxa de sucesso por tarefa (alvo ≥ 80%), tempo por tarefa, erros e questionário SUS (alvo ≥ 68).

Os resultados alimentariam diretamente os requisitos de usabilidade (COM-052) e os critérios de aceitação de TRIM-001, FLT-005 e COM-013.

=== Validação das assunções

#tab([Assunções e como seriam validadas],
  tabela(
    colunas: (1.3cm, 1fr, 2.2cm, 2.3cm, 1fr, 1fr, 2.2cm),
    tamanho: 8.5pt,
    [ID], [Assunção], [Requisitos], [Técnica], [Como validar], [Risco se for falsa], [Estado],
    [AS-01], [Os limites _Free_ (100 MB, 60 s, 1080p) cobrem o uso típico de um utilizador gratuito (UC-VID-001/A3).], [COM-004 a COM-006], [_Benchmarking_ + questionário], [Comparar com os planos gratuitos de 3 editores; perguntar a duração típica dos vídeos.], [Plano _Free_ inútil na prática, ou custo excessivo para o proprietário.], [Por validar],
    [AS-02], [MP4/H.264/AAC cobre a maioria dos vídeos submetidos (UC-VID-001/A2, RNG-02).], [COM-003, COM-045], [Questionário + _benchmarking_], [Perguntar o dispositivo de origem; verificar o formato por omissão dos telemóveis atuais.], [Alto: vários telemóveis gravam por omissão em HEVC/MOV, que o MVP rejeita.], [Por validar],
    [AS-03], [Uma tarefa de vídeo deve contar como 1 operação, como uma ferramenta avançada de imagem (RNG-04).], [COM-021, COM-022], [Entrevista ao docente], [Confirmar com o Proprietário do Sistema o peso de uma tarefa face ao custo medido.], [Quota desajustada ao custo real de processamento.], [Por validar],
    [AS-04], [Os utilizadores aceitam os tempos de processamento alvo (TRIM-011 ≤ 1 min, CONV-006 ≤ 2 min, FLT-008 ≤ 3 min, DET-009 ≤ 10 min).], [TRIM-011, CONV-006, FLT-008, DET-009], [Prototipagem + questionário], [Protótipo com tempos reais; registar desistências e perguntar o tempo tolerável.], [Funcionalidade abandonada; revisão do modelo assíncrono.], [Por validar],
    [AS-05], [Um pedido é aceite em ≤ 2 s (UC-VID-002/RN13).], [COM-036], [Prototipagem (medição)], [Medir a latência de aceitação no ambiente de referência.], [Interface lenta a confirmar pedidos.], [Validada: 141 ms (Cap. 10)],
    [AS-06], [A validação de um vídeo de 500 MB demora ≤ 5 s após a receção.], [SUBMIT-011], [Prototipagem (medição)], [Medir a validação de um MP4 de ~500 MB.], [Espera longa depois do envio.], [Validada: 0,69 a 0,83 s com 469 MB],
    [AS-07], [5 réplicas de _worker_ sustentam 5 tarefas em simultâneo e 100 em fila (UC-VID-004/A10).], [COM-037], [Prototipagem (teste de carga)], [6 tarefas simultâneas e 101 tarefas em fila.], [Saturação da fila.], [Validada com o _worker_ de teste (101 tarefas em 30 s); falta com as ferramentas reais],
    [AS-08], [O custo por fotograma permite cumprir o tempo máximo de 15 min por minuto de vídeo (UC-VID-004/A17).], [COM-040], [Prototipagem (medição)], [Medir cada ferramenta com vídeos de 60 s e 10 min.], [Tarefas Premium longas terminam sempre por tempo.], [Por validar],
    [AS-09], [40 ms de dessincronização áudio/vídeo é impercetível (UC-VID-004/A9, ITU-R BT.1359).], [COM-028], [Referência externa + medição], [Medir a diferença de início entre as faixas nos resultados.], [Áudio visivelmente desfasado.], [Fonte validada; medição por fazer],
    [AS-10], [Uma pré-visualização aproximada no navegador é suficiente para decidir os filtros (UC-VID-004/A4).], [FLT-005], [Teste de usabilidade], [Comparar a pré-visualização com o resultado e perguntar se correspondeu ao esperado.], [Utilizador gasta quota em resultados que não queria.], [Por validar],
    [AS-11], [1 tarefa ativa no _Free_ não frustra o utilizador (RNG-05).], [COM-018], [Questionário + teste de usabilidade], [Observar quantas vezes o limite é atingido numa sessão típica.], [Abandono ou pressão excessiva para o Premium.], [Por validar],
    [AS-12], [30 dias de histórico de tarefas chegam (RNG-08).], [COM-043], [Entrevista ao docente], [Confirmar com o Proprietário do Sistema e face ao RGPD.], [Perda de histórico útil ou retenção sem justificação.], [Por validar],
  ),
)

=== Lacunas

Os requisitos seguintes têm origem num caso de uso, mas o *valor* que fixam não tem origem identificável além da decisão da equipa: a duração mínima de 1 s do recorte (TRIM-003); o limiar de confiança por omissão de 0,5 (DET-002); a lista de resoluções predefinidas (COM-010); os três estilos de filtro, em particular "Vintage" (FLT-001); a tolerância de ±0,5 s (COM-027, TRIM-009); os prazos de limpeza de 1 h e 24 h (COM-038); a validade de 15 min dos URLs (COM-050); a prioridade Premium na fila (COM-019); e a criação de um projeto a partir de um vídeo (SUBMIT-002), que vem só do _brainstorming_.

Ficam registados como valores de trabalho do MVP. Os de negócio (COM-010, COM-019, COM-038, COM-050) são levados à entrevista com o docente; os de interface (TRIM-003, DET-002, FLT-001) aos testes de usabilidade; os técnicos (COM-027, TRIM-009) confirmam-se por medição no protótipo.

=== Reflexão

O principal desafio foi a falta de acesso a utilizadores reais: a equipa fez de utilizador, o que favorece decisões confortáveis para quem implementa (por exemplo, aceitar só MP4/H.264, quando muitos telemóveis gravam em HEVC). A mitigação é o questionário curto e os testes de usabilidade com 5 utilizadores, que custam pouco e têm o maior retorno. O segundo desafio foram as necessidades contraditórias: o Proprietário do Sistema quer limites que controlem o custo e o utilizador quer limites largos; a equipa resolveu-as com valores de trabalho explícitos e marcados para confirmação, em vez de os apresentar como requisitos firmes. O terceiro foi a indisponibilidade da equipa original: a documentação estava desatualizada (refere MinIO, o repositório usa SeaweedFS), e só a inspeção do código e os testes revelaram comportamentos não documentados, como a remoção de conta que não apagava os projetos e o _WebSocket Gateway_ que não volta a ligar-se ao RabbitMQ (Cap. 11). Por fim, o desconhecimento técnico dos interlocutores: perguntar a um utilizador que _codec_ usa não produz respostas úteis; as perguntas devem ser sobre o dispositivo e o uso, e a equipa traduz isso em formatos.
