"""spec 000 (T030) — regras do worker (contracts/worker-messages.md) sem RabbitMQ.

Armazenamento e estado das tarefas simulados; ffmpeg real.
"""
import os
import json
import shutil
import subprocess
import threading

import pytest

from video_utils.worker import TaskRunner


@pytest.fixture(scope="module")
def source(tmp_path_factory):
    path = tmp_path_factory.mktemp("src") / "in.mp4"
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc2=duration=2:size=320x240:rate=25",
         "-f", "lavfi", "-i", "sine=duration=2", "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-shortest", str(path)],
        check=True,
    )
    return str(path)


class FakeStorage:
    def __init__(self, source):
        self.source = source
        self.uploaded = []

    def download(self, url, path):
        shutil.copy(self.source, path)

    def upload(self, owner, project, stage, path, content_type):
        key = f"{project}/{stage}/out{len(self.uploaded)}.mp4"
        self.uploaded.append(key)
        return key


def msg(timeout_s=60, **params):
    return {
        "schemaVersion": 1,
        "type": "video-task",
        "taskId": "t1",
        "tool": "noop",
        "ownerId": "o1",
        "projectId": "p1",
        "input": {"url": "http://x", "durationS": 2.0, "width": 320, "height": 240, "fps": 25, "hasAudio": True},
        "params": params,
        "output": {"stage": "video_out"},
        "limits": {"timeoutS": timeout_s},
    }


def copy_handler(ctx):
    out = os.path.join(ctx.workdir, "out.mp4")
    ctx.ffmpeg(["-i", ctx.input_path, "-c", "copy", out])
    ctx.output(out, {"container": "mp4", "width": 320, "height": 240, "durationS": 2.0, "hasAudio": True})


def runner(handler, status="queued", source=None, tmp_path=None):
    events = []
    storage = FakeStorage(source)
    r = TaskRunner("noop", handler, events.append, status_fn=lambda _id: status, storage=storage, tmp_root=str(tmp_path))
    return r, events, storage


def types(events):
    return [e["type"] for e in events]


def test_tarefa_completa(source, tmp_path):
    r, events, storage = runner(copy_handler, source=source, tmp_path=tmp_path)
    r.run(msg(), False, threading.Event())
    assert types(events)[0] == "started"
    assert types(events)[-1] == "completed"
    done = events[-1]
    assert done["ownerId"] == "o1"
    assert done["outputs"][0]["key"] == storage.uploaded[0]
    assert done["outputs"][0]["width"] == 320
    assert done["outputs"][0]["audioCodec"] == "aac"
    assert not os.path.exists(tmp_path / "t1"), "temporários apagados (regra 8)"


def test_redelivered_falha_worker_interrupted(source, tmp_path):
    r, events, _ = runner(copy_handler, status="processing", source=source, tmp_path=tmp_path)
    r.run(msg(), True, threading.Event())
    assert types(events) == ["failed"]
    assert events[0]["reason"]["code"] == "worker_interrupted"


def test_redelivered_tarefa_ja_final_nao_publica(source, tmp_path):
    r, events, _ = runner(copy_handler, status="cancelled", source=source, tmp_path=tmp_path)
    r.run(msg(), True, threading.Event())
    assert events == []


@pytest.mark.parametrize("status", ["cancelled", "processing", "missing"])
def test_tarefa_nao_queued_e_descartada(source, tmp_path, status):
    r, events, _ = runner(copy_handler, status=status, source=source, tmp_path=tmp_path)
    r.run(msg(), False, threading.Event())
    assert events == []


def test_cancelamento_termina_o_processo_e_apaga_temporarios(source, tmp_path):
    def slow(ctx):
        out = os.path.join(ctx.workdir, "out.mp4")
        # -re: tempo real, 30 s de vídeo → só termina se for morto
        ctx.ffmpeg(["-re", "-f", "lavfi", "-i", "testsrc2=duration=30:size=160x120", "-c:v", "libx264", "-preset", "ultrafast", out], duration_s=30)

    r, events, storage = runner(slow, source=source, tmp_path=tmp_path)
    cancel = threading.Event()
    threading.Timer(1.0, cancel.set).start()
    r.run(msg(), False, cancel)
    assert types(events)[0] == "started"
    assert "failed" not in types(events) and "completed" not in types(events), "cancelamento sem eventos (regra 9)"
    assert storage.uploaded == []
    assert not os.path.exists(tmp_path / "t1")


def test_timeout(source, tmp_path):
    def slow(ctx):
        out = os.path.join(ctx.workdir, "out.mp4")
        ctx.ffmpeg(["-re", "-f", "lavfi", "-i", "testsrc2=duration=30:size=160x120", "-c:v", "libx264", "-preset", "ultrafast", out], duration_s=30)

    r, events, _ = runner(slow, source=source, tmp_path=tmp_path)
    r.run(msg(timeout_s=1), False, threading.Event())
    assert types(events)[-1] == "failed"
    assert events[-1]["reason"]["code"] == "timeout"


def test_saida_invalida_output_verification_failed(source, tmp_path):
    def corrupt(ctx):
        out = os.path.join(ctx.workdir, "out.mp4")
        with open(ctx.input_path, "rb") as src, open(out, "wb") as dst:
            dst.write(src.read(2048))
        ctx.output(out, {"container": "mp4"})

    r, events, storage = runner(corrupt, source=source, tmp_path=tmp_path)
    r.run(msg(), False, threading.Event())
    assert events[-1]["type"] == "failed"
    assert events[-1]["reason"]["code"] == "output_verification_failed"
    assert storage.uploaded == [], "a saída inválida não é carregada"


def test_erro_inesperado_da_ferramenta(source, tmp_path):
    def boom(ctx):
        raise RuntimeError("falhou")

    r, events, _ = runner(boom, source=source, tmp_path=tmp_path)
    r.run(msg(), False, threading.Event())
    assert events[-1]["reason"]["code"] == "tool_error"


def test_worker_republishes_progress_while_inference_is_busy(monkeypatch):
    from types import SimpleNamespace
    from video_utils import worker

    now = [0.0]
    monkeypatch.setattr(worker.time, "monotonic", lambda: now[0])

    class Thread:
        def __init__(self, **kwargs):
            self.ticks = iter([True, True, False])
        def start(self):
            pass
        def is_alive(self):
            return next(self.ticks)

    monkeypatch.setattr(worker.threading, "Thread", Thread)
    published = []
    acknowledgements = []
    channel = SimpleNamespace(
        basic_publish=lambda *args: published.append(json.loads(args[2])),
        basic_ack=acknowledgements.append,
    )
    connection = SimpleNamespace(process_data_events=lambda **kwargs: now.__setitem__(0, now[0] + 3))
    worker.VideoWorker("detect", lambda ctx: None)._handle(
        connection, channel, SimpleNamespace(redelivered=False, delivery_tag=1),
        json.dumps({"taskId": "t1"}),
    )
    assert [event["progress"] for event in published] == [0]
    assert acknowledgements == [1]
