"""Worker de teste (spec 000, T031; REQ-VID-COM-047): copia a entrada sem a recodificar.

Parâmetros (só para testes):
- sleepS: espera antes de copiar, para testar tempo máximo, cancelamento e prioridade;
- corrupt: grava uma saída inválida, para testar a verificação (REQ-VID-COM-027).
"""
import os
import time

from video_utils.worker import VideoWorker


def handle(ctx):
    sleep_s = float(ctx.params.get("sleepS", 0))
    end = time.monotonic() + sleep_s
    while time.monotonic() < end:
        ctx.check()
        ctx.progress(50 * (1 - (end - time.monotonic()) / sleep_s))
        time.sleep(0.2)

    out = os.path.join(ctx.workdir, "output.mp4")
    if ctx.params.get("corrupt"):
        with open(ctx.input_path, "rb") as src, open(out, "wb") as dst:
            dst.write(src.read(4096))
    else:
        ctx.ffmpeg(["-i", ctx.input_path, "-map", "0", "-c", "copy", "-movflags", "+faststart", out], progress_range=(50, 99))

    ctx.output(
        out,
        expected={
            "container": "mp4",
            "videoCodec": "h264",
            "width": ctx.input.get("width"),
            "height": ctx.input.get("height"),
            "durationS": ctx.input.get("durationS"),
            "hasAudio": ctx.input.get("hasAudio"),
            "maxStartOffsetS": 0.04,
        },
    )


if __name__ == "__main__":
    VideoWorker("noop", handle).start()
