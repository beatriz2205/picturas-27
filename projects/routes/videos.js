// Rotas de vídeo do serviço de projetos.
// Contratos: specs/000-video-common/contracts/public-api.md e specs/001-video-submit/contracts/submit-api.md
const express = require("express");
const fs = require("fs");
const mongoose = require("mongoose");
const axios = require("axios");

const Project = require("../controllers/project");
const VideoAsset = require("../models/videoAsset");
const { checkSharePermission, requireEditPermission } = require("../middleware/shareAuth");
const { getCallerId } = require("../utils/caller");
const { httpsAgent } = require("../utils/httpsAgent");
const { MULTIPART_OVERHEAD_BYTES, URL_EXPIRES_S } = require("../config/video");
const { VideoError, toResponse } = require("../video/errors");
const { limitsFor, validateInput, validateProfile, sizeError } = require("../video/limits");
const { probe, checkIntegrity } = require("../video/probe");
const { receiveUpload, uniqueName } = require("../video/upload");
const storage = require("../video/storage");

const router = express.Router();

const USERS_MS = process.env.USERS_URL || "https://users:10001/";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------- auxiliares

// Perfil atual de quem faz o pedido (REQ-VID-COM-001, COM-008, COM-025).
async function callerProfile(req) {
  const callerId = getCallerId(req);
  if (!callerId) throw new VideoError("AUTH_REQUIRED", 401, "Inicie sessão com uma conta registada para usar vídeos.");
  let type;
  try {
    const resp = await axios.get(`${USERS_MS}${callerId}/type/`, { httpsAgent, timeout: 3000 });
    type = resp.data && resp.data.type;
  } catch (_) {
    throw new VideoError("SERVICE_UNAVAILABLE", 503, "Não foi possível validar o seu perfil. Tente novamente dentro de momentos.");
  }
  if (type !== "free" && type !== "premium") {
    throw new VideoError("AUTH_REQUIRED", 401, "Os vídeos só estão disponíveis para utilizadores registados. Crie uma conta ou inicie sessão.");
  }
  return { callerId, profile: type };
}

function toVideoDTO(v) {
  return {
    id: String(v._id),
    kind: v.kind,
    origin: v.origin,
    name: v.name,
    sizeBytes: v.size_bytes,
    durationS: v.duration_s,
    width: v.width,
    height: v.height,
    fps: v.fps,
    container: v.container,
    videoCodec: v.video_codec,
    audioCodec: v.audio_codec,
    acceptedAsInput:
      v.kind === "video" && v.container === "mp4" && v.video_codec === "h264" && (v.audio_codec === "aac" || v.audio_codec === null),
    sourceVideoId: v.source_video_id ? String(v.source_video_id) : null,
    sourceTaskId: v.source_task_id ? String(v.source_task_id) : null,
    createdAt: v.createdAt,
  };
}

// Recusa antes de ler o corpo quando o tamanho declarado excede o limite (REQ-VID-SUBMIT-003).
function checkDeclaredSize(req, profile) {
  const { maxBytes } = limitsFor(profile);
  const declared = Number(req.headers["x-video-size"]);
  const contentLength = Number(req.headers["content-length"]);
  if (Number.isFinite(declared) && declared > maxBytes) throw sizeError(declared, profile);
  if (Number.isFinite(contentLength) && contentLength > maxBytes + MULTIPART_OVERHEAD_BYTES) {
    throw sizeError(null, profile);
  }
}

// Valida o ficheiro recebido pelo conteúdo e contra o perfil atual (REQ-VID-COM-003 a 006).
async function validateReceived(file, profile) {
  const meta = await probe(file.path);
  validateInput(meta);
  validateProfile({ ...meta, sizeBytes: file.size }, profile);
  if (!(await checkIntegrity(file.path))) {
    throw new VideoError("CORRUPTED_FILE", 422, "O vídeo está corrompido ou incompleto e não pode ser usado.");
  }
  return meta;
}

