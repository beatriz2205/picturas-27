"use strict";

const ALLOWED_TOOLS = new Set(["people_ai", "obj_ai"]);

function invalid(fields) {
  const error = new Error("Parâmetros de deteção inválidos.");
  error.code = "INVALID_PARAMS";
  error.status = 400;
  error.fields = fields;
  return error;
}

function validate(params = {}) {
  const fields = {};
  const tools = params.tools;
  if (!Array.isArray(tools) || tools.length < 1 || tools.length > 2 || tools.some((tool) => !ALLOWED_TOOLS.has(tool)) || new Set(tools).size !== tools.length) {
    fields.tools = "Escolha people_ai, obj_ai ou ambas, sem repetir.";
  }

  const threshold = params.threshold === undefined ? 0.5 : Number(params.threshold);
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
    fields.threshold = "O limiar deve estar entre 0 e 1.";
  }

  const annotatedVideo = params.annotatedVideo === undefined ? false : params.annotatedVideo;
  if (typeof annotatedVideo !== "boolean") fields.annotatedVideo = "Indique um booleano.";
  if (Object.keys(fields).length) throw invalid(fields);

  return { params: { tools: [...tools], threshold, annotatedVideo } };
}

function dedupKey(params) {
  const normalized = validate(params).params;
  return JSON.stringify({
    tools: [...normalized.tools].sort(),
    threshold: normalized.threshold,
    annotatedVideo: normalized.annotatedVideo,
  });
}

module.exports = {
  queue: "video_detect_queue",
  outputs: ["detections", "video"],
  dedup: true,
  ALLOWED_TOOLS,
  validate,
  dedupKey,
};
