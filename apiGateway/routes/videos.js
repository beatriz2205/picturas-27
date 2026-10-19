// Proxy das rotas de vídeo para o serviço de projetos.
// Os vídeos são reencaminhados em stream, sem multer: o gateway não guarda o ficheiro em memória
// (specs/000-video-common/research.md, D5; specs/001-video-submit/contracts/submit-api.md).
const express = require("express");
const axios = require("axios");
const https = require("https");
const fs = require("fs");
const auth = require("../auth/auth");

const router = express.Router();

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  cert: fs.readFileSync(__dirname + "/../certs/selfsigned.crt"),
  key: fs.readFileSync(__dirname + "/../certs/selfsigned.key"),
});

const projectsURL = process.env.PROJECTS_URL || "https://projects:9001/";
const MULTIPART_OVERHEAD_BYTES = 1024 * 1024;

function ids(req) {
  return {
    ownerId: req.query.owner || req.params.user,
    callerId: req.authUserId || req.params.user,
  };
}

function headersFor(req, callerId, extra = {}) {
  return { Authorization: req.headers["authorization"], "X-Caller-Id": callerId, ...extra };
}

function forward(res, promise) {
  return promise
    .then((resp) => {
      if (resp.status === 204) return res.sendStatus(204);
      return res.status(resp.status).json(resp.data);
    })
    .catch((err) => {
      if (err.response) return res.status(err.response.status).json(err.response.data);
      console.error("[API-GW] vídeo:", err.message);
      return res.status(503).json({ code: "SERVICE_UNAVAILABLE", message: "O serviço de projetos está temporariamente indisponível." });
    });
}

function shareParams(req) {
  return req.query.share ? { share: req.query.share } : undefined;
}

// Recusa antes de reencaminhar o ficheiro quando o tamanho declarado excede o limite do perfil
// de quem envia (REQ-VID-SUBMIT-003). Devolve true se já respondeu.
async function rejectIfTooLarge(req, res, callerId) {
  let limits;
  try {
    const resp = await axios.get(projectsURL + `${callerId}/video-limits`, { httpsAgent, headers: headersFor(req, callerId) });
    limits = resp.data;
  } catch (err) {
    if (err.response) {
      res.status(err.response.status).json(err.response.data);
      return true;
    }
    res.status(503).json({ code: "SERVICE_UNAVAILABLE", message: "O serviço de projetos está temporariamente indisponível." });
    return true;
  }
  const max = limits.limits.maxBytes;
  const declared = Number(req.headers["x-video-size"]);
  const length = Number(req.headers["content-length"]);
  if ((Number.isFinite(declared) && declared > max) || (Number.isFinite(length) && length > max + MULTIPART_OVERHEAD_BYTES)) {
    const plan = limits.profile === "premium" ? "Premium" : "Free";
    res.status(413).json({
      code: "VIDEO_TOO_LARGE",
      message: `O vídeo é demasiado grande; o limite do plano ${plan} é ${max / (1024 * 1024)} MB.`,
      limit: { name: "size", value: max / (1024 * 1024), unit: "MB", profile: limits.profile },
      upgrade: limits.profile === "free",
    });
    return true;
  }
  return false;
}

// Reencaminha o corpo multipart em stream
function streamTo(req, url, callerId) {
  return axios.post(url, req, {
    httpsAgent,
    params: shareParams(req),
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    headers: headersFor(req, callerId, {
      "Content-Type": req.headers["content-type"],
      ...(req.headers["content-length"] ? { "Content-Length": req.headers["content-length"] } : {}),
      ...(req.headers["x-upload-id"] ? { "X-Upload-Id": req.headers["x-upload-id"] } : {}),
      ...(req.headers["x-video-size"] ? { "X-Video-Size": req.headers["x-video-size"] } : {}),
    }),
  });
}

// ---- rotas ao nível do utilizador (antes de "/:user/:project" do router de projetos)

router.get("/:user/video-limits", auth.checkToken, (req, res) => {
  const { callerId } = ids(req);
  forward(res, axios.get(projectsURL + `${callerId}/video-limits`, { httpsAgent, headers: headersFor(req, callerId) }));
});

router.post("/:user/video-project", auth.checkToken, async (req, res) => {
  const { callerId } = ids(req);
  if (await rejectIfTooLarge(req, res, callerId)) return;
  forward(res, streamTo(req, projectsURL + `${req.params.user}/video-project`, callerId));
});

// ---- rotas ao nível do projeto

router.get("/:user/:project/videos", auth.checkToken, (req, res) => {
  const { ownerId, callerId } = ids(req);
  forward(
    res,
    axios.get(projectsURL + `${ownerId}/${req.params.project}/videos`, {
      httpsAgent,
      params: { ...shareParams(req), sourceTaskId: req.query.sourceTaskId, sourceVideoId: req.query.sourceVideoId },
      headers: headersFor(req, callerId),
    })
  );
});

router.post("/:user/:project/videos", auth.checkToken, async (req, res) => {
  const { ownerId, callerId } = ids(req);
  if (await rejectIfTooLarge(req, res, callerId)) return;
  forward(res, streamTo(req, projectsURL + `${ownerId}/${req.params.project}/videos`, callerId));
});

router.get("/:user/:project/videos/:video", auth.checkToken, (req, res) => {
  const { ownerId, callerId } = ids(req);
  forward(
    res,
    axios.get(projectsURL + `${ownerId}/${req.params.project}/videos/${req.params.video}`, {
      httpsAgent,
      params: shareParams(req),
      headers: headersFor(req, callerId),
    })
  );
});

router.get("/:user/:project/videos/:video/url", auth.checkToken, (req, res) => {
  const { ownerId, callerId } = ids(req);
  forward(
    res,
    axios.get(projectsURL + `${ownerId}/${req.params.project}/videos/${req.params.video}/url`, {
      httpsAgent,
      params: { ...shareParams(req), download: req.query.download },
      headers: headersFor(req, callerId),
    })
  );
});

router.delete("/:user/:project/videos/:video", auth.checkToken, (req, res) => {
  const { ownerId, callerId } = ids(req);
  forward(
    res,
    axios.delete(projectsURL + `${ownerId}/${req.params.project}/videos/${req.params.video}`, {
      httpsAgent,
      params: shareParams(req),
      headers: headersFor(req, callerId),
    })
  );
});

module.exports = router;
