// Contrato de mensagens com os workers e textos para o utilizador (spec 000;
// contracts/worker-messages.md, contracts/public-api.md; REQ-VID-COM-020, COM-052).

// Motivos de falha e de cancelamento (reason.code). O texto mostrado é sempre escolhido aqui,
// nunca o enviado pelo worker.
const REASON_MESSAGES = {
  ffmpeg_error: "Não foi possível processar o vídeo.",
  corrupted_input: "O vídeo de origem não pôde ser lido.",
  output_verification_failed: "O resultado não passou na verificação e foi descartado.",
  timeout: "Tempo máximo de processamento excedido.",
  queue_timeout: "A tarefa esperou demasiado tempo na fila e foi cancelada. A operação foi devolvida; pode tentar de novo.",
  worker_interrupted: "O processamento foi interrompido. A operação foi devolvida; pode tentar de novo.",
  storage_error: "Não foi possível guardar o resultado.",
  tool_error: "A ferramenta falhou ao processar o vídeo.",
  user_cancelled: "Cancelada a seu pedido.",
  source_video_removed: "O vídeo de origem foi removido.",
  project_removed: "O projeto foi removido.",
};

function reasonMessage(code) {
  return REASON_MESSAGES[code] || REASON_MESSAGES.tool_error;
}

// Pedido de tarefa para video_<tool>_queue
function buildTaskMessage(task, video, url, timeoutS) {
  return {
    schemaVersion: 1,
    type: "video-task",
    taskId: String(task._id),
    tool: task.tool,
    ownerId: String(task.owner_id),
    projectId: String(task.project_id),
    input: {
      url,
      durationS: video.duration_s,
      width: video.width,
      height: video.height,
      fps: video.fps,
      hasAudio: !!video.audio_codec,
    },
    params: task.params || {},
    output: { stage: "video_out" },
    limits: { timeoutS },
    issuedAt: new Date().toISOString(),
  };
}

const iso = (d) => (d ? new Date(d).toISOString() : null);

function toTaskDTO(t) {
  return {
    id: String(t._id),
    tool: t.tool,
    projectId: String(t.project_id),
    status: t.status,
    progress: t.progress,
    sourceVideoId: String(t.source_video_id),
    outputName: t.output_name,
    params: t.params || {},
    reason: t.reason_code ? { code: t.reason_code, message: t.reason_message || reasonMessage(t.reason_code) } : null,
    resultIds: (t.result_asset_ids || []).map(String),
    startedBy: String(t.user_id),
    queuedAt: iso(t.queuedAt),
    startedAt: iso(t.startedAt),
    finishedAt: iso(t.finishedAt),
  };
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

// Mensagem para o wsGateway (contracts/ws-events.md)
function wsMessage(task) {
  return {
    type: "video-task",
    userId: String(task.user_id),
    projectId: String(task.project_id),
    timestamp: Date.now(),
    task: toTaskDTO(task),
  };
}

module.exports = { REASON_MESSAGES, reasonMessage, buildTaskMessage, toTaskDTO, toVideoDTO, wsMessage };
