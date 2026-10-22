"""Worker de filtros visuais e ajustes de cor (spec 004, T008; REQ-VID-FLT-006, FLT-007, COM-027, COM-028).

Pipeline (research F1): um ffmpeg descodifica a origem para rgb24 num pipe, cada fotograma passa por
adjust.apply (PIL, as mesmas funções das ferramentas de imagem) e um segundo ffmpeg codifica-o em
H.264, copiando o áudio da origem. Há um fotograma de cada vez em cada etapa (memória constante) e a
leitura, o processamento e a escrita correm em paralelo (FLT-008).
"""
import json
import os
import queue
import subprocess
import tempfile
import threading
import time
from fractions import Fraction

from PIL import Image

import adjust
from video_utils import ffmpeg
from video_utils.errors import TaskError
from video_utils.worker import VideoWorker

PRESET = os.getenv("VIDEO_FILTER_PRESET", "veryfast")
CRF = os.getenv("VIDEO_FILTER_CRF", "18")
# Threads de cada ffmpeg (vazio = automático). Com limite de CPU no contentor, menos threads evitam a
# contenção entre os dois processos (T014)
THREADS = os.getenv("VIDEO_FILTER_THREADS", "")
_threads = ["-threads", THREADS] if THREADS else []
QUEUE_FRAMES = 4  # fotogramas em espera entre etapas (≈ 25 MB cada em 4K)
_END = object()


def frame_rate(path):
    """Cadência média da origem como fração exata ("30000/1001"); usada à entrada e à saída (FLT-006)."""
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=avg_frame_rate,r_frame_rate", "-of", "json", path],
        capture_output=True,
        timeout=30,
        check=True,
    ).stdout
    stream = (json.loads(out).get("streams") or [{}])[0]
    for key in ("avg_frame_rate", "r_frame_rate"):
        value = stream.get(key)
        if value and value != "0/0" and Fraction(value) > 0:
            return value
    raise TaskError("corrupted_input", "cadência da origem desconhecida")


def count_frames(path, decode=False):
    """Número de fotogramas da saída.

    Por omissão lê nb_frames do MP4 (a tabela de amostras, exata e instantânea). decode=True usa
    `ffprobe -count_frames`, que descodifica o vídeo todo (≈ 40 s para 60 s 1080p com 1 vCPU): fica
    para os testes, que confirmam que os dois valores coincidem.
    """
    entry = "nb_read_frames" if decode else "nb_frames"
    out = subprocess.run(
        ["ffprobe", "-v", "error", *(["-count_frames"] if decode else []), "-select_streams", "v:0",
         "-show_entries", f"stream={entry}", "-of", "json", path],
        capture_output=True,
        timeout=600,
        check=True,
    ).stdout
    stream = (json.loads(out).get("streams") or [{}])[0]
    return int(stream.get(entry) or 0)


def _read_exact(pipe, size):
    """Lê um fotograma inteiro do pipe, sem cópias intermédias; None no fim do vídeo."""
    buf = bytearray(size)
    view = memoryview(buf)
    got = 0
    while got < size:
        n = pipe.readinto(view[got:])
        if not n:
            if got:
                raise TaskError("ffmpeg_error", "fotograma incompleto à saída do descodificador")
            return None
        got += n
    return buf


def _put(q, item, alive):
    """put bloqueante que desiste quando alive() deixa de ser verdade (ou lança Cancelled/Timeout)."""
    while True:
        if not alive():
            return False
        try:
            q.put(item, timeout=0.2)
            return True
        except queue.Full:
            continue


def _tail(f):
    f.seek(0)
    return f.read()[-2000:].decode("utf-8", "replace").strip()


def _kill(proc):
    if proc.poll() is None:
        proc.kill()
    proc.wait()


