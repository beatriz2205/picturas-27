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
const { MULTIPART_OVERHEAD_BYTES, URL_EXPIRES_S, VIDEO_TOOLS } = require("../config/video");
const { VideoError, toResponse } = require("../video/errors");
const { limitsFor, validateInput, validateProfile, sizeError } = require("../video/limits");
const { probe, checkIntegrity } = require("../video/probe");
const { receiveUpload, uniqueName } = require("../video/upload");
const storage = require("../video/storage");
const { storeThumbnail } = require("../video/thumbnail");
const VideoTask = require("../models/videoTask");
const tasks = require("../video/taskService");
const { toVideoDTO, toTaskDTO } = require("../video/messages");

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

function removeQuietly(ownerId, key) {
  if (!key) return Promise.resolve();
  return storage.remove(String(ownerId), key).catch((e) => console.error("[video] falha ao apagar objeto", key, e.message));
}

// Original e thumbnail em paralelo: o tempo da thumbnail não se soma ao do carregamento (S6, SUBMIT-011).
// A thumbnail nunca faz falhar a submissão (SUBMIT-013); se o original falhar, a thumbnail é apagada.
async function storeOriginalAndThumbnail(ownerId, projectId, file, meta) {
  const [original, thumbnail] = await Promise.allSettled([
    storeOriginal(ownerId, projectId, file.path),
    storeThumbnail(ownerId, projectId, file.path, meta.durationS),
  ]);
  const thumbKey = thumbnail.status === "fulfilled" ? thumbnail.value : null;
  if (original.status === "rejected") {
    await removeQuietly(ownerId, thumbKey);
    throw original.reason;
  }
  return { storedKey: original.value, thumbKey };
}

