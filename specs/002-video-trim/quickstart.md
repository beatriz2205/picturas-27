# Quickstart: validar o recorte

Arranque: [000-video-common/quickstart.md](../000-video-common/quickstart.md). Projeto com
`ok_1080p_60s.mp4`.

Testes: `(cd Tools && python -m pytest video_trim/tests)` e
`(cd projects && npm test -- --test-name-pattern=trim)`.

1. **Recortar (US1)**
   - Recortar → arrastar os marcadores para 00:10 e 00:40 → 720p → nome `clip.mp4` → o resumo mostra
     o intervalo, 30 s, 720p, MP4 (H.264/AAC) e `clip.mp4`, e “N operações restantes” no Free →
     Iniciar recorte.
   - Em ≤ 2 s aparece “Em fila”, depois “A processar” com percentagem e por fim “Concluída”, e chega a
     notificação.
   - O novo vídeo tem 30 s ± 0,5 s, é 1280 × 720 e tem áudio. O original tem o mesmo `sha256`.
   - Escrever `00:01.010` como início: o primeiro fotograma do resultado é o de 1,000 s.
2. **Validação (US2)**
   - Início 40 e fim 10, fim 70 num vídeo de 60 s e excerto de 0,5 s: o botão fica desativado com a
     mensagem.
   - “Ver início” com 12 s: a reprodução começa em 12 s.
   - Só início 10 num vídeo de 50 s: o resumo mostra o fim em 50 s.
3. **Duplicados e nomes (US3)**
   - Confirmar duas vezes depressa (Premium): a segunda resposta mostra “já está em curso” e só há
     uma tarefa.
   - Nome `clip.mp4` já existente: aparece a sugestão `clip (1).mp4`.
4. **Recortar um resultado (US4)**
   - Recortar `clip.mp4` entre 5 e 15 s: aparece um novo vídeo e `clip.mp4` continua no projeto.
5. **Desempenho (TRIM-011)**: `bash specs/002-video-trim/bench.sh` (20 execuções) → percentil 95 ≤ 60 s.
