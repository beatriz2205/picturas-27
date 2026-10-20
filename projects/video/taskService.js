// Ciclo de vida das tarefas de vídeo (spec 000: plan.md "Fluxo de aceitação", D7, D9, D11, D12).
// Sem transações (MongoDB 4.4 standalone): cada passo é uma atualização condicional e os passos
// com efeitos externos (quota, filas, armazenamento) são compensados quando um passo seguinte falha.
const crypto = require("crypto");
const mongoose = require("mongoose");

const VideoTask = require("../models/videoTask");
const VideoAsset = require("../models/videoAsset");
const { VIDEO_TOOLS, PRIORITY } = require("../config/video");
const { VideoError } = require("./errors");
const { limitsFor, validateProfile, timeoutMs } = require("./limits");
const { reasonMessage, buildTaskMessage, toTaskDTO, wsMessage } = require("./messages");
const { uniqueName } = require("./upload");

// Substituíveis nos testes (_setDeps)
let deps = {
  broker: require("./broker"),
  quota: require("./quota"),
  storage: require("./storage"),
};

function _setDeps(overrides) {
  deps = { ...deps, ...overrides };
}

const ACTIVE = ["queued", "processing"];
const FINAL = ["completed", "failed", "cancelled"];

// ---------------------------------------------------------------- auxiliares

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((o, k) => ((o[k] = canonical(value[k])), o), {});
  }
  return value;
}

function dedupKeyFor(userId, videoId, tool, params) {
  return crypto
    .createHash("sha1")
    .update(JSON.stringify([String(userId), String(videoId), tool, canonical(params)]))
    .digest("hex");
}

function cleanOutputName(name) {
  if (name === undefined || name === null || name === "") return null;
  if (typeof name !== "string") {
    throw new VideoError("INVALID_PARAMS", 400, "Nome do resultado inválido.", { fields: { outputName: "Texto" } });
  }
  const clean = name.replace(/[\u0000-\u001f/\\]/g, "").trim().slice(0, 200);
  return clean || null;
}

// Uma linha JSON por tarefa terminada, recolhida pelo ELK (REQ-VID-COM-048)
function log(task) {
  const ms = (a, b) => (a && b ? new Date(b) - new Date(a) : null);
  console.log(
    JSON.stringify({
      event: "video-task",
      taskId: String(task._id),
      tool: task.tool,
      status: task.status,
      profile: task.profile,
      durationS: task.source_duration_s,
      queueMs: ms(task.queuedAt, task.startedAt),
      processingMs: ms(task.startedAt, task.finishedAt),
      reason: task.reason_code,
    })
  );
}

function emit(task) {
  return deps.broker.publishWs(wsMessage(task));
}

async function removeKeys(ownerId, keys) {
  const failed = [];
  for (const key of keys || []) {
    try {
      await deps.storage.remove(String(ownerId), key);
    } catch (_) {
      failed.push(key);
    }
  }
  return failed;
}

// Devolve a operação uma só vez: só quem muda quota_state de "reserved" para "refunded" chama o users.
// Se o users não responder, volta a "reserved" e o janitor tenta mais tarde (REQ-VID-COM-022, COM-051).
async function refundOnce(taskId) {
  const claimed = await VideoTask.findOneAndUpdate(
    { _id: taskId, quota_state: "reserved" },
    { $set: { quota_state: "refunded" } },
    { new: false }
  );
  if (!claimed) return false;
  try {
    await deps.quota.refund(String(claimed.user_id), claimed.quota_day);
    return true;
  } catch (err) {
    console.error("[video] devolução falhou; o janitor volta a tentar", String(taskId), err.message);
    await VideoTask.updateOne({ _id: taskId, quota_state: "refunded" }, { $set: { quota_state: "reserved" } });
    return false;
  }
}

// ---------------------------------------------------------------- transições (D7)

// Só muda o estado se a tarefa estiver num dos estados "from"; devolve null se perdeu a corrida.
function transition(taskId, from, to, set = {}, extra = {}) {
  return VideoTask.findOneAndUpdate(
    { _id: taskId, status: { $in: from } },
    { $set: { status: to, ...set }, ...extra },
    { new: true }
  );
}

// ---------------------------------------------------------------- aceitação

