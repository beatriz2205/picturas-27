# Feature Specification: Alterar a velocidade de um vídeo

**Feature Branch**: `006-video-speed`

**Created**: 2026-10-21

**Status**: Implemented

**Input**: UC-VID-006 (Cap. 4.6) e requisitos `REQ-VID-SPD-001` a `006` (Cap. 5) do relatório da
Fase 1. O ciclo de vida das tarefas, a quota, os limites, as notificações e a publicação de
resultados vêm de [000-video-common](../000-video-common/spec.md).

## Clarifications

### Session 2026-10-21

- Funcionalidade escolhida por só acrescentar: não muda nenhuma regra transversal (RNG-01 a RNG-08)
  nem requisito existente. A exportação para GIF foi rejeitada por obrigar a mudar a RNG-02, o
  COM-045 e a Q3 do UC-VID-003.
- Velocidades: 0,5×, 0,75×, 1,25×, 1,5× e 2× (RN2). Fatores mais extremos ficam fora do MVP (Q1).
- O tom do áudio é sempre mantido (RN5); a opção de o alterar fica fora do MVP (Q2).
- O resultado pode exceder a duração máxima do perfil, por ser gerado e não submetido (RN6).
- Resolução e cadência da origem; sem escolha de resolução (RN4).
- Alvo de desempenho por minuto da maior das duas durações, origem ou resultado (SPD-006): o *worker*
  descodifica a origem inteira e codifica o resultado inteiro, e um alvo fixo de 2 min não era
  exequível a 0,5× com 1 vCPU.

## User Scenarios & Testing

### User Story 1 - Criar uma versão em câmara lenta ou acelerada (Priority: P1) 🎯 MVP

O utilizador escolhe Alterar velocidade num vídeo do projeto, escolhe uma das velocidades, vê a
duração que o resultado vai ter e confirma. A tarefa aparece “Em fila” e, quando termina, há um novo
vídeo no projeto à nova velocidade, com a resolução e a cadência da origem e o áudio a acompanhar.

**Why this priority**: É o percurso principal do caso de uso.

**Independent Test**: Alterar um vídeo de 30 s para 2× e verificar a duração (15 s ± 0,5 s), a
resolução, o formato, o áudio e o original inalterado.

**Acceptance Scenarios**:

1. **Given** um vídeo de 60 s, **When** o utilizador escolhe 0,5×, **Then** vê as cinco velocidades
   e a duração prevista de 2:00 (SPD-001).
2. **Given** um vídeo de 10 s, **When** é processado a 2× e a 0,5×, **Then** os resultados têm
   5 s e 20 s (±0,5 s) (SPD-002).
3. **Given** um vídeo 640 × 360 a 30 fps, **When** é processado a 0,5×, **Then** o resultado tem
   640 × 360 e 30 fps (SPD-003).
4. **Given** um vídeo de 60 s em 1080p, **When** é processado, **Then** demora ≤ 2 min por minuto da
   maior das duas durações (≤ 4 min a 0,5×; ≤ 2 min a 2×) em 95% das execuções no ambiente de referência (SPD-006).

---

### User Story 2 - Áudio sincronizado e com o mesmo tom (Priority: P1)

O áudio é acelerado ou abrandado na mesma proporção que o vídeo, sem ficar mais agudo ou mais grave.

**Why this priority**: Sem isto o resultado fica desfasado ou com a voz distorcida.

**Independent Test**: Vídeo com um tom de 440 Hz processado a 2× e a 0,5×: o tom continua em 440 Hz,
o áudio começa com o vídeo e tem a mesma duração.

**Acceptance Scenarios**:

1. **Given** um vídeo com um tom de 440 Hz, **When** é processado a 2×, **Then** o tom continua em
   440 Hz (±5 %) (SPD-004).
2. **Given** um vídeo com áudio, **When** é processado, **Then** a diferença de início entre o áudio e
   o vídeo é ≤ 40 ms (COM-028).
3. **Given** um vídeo sem áudio, **When** é processado, **Then** o resultado não tem áudio (FA1).

---

