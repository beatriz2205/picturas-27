"""spec 003 (T007) — conversão de formato, resolução e áudio.

Precisa de ffmpeg/ffprobe no PATH:
    cd Tools && python -m pytest video_convert/tests
"""
import hashlib
import json
import os
import shutil
import subprocess
import threading
import time
from pathlib import Path

import pytest

from video_convert.video_convert import handle
from video_utils.worker import TaskContext


def make_video(path, size="1920x1080", seconds=2, audio=True):
    args = [
        "ffmpeg", "-y", "-v", "error",
        "-f", "lavfi", "-i", f"testsrc2=duration={seconds}:size={size}:rate=10",
    ]
    if audio:
        args += ["-f", "lavfi", "-i", f"sine=frequency=440:duration={seconds}"]
    args += ["-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p"]
    if audio:
        args += ["-c:a", "aac", "-shortest"]
    args.append(str(path))
    subprocess.run(args, check=True)
    return str(path)


def probe(path):
    result = subprocess.run(
        [
            "ffprobe", "-v", "error", "-show_entries",
            "format=duration:stream=codec_type,codec_name,width,height",
            "-of", "json", str(path),
        ],
        capture_output=True,
        check=True,
    )
    return json.loads(result.stdout)


class FakeStorage:
    def __init__(self):
        self.uploaded = []

    def upload(self, owner_id, project_id, stage, path, content_type):
        self.uploaded.append((path, content_type))
        return f"{owner_id}/{project_id}/{stage}/{os.path.basename(path)}"


def run_convert(tmp_path, source, params, width, height, audio=True):
    workdir = tmp_path / "work"
    workdir.mkdir()
    msg = {
        "taskId": "convert-test",
        "ownerId": "owner",
        "projectId": "project",
        "params": params,
        "input": {
            "width": width,
            "height": height,
            "durationS": 2,
            "hasAudio": audio,
        },
    }
    ctx = TaskContext(
        msg,
        str(workdir),
        time.monotonic() + 600,
        threading.Event(),
        lambda _progress: None,
        FakeStorage(),
    )
    shutil.copy(source, ctx.input_path)
    handle(ctx)
    return ctx, os.path.join(workdir, f"output.{params['format']}")


@pytest.fixture(scope="module")
def clip(tmp_path_factory):
    return make_video(tmp_path_factory.mktemp("convert") / "source.mp4")


@pytest.fixture(scope="module")
def silent_clip(tmp_path_factory):
    return make_video(tmp_path_factory.mktemp("convert-silent") / "silent.mp4", audio=False)


def test_mp4_to_webm_keeps_resolution_duration_and_audio(clip, tmp_path):
    original_hash = hashlib.sha256(Path(clip).read_bytes()).hexdigest()
    ctx, output = run_convert(tmp_path, clip, {"format": "webm", "height": 1080}, 1920, 1080)
    metadata = probe(output)
    streams = {stream["codec_type"]: stream for stream in metadata["streams"]}

    assert streams["video"]["codec_name"] == "vp9"
    assert streams["audio"]["codec_name"] == "opus"
    assert (streams["video"]["width"], streams["video"]["height"]) == (1920, 1080)
    assert abs(float(metadata["format"]["duration"]) - 2) <= 0.5
    assert ctx.outputs[0]["container"] == "webm"
    assert hashlib.sha256(Path(clip).read_bytes()).hexdigest() == original_hash


def test_mp4_to_mp4_720p_uses_h264_and_aac(clip, tmp_path):
    _ctx, output = run_convert(tmp_path, clip, {"format": "mp4", "height": 720}, 1920, 1080)
    metadata = probe(output)
    streams = {stream["codec_type"]: stream for stream in metadata["streams"]}

    assert streams["video"]["codec_name"] == "h264"
    assert streams["audio"]["codec_name"] == "aac"
    assert (streams["video"]["width"], streams["video"]["height"]) == (1280, 720)
    assert abs(float(metadata["format"]["duration"]) - 2) <= 0.5


def test_webm_without_source_audio_has_no_audio_track(silent_clip, tmp_path):
    ctx, output = run_convert(
        tmp_path, silent_clip, {"format": "webm", "height": 1080}, 1920, 1080, audio=False
    )
    metadata = probe(output)

    assert [stream["codec_type"] for stream in metadata["streams"]] == ["video"]
    assert ctx.outputs[0]["audioCodec"] is None


def test_portrait_720p_scales_the_short_side_to_720(tmp_path):
    portrait = tmp_path / "portrait.mp4"
    make_video(portrait, size="1080x1920", audio=False)
    _ctx, output = run_convert(
        tmp_path, str(portrait), {"format": "mp4", "height": 720}, 1080, 1920, audio=False
    )
    metadata = probe(output)
    video_stream = next(stream for stream in metadata["streams"] if stream["codec_type"] == "video")

    assert (video_stream["width"], video_stream["height"]) == (720, 1280)
