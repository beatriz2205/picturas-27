// Leitura dos metadados de um vídeo pelo conteúdo do ficheiro (REQ-VID-COM-003), com ffprobe.
// Decisão D6 (specs/000-video-common/research.md).
const { execFile } = require("child_process");

function run(args, timeoutMs) {
  return new Promise((resolve, reject) => {
    execFile("ffprobe", args, { timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        err.stderr = stderr;
        return reject(err);
      }
      resolve({ stdout, stderr });
    });
  });
}

function parseRate(rate) {
  if (!rate || rate === "0/0") return null;
  const [n, d] = rate.split("/").map(Number);
  if (!d) return n || null;
  return Math.round((n / d) * 1000) / 1000;
}

// Devolve null se o ficheiro não puder ser lido como multimédia.
async function probe(filePath) {
  let out;
  try {
    out = (await run(["-v", "error", "-print_format", "json", "-show_format", "-show_streams", filePath], 10e3)).stdout;
  } catch (_) {
    return null;
  }

  let data;
  try {
    data = JSON.parse(out);
  } catch (_) {
    return null;
  }

  const streams = data.streams || [];
  const format = data.format || {};
  const videos = streams.filter((s) => s.codec_type === "video" && !(s.disposition && s.disposition.attached_pic));
  const audios = streams.filter((s) => s.codec_type === "audio");
  const v = videos[0] || {};

  const duration = Number(format.duration) || Number(v.duration) || null;

  return {
    formatNames: String(format.format_name || "").split(","),
    majorBrand: format.tags && format.tags.major_brand ? String(format.tags.major_brand).trim() : null,
    videoStreams: videos.length,
    audioStreams: audios.length,
    videoCodec: v.codec_name || null,
    audioCodec: audios[0] ? audios[0].codec_name : null,
    width: Number(v.width) || null,
    height: Number(v.height) || null,
    fps: parseRate(v.avg_frame_rate) || parseRate(v.r_frame_rate),
    durationS: duration ? Math.round(duration * 1000) / 1000 : null,
    sizeBytes: Number(format.size) || null,
  };
}

// Lê todos os pacotes da faixa de vídeo sem descodificar: deteta ficheiros truncados ou corrompidos
// (qualquer erro reportado pelo ffprobe com -v error invalida o ficheiro).
async function checkIntegrity(filePath) {
  try {
    const { stdout, stderr } = await run(
      ["-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries", "stream=nb_read_packets", "-of", "csv=p=0", filePath],
      60e3
    );
    return Number(String(stdout).trim()) > 0 && String(stderr).trim() === "";
  } catch (_) {
    return false;
  }
}

module.exports = { probe, checkIntegrity };
