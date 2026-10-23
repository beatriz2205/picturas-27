// UC-VID-006 (alterar a velocidade): linhas a acrescentar nos outros capítulos.
// Cada bloco indica onde entra. Nada aqui altera requisitos ou regras existentes; só acrescenta.

// ───────────────────────── Cap. 4 (capitulos/04-casos-de-uso.typ), no fim:
#include "../casos-uso/UC-VID-006.typ"

// ───────────────────────── Cap. 5.1, Tabela de requisitos funcionais (depois de REQ-VID-FLT-006):
    [`REQ-VID-SPD-001`], [O sistema deve permitir escolher a velocidade de um vídeo entre 0,5×, 0,75×, 1,25×, 1,5× e 2× e apresentar, antes da confirmação, a duração que o resultado vai ter.], [Must], [NOVO], [UC-VID-006/P1–P2, RN2], [É a escolha central da funcionalidade; mostrar a duração evita surpresas antes de gastar quota.], [Dado vídeo de 60 s, quando o utilizador escolhe 0,5×, então vê as cinco velocidades e a duração prevista de 2:00.],
    [`REQ-VID-SPD-002`], [O sistema deve produzir um resultado cuja duração é a da origem a dividir pela velocidade, com tolerância de ±0,5 s.], [Must], [NOVO], [UC-VID-006/P5, RN3], [Torna a alteração de velocidade verificável.], [Dado vídeo de 10 s, quando processado a 2× e a 0,5×, então os resultados têm entre 4,5 e 5,5 s e entre 19,5 e 20,5 s.],
    [`REQ-VID-SPD-003`], [O sistema deve manter no resultado a resolução e a cadência do vídeo de origem.], [Must], [NOVO], [UC-VID-006/P5, RN4], [A velocidade não deve alterar a qualidade de imagem nem a fluidez da reprodução.], [Dado vídeo 640 × 360 a 30 fps, quando processado a 0,5×, então o resultado tem 640 × 360 e 30 fps.],
    [`REQ-VID-SPD-004`], [O sistema deve alterar a velocidade do áudio no mesmo fator que a do vídeo, sem alterar o tom.], [Should], [NOVO], [UC-VID-006/P4, RN5, FA1], [Áudio à velocidade original ficaria desfasado; áudio só acelerado ficaria com o tom alterado.], [Dado vídeo com um tom de 440 Hz, quando processado a 2×, então o resultado tem áudio com a duração do vídeo e o tom continua em 440 Hz (±5 %); dado vídeo sem áudio, então o resultado não tem áudio.],
    [`REQ-VID-SPD-005`], [O sistema deve rejeitar um pedido com uma velocidade fora das disponíveis, sem criar tarefa nem reservar quota.], [Must], [NOVO], [UC-VID-006/E2, RN2], [Impede pedidos fora da interface que gerariam resultados desproporcionados.], [Dado pedido com 1×, 3× ou 0,25×, quando enviado à API, então é rejeitado com a indicação das velocidades aceites e não existe tarefa nova.],

// ───────────────────────── Cap. 5.2, Tabela de requisitos não funcionais (depois de REQ-VID-FLT-008):
    [`REQ-VID-SPD-006`], [O sistema deve concluir a alteração de velocidade de um vídeo em 1080p em ≤ 2 min por minuto de vídeo resultante, medidos entre a passagem da tarefa a `processing` e a passagem a `completed`.], [Eficiência de Desempenho (comportamento temporal)], [MVP: 95% em ≤ 2 min por minuto de resultado no ambiente de referência (1 vCPU); produção: ≤ 1 min por minuto de resultado.], [Should], [UC-VID-006; UC-VID-004/A7; A3], [Executar ≥ 10 pedidos a 0,5× e 10 a 2× de `ok_1080p_60s.mp4` e verificar a percentagem dentro do prazo (≤ 4 min a 0,5×; ≤ 1 min a 2×).],

// ───────────────────────── Cap. 5 (texto antes da Tabela 25): na lista de prefixos, acrescentar
//   "… FLT (UC-VID-004), DET (UC-VID-005) e SPD (UC-VID-006)."

