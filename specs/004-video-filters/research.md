# Research: Filtros visuais e ajustes de cor

Base: [000-video-common/research.md](../000-video-common/research.md).

## F1. Mesmo efeito que as ferramentas de imagem (FLT-007)

**Decision**: O *worker* lê os fotogramas da origem com FFmpeg (`rawvideo rgb24` em *pipe*) e aplica a
cada um, por esta ordem:
1. `ImageEnhance.Brightness(f_b)`;
2. `ImageEnhance.Contrast(f_c)`;
3. `ImageEnhance.Color(f_s)`;
4. a tonalidade do estilo, se existir.

Escreve o resultado num segundo FFmpeg (`rawvideo rgb24` → `libx264`), que copia o áudio da origem.

```text
ffmpeg -i in.mp4 -map 0:v:0 -f rawvideo -pix_fmt rgb24 -vsync cfr -r <fps> pipe:1
   │  (w*h*3 bytes por fotograma)
   ▼  PIL: Brightness → Contrast → Color → tonalidade
ffmpeg -f rawvideo -pix_fmt rgb24 -s <w>x<h> -r <fps> -i pipe:0 -i in.mp4 \
   -map 0:v -map 1:a:0? -c:v libx264 -preset veryfast -crf 18 -pix_fmt yuv420p \
   -c:a copy -shortest -movflags +faststart out.mp4
```

**Rationale**:
- As ferramentas `Tools/brightness`, `Tools/contrast` e `Tools/saturation` usam
  `ImageEnhance.Brightness`, `ImageEnhance.Contrast` e `ImageEnhance.Color`.
- O filtro `eq` do FFmpeg não reproduz as mesmas fórmulas:
  - o `Brightness` da PIL multiplica, enquanto o `eq` soma;
  - o `Contrast` da PIL pivota na média de cinzento da imagem, enquanto o `eq` pivota no meio da
    escala.
- Usar as mesmas funções dá, por construção, o mesmo efeito por fotograma. A diferença restante vem
  da conversão RGB↔YUV e da compressão, o que justifica o PSNR ≥ 35 dB e não 100%.
- O áudio é copiado sem recodificação, o que mantém a sincronização (COM-028) e poupa tempo. Os
  fotogramas são lidos e escritos 1:1 com `-vsync cfr` à cadência da origem (FLT-006).

**Alternatives considered**: O filtro `eq`/`colorchannelmixer` do FFmpeg, mais rápido, rejeitado
porque não cumpre FLT-007. Enviar os fotogramas às ferramentas de imagem pela fila, rejeitado por A17.

**Desempenho (FLT-008)**: Cada `enhance` sobre 1920 × 1080 demora ≈ 10 a 20 ms em C. Três ajustes dão
≈ 50 ms por fotograma, ou seja ≈ 90 s para 1800 fotogramas, mais a codificação `veryfast` em paralelo
no segundo processo. É uma estimativa a confirmar na medição (T013). Para acelerar: saltar os ajustes
com valor 0 (fator 1) e usar *threads* para ler, processar e escrever em paralelo.

## F2. Conversão da escala (A18)

`fator = 1 + valor/100`: −100 → 0, 0 → 1, +100 → 2, que é o intervalo do `brightness-tool.tsx`
(`max={2}`). A mesma função está no validador (Node), no *worker* (Python) e no frontend.

## F3. Estilos

Configuração em `projects/config/video.js` → `FILTER_STYLES`, enviada ao frontend por
`GET .../videos/:video/filter-options`:

| Estilo | brilho | contraste | saturação | tonalidade |
|---|---|---|---|---|
| Preto e Branco (`bw`) | 0 | +10 | −100 | — |
| Sépia (`sepia`) | +5 | 0 | −100 | matriz sépia (0.393 0.769 0.189 / 0.349 0.686 0.168 / 0.272 0.534 0.131) |
| Vintage (`vintage`) | +5 | −15 | −35 | 30% da matriz sépia misturada com o original |

FLT-002 só exige que P&B dê saturação −100. Os restantes valores são escolhas da equipa, a afinar
visualmente. A tonalidade é aplicada com `PIL.Image.convert("RGB", matrix)` sobre o fotograma.

## F4. Pré-visualização aproximada (FLT-005)

CSS no `<video>`:

```text
filter: brightness(f_b) contrast(f_c) saturate(f_s) [sepia(1) | sepia(0.3)]
```

Os fatores são os da F2. O `contrast()` do CSS pivota em 50% e não na média, por isso a
pré-visualização é aproximada, como assume A4. A atualização é imediata, sem pedidos ao servidor.

## F5. Pedido sem alterações

`style = none` com os três valores a 0 → `400 INVALID_PARAMS` com `NO_CHANGE` e a mensagem “Escolha um
estilo ou ajuste pelo menos um controlo”. O botão também fica desativado na interface.