// ctx: {callerId, profile, ownerId, projectId, body: {tool, videoId, params, outputName}}
async function accept({ callerId, profile, ownerId, projectId, body = {} }) {
  const tool = VIDEO_TOOLS[body.tool];
  if (!tool) {
    throw new VideoError("INVALID_PARAMS", 400, "Ferramenta de vídeo desconhecida.", { fields: { tool: "Desconhecida" } });
  }

  // 3. vídeo de origem
  if (!mongoose.isValidObjectId(body.videoId)) throw new VideoError("NOT_FOUND", 404, "Vídeo não encontrado.");
  const video = await VideoAsset.findOne({ _id: body.videoId, project_id: projectId });
  if (!video) throw new VideoError("NOT_FOUND", 404, "Vídeo não encontrado.");
  if (!video.acceptedAsInput) {
    throw new VideoError("UNSUPPORTED_FORMAT", 415, "Este vídeo não pode ser usado como entrada. Formato aceite: MP4 com vídeo H.264 e áudio AAC (ou sem áudio).");
  }

  // 4. limites do perfil atual (REQ-VID-COM-008)
  validateProfile({ sizeBytes: video.size_bytes, durationS: video.duration_s, width: video.width, height: video.height }, profile);

  // 5. parâmetros da ferramenta
  const { params } = tool.validate(body.params || {}, video, profile);
  const outputName = cleanOutputName(body.outputName);

  // 6. pedido idêntico ativo (TRIM-008)
  const dedupKey = tool.dedup ? dedupKeyFor(callerId, video._id, body.tool, tool.dedupParams ? tool.dedupParams(params) : params) : null;
  if (dedupKey) {
    const dup = await VideoTask.findOne({ dedupKey, status: { $in: ACTIVE } });
    if (dup) {
      throw new VideoError("DUPLICATE_TASK", 409, "Já existe um pedido igual em curso.", { task: toTaskDTO(dup) });
    }
  }

  // 7. fila e armazenamento disponíveis (REQ-VID-COM-009)
  if (!deps.broker.isConnected() || !(await deps.storage.health())) {
    throw new VideoError("SERVICE_UNAVAILABLE", 503, "O processamento de vídeo está temporariamente indisponível. Tente novamente dentro de momentos.");
  }

  // 8. inserir com slotKey (D9): o índice único garante o limite de tarefas ativas
  const limits = limitsFor(profile);
  const doc = {
    tool: body.tool,
    user_id: callerId,
    owner_id: ownerId,
    project_id: projectId,
    source_video_id: video._id,
    params,
    output_name: outputName,
    profile,
    priority: PRIORITY[profile],
    status: "queued",
    quota_state: "none",
    queuedAt: new Date(),
    source_duration_s: video.duration_s,
    dedupKey,
  };
  let task = null;
  for (let n = 0; n < limits.maxActiveTasks && !task; n++) {
    try {
      task = await VideoTask.create({ ...doc, slotKey: `${callerId}:${n}` });
    } catch (err) {
      if (!(err && err.code === 11000)) throw err;
    }
  }
  if (!task) {
    throw new VideoError(
      "ACTIVE_TASK_LIMIT",
      429,
      `Já tem ${limits.maxActiveTasks} ${limits.maxActiveTasks === 1 ? "tarefa" : "tarefas"} de vídeo em curso, o máximo do plano ${profile === "premium" ? "Premium" : "Free"}. Aguarde que termine ou cancele uma.`,
      { limit: { name: "activeTasks", value: limits.maxActiveTasks, unit: "tasks", profile }, upgrade: profile === "free" }
    );
  }

  // 9. reservar a operação (Free)
  let reservation;
  try {
    reservation = await deps.quota.reserve(String(callerId));
  } catch (err) {
    await VideoTask.deleteOne({ _id: task._id });
    throw err;
  }
  if (reservation.state === "reserved") {
    task = await VideoTask.findByIdAndUpdate(task._id, { $set: { quota_state: "reserved", quota_day: reservation.day } }, { new: true });
  }

  // 10. publicar com prioridade; se falhar, desfaz tudo
  const timeoutS = Math.ceil(timeoutMs(video.duration_s) / 1000);
  try {
    const url = await deps.storage.internalUrl(String(ownerId), video.storage_key, { expiresS: timeoutS + 300 });
    await deps.broker.publishTask(tool.queue, buildTaskMessage(task, video, url, timeoutS), task.priority);
  } catch (err) {
    console.error("[video] falha ao publicar a tarefa", String(task._id), err.message);
    await refundOnce(task._id);
    await VideoTask.deleteOne({ _id: task._id });
    throw new VideoError("SERVICE_UNAVAILABLE", 503, "O processamento de vídeo está temporariamente indisponível. A operação não foi gasta; tente novamente.");
  }

  // 11. notificar e responder
  emit(task);
  return task;
}

