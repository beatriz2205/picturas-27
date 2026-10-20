"""Eventos worker -> projects (specs/000-video-common/contracts/worker-messages.md)."""
from datetime import datetime, timezone

SCHEMA_VERSION = 1

# reason.code aceites pelo projects (projects/video/messages.js)
REASON_CODES = {
    "ffmpeg_error",
    "corrupted_input",
    "output_verification_failed",
    "timeout",
    "worker_interrupted",
    "storage_error",
    "tool_error",
}


def _now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _base(kind, task_id, **extra):
    return {"schemaVersion": SCHEMA_VERSION, "type": kind, "taskId": str(task_id), "at": _now(), **extra}


def started(task_id, worker):
    return _base("started", task_id, worker=worker)


def progress(task_id, value):
    return _base("progress", task_id, progress=int(max(0, min(99, value))))


def completed(task_id, owner_id, outputs, processing_ms):
    return _base("completed", task_id, ownerId=owner_id, outputs=outputs, metrics={"processingMs": int(processing_ms)})


def failed(task_id, owner_id, code, message="", processing_ms=0, orphan_keys=None):
    if code not in REASON_CODES:
        code = "tool_error"
    evt = _base(
        "failed",
        task_id,
        ownerId=owner_id,
        reason={"code": code, "message": str(message)[:500]},
        metrics={"processingMs": int(processing_ms)},
    )
    if orphan_keys:
        evt["orphanKeys"] = list(orphan_keys)
    return evt
