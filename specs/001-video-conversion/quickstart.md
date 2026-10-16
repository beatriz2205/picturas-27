# Quickstart: Validar Conversão de Vídeo

## Prerequisites

- Docker and Docker Compose installed.
- Repository dependencies installed through the existing service build process.
- A registered PictuRAS user and a project containing a video within the approved profile limits
  (the current proposal is 500 MB and 10 minutes).
- A test video with a supported source codec and a target conversion using the currently proposed
  MP4/H.264/AAC output.

## Start the system

From the repository root:

```bash
docker compose up --build
```

Open the application at `https://localhost:8080`.

## Validation scenarios

1. **Successful conversion**
   - Authenticate and open a project containing a compatible video.
   - Choose a supported output format and resolution.
   - Confirm the request.
   - Verify that the operation becomes `accepted`/`processing`, then `completed`.
   - Verify that the result is a new project asset and can be opened or downloaded.
   - Verify that the original asset remains unchanged.

2. **Input and quota rejection**
   - Try an input over the approved profile/MVP limits (currently proposed as 500 MB, 10 minutes
     and 1080p).
   - Try a user with no available quota.
   - Verify that no processing starts, a stable reason is displayed, and no result is created.

3. **Cancellation**
   - Submit a conversion and cancel it before processing starts.
   - Verify status `cancelled`, no result asset, and no quota consumption.

4. **Failure**
   - Use the worker test mechanism or a deliberately invalid processing dependency to force a
     conversion failure.
   - Verify status `failed`, a visible error reason, no completed partial result, and an unchanged
     original.

5. **Disconnected client**
   - Submit a valid conversion and close the browser page.
   - Reopen the project after processing completes.
   - Verify that the final state and result are available without resubmitting.

## Evidence to record

For each scenario, record the request input, observed status transitions, visible result, and
whether the original remained unchanged. Link implementation tests and screenshots from the
project report rather than embedding implementation code here.
