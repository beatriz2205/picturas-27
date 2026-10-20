// Limpeza periódica (spec 000, D11, T056; RNG-06, REQ-VID-COM-038).
// A cada 10 min:
//  - apaga os objetos temporários (tmp_keys) de tarefas terminadas há mais de 1 h;
//  - apaga os ficheiros de envio parciais em UPLOAD_TMP_DIR com mais de 24 h;
//  - volta a tentar as devoluções de quota que falharam (quota_state ainda "reserved" num estado final);
//  - cria os resultados de tarefas concluídas cuja criação falhou a meio (result_outputs).
const fs = require("fs");
const path = require("path");
const VideoTask = require("../models/videoTask");
const storage = require("./storage");
const tasks = require("./taskService");
const { CLEANUP, UPLOAD_TMP_DIR } = require("../config/video");

const INTERVAL_MS = Number(process.env.VIDEO_JANITOR_MS) || 10 * 60e3;

async function cleanTmpKeys(now) {
  const old = await VideoTask.find({
    status: { $in: tasks.FINAL },
    finishedAt: { $lt: new Date(now - CLEANUP.tmpAfterFinalMs) },
    "tmp_keys.0": { $exists: true },
  });
  let removed = 0;
  for (const t of old) {
    const left = [];
    for (const key of t.tmp_keys) {
      try {
        await storage.remove(String(t.owner_id), key);
        removed++;
      } catch (_) {
        left.push(key);
      }
    }
    await VideoTask.updateOne({ _id: t._id }, { $set: { tmp_keys: left } });
  }
  return removed;
}

async function cleanUploads(now, dir = UPLOAD_TMP_DIR) {
  let names;
  try {
    names = await fs.promises.readdir(dir);
  } catch (_) {
    return 0;
  }
  let removed = 0;
  for (const name of names) {
    const p = path.join(dir, name);
    try {
      const st = await fs.promises.stat(p);
      if (st.isFile() && now - st.mtimeMs > CLEANUP.failedUploadMs) {
        await fs.promises.unlink(p);
        removed++;
      }
    } catch (_) {}
  }
  return removed;
}

async function retryRefunds() {
  const pending = await VideoTask.find({ status: { $in: ["failed", "cancelled"] }, quota_state: "reserved" }, { _id: 1 });
  let n = 0;
  for (const t of pending) if (await tasks.refundOnce(t._id)) n++;
  return n;
}

async function sweep(now = Date.now()) {
  const result = {
    tmpKeys: await cleanTmpKeys(now),
    uploads: await cleanUploads(now),
    refunds: await retryRefunds(),
    results: await tasks.repairResults(),
  };
  if (result.tmpKeys || result.uploads || result.refunds || result.results) console.log(JSON.stringify({ event: "video-janitor", ...result }));
  return result;
}

function startJanitor() {
  return setInterval(() => sweep().catch((e) => console.error("[video] janitor:", e.message)), INTERVAL_MS).unref();
}

module.exports = { sweep, cleanUploads, startJanitor };
