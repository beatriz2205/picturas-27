"""spec 000 (T030) — verificação da saída (REQ-VID-COM-027). Precisa de ffmpeg no PATH."""
import subprocess

import pytest

from video_utils import ffmpeg
from video_utils.errors import TaskError


def make(path, seconds=2, size="320x240", audio=True):
    args = ["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", f"testsrc2=duration={seconds}:size={size}:rate=25"]
    if audio:
        args += ["-f", "lavfi", "-i", f"sine=duration={seconds}", "-c:a", "aac"]
    args += ["-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", "-shortest", str(path)]
    subprocess.run(args, check=True)
    return str(path)


@pytest.fixture(scope="module")
def clip(tmp_path_factory):
    return make(tmp_path_factory.mktemp("v") / "clip.mp4")


EXPECTED = {"container": "mp4", "videoCodec": "h264", "width": 320, "height": 240, "durationS": 2.0, "hasAudio": True}


def test_probe(clip):
    meta = ffmpeg.probe(clip)
    assert meta["container"] == "mp4"
    assert (meta["width"], meta["height"]) == (320, 240)
    assert meta["audioCodec"] == "aac"
    assert abs(meta["durationS"] - 2.0) < 0.1


def test_verify_aceita_saida_correta(clip):
    assert ffmpeg.verify(clip, EXPECTED)["videoCodec"] == "h264"


@pytest.mark.parametrize(
    "change",
    [{"durationS": 3.0}, {"width": 640}, {"container": "webm"}],
    ids=["duracao+1s", "resolucao", "formato"],
)
def test_verify_rejeita(clip, change):
    with pytest.raises(TaskError) as err:
        ffmpeg.verify(clip, {**EXPECTED, **change})
    assert err.value.code == "output_verification_failed"


def test_verify_rejeita_audio_em_falta(tmp_path):
    silent = make(tmp_path / "silent.mp4", audio=False)
    with pytest.raises(TaskError):
        ffmpeg.verify(silent, EXPECTED)
    assert ffmpeg.verify(silent, {**EXPECTED, "hasAudio": False})


def test_verify_rejeita_ficheiro_ilegivel(tmp_path):
    bad = tmp_path / "bad.mp4"
    bad.write_bytes(b"\x00" * 1000)
    with pytest.raises(TaskError):
        ffmpeg.verify(str(bad), EXPECTED)


def test_run_reporta_progresso(clip, tmp_path):
    seen = []
    ffmpeg.run(["-i", clip, "-c", "copy", str(tmp_path / "copy.mp4")], duration_s=2.0, on_progress=seen.append)
    assert seen and max(seen) > 50


def test_run_erro_do_ffmpeg(tmp_path):
    with pytest.raises(TaskError) as err:
        ffmpeg.run(["-i", str(tmp_path / "nao-existe.mp4"), str(tmp_path / "x.mp4")])
    assert err.value.code == "ffmpeg_error"


def test_verify_audio_start_offset(clip, monkeypatch):
    meta = ffmpeg.probe(clip)
    assert ffmpeg.verify(clip, {**EXPECTED, "maxStartOffsetS": 0.04})
    monkeypatch.setattr(ffmpeg, "probe", lambda _: {
        **meta, "videoStartS": 0.0, "audioStartS": 0.041,
    })
    with pytest.raises(TaskError) as err:
        ffmpeg.verify(clip, {"maxStartOffsetS": 0.04})
    assert err.value.code == "output_verification_failed"
