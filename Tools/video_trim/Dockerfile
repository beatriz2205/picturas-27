FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY ./video_utils ./video_utils
RUN pip install --no-cache-dir -r ./video_utils/requirements.txt

COPY ./video_trim/requirements.txt ./video_trim/requirements.txt
RUN pip install --no-cache-dir -r ./video_trim/requirements.txt

COPY ./video_trim .

CMD [ "python", "-u", "video_trim.py" ]
