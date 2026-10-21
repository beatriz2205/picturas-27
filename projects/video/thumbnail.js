// Thumbnail de um vídeo: JPEG com 320 px de largura, do fotograma a 10% da duração (no máximo a 1 s).
// UC-VID-001/RN8, E6; REQ-VID-SUBMIT-012, SUBMIT-013, COM-057. Decisão D16 (specs/000-video-common/research.md).
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { v4: uuidv4 } = require("uuid");
const { UPLOAD_TMP_DIR } = require("../config/video");
const storage = require("./storage");

const WIDTH = 320;
const TIMEOUT_MS = 5e3;

function frameTime(durationS) {
  const d = Number(durationS) || 0;
  return Math.min(1, d * 0.1);
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    execFile("ffmpeg", args, { timeout: TIMEOUT_MS }, (err, _stdout, stderr) => {
      if (err) {
        err.stderr = stderr;
        return reject(err);
      }
      resolve();
    });
  });
}

// input: caminho local ou URL (o ffmpeg lê por pedidos Range só o que precisa).
// Devolve o caminho do JPEG ou null; nunca lança (a thumbnail não faz falhar a submissão, E6).
async function generateThumbnail(input, durationS, { dir = UPLOAD_TMP_DIR } = {}) {
  const out = path.join(dir, `${uuidv4()}.thumb.jpg`);
  try {
    await fs.promises.mkdir(dir, { recursive: true });
    // -ss antes de -i: procura pelo índice, sem descodificar o vídeo até ao instante pedido
    await runFfmpeg([
      "-v", "error",
      "-ss", String(frameTime(durationS)),
      "-i", input,
      "-frames:v", "1",
      "-vf", `scale=${WIDTH}:-2`,
      "-q:v", "4",
      "-y", out,
    ]);
    const { size } = await fs.promises.stat(out);
    if (!size) throw new Error("ffmpeg não produziu nenhum fotograma");
    return out;
  } catch (err) {
    console.error(JSON.stringify({ event: "thumbnail-failed", reason: String((err && (err.stderr || err.message)) || err).slice(0, 300) }));
    fs.promises.unlink(out).catch(() => {});
    return null;
  }
}

// Gera e carrega em video_thumb. Devolve a chave ou null.
async function storeThumbnail(ownerId, projectId, input, durationS, deps = { storage }) {
  const jpg = await generateThumbnail(input, durationS);
  if (!jpg) return null;
  try {
    return await deps.storage.uploadFile(String(ownerId), String(projectId), "video_thumb", jpg, "image/jpeg");
  } catch (err) {
    console.error(JSON.stringify({ event: "thumbnail-upload-failed", projectId: String(projectId), reason: err.message }));
    return null;
  } finally {
    await fs.promises.unlink(jpg).catch(() => {});
  }
}

module.exports = { generateThumbnail, storeThumbnail, frameTime };
