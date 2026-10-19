# Specs do suporte a vídeo (Fase 1)

Especificações *spec-kit* das funcionalidades de vídeo do PictuRAS, prontas para `/speckit-implement`.
A fonte dos requisitos é o relatório da Fase 1 (Cap. 3.4, 4 e 5), também em `use cases + requisitos.md`.
Os IDs `REQ-VID-*`, `UC-VID-*` e `RNG-*` usados aqui são os do relatório; o mapa de IDs antigos está em
`docs/fase-1/typst-corrigido/mapa-ids.md`.

## Organização

| Spec | Caso de uso | Requisitos | Depende de |
|---|---|---|---|
| [000-video-common](000-video-common/spec.md) | Transversal (RNG-01 a RNG-08) | `COM-001` a `COM-052` | — |
| [001-video-submit](001-video-submit/spec.md) | UC-VID-001 | `SUBMIT-001` a `010` | 000 (fundações) |
| [002-video-trim](002-video-trim/spec.md) | UC-VID-002 | `TRIM-001` a `011` | 000, 001 |
| [003-video-conversion](003-video-conversion/spec.md) | UC-VID-003 | `CONV-001` a `004`, `CONV-006` | 000, 001 |
| [004-video-filters](004-video-filters/spec.md) | UC-VID-004 | `FLT-001` a `008` | 000, 001 |
| [005-video-detection](005-video-detection/spec.md) | UC-VID-005 | `DET-001` a `009` | 000, 001 |

Os números dos specs seguem os dos casos de uso. O `000` reúne o que é comum a todas as ferramentas
(ciclo de vida das tarefas, quota, limites por perfil, notificações, resultados, limpeza, retenção e
requisitos não funcionais comuns), para não ser especificado e implementado cinco vezes.

O antigo `001-video-conversion` foi reescrito como `003-video-conversion`: usava os IDs do Exercício 2
(`REQ-VID-CONV-001` a `027`), saída só em MP4 e limites (1080p, 10 min, 500 MB para todos) que contrariam
RNG-02 e RNG-03.

## Ordem de implementação

1. `000-video-common`, fases 1 e 2 (modelos, contratos, quota, filas, *worker* base). Bloqueia tudo o resto.
2. `001-video-submit`. Sem vídeos no projeto não há entrada para as ferramentas.
3. `000-video-common`, fases 3 em diante (lista de tarefas, cancelamento, notificações, limpeza), validadas
   com a primeira ferramenta.
4. `002-video-trim`: a primeira ferramenta, a mais simples, valida a cadeia completa (Cap. 3.1 do relatório).
5. `003`, `004` e `005` podem ser feitos em paralelo, cada um por um membro do grupo.

Cada `tasks.md` tem as tarefas por *user story*, com `[P]` nas que podem ser feitas em paralelo.

## Decisões de arquitetura comuns

Estão justificadas em [000-video-common/research.md](000-video-common/research.md). Em resumo:

- Vídeos e tarefas ficam em coleções próprias do serviço `projects` (`videoAsset`, `videoTask`), não em
  `project.imgs`. A cadeia de ferramentas de imagem não os vê (`COM-032`).
- Cada ferramenta de vídeo é um *worker* Python próprio (`Tools/video_trim`, `video_convert`,
  `video_filter`, `video_detect`), com uma biblioteca comum `Tools/video_utils` (FFmpeg, progresso,
  cancelamento, armazenamento).
- Filas RabbitMQ duráveis com prioridade (`x-max-priority`), `ack` manual e `prefetch=1`. Os eventos
  dos *workers* chegam ao `projects` pela fila `video_events_queue`, e o `projects` reencaminha-os para
  o `wsGateway` pela `ws_queue`.
- Quota de vídeo com reserva, consolidação e devolução atómicas no serviço `users` (`COM-021`, `COM-022`, `COM-051`).
- Os vídeos passam por disco e não por memória em todos os saltos (gateway, `projects`, `imageStorageService`).

## Comandos spec-kit

O *feature* ativo está em `.specify/feature.json`. Para implementar um spec, aponte-o para a pasta
respetiva e corra `/speckit-implement`, ou `/speckit-analyze` para verificar a coerência
spec ↔ plan ↔ tasks.
