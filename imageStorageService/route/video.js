const express = require("express");
const fs = require("fs");
const os = require("os");
const multer = require("multer");
const uploadVideo = require("../services/uploadVideo");
const allowedStages = require("../utils/stages");

const router = express.Router();
const upload = multer({ dest: process.env.VIDEO_TMP_DIR || os.tmpdir() });

const videoStages = ["video_src", "video_out", "video_tmp", "video_thumb"];
const extByMime = { "video/mp4": "mp4", "video/webm": "webm", "application/json": "json", "image/jpeg": "jpg" };
// Thumbnails só em video_thumb e só JPEG (specs/000-video-common/research.md, D16)
const isAllowedType = (stage, mime) => (stage === "video_thumb") === (mime === "image/jpeg");

router.post("/:userId/:projectId/:stage", upload.single("file"), async (req, res) => {
  const { userId, projectId, stage } = req.params;
  const tmpPath = req.file && req.file.path;

  try {
    if (!allowedStages.includes(stage) || !videoStages.includes(stage)) {
      return res.status(400).json({ error: "O estágio deve ser video_src, video_out, video_tmp ou video_thumb." });
    }
    if (!req.file) return res.status(400).json({ error: "Nenhum ficheiro recebido." });

    const ext = extByMime[req.file.mimetype];
    if (!ext || !isAllowedType(stage, req.file.mimetype)) {
      return res.status(400).json({ error: "Tipo de ficheiro não suportado." });
    }

    const result = await uploadVideo(userId, projectId, stage, tmpPath, req.file.mimetype, ext);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    if (tmpPath) fs.promises.unlink(tmpPath).catch(() => {});
  }
});

module.exports = router;
