// Consumidor de video_events_queue (spec 000, T025; contracts/worker-messages.md).
// Os eventos fora de ordem ou repetidos são ignorados pelas transições condicionais (D7).
const mongoose = require("mongoose");
const tasks = require("./taskService");
const broker = require("./broker");

async function handleEvent(evt) {
  if (!evt || evt.schemaVersion !== 1 || !mongoose.isValidObjectId(evt.taskId)) {
    console.error("[video] evento inválido descartado", evt && evt.type);
    return;
  }
  switch (evt.type) {
    case "started":
      return tasks.start(evt.taskId);
    case "progress":
      return tasks.progress(evt.taskId, evt.progress);
    case "completed":
      return tasks.complete(evt.taskId, evt.outputs, { ownerId: evt.ownerId });
    case "failed":
      return tasks.fail(evt.taskId, (evt.reason && evt.reason.code) || "tool_error", {
        orphanKeys: Array.isArray(evt.orphanKeys) ? evt.orphanKeys : [],
        ownerId: evt.ownerId,
      });
    default:
      console.error("[video] tipo de evento desconhecido", evt.type);
  }
}

function startEventConsumer() {
  return broker.consumeEvents(handleEvent);
}

module.exports = { handleEvent, startEventConsumer };
