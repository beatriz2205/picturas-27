---
description: "Task list for implementing video conversion"
---

# Tasks: Conversão de Vídeo

**Input**: Design documents from `/specs/001-video-conversion/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`,
`contracts/video-conversion-api.md`, `quickstart.md`

## Phase 1: Setup

**Purpose**: Prepare the existing services for the video-conversion slice without changing
unrelated image-processing behavior.

- [ ] T001 [P] Add video-conversion service configuration and the supported limits approved for
  the MVP to `projects/config/videoConversion.js` (current proposal: MP4, H.264/AAC, maximum
  1080p, 600 seconds and 500 MB).
- [ ] T002 [P] Add the `video_conversion_queue` definition to
  `rabbitMQ/definitions.json` and register the queue in `projects/utils/project_msg.js`.
- [ ] T003 [P] Add the video worker build and shared `image_data` volume configuration to
  `docker-compose.yaml` using the existing worker conventions.
- [ ] T004 [P] Add feature-specific error codes and user-facing messages to
  `frontend/lib/error-messages.ts`.

## Phase 2: Foundational

**Purpose**: Implement the shared operation model and authorization/validation primitives that
all user stories require.

- [ ] T005 Create the `VideoAsset` schema and conversion metadata fields in
  `projects/models/videoAsset.js`, enforcing positive dimensions, duration and size values.
- [ ] T006 Create the `VideoConversion` schema in `projects/models/videoConversion.js` with
  statuses `accepted`, `processing`, `completed`, `failed`, and `cancelled`; require an error
  reason for `failed` and a result asset for `completed`.
- [ ] T007 [P] Create persistence helpers for video assets and conversion operations in
  `projects/controllers/videoAsset.js` and `projects/controllers/videoConversion.js`.
- [ ] T008 [P] Add input metadata extraction and validation helpers in
  `projects/services/videoValidation.js` for format, codec, dimensions, duration and size.
- [ ] T009 Add authorization and quota reservation helpers in
  `projects/services/videoConversionPolicy.js`, enforcing authenticated project access and
  preserving the rule that cancellation before effective processing releases the reservation.
- [ ] T010 Add a conversion state-transition helper in
  `projects/services/videoConversionState.js` that rejects invalid transitions and prevents
  `completed` without a verified stored result.
- [ ] T011 Add service-level contract tests for state transitions and validation in
  `projects/tests/videoConversionPolicy.test.js`.

**Checkpoint**: Shared validation, authorization, persistence and state rules are available;
user-story work can proceed in parallel.

## Phase 3: User Story 1 - Submeter conversão de vídeo (Priority: P1)

**Goal**: An authenticated user can inspect valid output options and submit a conversion that is
accepted only when all rules pass.

**Independent Test**: Submit a compatible video as an authorized user and receive an accepted
operation; verify that invalid input, unauthorized access and exhausted quota do not enqueue work.

- [ ] T012 [P] [US1] Add the supported-options and create-conversion routes to
  `projects/routes/videoConversions.js` according to
  `specs/001-video-conversion/contracts/video-conversion-api.md`.
- [ ] T013 [P] [US1] Add authenticated proxy routes for video options and conversion creation to
  `apiGateway/routes/projects.js`, forwarding bearer and caller identity headers.
- [ ] T014 [US1] Implement option discovery and request validation in
  `projects/services/videoConversionService.js`, including the limits approved for the MVP
  (current proposal: MP4, H.264/AAC, maximum 1080p, 600 seconds and 500 MB).
- [ ] T015 [US1] Implement quota reservation, conversion persistence and RabbitMQ submission in
  `projects/services/videoConversionService.js`, returning HTTP `202` with `conversionId`,
  `status` and `progress`.
- [ ] T016 [US1] Mount `projects/routes/videoConversions.js` from `projects/app.js` and ensure
  existing image routes remain unchanged.
- [ ] T017 [US1] Add frontend API functions for supported options and conversion submission to
  `frontend/lib/projects.ts`.
- [ ] T018 [US1] Add React Query mutations and cache invalidation for conversion submission in
  `frontend/lib/mutations/projects.ts`.
- [ ] T019 [US1] Add the conversion controls to
  `frontend/components/project-page/video-conversion-dialog.tsx`, showing only valid output
  options and actionable validation/quota errors.
- [ ] T020 [US1] Integrate the conversion dialog into
  `frontend/app/dashboard/[pid]/page.tsx` for authorized project users only.
- [ ] T021 [US1] Add contract and integration coverage for successful submission, invalid input,
  unauthorized project access and exhausted quota in
  `projects/tests/videoConversionSubmission.test.js`.

**Checkpoint**: A valid request is accepted and queued independently; invalid requests do not
start processing or change the original.

## Phase 4: User Story 2 - Acompanhar processamento e resultado (Priority: P1)

**Goal**: The user can observe processing and retrieve a completed converted video as a new asset.

**Independent Test**: Complete a conversion and verify state updates, a separate result asset,
output metadata, project association and downloadability while the original remains unchanged.

- [ ] T022 [P] [US2] Add status and list-conversion routes to
  `projects/routes/videoConversions.js`, restricting results to authorized project access.
- [ ] T023 [P] [US2] Add API Gateway proxy routes for conversion status to
  `apiGateway/routes/projects.js`.
