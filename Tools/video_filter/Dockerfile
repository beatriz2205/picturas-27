FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY ./video_utils ./video_utils
RUN pip install --no-cache-dir -r ./video_utils/requirements.txt

# Pillow na mesma versão de Tools/brightness, Tools/contrast e Tools/saturation (FLT-007)
COPY ./video_filter/requirements.txt ./video_filter/requirements.txt
RUN pip install --no-cache-dir -r ./video_filter/requirements.txt

COPY ./video_filter .

CMD [ "python", "-u", "video_filter.py" ]
