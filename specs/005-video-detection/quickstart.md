# Quickstart: validar a deteção

Arranque: [000-video-common/quickstart.md](../000-video-common/quickstart.md). Projeto com um vídeo
com pessoas e carros (por exemplo, `street_10s.mp4`, gerado em T008 ou gravado pelo grupo, em
MP4/H.264/AAC, 1080p).

Testes, a partir da raiz: `PYTHONPATH=Tools python -m pytest Tools/video_detect/tests` e
`(cd projects && node --test --test-concurrency=1 --test-name-pattern=detect "tests/**/*.test.js")`.

1. **Detetar (US1)**
   - Detetar no vídeo, sem nenhuma ferramenta marcada: o botão está desativado.
   - Marcar Pessoas e Objetos, limiar 0,7, Confirmar: aparece uma tarefa e o saldo do Free desce 1.
   - Na conclusão, o cartão “… (deteções).json” aparece associado ao vídeo.
   - Descarregar o JSON: tem `schemaVersion: 1`, todas as confianças são ≥ 0,7 e as caixas estão em
     [0, 1].
   - `PYTHONPATH=Tools python -m pytest Tools/video_detect/tests/test_parity.py` verifica apenas
     a normalização das caixas. A comparação de 20 fotogramas e ≥ 95% de coincidência (DET-008)
     continua pendente; este teste não a substitui.
2. **Consultar (US2)**
   - Ver deteções → filtrar “person” → saltar para 5 s: só aparecem caixas de pessoas, e a lista
     mostra as deteções do fotograma 150.
3. **Vídeo anotado (US3)**
   - Repetir com “Gerar também vídeo anotado”: aparecem o JSON e “… (anotado).mp4”, com caixas e
     rótulos, a mesma resolução e a mesma duração.
   - Com `VIDEO_DETECT_FAIL_ANNOTATED=1` (variável de teste do *worker*): a tarefa fica “Falhada”,
     nenhum JSON aparece e a operação é devolvida.
4. **Desempenho (DET-009)**: `bash specs/005-video-detection/bench.sh` → percentil 95 ≤ 600 s.
