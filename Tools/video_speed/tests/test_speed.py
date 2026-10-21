"""UC-VID-006 — alteração de velocidade: duração, cadência, resolução e áudio.

REQ-VID-SPD-002 a SPD-004, COM-027, COM-028. Precisa de ffmpeg no PATH:
    cd Tools && python -m pytest video_speed/tests
"""
import importlib.util
import json
import os
import shutil
import subprocess
import threading
import time

import pytest

from video_utils.errors import TaskError
from video_utils.worker import TaskContext

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("video_speed_worker", os.path.join(os.path.dirname(HERE), "video_speed.py"))
vs = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(vs)


def make(path, seconds=10, size="640x360", rate=30, audio=True):
    args = ["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", f"testsrc2=duration={seconds}:size={size}:rate={rate}"]
    if audio:
        args += ["-f", "lavfi", "-i", f"sine=duration={seconds}", "-c:a", "aac"]
    args += ["-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", "-shortest", str(path)]
    subprocess.run(args, check=True)
    return str(path)


def streams(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,codec_name,width,height,avg_frame_rate,start_time,duration",
         "-of", "json", path],
        capture_output=True, check=True,
    ).stdout
    return {s["codec_type"]: s for s in json.loads(out)["streams"]}


class FakeStorage:
    def upload(self, owner_id, project_id, stage, path, content_type):
        return f"{owner_id}/{project_id}/{stage}/{os.path.basename(path)}"


def run_speed(tmp_path, source, factor):
    workdir = tmp_path / "work"
    workdir.mkdir()
    msg = {"taskId": "t1", "ownerId": "o", "projectId": "p", "params": {"factor": factor}, "input": {}}
    progress = []
    ctx = TaskContext(msg, str(workdir), time.monotonic() + 600, threading.Event(), progress.append, FakeStorage())
    shutil.copy(source, ctx.input_path)
    vs.handle(ctx)
    return ctx.outputs[0], os.path.join(ctx.workdir, "output.mp4"), progress


@pytest.fixture(scope="module")
def clip(tmp_path_factory):
    return make(tmp_path_factory.mktemp("v") / "clip.mp4", seconds=10)


@pytest.fixture(scope="module")
def silent(tmp_path_factory):
    return make(tmp_path_factory.mktemp("v") / "silent.mp4", seconds=6, audio=False)


@pytest.mark.parametrize("factor, expected", [(2, 5.0), (0.5, 20.0), (1.25, 8.0), (0.75, 13.333)])
def test_duracao_e_a_da_origem_a_dividir_pelo_fator(clip, tmp_path, factor, expected):
    out, path, _ = run_speed(tmp_path, clip, factor)
    assert abs(out["durationS"] - expected) <= 0.5


def test_mantem_resolucao_cadencia_e_audio_sincronizado(clip, tmp_path):
    _, path, _ = run_speed(tmp_path, clip, 0.5)
    s = streams(path)
    assert (s["video"]["width"], s["video"]["height"]) == (640, 360)
    assert s["video"]["avg_frame_rate"] == "30/1"
    assert s["audio"]["codec_name"] == "aac"
    # COM-028: diferença de início entre as faixas ≤ 40 ms e durações iguais (±0,5 s)
    assert abs(float(s["audio"]["start_time"]) - float(s["video"]["start_time"])) <= 0.04
    assert abs(float(s["audio"]["duration"]) - float(s["video"]["duration"])) <= 0.5


def test_sem_audio_continua_sem_audio(silent, tmp_path):
    out, path, _ = run_speed(tmp_path, silent, 2)
    assert "audio" not in streams(path)
    assert abs(out["durationS"] - 3.0) <= 0.5


def test_fator_fora_da_lista_falha_sem_resultado(clip, tmp_path):
    with pytest.raises(TaskError) as e:
        run_speed(tmp_path, clip, 3)
    assert e.value.code == "tool_error"


def dominant_hz(path, rate=16000):
    """Frequência dominante do áudio (FFT), para confirmar que o tom não muda."""
    import numpy as np

    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-map", "0:a:0", "-ac", "1", "-ar", str(rate), "-f", "s16le", "pipe:1"],
        capture_output=True, check=True,
    ).stdout
    samples = np.frombuffer(raw, dtype=np.int16).astype(np.float64)
    spectrum = np.abs(np.fft.rfft(samples * np.hanning(len(samples))))
    return np.fft.rfftfreq(len(samples), 1 / rate)[int(np.argmax(spectrum))]


@pytest.mark.parametrize("factor", [2, 0.5])
def test_tom_do_audio_nao_muda(clip, tmp_path, factor):
    # SPD-004: o "sine" do lavfi é 440 Hz; com o atempo o tom mantém-se (±5 %)
    assert abs(dominant_hz(clip) - 440) <= 22
    _, path, _ = run_speed(tmp_path, clip, factor)
    assert abs(dominant_hz(path) - 440) <= 22