function assetFields(meta, file) {
  return {
    kind: "video",
    origin: "upload",
    size_bytes: file.size,
    sha256: file.sha256,
    container: "mp4",
    video_codec: meta.videoCodec,
    audio_codec: meta.audioStreams ? meta.audioCodec : null,
    duration_s: meta.durationS,
    width: meta.width,
    height: meta.height,
    fps: meta.fps,
  };
}

async function storeOriginal(ownerId, projectId, filePath) {
  try {
    return await storage.uploadFile(ownerId, projectId, "video_src", filePath, "video/mp4");
  } catch (_) {
    throw new VideoError("SERVICE_UNAVAILABLE", 503, "O armazenamento está temporariamente indisponível. O vídeo não foi guardado; tente novamente.");
  }
}

// Rejeição antes de ler o ficheiro: responde de imediato e o Node descarta o resto do corpo sem o
// guardar. Não se fecha a ligação, para o gateway não perder a resposta a meio do envio.
// O gateway faz a mesma verificação antes de reencaminhar (apiGateway/routes/videos.js).
function rejectEarly(res, err) {
  return toResponse(res, err);
}

function unlinkQuietly(p) {
  if (p) fs.promises.unlink(p).catch(() => {});
}

async function loadProjectOr404(ownerId, projectId) {
  if (!mongoose.isValidObjectId(projectId)) throw new VideoError("NOT_FOUND", 404, "Projeto não encontrado.");
  const project = await Project.getOne(ownerId, projectId);
  if (!project) throw new VideoError("NOT_FOUND", 404, "Projeto não encontrado.");
  return project;
}

async function loadVideoOr404(projectId, videoId) {
  if (!mongoose.isValidObjectId(videoId)) throw new VideoError("NOT_FOUND", 404, "Vídeo não encontrado.");
  const video = await VideoAsset.findOne({ _id: videoId, project_id: projectId });
  if (!video) throw new VideoError("NOT_FOUND", 404, "Vídeo não encontrado.");
  return video;
}

// ---------------------------------------------------------------- rotas ao nível do utilizador
// Declaradas antes de "/:user/:project" (contracts/public-api.md).

// Limites do perfil de quem faz o pedido (REQ-VID-COM-023; usado pelo frontend para SUBMIT-003)
router.get("/:user/video-limits", async (req, res) => {
  try {
    const { profile } = await callerProfile(req);
    const l = limitsFor(profile);
    res.status(200).json({
      profile,
      limits: { maxBytes: l.maxBytes, maxDurationS: l.maxDurationS, maxWidth: l.maxWidth, maxHeight: l.maxHeight, maxActiveTasks: l.maxActiveTasks },
      dailyOperations: l.dailyOps,
    });
  } catch (err) {
    toResponse(res, err);
  }
});

