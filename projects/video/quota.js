// Reserva e devolução de operações no serviço users (spec 000, D8; contracts/internal-api.md).
const axios = require("axios");
const { httpsAgent } = require("../utils/httpsAgent");
const { VideoError } = require("./errors");

const USERS_MS = process.env.USERS_URL || "https://users:10001/";

// → {state: "reserved", day} (Free) ou {state: "none", day: null} (Premium)
async function reserve(userId) {
  let resp;
  try {
    resp = await axios.post(`${USERS_MS}${userId}/video-ops/reserve`, {}, { httpsAgent, timeout: 3000 });
  } catch (err) {
    if (err.response && err.response.status === 409) {
      throw new VideoError("QUOTA_EXHAUSTED", 429, "Atingiu o limite diário de operações do plano Free. Tente amanhã ou mude para Premium.", {
        limit: { name: "dailyOperations", value: 5, unit: "ops", profile: "free" },
        upgrade: true,
      });
    }
    if (err.response && err.response.status === 403) {
      throw new VideoError("AUTH_REQUIRED", 401, "Os vídeos só estão disponíveis para utilizadores registados.");
    }
    throw new VideoError("SERVICE_UNAVAILABLE", 503, "Não foi possível verificar as suas operações disponíveis. Tente novamente dentro de momentos.");
  }
  return resp.data.reserved ? { state: "reserved", day: new Date(resp.data.day) } : { state: "none", day: null };
}

// Devolve 1 operação ao dia da reserva. O chamador garante que só é chamado uma vez por tarefa.
async function refund(userId, day) {
  await axios.post(`${USERS_MS}${userId}/video-ops/refund`, { day: new Date(day).toISOString() }, { httpsAgent, timeout: 3000 });
}

module.exports = { reserve, refund };