// ───────────────────────── Cap. 3.1, Tabela de funcionalidades (nova linha):
    [Alterar a velocidade de um vídeo], [UC-VID-006], [`REQ-VID-SPD`, `REQ-VID-COM`], [Free, Premium], [UC-VID-001; quota diária da baseline (RNG-04)], [Implementada],
// Justificação no contexto do MVP (novo item da lista):
- *UC-VID-006 — Alterar a velocidade de um vídeo*: a câmara lenta e a aceleração são das edições mais usadas em vídeo curto. A funcionalidade valida uma transformação temporal do vídeo e do áudio em conjunto, em que a duração do resultado é diferente da da origem e tem de ser verificada a partir do pedido, e confirma que uma ferramenta nova se acrescenta só com um _worker_, o seu validador e a entrada no menu (REQ-VID-COM-047).

// ───────────────────────── Cap. 3.4, RNG-04: na lista de ferramentas, acrescentar "alterar a velocidade":
//   "Cada tarefa de processamento de vídeo aceite (recortar, converter, filtrar, detetar, alterar a velocidade) conta como 1 operação …"

// ───────────────────────── Cap. 7.1, Matriz de rastreabilidade (novas linhas):
    [UC-VID-006, passos 1–2], [Apresentar as velocidades, a duração prevista e o saldo.], [`REQ-VID-SPD-001`, `REQ-VID-COM-002`, `REQ-VID-COM-008`, `REQ-VID-COM-023`],
    [UC-VID-006, passos 3–4], [Revalidar, criar tarefa, reservar operação e processar com progresso.], [`REQ-VID-COM-011` a `REQ-VID-COM-014`, `REQ-VID-COM-018`, `REQ-VID-COM-019`, `REQ-VID-COM-021`, `REQ-VID-COM-022`, `REQ-VID-COM-036`, `REQ-VID-COM-052`, `REQ-VID-SPD-004`, `REQ-VID-SPD-006`],
    [UC-VID-006, passos 5–7], [Verificar, guardar o novo vídeo, concluir, notificar e reproduzir.], [`REQ-VID-SPD-002`, `REQ-VID-SPD-003`, `REQ-VID-COM-015`, `REQ-VID-COM-026` a `REQ-VID-COM-030`, `REQ-VID-COM-044`],
    [UC-VID-006/FA1–FA4], [Origem sem áudio; cancelar; regressar; pedido idêntico em curso.], [`REQ-VID-SPD-004`, `REQ-VID-COM-014` a `REQ-VID-COM-016`, `REQ-VID-COM-022`, `REQ-VID-COM-029`, `REQ-VID-COM-031`],
    [UC-VID-006/E1–E6], [Rejeitar sem autorização, velocidade inválida, formato/limites, quota, tarefas ativas ou serviço indisponível.], [`REQ-VID-COM-001`, `REQ-VID-COM-003` a `REQ-VID-COM-009`, `REQ-VID-COM-018`, `REQ-VID-COM-021`, `REQ-VID-COM-024`, `REQ-VID-COM-051`, `REQ-VID-SPD-005`],
    [UC-VID-006/E7–E8], [Falha, tempo máximo, saída inválida ou origem removida.], [`REQ-VID-COM-017`, `REQ-VID-COM-020`, `REQ-VID-COM-022`, `REQ-VID-COM-027`, `REQ-VID-COM-029`, `REQ-VID-COM-039`, `REQ-VID-COM-040`],
    [UC-VID-006/RN1–RN8], [Origem válida, velocidades, duração, resolução e cadência, áudio, resultado acima do limite, quota e formato.], [`REQ-VID-COM-008`, `REQ-VID-COM-021`, `REQ-VID-COM-026`, `REQ-VID-COM-028`, `REQ-VID-COM-045`, `REQ-VID-SPD-001` a `REQ-VID-SPD-005`],

