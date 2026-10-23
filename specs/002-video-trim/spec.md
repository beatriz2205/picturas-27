# Feature Specification: Recortar um intervalo temporal de um vídeo

**Feature Branch**: `002-video-trim`

**Created**: 2026-10-19

**Status**: Implemented — validation limitations tracked in tasks.md

Estado e limitações de validação: [revisão de 2026-10-23](../validation-status.md).

**Input**: UC-VID-002 (Cap. 4.2) e requisitos `REQ-VID-TRIM-001` a `011` (Cap. 5) do relatório da
Fase 1. O ciclo de vida das tarefas, a quota, os limites, as notificações e a publicação de
resultados vêm de [000-video-common](../000-video-common/spec.md).

## Clarifications

### Session 2026-10-19

- O recorte é feito ao fotograma e com recodificação (RN4; recorte sem recodificação adiado, Q7).
- Saída sempre em MP4/H.264/AAC; resolução original ou inferior das predefinidas (COM-010).
- O áudio é preservado quando existe (COM-028; remoção opcional fora do âmbito, Q9).
- Um resultado de recorte pode ser recortado de novo (TRIM-010). Um resultado WebM da conversão não
  pode (CONV-004).

## User Scenarios & Testing

### User Story 1 - Recortar um excerto (Priority: P1) 🎯 MVP

O utilizador abre um vídeo do projeto na ferramenta Recortar, define o início e o fim na linha temporal
ou por valores, vê a duração do excerto, escolhe a resolução e o nome, revê o resumo e confirma. A
tarefa aparece “Em fila” e, quando termina, há um novo vídeo no projeto com o excerto.

**Why this priority**: É o percurso principal do caso de uso e a primeira ferramenta a validar toda a
cadeia (Cap. 3.1).

**Independent Test**: Recortar 10 s–40 s de um vídeo de 60 s 1080p para 720p e verificar a duração
(30 s ± 0,5 s), a resolução, o formato, o áudio e o original inalterado.

**Acceptance Scenarios**:

1. **Given** um vídeo selecionado, **When** o utilizador define o início e o fim por marcadores ou por
   valores, **Then** vê a duração do excerto (TRIM-001).
2. **Given** um editor configurado, **When** abre o resumo, **Then** vê o intervalo, a duração, a
   resolução, o formato MP4/H.264/AAC e o nome do novo vídeo (TRIM-006).
3. **Given** um intervalo de 10 s, **When** o excerto é produzido, **Then** dura entre 9,5 s e 10,5 s
   (TRIM-009).
4. **Given** um vídeo a 30 fps e início em 1,01 s, **When** o recorte termina, **Then** o primeiro
   fotograma do resultado é o de 1,000 s (TRIM-005).
5. **Given** um vídeo de 60 s 1080p, **When** é recortado um excerto de 30 s, **Then** a tarefa
   termina em ≤ 1 min em 95% das execuções no ambiente de referência (TRIM-011).

---

### User Story 2 - Validar o intervalo e pré-visualizar (Priority: P1)

O editor só permite confirmar intervalos válidos e deixa ver o vídeo nos instantes escolhidos antes de
gastar uma operação.

**Why this priority**: Impede tarefas inválidas e desperdício de quota.

**Independent Test**: Testar intervalos inválidos (início ≥ fim, fora da duração, < 1 s) e os botões
“ver início” e “ver fim”.

**Acceptance Scenarios**:

1. **Given** um intervalo com início ≥ fim, fim > duração ou duração < 1 s, **When** o utilizador tenta
   confirmar, **Then** o botão está desativado e é mostrada a mensagem (TRIM-003).
2. **Given** um início em 12 s, **When** o utilizador escolhe “ver início”, **Then** a reprodução
   começa em 12 s (TRIM-002).
3. **Given** um vídeo de 50 s e início em 10 s sem fim, **When** abre o resumo, **Then** o fim é 50 s
   (TRIM-004).
4. **Given** um pedido fora da interface com parâmetros inválidos, **When** chega ao servidor, **Then**
   é rejeitado sem tarefa (COM-008).

---

### User Story 3 - Evitar duplicados e conflitos de nome (Priority: P2)

O sistema não cria um segundo recorte igual a um que ainda está ativo e sugere um nome alternativo
quando o nome já existe.

**Why this priority**: Evita gastar quota por duplo clique e confusão no projeto.

**Independent Test**: Submeter duas vezes o mesmo pedido; escolher um nome existente.

**Acceptance Scenarios**:

1. **Given** um recorte `queued`, **When** o utilizador submete o mesmo pedido, **Then** não é criada
   nova tarefa e é apresentada a existente (TRIM-008).
