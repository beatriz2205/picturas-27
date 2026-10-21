// Alterar a velocidade de um vídeo (UC-VID-006; REQ-VID-SPD-001 a SPD-005).
// params: {factor} — um dos fatores de SPEED_FACTORS; a duração do resultado é a da origem / factor.
const { VideoError } = require("../errors");

// UC-VID-006/RN2: o resultado tem no máximo o dobro e no mínimo metade da duração da origem
const SPEED_FACTORS = [0.5, 0.75, 1.25, 1.5, 2];

function validate(params = {}, video) {
  const factor = params.factor;
  if (!SPEED_FACTORS.includes(factor)) {
    throw new VideoError("INVALID_PARAMS", 400, "Parâmetros inválidos.", {
      fields: { factor: `Escolha uma das velocidades: ${SPEED_FACTORS.map((f) => `${f}×`).join(", ")}` },
    });
  }
  return { params: { factor, expectedDurationS: Math.round((video.duration_s / factor) * 1000) / 1000 } };
}

module.exports = { queue: "video_speed_queue", validate, outputs: ["video"], dedup: true, SPEED_FACTORS };
