// Quota de vídeo atómica (spec 000, D8; REQ-VID-COM-021, COM-022, COM-051).
// Usa o mesmo contador das ferramentas avançadas de imagem (operations[].processed), por isso o
// limite diário Free é partilhado e o remaining_operations já existente inclui o vídeo.
const User = require("../models/user");

// Mesmo cálculo do dia que routes/users.js (get_cur_date), para as entradas coincidirem.
function today() {
  const d = new Date();
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

// Reserva 1 operação. Devolve {status, body} para a rota responder.
async function reserve(userId, maxDaily) {
  const user = await User.findById(userId, { type: 1 }).lean();
  if (!user) return { status: 404, body: { code: "NOT_FOUND" } };
  if (user.type === "anonymous") return { status: 403, body: { code: "AUTH_REQUIRED" } };
  if (user.type === "premium") return { status: 200, body: { reserved: false, profile: "premium" } };

  const day = today();
  const incToday = () =>
    User.updateOne(
      { _id: userId, operations: { $elemMatch: { day, processed: { $lt: maxDaily } } } },
      { $inc: { "operations.$.processed": 1 } }
    );

  // 1) já existe entrada para hoje com saldo; 2) primeira operação do dia; 3) outro pedido criou a
  // entrada entre 1) e 2): tentar 1) outra vez.
  let r = await incToday();
  if (!r.modifiedCount && maxDaily > 0) {
    r = await User.updateOne(
      { _id: userId, "operations.day": { $ne: day } },
      { $push: { operations: { day, processed: 1 } } }
    );
    if (!r.modifiedCount) r = await incToday();
  }
  if (!r.modifiedCount) return { status: 409, body: { code: "QUOTA_EXHAUSTED", remaining: 0 } };
  return { status: 200, body: { reserved: true, day: day.toISOString(), profile: "free" } };
}

// Devolve 1 operação ao dia em que foi reservada, sem descer abaixo de 0.
// A idempotência é garantida pelo chamador (quota_state da tarefa).
async function refund(userId, dayIso) {
  const day = new Date(dayIso);
  if (!dayIso || Number.isNaN(day.getTime())) return { status: 400, body: { code: "INVALID_PARAMS" } };
  const r = await User.updateOne(
    { _id: userId, operations: { $elemMatch: { day, processed: { $gt: 0 } } } },
    { $inc: { "operations.$.processed": -1 } }
  );
  return { status: 200, body: { refunded: r.modifiedCount === 1 } };
}

module.exports = { reserve, refund, today };
