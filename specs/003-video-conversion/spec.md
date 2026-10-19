# Feature Specification: Converter vídeo para outro formato ou resolução

**Feature Branch**: `003-video-conversion`

**Created**: 2026-10-16 (reescrito em 2026-10-19)

**Status**: Ready for implementation

**Input**: UC-VID-003 (Cap. 4.3) e requisitos `REQ-VID-CONV-001` a `004` e `REQ-VID-CONV-006`
(Cap. 5) do relatório da Fase 1. O ciclo de vida, a quota, os limites e a publicação de resultados vêm
de [000-video-common](../000-video-common/spec.md).

> Substitui o antigo `specs/001-video-conversion`. Esse spec usava os IDs do Exercício 2
> (`REQ-VID-CONV-001` a `027`), só tinha saída MP4, aplicava os mesmos limites (1080p, 10 min,
> 500 MB) a todos os perfis e só deixava cancelar antes do início do processamento. Tudo isso foi
> substituído pelas RNG-02 a RNG-05 do relatório.

## Clarifications

### Session 2026-10-19

- Formatos de saída: MP4 (H.264/AAC) ou WebM (VP9/Opus) (RN3, Q1, Q3).
- Resoluções: a original ou uma predefinida inferior (2160p, 1440p, 1080p, 720p, 480p, 360p), dentro
  do perfil (RN4, Q2).
- Um pedido que mantém o formato e a resolução é rejeitado sem tarefa (RN6).
- Um resultado WebM não é aceite como entrada de nenhuma ferramenta de vídeo (RN7).
- O cancelamento é possível em fila e em processamento (FA3, FA4).

## User Scenarios & Testing

### User Story 1 - Converter para WebM ou para uma resolução menor (Priority: P1) 🎯 MVP

O utilizador escolhe Converter num vídeo do projeto, vê os metadados, os dois formatos de saída, as
resoluções permitidas e as operações restantes, escolhe as opções e o nome e confirma. No fim, há uma
cópia no projeto com o formato e a resolução pedidos, e o original fica igual.

**Why this priority**: É o percurso principal do caso de uso.

**Independent Test**: Converter um MP4 1080p de 60 s para WebM na resolução original e para MP4 720p;
verificar os *codecs*, a resolução, a duração (±0,5 s), o áudio, a reprodução no Chrome e no Firefox e
o original.

**Acceptance Scenarios**:

1. **Given** um vídeo selecionado, **When** o utilizador abre a conversão, **Then** vê exatamente
   MP4 (H.264/AAC) e WebM (VP9/Opus) (CONV-001).
2. **Given** um pedido só para WebM, **When** termina, **Then** o resultado tem a resolução original;
   **Given** um pedido só para 720p, **Then** o resultado é MP4 (CONV-002).
3. **Given** um resultado MP4 ou WebM, **When** é aberto no Chrome e no Firefox atuais, **Then** é
   reproduzido sem extensões (COM-044).
4. **Given** um vídeo de 60 s 1080p, **When** é convertido, **Then** termina em ≤ 2 min em 95% das
   execuções; um vídeo Premium termina em ≤ 2 × a sua duração (CONV-006).

---

### User Story 2 - Impedir conversões sem efeito ou com opções inválidas (Priority: P1)

O sistema rejeita pedidos que dariam uma cópia igual ao original e opções fora do vídeo ou do perfil.

**Why this priority**: Evita gastar quota e armazenamento.

**Independent Test**: Pedir MP4 na resolução original; pedir 1440p num vídeo 1080p; pedir 4K como Free.

**Acceptance Scenarios**:

1. **Given** um vídeo MP4 1080p, **When** o utilizador pede MP4 em 1080p, **Then** o pedido é
   rejeitado sem criar tarefa (CONV-003).
2. **Given** um vídeo 720p, **When** o utilizador abre as opções, **Then** não vê resoluções acima de
   720p; **Given** um vídeo 4K e um utilizador Free, **Then** só vê 1080p e inferiores (COM-010).
3. **Given** um pedido fora da interface com `format: "mov"` ou resolução não permitida, **When**
   chega ao servidor, **Then** é rejeitado com as opções válidas (UC-VID-003/E4).

