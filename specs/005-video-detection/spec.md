# Feature Specification: Detetar pessoas e objetos num vídeo

**Feature Branch**: `005-video-detection`

**Created**: 2026-10-19

**Status**: Ready for implementation

**Input**: UC-VID-005 (Cap. 4.5) e requisitos `REQ-VID-DET-001` a `009` (Cap. 5) do relatório da
Fase 1. O ciclo de vida, a quota, os limites e a publicação de resultados vêm de
[000-video-common](../000-video-common/spec.md).

## Clarifications

### Session 2026-10-19

- Ferramentas: `people_ai` (só a classe pessoa) e `obj_ai` (classes do modelo de deteção usado pelas
  ferramentas de imagem, `yolov5su.pt`) (RN2).
- O resultado JSON é obrigatório e tem `schemaVersion` (Q3). O vídeo anotado é opcional (Q4, A5).
- 1 operação por tarefa, mesmo com as duas ferramentas (RN4, Q2).
- Progresso em percentagem de fotogramas processados (Q5). Sem retoma (Q7). O cancelamento é *best
  effort* no *worker*, e nada é publicado (Q6).
- FA5 (carregar um vídeo novo) é o UC-VID-001 (spec 001).

## User Scenarios & Testing

### User Story 1 - Detetar e obter o resultado estruturado (Priority: P1) 🎯 MVP

O utilizador escolhe Detetar no vídeo, seleciona `people_ai`, `obj_ai` ou ambas, ajusta o limiar
(0,5 por omissão) e confirma. No fim, tem no projeto um resultado JSON associado ao vídeo, com as
deteções por fotograma.

**Why this priority**: É o percurso principal e o valor diferenciador do caso de uso.

**Independent Test**: Detetar com as duas ferramentas e limiar 0,7 num vídeo de 10 s com pessoas e
carros; verificar uma só tarefa, uma só operação e um JSON com `schemaVersion` em que todas as
deteções têm confiança ≥ 0,7.

**Acceptance Scenarios**:

1. **Given** nenhuma ferramenta selecionada, **When** o utilizador tenta confirmar, **Then** o pedido
   é rejeitado (DET-001).
2. **Given** um limiar de 0,7, **When** a tarefa termina, **Then** todas as deteções do JSON têm
   confiança ≥ 0,7 (DET-002).
3. **Given** um pedido com as duas ferramentas, **When** termina, **Then** existe uma só tarefa e um
   só JSON com deteções de pessoas e objetos, e foi contada 1 operação (DET-003, COM-021).
4. **Given** uma tarefa concluída, **When** o utilizador descarrega o JSON, **Then** tem
   `schemaVersion` e cada deteção tem o índice e o instante do fotograma, a classe, a confiança e a
   caixa com coordenadas em [0, 1] (DET-004).
5. **Given** 20 fotogramas extraídos, **When** são processados pelas ferramentas de imagem, **Then**
   ≥ 95% das deteções coincidem com as do JSON nos mesmos instantes (mesma classe e IoU ≥ 0,9)
   (DET-008).
6. **Given** um vídeo de 60 s 1080p a 30 fps com as duas ferramentas, **When** é processado, **Then**
   termina em ≤ 10 min em 95% das execuções (DET-009).

---

### User Story 2 - Consultar as deteções no tempo (Priority: P2)

O utilizador abre o resultado e vê o vídeo com as caixas sobrepostas no instante atual. Pode navegar
no tempo e filtrar por classe.

**Why this priority**: Sem isto, o JSON não é consultável pelo utilizador final (P8).

**Independent Test**: Abrir um resultado com pessoas e carros, filtrar por “pessoa” e avançar para
5 s.

**Acceptance Scenarios**:

1. **Given** um resultado com pessoas e carros, **When** o utilizador filtra por “pessoa” e avança
   para 5 s, **Then** vê só as deteções de pessoas nos fotogramas de 5 s (DET-007).

---

### User Story 3 - Vídeo anotado (Priority: P3)

O utilizador pode pedir também um vídeo com as caixas e os rótulos desenhados.

**Why this priority**: Opcional (A5); o JSON já entrega o valor principal.

**Independent Test**: Pedir o vídeo anotado e verificar a resolução, a duração e as caixas; simular
uma falha na gravação do vídeo anotado.

**Acceptance Scenarios**:

