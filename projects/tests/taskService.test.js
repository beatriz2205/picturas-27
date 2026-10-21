// spec 000 (T024, T045) — ciclo de vida das tarefas de vídeo no serviço de projetos.
// Usa um MongoDB real (TEST_MONGO_URL); quota, RabbitMQ e armazenamento são simulados.
// Exemplo: docker run -d --name test-mongo -p 27099:27017 mongo:4.4
//          TEST_MONGO_URL=mongodb://localhost:27099/test npm test
const test = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");

const MONGO = process.env.TEST_MONGO_URL;
const skip = MONGO ? false : "defina TEST_MONGO_URL";

const OWNER = "6720aaaaaaaaaaaaaaaaaaaa";
const PROJECT = "6720bbbbbbbbbbbbbbbbbbbb";
const FREE = "6720cccccccccccccccccccc";
const PREMIUM = "6720dddddddddddddddddddd";

let VideoTask;
let VideoAsset;
let tasks;
let watchdog;
let events;
let fake;

function makeFakes() {
  const f = {
    connected: true,
    storageUp: true,
    publishFails: false,
    quotaLeft: 5,
    reserves: 0,
    refunds: [],
    published: [],
    ws: [],
    cancels: [],
    removed: [],
  };
  f.broker = {
    isConnected: () => f.connected,
    publishTask: async (queue, msg, priority) => {
      if (f.publishFails) throw new Error("canal fechado");
      f.published.push({ queue, msg, priority });
    },
    publishWs: async (msg) => f.ws.push(msg),
    publishCancel: async (id) => f.cancels.push(String(id)),
  };
  f.quota = {
    reserve: async (userId) => {
      f.reserves++;
      if (userId === PREMIUM) return { state: "none", day: null };
      if (f.quotaLeft <= 0) {
        const { VideoError } = require("../video/errors");
        throw new VideoError("QUOTA_EXHAUSTED", 429, "sem operações", { upgrade: true });
      }
      f.quotaLeft--;
      return { state: "reserved", day: new Date("2026-10-20T00:00:00Z") };
    },
    refund: async (userId, day) => {
      // atraso para tornar visível uma eventual devolução dupla em pedidos concorrentes
      await new Promise((r) => setTimeout(r, 20));
      f.refunds.push({ userId, day });
      f.quotaLeft++;
    },
  };
  f.storage = {
    health: async () => f.storageUp,
    internalUrl: async (owner, key) => `http://seaweedfs/${owner}/${key}`,
    remove: async (owner, key) => f.removed.push(key),
  };
  // thumbnails dos resultados (D16): regista a entrada e devolve uma chave previsível
  f.thumbInputs = [];
  f.thumbFails = false;
  f.thumbnails = {
    storeThumbnail: async (owner, project, input) => {
      f.thumbInputs.push(input);
      if (f.thumbFails) return null;
      return `${project}/video_thumb/${input.split("/").pop()}.jpg`;
    },
  };
  return f;
}

async function makeVideo(extra = {}) {
  return VideoAsset.create({
    project_id: PROJECT,
    owner_id: OWNER,
    created_by: OWNER,
    kind: "video",
    origin: "upload",
    name: "clip.mp4",
    storage_key: `${PROJECT}/video_src/clip.mp4`,
    size_bytes: 1000,
    sha256: "abc",
    container: "mp4",
    video_codec: "h264",
    audio_codec: "aac",
    duration_s: 30,
    width: 1280,
    height: 720,
    fps: 30,
    ...extra,
  });
}

function ctx(callerId, video, params = {}) {
  return {
    callerId,
    profile: callerId === PREMIUM ? "premium" : "free",
    ownerId: OWNER,
    projectId: PROJECT,
    body: { tool: "noop", videoId: String(video._id), params },
  };
}

const output = (extra = {}) => ({
  kind: "video",
  key: `${PROJECT}/video_out/${new mongoose.Types.ObjectId()}.mp4`,
  sizeBytes: 900,
  sha256: "def",
  container: "mp4",
  videoCodec: "h264",
  audioCodec: "aac",
  durationS: 30,
  width: 1280,
  height: 720,
  fps: 30,
  ...extra,
});

