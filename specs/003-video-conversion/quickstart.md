# Quickstart: validar a conversão

Arranque: [000-video-common/quickstart.md](../000-video-common/quickstart.md). Projeto com
`ok_1080p_60s.mp4` e `uhd_4k.mp4` (submetido como Premium).

Testes: `(cd Tools && python -m pytest video_convert/tests)` e
`(cd projects && node --test --test-concurrency=1 --test-name-pattern=convert "tests/**/*.test.js")`.

1. **Converter (US1)**
   - Converter `ok_1080p_60s.mp4`: aparecem os metadados, os formatos MP4 e WebM, as resoluções
     Original (1080p), 720p, 480p e 360p, e as operações restantes no Free. O botão está desativado
     com os valores iniciais.
   - Escolher WebM e Converter: o resultado é `.webm`, VP9/Opus, 1920 × 1080, 60 s ± 0,5, e é
     reproduzido no Chrome e no Firefox.
   - Escolher só 720p: o resultado é `.mp4`, H.264/AAC, 1280 × 720.
   - O original tem o mesmo `sha256`.
2. **Opções (US2)**
   - Free com `uhd_4k.mp4`: a ferramenta está desativada, porque o vídeo excede o perfil Free.
   - Premium com `uhd_4k.mp4`: aparecem Original (2160p), 1440p, 1080p, …
   - `curl` com `format: "mov"` → `400` com as opções; MP4 com a altura original → `400 NO_CHANGE`,
     sem tarefa e com o saldo de operações igual.
3. **WebM (US3)**
   - No resultado `.webm`, Recortar, Converter, Filtrar, Detetar e Alterar velocidade estão desativados com a
     indicação do formato. Reproduzir e Descarregar funcionam.
   - `curl` com o WebM como `videoId` → `415`.
4. **Desempenho (CONV-006)**: existe `bash Tools/video_convert/bench.sh`, mas ainda usa o
   critério antigo (mistura MP4/WebM no percentil e impõe um alvo WebM). Não o usar para declarar
   cumprimento de CONV-006: são necessárias ≥ 20 conversões MP4, p95 ≤ 120 s; WebM é medido à parte,
   com alvo por definir. Ver T014 e [estado de validação](../validation-status.md).
