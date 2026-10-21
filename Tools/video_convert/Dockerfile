FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

RUN set -eu; \
    encoders="$(ffmpeg -hide_banner -encoders 2>&1)"; \
    printf '%s\n' "$encoders" | grep -q 'libvpx-vp9'; \
    printf '%s\n' "$encoders" | grep -q 'libopus'

WORKDIR /app

COPY ./video_utils ./video_utils
RUN pip install --no-cache-dir -r ./video_utils/requirements.txt

COPY ./video_convert/requirements.txt ./video_convert/requirements.txt
RUN pip install --no-cache-dir -r ./video_convert/requirements.txt

COPY ./video_convert .

CMD ["python", "-u", "video_convert.py"]
