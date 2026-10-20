"""Limitador do progresso: no máximo um evento a cada 2 s e só quando o valor avança (worker-messages.md, regra 5).

O FFmpeg reporta o progresso a cada ~0,5 s, por isso, enquanto houver avanço, há um evento pelo menos a
cada 2 a 4 s (REQ-VID-COM-013, progresso a cada <= 5 s).
"""
import time


class ProgressThrottle:
    def __init__(self, send, min_interval_s=2.0, clock=time.monotonic):
        self._send = send
        self._min = min_interval_s
        self._clock = clock
        self._last_t = None
        self._last_v = -1

    def __call__(self, value):
        value = int(max(0, min(99, value)))
        now = self._clock()
        if value <= self._last_v:
            return False
        if self._last_t is not None and now - self._last_t < self._min:
            return False
        self._last_t = now
        self._last_v = value
        self._send(value)
        return True
