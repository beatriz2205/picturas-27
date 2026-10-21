// Gera as thumbnails dos vídeos guardados antes da decisão D16 (spec 001, T033; REQ-VID-COM-057).
// Idempotente: só trata vídeos com thumbnail_key a null. Uma falha deixa o vídeo como estava.
// Uso: docker compose exec projects node scripts/backfill-thumbnails.js
const mongoose = require("mongoose");
const VideoAsset = require("../models/videoAsset");
const storage = require("../video/storage");
const { storeThumbnail } = require("../video/thumbnail");

const MONGO_URL = process.env.MONGO_URL || "mongodb://projects_mongoDB:27018/project";

async function main() {
  await mongoose.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });
  const pending = await VideoAsset.find({ kind: "video", thumbnail_key: null });
  let done = 0;
  for (const v of pending) {
    let key = null;
    try {
      const url = await storage.internalUrl(String(v.owner_id), v.storage_key, { expiresS: 300 });
      key = await storeThumbnail(v.owner_id, v.project_id, url, v.duration_s);
    } catch (e) {
      console.error(`[backfill] ${v._id}: ${e.message}`);
    }
    if (!key) continue;
    // O vídeo pode ter sido removido ou tratado por outra execução entretanto
    const r = await VideoAsset.updateOne({ _id: v._id, thumbnail_key: null }, { $set: { thumbnail_key: key } });
    if (r.modifiedCount) done++;
    else await storage.remove(String(v.owner_id), key).catch(() => {});
  }
  console.log(`[backfill] ${done} de ${pending.length} vídeos com thumbnail nova`);
}

main()
  .catch((e) => {
    console.error("[backfill]", e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
