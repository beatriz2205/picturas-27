// Ferramenta de filtros visuais e ajustes de cor (spec 004; REQ-VID-FLT-001 a 003).
// params: {style, tint, brightness, contrast, saturation}, valores inteiros em −100..+100.
const { VideoError } = require("../errors");

// Lido na chamada: config/video.js requer este módulo ao montar VIDEO_TOOLS
const config = () => require("../../config/video");

const STYLE_IDS = ["none", "custom", "bw", "sepia", "vintage"];
const TINTS = [null, "sepia", "sepia30"];
const ADJUSTMENTS = ["brightness", "contrast", "saturation"];

// research F2 / A18: −100 → 0, 0 → 1, +100 → 2 (o fator das ferramentas de imagem)
const toFactor = (v) => 1 + v / 100;

function options() {
  const { FILTER_STYLES, FILTER_RANGE } = config();
  return { styles: FILTER_STYLES, range: FILTER_RANGE };
}

function validate(params = {}) {
  const { min, max } = config().FILTER_RANGE;
  const fields = {};
  const clean = {};

  for (const key of ADJUSTMENTS) {
    const v = params[key] === undefined ? 0 : params[key];
    if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) fields[key] = `Inteiro entre ${min} e +${max}`;
    else clean[key] = v;
  }

  const style = params.style === undefined ? "none" : params.style;
  if (!STYLE_IDS.includes(style)) fields.style = "Estilo desconhecido";
  else clean.style = style;

  // Sem tint explícito, o estilo predefinido traz o seu (pedido como o do contrato: só style e valores)
  let tint = params.tint;
  if (tint === undefined) tint = (config().FILTER_STYLES.find((s) => s.id === style) || {}).tint ?? null;
  if (!TINTS.includes(tint)) fields.tint = "Tonalidade desconhecida";
  else clean.tint = tint;

  if (Object.keys(fields).length) throw new VideoError("INVALID_PARAMS", 400, "Parâmetros inválidos.", { fields });

  // research F5: sem estilo nem ajuste não se gasta uma operação
  if (clean.tint === null && ADJUSTMENTS.every((k) => clean[k] === 0)) {
    throw new VideoError("INVALID_PARAMS", 400, "Escolha um estilo ou ajuste pelo menos um controlo.", { fields: { _: "NO_CHANGE" } });
  }
  return { params: clean };
}

// data-model: o estilo é só um rótulo; dois pedidos com o mesmo efeito são duplicados
function dedupParams({ tint, brightness, contrast, saturation }) {
  return { tint, brightness, contrast, saturation };
}

module.exports = { queue: "video_filter_queue", validate, dedupParams, options, toFactor, outputs: ["video"], dedup: true };
