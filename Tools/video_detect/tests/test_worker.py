"""Real video pipeline with deterministic inference; no model download."""
import threading

import pytest

from Tools.video_detect import video_detect as detect
from video_utils.tests.test_worker import source, runner, msg


class EmptyModel:
    def __call__(self, frame, **kwargs):
        return [type("Result", (), {"boxes": [], "names": {}})()]


def run_detection(monkeypatch, source, tmp_path, *, fail_upload=False, stop=None):
    original = detect.detect_video

    def inference(*args, **kwargs):
        kwargs["model"] = EmptyModel()
        if stop:
            model = kwargs["model"]

            processed = False
            check = kwargs["check"]

            def interrupted(*args, **kwargs):
                nonlocal processed
                result = model(*args, **kwargs)
                processed = True
                return result

            def checkpoint():
                check()
                if processed:
                    stop()

            kwargs["model"] = interrupted
            kwargs["check"] = checkpoint
        return original(*args, **kwargs)

    monkeypatch.setattr(detect, "detect_video", inference)
    r, events, storage = runner(detect.handle, source=source, tmp_path=tmp_path)
    if fail_upload:
        upload = storage.upload

        def failing(*args):
            if storage.uploaded:
                raise RuntimeError("storage unavailable")
            return upload(*args)
        storage.upload = failing
    message = msg(tools=["obj_ai"], threshold=0.5, annotatedVideo=True)
    message["sourceVideoId"] = "video"
    cancel = threading.Event()
    r.run(message, False, cancel)
    return events, storage


def test_real_video_has_h264_and_source_audio(monkeypatch, source, tmp_path):
    events, storage = run_detection(monkeypatch, source, tmp_path)
    assert events[-1]["type"] == "completed"
    video = events[-1]["outputs"][1]
    assert video["videoCodec"] == "h264"
    assert video["audioCodec"] == "aac"
    assert video["durationS"] == pytest.approx(2, abs=0.1)
    assert len(storage.uploaded) == 2
    assert not (tmp_path / "t1").exists()


def test_partial_upload_reports_orphans(monkeypatch, source, tmp_path):
    events, storage = run_detection(monkeypatch, source, tmp_path, fail_upload=True)
    assert events[-1]["type"] == "failed"
    assert events[-1]["orphanKeys"] == storage.uploaded


@pytest.mark.parametrize("redelivered", [True, False])
def test_failed_task_is_skipped(source, tmp_path, redelivered):
    r, events, storage = runner(detect.handle, status="failed", source=source, tmp_path=tmp_path)
    r.run(msg(), redelivered, threading.Event())
    assert events == []
    assert storage.uploaded == []


def test_timeout_between_frames(monkeypatch, source, tmp_path):
    from video_utils.errors import Timeout
    def expire():
        raise Timeout()
    events, storage = run_detection(monkeypatch, source, tmp_path, stop=expire)
    assert events[-1]["reason"]["code"] == "timeout"
    assert storage.uploaded == []


def test_cancel_between_frames(monkeypatch, source, tmp_path):
    from video_utils.errors import Cancelled
    def cancel():
        raise Cancelled()
    events, storage = run_detection(monkeypatch, source, tmp_path, stop=cancel)
    assert [event["type"] for event in events] == ["started"]
    assert storage.uploaded == []
