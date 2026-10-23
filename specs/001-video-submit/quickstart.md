# Quickstart: validar a submissão de vídeo

Pré-requisitos e arranque: [000-video-common/quickstart.md](../000-video-common/quickstart.md). Vídeos
de teste em `projects/tests/fixtures/out/`.

Testes automáticos: `(cd projects && node --test --test-concurrency=1 --test-name-pattern=submit "tests/**/*.test.js")`.

## Cenários

1. **Submissão (US1)**
   - Free, projeto editável, `ok_720p_30s.mp4`: o progresso chega a 100%, aparece a mensagem “Vídeo
     submetido” e o cartão mostra o nome, 30 s, 1280 × 720, o tamanho e MP4 (H.264/AAC).
   - Submeter outro vídeo: há dois cartões.
   - O contador de operações do Free não muda.
   - `sha256sum` do ficheiro local é igual ao `sha256` guardado.
2. **Rejeição (US2)**
   - Free com `big_150mb.mp4`: a mensagem de limite de 100 MB aparece sem pedido de rede (separador
     *Network* vazio).
   - `hevc.mp4`, `fake_webm.mp4`, `long_61s.mp4` e `uhd_4k.mp4` (Free): cada um mostra a mensagem
     própria, e o projeto não muda.
   - Com o *link* “ver”, o botão “Adicionar vídeo” não aparece.
3. **Cancelar e repetir (US3)**
   - Cancelar a 50%: não há cartão, e `ls /app/images/tmp/uploads` no `projects` está vazio.
   - DevTools → *Offline* a meio, voltar *Online* e “Tentar novamente”: fica um único cartão.
   - Repetir o mesmo `curl` com o mesmo `X-Upload-Id`: a segunda resposta é `200` com o mesmo `id`.
4. **Thumbnails (Phase 8)**
   - Depois de submeter `ok_720p_30s.mp4`, o cartão mostra a *thumbnail* (JPEG 320 × 180) e o
     separador *Network* não tem pedidos ao `.mp4` até carregar em “Reproduzir”.
   - Um vídeo vertical tem uma *thumbnail* 320 × 568; um resultado de deteção mostra a do vídeo de
     origem; um recorte mostra a sua.
   - Remover o vídeo: a chave `video_thumb` deixa de existir no armazenamento.
   - Vídeos submetidos antes desta fase:
     `docker compose exec projects node scripts/backfill-thumbnails.js`.
5. **Projeto a partir de vídeo (US4)**
   - Novo projeto → separador Vídeo → `ok_720p_30s.mp4`: o projeto abre com o vídeo e sem imagens.
   - Novo projeto com `hevc.mp4`: aparece a mensagem de formato e a lista de projetos não muda.