// Criar um projeto a partir de um vídeo; se o vídeo for recusado, o projeto não é criado (REQ-VID-SUBMIT-002)
router.post("/:user/video-project", async (req, res) => {
  let file;
  let storedKey = null;
  let projectId = null;
  try {
    const { callerId, profile } = await callerProfile(req);
    if (String(callerId) !== String(req.params.user)) {
      throw new VideoError("EDIT_PERMISSION_REQUIRED", 403, "Só pode criar projetos na sua conta.");
    }
    try {
      checkDeclaredSize(req, profile);
    } catch (err) {
      return rejectEarly(res, err);
    }

    file = await receiveUpload(req, res, { maxBytes: limitsFor(profile).maxBytes, sizeError: () => sizeError(null, profile) });
    const name = String(file.fields.name || "").trim();
    if (!name) throw new VideoError("INVALID_PARAMS", 400, "Indique o nome do projeto.", { fields: { name: "Obrigatório" } });

    const meta = await validateReceived(file, profile);

    projectId = new mongoose.Types.ObjectId();
    storedKey = await storeOriginal(req.params.user, String(projectId), file.path);

    // Mesmos valores por omissão de POST /:user (routes/projects.js)
    const project = await Project.create({
      _id: projectId,
      name,
      user_id: req.params.user,
      mediaType: "videos",
      imgs: [],
      tools: [],
    });

    const asset = await VideoAsset.create({
      ...assetFields(meta, file),
      project_id: projectId,
      owner_id: req.params.user,
      created_by: callerId,
      name: await uniqueName(VideoAsset, projectId, file.originalName),
      storage_key: storedKey,
      upload_id: UUID_RE.test(req.headers["x-upload-id"] || "") ? req.headers["x-upload-id"] : undefined,
    });

    console.log(JSON.stringify({ event: "video-submitted", projectId: String(projectId), sizeBytes: file.size, durationS: meta.durationS, newProject: true }));
    res.status(201).json({ project, video: toVideoDTO(asset) });
  } catch (err) {
    // Desfazer: nenhum projeto nem objeto fica para trás se o vídeo for recusado
    if (projectId) await Project.delete(req.params.user, projectId).catch(() => {});
    if (storedKey) await storage.remove(req.params.user, storedKey).catch(() => {});
    toResponse(res, err);
  } finally {
    unlinkQuietly(file && file.path);
  }
});

// ---------------------------------------------------------------- rotas ao nível do projeto

// Vídeos do projeto (originais e resultados), mais recentes primeiro (REQ-VID-COM-002, COM-031)
router.get("/:user/:project/videos", checkSharePermission, async (req, res) => {
  try {
    await loadProjectOr404(req.params.user, req.params.project);
    const filter = { project_id: req.params.project };
    if (req.query.sourceTaskId && mongoose.isValidObjectId(req.query.sourceTaskId)) filter.source_task_id = req.query.sourceTaskId;
    if (req.query.sourceVideoId && mongoose.isValidObjectId(req.query.sourceVideoId)) filter.source_video_id = req.query.sourceVideoId;
    const videos = await VideoAsset.find(filter).sort({ createdAt: -1 });
    res.status(200).json(videos.map(toVideoDTO));
  } catch (err) {
    toResponse(res, err);
  }
});

// Submeter vídeo a um projeto (UC-VID-001; REQ-VID-SUBMIT-001, 003 a 010)
router.post("/:user/:project/videos", checkSharePermission, requireEditPermission, async (req, res) => {
  const ownerId = req.params.user;
  const projectId = req.params.project;
  let file;
  let storedKey = null;

  try {
    const { callerId, profile } = await callerProfile(req);
    const project = await loadProjectOr404(ownerId, projectId);
    if (project.mediaType === "images" || project.imgs.length > 0) {
      throw new VideoError("PROJECT_MEDIA_TYPE_MISMATCH", 409, "Não é possível adicionar vídeos a um projeto de imagens.");
    }

    const uploadId = req.headers["x-upload-id"];
    if (!UUID_RE.test(uploadId || "")) {
      return rejectEarly(res, new VideoError("INVALID_PARAMS", 400, "Identificador de envio (X-Upload-Id) em falta ou inválido."));
    }

    // Repetição de um envio já confirmado: devolve o vídeo existente sem receber o ficheiro (REQ-VID-SUBMIT-009)
    const existing = await VideoAsset.findOne({ project_id: projectId, upload_id: uploadId });
    if (existing) {
      return res.status(200).json(toVideoDTO(existing));
    }

    try {
      checkDeclaredSize(req, profile);
    } catch (err) {
      return rejectEarly(res, err);
    }

    const { maxBytes } = limitsFor(profile);
    file = await receiveUpload(req, res, { maxBytes, sizeError: () => sizeError(null, profile) });
    const meta = await validateReceived(file, profile);

    const videoProject = await Project.claimMediaType(ownerId, projectId, "videos");
    if (!videoProject) {
      throw new VideoError("PROJECT_MEDIA_TYPE_MISMATCH", 409, "Não é possível adicionar vídeos a um projeto de imagens.");
    }

    storedKey = await storeOriginal(ownerId, projectId, file.path);

    // O projeto pode ter sido removido durante o envio (UC-VID-001/E5)
    if (!(await Project.getOne(ownerId, projectId))) {
      throw new VideoError("PROJECT_REMOVED", 410, "O projeto foi removido durante o envio. O vídeo não foi guardado.");
    }

    let asset;
    try {
      asset = await VideoAsset.create({
        ...assetFields(meta, file),
        project_id: projectId,
        owner_id: ownerId,
        created_by: callerId,
        name: await uniqueName(VideoAsset, projectId, file.originalName),
        storage_key: storedKey,
        upload_id: uploadId,
      });
    } catch (err) {
      // Duas repetições simultâneas do mesmo envio: fica só uma entrada
      if (err && err.code === 11000) {
        await storage.remove(ownerId, storedKey).catch(() => {});
        storedKey = null;
        const winner = await VideoAsset.findOne({ project_id: projectId, upload_id: uploadId });
        return res.status(200).json(toVideoDTO(winner));
      }
      throw err;
    }
    storedKey = null; // a partir daqui o objeto pertence ao vídeo criado

    console.log(JSON.stringify({ event: "video-submitted", projectId, videoId: String(asset._id), sizeBytes: file.size, durationS: meta.durationS }));
    res.status(201).json(toVideoDTO(asset));
  } catch (err) {
    if (storedKey) await storage.remove(ownerId, storedKey).catch(() => {});
    toResponse(res, err);
  } finally {
    unlinkQuietly(file && file.path);
  }
});

