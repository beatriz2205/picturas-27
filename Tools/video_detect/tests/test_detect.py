import json
from pathlib import Path

from jsonschema import validate


def test_detection_document_contains_both_tools_and_threshold():
    schema_path = Path(__file__).parents[1] / "detections.v1.schema.json"
    with schema_path.open(encoding="utf-8") as handle:
        schema = json.load(handle)
    document = {
        "schemaVersion": 1,
        "source": {"videoId": "video", "durationS": 10, "fps": 1, "width": 100, "height": 100, "frameCount": 1},
        "task": {"id": "task", "tools": ["people_ai", "obj_ai"], "threshold": 0.7, "model": "yolov5su"},
        "classes": ["person"],
        "frames": [{
            "index": 0,
            "timeS": 0,
            "detections": [
                {"tool": "people_ai", "class": "person", "confidence": 0.8, "box": {"cx": 0.5, "cy": 0.5, "w": 0.2, "h": 0.2}},
                {"tool": "obj_ai", "class": "person", "confidence": 0.8, "box": {"cx": 0.5, "cy": 0.5, "w": 0.2, "h": 0.2}},
            ],
        }],
    }
    validate(document, schema)
    assert all(item["confidence"] >= 0.7 for frame in document["frames"] for item in frame["detections"])
