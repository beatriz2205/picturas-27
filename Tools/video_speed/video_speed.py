"""Worker de alteração de velocidade (UC-VID-006; REQ-VID-SPD-002 a SPD-004, COM-027, COM-028).

O vídeo é acelerado ou abrandado com setpts e reamostrado para a cadência da origem (fotogramas
repetidos em câmara lenta, descartados quando acelera). O áudio passa pelo atempo, que muda a
velocidade sem mudar o tom; os fatores aceites (0,5× a 2×) cabem num só atempo.
"""
import os

from video_utils import ffmpeg
from video_utils.errors import TaskError
from video_utils.worker import VideoWorker

# Os fatores aceites são validados pelo projects (projects/video/tools/speed.js)
FACTORS = (0.5, 0.75, 1.25, 1.5, 2.0)
PRESET = os.getenv("VIDEO_SPEED_PRESET", "veryfast")
CRF = os.getenv("VIDEO_SPEED_CRF", "20")


def build_args(src, out, factor, rate, has_audio):
    args = ["-i", src, "-map", "0:v:0", "-vf", f"setpts=PTS/{factor},fps={rate}"]
    if has_audio:
        args += ["-map", "0:a:0", "-af", f"atempo={factor}", "-c:a", "aac", "-b:a", "160k"]
    return args + [
        "-c:v", "libx264", "-preset", PRESET, "-crf", CRF, "-pix_fmt", "yuv420p", "-profile:v", "high",
        "-movflags", "+faststart", out,
    ]


def handle(ctx):
    meta = ffmpeg.probe(ctx.input_path)
    if not meta or not meta["videoStreams"] or not meta["width"] or not meta["height"] or not meta["durationS"]:
        raise TaskError("corrupted_input", "a origem não é um vídeo legível")

    factor = float(ctx.params.get("factor") or 0)
    if factor not in FACTORS:
        raise TaskError("tool_error", f"velocidade inválida: {ctx.params}")

    expected_s = meta["durationS"] / factor
    has_audio = meta["audioStreams"] > 0
    out = os.path.join(ctx.workdir, "output.mp4")
    ctx.ffmpeg(build_args(ctx.input_path, out, factor, meta["fps"] or 30, has_audio), duration_s=expected_s)

    ctx.output(
        out,
        expected={
            "container": "mp4",
            "videoCodec": "h264",
            "width": meta["width"],
            "height": meta["height"],
            "durationS": expected_s,
            "hasAudio": has_audio,
            "audioCodec": "aac" if has_audio else None,
        },
    )


if __name__ == "__main__":
    VideoWorker("speed", handle).start()
