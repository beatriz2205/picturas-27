== Visão geral das alterações

O suporte a vídeo mantém a arquitetura de microsserviços da solução de base: cada ferramenta de vídeo é um _worker_ próprio que consome a sua fila no RabbitMQ, e o serviço de projetos continua a ser o ponto de orquestração. O que muda é que o processamento de vídeo passa a ser seguido por *tarefa*, com estado persistente, em vez de por projeto. A tabela lista os componentes novos e os componentes existentes que foram alterados; os restantes (ferramentas de imagem, `subscriptions`, MongoDB, SeaweedFS) não mudam. Na coluna *Requisitos*, os IDs aparecem sem o prefixo `REQ-VID-`.

#tab([Componentes novos e alterados],
  tabela(
    colunas: (3.2cm, 1.8cm, 1fr, 3cm),
    tamanho: 9pt,
    [Componente / serviço], [Estado], [Responsabilidade / alteração], [Requisitos],
    [`nginx`], [Alterado], [Rota própria para a submissão de vídeo, com pedidos até 510 MB, sem _buffering_ e com tempos de espera de 600 s; o limite por omissão (1 MB) mantém-se nas restantes rotas.], [SUBMIT-001, SUBMIT-003, COM-004],
    [`api_gateway`], [Alterado], [Novas rotas de vídeo (submissão, tarefas, cancelamento, URLs, limites), reencaminhadas ao serviço de projetos em _stream_, sem guardar o corpo em memória.], [SUBMIT-001, SUBMIT-004, COM-001],
    [`projects`], [Alterado], [Novo módulo de vídeo: modelos `videoAsset` e `videoTask`; validação do ficheiro pelo conteúdo (`ffprobe`) e dos limites do perfil; aceitação de tarefas com reserva de operação, prioridade e limite de tarefas ativas; registo das ferramentas (`VIDEO_TOOLS`) com o validador de cada uma; consumo dos eventos dos _workers_; _watchdog_ do tempo máximo e _janitor_ de temporários e devoluções. As filas das ferramentas são criadas a partir do registo.], [COM-001 a 031, COM-036 a 043, COM-047, COM-051; SUBMIT-001 a 010],
    [`users`], [Alterado], [Reserva, consolidação e devolução atómicas de uma operação por tarefa de vídeo, no dia da reserva e partilhadas com as ferramentas avançadas de imagem. Corrigido o endereço do serviço de projetos usado na eliminação de conta (Cap. 11).], [COM-021, COM-022, COM-051, COM-035],
    [`img_storage`], [Alterado], [Envio de vídeos para o armazenamento em _stream_ e URLs temporários de reprodução e descarga.], [SUBMIT-001, COM-030, COM-054],
    [`ws_gateway`], [Alterado], [Novo evento `video-task-update`, enviado ao utilizador que iniciou a tarefa e a quem tem o projeto aberto.], [COM-013, COM-015, COM-052],
    [RabbitMQ (`definitions.json`)], [Alterado], [Uma fila por ferramenta de vídeo com prioridade (`x-max-priority`), a fila `video_events_queue` para os eventos dos _workers_ e a _exchange_ `video_cancel` para o cancelamento.], [COM-019, COM-016, COM-037],
    [`Tools/video_utils`], [Novo], [Biblioteca partilhada pelos _workers_: ciclo de vida de uma tarefa (eventos, progresso, cancelamento, tempo máximo), execução do FFmpeg e verificação do resultado antes de o publicar.], [COM-013, COM-027, COM-029, COM-039, COM-040, COM-047],
    [`video_trim_worker`], [Novo], [Recorte ao fotograma com FFmpeg (2 réplicas).], [TRIM-005, TRIM-009, TRIM-011],
    [`video_convert_worker`], [Novo], [Conversão para MP4/H.264/AAC ou WebM/VP9/Opus e redução de resolução.], [CONV-001, CONV-002, CONV-006],
    [`video_filter_worker`], [Novo], [Brilho, contraste e saturação aplicados a cada fotograma, com as fórmulas das ferramentas de imagem.], [FLT-006 a FLT-008],
    [`video_detect_worker`], [Novo], [Deteção de pessoas e objetos por fotograma com o modelo YOLO usado pelas ferramentas `people_ai` e `obj_ai`; resultado JSON e vídeo anotado opcional.], [DET-002 a DET-006, DET-008, DET-009],
    [`video_speed_worker`], [Novo], [Alteração da velocidade do vídeo e do áudio (tom mantido), com a resolução e a cadência da origem.], [SPD-002 a SPD-004, SPD-006],
    [`video_noop_worker`], [Novo (teste)], [Copia o vídeo sem o alterar; usado só nos testes da cadeia e de capacidade, fora de produção.], [COM-037, COM-047],
    [`frontend`], [Alterado], [Submissão de vídeos com progresso, separador de vídeos no projeto, menu de ferramentas de vídeo, editores de cada ferramenta, painel de tarefas e visualizador de deteções.], [SUBMIT-004, COM-002, COM-013, COM-023, TRIM-001, FLT-001, DET-007, SPD-001],
    [`docker-compose.yaml`], [Alterado], [Serviços dos _workers_ de vídeo (1 vCPU e 1 GB cada) e volume `video_tmp` para os temporários.], [COM-049],
  ),
)
