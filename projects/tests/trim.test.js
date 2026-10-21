// spec 002, T005 e T017 — validação do recorte e pedidos duplicados
// (REQ-VID-TRIM-003 a 005, TRIM-008, TRIM-010, CONV-004).
// Os testes de aceitação usam um MongoDB real (TEST_MONGO_URL), como taskService.test.js.
const test = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const { VIDEO_TOOLS } = require("../config/video");

const trim = VIDEO_TOOLS.trim;

// Vídeo de 60 s, 1080p, 30 fps (metadados como no videoAsset)
const VIDEO = { duration_s: 60, fps: 30, width: 1920, height: 1080 };

function run(params, video = VIDEO, profile = "free") {
  try {
    return { status: 200, params: trim.validate(params, video, profile).params };
  } catch (e) {
    return { status: e.http, code: e.code, fields: e.extra.fields };
  }
}

test("trim: registado com a fila própria e dedup", () => {
  assert.strictEqual(trim.queue, "video_trim_queue");
  assert.strictEqual(trim.dedup, true);
});

test("trim: 10–40 s aceite, altura original por omissão", () => {
  const r = run({ startS: 10, endS: 40 });
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(r.params, { startS: 10, endS: 40, height: 1080 });
});

test("trim: início ≥ fim → 400 fields.startS (TRIM-003)", () => {
  for (const p of [{ startS: 40, endS: 10 }, { startS: 20, endS: 20 }]) {
    const r = run(p);
    assert.strictEqual(r.status, 400);
    assert.strictEqual(r.code, "INVALID_PARAMS");
    assert.strictEqual(r.fields.startS, "O início tem de ser anterior ao fim");
  }
});

test("trim: fim > duração → 400 fields.endS (TRIM-003)", () => {
  const r = run({ startS: 10, endS: 61 });
  assert.strictEqual(r.status, 400);
  assert.strictEqual(r.fields.endS, "O fim excede a duração do vídeo");
});

test("trim: excerto de 0,9 s → 400; 1 s aceite (TRIM-003)", () => {
  const r = run({ startS: 10, endS: 10.9 });
  assert.strictEqual(r.status, 400);
  assert.strictEqual(r.fields.endS, "O excerto tem de ter pelo menos 1 s");
  assert.strictEqual(run({ startS: 10, endS: 11 }).status, 200);
});

test("trim: tempos negativos ou não numéricos → 400", () => {
  assert.ok(run({ startS: -1, endS: 10 }).fields.startS);
  assert.ok(run({ startS: "5", endS: 10 }).fields.startS);
  assert.ok(run({ startS: 0, endS: "x" }).fields.endS);
});

test("trim: sem fim → endS = duração (TRIM-004)", () => {
  assert.strictEqual(run({ startS: 10 }).params.endS, 60);
  assert.strictEqual(run({ startS: 10, endS: null }).params.endS, 60);
});

test("trim: fim omitido numa duração que não é múltipla do fotograma não excede a duração", () => {
  const r = run({ startS: 0 }, { ...VIDEO, duration_s: 10.02 });
  assert.strictEqual(r.status, 200);
  assert.ok(r.params.endS <= 10.02);
});

test("trim: 1,01 s a 30 fps → 1,0 (TRIM-005)", () => {
  const r = run({ startS: 1.01, endS: 3.01 });
  assert.strictEqual(r.params.startS, 1);
  assert.strictEqual(r.params.endS, 3);
  // e 1,02 s → fotograma 31
  assert.strictEqual(run({ startS: 1.02, endS: 3 }).params.startS, Math.round((31 / 30) * 1e6) / 1e6);
});

test("trim: height acima da original ou do perfil → 400 (COM-010)", () => {
  // 720p de origem: 1080 está acima da original
  assert.ok(run({ startS: 0, endS: 5, height: 1080 }, { ...VIDEO, width: 1280, height: 720 }).fields.height);
  // 4K: 2160 permitido em Premium; em Free o perfil limita a 1080
  assert.strictEqual(run({ startS: 0, endS: 5, height: 2160 }, { ...VIDEO, width: 3840, height: 2160 }, "premium").status, 200);
  assert.ok(run({ startS: 0, endS: 5, height: 2160 }, { ...VIDEO, width: 3840, height: 2160 }, "free").fields.height);
  // alturas fora da lista
  assert.ok(run({ startS: 0, endS: 5, height: 700 }).fields.height);
  assert.strictEqual(run({ startS: 0, endS: 5, height: 720 }).params.height, 720);
});

test("trim: vídeo vertical usa o lado menor (COM-010)", () => {
  const r = run({ startS: 0, endS: 5 }, { ...VIDEO, width: 1080, height: 1920 });
  assert.strictEqual(r.params.height, 1080);
});