router.get("/:user/:project/videos/:video", checkSharePermission, async (req, res) => {
  try {
    await loadProjectOr404(req.params.user, req.params.project);
    const video = await loadVideoOr404(req.params.project, req.params.video);
    res.status(200).json(toVideoDTO(video));
  } catch (err) {
    toResponse(res, err);
  }
});

// URL temporário para reproduzir ou descarregar (REQ-VID-COM-030, COM-050: 15 min)
router.get("/:user/:project/videos/:video/url", checkSharePermission, async (req, res) => {
  try {
    await loadProjectOr404(req.params.user, req.params.project);
    const video = await loadVideoOr404(req.params.project, req.params.video);
    const download = req.query.download === "1" || req.query.download === "true";
    const url = await storage.publicUrl(req.params.user, video.storage_key, {
      expiresS: URL_EXPIRES_S,
      downloadName: download ? video.name : undefined,
    });
    res.status(200).json({ url, expiresAt: new Date(Date.now() + URL_EXPIRES_S * 1000).toISOString() });
  } catch (err) {
    toResponse(res, err);
  }
});

// Remover um vídeo apaga também o objeto no armazenamento (REQ-VID-COM-034; UC-VID-001/Q5)
router.delete("/:user/:project/videos/:video", checkSharePermission, requireEditPermission, async (req, res) => {
  try {
    await callerProfile(req);
    await loadProjectOr404(req.params.user, req.params.project);
    const video = await loadVideoOr404(req.params.project, req.params.video);
    // TODO(spec 000, T046): cancelar as tarefas ativas com origem neste vídeo (REQ-VID-COM-017)
    await storage.remove(req.params.user, video.storage_key);
    await VideoAsset.deleteOne({ _id: video._id });
    res.sendStatus(204);
  } catch (err) {
    toResponse(res, err);
  }
});

// Usado por routes/projects.js na remoção de projetos e de contas (REQ-VID-COM-034, COM-035)
async function deleteProjectVideos(ownerId, projectId) {
  const videos = await VideoAsset.find({ project_id: projectId });
  for (const v of videos) {
    await storage.remove(ownerId, v.storage_key).catch((e) => console.error("[video] falha ao apagar objeto", v.storage_key, e.message));
  }
  await VideoAsset.deleteMany({ project_id: projectId });
}

module.exports = { router, deleteProjectVideos, toVideoDTO };
