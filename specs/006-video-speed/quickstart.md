# Quickstart: validar a alteração de velocidade

Arranque: [000-video-common/quickstart.md](../000-video-common/quickstart.md)
(`docker compose up -d --build`). Projeto com `ok_720p_30s.mp4`.

Testes:
- `(cd Tools && python -m pytest video_speed/tests)` (precisa de `numpy` para o teste do tom);
- `(cd projects && npm test)` → `speed.test.js`;
- `bash specs/006-video-speed/e2e.sh` (com o sistema a correr).

1. **Acelerar (US1)**
   - No cartão do vídeo, varinha → "Alterar velocidade" → 2× → o texto mostra "Acelerado: o vídeo
     passa de 00:30 para 00:15" → Iniciar.
   - Aparece "Em fila", depois "A processar" com percentagem e por fim "Concluída", com notificação.
   - O novo vídeo `ok_720p_30s (2×).mp4` tem 15 s ± 0,5 s, 1280 × 720 e áudio; o original não muda.
2. **Câmara lenta e áudio (US2)**
   - Repetir com 0,5×: o resultado tem 60 s, a voz/tom soa igual e não há desfasamento.
3. **Inválidos e duplicados (US3)**
   - Pela API, `factor: 3` → `400` com as velocidades aceites; o contador de operações não muda.
   - O mesmo pedido duas vezes depressa → "Esta alteração de velocidade já está em curso".
4. **Desempenho (SPD-006)**: `bash specs/006-video-speed/bench.sh 0.5 10` e `bench.sh 2 10`.
