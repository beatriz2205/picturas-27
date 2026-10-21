const { VideoError } = require("../errors");

const FORMATS = [
  { id: "mp4", label: "MP4 (H.264/AAC)" },
  { id: "webm", label: "WebM (VP9/Opus)" },
];

function assertSupportedInput(video) {
  const accepted =
    video &&
    video.kind === "video" &&
    video.container === "mp4" &&
    video.video_codec === "h264" &&
    (video.audio_codec === "aac" || video.audio_codec === null);
  if (!accepted) {
    throw new VideoError(
      "UNSUPPORTED_FORMAT",
      415,
      "Este vídeo não pode ser usado como entrada. Formato aceite: MP4 com vídeo H.264 e áudio AAC (ou sem áudio)."
    );
  }
}

function options(video, profile) {
  assertSupportedInput(video);
  const originalHeight = Math.min(video.width, video.height);
  // config/video registers this tool before limits imports the completed config.
  const { allowedHeights } = require("../limits");
  const heights = allowedHeights(video, profile).map((value) => ({
    value,
    label: value === originalHeight ? `Original (${value}p)` : `${value}p`,
  }));

  return {
    source: {
      container: video.container,
      videoCodec: video.video_codec,
      audioCodec: video.audio_codec,
      width: video.width,
      height: video.height,
      durationS: video.duration_s,
      sizeBytes: video.size_bytes,
    },
    formats: FORMATS,
    heights,
    defaults: { format: "mp4", height: originalHeight },
  };
}

function validate(params = {}, video, profile) {
  const available = options(video, profile);
  const fields = {};
  const format = params.format === undefined ? available.defaults.format : params.format;
  const height = params.height === undefined ? available.defaults.height : params.height;

  if (!FORMATS.some((item) => item.id === format)) fields.format = "Escolha MP4 ou WebM.";
  if (!Number.isInteger(height) || !available.heights.some((item) => item.value === height)) {
    fields.height = "Escolha uma resolução permitida.";
  }
  if (Object.keys(fields).length) {
    throw new VideoError("INVALID_PARAMS", 400, "Parâmetros inválidos.", { fields, options: available });
  }
  if (format === "mp4" && height === available.defaults.height) {
    throw new VideoError("INVALID_PARAMS", 400, "O resultado seria igual ao original.", {
      fields: { _: "NO_CHANGE" },
      options: available,
    });
  }

  return { params: { format, height } };
}

function correctOutputName(name, format) {
  if (name === undefined || name === null || name === "") return name;
  if (typeof name !== "string") return name;
  if (!FORMATS.some((item) => item.id === format)) return name;

  const extension = `.${format}`;
  const base = name.replace(/\.[^.]*$/, "");
  return `${base || name}${extension}`;
}

function dedupParams({ format, height }) {
  return { format, height };
}

module.exports = {
  queue: "video_convert_queue",
  validate,
  options,
  correctOutputName,
  dedupParams,
  outputs: ["video"],
  dedup: true,
};
