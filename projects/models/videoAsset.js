const mongoose = require("mongoose");

// Vídeo de um projeto (original carregado ou resultado de uma tarefa) — spec 000, data-model.
// Fica fora de project.imgs para que a cadeia de ferramentas de imagem o ignore (REQ-VID-COM-032).
const videoAssetSchema = new mongoose.Schema(
  {
    project_id: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    owner_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, required: true },
    kind: { type: String, enum: ["video", "detections"], required: true, default: "video" },
    origin: { type: String, enum: ["upload", "task"], required: true },
    name: { type: String, required: true },
    storage_key: { type: String, required: true },
    size_bytes: { type: Number, required: true, min: 1 },
    sha256: { type: String, required: true },
    container: { type: String, enum: ["mp4", "webm", "json"], required: true },
    video_codec: { type: String, default: null },
    audio_codec: { type: String, default: null },
    duration_s: { type: Number, default: null },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    fps: { type: Number, default: null },
    source_video_id: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
    source_task_id: { type: mongoose.Schema.Types.ObjectId, default: null },
    upload_id: { type: String, default: undefined },
  },
  { timestamps: true }
);

videoAssetSchema.index({ project_id: 1, createdAt: -1 });
// REQ-VID-SUBMIT-009: a repetição de um envio (mesmo X-Upload-Id) não cria segunda entrada
videoAssetSchema.index({ project_id: 1, upload_id: 1 }, { unique: true, sparse: true });

// REQ-VID-CONV-004 / RNG-02: só MP4/H.264 com AAC ou sem áudio é aceite como entrada das ferramentas
videoAssetSchema.virtual("acceptedAsInput").get(function () {
  return (
    this.kind === "video" &&
    this.container === "mp4" &&
    this.video_codec === "h264" &&
    (this.audio_codec === "aac" || this.audio_codec === null)
  );
});

module.exports = mongoose.model("videoAsset", videoAssetSchema);
