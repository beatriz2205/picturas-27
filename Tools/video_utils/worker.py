"""Base dos workers de vídeo (spec 000, T029; contracts/worker-messages.md, regras 1 a 10).

- TaskRunner: as regras de uma tarefa, sem RabbitMQ (testável com funções simuladas);
- VideoWorker: ligação pika, consumo com prefetch 1 e ack manual, eventos e cancelamento.

Uso numa ferramenta:

    def handle(ctx):
        out = os.path.join(ctx.workdir, "out.mp4")
        ctx.ffmpeg(["-i", ctx.input_path, ..., out], duration_s=...)
        ctx.output(out, expected={"container": "mp4", ...})

    VideoWorker("trim", handle).start()
"""
import json
import os
import queue
import shutil
import socket
import threading
import time
import traceback

import requests
import urllib3

from . import ffmpeg, messages
from . import storage as storage_mod
from .errors import Cancelled, TaskError, Timeout
from .progress import ProgressThrottle

FINAL = {"completed", "failed", "cancelled"}
TMP_ROOT = os.getenv("VIDEO_TMP_ROOT", "/tmp/video")
PROJECTS_URL = os.getenv("PROJECTS_URL", "https://projects:9001").rstrip("/")
INTERNAL_TOKEN = os.getenv("VIDEO_INTERNAL_TOKEN", "")
EXCHANGE = "picturas"
CANCEL_EXCHANGE = "video_cancel"
EVENTS_QUEUE = "video_events_queue"

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


def log(**fields):
    print(json.dumps({"event": "video-worker", **fields}), flush=True)


def get_status(task_id):
    """Estado da tarefa no projects (GET /internal/video-tasks/:id), ou None se não for possível saber."""
    try:
        resp = requests.get(
            f"{PROJECTS_URL}/internal/video-tasks/{task_id}",
            headers={"X-Internal-Token": INTERNAL_TOKEN},
            timeout=5,
            verify=False,  # certificado autoassinado da rede interna, como os restantes serviços
        )
        if resp.status_code == 404:
            return "missing"
        resp.raise_for_status()
        return resp.json().get("status")
    except (requests.RequestException, ValueError):
        return None


class TaskContext:
    """O que a ferramenta recebe: entrada descarregada, parâmetros, progresso, prazo e cancelamento."""

    def __init__(self, msg, workdir, deadline, cancel_event, send_progress, storage):
        self.task = msg
        self.task_id = msg["taskId"]
        self.owner_id = msg["ownerId"]
        self.project_id = msg["projectId"]
        self.params = msg.get("params") or {}
        self.input = msg.get("input") or {}
        self.workdir = workdir
        self.deadline = deadline
        self.cancel_event = cancel_event
        self.input_path = os.path.join(workdir, "input.mp4")
        self.outputs = []
        self.uploaded_keys = []
        self._progress = ProgressThrottle(send_progress)
        self._storage = storage

    def check(self):
        """Ponto de verificação entre passos: cancelamento ou prazo."""
        if self.cancel_event.is_set():
            raise Cancelled()
        if time.monotonic() > self.deadline:
            raise Timeout()

    def progress(self, value):
        self._progress(value)

    def ffmpeg(self, args, duration_s=None, progress_range=(0, 99)):
        """ffmpeg com progresso mapeado para progress_range, prazo e cancelamento."""
        lo, hi = progress_range
        self.check()
        ffmpeg.run(
            args,
            duration_s=duration_s or self.input.get("durationS"),
            on_progress=lambda p: self.progress(lo + (hi - lo) * p / 100),
            cancel_event=self.cancel_event,
            deadline=self.deadline,
        )

    def output(self, path, expected=None, kind="video", content_type="video/mp4"):
        """Verifica (vídeos) e carrega um resultado em video_out; regista-o para o evento completed."""
        self.check()
        size = os.path.getsize(path)
        entry = {"kind": kind, "sizeBytes": size, "sha256": storage_mod.sha256_of(path)}
        if kind == "video":
            meta = ffmpeg.verify(path, expected or {})
            entry.update(
                container=meta["container"],
                videoCodec=meta["videoCodec"],
                audioCodec=meta["audioCodec"] if meta["audioStreams"] else None,
                durationS=meta["durationS"],
                width=meta["width"],
                height=meta["height"],
                fps=meta["fps"],
            )
            if meta["container"] == "webm":
                content_type = "video/webm"
        else:
            entry["container"] = "json"
        self.check()
        key = self._storage.upload(self.owner_id, self.project_id, "video_out", path, content_type)
        self.uploaded_keys.append(key)
        entry["key"] = key
        self.outputs.append(entry)
        return entry