// VideoDTO com o URL temporário da thumbnail (contracts/public-api.md; REQ-VID-COM-050, COM-057)
async function videoDTO(v) {
  const dto = { ...toVideoDTO(v), thumbnailUrl: null };
  if (v.thumbnail_key) {
    try {
      dto.thumbnailUrl = await storage.publicUrl(String(v.owner_id), v.thumbnail_key, { expiresS: URL_EXPIRES_S });
    } catch (e) {
      console.error("[video] falha ao gerar URL da thumbnail", v.thumbnail_key, e.message);
    }
  }
  return dto;
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

// Estado consultado pelos workers antes de começar (contracts/internal-api.md). Não passa pelo gateway.
router.get("/internal/video-tasks/:task", async (req, res) => {
  const token = process.env.VIDEO_INTERNAL_TOKEN;
  if (!token || req.headers["x-internal-token"] !== token) return res.status(401).json({ code: "AUTH_REQUIRED" });
  if (!mongoose.isValidObjectId(req.params.task)) return res.status(404).json({ code: "NOT_FOUND" });
  const task = await VideoTask.findById(req.params.task, { status: 1, deadlineAt: 1 }).lean();
  if (!task) return res.status(404).json({ code: "NOT_FOUND" });
  res.status(200).json({ status: task.status, deadlineAt: task.deadlineAt });
});

async function remainingOperations(callerId) {
  try {
    const resp = await axios.get(`${USERS_MS}${callerId}`, { httpsAgent, timeout: 3000 });
    return resp.data.remaining_operations ?? null;
  } catch (_) {
    return null;
  }
}

// Limites do perfil, operações restantes e tarefas ativas de quem faz o pedido
// (REQ-VID-COM-018, COM-023; usado pelo frontend para SUBMIT-003 e pelo menu de ferramentas)
router.get("/:user/video-limits", async (req, res) => {
  try {
    const { callerId, profile } = await callerProfile(req);
    const l = limitsFor(profile);
    const [remaining, activeTasks] = await Promise.all([
      profile === "free" ? remainingOperations(callerId) : null,
      VideoTask.countDocuments({ user_id: callerId, status: { $in: tasks.ACTIVE } }),
    ]);
    res.status(200).json({
      profile,
      limits: { maxBytes: l.maxBytes, maxDurationS: l.maxDurationS, maxWidth: l.maxWidth, maxHeight: l.maxHeight, maxActiveTasks: l.maxActiveTasks },
      remainingOperations: remaining,
      dailyOperations: l.dailyOps,
      activeTasks,
      // ferramentas aceites por este servidor (o "noop" só fora de produção)
      tools: Object.keys(VIDEO_TOOLS),
    });
  } catch (err) {
    toResponse(res, err);
  }
});

// Notificações pendentes: tarefas iniciadas pelo utilizador já terminadas e ainda não mostradas (D14, REQ-VID-COM-015)
router.get("/:user/video-notifications", async (req, res) => {
  try {
    const { callerId } = await callerProfile(req);
    const pending = await VideoTask.find({ user_id: callerId, status: { $in: tasks.FINAL }, notifiedAt: null })
      .sort({ finishedAt: -1 })
      .limit(50);
    res.status(200).json(pending.map((t) => ({ ...toTaskDTO(t), ownerId: String(t.owner_id) })));
  } catch (err) {
    toResponse(res, err);
  }
});

router.post("/:user/video-notifications/ack", async (req, res) => {
  try {
    const { callerId } = await callerProfile(req);
    const ids = Array.isArray(req.body && req.body.taskIds) ? req.body.taskIds.filter((id) => mongoose.isValidObjectId(id)) : [];
    if (ids.length) {
      await VideoTask.updateMany({ _id: { $in: ids }, user_id: callerId, notifiedAt: null }, { $set: { notifiedAt: new Date() } });
    }
    res.sendStatus(204);
  } catch (err) {
    toResponse(res, err);
  }
});

// Criar um projeto a partir de um vídeo; se o vídeo for recusado, o projeto não é criado (REQ-VID-SUBMIT-002)
router.post("/:user/video-project", async (req, res) => {
  let file;
  let storedKey = null;
  let thumbKey = null;
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
    ({ storedKey, thumbKey } = await storeOriginalAndThumbnail(req.params.user, String(projectId), file, meta));

    // Mesmos valores por omissão de POST /:user (routes/projects.js)
    const project = await Project.create({ _id: projectId, name, user_id: req.params.user, imgs: [], tools: [] });

    const asset = await VideoAsset.create({
      ...assetFields(meta, file),
      project_id: projectId,
      owner_id: req.params.user,
      created_by: callerId,
      name: await uniqueName(VideoAsset, projectId, file.originalName),
      storage_key: storedKey,
      thumbnail_key: thumbKey,
      upload_id: UUID_RE.test(req.headers["x-upload-id"] || "") ? req.headers["x-upload-id"] : undefined,
    });

    console.log(JSON.stringify({ event: "video-submitted", projectId: String(projectId), sizeBytes: file.size, durationS: meta.durationS, newProject: true }));
    res.status(201).json({ project, video: await videoDTO(asset) });
  } catch (err) {
    // Desfazer: nenhum projeto nem objeto fica para trás se o vídeo for recusado
    if (projectId) await Project.delete(req.params.user, projectId).catch(() => {});
    if (storedKey) await storage.remove(req.params.user, storedKey).catch(() => {});
    await removeQuietly(req.params.user, thumbKey);
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
    res.status(200).json(await Promise.all(videos.map(videoDTO)));
  } catch (err) {
    toResponse(res, err);
  }
});

