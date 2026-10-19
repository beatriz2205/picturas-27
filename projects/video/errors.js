// Erros de vídeo com código estável e mensagem para o utilizador (REQ-VID-COM-007).
// Formato: specs/000-video-common/contracts/public-api.md

class VideoError extends Error {
  constructor(code, http, message, extra = {}) {
    super(message);
    this.code = code;
    this.http = http;
    this.extra = extra;
  }
}

function toResponse(res, err) {
  if (err instanceof VideoError) {
    return res.status(err.http).json({ code: err.code, message: err.message, ...err.extra });
  }
  console.error("[video] erro inesperado:", err);
  return res.status(500).json({ code: "INTERNAL_ERROR", message: "Ocorreu um erro inesperado. Tente novamente." });
}

module.exports = { VideoError, toResponse };
