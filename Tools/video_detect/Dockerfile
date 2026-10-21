FROM python:3.11-slim

WORKDIR /app

RUN pip3 install torch torchvision --index-url https://download.pytorch.org/whl/cpu
RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg libgl1 libglib2.0-0 libsm6 libxext6 libxrender1 \
    && rm -rf /var/lib/apt/lists/*

COPY video_detect/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY ./video_utils ./video_utils
COPY ./video_detect .
COPY ./models ../models

CMD ["python", "-u", "video_detect.py"]
