// Regras de vídeo do MVP (relatório da Fase 1, Cap. 3.4: RNG-02 a RNG-08).
// Valores de trabalho definidos pela equipa: alterar aqui e no relatório.

const MB = 1024 * 1024;

module.exports = {
  // RNG-03 / REQ-VID-COM-004 a 006
  PROFILE_LIMITS: {
    free: { maxBytes: 100 * MB, maxDurationS: 60, maxWidth: 1920, maxHeight: 1080, maxActiveTasks: 1, dailyOps: 5 },
    premium: { maxBytes: 500 * MB, maxDurationS: 600, maxWidth: 3840, maxHeight: 2160, maxActiveTasks: 3, dailyOps: null },
  },

  // REQ-VID-COM-010
  PRESET_HEIGHTS: [2160, 1440, 1080, 720, 480, 360],

  // RNG-02 / REQ-VID-COM-045: contentor MP4, vídeo H.264, áudio AAC ou sem áudio
  INPUT_MATRIX: { formatNames: ["mov", "mp4"], majorBrands: ["isom", "iso2", "iso4", "iso5", "iso6", "mp41", "mp42", "avc1", "dash"], videoCodec: "h264", audioCodecs: ["aac"] },

  // RNG-06 / REQ-VID-COM-040
  TIMEOUT: {
    minMs: Number(process.env.VIDEO_TIMEOUT_MIN_MS) || 15 * 60e3,
    perVideoMinuteMs: 15 * 60e3,
    // Tempo máximo em fila: uma tarefa cujas mensagens se perderam não fica "Em fila" para sempre
    maxQueuedMs: Number(process.env.VIDEO_QUEUE_MAX_MS) || 24 * 3600e3,
  },

  // RNG-06 / REQ-VID-COM-038
  CLEANUP: { tmpAfterFinalMs: 60 * 60e3, failedUploadMs: 24 * 3600e3 },

  // RNG-08 / REQ-VID-COM-043
  TASK_RETENTION_S: 30 * 24 * 3600,

  // REQ-VID-COM-050
  URL_EXPIRES_S: 15 * 60,

  PRIORITY: { premium: 10, free: 1 },

  // Margem para o overhead multipart quando se compara Content-Length com o limite (SUBMIT-003)
  MULTIPART_OVERHEAD_BYTES: 1 * MB,

  UPLOAD_TMP_DIR: process.env.VIDEO_UPLOAD_TMP_DIR || "/app/images/tmp/uploads",

  // Ferramentas de vídeo: preenchido pelos specs 002 a 005. Cada entrada:
  //   queue      fila do worker (rabbitMQ/definitions.json e video/broker.js)
  //   validate   (params, video, profile) → {params} ou VideoError INVALID_PARAMS
  //   outputs    tipos de resultado ("video", "detections")
  //   dedup      true para recusar pedidos idênticos ativos (DUPLICATE_TASK, TRIM-008)
  // O "noop" (worker de teste, REQ-VID-COM-047) só existe fora de produção.
  VIDEO_TOOLS: {
    ...(process.env.NODE_ENV === "production" ? {} : { noop: require("../video/tools/noop") }),
    trim: require("../video/tools/trim"),
    convert: require("../video/tools/convert"),
    filter: require("../video/tools/filter"),
  },

  // REQ-VID-FLT-001/002 (spec 004, research F3): estilos predefinidos dos filtros. Fonte única: o
  // frontend recebe-os por GET .../filter-options e o worker só conhece as matrizes de "tint".
  // Valores na escala −100..+100 (0 neutro); só o saturation −100 do P&B é exigido (FLT-002).
  FILTER_STYLES: [
    { id: "bw", label: "Preto e Branco", brightness: 0, contrast: 10, saturation: -100, tint: null },
    { id: "sepia", label: "Sépia", brightness: 5, contrast: 0, saturation: -100, tint: "sepia" },
    { id: "vintage", label: "Vintage", brightness: 5, contrast: -15, saturation: -35, tint: "sepia30" },
  ],
  FILTER_RANGE: { min: -100, max: 100, neutral: 0 },
};
