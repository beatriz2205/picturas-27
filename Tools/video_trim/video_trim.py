"""Worker de recorte (spec 002, T006; REQ-VID-TRIM-005, TRIM-009, COM-027, COM-028).

Recodifica o intervalo [startS, endS] com procura exata ao fotograma (research T1): o -ss antes do
-i é uma procura rápida com 2 s de margem e o -ss depois do -i descarta os fotogramas até ao início
pedido. Os tempos chegam já arredondados ao fotograma pelo projects (trim.js).
"""
import json
import os
import subprocess

from video_utils import ffmpeg
from video_utils.errors import TaskError
from video_utils.worker import VideoWorker

PRESET = os.getenv("VIDEO_TRIM_PRESET", "veryfast")
CRF = os.getenv("VIDEO_TRIM_CRF", "20")
SEEK_MARGIN_S = 2.0


def frame_rate(path):
    """Cadência da origem como fração exata ("30000/1001"), para o filtro fps da saída."""
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=avg_frame_rate,r_frame_rate", "-of", "json", path],
        capture_output=True,
        timeout=30,
        check=True,
    ).stdout
    stream = (json.loads(out).get("streams") or [{}])[0]
    for key in ("avg_frame_rate", "r_frame_rate"):
        value = stream.get(key)
        if value and value != "0/0" and not value.startswith("0/"):
            return value
    raise TaskError("corrupted_input", "cadência da origem desconhecida")


def build_args(src, out, start, end, rate, scale=None):
    """Argumentos do ffmpeg (research T1). scale: "-2:720" / "720:-2", ou None para manter."""
    pre = max(0.0, start - SEEK_MARGIN_S)
    vf = ([f"scale={scale}:flags=lanczos"] if scale else []) + [f"fps={rate}"]
    return [
        "-ss", f"{pre:.6f}", "-i", src,
        "-ss", f"{start - pre:.6f}", "-t", f"{end - start:.6f}",
        "-map", "0:v:0", "-map", "0:a:0?",
        "-vf", ",".join(vf),
        "-c:v", "libx264", "-preset", PRESET, "-crf", CRF, "-pix_fmt", "yuv420p", "-profile:v", "high",
        "-c:a", "aac", "-b:a", "160k",
        "-movflags", "+faststart", out,
    ]


def handle(ctx):
    meta = ffmpeg.probe(ctx.input_path)
    if not meta or not meta["videoStreams"] or not meta["width"] or not meta["height"]:
        raise TaskError("corrupted_input", "a origem não é um vídeo legível")
    width, height = meta["width"], meta["height"]
    short = min(width, height)

    start = float(ctx.params.get("startS") or 0)
    end = ctx.params.get("endS")
    end = float(end) if end is not None else (meta["durationS"] or ctx.input.get("durationS"))
    target = int(ctx.params.get("height") or short)
    if end is None or end - start <= 0 or target > short:
        raise TaskError("tool_error", f"parâmetros inválidos: {ctx.params}")

    # A "altura" é o lado menor (COM-010): num vídeo vertical é a largura que muda
    scale = None
    expected_size = {"width": width, "height": height}
    if target < short:
        if width >= height:
            scale, expected_size = f"-2:{target}", {"height": target}
        else:
            scale, expected_size = f"{target}:-2", {"width": target}

    out = os.path.join(ctx.workdir, "output.mp4")
    ctx.ffmpeg(build_args(ctx.input_path, out, start, end, frame_rate(ctx.input_path), scale), duration_s=end - start)

    has_audio = meta["audioStreams"] > 0
    ctx.output(
        out,
        expected={
            "container": "mp4",
            "videoCodec": "h264",
            "durationS": end - start,
            "hasAudio": has_audio,
            "audioCodec": "aac" if has_audio else None,
            **expected_size,
        },
    )


if __name__ == "__main__":
    VideoWorker("trim", handle).start()