def run_pipeline(ctx, src, out, width, height, rate, total, adjustments):
    """Descodifica → ajusta → codifica. Devolve o número de fotogramas escritos."""
    frame_bytes = width * height * 3
    dec_err, enc_err = tempfile.TemporaryFile(), tempfile.TemporaryFile()
    dec = subprocess.Popen(
        ["ffmpeg", "-hide_banner", "-nostats", "-loglevel", "error", *_threads, "-i", src,
         "-map", "0:v:0", "-f", "rawvideo", "-pix_fmt", "rgb24", "-fps_mode", "cfr", "-r", rate, "pipe:1"],
        stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=dec_err,
    )
    enc = subprocess.Popen(
        ["ffmpeg", "-y", "-hide_banner", "-nostats", "-loglevel", "error",
         "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{width}x{height}", "-r", rate, "-i", "pipe:0",
         "-i", src, "-map", "0:v", "-map", "1:a:0?",
         *_threads, "-c:v", "libx264", "-preset", PRESET, "-crf", CRF, "-pix_fmt", "yuv420p",
         # Sem -shortest (research F1 tinha-o): o áudio vem da própria origem e o -shortest cortava o
         # último fotograma quando o AAC acaba uns ms antes do vídeo (FLT-006)
         "-c:a", "copy", "-movflags", "+faststart", out],
        stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=enc_err,
    )
    stop = threading.Event()
    inq, outq = queue.Queue(QUEUE_FRAMES), queue.Queue(QUEUE_FRAMES)
    errors = []

    def reader():
        try:
            while not stop.is_set():
                buf = _read_exact(dec.stdout, frame_bytes)
                if buf is None:
                    break
                if not _put(inq, buf, lambda: not stop.is_set()):
                    return
        except Exception as err:  # noqa: BLE001 — passado à thread principal
            errors.append(err)
        _put(inq, _END, lambda: not stop.is_set())

    def writer():
        try:
            while not stop.is_set():
                try:
                    item = outq.get(timeout=0.2)
                except queue.Empty:
                    continue
                if item is _END:
                    break
                enc.stdin.write(item)
        except OSError as err:  # BrokenPipe: o codificador terminou antes do tempo
            errors.append(err)
        finally:
            try:
                enc.stdin.close()
            except OSError:
                pass

    threads = [threading.Thread(target=reader, daemon=True), threading.Thread(target=writer, daemon=True)]
    for t in threads:
        t.start()
    w = threads[1]
    frames = 0
    try:
        while True:
            ctx.check()
            try:
                buf = inq.get(timeout=0.2)
            except queue.Empty:
                continue
            if buf is _END:
                break
            img = adjust.apply(Image.frombytes("RGB", (width, height), buf), *adjustments)
            if not _put(outq, img.tobytes(), lambda: (ctx.check() or True) and w.is_alive()):
                # o codificador falhou: parar também o descodificador (o erro sai abaixo)
                stop.set()
                _kill(dec)
                break
            frames += 1
            ctx.progress(frames / total * 99)
        _put(outq, _END, lambda: (ctx.check() or True) and w.is_alive())
        while w.is_alive() or enc.poll() is None or dec.poll() is None:
            ctx.check()
            time.sleep(0.1)
    except BaseException:
        stop.set()
        _kill(dec)
        _kill(enc)
        raise
    finally:
        stop.set()
        for t in threads:
            t.join(timeout=2)

    # O codificador primeiro: quando falha, o descodificador é morto e também termina com erro
    try:
        if enc.returncode != 0 or any(isinstance(e, OSError) for e in errors):
            raise TaskError("ffmpeg_error", _tail(enc_err) or f"codificador terminou com o código {enc.returncode}")
        if dec.returncode != 0 or errors:
            raise TaskError("ffmpeg_error", _tail(dec_err) or f"descodificador terminou com o código {dec.returncode}")
    finally:
        dec_err.close()
        enc_err.close()
    return frames


def handle(ctx):
    meta = ffmpeg.probe(ctx.input_path)
    if not meta or not meta["videoStreams"] or not meta["width"] or not meta["height"]:
        raise TaskError("corrupted_input", "a origem não é um vídeo legível")
    width, height = meta["width"], meta["height"]
    rate = frame_rate(ctx.input_path)
    fps = float(Fraction(rate))
    duration = meta["durationS"] or ctx.input.get("durationS") or 0
    total = max(1, round(duration * fps))
    out = os.path.join(ctx.workdir, "output.mp4")

    frames = run_pipeline(ctx, ctx.input_path, out, width, height, rate, total, adjust.factors(ctx.params))

    # Verificação própria de FLT-006 (a de video_utils não conta fotogramas nem compara a cadência)
    ctx.check()
    out_meta = ffmpeg.probe(out)
    problems = []
    if not frames:
        problems.append("nenhum fotograma processado")
    if out_meta and out_meta["fps"] is not None and abs(out_meta["fps"] - round(fps, 3)) > 0.01:
        problems.append(f"fps: esperado {round(fps, 3)}, obtido {out_meta['fps']}")
    counted = count_frames(out)
    if counted != frames:
        problems.append(f"fotogramas: escritos {frames}, lidos {counted}")
    if problems:
        raise TaskError("output_verification_failed", "; ".join(problems))

    has_audio = meta["audioStreams"] > 0
    ctx.output(
        out,
        expected={
            "container": "mp4",
            "videoCodec": "h264",
            "width": width,
            "height": height,
            "durationS": duration,
            "hasAudio": has_audio,
            "maxStartOffsetS": 0.04,
            "audioCodec": meta["audioCodec"] if has_audio else None,
        },
    )


if __name__ == "__main__":
    VideoWorker("filter", handle).start()