2. **Given** um projeto com `clip.mp4`, **When** o utilizador escolhe esse nome, **Then** o sistema
   sugere `clip (1).mp4` e pede confirmação (TRIM-007).

---

### User Story 4 - Recortar um resultado (Priority: P3)

O utilizador pode recortar um vídeo que já é o resultado de um recorte anterior.

**Why this priority**: Uso iterativo; não bloqueia o MVP.

**Independent Test**: Recortar um resultado e verificar que o anterior se mantém.

**Acceptance Scenarios**:

1. **Given** um resultado de um recorte, **When** o utilizador escolhe Recortar nesse resultado,
   **Then** a tarefa é aceite e o resultado anterior permanece no projeto (TRIM-010).

### Edge Cases

- O instante pedido fica entre fotogramas: usa-se o fotograma mais próximo (RN4).
- Intervalo que começa em 0 e acaba na duração, com a resolução original: é aceite (é uma cópia
  recodificada; não há regra de “alteração efetiva” no recorte).
- Vídeo com cadência variável (VFR): a saída é forçada à cadência média da origem e a tolerância de
  ±0,5 s mantém-se.
- Início muito próximo do fim do vídeo com duração do excerto ≥ 1 s: válido.
- *Downgrade* depois da submissão: E3 (COM-008).
- O cancelamento, a falha, o *timeout*, a remoção da origem, a quota, as tarefas ativas e o serviço
  indisponível (E5–E12, FA1, FA2 e FA5) são tratados pelo 000.

## Requirements

### Functional Requirements

- **TRIM-001**: Definir início e fim por marcadores na linha temporal ou por valores numéricos, com a
  duração resultante.
- **TRIM-002**: Reproduzir o vídeo no editor e posicionar a reprodução no início e no fim escolhidos.
- **TRIM-003**: Aceitar só `0 ≤ início < fim ≤ duração` e duração ≥ 1 s.
- **TRIM-004**: Sem fim indicado, usar o fim do vídeo.
- **TRIM-005**: Aproximar cada limite ao fotograma mais próximo.
- **TRIM-006**: Resumo antes da confirmação: intervalo, duração, resolução, MP4/H.264/AAC e nome.
- **TRIM-007**: Sugerir um nome alternativo quando o nome já existe.
- **TRIM-008**: Recusar um pedido idêntico a uma tarefa ativa do mesmo utilizador, indicando-a.
- **TRIM-009**: Duração do excerto a ±0,5 s do intervalo pedido.
- **TRIM-010**: Aceitar como entrada um resultado de recorte anterior.

### Non-Functional Requirements

- **TRIM-011**: Recorte de um vídeo de 60 s em 1080p em ≤ 1 min (95% no ambiente de referência).

Requisitos comuns exercidos: COM-008 a COM-031, COM-036 a COM-044, COM-051, COM-052 (ver 000).

### Key Entities

- **Tarefa de recorte**: `videoTask` com `tool: "trim"` e
  `params: {startS, endS, height}`.
- **Vídeo recortado**: `videoAsset` com `origin: "task"`.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% dos excertos com duração a ±0,5 s do pedido nos testes.
- **SC-002**: 95% dos recortes de 30 s de um vídeo de 60 s 1080p em ≤ 1 min (TRIM-011).
- **SC-003**: 0 tarefas criadas com intervalos inválidos.
- **SC-004**: 0 tarefas duplicadas em submissões repetidas do mesmo pedido.

## Assumptions

- A1 a A8 de UC-VID-002 (Cap. 4.2.7).
- O *worker* tem FFmpeg com `libx264` e `aac`.
- A tolerância de ±0,5 s é verificada com `ffprobe` sobre a duração do contentor.

## Scope and Traceability

Fora do âmbito: recorte sem recodificação (Q7), vários intervalos numa tarefa, remoção do áudio (Q9),
encadeamento com outras ferramentas (Q4).

| Requisito | User Story |
|---|---|
| TRIM-001, TRIM-005, TRIM-006, TRIM-009, TRIM-011 | US1 |
| TRIM-002, TRIM-003, TRIM-004 | US2 |
| TRIM-007, TRIM-008 | US3 |
| TRIM-010 | US4 |

| UC-VID-002 | Coberto por |
|---|---|
| P1–P13 | US1, US2; 000 (P5–P12) |
| FA1, FA2, FA5 | 000 US4/US5 |
| FA3 | TRIM-004 |
| FA4 | TRIM-007 |
| FA6 | TRIM-008 |
| E1–E3, E5–E12 | 000 (COM-001, COM-003 a COM-009, COM-016 a COM-018, COM-027, COM-040) |
| E4 | TRIM-003 |
