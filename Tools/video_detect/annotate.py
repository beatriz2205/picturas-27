"""Drawing helpers for annotated detection videos."""

import hashlib

import cv2


def _color(label: str) -> tuple[int, int, int]:
    digest = hashlib.sha1(label.encode("utf-8")).digest()
    return (40 + digest[0] % 190, 40 + digest[1] % 190, 40 + digest[2] % 190)


def draw(frame, detections):
    """Draw each object once, preferring the people detector when duplicated."""
    drawn = set()
    height, width = frame.shape[:2]
    for detection in detections:
        box = detection["box"]
        key = (
            detection["class"],
            round(box["cx"], 3),
            round(box["cy"], 3),
            round(box["w"], 3),
            round(box["h"], 3),
        )
        if key in drawn:
            continue
        drawn.add(key)
        x1 = max(0, int((box["cx"] - box["w"] / 2) * width))
        y1 = max(0, int((box["cy"] - box["h"] / 2) * height))
        x2 = min(width - 1, int((box["cx"] + box["w"] / 2) * width))
        y2 = min(height - 1, int((box["cy"] + box["h"] / 2) * height))
        color = _color(detection["class"])
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
        cv2.putText(
            frame,
            f'{detection["class"]} {detection["confidence"]:.2f}',
            (x1, max(16, y1 - 5)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            color,
            1,
            cv2.LINE_AA,
        )
    return frame
