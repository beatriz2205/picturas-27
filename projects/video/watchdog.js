// Tempo máximo de processamento (spec 000, D11, T045; RNG-06, REQ-VID-COM-040).
// A cada 60 s:
//  - falha com "timeout" as tarefas em processamento com o prazo ultrapassado e pede ao worker que pare;
//  - falha com "queue_timeout" as tarefas em fila há mais de TIMEOUT.maxQueuedMs (24 h): se a mensagem
//    ou os eventos do worker se perderem, a tarefa não fica "Em fila" para sempre a ocupar uma vaga.
const VideoTask = require("../models/videoTask");
const tasks = require("./taskService");
const { TIMEOUT } = require("../config/video");

const INTERVAL_MS = Number(process.env.VIDEO_WATCHDOG_MS) || 60e3;

async function sweep(now = new Date()) {
  const late = await VideoTask.find({ status: "processing", deadlineAt: { $lt: now } }, { _id: 1 });
  for (const t of late) {
    await tasks.fail(t._id, "timeout", { notifyWorker: true }).catch((e) => console.error("[video] watchdog:", e.message));
  }
  const stale = await VideoTask.find({ status: "queued", queuedAt: { $lt: new Date(now - TIMEOUT.maxQueuedMs) } }, { _id: 1 });
  for (const t of stale) {
    await tasks.fail(t._id, "queue_timeout", { notifyWorker: true }).catch((e) => console.error("[video] watchdog:", e.message));
  }
  return late.length + stale.length;
}

function startWatchdog() {
  return setInterval(() => sweep().catch((e) => console.error("[video] watchdog:", e.message)), INTERVAL_MS).unref();
}

module.exports = { sweep, startWatchdog };
