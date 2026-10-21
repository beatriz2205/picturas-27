# video_speed.py importa-se como no contentor, a partir da pasta do worker; video_utils vem da pasta
# Tools (cd Tools && python -m pytest video_speed/tests).
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
sys.path.insert(1, os.path.dirname(os.path.dirname(HERE)))