class TaskRunner:
    def __init__(self, tool, handler, publish, status_fn=get_status, storage=storage_mod, tmp_root=TMP_ROOT):
        self.tool = tool
        self.handler = handler
        self.publish = publish
        self.status_fn = status_fn
        self.storage = storage
        self.tmp_root = tmp_root
        self.name = f"video_{tool}@{socket.gethostname()}"

    def run(self, msg, redelivered, cancel_event):
        task_id = msg["taskId"]
        owner_id = msg.get("ownerId")

        # Regra 2: mensagem repetida depois de um worker cair a meio — não há repetição automática
        if redelivered:
            if self.status_fn(task_id) not in FINAL | {"missing"}:
                self.publish(messages.failed(task_id, owner_id, "worker_interrupted", "worker reiniciado a meio da tarefa"))
            log(taskId=task_id, action="redelivered")
            return

        # Regra 3: só começa tarefas ainda em fila (cancelada enquanto esperava → descartar)
        status = self.status_fn(task_id)
        if status is not None and status != "queued":
            log(taskId=task_id, action="skipped", status=status)
            return

        t0 = time.monotonic()
        timeout_s = (msg.get("limits") or {}).get("timeoutS") or 900
        deadline = t0 + timeout_s
        workdir = os.path.join(self.tmp_root, task_id)
        ms = lambda: (time.monotonic() - t0) * 1000  # noqa: E731

        # Regra 4
        self.publish(messages.started(task_id, self.name))
        ctx = TaskContext(msg, workdir, deadline, cancel_event, lambda v: self.publish(messages.progress(task_id, v)), self.storage)
        try:
            os.makedirs(workdir, exist_ok=True)
            # Regra 5: descarrega a entrada logo no início (o URL tem validade limitada)
            self.storage.download(msg["input"]["url"], ctx.input_path)
            ctx.check()
            self.handler(ctx)
            if not ctx.outputs:
                raise TaskError("tool_error", "a ferramenta não produziu resultado")
            ctx.check()
            # Regra 7
            self.publish(messages.completed(task_id, owner_id, ctx.outputs, ms()))
            log(taskId=task_id, action="completed", processingMs=int(ms()))
        except Cancelled:
            # Regra 9: sem eventos; se já havia resultados carregados, o projects apaga-os
            if ctx.uploaded_keys:
                self.publish(messages.failed(task_id, owner_id, "tool_error", "cancelada", ms(), ctx.uploaded_keys))
            log(taskId=task_id, action="cancelled")
        except TaskError as err:
            # Regras 6 e 10 (output_verification_failed, timeout) e restantes falhas conhecidas
            self.publish(messages.failed(task_id, owner_id, err.code, str(err), ms(), ctx.uploaded_keys))
            log(taskId=task_id, action="failed", code=err.code, detail=str(err)[:300])
        except Exception as err:  # noqa: BLE001 — qualquer erro da ferramenta termina a tarefa
            self.publish(messages.failed(task_id, owner_id, "tool_error", str(err), ms(), ctx.uploaded_keys))
            log(taskId=task_id, action="failed", code="tool_error", detail=traceback.format_exc()[-500:])
        finally:
            # Regra 8
            shutil.rmtree(workdir, ignore_errors=True)


