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

**Ajustes na implementação (T008, T014)**:
- Sem `-shortest` no codificador: o AAC da origem acaba uns milissegundos antes do vídeo e o
  `-shortest` cortava o último fotograma (1799 em vez de 1800). O áudio vem da própria origem, por
  isso a opção não é precisa.
- Primeira medição com `ImageEnhance` (1 vCPU, 60 s 1080p): 420 s, muito acima de FLT-008. Partes:
  descodificação para rgb24 ≈ 51 s, `libx264 veryfast` ≈ 112 s, `ImageEnhance` ≈ 116 ms por
  fotograma (≈ 210 s) e `ffprobe -count_frames` ≈ 40 s.
- `adjust.py` reproduz as fórmulas de `ImageEnhance` em vez de as chamar. `ImageEnhance` faz
  `Image.blend(degenerada, imagem, f)`, isto é `trunc(d + f·(v − d))` cortado a 0..255:
  - Brightness (`d = 0`) e Contrast (`d` = média de L) são iguais em cada canal: aplicam-se com
    uma tabela (`Image.point`) calculada em `float32`, como o `Blend.c`. O resultado é igual bit a
    bit ao de `ImageEnhance` (teste `test_mesmas_formulas_que_imageenhance`).
  - Color (`d` = L da própria imagem) é linear nos canais: aplica-se com uma matriz
    (`Image.convert`), composta com a da tonalidade quando a saturação é ≤ 1 (sem cortes entre as
    duas). Difere de `ImageEnhance` no arredondamento (≤ 2 níveis).
  - Cerca de 30 ms por fotograma em vez de 116 ms (medido fora do pipeline). O PSNR contra `ImageEnhance` (T009) ficou entre
    36,2 e 38,3 dB com `testsrc2`, o pior caso por ter arestas de cor nítidas.
- Medições do *handler* completo (60 s 1080p 30 fps `testsrc2`, brilho +50, contraste +20,
  saturação −30; Docker Desktop num portátil, `--cpus` no contentor):

  | CPU | preset | threads | tempo | tamanho |
  |---|---|---|---|---|
  | 1 | veryfast | auto | 330 s | 56 MB |
  | 1 | superfast | auto | 311 s | 91 MB |
  | 1 | ultrafast | 1 | 274 s | 125 MB |
  | 1 | veryfast | 1 | 314 s | 54 MB |
  | 2 | veryfast | auto | 181 s | 56 MB |

  O limite está no FFmpeg e não no Python: só a cadeia FFmpeg → rgb24 → FFmpeg (sem ajustes) leva
  42 a 54 s por cada 20 s de vídeo com 1 vCPU, contra 19 s para uma transcodificação direta em YUV.
  As conversões YUV↔RGB e a contenção entre os dois processos com quota de CPU custam mais do que
  os ajustes. **Com 1 vCPU, FLT-008 não é cumprido**; com 2 vCPU fica no limite (≈ 180 s). Decisão
  pendente (T014): dar 2 vCPU ao `video_filter_worker` ou rever FLT-008 no relatório (Cap. 8). O
  preset e as threads são configuráveis (`VIDEO_FILTER_PRESET`, `VIDEO_FILTER_THREADS`).
- A contagem de fotogramas usa `nb_frames` do MP4 (a tabela de amostras, exata e instantânea) em
  vez de `-count_frames`; os testes confirmam que os dois valores coincidem.

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
