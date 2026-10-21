"""Parity contract tests for the shared YOLO invocation.

The full 20-frame parity benchmark is run by the quickstart against a supplied
video and the image workers. This focused test protects the shared conversion
from pixel coordinates to the image-worker format.
"""

import numpy as np

from Tools.video_detect.video_detect import _box


def test_normalized_box_matches_image_worker_format():
    assert _box(np.array([10, 20, 30, 60]), 100, 100) == {
        "cx": 0.2,
        "cy": 0.4,
        "w": 0.2,
        "h": 0.4,
    }
