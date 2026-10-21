# Research: Submeter vídeo a um projeto

As decisões de transferência em *stream* (D5), validação com `ffprobe` (D6) e URLs (D13) estão em
[000-video-common/research.md](../000-video-common/research.md).

## S1. Recusa por tamanho antes da transferência

**Decision**:
1. O cliente compara `File.size` com `limits.maxBytes` (de `GET /video-limits`) e não envia o ficheiro.
2. O cliente envia o cabeçalho `X-Video-Size`. O `projects` responde `413 VIDEO_TOO_LARGE` antes de
   ler o corpo se `X-Video-Size` ou `Content-Length` excederem o limite do perfil.
3. O `multer` com `limits.fileSize = maxBytes` aborta se o corpo real exceder o limite.
4. O Nginx corta acima de 510 MB.

**Rationale**: `SUBMIT-003` (“antes de iniciar a transferência”) cumpre-se no cliente. Os passos 2 a
4 impedem que um cliente que contorne a interface consiga gastar armazenamento.

## S2. Idempotência com `upload_id`

**Decision**: O cliente gera um `uploadId` (UUID v4) por cada seleção de ficheiro e reutiliza-o em
todas as repetições desse envio (cabeçalho `X-Upload-Id`). O `projects` grava `upload_id` com um índice
único `(project_id, upload_id)`. Se já existir, responde `200` com o vídeo existente e apaga o ficheiro
recebido.

**Rationale**: Cumpre `SUBMIT-008` e `SUBMIT-009` e a RN6 sem comparar ficheiros: a mesma escolha
deliberada repetida dá uma entrada, e uma nova escolha do mesmo ficheiro dá outra.

## S3. Ordem das operações no servidor

1. Verificar a sessão e a permissão de edição, o perfil (`users/:caller/type`) e o tamanho declarado
   (S1).
2. Verificar `upload_id`; se já existir, `200` com o vídeo existente.
3. Receber para disco (`/app/images/tmp/uploads/<uuid>`); calcular o `sha256` em *stream* durante a
   escrita.
4. `probe` → `validateInput` → `validateProfile`; se falhar, apagar o ficheiro e responder com o erro.
5. Carregar em `video_src` (`storage.uploadFile`).
6. Gerar a *thumbnail* a partir do ficheiro temporário e carregá-la em `video_thumb` (S6). Uma falha
   deixa a *thumbnail* a `null` e não interrompe a submissão.
7. Verificar se o projeto ainda existe. Se não existir, apagar os objetos e responder
   `410 PROJECT_REMOVED` (UC-VID-001/E5).
8. Criar `videoAsset` (`origin: "upload"`, nome único no projeto, `thumbnail_key`).
9. Apagar os ficheiros temporários e responder `201 VideoDTO` com `thumbnailUrl` (`SUBMIT-006`).

Se o cliente abortar (`req.on("aborted")`) ou ocorrer um erro antes do passo 8, os ficheiros
temporários e os objetos eventualmente criados (vídeo e *thumbnail*) são apagados. O janitor do 000 apaga os restos com mais de
24 h (`COM-038`).

## S4. Criar um projeto com um vídeo

**Decision**: `POST /projects/:user/video-project` (*multipart* `name` + `video`) executa os passos 1 a 5
de S3 e só depois cria o `project` (mesmo esquema e mesmos valores por omissão de `POST /:user`) e o
`videoAsset`. Se a criação do `videoAsset` falhar, apaga o projeto e o objeto.

**Rationale**: `SUBMIT-002` (não criar o projeto se o vídeo for recusado). Criar primeiro e
compensar depois deixaria o projeto visível durante a validação.

## S5. Projetos só com vídeos

O `new-project-dialog.tsx` (`frontend/components/dashboard-sidebar/new-project-dialog.tsx:102`) exige
uma imagem. A vista do projeto e a cadeia de imagem têm de tolerar `imgs = []`: o `POST /process` já
responde `400` sem ferramentas. A tarefa T017 confirma que a página do projeto não falha sem imagens.

## S6. *Thumbnail* na submissão

**Decision**: Novo módulo `projects/video/thumbnail.js` com
`generateThumbnail(input, durationS) → caminho do JPEG | null`:
- `t = min(1, durationS × 0,1)`;
- `ffmpeg -v error -ss <t> -i <input> -frames:v 1 -vf scale=320:-2 -q:v 4 -y <tmp>.jpg`, com
  *timeout* de 5 s;
- devolve `null` (e regista a causa) se o `ffmpeg` falhar, exceder o tempo ou não produzir ficheiro.

Na submissão, `input` é o ficheiro temporário (passo 6 de S3), e o JPEG é carregado com
`storage.uploadFile(owner, project, "video_thumb", path, "image/jpeg")`. O mesmo módulo serve os
resultados das ferramentas, com o URL interno do resultado como `input` (D16 do 000). O passo 6 é feito
em paralelo com o passo 5 (`Promise.all`), para não somar o tempo de carregamento do vídeo ao da
*thumbnail*.

**Rationale**: `SUBMIT-012` e `SUBMIT-013`; o `ffmpeg` já está na imagem do `projects`. A procura com
`-ss` antes de `-i` mantém a geração abaixo de 1 s mesmo para 500 MB, dentro dos 5 s de `SUBMIT-011`.
O `scale=320:-2` mantém a proporção com altura par (vídeos verticais incluídos).
