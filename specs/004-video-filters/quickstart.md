# Quickstart: validar os filtros

Arranque: [000-video-common/quickstart.md](../000-video-common/quickstart.md). Projeto com
`ok_1080p_60s.mp4`.

Testes: `(cd Tools && python -m pytest video_filter/tests)` e
`(cd projects && npm test -- --test-name-pattern=filter)`.

1. **Aplicar (US1)**
   - Filtros: aparecem Preto e Branco, Sépia, Vintage e os *sliders* de brilho, contraste e saturação.
   - Escolher Preto e Branco: a saturação passa a −100 e a pré-visualização fica a preto e branco.
   - Aplicar: “Em fila”, depois “A processar” e “Concluída”.
   - O resultado tem 1800 fotogramas (`ffprobe -count_frames`), 1920 × 1080, 30 fps e áudio AAC.
   - O original tem o mesmo `sha256`.
   - Com brilho +50, contraste +20 e saturação −30: o teste de PSNR (T009) dá ≥ 35 dB.
2. **Ajustar (US2)**
   - Mover o brilho para +50: a pré-visualização e o resumo mudam de imediato.
   - Escrever 150: o campo fica em erro e o botão é desativado.
   - Repor: os três controlos ficam a 0 e o vídeo aparece sem filtro.
   - Tudo a 0 sem estilo: o botão fica desativado; por `curl`, `400 NO_CHANGE`.
3. **Desempenho (FLT-008)**: `bash specs/004-video-filters/bench.sh` → percentil 95 ≤ 180 s.
