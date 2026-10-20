// Ferramenta de teste: o worker video_noop copia a entrada (spec 000, T031; REQ-VID-COM-047).
// Só registada fora de produção (config/video.js).
const { VideoError } = require("../errors");

function validate(params = {}) {
  const fields = {};
  const clean = {};
  if (params.sleepS !== undefined) {
    const s = Number(params.sleepS);
    if (!Number.isFinite(s) || s < 0 || s > 3600) fields.sleepS = "Entre 0 e 3600 s";
    else clean.sleepS = s;
  }
  if (params.corrupt !== undefined) {
    if (typeof params.corrupt !== "boolean") fields.corrupt = "Verdadeiro ou falso";
    else clean.corrupt = params.corrupt;
  }
  if (Object.keys(fields).length) throw new VideoError("INVALID_PARAMS", 400, "Parâmetros inválidos.", { fields });
  return { params: clean };
}

module.exports = { queue: "video_noop_queue", validate, outputs: ["video"], dedup: false };
