# Feature Specification: Aplicar filtros visuais e ajustes de cor a um vídeo

**Feature Branch**: `004-video-filters`

**Created**: 2026-10-19

**Status**: Implemented — validation limitations tracked in tasks.md

Estado e limitações de validação: [revisão de 2026-10-23](../validation-status.md).

**Input**: UC-VID-004 (Cap. 4.4) e requisitos `REQ-VID-FLT-001` a `008` (Cap. 5) do relatório da
Fase 1. O ciclo de vida, a quota, os limites e a publicação de resultados vêm de
[000-video-common](../000-video-common/spec.md).

## Clarifications

### Session 2026-10-19

- Escala dos controlos: −100 a +100, com 0 neutro, convertida no fator das ferramentas de imagem
  `fator = 1 + valor/100` (RN1, A18).
- Os estilos predefinidos são Preto e Branco, Sépia e Vintage (FLT-001). Cada estilo preenche os três
  controlos (FLT-002). Sépia e Vintage acrescentam uma tonalidade que não se exprime com brilho,
  contraste e saturação. A tonalidade aparece no resumo e não tem controlo próprio.
- A pré-visualização é aproximada e feita no navegador (Q1, A4).
- Saída só em MP4/H.264/AAC (Q3); estilos personalizados ficam para depois (Q2).

## User Scenarios & Testing

### User Story 1 - Aplicar um estilo ou ajustes e obter um novo vídeo (Priority: P1) 🎯 MVP

O utilizador abre Filtros num vídeo, escolhe um estilo ou ajusta o brilho, o contraste e a saturação,
vê a pré-visualização e o resumo e confirma. No fim, há um novo vídeo filtrado no projeto, com o mesmo
número de fotogramas, a mesma resolução e cadência e o áudio sincronizado.

**Why this priority**: É o percurso principal do caso de uso.

**Independent Test**: Filtrar um vídeo de 60 s 1080p a 30 fps com brilho +50, contraste +20 e
saturação −30; verificar 1800 fotogramas, 1920 × 1080, 30 fps, áudio com dessincronização ≤ 40 ms e o
original inalterado.

**Acceptance Scenarios**:

1. **Given** um vídeo selecionado, **When** o utilizador abre os filtros, **Then** vê os três estilos
   e os três controlos (FLT-001).
2. **Given** o estilo Preto e Branco, **When** é escolhido, **Then** a saturação fica em −100
   (FLT-002).
3. **Given** um vídeo de 60 s a 30 fps, **When** é filtrado, **Then** o resultado tem 1800 fotogramas,
   a mesma resolução e 30 fps (FLT-006).
4. **Given** 10 fotogramas extraídos do original, **When** se lhes aplicam as ferramentas de imagem
   com os mesmos valores, **Then** o PSNR em relação aos fotogramas do resultado é ≥ 35 dB (FLT-007).
5. **Given** um vídeo de 60 s 1080p a 30 fps com os três ajustes, **When** é filtrado, **Then** termina
   em ≤ 3 min em 95% das execuções (FLT-008).

---

### User Story 2 - Ajustar com pré-visualização e valores válidos (Priority: P1)

O utilizador ajusta os controlos com pré-visualização imediata e pode repor tudo no estado neutro.
Valores fora do intervalo não são aceites.

**Why this priority**: Permite ver o efeito antes de gastar uma operação.

**Independent Test**: Mover o brilho para +50 e verificar a pré-visualização e o resumo; escrever 150;
escolher Repor.

**Acceptance Scenarios**:

1. **Given** um ajuste de brilho para +50, **When** o utilizador solta o controlo, **Then** a
   pré-visualização e o resumo refletem o novo valor (FLT-005).
2. **Given** o valor 150, **When** o utilizador tenta confirmar, **Then** o campo fica em erro e a
   submissão é bloqueada (FLT-003).
3. **Given** ajustes não neutros, **When** o utilizador escolhe Repor, **Then** os três controlos ficam
   a 0 e a pré-visualização volta ao original (FLT-004).

### Edge Cases

- Todos os valores a 0 e sem estilo: o pedido é rejeitado como “sem alterações”, para não gastar
  operação. É uma decisão de MVP, semelhante a CONV-003.
- Ajustar um controlo depois de escolher um estilo: o estilo passa a “Personalizado”, mas a
  tonalidade do estilo mantém-se até ser escolhido outro estilo ou Repor (FA1).
- Vídeo sem áudio: o resultado não tem áudio (COM-028).
- Vídeo com cadência variável: a saída usa a cadência média e a duração mantém-se a ±0,5 s.
- Cancelamento, falha, *timeout*, remoção da origem, quota e tarefas ativas: 000.

## Requirements

### Functional Requirements

- **FLT-001**: Apresentar os estilos Preto e Branco, Sépia e Vintage e os controlos de brilho,
  contraste e saturação.
- **FLT-002**: Preencher os controlos com os valores do estilo escolhido.
- **FLT-003**: Aceitar valores só entre −100 e +100.
- **FLT-004**: Repor os controlos em 0 com Repor.
- **FLT-005**: Atualizar a pré-visualização aproximada e o resumo a cada ajuste.
- **FLT-006**: Aplicar os ajustes a todos os fotogramas, preservando a ordem, a resolução e a cadência.

### Non-Functional Requirements

- **FLT-007**: Mesmo efeito que `brightness`, `contrast` e `saturation` em cada fotograma
  (PSNR ≥ 35 dB).
- **FLT-008**: Filtragem de 60 s 1080p a 30 fps em ≤ 3 min (95%).

Requisitos comuns exercidos: COM-008 a COM-031, COM-036 a COM-045, COM-051, COM-052.

### Key Entities

- **Tarefa de filtragem**: `videoTask` com `tool: "filter"` e
  `params: {style, brightness, contrast, saturation}`.
- **Estilo predefinido**: valores dos três controlos mais a tonalidade (configuração).

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% dos resultados com o mesmo número de fotogramas, a mesma resolução e a mesma
  cadência que a origem.
- **SC-002**: PSNR ≥ 35 dB em 10 fotogramas amostrados por teste (FLT-007).
- **SC-003**: Dessincronização áudio/vídeo ≤ 40 ms (COM-028).
- **SC-004**: 95% das filtragens de 60 s 1080p em ≤ 3 min (FLT-008).

## Assumptions

- A1 a A18 de UC-VID-004 (Cap. 4.4.7), em especial:
  - A1: as transformações das ferramentas de imagem aplicam-se fotograma a fotograma;
  - A17: o processamento é feito dentro do *worker*, sem enviar fotogramas pela fila;
  - A18: a conversão da escala.
- As ferramentas de imagem usam `PIL.ImageEnhance` (`Brightness`, `Contrast`, `Color`); o *worker*
  usa as mesmas funções.

## Scope and Traceability

Fora do âmbito: estilos personalizados (Q2), outros formatos de saída (Q3), filtros por intervalo de
tempo, combinação com outras ferramentas (A5).

| Requisito | User Story |
|---|---|
| FLT-001, FLT-002, FLT-006, FLT-007, FLT-008 | US1 |
| FLT-003, FLT-004, FLT-005 | US2 |

| UC-VID-004 | Coberto por |
|---|---|
| P1–P7 | US1, US2; 000 (P3–P6) |
| FA1 | FLT-003, FLT-005 |
| FA2 | FLT-004 |
| FA3, FA4 | 000 US4/US5 |
| E1, E3–E10 | 000 |
| E2 | FLT-003 |