test("trim: 10,01 s e 10,00 s são o mesmo pedido a 30 fps (research T4)", () => {
  const { dedupKeyFor } = require("../video/taskService");
  const a = run({ startS: 10.01, endS: 40 }).params;
  const b = run({ startS: 10, endS: 40 }).params;
  assert.strictEqual(dedupKeyFor("u", "v", "trim", a), dedupKeyFor("u", "v", "trim", b));
  const c = run({ startS: 10.1, endS: 40 }).params;
  assert.notStrictEqual(dedupKeyFor("u", "v", "trim", a), dedupKeyFor("u", "v", "trim", c));
});

// ---------------------------------------------------------------- aceitação (MongoDB)

const MONGO = process.env.TEST_MONGO_URL;
const skip = MONGO ? false : "defina TEST_MONGO_URL";

const OWNER = "6720aaaaaaaaaaaaaaaaaaaa";
const PROJECT = "6720bbbbbbbbbbbbbbbbbbbb";
const FREE = "6720cccccccccccccccccccc";

test.describe("trim: aceitação", { skip }, () => {
  let VideoTask;
  let VideoAsset;
  let tasks;
  let fake;

  async function makeVideo(extra = {}) {
    return VideoAsset.create({
      project_id: PROJECT,
      owner_id: OWNER,
      created_by: OWNER,
      kind: "video",
      origin: "upload",
      name: "clip.mp4",
      storage_key: `${PROJECT}/video_src/${new mongoose.Types.ObjectId()}.mp4`,
      size_bytes: 1000,
      sha256: "abc",
      container: "mp4",
      video_codec: "h264",
      audio_codec: "aac",
      duration_s: 60,
      width: 1920,
      height: 1080,
      fps: 30,
      ...extra,
    });
  }

  const accept = (video, params) =>
    tasks.accept({
      callerId: FREE,
      profile: "free",
      ownerId: OWNER,
      projectId: PROJECT,
      body: { tool: "trim", videoId: String(video._id), params },
    });

  async function errorOf(promise) {
    try {
      await promise;
      return null;
    } catch (err) {
      return err;
    }
  }

  test.before(async () => {
    await mongoose.connect(MONGO);
    VideoTask = require("../models/videoTask");
    VideoAsset = require("../models/videoAsset");
    tasks = require("../video/taskService");
    await VideoTask.syncIndexes();
    await VideoAsset.syncIndexes();
  });

  test.beforeEach(async () => {
    await VideoTask.deleteMany({});
    await VideoAsset.deleteMany({});
    fake = { reserves: 0, published: [] };
    tasks._setDeps({
      broker: {
        isConnected: () => true,
        publishTask: async (queue, msg) => fake.published.push({ queue, msg }),
        publishWs: async () => {},
        publishCancel: async () => {},
      },
      quota: {
        reserve: async () => {
          fake.reserves++;
          return { state: "reserved", day: new Date("2026-10-21T00:00:00Z") };
        },
        refund: async () => {},
      },
      storage: { health: async () => true, internalUrl: async (o, k) => `http://seaweedfs/${o}/${k}`, remove: async () => {} },
    });
  });

  test.after(async () => {
    await mongoose.disconnect();
  });

  test("pedido aceite vai para video_trim_queue com params normalizados e input.fps/hasAudio", async () => {
    const video = await makeVideo();
    const task = await accept(video, { startS: 10.01, height: 720 });
    assert.strictEqual(task.status, "queued");
    assert.strictEqual(fake.published[0].queue, "video_trim_queue");
    const msg = fake.published[0].msg;
    assert.deepStrictEqual(msg.params, { startS: 10, endS: 60, height: 720 });
    assert.strictEqual(msg.input.fps, 30);
    assert.strictEqual(msg.input.hasAudio, true);
  });

  test("pedido idêntico ativo → 409 DUPLICATE_TASK com a tarefa, sem reservar (TRIM-008)", async () => {
    const video = await makeVideo();
    const first = await accept(video, { startS: 10, endS: 40 });
    assert.strictEqual(fake.reserves, 1);
    // o nome de saída não conta e 10,01 s é o mesmo fotograma
    const err = await errorOf(accept(video, { startS: 10.01, endS: 40 }));
    assert.strictEqual(err.code, "DUPLICATE_TASK");
    assert.strictEqual(err.http, 409);
    assert.strictEqual(err.extra.task.id, String(first._id));
    assert.strictEqual(fake.reserves, 1);
  });

  test("origem resultado de um recorte → aceite (TRIM-010)", async () => {
    const source = await makeVideo();
    const result = await makeVideo({ origin: "task", name: "clip (recorte).mp4", duration_s: 30, source_video_id: source._id });
    const task = await accept(result, { startS: 5, endS: 15 });
    assert.strictEqual(task.status, "queued");
  });

  test("origem WebM → 415 UNSUPPORTED_FORMAT (CONV-004)", async () => {
    const webm = await makeVideo({ origin: "task", container: "webm", video_codec: "vp9", audio_codec: "opus" });
    const err = await errorOf(accept(webm, { startS: 0, endS: 5 }));
    assert.strictEqual(err.code, "UNSUPPORTED_FORMAT");
    assert.strictEqual(err.http, 415);
    assert.strictEqual(fake.reserves, 0);
  });
});
