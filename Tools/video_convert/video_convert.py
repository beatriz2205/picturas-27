"""Conversão de vídeos para MP4/H.264 ou WebM/VP9."""
import os

from video_utils import ffmpeg
from video_utils.errors import TaskError
from video_utils.worker import VideoWorker


def scale_filter(width, height, target_height):
    if width < height:
        return f"scale={target_height}:-2:flags=lanczos"
    return f"scale=-2:{target_height}:flags=lanczos"


def handle(ctx):
    params = ctx.params
    source_width = ctx.input.get("width")
    source_height = ctx.input.get("height")
    target_height = params.get("height")
    if not source_width or not source_height or not target_height:
        raise TaskError("corrupted_input", "dimensões da origem ou resolução pedida desconhecidas")

    source_short_side = min(source_width, source_height)
    output_format = params["format"]
    extension = "webm" if output_format == "webm" else "mp4"
    output_path = os.path.join(ctx.workdir, f"output.{extension}")

    args = ["-i", ctx.input_path, "-map", "0:v:0", "-map", "0:a:0?"]
    if target_height < source_short_side:
        args += ["-vf", scale_filter(source_width, source_height, target_height)]

    if output_format == "webm":
        video_codec = "vp9"
        audio_codec = "opus"
        args += [
            "-c:v", "libvpx-vp9", "-deadline", "realtime", "-cpu-used", "8",
            "-row-mt", "1", "-b:v", "0", "-crf", "33", "-pix_fmt", "yuv420p",
            "-c:a", "libopus", "-b:a", "128k",
        ]
        content_type = "video/webm"
    else:
        video_codec = "h264"
        audio_codec = "aac"
        args += [
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "21", "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart",
        ]
        content_type = "video/mp4"
    args.append(output_path)

    ctx.ffmpeg(args, duration_s=ctx.input.get("durationS"))

    expected = {
        "container": output_format,
        "videoCodec": video_codec,
        "audioCodec": audio_codec,
        "durationS": ctx.input.get("durationS"),
        "hasAudio": ctx.input.get("hasAudio"),
    }
    meta = ffmpeg.verify(output_path, expected)
    if min(meta["width"], meta["height"]) != target_height:
        raise TaskError(
            "output_verification_failed",
            f"lado menor: esperado {target_height}, obtido {min(meta['width'], meta['height'])}",
        )
    ctx.output(output_path, expected=expected, content_type=content_type)


if __name__ == "__main__":
    VideoWorker("convert", handle).start()