async function codeOf(promise) {
  try {
    await promise;
    return "ok";
  } catch (err) {
    return err.code;
  }
}

test.describe("taskService", { skip }, () => {
  test.before(async () => {
    await mongoose.connect(MONGO);
    VideoTask = require("../models/videoTask");
    VideoAsset = require("../models/videoAsset");
    tasks = require("../video/taskService");
    watchdog = require("../video/watchdog");
    events = require("../video/events");
    await VideoTask.syncIndexes();
    await VideoAsset.syncIndexes();
  });

  test.beforeEach(async () => {
    await VideoTask.deleteMany({});
    await VideoAsset.deleteMany({});
    fake = makeFakes();
    tasks._setDeps({ broker: fake.broker, quota: fake.quota, storage: fake.storage, thumbnails: fake.thumbnails });
  });

  test.after(async () => {
    await mongoose.disconnect();
  });

  test("conclusão: resultados de vídeo com thumbnail; deteções sem (COM-057, D16)", async () => {
    const video = await makeVideo();
    const t = await tasks.accept(ctx(FREE, video));
    const vid = output();
    const det = output({ kind: "detections", container: "json", key: `${PROJECT}/video_out/${new mongoose.Types.ObjectId()}.json` });
    await tasks.complete(t._id, [vid, det]);
    const assets = await VideoAsset.find({ source_task_id: t._id }).sort({ kind: -1 });
    const byKind = Object.fromEntries(assets.map((a) => [a.kind, a]));
    assert.strictEqual(byKind.video.thumbnail_key, `${PROJECT}/video_thumb/${vid.key.split("/").pop()}.jpg`);
    assert.strictEqual(byKind.detections.thumbnail_key, null);
    assert.deepStrictEqual(fake.thumbInputs, [`http://seaweedfs/${OWNER}/${vid.key}`]);
  });

  test("conclusão: uma falha na thumbnail não muda o estado da tarefa (SUBMIT-013, COM-057)", async () => {
    fake.thumbFails = true;
    const video = await makeVideo();
    const t = await tasks.accept(ctx(FREE, video));
    const done = await tasks.complete(t._id, [output()]);
    assert.strictEqual(done.status, "completed");
    const asset = await VideoAsset.findOne({ source_task_id: t._id });
    assert.strictEqual(asset.thumbnail_key, null);
  });

  test("aceitação: tarefa em fila, operação reservada, mensagem com prioridade (COM-011, COM-019)", async () => {
    const video = await makeVideo();
    const t0 = Date.now();
    const task = await tasks.accept(ctx(FREE, video, { sleepS: 1 }));
    assert.ok(Date.now() - t0 < 2000, "aceitação ≤ 2 s (COM-036)");
    assert.strictEqual(task.status, "queued");
    assert.strictEqual(task.quota_state, "reserved");
    assert.strictEqual(fake.published.length, 1);
    assert.strictEqual(fake.published[0].queue, "video_noop_queue");
    assert.strictEqual(fake.published[0].priority, 1);
    assert.strictEqual(fake.published[0].msg.taskId, String(task._id));
    assert.deepStrictEqual(fake.published[0].msg.params, { sleepS: 1 });
    assert.strictEqual(fake.published[0].msg.limits.timeoutS, 900);
    assert.strictEqual(fake.ws.at(-1).task.status, "queued");

    const prem = await tasks.accept(ctx(PREMIUM, video));
    assert.strictEqual(prem.quota_state, "none");
    assert.strictEqual(fake.published[1].priority, 10);
  });

  test("limite de tarefas ativas: Free 1, Premium 3 (COM-018)", async () => {
    const video = await makeVideo();
    await tasks.accept(ctx(FREE, video));
    assert.strictEqual(await codeOf(tasks.accept(ctx(FREE, video))), "ACTIVE_TASK_LIMIT");
    for (let i = 0; i < 3; i++) await tasks.accept(ctx(PREMIUM, video));
    assert.strictEqual(await codeOf(tasks.accept(ctx(PREMIUM, video))), "ACTIVE_TASK_LIMIT");
    assert.strictEqual(fake.reserves, 4, "um pedido recusado pelo limite não reserva quota");
  });

  test("limite de tarefas ativas com 10 pedidos concorrentes (COM-051)", async () => {
    const video = await makeVideo();
    const codes = await Promise.all(Array.from({ length: 10 }, () => codeOf(tasks.accept(ctx(FREE, video)))));
    assert.strictEqual(codes.filter((c) => c === "ok").length, 1);
    assert.strictEqual(codes.filter((c) => c === "ACTIVE_TASK_LIMIT").length, 9);
    assert.strictEqual(await VideoTask.countDocuments({}), 1);
  });

  test("a vaga fica livre quando a tarefa termina", async () => {
    const video = await makeVideo();
    const t = await tasks.accept(ctx(FREE, video));
    await tasks.cancel(t._id);
    assert.strictEqual(await codeOf(tasks.accept(ctx(FREE, video))), "ok");
  });

  test("fila indisponível: 503 sem tarefa nem reserva (COM-009)", async () => {
    const video = await makeVideo();
    fake.connected = false;
    assert.strictEqual(await codeOf(tasks.accept(ctx(FREE, video))), "SERVICE_UNAVAILABLE");
    fake.connected = true;
    fake.storageUp = false;
    assert.strictEqual(await codeOf(tasks.accept(ctx(FREE, video))), "SERVICE_UNAVAILABLE");
    assert.strictEqual(await VideoTask.countDocuments({}), 0);
    assert.strictEqual(fake.reserves, 0);
  });

  test("falha ao publicar: devolve a operação e não deixa tarefa (COM-009, COM-022)", async () => {
    const video = await makeVideo();
    fake.publishFails = true;
    assert.strictEqual(await codeOf(tasks.accept(ctx(FREE, video))), "SERVICE_UNAVAILABLE");
    assert.strictEqual(fake.refunds.length, 1);
    assert.strictEqual(fake.quotaLeft, 5);
    assert.strictEqual(await VideoTask.countDocuments({}), 0);
  });

  test("quota esgotada: 429 e a tarefa não fica criada (COM-021)", async () => {
    const video = await makeVideo();
    fake.quotaLeft = 0;
    assert.strictEqual(await codeOf(tasks.accept(ctx(FREE, video))), "QUOTA_EXHAUSTED");
    assert.strictEqual(await VideoTask.countDocuments({}), 0);
  });

  test("vídeo fora da matriz ou acima dos limites do perfil atual (CONV-004, COM-008)", async () => {
    const webm = await makeVideo({ container: "webm", video_codec: "vp9", audio_codec: "opus" });
    assert.strictEqual(await codeOf(tasks.accept(ctx(FREE, webm))), "UNSUPPORTED_FORMAT");
    const long = await makeVideo({ duration_s: 120 });
    assert.strictEqual(await codeOf(tasks.accept(ctx(FREE, long))), "VIDEO_TOO_LONG");
    assert.strictEqual(await codeOf(tasks.accept(ctx(PREMIUM, long))), "ok");
    assert.strictEqual(await codeOf(tasks.accept({ ...ctx(FREE, webm), body: { tool: "nada", videoId: String(webm._id) } })), "INVALID_PARAMS");
    assert.strictEqual(await codeOf(tasks.accept(ctx(FREE, (await makeVideo()), { sleepS: -1 }))), "INVALID_PARAMS");
  });

  test("ciclo completo: queued → processing → completed cria o resultado e consome a operação (COM-012, COM-026)", async () => {
    const video = await makeVideo();
    const t = await tasks.accept(ctx(FREE, video));
    const started = await tasks.start(t._id);
    assert.strictEqual(started.status, "processing");
    assert.ok(started.deadlineAt > started.startedAt);
    assert.strictEqual((await tasks.progress(t._id, 40)).progress, 40);
    assert.strictEqual(await tasks.progress(t._id, 30), null, "o progresso não recua");

    const out = output();
    const done = await tasks.complete(t._id, [out]);
    assert.strictEqual(done.status, "completed");
    assert.strictEqual(done.progress, 100);
    assert.strictEqual(done.quota_state, "consumed");
    assert.strictEqual(done.slotKey, undefined);
    const assets = await VideoAsset.find({ source_task_id: t._id });
    assert.strictEqual(assets.length, 1);
    assert.strictEqual(String(assets[0].source_video_id), String(video._id));
    assert.strictEqual(assets[0].name, "clip (1).mp4");
    assert.strictEqual(assets[0].storage_key, out.key);
    assert.strictEqual(fake.refunds.length, 0);

    // evento repetido não duplica o resultado
    await tasks.complete(t._id, [out]);
    assert.strictEqual(await VideoAsset.countDocuments({ source_task_id: t._id }), 1);
    // estado final imutável
    assert.strictEqual(await tasks.fail(t._id, "tool_error"), null);
    assert.strictEqual(await tasks.cancel(t._id), null);
    assert.strictEqual((await VideoTask.findById(t._id)).status, "completed");
  });

  test("completed antes do started (tarefa rápida) não descarta o resultado", async () => {
    const video = await makeVideo();
    const t = await tasks.accept(ctx(FREE, video));
    const out = output();
    const done = await tasks.complete(t._id, [out]);
    assert.strictEqual(done.status, "completed");
    assert.ok(done.startedAt);
    assert.strictEqual(await VideoAsset.countDocuments({ source_task_id: t._id }), 1);
    assert.ok(!fake.removed.includes(out.key));
    // o started que chega depois é ignorado
    assert.strictEqual(await tasks.start(t._id), null);
  });

  test("janitor recria os resultados de uma tarefa concluída cuja criação falhou a meio", async () => {
    const video = await makeVideo();
    const t = await tasks.accept(ctx(FREE, video));
    await tasks.start(t._id);
    await tasks.complete(t._id, [output()]);
    // simula a falha depois da transição: resultado por criar e result_outputs ainda guardado
    const { result_outputs } = await VideoTask.findById(t._id).lean();
    await VideoAsset.deleteMany({ source_task_id: t._id });
    await VideoTask.updateOne({ _id: t._id }, { $set: { result_outputs: [output()] } });
    assert.strictEqual(result_outputs.length, 0);
    assert.strictEqual(await tasks.repairResults(), 1);
    assert.strictEqual(await VideoAsset.countDocuments({ source_task_id: t._id }), 1);
    assert.strictEqual(await tasks.repairResults(), 0);
  });

  test("um resultado removido não é recriado pelo janitor nem por um evento repetido (COM-034)", async () => {
    const video = await makeVideo();
    const t = await tasks.accept(ctx(FREE, video));
    await tasks.start(t._id);
    const out = output();
    await tasks.complete(t._id, [out]);
    await VideoAsset.deleteMany({ source_task_id: t._id }); // o utilizador remove o resultado
    assert.strictEqual(await tasks.repairResults(), 0);
    await tasks.complete(t._id, [out]);
    assert.strictEqual(await VideoAsset.countDocuments({ source_task_id: t._id }), 0);
  });

  test("transição perdida: completed depois de cancelada apaga os ficheiros e não cria resultado (D7, COM-029)", async () => {
    const video = await makeVideo();
    const t = await tasks.accept(ctx(FREE, video));
    await tasks.start(t._id);
    await tasks.cancel(t._id);
    assert.strictEqual(await tasks.start(t._id), null);
    const out = output();
    assert.strictEqual(await tasks.complete(t._id, [out]), null);
    assert.ok(fake.removed.includes(out.key));
    assert.strictEqual(await VideoAsset.countDocuments({ source_task_id: t._id }), 0);
    assert.deepStrictEqual(fake.cancels, [String(t._id)]);
  });

  test("cancelamento e falha concorrentes: uma só devolução (COM-022, COM-051)", async () => {
    const video = await makeVideo();
    const t = await tasks.accept(ctx(FREE, video));
    await tasks.start(t._id);
    const [a, b] = await Promise.all([tasks.cancel(t._id), tasks.fail(t._id, "ffmpeg_error")]);
    assert.ok((a === null) !== (b === null), "só uma das transições ganha");
    assert.strictEqual(fake.refunds.length, 1);
    assert.strictEqual((await VideoTask.findById(t._id)).quota_state, "refunded");
    // e repetir não devolve outra vez
    assert.strictEqual(await tasks.refundOnce(t._id), false);
    assert.strictEqual(fake.refunds.length, 1);
  });

  test("saída inválida → failed output_verification_failed, sem resultado (COM-027)", async () => {
    const video = await makeVideo();
    const t = await tasks.accept(ctx(FREE, video));
    await tasks.start(t._id);
    const done = await tasks.complete(t._id, [output({ sizeBytes: 0 })]);
    assert.strictEqual(done.status, "failed");
    assert.strictEqual(done.reason_code, "output_verification_failed");
    assert.strictEqual(await VideoAsset.countDocuments({ source_task_id: t._id }), 0);
    assert.strictEqual(fake.refunds.length, 1);
  });

  test("watchdog: prazo ultrapassado → failed timeout, cancelamento ao worker e devolução (COM-040)", async () => {
    const video = await makeVideo();
    const t = await tasks.accept(ctx(FREE, video));
    await tasks.start(t._id);
    await VideoTask.updateOne({ _id: t._id }, { $set: { deadlineAt: new Date(Date.now() - 1000) } });
    assert.strictEqual(await watchdog.sweep(), 1);
    const after = await VideoTask.findById(t._id);
    assert.strictEqual(after.status, "failed");
    assert.strictEqual(after.reason_code, "timeout");
    assert.deepStrictEqual(fake.cancels, [String(t._id)]);
    assert.strictEqual(fake.refunds.length, 1);
  });

  test("watchdog: tarefa em fila há mais de 24 h → failed queue_timeout, vaga livre e devolução", async () => {
    const video = await makeVideo();
    const recent = await tasks.accept(ctx(PREMIUM, video));
    const old = await tasks.accept(ctx(FREE, video));
    await VideoTask.updateOne({ _id: old._id }, { $set: { queuedAt: new Date(Date.now() - 25 * 3600e3) } });
    assert.strictEqual(await watchdog.sweep(), 1);
    const after = await VideoTask.findById(old._id);
    assert.strictEqual(after.status, "failed");
    assert.strictEqual(after.reason_code, "queue_timeout");
    assert.strictEqual(after.slotKey, undefined);
    assert.strictEqual(fake.refunds.length, 1);
    assert.strictEqual((await VideoTask.findById(recent._id)).status, "queued", "as tarefas recentes ficam em fila");
    assert.strictEqual(await codeOf(tasks.accept(ctx(FREE, video))), "ok", "a vaga do Free ficou livre");
  });

  test("eventos do worker: started, progress, failed com orphanKeys (contracts/worker-messages.md)", async () => {
    const video = await makeVideo();
    const t = await tasks.accept(ctx(FREE, video));
    const id = String(t._id);
    await events.handleEvent({ schemaVersion: 1, type: "started", taskId: id });
    await events.handleEvent({ schemaVersion: 1, type: "progress", taskId: id, progress: 55 });
    assert.strictEqual((await VideoTask.findById(id)).progress, 55);
    await events.handleEvent({
      schemaVersion: 1,
      type: "failed",
      taskId: id,
      ownerId: OWNER,
      reason: { code: "ffmpeg_error", message: "texto do worker" },
      orphanKeys: ["k1"],
    });
    const after = await VideoTask.findById(id);
    assert.strictEqual(after.status, "failed");
    assert.strictEqual(after.reason_message, "Não foi possível processar o vídeo.");
    assert.ok(fake.removed.includes("k1"));
    // evento inválido é ignorado sem erro
    await events.handleEvent({ schemaVersion: 2, type: "started", taskId: id });
  });

  test("remover o vídeo cancela as tarefas ativas com essa origem (COM-017)", async () => {
    const video = await makeVideo();
    const t = await tasks.accept(ctx(PREMIUM, video));
    assert.strictEqual(await tasks.cancelActive({ source_video_id: video._id }, "source_video_removed"), 1);
    const after = await VideoTask.findById(t._id);
    assert.strictEqual(after.status, "cancelled");
    assert.strictEqual(after.reason_code, "source_video_removed");
  });
});
