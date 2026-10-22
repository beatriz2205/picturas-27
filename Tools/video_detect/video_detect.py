"""YOLO video detection worker and testable video-processing functions."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import time
from pathlib import Path
from typing import Callable

import cv2
import numpy as np
from video_utils import ffmpeg
from video_utils.worker import VideoWorker
from jsonschema import validate as validate_schema

try:
    from .annotate import draw
except ImportError:
    from annotate import draw

SCHEMA_PATH = Path(__file__).with_name("detections.v1.schema.json")


def _probe(path: str | Path) -> dict:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-print_format",
            "json",
            "-show_streams",
            "-show_format",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
        timeout=30,
    )
    data = json.loads(result.stdout)
    stream = next(s for s in data["streams"] if s["codec_type"] == "video")
    fps_num, fps_den = (stream.get("r_frame_rate", "0/1").split("/") + ["1"])[:2]
    fps = float(fps_num) / float(fps_den)
    duration = float(stream.get("duration") or data["format"].get("duration") or 0)
    return {
        "durationS": duration,
        "fps": fps,
        "width": int(stream["width"]),
        "height": int(stream["height"]),
        "frameCount": int(round(duration * fps)) if duration and fps else 0,
    }


def _box(values: np.ndarray, width: int, height: int) -> dict:
    x1, y1, x2, y2 = [float(value) for value in values]
    return {
        "cx": round((x1 + x2) / (2 * width), 4),
        "cy": round((y1 + y2) / (2 * height), 4),
        "w": round((x2 - x1) / width, 4),
        "h": round((y2 - y1) / height, 4),
    }


def _detections(result, tools: list[str], threshold: float, width: int, height: int) -> list[dict]:
    detections = []
    for box in result.boxes:
        confidence = float(box.conf[0])
        if confidence < threshold:
            continue
        class_id = int(box.cls[0])
        class_name = str(result.names[class_id])
        base = {
            "class": class_name,
            "confidence": round(confidence, 4),
            "box": _box(box.xyxy[0], width, height),
        }
        if "obj_ai" in tools:
            detections.append({"tool": "obj_ai", **base})
        if "people_ai" in tools and class_id == 0:
            detections.append({"tool": "people_ai", **base})
    return detections


def detect_video(
    input_path: str | Path,
    output_json: str | Path,
    *,
    tools: list[str],
    threshold: float = 0.5,
    task_id: str = "local",
    video_id: str = "local",
    model=None,
    annotated_path: str | Path | None = None,
    progress: Callable[[int], None] | None = None,
    check: Callable[[], None] = lambda: None,
) -> dict:
    if not tools or len(tools) != len(set(tools)):
        raise ValueError("tools must contain one or two distinct detector names")
    if not 0 <= threshold <= 1:
        raise ValueError("threshold must be between 0 and 1")

    metadata = _probe(input_path)
    if model is None:
        import torch
        from ultralytics import YOLO

        torch.set_num_threads(1)
        model = YOLO(str(Path(__file__).resolve().parent.parent / "models" / "yolov5su.pt"))

    capture = cv2.VideoCapture(str(input_path))
    if not capture.isOpened():
        raise RuntimeError(f"Unable to open video: {input_path}")
    writer = None
    if annotated_path:
        writer = cv2.VideoWriter(
            str(annotated_path),
            cv2.VideoWriter_fourcc(*"mp4v"),
            metadata["fps"],
            (metadata["width"], metadata["height"]),
        )
        if not writer.isOpened():
            capture.release()
            raise RuntimeError(f"Unable to create annotated video: {annotated_path}")

    frames = []
    classes = set()
    index = 0
    try:
        while True:
            check()
            ok, frame = capture.read()
            if not ok:
                break
            result = model(frame, conf=threshold, imgsz=640, verbose=False)[0]
            check()
            current = _detections(result, tools, threshold, metadata["width"], metadata["height"])
            if current:
                frames.append({"index": index, "timeS": round(index / metadata["fps"], 3), "detections": current})
                classes.update(item["class"] for item in current)
            if writer:
                writer.write(draw(frame, current))
            index += 1
            if progress and metadata["frameCount"]:
                progress(round(index * 100 / metadata["frameCount"]))
    finally:
        capture.release()
        if writer:
            writer.release()

    metadata["frameCount"] = index
    document = {
        "schemaVersion": 1,
        "source": {"videoId": video_id, **metadata},
        "task": {"id": task_id, "tools": tools, "threshold": threshold, "model": "yolov5su"},
        "classes": sorted(classes),
        "frames": frames,
    }
    with open(output_json, "w", encoding="utf-8") as handle:
        json.dump(document, handle, ensure_ascii=False, separators=(",", ":"))
    with open(SCHEMA_PATH, encoding="utf-8") as handle:
        validate_schema(document, json.load(handle))
    return document


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input")
    parser.add_argument("output")
    parser.add_argument("--tools", nargs="+", choices=["people_ai", "obj_ai"], required=True)
    parser.add_argument("--threshold", type=float, default=0.5)
    parser.add_argument("--task-id", default="local")
    parser.add_argument("--video-id", default="local")
    parser.add_argument("--annotated")
    args = parser.parse_args()
    if os.getenv("VIDEO_DETECT_FAIL_ANNOTATED") and args.annotated:
        raise RuntimeError("Forced annotated video failure")
    started = time.monotonic()
    document = detect_video(
        args.input,
        args.output,
        tools=args.tools,
        threshold=args.threshold,
        task_id=args.task_id,
        video_id=args.video_id,
        annotated_path=(str(Path(args.annotated).with_suffix(".raw.mp4")) if args.annotated else None),
        progress=lambda value: print(json.dumps({"type": "progress", "progress": value}), flush=True),
    )
    if args.annotated:
        raw = Path(args.annotated).with_suffix(".raw.mp4")
        try:
            ffmpeg.run(["-i", str(raw), "-i", args.input, "-map", "0:v:0", "-map", "1:a:0?",
                        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "copy",
                        "-movflags", "+faststart", args.annotated])
            meta = ffmpeg.probe(args.input)
            ffmpeg.verify(args.annotated, {
                "container": "mp4", "videoCodec": "h264",
                "durationS": meta["durationS"], "hasAudio": meta["audioStreams"] > 0,
                "audioCodec": meta["audioCodec"],
                "maxStartOffsetS": 0.04,
            })
        finally:
            raw.unlink(missing_ok=True)
    print(json.dumps({"type": "completed", "frames": document["source"]["frameCount"], "detections": sum(len(f["detections"]) for f in document["frames"]), "processingMs": round((time.monotonic() - started) * 1000)}), flush=True)


def handle(ctx):
    params = ctx.params
    json_path = Path(ctx.workdir) / "detections.json"
    raw_path = Path(ctx.workdir) / "annotations.mp4" if params.get("annotatedVideo") else None
    if os.getenv("VIDEO_DETECT_FAIL_ANNOTATED") and raw_path:
        raise RuntimeError("Forced annotated video failure")
    detect_video(
        ctx.input_path, json_path, tools=params["tools"],
        threshold=params.get("threshold", 0.5), task_id=ctx.task_id,
        video_id=ctx.task["sourceVideoId"], annotated_path=raw_path,
        progress=lambda value: ctx.progress(min(90, value * 0.9)),
        check=ctx.check,
    )
    ctx.check()
    video_path = Path(ctx.workdir) / "annotated.mp4"
    expected = None
    if raw_path:
        meta = ffmpeg.probe(ctx.input_path)
        ctx.ffmpeg([
            "-i", str(raw_path), "-i", ctx.input_path,
            "-map", "0:v:0", "-map", "1:a:0?",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
            "-pix_fmt", "yuv420p", "-c:a", "copy",
            "-movflags", "+faststart", str(video_path),
        ], progress_range=(90, 99))
        expected = {
            "container": "mp4", "videoCodec": "h264",
            "width": meta["width"], "height": meta["height"],
            "durationS": meta["durationS"], "hasAudio": meta["audioStreams"] > 0,
            "audioCodec": meta["audioCodec"],
                "maxStartOffsetS": 0.04,
        }
        ffmpeg.verify(str(video_path), expected)
    ctx.output(str(json_path), kind="detections", content_type="application/json")["name"] = "vídeo (deteções).json"
    if raw_path:
        ctx.output(str(video_path), expected=expected)["name"] = "vídeo (anotado).mp4"


def run_worker():
    VideoWorker("detect", handle).start()


if __name__ == "__main__":
    if os.getenv("VIDEO_DETECT_MODE", "worker") == "cli":
        main()
    else:
        run_worker()
