import json
from pathlib import Path

from jsonschema import Draft202012Validator


def test_detection_schema_is_valid():
    schema_path = Path(__file__).parents[1] / "detections.v1.schema.json"
    with schema_path.open(encoding="utf-8") as handle:
        schema = json.load(handle)
    Draft202012Validator.check_schema(schema)
    document = {
        "schemaVersion": 1,
        "source": {"videoId": "v", "durationS": 1, "fps": 1, "width": 10, "height": 10, "frameCount": 1},
        "task": {"id": "t", "tools": ["people_ai"], "threshold": 0.7, "model": "yolov5su"},
        "classes": ["person"],
        "frames": [{"index": 0, "timeS": 0, "detections": [{"tool": "people_ai", "class": "person", "confidence": 0.7, "box": {"cx": 0.5, "cy": 0.5, "w": 0.2, "h": 0.2}}]}],
    }
    Draft202012Validator(schema).validate(document)
