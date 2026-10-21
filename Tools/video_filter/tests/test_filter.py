"""spec 004 (T009) — filtros de vídeo: fotogramas, resolução, cadência, PSNR e áudio.

REQ-VID-FLT-006, FLT-007, COM-028. Precisa de ffmpeg no PATH e de numpy (requirements-dev.txt):
    cd Tools && python -m pytest video_filter/tests
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
from PIL import Image, ImageEnhance

import adjust
from video_utils.errors import Cancelled
from video_utils.worker import TaskContext

HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location("video_filter_worker", os.path.join(os.path.dirname(HERE), "video_filter.py"))
vf = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(vf)

PARAMS = {"style": "custom", "tint": None, "brightness": 50, "contrast": 20, "saturation": -30}


def make(path, seconds=10, size="640x360", rate=30, audio=True):
    args = ["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", f"testsrc2=duration={seconds}:size={size}:rate={rate}"]
    if audio:
        args += ["-f", "lavfi", "-i", f"sine=duration={seconds}", "-c:a", "aac"]
    args += ["-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", "-shortest", str(path)]
    subprocess.run(args, check=True)
    return str(path)


def probe_streams(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,codec_name,width,height,avg_frame_rate,start_time", "-of", "json", path],
        capture_output=True, check=True,
    ).stdout
    return {s["codec_type"]: s for s in json.loads(out)["streams"]}


def frame(path, index):
    """Fotograma n.º index descodificado em RGB (o mesmo caminho que um PNG extraído com ffmpeg)."""
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-vf", f"select=eq(n\\,{index})", "-frames:v", "1", "-f", "image2pipe", "-c:v", "png", "pipe:1"],
        capture_output=True, check=True,
    ).stdout
    return Image.open(io.BytesIO(raw)).convert("RGB")


def psnr(a, b):
    mse = np.mean((np.asarray(a, dtype=np.float64) - np.asarray(b, dtype=np.float64)) ** 2)
    return float("inf") if mse == 0 else 10 * np.log10(255.0**2 / mse)


class FakeStorage:
    def __init__(self):
        self.uploaded = []

    def upload(self, owner_id, project_id, stage, path, content_type):
        self.uploaded.append(path)
        return f"{owner_id}/{project_id}/{stage}/{os.path.basename(path)}"


def run_filter(tmp_path, source, params, on_progress=None, timeout_s=600):
    workdir = tmp_path / "work"
    workdir.mkdir()
    msg = {"taskId": "t1", "ownerId": "o", "projectId": "p", "params": params, "input": {}}
    progress = []

    def send(v):
        progress.append(v)
        if on_progress:
            on_progress(v)

    ctx = TaskContext(msg, str(workdir), time.monotonic() + timeout_s, threading.Event(), send, FakeStorage())
    shutil.copy(source, ctx.input_path)
    vf.handle(ctx)
    return ctx, progress


@pytest.fixture(scope="module")
def clip(tmp_path_factory):
    return make(tmp_path_factory.mktemp("v") / "clip.mp4")


@pytest.fixture(scope="module")
def filtered(clip, tmp_path_factory):
    ctx, progress = run_filter(tmp_path_factory.mktemp("f"), clip, PARAMS)
    return ctx.outputs[0], os.path.join(ctx.workdir, "output.mp4"), progress


# ---- adjust.py


def test_escala_para_fator():
    assert [adjust.to_factor(v) for v in (-100, 0, 100, 50)] == [0, 1, 2, 1.5]
    assert adjust.factors(PARAMS) == (1.5, 1.2, 0.7, None)


def test_fatores_neutros_nao_alteram_a_imagem():
    img = Image.new("RGB", (4, 4), (10, 120, 200))
    assert adjust.apply(img) is img


@pytest.mark.parametrize("factor", [0.0, 0.3, 0.7, 1.2, 1.5, 2.0])
def test_mesmas_formulas_que_imageenhance(factor):
    """Brightness e Contrast por tabela são iguais a ImageEnhance; Color por matriz difere ≤ 2 níveis."""
    img = Image.frombytes("RGB", (64, 48), os.urandom(64 * 48 * 3))
    ref = lambda cls: np.asarray(cls(img).enhance(factor), dtype=np.int16)  # noqa: E731
    got = lambda **kw: np.asarray(adjust.apply(img, **kw), dtype=np.int16)  # noqa: E731
    assert np.array_equal(got(fb=factor), ref(ImageEnhance.Brightness))
    assert np.array_equal(got(fc=factor), ref(ImageEnhance.Contrast))
    assert np.abs(got(fs=factor) - ref(ImageEnhance.Color)).max() <= 2


def test_tonalidades():
    img = Image.new("RGB", (2, 2), (100, 150, 200))
    sepia = adjust.apply(img, tint="sepia").getpixel((0, 0))
    # R = 0.393·100 + 0.769·150 + 0.189·200 ≈ 192; G ≈ 171; B ≈ 133,5
    assert abs(sepia[0] - 192) <= 1 and abs(sepia[1] - 171) <= 1 and abs(sepia[2] - 133.5) <= 1
    mild = adjust.apply(img, tint="sepia30").getpixel((0, 0))
    assert abs(mild[2] - round(0.7 * 200 + 0.3 * (0.272 * 100 + 0.534 * 150 + 0.131 * 200))) <= 1
    with pytest.raises(ValueError):
        adjust.apply(img, tint="azul")


# ---- worker


def test_mesmos_fotogramas_resolucao_e_cadencia(filtered):
    """FLT-006: 10 s a 30 fps → 300 fotogramas, 640 × 360, 30 fps, H.264/AAC."""
    out, path, _ = filtered
    assert vf.count_frames(path) == vf.count_frames(path, decode=True) == 300
    assert (out["width"], out["height"]) == (640, 360)
    assert out["fps"] == 30
    assert out["videoCodec"] == "h264" and out["audioCodec"] == "aac"
    assert abs(out["durationS"] - 10) <= 0.5


def test_mesmo_efeito_que_as_ferramentas_de_imagem(clip, filtered):
    """FLT-007: 10 fotogramas, ferramentas de imagem (ImageEnhance) sobre a origem vs resultado → PSNR ≥ 35 dB."""
    _, path, _ = filtered
    fb, fc, fs, _ = adjust.factors(PARAMS)
    values = []
    for index in range(0, 300, 30):
        expected = frame(clip, index)
        # o mesmo que Tools/brightness, Tools/contrast e Tools/saturation, por esta ordem
        expected = ImageEnhance.Brightness(expected).enhance(fb)
        expected = ImageEnhance.Contrast(expected).enhance(fc)
        expected = ImageEnhance.Color(expected).enhance(fs)
        values.append(psnr(expected, frame(path, index)))
    assert min(values) >= 35, values


def test_audio_sincronizado(filtered):
    """COM-028: diferença entre o início do áudio e do vídeo ≤ 40 ms."""
    _, path, _ = filtered
    s = probe_streams(path)
    assert abs(float(s["audio"]["start_time"]) - float(s["video"]["start_time"])) <= 0.040


def test_progresso_por_fotogramas(filtered):
    _, _, progress = filtered
    assert progress and progress == sorted(progress) and max(progress) <= 99


def test_estilo_sem_audio(tmp_path):
    """Sépia num vídeo sem áudio: o resultado também não tem áudio (COM-028)."""
    src = make(tmp_path / "mute.mp4", seconds=2, size="320x240", rate=25, audio=False)
    ctx, _ = run_filter(tmp_path, src, {"style": "sepia", "tint": "sepia", "brightness": 5, "contrast": 0, "saturation": -100})
    out = ctx.outputs[0]
    assert out["audioCodec"] is None
    assert vf.count_frames(os.path.join(ctx.workdir, "output.mp4"), decode=True) == 50


def test_cancelamento_termina_os_processos(tmp_path):
    src = make(tmp_path / "long.mp4", seconds=20, size="320x240", audio=False)
    holder = {}

    def cancel(_v):
        holder["ctx"].cancel_event.set()

    workdir = tmp_path / "work"
    workdir.mkdir()
    msg = {"taskId": "t2", "ownerId": "o", "projectId": "p", "params": PARAMS, "input": {}}
    ctx = TaskContext(msg, str(workdir), time.monotonic() + 600, threading.Event(), cancel, FakeStorage())
    holder["ctx"] = ctx
    shutil.copy(src, ctx.input_path)
    with pytest.raises(Cancelled):
        vf.handle(ctx)
    assert not ctx.outputs
