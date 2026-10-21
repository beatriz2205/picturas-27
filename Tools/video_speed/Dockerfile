FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY ./video_utils ./video_utils
RUN pip install --no-cache-dir -r ./video_utils/requirements.txt

COPY ./video_speed/requirements.txt ./video_speed/requirements.txt
RUN pip install --no-cache-dir -r ./video_speed/requirements.txt

COPY ./video_speed .

CMD [ "python", "-u", "video_speed.py" ]
