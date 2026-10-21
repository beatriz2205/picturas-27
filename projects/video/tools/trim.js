// Recorte de um intervalo temporal (spec 002; REQ-VID-TRIM-003 a 005, TRIM-008, COM-010).
// params: {startS, endS, height}; endS null → fim do vídeo; tempos arredondados ao fotograma.
const { VideoError } = require("../errors");

// Lido na chamada: limits.js requer config/video.js, que requer este módulo ao montar VIDEO_TOOLS
const allowedHeights = (...args) => require("../limits").allowedHeights(...args);

const MIN_LENGTH_S = 1;
// Folga para erros de vírgula flutuante nas comparações depois do arredondamento
const EPS = 1e-6;

// research T1: round(t × fps) / fps, com 6 casas para o hash de dedup ser estável (T4)
function toFrame(t, fps) {
  return Math.round(Math.round(t * fps) / fps * 1e6) / 1e6;
}

const isTime = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0;

function validate(params = {}, video, profile) {
  const duration = video.duration_s;
  const fps = video.fps || 30;
  const fields = {};

  const rawStart = params.startS === undefined ? 0 : params.startS;
  const rawEnd = params.endS === undefined || params.endS === null ? duration : params.endS;
  if (!isTime(rawStart)) fields.startS = "Indique um tempo válido";
  if (!isTime(rawEnd)) fields.endS = "Indique um tempo válido";

  let startS = isTime(rawStart) ? toFrame(rawStart, fps) : null;
  let endS = isTime(rawEnd) ? toFrame(rawEnd, fps) : null;

  // A duração do contentor nem sempre é múltipla do fotograma: o fim pedido dentro da duração não
  // pode passar dela por causa do arredondamento
  if (endS !== null && rawEnd <= duration + EPS && endS > duration) endS = Math.floor(duration * fps) / fps;

  if (startS !== null && endS !== null) {
    if (startS >= endS - EPS) fields.startS = "O início tem de ser anterior ao fim";
    else if (rawEnd > duration + EPS) fields.endS = "O fim excede a duração do vídeo";
    else if (endS - startS < MIN_LENGTH_S - EPS) fields.endS = "O excerto tem de ter pelo menos 1 s";
  }

  // REQ-VID-COM-010: por omissão a resolução original (lado menor)
  const heights = allowedHeights(video, profile);
  const height = params.height === undefined || params.height === null ? Math.min(video.width, video.height) : params.height;
  if (!heights.includes(height)) fields.height = "Resolução não permitida";

  if (Object.keys(fields).length) throw new VideoError("INVALID_PARAMS", 400, "Parâmetros inválidos.", { fields });
  return { params: { startS, endS, height } };
}

module.exports = { queue: "video_trim_queue", validate, toFrame, outputs: ["video"], dedup: true };