class VideoWorker:
    """Ligação ao RabbitMQ: consome video_<tool>_queue com prefetch 1 e ack manual (regra 1)."""

    def __init__(self, tool, handler, queue_name=None):
        self.tool = tool
        self.queue = queue_name or f"video_{tool}_queue"
        self.handler = handler
        self._current = None  # (taskId, Event)
        self._lock = threading.Lock()

    def _params(self):
        import pika

        creds = pika.PlainCredentials(os.getenv("RABBITMQ_USERNAME", "user"), os.getenv("RABBITMQ_PASSWORD", "password"))
        return pika.ConnectionParameters(
            os.getenv("RABBITMQ_HOST", "rabbitmq"), int(os.getenv("RABBITMQ_PORT", 5672)), "/", creds, heartbeat=60
        )

    def _cancel_listener(self):
        """Fila exclusiva ligada ao exchange fanout video_cancel (D12)."""
        import pika

        while True:
            try:
                conn = pika.BlockingConnection(self._params())
                ch = conn.channel()
                ch.exchange_declare(CANCEL_EXCHANGE, exchange_type="fanout", durable=True)
                q = ch.queue_declare("", exclusive=True, auto_delete=True).method.queue
                ch.queue_bind(q, CANCEL_EXCHANGE)

                def on_cancel(_ch, _method, _props, body):
                    try:
                        task_id = json.loads(body).get("taskId")
                    except ValueError:
                        return
                    with self._lock:
                        if self._current and self._current[0] == task_id:
                            self._current[1].set()
                            log(taskId=task_id, action="cancel-requested")

                ch.basic_consume(q, on_cancel, auto_ack=True)
                ch.start_consuming()
            except Exception as err:  # noqa: BLE001
                log(action="cancel-listener-error", detail=str(err))
                time.sleep(5)

    def _handle(self, conn, ch, method, body):
        import pika

        try:
            msg = json.loads(body)
            task_id = msg["taskId"]
        except (ValueError, KeyError, TypeError):
            log(action="invalid-message")
            ch.basic_ack(method.delivery_tag)
            return

        outbox = queue.Queue()
        cancel_event = threading.Event()
        with self._lock:
            self._current = (task_id, cancel_event)
        runner = TaskRunner(self.tool, self.handler, outbox.put)
        th = threading.Thread(target=runner.run, args=(msg, method.redelivered, cancel_event), daemon=True)
        th.start()

        # O processamento corre noutra thread; esta mantém a ligação viva (heartbeats) e publica os eventos
        while True:
            alive = th.is_alive()
            while not outbox.empty():
                evt = outbox.get()
                ch.basic_publish(
                    EXCHANGE,
                    EVENTS_QUEUE,
                    json.dumps(evt),
                    pika.BasicProperties(delivery_mode=2, content_type="application/json"),
                )
            if not alive:
                break
            conn.process_data_events(time_limit=0.5)

        with self._lock:
            self._current = None
        ch.basic_ack(method.delivery_tag)  # regra 8: ack no fim, aconteça o que acontecer

    def start(self):
        import pika

        threading.Thread(target=self._cancel_listener, daemon=True).start()
        os.makedirs(TMP_ROOT, exist_ok=True)
        while True:
            try:
                conn = pika.BlockingConnection(self._params())
                ch = conn.channel()
                ch.basic_qos(prefetch_count=1)
                ch.queue_declare(self.queue, durable=True, arguments={"x-max-priority": 10})
                ch.queue_declare(EVENTS_QUEUE, durable=True)
                log(action="ready", queue=self.queue)
                for method, _props, body in ch.consume(self.queue, auto_ack=False, inactivity_timeout=1):
                    if method is None:
                        continue
                    self._handle(conn, ch, method, body)
            except Exception as err:  # noqa: BLE001 — religar ao RabbitMQ
                log(action="connection-error", detail=str(err))
                time.sleep(5)