### User Story 3 - Rejeitar pedidos inválidos e duplicados (Priority: P2)

**Why this priority**: Impede resultados desproporcionados e o gasto de quota por duplo clique.

**Independent Test**: Pedidos com 1×, 3×, 0,25× ou sem fator, e o mesmo pedido duas vezes.

**Acceptance Scenarios**:

1. **Given** um pedido com uma velocidade fora das disponíveis, **When** é enviado à API, **Then** é
   rejeitado com as velocidades aceites, sem tarefa nem reserva (SPD-005).
2. **Given** uma tarefa de velocidade em curso, **When** o mesmo pedido é submetido, **Then** a
   resposta indica a tarefa existente (FA4; `409 DUPLICATE_TASK`).

### Edge Cases

- Vídeo com cadência variável (VFR): a saída é forçada à cadência média da origem.
- Resultado acima da duração máxima do perfil (por exemplo, 120 s num Free): é publicado (RN6), mas
  não pode ser usado como origem de outra ferramenta enquanto exceder o limite (RN1, COM-008).
- Origem WebM, *downgrade*, quota, tarefas ativas, serviço indisponível, cancelamento, falha, tempo
  máximo e remoção da origem (E1, E3–E8, FA2, FA3): tratados pelo 000.

## Requirements

### Functional Requirements

- **SPD-001**: Escolher a velocidade entre 0,5×, 0,75×, 1,25×, 1,5× e 2×, com a duração do resultado
  antes da confirmação.
- **SPD-002**: Duração do resultado = duração da origem / velocidade, com ±0,5 s.
- **SPD-003**: Manter a resolução e a cadência da origem.
- **SPD-004**: Alterar a velocidade do áudio no mesmo fator, sem alterar o tom.
- **SPD-005**: Rejeitar velocidades fora das disponíveis, sem tarefa nem reserva.
- **SPD-007**: Recusar um pedido idêntico (mesmo vídeo e mesma velocidade) a uma tarefa ainda ativa do
  mesmo utilizador, sem criar tarefa nem reservar quota, indicando essa tarefa (FA4).

### Non-Functional Requirements

- **SPD-006**: ≤ 2 min por minuto da maior das duas durações (origem ou resultado) em 1080p (95% no
  ambiente de referência).

Requisitos comuns exercidos: COM-001 a COM-031, COM-036 a COM-047, COM-051, COM-052 (ver 000).

### Key Entities

- **Tarefa de velocidade**: `videoTask` com `tool: "speed"` e `params: {factor, expectedDurationS}`.
- **Vídeo resultante**: `videoAsset` com `origin: "task"`.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% dos resultados com a duração a ±0,5 s de origem / velocidade nos testes.
- **SC-002**: 100% dos resultados com áudio mantêm o tom (±5 %) e começam com o vídeo (≤ 40 ms).
- **SC-003**: 0 tarefas criadas com velocidades inválidas.
- **SC-004**: 95% das execuções dentro do alvo de SPD-006.

## Assumptions

- A1 a A3 de UC-VID-006 (Cap. 4.6.7).
- O *worker* tem FFmpeg com `libx264`, `aac` e o filtro `atempo` (0,5 a 2 num só filtro).

## Scope and Traceability

Fora do âmbito: fatores fora de 0,5×–2× (Q1), mudar o tom (Q2), velocidade só de um intervalo (Q3),
encadeamento com outras ferramentas.

| Requisito | User Story |
|---|---|
| SPD-001, SPD-002, SPD-003, SPD-006 | US1 |
| SPD-004 | US2 |
| SPD-005 | US3 |

| UC-VID-006 | Coberto por |
|---|---|
| P1–P2 | US1 (SPD-001) |
| P3–P7 | US1; 000 (P3, P4, P6, P7) |
| FA1 | US2 |
| FA2, FA3 | 000 US4/US5 |
| FA4 | US3 (dedup do 000) |
| E2 | SPD-005 |
| E1, E3–E8 | 000 (COM-001, COM-003 a COM-009, COM-017, COM-018, COM-027, COM-040) |