// ---------------------------------------------------------------- eventos do worker

async function start(taskId) {
  const current = await VideoTask.findById(taskId, { source_duration_s: 1 });
  if (!current) return null;
  const now = new Date();
  const task = await transition(taskId, ["queued"], "processing", {
    startedAt: now,
    deadlineAt: new Date(now.getTime() + timeoutMs(current.source_duration_s || 0)),
    progress: 0,
  });
  if (task) emit(task);
  return task;
}

async function progress(taskId, value) {
  const p = Math.max(0, Math.min(99, Math.floor(Number(value) || 0)));
  const task = await VideoTask.findOneAndUpdate(
    { _id: taskId, status: "processing", progress: { $lt: p } },
    { $set: { progress: p } },
    { new: true }
  );
  if (task) emit(task);
  return task;
}

function assetFromOutput(task, out, id, name) {
  const isVideo = out.kind !== "detections";
  return {
    _id: id,
    project_id: task.project_id,
    owner_id: task.owner_id,
    created_by: task.user_id,
    kind: isVideo ? "video" : "detections",
    origin: "task",
    name,
    storage_key: out.key,
    size_bytes: out.sizeBytes,
    sha256: out.sha256,
    container: out.container || (isVideo ? "mp4" : "json"),
    video_codec: isVideo ? out.videoCodec || null : null,
    audio_codec: isVideo ? out.audioCodec || null : null,
    duration_s: isVideo ? out.durationS : null,
    width: isVideo ? out.width : null,
    height: isVideo ? out.height : null,
    fps: isVideo ? out.fps : null,
    source_video_id: task.source_video_id,
    source_task_id: task._id,
  };
}

async function outputNameFor(task, out) {
  const source = await VideoAsset.findById(task.source_video_id, { name: 1 }).lean();
  let base = task.output_name || (source && source.name) || "video.mp4";
  const ext = out.kind === "detections" ? ".json" : `.${out.container || "mp4"}`;
  base = base.replace(/\.[^.]*$/, "") + ext;
  return uniqueName(VideoAsset, task.project_id, base);
}

// Cria os videoAsset dos resultados (upsert por _id: repetir não duplica)
async function ensureAssets(task, outputs) {
  for (let i = 0; i < outputs.length; i++) {
    const id = task.result_asset_ids[i];
    if (await VideoAsset.exists({ _id: id })) continue;
    const name = await outputNameFor(task, outputs[i]);
    await VideoAsset.updateOne({ _id: id }, { $setOnInsert: assetFromOutput(task, outputs[i], id, name) }, { upsert: true });
  }
}