// Submeter vídeo a um projeto (UC-VID-001; REQ-VID-SUBMIT-001, 003 a 013)
router.post("/:user/:project/videos", checkSharePermission, requireEditPermission, async (req, res) => {
  const ownerId = req.params.user;
  const projectId = req.params.project;
  let file;
  let storedKey = null;
  let thumbKey = null;

  try {
    const { callerId, profile } = await callerProfile(req);
    await loadProjectOr404(ownerId, projectId);

    const uploadId = req.headers["x-upload-id"];
    if (!UUID_RE.test(uploadId || "")) {
      return rejectEarly(res, new VideoError("INVALID_PARAMS", 400, "Identificador de envio (X-Upload-Id) em falta ou inválido."));
    }

    // Repetição de um envio já confirmado: devolve o vídeo existente sem receber o ficheiro (REQ-VID-SUBMIT-009)
    const existing = await VideoAsset.findOne({ project_id: projectId, upload_id: uploadId });
    if (existing) {
      return res.status(200).json(await videoDTO(existing));
    }

    try {
      checkDeclaredSize(req, profile);
    } catch (err) {
      return rejectEarly(res, err);
    }

    const { maxBytes } = limitsFor(profile);
    file = await receiveUpload(req, res, { maxBytes, sizeError: () => sizeError(null, profile) });
    const meta = await validateReceived(file, profile);

    ({ storedKey, thumbKey } = await storeOriginalAndThumbnail(ownerId, projectId, file, meta));

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
        thumbnail_key: thumbKey,
        upload_id: uploadId,
      });
    } catch (err) {
      // Duas repetições simultâneas do mesmo envio: fica só uma entrada
      if (err && err.code === 11000) {
        await storage.remove(ownerId, storedKey).catch(() => {});
        await removeQuietly(ownerId, thumbKey);
        storedKey = null;
        thumbKey = null;
        const winner = await VideoAsset.findOne({ project_id: projectId, upload_id: uploadId });
        return res.status(200).json(await videoDTO(winner));
      }
      throw err;
    }
    // a partir daqui os objetos pertencem ao vídeo criado
    storedKey = null;
    thumbKey = null;

    console.log(JSON.stringify({ event: "video-submitted", projectId, videoId: String(asset._id), sizeBytes: file.size, durationS: meta.durationS, thumbnail: Boolean(asset.thumbnail_key) }));
    res.status(201).json(await videoDTO(asset));
  } catch (err) {
    if (storedKey) await storage.remove(ownerId, storedKey).catch(() => {});
    await removeQuietly(ownerId, thumbKey);
    toResponse(res, err);
  } finally {
    unlinkQuietly(file && file.path);
  }
});

// Nome de resultado livre no projeto (spec 002, contracts/trim-api.md; REQ-VID-TRIM-007).
// Declarada antes de /videos/:video. A sugestão é a mesma que o uniqueName aplica na conclusão.
router.get("/:user/:project/videos/name-available", checkSharePermission, async (req, res) => {
  try {
    await loadProjectOr404(req.params.user, req.params.project);
    const name = String(req.query.name || "").trim();
    if (!name) throw new VideoError("INVALID_PARAMS", 400, "Indique o nome.", { fields: { name: "Obrigatório" } });
    const suggestion = await uniqueName(VideoAsset, req.params.project, name);
    res.status(200).json({ available: suggestion === name, suggestion });
  } catch (err) {
    toResponse(res, err);
  }
});

// Estilos e intervalo dos filtros (spec 004, contracts/filter-api.md; REQ-VID-FLT-001)
router.get("/:user/:project/videos/:video/filter-options", checkSharePermission, async (req, res) => {
  try {
    await loadProjectOr404(req.params.user, req.params.project);
    await loadVideoOr404(req.params.project, req.params.video);
    res.status(200).json(VIDEO_TOOLS.filter.options());
  } catch (err) {
    toResponse(res, err);
  }
});

// Formatos e resoluções disponíveis para conversão (spec 003, contracts/convert-api.md).
router.get("/:user/:project/videos/:video/convert-options", checkSharePermission, async (req, res) => {
  try {
    const { profile } = await callerProfile(req);
    await loadProjectOr404(req.params.user, req.params.project);
    const video = await loadVideoOr404(req.params.project, req.params.video);
    res.status(200).json(VIDEO_TOOLS.convert.options(video, profile));
  } catch (err) {
    toResponse(res, err);
  }
});