- [ ] T024 [US2] Implement the video worker entry point in
  `Tools/video_conversion/video_conversion.py`, validating the input and producing MP4/H.264/AAC
  output at the requested supported resolution without modifying the source file.
- [ ] T025 [US2] Add the worker Dockerfile and dependency declaration in
  `Tools/video_conversion/Dockerfile` and `Tools/video_conversion/requirements.txt`.
- [ ] T026 [US2] Add worker message handling and progress/error events in
  `projects/services/videoConversionRunner.js`, storing only a verified complete output as a
  result asset.
- [ ] T027 [US2] Extend `wsGateway/index.js` to emit `video-conversion-update` to the authorized
  project room with conversion id, status, progress, result id and safe error information.
- [ ] T028 [US2] Add frontend status queries and WebSocket handling in
  `frontend/lib/queries/projects.ts` and `frontend/app/dashboard/[pid]/page.tsx`, including
  reconnect/refetch behavior after the page is reopened.
- [ ] T029 [US2] Add result metadata and download handling to
  `frontend/components/project-page/video-conversion-result.tsx` and
  `frontend/lib/mutations/projects.ts`.
- [ ] T030 [US2] Add integration coverage for accepted-to-processing-to-completed transitions,
  progress updates, result association, downloadability and original preservation in
  `projects/tests/videoConversionCompletion.test.js`.

**Checkpoint**: A successful conversion is observable and produces a separate downloadable asset.

## Phase 5: User Story 3 - Cancelar ou tratar falhas (Priority: P1)

**Goal**: The user can cancel before processing starts and receives explicit, safe failure states.

**Independent Test**: Cancel a pending operation and force worker/storage failures; verify the
state, quota behavior, error message, absence of completed partial results and original
preservation.

- [ ] T031 [P] [US3] Add the cancel route to
  `projects/routes/videoConversions.js`, returning `409` when effective processing already began.
- [ ] T032 [P] [US3] Add the API Gateway cancel proxy route to `apiGateway/routes/projects.js`.
- [ ] T033 [US3] Implement atomic cancellation, worker cancellation signaling and quota release
  in `projects/services/videoConversionService.js`.
- [ ] T034 [US3] Implement failure cleanup and safe error persistence in
  `projects/services/videoConversionRunner.js`, ensuring partial output is deleted or hidden and
  status cannot become `completed`.
- [ ] T035 [US3] Add cancellation, worker failure and storage failure events to
  `wsGateway/index.js` and surface them in the frontend conversion status UI.
- [ ] T036 [US3] Add cancellation and failure actions to
  `frontend/components/project-page/video-conversion-result.tsx` and update
  `frontend/lib/error-messages.ts`.
- [ ] T037 [US3] Add integration coverage for cancellation, late cancellation, worker failure,
  storage failure and no-partial-result guarantees in
  `projects/tests/videoConversionFailure.test.js`.

**Checkpoint**: Cancellation and failure behavior is explicit, recoverable and safe.

## Phase 6: Polish and Cross-Cutting Validation

- [ ] T038 [P] Add structured conversion lifecycle logging with conversion id, project id, user id,
  status and error code to `projects/services/videoConversionService.js` and
  `projects/services/videoConversionRunner.js`.
- [ ] T039 [P] Add API contract examples and operational limits to
  `README.md` or the feature documentation referenced by the team report.
- [ ] T040 Run the scenarios in `specs/001-video-conversion/quickstart.md` against Docker Compose
  and record evidence for the Phase 1 report.
- [ ] T041 Run focused service/frontend checks and verify that image-processing routes and workers
  still pass their existing checks.
- [ ] T042 Review all changed files against `.specify/memory/constitution.md` and confirm that
  secrets, unauthorized storage URLs and incomplete results are not exposed.

## Dependencies and Execution Order

### Phase Dependencies

- Setup (Phase 1) has no feature dependency and can begin immediately.
- Foundational (Phase 2) depends on Setup and blocks all user stories.
- User Stories 1, 2 and 3 depend on Foundational. US1 establishes submission; US2 depends on
  the accepted operation from US1; US3 depends on the operation and worker contracts from US1/US2.
- Polish (Phase 6) depends on the desired user stories being complete.

### User Story Dependencies

1. **US1** — first MVP increment; depends only on Phase 2.
2. **US2** — depends on the operation created by US1 and the queue contract; can be split between
   worker, backend and frontend contributors.
3. **US3** — depends on the state transitions and processing lifecycle from US1 and US2.

### Parallel Opportunities

- T001-T004 can run in parallel.
- T007-T009 can run in parallel after the model tasks they use.
- T012-T013, T017-T019 can be developed in parallel once the service contract is agreed.
- T022-T025 can run in parallel after US1's accepted-operation contract exists.
- T031-T032 and T035-T036 can run in parallel after the lifecycle events are defined.
- Different contributors can own backend, worker, frontend and tests within each story.

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational phases.
2. Complete US1 and validate accepted/rejected submissions.
3. Complete the minimum US2 path to produce and download one converted MP4.
4. Demonstrate the end-to-end success path before adding cancellation and failure hardening.

### Incremental Delivery

1. Merge the contract and persistence foundation.
2. Deliver US1 with validation and queue submission.
3. Deliver US2 with worker, status events and result download.
4. Deliver US3 with cancellation, failure handling and quota release.
5. Run quickstart, regression checks and constitution review.
