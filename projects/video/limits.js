// Validação da matriz de formatos e dos limites por perfil (RNG-02, RNG-03).
const { PROFILE_LIMITS, PRESET_HEIGHTS, INPUT_MATRIX, TIMEOUT } = require("../config/video");
const { VideoError } = require("./errors");

const MB = 1024 * 1024;

function limitsFor(profile) {
  const limits = PROFILE_LIMITS[profile];
  if (!limits) throw new VideoError("AUTH_REQUIRED", 401, "Inicie sessão com uma conta registada para usar vídeos.");
  return limits;
}

function fmtDuration(s) {
  if (s < 60) return `${Math.round(s * 10) / 10} s`;
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return r ? `${m} min ${r} s` : `${m} min`;
}

function profileLabel(profile) {
  return profile === "premium" ? "Premium" : "Free";
}

// REQ-VID-COM-003 / COM-045 — entrada só MP4 com H.264 e AAC (ou sem áudio).
function validateInput(meta) {
  const accepted = "MP4 com vídeo H.264 e áudio AAC (ou sem áudio)";
  if (!meta || !meta.videoStreams) {
    throw new VideoError("CORRUPTED_FILE", 422, `Não foi possível ler o ficheiro como vídeo. Formato aceite: ${accepted}.`);
  }
  const isMp4 =
    meta.formatNames.some((f) => INPUT_MATRIX.formatNames.includes(f)) &&
    meta.majorBrand !== null &&
    INPUT_MATRIX.majorBrands.includes(meta.majorBrand);
  if (!isMp4) {
    throw new VideoError("UNSUPPORTED_FORMAT", 415, `Contentor não suportado. Formato aceite: ${accepted}.`, {
      detected: { container: meta.majorBrand || meta.formatNames[0] },
    });
  }
  if (meta.videoStreams !== 1 || meta.videoCodec !== INPUT_MATRIX.videoCodec) {
    throw new VideoError("UNSUPPORTED_FORMAT", 415, `Codec de vídeo não suportado (${meta.videoCodec || "desconhecido"}). Formato aceite: ${accepted}.`, {
      detected: { videoCodec: meta.videoCodec },
    });
  }
  if (meta.audioStreams > 1 || (meta.audioStreams === 1 && !INPUT_MATRIX.audioCodecs.includes(meta.audioCodec))) {
    throw new VideoError("UNSUPPORTED_FORMAT", 415, `Codec de áudio não suportado (${meta.audioCodec}). Formato aceite: ${accepted}.`, {
      detected: { audioCodec: meta.audioCodec },
    });
  }
  if (!meta.durationS || !meta.width || !meta.height) {
    throw new VideoError("CORRUPTED_FILE", 422, "Não foi possível determinar a duração ou a resolução do vídeo.");
  }
}

// sizeBytes null: o tamanho exato não é conhecido (envio interrompido ao passar o limite).
function sizeError(sizeBytes, profile) {
  const l = limitsFor(profile);
  const limitText = `o limite do plano ${profileLabel(profile)} é ${l.maxBytes / MB} MB`;
  return new VideoError(
    "VIDEO_TOO_LARGE",
    413,
    sizeBytes ? `O vídeo tem ${Math.ceil(sizeBytes / MB)} MB; ${limitText}.` : `O vídeo é demasiado grande; ${limitText}.`,
    { limit: { name: "size", value: l.maxBytes / MB, unit: "MB", profile }, upgrade: profile === "free" }
  );
}

// REQ-VID-COM-004 a 006 — o primeiro limite excedido determina a rejeição (RNG-03).
// A resolução compara lado menor com lado menor, para aceitar vídeos verticais.
function validateProfile(meta, profile) {
  const l = limitsFor(profile);
  const upgrade = profile === "free";

  if (meta.sizeBytes > l.maxBytes) throw sizeError(meta.sizeBytes, profile);

  if (meta.durationS > l.maxDurationS) {
    throw new VideoError(
      "VIDEO_TOO_LONG",
      422,
      `O vídeo tem ${fmtDuration(meta.durationS)}; o limite do plano ${profileLabel(profile)} é ${fmtDuration(l.maxDurationS)}.`,
      { limit: { name: "duration", value: l.maxDurationS, unit: "s", profile }, upgrade }
    );
  }

  const short = Math.min(meta.width, meta.height);
  const long = Math.max(meta.width, meta.height);
  if (short > Math.min(l.maxWidth, l.maxHeight) || long > Math.max(l.maxWidth, l.maxHeight)) {
    throw new VideoError(
      "RESOLUTION_TOO_HIGH",
      422,
      `O vídeo tem ${meta.width} × ${meta.height} px; o limite do plano ${profileLabel(profile)} é ${l.maxWidth} × ${l.maxHeight} px.`,
      { limit: { name: "resolution", value: `${l.maxWidth}x${l.maxHeight}`, unit: "px", profile }, upgrade }
    );
  }
}

// REQ-VID-COM-010 — alturas de saída permitidas (lado menor), sem exceder a original nem o perfil.
function allowedHeights(meta, profile) {
  const l = limitsFor(profile);
  const original = Math.min(meta.width, meta.height);
  const cap = Math.min(original, Math.min(l.maxWidth, l.maxHeight));
  const heights = PRESET_HEIGHTS.filter((h) => h < original && h <= cap);
  if (original <= cap) heights.unshift(original);
  return heights;
}

// RNG-06 / REQ-VID-COM-040 — max(15 min, 15 min por minuto de vídeo)
function timeoutMs(durationS) {
  return Math.max(TIMEOUT.minMs, Math.ceil((durationS / 60) * TIMEOUT.perVideoMinuteMs));
}

module.exports = { limitsFor, validateInput, validateProfile, sizeError, allowedHeights, timeoutMs };