1. **Given** um pedido com vídeo anotado, **When** a tarefa termina, **Then** existe um MP4 com
   caixas e rótulos, com a resolução e a duração do original (DET-005).
2. **Given** um pedido com JSON e vídeo anotado, **When** a gravação do vídeo anotado falha, **Then**
   a tarefa fica `failed` e o JSON não é publicado (DET-006).

### Edge Cases

- Fotogramas sem deteções: não aparecem em `frames`; `frameCount` indica o total.
- Limiar 0 ou 1: válidos; com 1, o resultado pode não ter deteções.
- `obj_ai` também deteta pessoas. Com as duas ferramentas, cada deteção indica a ferramenta (`tool`),
  e a interface permite filtrar por ferramenta e por classe.
- Vídeo 4K Premium de 10 min: o JSON pode ter dezenas de MB, por isso o visualizador carrega-o uma
  vez e indexa por fotograma.
- Cancelamento, falha, *timeout*, remoção da origem, quota e tarefas ativas: 000.

## Requirements

### Functional Requirements

- **DET-001**: Selecionar `people_ai`, `obj_ai` ou ambas; rejeitar pedidos sem ferramenta (ALT `RF46`).
- **DET-002**: Limiar de confiança entre 0 e 1, 0,5 por omissão; excluir as deteções abaixo dele.
- **DET-003**: Executar as duas ferramentas na mesma tarefa, combinando os resultados por fotograma.
- **DET-004**: Registar cada deteção com índice e instante do fotograma, classe, confiança e caixa
  normalizada, num JSON com versão do formato.
- **DET-005**: Gerar, quando pedido, um vídeo anotado com caixas e rótulos, com a resolução e a
  duração do original (ALT `RF46`).
- **DET-006**: Passar a `completed` só depois de guardar todos os artefactos pedidos.
- **DET-007**: Apresentar as deteções por fotograma, com navegação no tempo e filtro por classe.

### Non-Functional Requirements

- **DET-008**: Para cada fotograma, as mesmas deteções que `people_ai` e `obj_ai` produzem na imagem
  (≥ 95% coincidentes, IoU ≥ 0,9).
- **DET-009**: Deteção de 60 s 1080p a 30 fps em ≤ 10 min (95%).

Requisitos comuns exercidos: COM-008 a COM-031, COM-036 a COM-043, COM-050 a COM-052.

### Key Entities

- **Tarefa de deteção**: `videoTask` com `tool: "detect"` e
  `params: {tools, threshold, annotatedVideo}`.
- **Resultado de deteção**: `videoAsset` com `kind: "detections"` (JSON). Corresponde a “Resultado
  de deteção” e “Deteção” no modelo de domínio.
- **Vídeo anotado**: `videoAsset` com `kind: "video"`, associado à mesma tarefa.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% dos JSON válidos contra o esquema `detections.v1.schema.json`.
- **SC-002**: ≥ 95% de coincidência com as ferramentas de imagem (DET-008).
- **SC-003**: 95% das deteções de 60 s 1080p em ≤ 10 min (DET-009).
- **SC-004**: 0 artefactos publicados de tarefas `failed` ou `cancelled`.

## Assumptions

- A1 a A5 de UC-VID-005 (Cap. 4.5.7).
- O *worker* usa o mesmo modelo (`Tools/models/yolov5su.pt`) e a mesma biblioteca (`ultralytics`) que
  `people_ai` e `obj_ai`.
- Inferência só em CPU, como nas ferramentas de imagem.

## Scope and Traceability

Fora do âmbito: seguimento de objetos entre fotogramas (*tracking*), CSV (Q3), amostragem de
fotogramas (DET-008 exige todos), retoma (Q7), encadeamento com outras ferramentas.

| Requisito | User Story |
|---|---|
| DET-001 a DET-004, DET-008, DET-009 | US1 |
| DET-007 | US2 |
| DET-005, DET-006 | US3 |

| UC-VID-005 | Coberto por |
|---|---|
| P1–P8 | US1, US2; 000 (P3–P7) |
| FA1 | US1 (JSON) |
| FA2 | US3 |
| FA3 | DET-003 |
| FA4, FA6 | 000 US4/US5 |
| FA5 | spec 001 |
| E1, E3–E8 | 000 |
| E2 | DET-001, DET-002 |