router.get("/:user/:project/videos/:video", checkSharePermission, async (req, res) => {
  try {
    await loadProjectOr404(req.params.user, req.params.project);
    const video = await loadVideoOr404(req.params.project, req.params.video);
    res.status(200).json(await videoDTO(video));
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

// Remover um vídeo apaga também o objeto e a thumbnail no armazenamento (REQ-VID-COM-034; UC-VID-001/Q5)
router.delete("/:user/:project/videos/:video", checkSharePermission, requireEditPermission, async (req, res) => {
  try {
    await callerProfile(req);
    await loadProjectOr404(req.params.user, req.params.project);
    const video = await loadVideoOr404(req.params.project, req.params.video);
    // Cancela as tarefas ativas com origem neste vídeo antes de o apagar (REQ-VID-COM-017)
    await tasks.cancelActive({ source_video_id: video._id }, "source_video_removed");
    await storage.remove(req.params.user, video.storage_key);
    await removeQuietly(req.params.user, video.thumbnail_key);
    await VideoAsset.deleteOne({ _id: video._id });
    res.sendStatus(204);
  } catch (err) {
    toResponse(res, err);
  }
});

// ---------------------------------------------------------------- tarefas

async function loadTaskOr404(projectId, taskId) {
  if (!mongoose.isValidObjectId(taskId)) throw new VideoError("NOT_FOUND", 404, "Tarefa não encontrada.");
  const task = await VideoTask.findOne({ _id: taskId, project_id: projectId });
  if (!task) throw new VideoError("NOT_FOUND", 404, "Tarefa não encontrada.");
  return task;
}

// Iniciar uma tarefa: 202 com a tarefa em fila (plan.md, "Fluxo de aceitação"; REQ-VID-COM-011, COM-036)
router.post("/:user/:project/video-tasks", checkSharePermission, requireEditPermission, async (req, res) => {
  try {
    const { callerId, profile } = await callerProfile(req);
    await loadProjectOr404(req.params.user, req.params.project);
    const body = req.body || {};
    if (body.tool === "convert") {
      body.outputName = VIDEO_TOOLS.convert.correctOutputName(body.outputName, body.params && body.params.format);
    }
    const task = await tasks.accept({
      callerId,
      profile,
      ownerId: req.params.user,
      projectId: req.params.project,
      body,
    });
    res.status(202).json(toTaskDTO(task));
  } catch (err) {
    toResponse(res, err);
  }
});

// Tarefas do projeto, mais recentes primeiro (REQ-VID-COM-031)
router.get("/:user/:project/video-tasks", checkSharePermission, async (req, res) => {
  try {
    await loadProjectOr404(req.params.user, req.params.project);
    const filter = { project_id: req.params.project };
    if (req.query.status === "active") filter.status = { $in: tasks.ACTIVE };
    else if (req.query.status === "final") filter.status = { $in: tasks.FINAL };
    const list = await VideoTask.find(filter).sort({ queuedAt: -1 }).limit(200);
    res.status(200).json(list.map(toTaskDTO));
  } catch (err) {
    toResponse(res, err);
  }
});

router.get("/:user/:project/video-tasks/:task", checkSharePermission, async (req, res) => {
  try {
    await loadProjectOr404(req.params.user, req.params.project);
    res.status(200).json(toTaskDTO(await loadTaskOr404(req.params.project, req.params.task)));
  } catch (err) {
    toResponse(res, err);
  }
});

// Cancelar: imediato para o utilizador, best effort no worker (D12; REQ-VID-COM-016)
router.post("/:user/:project/video-tasks/:task/cancel", checkSharePermission, requireEditPermission, async (req, res) => {
  try {
    await callerProfile(req);
    await loadProjectOr404(req.params.user, req.params.project);
    const task = await loadTaskOr404(req.params.project, req.params.task);
    const cancelled = await tasks.cancel(task._id, "user_cancelled");
    if (!cancelled) {
      const current = await VideoTask.findById(task._id);
      throw new VideoError("TASK_FINAL", 409, "A tarefa já terminou e não pode ser cancelada.", { task: toTaskDTO(current) });
    }
    res.status(200).json(toTaskDTO(cancelled));
  } catch (err) {
    toResponse(res, err);
  }
});

// Usado por routes/projects.js na remoção de projetos e de contas (REQ-VID-COM-017, COM-034, COM-035).
// Na eliminação da conta (deleteTasks) os registos das tarefas também são apagados.
async function deleteProjectVideos(ownerId, projectId, { deleteTasks = false } = {}) {
  await tasks.cancelActive({ project_id: projectId }, "project_removed");
  const videos = await VideoAsset.find({ project_id: projectId });
  for (const v of videos) {
    await storage.remove(ownerId, v.storage_key).catch((e) => console.error("[video] falha ao apagar objeto", v.storage_key, e.message));
    await removeQuietly(ownerId, v.thumbnail_key);
  }
  await VideoAsset.deleteMany({ project_id: projectId });
  if (deleteTasks) await VideoTask.deleteMany({ project_id: projectId });
}

// Eliminação da conta: tarefas que o utilizador iniciou em projetos de outros (REQ-VID-COM-035)
async function deleteUserVideoTasks(userId) {
  await tasks.cancelActive({ user_id: userId }, "project_removed");
  await VideoTask.deleteMany({ user_id: userId });
}

module.exports = { router, deleteProjectVideos, deleteUserVideoTasks, toVideoDTO, videoDTO };
