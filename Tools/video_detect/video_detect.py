"""YOLO video detection worker and testable video-processing functions."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import time
import tempfile
from pathlib import Path
from typing import Callable

import cv2
import numpy as np
import pika
import requests
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
        model = YOLO("../models/yolov5su.pt")

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
            ok, frame = capture.read()
            if not ok:
                break
            result = model(frame, conf=threshold, imgsz=640, verbose=False)[0]
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
        annotated_path=args.annotated,
        progress=lambda value: print(json.dumps({"type": "progress", "progress": value}), flush=True),
    )
    print(json.dumps({"type": "completed", "frames": document["source"]["frameCount"], "detections": sum(len(f["detections"]) for f in document["frames"]), "processingMs": round((time.monotonic() - started) * 1000)}), flush=True)


def _rabbit_connection():
    credentials = pika.PlainCredentials(os.getenv("RABBITMQ_USER", "user"), os.getenv("RABBITMQ_PASS", "password"))
    return pika.BlockingConnection(
        pika.ConnectionParameters(
            host=os.getenv("RABBITMQ_HOST", "rabbitmq"),
            port=int(os.getenv("RABBITMQ_PORT", "5672")),
            credentials=credentials,
        )
    )


def _send_event(channel, event):
    channel.exchange_declare(exchange="picturas", exchange_type="direct", durable=True)
    channel.queue_declare(queue="video_events_queue", durable=True)
    channel.queue_bind(exchange="picturas", queue="video_events_queue", routing_key="video_events_queue")
    channel.basic_publish(exchange="picturas", routing_key="video_events_queue", body=json.dumps(event).encode())


def _download_source(message, directory):
    if message.get("input", {}).get("url"):
        url = message["input"]["url"]
    else:
        key = message["sourceKey"]
        project_id, stage, name = key.split("/", 2)
        response = requests.get(
            f'{os.getenv("IMG_STORAGE_URL", "http://img_storage:11000")}/image/internal/{message["ownerId"]}/{project_id}/{stage}/{name}',
            params={"expires": 3600},
            timeout=30,
        )
        response.raise_for_status()
        url = response.json()["url"]
    target = Path(directory) / "source.mp4"
    with requests.get(url, stream=True, timeout=60) as stream:
        stream.raise_for_status()
        with target.open("wb") as handle:
            for chunk in stream.iter_content(chunk_size=1024 * 1024):
                handle.write(chunk)
    return target


def _upload(path, message, content_type, extension):
    with path.open("rb") as handle:
        response = requests.post(
            f'{os.getenv("IMG_STORAGE_URL", "http://img_storage:11000")}/video/{message["ownerId"]}/{message["projectId"]}/video_out',
            files={"file": (path.name, handle, content_type)},
            timeout=120,
        )
    response.raise_for_status()
    key = response.json()["key"]
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    return key, digest


def _handle_message(channel, message):
    task_id = message["taskId"]
    _send_event(channel, {"schemaVersion": 1, "type": "started", "taskId": task_id})
    with tempfile.TemporaryDirectory(prefix=f"video-detect-{task_id}-") as directory:
        try:
            source = _download_source(message, directory)
            json_path = Path(directory) / "detections.json"
            annotated_path = Path(directory) / "annotated.mp4" if message["params"].get("annotatedVideo") else None
            if os.getenv("VIDEO_DETECT_FAIL_ANNOTATED") and annotated_path:
                raise RuntimeError("Forced annotated video failure")
            last_progress = 0
            def progress(value):
                nonlocal last_progress
                if value != last_progress:
                    last_progress = value
                    _send_event(channel, {"schemaVersion": 1, "type": "progress", "taskId": task_id, "progress": value})
            document = detect_video(
                source,
                json_path,
                tools=message["params"]["tools"],
                threshold=message["params"]["threshold"],
                task_id=task_id,
                video_id=message["sourceVideoId"],
                annotated_path=annotated_path,
                progress=progress,
            )
            json_key, json_sha = _upload(json_path, message, "application/json", "json")
            outputs = [{
                "kind": "detections",
                "key": json_key,
                "sizeBytes": json_path.stat().st_size,
                "sha256": json_sha,
                "container": "json",
                "name": "vídeo (deteções).json",
            }]
            if annotated_path:
                video_key, video_sha = _upload(annotated_path, message, "video/mp4", "mp4")
                outputs.append({
                    "kind": "video",
                    "key": video_key,
                    "sizeBytes": annotated_path.stat().st_size,
                    "sha256": video_sha,
                    "container": "mp4",
                    "name": "vídeo (anotado).mp4",
                    "durationS": document["source"]["durationS"],
                    "width": document["source"]["width"],
                    "height": document["source"]["height"],
                    "fps": document["source"]["fps"],
                    "videoCodec": "h264",
                })
            _send_event(channel, {
                "schemaVersion": 1,
                "type": "completed",
                "taskId": task_id,
                "outputs": outputs,
                "metrics": {
                    "frames": document["source"]["frameCount"],
                    "detections": sum(len(frame["detections"]) for frame in document["frames"]),
                    "processingMs": 0,
                },
            })
        except Exception as error:
            print(f"video_detect task {task_id} failed: {error}", file=sys.stderr, flush=True)
            _send_event(channel, {
                "schemaVersion": 1,
                "type": "failed",
                "taskId": task_id,
                "reason": {"code": "tool_error"},
            })


def run_worker():
    connection = _rabbit_connection()
    channel = connection.channel()
    channel.exchange_declare(exchange="picturas", exchange_type="direct", durable=True)
    channel.queue_declare(queue="video_detect_queue", durable=True, arguments={"x-max-priority": 10})
    channel.queue_bind(exchange="picturas", queue="video_detect_queue", routing_key="video_detect_queue")
    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(queue="video_detect_queue", on_message_callback=lambda ch, method, properties, body: (_handle_message(ch, json.loads(body.decode())), ch.basic_ack(method.delivery_tag)))
    print("video_detect worker ready", flush=True)
    channel.start_consuming()


if __name__ == "__main__":
    if os.getenv("VIDEO_DETECT_MODE", "worker") == "cli":
        main()
    else:
        run_worker()
