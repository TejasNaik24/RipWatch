"""Stub: detects the synthetic red blob; drops every 4th frame to simulate flicker."""
import os
import cv2
import numpy as np


class _T:
    def __init__(self, a): self.a = np.asarray(a, np.float32)
    def cpu(self): return self
    def numpy(self): return self.a


class _Masks:
    def __init__(self, xy): self.xy = xy


class _Boxes:
    def __init__(self, conf): self.conf = _T(conf)


class _R:
    def __init__(self, xy, conf):
        self.masks = _Masks(xy) if xy else None
        self.boxes = _Boxes(conf) if xy else None


class YOLO:
    def __init__(self, weights): self.n = 0
    def __call__(self, frame, conf=0.25, imgsz=640, verbose=False, device=None):
        self.n += 1
        if os.environ.get("STUB_FLICKER", "1") == "1" and self.n % 4 == 0:
            return [_R([], [])]
        b, g, r = cv2.split(frame)
        m = ((r > 150) & (g < 90) & (b < 90)).astype(np.uint8)
        cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        cs = [c for c in cs if cv2.contourArea(c) > 50]
        xy = [c.reshape(-1, 2).astype(np.float32) for c in cs]
        return [_R(xy, [0.8] * len(xy))]
