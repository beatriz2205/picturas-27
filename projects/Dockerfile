from node
workdir /app

# ffprobe valida os vídeos submetidos pelo conteúdo (REQ-VID-COM-003); ffmpeg gera as thumbnails (D16)
run apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*

copy . .
run npm install

expose 9001
cmd ["npm", "start"]
