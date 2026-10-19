// Receção de um vídeo para disco, com cálculo do sha256 durante a escrita
// (specs/001-video-submit/research.md, S3; spec 000, D5).
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const { UPLOAD_TMP_DIR } = require("../config/video");
const { VideoError } = require("./errors");

// Motor de armazenamento do multer: escreve em disco e calcula o hash sem guardar o ficheiro em memória.
function hashingDiskStorage(dir) {
  return {
    _handleFile(req, file, cb) {
      fs.mkdir(dir, { recursive: true }, (mkErr) => {
        if (mkErr) return cb(mkErr);
        const filePath = path.join(dir, `${uuidv4()}.part`);
        const out = fs.createWriteStream(filePath);
        const hash = crypto.createHash("sha256");
        let size = 0;
        let done = false;

        const fail = (err) => {
          if (done) return;
          done = true;
          file.stream.unpipe(out);
          file.stream.resume();
          out.destroy();
          fs.unlink(filePath, () => cb(err));
        };

        file.stream.on("data", (chunk) => {
          size += chunk.length;
          hash.update(chunk);
        });
        file.stream.on("error", fail);
        out.on("error", fail);
        out.on("finish", () => {
          if (done) return;
          done = true;
          cb(null, { path: filePath, size, sha256: hash.digest("hex") });
        });
        // O multer não deteta o cancelamento do envio pelo cliente: apagar o ficheiro parcial (REQ-VID-SUBMIT-005)
        req.once("close", () => {
          if (!req.complete) fail(Object.assign(new Error("Upload aborted"), { code: "UPLOAD_ABORTED" }));
        });
        file.stream.pipe(out);
      });
    },
    _removeFile(req, file, cb) {
      if (!file.path) return cb(null);
      fs.unlink(file.path, () => cb(null));
    },
  };
}

// Recebe o campo "video" (um só ficheiro). Rejeita com VIDEO_TOO_LARGE se ultrapassar maxBytes
// e apaga o ficheiro parcial se o cliente cancelar o envio (REQ-VID-SUBMIT-005).
function receiveUpload(req, res, { maxBytes, dir = UPLOAD_TMP_DIR, sizeError }) {
  const upload = multer({
    storage: hashingDiskStorage(dir),
    limits: { fileSize: maxBytes, files: 1, fields: 5 },
  }).single("video");

  return new Promise((resolve, reject) => {
    upload(req, res, (err) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") return reject(sizeError ? sizeError() : err);
        if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE") {
          return reject(new VideoError("INVALID_PARAMS", 400, "Envie um único ficheiro de vídeo no campo 'video'."));
        }
        return reject(new VideoError("UPLOAD_ABORTED", 400, "O envio foi interrompido antes de terminar."));
      }
      if (!req.file) return reject(new VideoError("INVALID_PARAMS", 400, "Nenhum ficheiro de vídeo recebido."));
      resolve({
        path: req.file.path,
        size: req.file.size,
        sha256: req.file.sha256,
        originalName: req.file.originalname,
        fields: req.body || {},
      });
    });
  });
}

// Nome único entre os vídeos do projeto: "clip.mp4" → "clip (1).mp4" (REQ-VID-SUBMIT-007, REQ-VID-TRIM-007).
async function uniqueName(VideoAsset, projectId, name) {
  const clean = path.basename(String(name || "video.mp4")).replace(/[\u0000-\u001f]/g, "").slice(0, 200) || "video.mp4";
  const ext = path.extname(clean);
  const base = clean.slice(0, clean.length - ext.length);
  const taken = new Set(
    (await VideoAsset.find({ project_id: projectId }, { name: 1 }).lean()).map((v) => v.name)
  );
  if (!taken.has(clean)) return clean;
  for (let n = 1; ; n++) {
    const candidate = `${base} (${n})${ext}`;
    if (!taken.has(candidate)) return candidate;
  }
}

module.exports = { receiveUpload, uniqueName, hashingDiskStorage };
