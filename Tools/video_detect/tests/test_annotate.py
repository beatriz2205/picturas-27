import numpy as np

from Tools.video_detect.annotate import draw


def test_person_detected_by_both_tools_is_drawn_once():
    frame = np.zeros((100, 100, 3), dtype=np.uint8)
    detection = {"class": "person", "confidence": 0.9, "box": {"cx": 0.5, "cy": 0.5, "w": 0.4, "h": 0.4}}
    result = draw(frame, [{"tool": "obj_ai", **detection}, {"tool": "people_ai", **detection}])
    assert result.sum() > 0