// processing → completed; os resultados só passam a existir depois desta transição (REQ-VID-COM-029).
// Se o evento se repetir (nack depois de um erro), completa a criação dos resultados em falta.
async function complete(taskId, outputs = [], { ownerId } = {}) {
  const valid = Array.isArray(outputs) && outputs.length > 0 && outputs.every((o) => o && o.key && o.sizeBytes > 0);
  const ownerOf = await VideoTask.findById(taskId, { owner_id: 1, status: 1, result_asset_ids: 1 });
  // Tarefa já apagada (conta eliminada, COM-035): apagar os resultados com o ownerId do evento
  if (!ownerOf) {
    if (ownerId) await removeKeys(ownerId, (outputs || []).map((o) => o && o.key).filter(Boolean));
    return null;
  }
  if (!valid) {
    await removeKeys(ownerOf.owner_id, (outputs || []).map((o) => o && o.key).filter(Boolean));
    return fail(taskId, "output_verification_failed");
  }

  // Também a partir de "queued": se o "started" se tiver perdido, o resultado verificado não é descartado
  const ids = outputs.map(() => new mongoose.Types.ObjectId());
  const now = new Date();
  let task = await transition(
    taskId,
    ACTIVE,
    "completed",
    { result_asset_ids: ids, result_outputs: outputs, progress: 100, finishedAt: now, deadlineAt: null },
    { $unset: { slotKey: "" } }
  );
  if (task && !task.startedAt) {
    task = await VideoTask.findByIdAndUpdate(taskId, { $set: { startedAt: now } }, { new: true });
  }

  if (!task) {
    // Repetição do mesmo evento depois de a transição já ter sido feita
    if (ownerOf.status === "completed" && ownerOf.result_asset_ids.length === outputs.length) {
      task = await VideoTask.findById(taskId);
      await ensureAssets(task, outputs);
      return task;
    }
    // Perdeu a corrida (cancelada, falhada por timeout ou origem removida): descartar os ficheiros
    const left = await removeKeys(ownerOf.owner_id, outputs.map((o) => o.key));
    if (left.length) await VideoTask.updateOne({ _id: taskId }, { $addToSet: { tmp_keys: { $each: left } } });
    return null;
  }

  await ensureAssets(task, outputs);
  // REQ-VID-COM-022: a operação reservada fica consumida
  await VideoTask.updateOne({ _id: taskId, quota_state: "reserved" }, { $set: { quota_state: "consumed" } });
  task = await VideoTask.findById(taskId);
  await removeKeys(task.owner_id, task.tmp_keys);
  emit(task);
  log(task);
  return task;
}

// Estado final sem resultado: failed (erro, timeout, worker interrompido) ou cancelled.
// opts.notifyWorker publica o cancelamento para o worker parar (cancelamento, timeout, origem removida).
async function finish(taskId, to, code, { notifyWorker = false, orphanKeys = [], ownerId = null } = {}) {
  const task = await transition(
    taskId,
    ACTIVE,
    to,
    { reason_code: code, reason_message: reasonMessage(code), finishedAt: new Date(), deadlineAt: null },
    { $unset: { slotKey: "" } }
  );
  if (orphanKeys.length) {
    const current = task || (await VideoTask.findById(taskId));
    const owner = current ? current.owner_id : ownerId;
    const left = owner ? await removeKeys(owner, orphanKeys) : [];
    if (current && left.length) await VideoTask.updateOne({ _id: taskId }, { $addToSet: { tmp_keys: { $each: left } } });
  }
  if (!task) return null;

  if (notifyWorker) deps.broker.publishCancel(task._id);
  await refundOnce(task._id);
  const left = await removeKeys(task.owner_id, task.tmp_keys);
  const final = await VideoTask.findByIdAndUpdate(task._id, { $set: { tmp_keys: left } }, { new: true });
  emit(final);
  log(final);
  return final;
}

const fail = (taskId, code, opts) => finish(taskId, "failed", code, opts);
const cancel = (taskId, code = "user_cancelled") => finish(taskId, "cancelled", code, { notifyWorker: true });

// Cancela as tarefas ativas com origem num vídeo ou num projeto (REQ-VID-COM-017)
async function cancelActive(filter, code) {
  const tasks = await VideoTask.find({ ...filter, status: { $in: ACTIVE } }, { _id: 1 });
  for (const t of tasks) await cancel(t._id, code);
  return tasks.length;
}

// Tarefas concluídas com resultados por criar (a criação falhou depois da transição); usado pelo janitor
async function repairResults() {
  const candidates = await VideoTask.find({ status: "completed", "result_outputs.0": { $exists: true } });
  let repaired = 0;
  for (const task of candidates) {
    const existing = await VideoAsset.countDocuments({ _id: { $in: task.result_asset_ids } });
    if (existing === task.result_asset_ids.length) continue;
    await ensureAssets(task, task.result_outputs);
    emit(task);
    repaired++;
  }
  return repaired;
}

module.exports = {
  accept,
  repairResults,
  transition,
  start,
  progress,
  complete,
  fail,
  cancel,
  cancelActive,
  refundOnce,
  log,
  dedupKeyFor,
  ACTIVE,
  FINAL,
  _setDeps,
};
