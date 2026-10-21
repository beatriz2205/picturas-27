"""spec 002 (T007) — recorte: duração, precisão ao fotograma, resolução e áudio.

REQ-VID-TRIM-005, TRIM-009, COM-028. Precisa de ffmpeg no PATH e de numpy/pillow (requirements-dev.txt):
    cd Tools && python -m pytest video_trim/tests
"""
import importlib.util
import io
import json
import os
import shutil
import subprocess
import threading
import time

import numpy as np
import pytest
from PIL import Image

from video_utils.errors import Cancelled
from video_utils.worker import TaskContext

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("video_trim_worker", os.path.join(os.path.dirname(HERE), "video_trim.py"))
vt = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(vt)


def make(path, seconds=10, size="640x360", rate=30, audio=True):
    args = ["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", f"testsrc2=duration={seconds}:size={size}:rate={rate}"]
    if audio:
        args += ["-f", "lavfi", "-i", f"sine=duration={seconds}", "-c:a", "aac"]
    # GOP de 2 s: a procura rápida cai num fotograma-chave antes do início e a exata faz o resto
    args += ["-c:v", "libx264", "-preset", "ultrafast", "-g", str(rate * 2), "-pix_fmt", "yuv420p", "-shortest", str(path)]
    subprocess.run(args, check=True)
    return str(path)


def frame(path, index):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-vf", f"select=eq(n\\,{index})", "-frames:v", "1", "-f", "image2pipe", "-c:v", "png", "pipe:1"],
        capture_output=True, check=True,
    ).stdout
    return Image.open(io.BytesIO(raw)).convert("RGB")


def psnr(a, b):
    mse = np.mean((np.asarray(a, dtype=np.float64) - np.asarray(b, dtype=np.float64)) ** 2)
    return float("inf") if mse == 0 else 10 * np.log10(255.0**2 / mse)


def streams(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,codec_name,width,height,start_time", "-of", "json", path],
        capture_output=True, check=True,
    ).stdout
    return {s["codec_type"]: s for s in json.loads(out)["streams"]}


class FakeStorage:
    def upload(self, owner_id, project_id, stage, path, content_type):
        return f"{owner_id}/{project_id}/{stage}/{os.path.basename(path)}"


def run_trim(tmp_path, source, params, send=None):
    workdir = tmp_path / "work"
    workdir.mkdir()
    msg = {"taskId": "t1", "ownerId": "o", "projectId": "p", "params": params, "input": {}}
    progress = []
    ctx = TaskContext(msg, str(workdir), time.monotonic() + 600, threading.Event(), send or progress.append, FakeStorage())
    shutil.copy(source, ctx.input_path)
    vt.handle(ctx)
    return ctx.outputs[0], os.path.join(ctx.workdir, "output.mp4"), progress


@pytest.fixture(scope="module")
def long_clip(tmp_path_factory):
    return make(tmp_path_factory.mktemp("v") / "long.mp4", seconds=45)


def test_10_a_40_s_da_30_s(long_clip, tmp_path):
    """TRIM-009: 10–40 s → 30 s ± 0,5, H.264/AAC, mesma resolução."""
    out, _, progress = run_trim(tmp_path, long_clip, {"startS": 10, "endS": 40, "height": 360})
    assert abs(out["durationS"] - 30) <= 0.5
    assert (out["width"], out["height"]) == (640, 360)
    assert out["videoCodec"] == "h264" and out["audioCodec"] == "aac"
    assert progress and progress == sorted(progress) and max(progress) <= 99


@pytest.mark.parametrize("start", [1.0, 12.0])
def test_primeiro_fotograma_exato(long_clip, tmp_path, start):
    """TRIM-005: início 1,0 s (1,01 arredondado no projects) a 30 fps → o 1.º fotograma é o n.º 30.

    Também a 12 s, com a procura rápida antes do -i. O testsrc2 muda em todos os fotogramas: o
    fotograma da saída é mais parecido com o n.º start×30 da origem do que com os vizinhos.
    """
    _, path, _ = run_trim(tmp_path, long_clip, {"startS": start, "endS": start + 2, "height": 360})
    first = frame(path, 0)
    n = int(start * 30)
    match, before, after = (psnr(first, frame(long_clip, i)) for i in (n, n - 1, n + 1))
    assert match > before and match > after, (match, before, after)
    assert match >= 30


def test_720p_a_partir_de_1080p(tmp_path):
    src = make(tmp_path / "hd.mp4", seconds=3, size="1920x1080", audio=False)
    out, _, _ = run_trim(tmp_path, src, {"startS": 0, "endS": 2, "height": 720})
    assert (out["width"], out["height"]) == (1280, 720)


def test_vertical_reduz_o_lado_menor(tmp_path):
    src = make(tmp_path / "v.mp4", seconds=3, size="720x1280", audio=False)
    out, _, _ = run_trim(tmp_path, src, {"startS": 0, "endS": 2, "height": 480})
    assert (out["width"], out["height"]) == (480, 854)


def test_sem_audio_fica_sem_audio(tmp_path):
    """COM-028."""
    src = make(tmp_path / "mute.mp4", seconds=3, audio=False)
    out, path, _ = run_trim(tmp_path, src, {"startS": 0.5, "endS": 2.5, "height": 360})
    assert out["audioCodec"] is None
    assert "audio" not in streams(path)


def test_com_audio_aac_sincronizado(long_clip, tmp_path):
    """COM-028: AAC e diferença entre o início do áudio e do vídeo ≤ 40 ms."""
    out, path, _ = run_trim(tmp_path, long_clip, {"startS": 5, "endS": 8, "height": 360})
    assert out["audioCodec"] == "aac"
    s = streams(path)
    assert abs(float(s["audio"]["start_time"]) - float(s["video"]["start_time"])) <= 0.040


def test_sem_fim_vai_ate_ao_fim(tmp_path):
    src = make(tmp_path / "short.mp4", seconds=4, audio=False)
    out, _, _ = run_trim(tmp_path, src, {"startS": 1, "endS": None, "height": 360})
    assert abs(out["durationS"] - 3) <= 0.5


def test_cancelamento(long_clip, tmp_path):
    holder = {}

    def cancel(_v):
        holder["ctx"].cancel_event.set()

    workdir = tmp_path / "work"
    workdir.mkdir()
    msg = {"taskId": "t2", "ownerId": "o", "projectId": "p", "params": {"startS": 0, "endS": 40, "height": 360}, "input": {}}
    ctx = TaskContext(msg, str(workdir), time.monotonic() + 600, threading.Event(), cancel, FakeStorage())
    holder["ctx"] = ctx
    shutil.copy(long_clip, ctx.input_path)
    with pytest.raises(Cancelled):
        vt.handle(ctx)
    assert not ctx.outputs
