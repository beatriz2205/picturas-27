const mongoose = require("mongoose");
const { TASK_RETENTION_S } = require("../config/video");

const ObjectId = mongoose.Schema.Types.ObjectId;

// Tarefa de processamento de vídeo — spec 000, data-model (REQ-VID-COM-011, COM-012, COM-048).
// O serviço projects é o único dono do estado (D4); as transições são condicionais (D7).
const videoTaskSchema = new mongoose.Schema(
  {
    tool: { type: String, required: true },
    user_id: { type: ObjectId, required: true },
    owner_id: { type: ObjectId, required: true },
    project_id: { type: ObjectId, required: true },
    source_video_id: { type: ObjectId, required: true, index: true },
    params: { type: mongoose.Schema.Types.Mixed, default: {} },
    output_name: { type: String, default: null },
    profile: { type: String, enum: ["free", "premium"], required: true },
    priority: { type: Number, required: true },
    status: {
      type: String,
      enum: ["queued", "processing", "completed", "failed", "cancelled"],
      required: true,
      default: "queued",
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    reason_code: { type: String, default: null },
    reason_message: { type: String, default: null },
    quota_state: { type: String, enum: ["reserved", "consumed", "refunded", "none"], default: "none" },
    quota_day: { type: Date, default: null },
    // "<user_id>:<n>" enquanto a tarefa está ativa; removido num estado final (D9)
    slotKey: { type: String, default: undefined },
    result_asset_ids: { type: [ObjectId], default: [] },
    // Saídas reportadas pelo worker, guardadas na transição para completed: permitem criar os
    // videoAsset em falta se a criação falhar a meio (janitor)
    result_outputs: { type: [mongoose.Schema.Types.Mixed], default: [] },
    tmp_keys: { type: [String], default: [] },
    queuedAt: { type: Date, default: Date.now },
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
    deadlineAt: { type: Date, default: null },
    source_duration_s: { type: Number, default: null },
    notifiedAt: { type: Date, default: null },
    dedupKey: { type: String, default: null },
  },
  { minimize: false }
);

videoTaskSchema.index({ user_id: 1, status: 1 });
videoTaskSchema.index({ project_id: 1, queuedAt: -1 });
// REQ-VID-COM-018 / COM-051: limite de tarefas ativas sem corrida (D9)
videoTaskSchema.index({ slotKey: 1 }, { unique: true, sparse: true });
// REQ-VID-COM-043: registos de tarefas terminadas apagados ao fim de 30 dias
videoTaskSchema.index({ finishedAt: 1 }, { expireAfterSeconds: TASK_RETENTION_S });
videoTaskSchema.index({ status: 1, deadlineAt: 1 });
videoTaskSchema.index({ dedupKey: 1, status: 1 });

videoTaskSchema.statics.ACTIVE = ["queued", "processing"];
videoTaskSchema.statics.FINAL = ["completed", "failed", "cancelled"];

module.exports = mongoose.model("videoTask", videoTaskSchema);
