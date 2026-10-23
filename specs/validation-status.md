# Estado das especificações de vídeo — 2026-10-23

Esta revisão compara os artefactos 000–006 com o código, os testes e os scripts existentes.
Não voltou a executar o sistema completo nem as séries de desempenho. Os valores abaixo foram
comunicados pela equipa no capítulo «Testes e Validação do MVP» partilhado nesta sessão;
não são novas medições nem substituem os registos de execução.

`Implemented` indica existência da implementação, não cumprimento integral dos requisitos.
Nos `tasks.md`, `[x]` indica trabalho concluído no âmbito descrito; `[ ]` com uma nota de estado
pode indicar trabalho parcial. Criar um teste não demonstra que o teste foi executado com sucesso.
Os cenários de aceitação nos quickstarts são procedimentos a verificar, não resultados registados.

## Situação por especificação

| Spec | Implementação e validação | Pendências / limites |
|---|---|---|
| 000 — comum | Ciclo de vida, quota, acesso, armazenamento, eventos, limpeza e scripts presentes. | T054: isolamento e regressão de imagem; teste de ficheiro malformado em paralelo com um válido no worker (T047); reinício do `projects` (COM-055); retenção com relógio simulado (COM-043). A inspeção não substitui testes de regressão (T062). |
| 001 — submissão | Submissão em streaming, validação, thumbnails e teste pelo Nginx presentes. | SUBMIT-011 não cumprido nas medições comunicadas; recusas 503 sob carga pelo limite de 1 s do probe. A medição usa 490 MB, não o limite exato de 524 288 000 bytes. |
| 002 — recorte | Worker, API, interface, testes e benchmark presentes. | A tarefa T019 inclui isolamento/cenários comuns que ainda não estão integralmente cobertos; não a marcar como concluída só por existir recorte funcional. |
| 003 — conversão | API, worker MP4/WebM, interface e testes presentes; lista de implementação atualizada. | Benchmark legado fora de `specs`, com critério desatualizado; falta a série de ≥ 20 MP4. Teste de rejeição WebM não cobre todas as ferramentas na matriz T013. Alvo WebM por definir. |
| 004 — filtros | Worker, interface, testes e benchmark presentes. | FLT-008 não cumprido: 314–330 s com 1 vCPU; 181 s com 2 vCPU também excede 180 s. T014 não está integralmente concluída; T015 inclui capturas não localizadas nesta revisão. |
| 005 — deteção | Worker usa `VideoWorker`; JSON e vídeo anotado H.264 com áudio, cancelamento, timeout e testes de integração presentes. | T008 só valida documentos de exemplo; T009 não compara 20 fotogramas (DET-008); T016 não concluiu a série de 10 execuções. DET-009 não cumprido. |
| 006 — velocidade | Worker, cinco fatores, validação, interface, testes e benchmark presentes. | SPD-006 alinhado com a duração do resultado. Séries comunicadas têm 10 execuções por fator; faltam registos de execução versionados para reprodução independente. |

## Medições comunicadas e critério aplicável

- **COM-036**: 20 pedidos válidos/inválidos diretamente ao `projects`, máximo comunicado de 1429 ms
  face a 2 s. Isto mede pedidos de processamento, não o envio de ficheiros.
- **SUBMIT-011**: antes da correção, respostas aos envios aceites de 490 MB em 28,2 e 35,1 s,
  com outro envio válido recusado com 422. Depois da correção, com deteção em paralelo, 12,9 e
  55,0 s nos aceites e uma recusa 503 em 1,1 s. Alvo de 5 s não cumprido. Medir apenas probe e
  thumbnail (0,5–0,9 s) não valida o tempo até à confirmação, que inclui a persistência.
- **COM-037**: `load-test.sh` verifica 5 tarefas em processamento e 1 em fila, e 101 tarefas noop
  de 34 utilizadores Premium. Não demonstra 100 tarefas simultaneamente em fila nem a capacidade
  com ferramentas reais; não equivale ao cenário de 101 utilizadores distintos da ERS.
- **CONV-006**: 10 MP4, p95 comunicado 76,1 s face a 120 s; a ERS exige ≥ 20 MP4. WebM, 10 execuções,
  p95 101,1 s, apenas medido: alvo por definir. O benchmark legado mistura formatos num percentil
  e aplica limites a WebM; precisa de atualização antes de ser usado como critério de aprovação.
- **FLT-008**: alvo 95% ≤ 180 s com 1 vCPU não cumprido; aumentar recursos é uma experiência
  diferente, não uma demonstração de cumprimento no ambiente original.
- **DET-009**: duas execuções comunicadas terminaram por timeout (934 s e 900,6 s); não foi obtida
  uma série de dez conclusões. A estimativa inicial de 150–300 ms/fotograma não se confirmou.
- **SPD-006**: origem de 60 s, resultado de 120 s a 0,5× → limite 240 s, p95 comunicado 154,5 s;
  resultado de 30 s a 2× → limite 60 s, p95 comunicado 53,2 s. As execuções exploratórias antigas
  de 228,2 s e 72,8 s são distintas destas séries; 72,8 s a 2× não cumpre o alvo atual.

O percentil 95 usado nos scripts é o valor ordenado na posição `ceil(0.95 * n)` (postos a partir
de 1). Com dez observações, é o máximo da amostra. Não constitui uma garantia populacional.

## Testes manuais e evidência

A equipa confirmou nesta sessão que executou todos os testes manuais de interface indicados no
capítulo de testes (TST-COM-30 a 34, TST-SUBMIT-10, TST-TRIM-08, TST-FLT-06, TST-DET-06 e
TST-SPD-09). Não os classificar como «por executar». Capturas, versões de navegador e ficheiros de
resultados devem ser associados à execução quando disponíveis. A existência de um teste manual
aprovado não completa automaticamente tarefas adicionais de capturas ou ajuste visual.

## Execução e reprodução

Ver [quickstart comum](000-video-common/quickstart.md) e os quickstarts de cada ferramenta.
Os testes Node que usam MongoDB precisam de `TEST_MONGO_URL`; os testes Python precisam das
dependências de desenvolvimento e de FFmpeg/ffprobe. A deteção exige PyTorch e pode correr na
imagem do worker, a partir da raiz:

```bash
docker compose run --rm --no-deps \
  -v ./Tools:/workspace/Tools -w /workspace \
  -e PYTHONPATH=/workspace:/workspace/Tools \
  video_detect_worker \
  sh -c "pip install -q pytest && python -m pytest Tools/video_detect/tests"
```

Registar o commit efetivamente testado, alterações locais, versões das imagens e recursos atribuídos
ao Docker. Preservar a distinção entre requisitos, resultados observados e estimativas históricas.
