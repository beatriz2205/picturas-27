# Implementation Plan: Conversão de Vídeo

**Branch**: `001-video-conversion` | **Date**: 2026-10-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-video-conversion/spec.md`

## Summary

Adicionar ao PictuRAS um fluxo de conversão de vídeo associado a um projeto. A solução reutiliza
a autenticação, autorização, quotas, armazenamento, RabbitMQ e notificações WebSocket existentes,
mas introduz um tipo de operação próprio para vídeo, com estados persistidos, validação antes do
processamento e criação de um resultado separado do original.

## Technical Context

**Language/Version**: Node.js/CommonJS nos serviços existentes; TypeScript/Next.js no frontend;
Python apenas nos workers de processamento

**Primary Dependencies**: Express, Mongoose, Axios, RabbitMQ, Socket.IO, Next.js, React Query,
SeaweedFS S3 e FFmpeg ou equivalente de transcodificação a confirmar no worker

**Storage**: MongoDB para metadados de projetos e operações; SeaweedFS para vídeos; volume
partilhado `image_data` apenas se necessário ao padrão atual dos workers

**Testing**: Testes unitários dos serviços e validação de contratos; testes de integração com
MongoDB, RabbitMQ e armazenamento; smoke test manual através do frontend e Docker Compose

**Target Platform**: Linux em Docker Compose, com acesso pelo frontend web através do Nginx HTTPS

**Project Type**: Aplicação web distribuída com frontend Next.js e microserviços Node.js/Python

**Performance Goals**: Aceitar ou rejeitar um pedido validado em até 5 segundos; atualizar o
estado/progresso pelo menos a cada 5 segundos enquanto este estiver disponível; não bloquear a
resposta HTTP durante a transcodificação

**Constraints**: A proposta atual é MP4 com H.264/AAC, até 1080p, 10 minutos e 500 MB; os
formatos/codecs de entrada e as resoluções predefinidas continuam pendentes de Q1/Q2; o original
nunca é substituído; o MVP deve funcionar com os serviços existentes e manter o processamento
assíncrono

**Scale/Scope**: Uma conversão por pedido para utilizadores registados, limitada ao MVP da Fase 1;
sem edição temporal, legendas, live streaming ou conversão em lote

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

* **PASS** — A alteração mantém responsabilidades separadas entre frontend, gateway, serviço de
  projetos, worker, armazenamento e WebSocket.
* **PASS** — A autorização será verificada no gateway/serviço de projetos e o resultado só será
  exposto ao utilizador autorizado.
* **PASS** — O original será tratado como imutável e o resultado será um novo recurso.
* **PASS** — Estados, falhas e progresso serão observáveis e testáveis.
* **PASS** — O plano limita o MVP e evita abstrações ou serviços novos sem necessidade.

## Project Structure

### Documentation (this feature)

```text
specs/001-video-conversion/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
frontend/
├── app/dashboard/[pid]/page.tsx
├── components/project-page/
└── lib/{projects.ts, mutations/projects.ts, queries/projects.ts}
apiGateway/
└── routes/projects.js
projects/
├── routes/projects.js
├── controllers/{process,result,project}.js
├── models/{process,result,project}.js
└── utils/project_msg.js
Tools/
└── video_conversion/
imageStorageService/
├── route/
└── services/
wsGateway/
└── index.js
docker-compose.yaml
```

**Structure Decision**: Estender os pontos de integração existentes em vez de criar um serviço
paralelo: o frontend e o API Gateway expõem a funcionalidade, o serviço `projects` mantém
autorização, operações e resultados, o worker de vídeo processa mensagens RabbitMQ, o
`imageStorageService` gere ficheiros e o `wsGateway` publica estados. Os artefactos desta feature
ficam em `specs/001-video-conversion/`; as alterações de código seguem a estrutura existente.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Nenhuma | N/A | O desenho reutiliza os serviços e padrões existentes. |
