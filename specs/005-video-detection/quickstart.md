# Quickstart: validar a deteção

Arranque: [000-video-common/quickstart.md](../000-video-common/quickstart.md). Projeto com um vídeo
com pessoas e carros (por exemplo, `street_10s.mp4`, gerado em T008 ou gravado pelo grupo, em
MP4/H.264/AAC, 1080p).

Testes: `(cd Tools && python -m pytest video_detect/tests)` e
`(cd projects && npm test -- --test-name-pattern=detect)`.

1. **Detetar (US1)**
   - Detetar no vídeo, sem nenhuma ferramenta marcada: o botão está desativado.
   - Marcar Pessoas e Objetos, limiar 0,7, Confirmar: aparece uma tarefa e o saldo do Free desce 1.
   - Na conclusão, o cartão “… (deteções).json” aparece associado ao vídeo.
   - Descarregar o JSON: tem `schemaVersion: 1`, todas as confianças são ≥ 0,7 e as caixas estão em
     [0, 1].
   - `pytest video_detect/tests/test_parity.py` → ≥ 95% de coincidência.
2. **Consultar (US2)**
   - Ver deteções → filtrar “person” → saltar para 5 s: só aparecem caixas de pessoas, e a lista
     mostra as deteções do fotograma 150.
3. **Vídeo anotado (US3)**
   - Repetir com “Gerar também vídeo anotado”: aparecem o JSON e “… (anotado).mp4”, com caixas e
     rótulos, a mesma resolução e a mesma duração.
   - Com `VIDEO_DETECT_FAIL_ANNOTATED=1` (variável de teste do *worker*): a tarefa fica “Falhada”,
     nenhum JSON aparece e a operação é devolvida.
4. **Desempenho (DET-009)**: `bash specs/005-video-detection/bench.sh` → percentil 95 ≤ 600 s.