---

### User Story 3 - Resultado WebM só para reproduzir e descarregar (Priority: P2)

Os vídeos WebM produzidos pela conversão podem ser reproduzidos e descarregados, mas não podem ser
usados como entrada de nenhuma ferramenta de vídeo.

**Why this priority**: Mantém uma única matriz de entrada no MVP.

**Independent Test**: Converter para WebM e tentar Recortar, Converter, Filtrar e Detetar no resultado.

**Acceptance Scenarios**:

1. **Given** um resultado WebM, **When** o utilizador tenta recortá-lo, **Then** a ferramenta está
   indisponível com a indicação do formato suportado (CONV-004).
2. **Given** um pedido direto com um WebM como origem, **When** chega ao servidor, **Then** é rejeitado
   com `UNSUPPORTED_FORMAT` (CONV-004, UC-VID-003/E2).

### Edge Cases

- Vídeo com largura ou altura ímpar depois da redução: a largura é arredondada ao par (`scale=-2`).
- Vídeo vertical: as resoluções predefinidas aplicam-se ao lado menor (por exemplo, 720p num vídeo
  1080 × 1920 dá 720 × 1280).
- Vídeo sem áudio convertido para WebM: WebM sem faixa Opus.
- Resolução original não predefinida (por exemplo, 1000p): aparece como “Original (1000p)” e as
  predefinidas inferiores (720p, …).
- MP4 → MP4 na mesma resolução com nome diferente: continua a ser rejeitado (CONV-003).
- Cancelamento, falha, *timeout*, remoção da origem, quota e tarefas ativas: 000.

## Requirements

### Functional Requirements

- **CONV-001**: Oferecer como formatos de saída apenas MP4 (H.264/AAC) e WebM (VP9/Opus).
- **CONV-002**: Manter a resolução original quando só muda o formato, e o formato original quando só
  muda a resolução.
- **CONV-003**: Rejeitar um pedido que mantenha o formato e a resolução do original.
- **CONV-004**: Recusar um WebM resultante como entrada das ferramentas de vídeo, permitindo apenas
  reproduzi-lo e descarregá-lo.

### Non-Functional Requirements

- **CONV-006**: Conversão de 60 s 1080p em ≤ 2 min (95% dos vídeos Free); vídeos Premium em
  ≤ 2 × a duração.

Requisitos comuns exercidos: COM-008 a COM-031, COM-036 a COM-045, COM-051, COM-052.

### Key Entities

- **Tarefa de conversão**: `videoTask` com `tool: "convert"` e `params: {format, height}`.
- **Vídeo convertido**: `videoAsset` com `container` `mp4` ou `webm`.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% dos resultados com o formato, os *codecs* e a resolução pedidos e a duração
  igual à do original (±0,5 s).
- **SC-002**: 0 tarefas criadas para pedidos sem alteração efetiva.
- **SC-003**: 95% das conversões Free (≤ 60 s, ≤ 1080p) em ≤ 2 min (CONV-006).
- **SC-004**: Resultados MP4 e WebM reproduzidos no Chrome e no Firefox atuais.

## Assumptions

- A1 a A4 de UC-VID-003 (Cap. 4.3.7). A4: o VP9 é mais lento do que o H.264, por isso o alvo de
  CONV-006 tem de ser medido no protótipo.
- O FFmpeg do *worker* inclui `libvpx-vp9` e `libopus`.

## Scope and Traceability

Fora do âmbito: outros formatos (MOV, AVI, GIF), *bitrate*/qualidade configuráveis, aumento de
resolução, conversão em lote.

| Requisito | User Story |
|---|---|
| CONV-001, CONV-002, CONV-006 | US1 |
| CONV-003 (+ COM-010) | US2 |
| CONV-004 | US3 |

| UC-VID-003 | Coberto por |
|---|---|
| P1–P7 | US1; 000 (P2–P6) |
| FA1, FA2 | CONV-002 |
| FA3, FA4, FA5 | 000 US4/US5 |
| E1, E3, E6–E11 | 000 |
| E2 | CONV-004 |
| E4 | US2 (COM-010) |
| E5 | CONV-003 |