// ───────────────────────── Cap. 6, Impacto: na linha "Operações de edição e barra de ferramentas (UC04)",
//   acrescentar "Alterar velocidade" à lista de ferramentas e "SPD-001" aos requisitos.
//   Nas linhas que dizem "UC-VID-002 a 005" ou "UC-VID-001 a 005", passar a "… a 006".

// ───────────────────────── Cap. 10.2, Tabela de testes (novas linhas):
    [TST-SPD-01], [Automático], [Dado pedido com 0,5×, 0,75×, 1,25×, 1,5× ou 2×, quando é validado, então é aceite com a duração prevista; com 1×, 3×, 0,25×, texto ou sem fator, então é recusado (400) com as velocidades aceites. A fila `video_speed_queue` é criada a partir do registo de ferramentas. (`speed.test.js`)], [SPD-001, SPD-005, COM-047], [Passa],
    [TST-SPD-02], [Automático], [Dado vídeo de 10 s, quando processado a 2×, 0,5×, 1,25× e 0,75×, então a duração do resultado é 5, 20, 8 e 13,3 s (±0,5 s). (`test_speed.py`)], [SPD-002, COM-027], [Passa],
    [TST-SPD-03], [Automático], [Dado vídeo 640 × 360 a 30 fps com áudio, quando processado a 0,5×, então mantém 640 × 360 e 30 fps, o áudio é AAC, começa com o vídeo (≤ 40 ms) e tem a mesma duração; dado vídeo sem áudio, o resultado fica sem áudio. (`test_speed.py`)], [SPD-003, SPD-004, COM-028], [Passa],
    [TST-SPD-04], [Medição], [Alteração de velocidade de `ok_1080p_60s.mp4` (60 s, 1080p, 30 fps) com o _worker_ limitado a 1 vCPU (`veryfast`/CRF 20), medida de `processing` a `completed`. Medido: 2× (resultado de 30 s) em 72,8 s; 0,5× (resultado de 120 s) em 228,2 s. Alvo: ≤ 2 min por minuto de resultado (≤ 1 min a 2×; ≤ 4 min a 0,5×).], [SPD-006], [Passa],

// ───────────────────────── Cap. 5.4, Tabela "Requisitos refinados" (nova linha, no fim):
    [SPD-006], [... concluir a alteração de velocidade de um vídeo de 60 s em 1080p em ≤ 2 min.], [O sistema deve concluir a alteração de velocidade de um vídeo em 1080p em ≤ 2 min por minuto de vídeo resultante (medição de `processing` a `completed`).], [Exequibilidade: o custo depende da duração do resultado, não da origem; a 0,5× o resultado tem o dobro da duração e um alvo fixo de 2 min não era exequível com 1 vCPU (228 s medidos). O alvo por minuto de resultado segue a lógica da RNG-06.],
// E na Tabela "Regras de qualidade aplicadas", linha Exequibilidade: acrescentar SPD-006 aos requisitos revistos.

// ───────────────────────── Cap. 3.2, Diagrama de casos de uso: trocar a imagem por
//   ~/Downloads/diagrama_casos_uso_v2.png (UC-VID-006 acrescentado; nada mais muda) e, no texto:
//   - "acrescenta os cinco casos de uso de vídeo (UC-VID-001 a UC-VID-005)"
//       → "acrescenta os seis casos de uso de vídeo (UC-VID-001 a UC-VID-006)";
//   - "Nos UC-VID-002 a UC-VID-004, ter um vídeo já submetido é uma pré-condição"
//       → "Nos UC-VID-002 a UC-VID-004 e no UC-VID-006, ter um vídeo já submetido é uma pré-condição".

// ───────────────────────── Cap. 1.1, lista de funcionalidades (novo item, no fim):
- Alterar a velocidade de um vídeo (câmara lenta ou aceleração).

// ───────────────────────── Cap. 3.3, Modelo de domínio: trocar a imagem por ~/Downloads/modelo_dominio_v4.png
//   (Ferramenta de velocidade acrescentada como especialização de Ferramenta de vídeo; nada mais muda).
//   No texto da secção, onde se enumeram as ferramentas de vídeo, acrescentar "velocidade".
