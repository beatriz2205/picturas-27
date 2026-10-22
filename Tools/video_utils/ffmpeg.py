"""FFmpeg/ffprobe para os workers de vídeo (spec 000, T029; REQ-VID-COM-027, COM-039, COM-040).

- probe(path): metadados pelo conteúdo do ficheiro;
- run(args, ...): executa o ffmpeg com progresso, prazo e cancelamento;
- verify(path, expected): confirma que a saída é legível e corresponde ao pedido.
"""
import json
import os
import subprocess
import tempfile
import threading
import time

from .errors import Cancelled, TaskError, Timeout

DURATION_TOLERANCE_S = 0.5


def _rate(value):
    if not value or value == "0/0":
        return None
    if "/" in value:
        n, d = value.split("/")
        return round(float(n) / float(d), 3) if float(d) else None
    return float(value)


def probe(path, timeout_s=30):
    """Metadados do ficheiro, ou None se não for legível como multimédia."""
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", path],
            capture_output=True,
            timeout=timeout_s,
            check=True,
        ).stdout
        data = json.loads(out)
    except (subprocess.SubprocessError, ValueError, OSError):
        return None

    streams = data.get("streams", [])
    fmt = data.get("format", {})
    videos = [s for s in streams if s.get("codec_type") == "video" and not s.get("disposition", {}).get("attached_pic")]
    audios = [s for s in streams if s.get("codec_type") == "audio"]
    v = videos[0] if videos else {}
    names = (fmt.get("format_name") or "").split(",")
    if "webm" in names or "matroska" in names:
        container = "webm"
    elif "mp4" in names or "mov" in names:
        container = "mp4"
    else:
        container = names[0] if names and names[0] else None
    duration = fmt.get("duration") or v.get("duration")
    return {
        "container": container,
        "videoStreams": len(videos),
        "audioStreams": len(audios),
        "videoStartS": float(v.get("start_time") or 0),
        "audioStartS": float(audios[0].get("start_time") or 0) if audios else None,
        "videoCodec": v.get("codec_name"),
        "audioCodec": audios[0].get("codec_name") if audios else None,
        "width": int(v["width"]) if v.get("width") else None,
        "height": int(v["height"]) if v.get("height") else None,
        "fps": _rate(v.get("avg_frame_rate")) or _rate(v.get("r_frame_rate")),
        "durationS": round(float(duration), 3) if duration else None,
        "sizeBytes": int(fmt["size"]) if fmt.get("size") else os.path.getsize(path),
    }


def run(args, duration_s=None, on_progress=None, timeout_s=None, cancel_event=None, deadline=None):
    """Executa `ffmpeg <args>`.

    O progresso (0-100) vem de out_time_us / duração. Termina o processo se o prazo passar (Timeout)
    ou se cancel_event for ativado (Cancelled). Erro do ffmpeg -> TaskError("ffmpeg_error").
    """
    if deadline is None and timeout_s is not None:
        deadline = time.monotonic() + timeout_s
    cmd = ["ffmpeg", "-y", "-hide_banner", "-nostats", "-loglevel", "error", "-progress", "pipe:1", *args]
    stderr_file = tempfile.TemporaryFile()
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=stderr_file, stdin=subprocess.DEVNULL, text=True)
    stop = {"reason": None}

    def watch():
        while proc.poll() is None:
            if cancel_event is not None and cancel_event.is_set():
                stop["reason"] = "cancelled"
            elif deadline is not None and time.monotonic() > deadline:
                stop["reason"] = "timeout"
            if stop["reason"]:
                proc.kill()
                return
            time.sleep(0.2)

    watcher = threading.Thread(target=watch, daemon=True)
    watcher.start()
    try:
        for line in proc.stdout:
            if on_progress and duration_s and line.startswith("out_time_us="):
                try:
                    us = int(line.split("=", 1)[1])
                except ValueError:
                    continue
                on_progress(min(99.0, us / 1e6 / duration_s * 100))
        code = proc.wait()
        watcher.join(timeout=1)
    finally:
        if proc.poll() is None:
            proc.kill()
            proc.wait()

    if stop["reason"] == "cancelled":
        raise Cancelled()
    if stop["reason"] == "timeout":
        raise Timeout()
    if code != 0:
        stderr_file.seek(0)
        tail = stderr_file.read()[-2000:].decode("utf-8", "replace")
        stderr_file.close()
        raise TaskError("ffmpeg_error", tail.strip() or f"ffmpeg terminou com o código {code}")
    stderr_file.close()


def verify(path, expected):
    """Verifica a saída (worker-messages.md, regra 6; REQ-VID-COM-027).

    expected pode ter: container, videoCodec, audioCodec, width, height, durationS, hasAudio.
    Devolve os metadados lidos; lança TaskError("output_verification_failed") com o motivo.
    """
    meta = probe(path)
    problems = []
    if not meta or not meta["videoStreams"]:
        raise TaskError("output_verification_failed", "a saída não é um vídeo legível")
    for key in ("container", "videoCodec", "width", "height"):
        if expected.get(key) is not None and meta.get(key) != expected[key]:
            problems.append(f"{key}: esperado {expected[key]}, obtido {meta.get(key)}")
    if expected.get("durationS") is not None:
        if meta["durationS"] is None or abs(meta["durationS"] - expected["durationS"]) > DURATION_TOLERANCE_S:
            problems.append(f"duração: esperada {expected['durationS']} s, obtida {meta['durationS']} s")
    if expected.get("hasAudio") is not None:
        has_audio = meta["audioStreams"] > 0
        if has_audio != expected["hasAudio"]:
            problems.append("áudio em falta" if expected["hasAudio"] else "áudio inesperado")
        elif has_audio and expected.get("audioCodec") and meta["audioCodec"] != expected["audioCodec"]:
            problems.append(f"áudio: esperado {expected['audioCodec']}, obtido {meta['audioCodec']}")
    if expected.get("maxStartOffsetS") is not None and meta["audioStreams"]:
        offset = abs(meta["audioStartS"] - meta["videoStartS"])
        if offset > expected["maxStartOffsetS"] + 1e-6:
            problems.append(f"diferença de início áudio/vídeo: {offset:.6f} s")
    if problems:
        raise TaskError("output_verification_failed", "; ".join(problems))
    return meta
