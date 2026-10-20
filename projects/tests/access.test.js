// spec 000 (T035) — acesso às tarefas de vídeo por perfil e por partilha (REQ-VID-COM-001, COM-008, COM-025).
// Usa um MongoDB real (TEST_MONGO_URL) e simula o serviço users; fila, quota e armazenamento são simulados
// no taskService.
// Exemplo: docker run -d --name test-mongo -p 27099:27017 mongo:4.4
//          TEST_MONGO_URL=mongodb://localhost:27099/test npm test
const test = require("node:test");
const assert = require("node:assert");
const http = require("http");

const MONGO = process.env.TEST_MONGO_URL;
const skip = MONGO ? false : "defina TEST_MONGO_URL";

const PREMIUM = "6730aaaaaaaaaaaaaaaaaaaa";
const FREE = "6730bbbbbbbbbbbbbbbbbbbb";
const ANON = "6730cccccccccccccccccccc";
const types = { [PREMIUM]: "premium", [FREE]: "free", [ANON]: "anonymous" };

// Simula GET /:user/type/ do serviço users; o tipo pode mudar a meio (downgrade)
const usersStub = http.createServer((req, res) => {
  const m = req.url.match(/^\/([0-9a-f]{24})\/type\/$/);
  res.setHeader("Content-Type", "application/json");
  if (m) return res.end(JSON.stringify({ type: types[m[1]] }));
  res.statusCode = 404;
  res.end("{}");
});

let base, server, mongoose, Project, VideoAsset, VideoTask, tasks;
let reserves;

function listen(srv) {
  return new Promise((r) => srv.listen(0, "127.0.0.1", () => r(srv.address().port)));
}

async function call(method, path, caller, body) {
  const headers = { "Content-Type": "application/json", Authorization: "Bearer x" };
  if (caller) headers["X-Caller-Id"] = caller;
  const r = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => null) };
}

async function makeVideo(projectId, owner, durationS = 30) {
  return VideoAsset.create({
    project_id: projectId,
    owner_id: owner,
    created_by: owner,
    kind: "video",
    origin: "upload",
    name: "clip.mp4",
    storage_key: `${projectId}/video_src/clip.mp4`,
    size_bytes: 1000,
    sha256: "abc",
    container: "mp4",
    video_codec: "h264",
    audio_codec: "aac",
    duration_s: durationS,
    width: 1280,
    height: 720,
    fps: 30,
  });
}

test.describe("acesso às tarefas de vídeo", { skip }, () => {
  test.before(async () => {
    process.env.USERS_URL = `http://127.0.0.1:${await listen(usersStub)}/`;
    mongoose = require("mongoose");
    await mongoose.connect(MONGO);
    Project = require("../controllers/project");
    VideoAsset = require("../models/videoAsset");
    VideoTask = require("../models/videoTask");
    tasks = require("../video/taskService");
    await VideoTask.syncIndexes();

    tasks._setDeps({
      broker: { isConnected: () => true, publishTask: async () => {}, publishWs: async () => {}, publishCancel: async () => {} },
      quota: {
        reserve: async (userId) => {
          reserves.push(userId);
          return types[userId] === "premium" ? { state: "none", day: null } : { state: "reserved", day: new Date() };
        },
        refund: async () => {},
      },
      storage: { health: async () => true, internalUrl: async () => "http://x", remove: async () => {} },
    });

    const express = require("express");
    const { router } = require("../routes/videos");
    const app = express();
    app.use(express.json());
    app.use("/", router);
    server = http.createServer(app);
    base = `http://127.0.0.1:${await listen(server)}`;
  });

  test.after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    server.close();
    usersStub.close();
  });

  test.beforeEach(async () => {
    reserves = [];
    types[PREMIUM] = "premium";
    await mongoose.connection.db.collection("projects").deleteMany({});
    await VideoAsset.deleteMany({});
    await VideoTask.deleteMany({});
  });

  test("anónimo ou sem sessão → 401 e nenhuma tarefa (COM-001)", async () => {
    const p = await Project.create({ name: "p", user_id: ANON, imgs: [], tools: [] });
    const v = await makeVideo(p._id, ANON);
    const anon = await call("POST", `/${ANON}/${p._id}/video-tasks`, ANON, { tool: "noop", videoId: String(v._id) });
    assert.strictEqual(anon.status, 401);
    assert.strictEqual(anon.body.code, "AUTH_REQUIRED");
    const none = await call("POST", `/${ANON}/${p._id}/video-tasks`, null, { tool: "noop", videoId: String(v._id) });
    assert.strictEqual(none.status, 401);
    assert.strictEqual(await VideoTask.countDocuments({}), 0);
  });

  test("convidado com link só de leitura: vê as tarefas, mas não as inicia nem cancela (COM-001)", async () => {
    const p = await Project.create({ name: "p", user_id: PREMIUM, imgs: [], tools: [], sharedLinks: [{ id: "ler", permission: "read" }] });
    const v = await makeVideo(p._id, PREMIUM);
    const own = await call("POST", `/${PREMIUM}/${p._id}/video-tasks`, PREMIUM, { tool: "noop", videoId: String(v._id) });
    assert.strictEqual(own.status, 202);

    const start = await call("POST", `/${PREMIUM}/${p._id}/video-tasks?share=ler`, FREE, { tool: "noop", videoId: String(v._id) });
    assert.strictEqual(start.status, 403);
    const cancel = await call("POST", `/${PREMIUM}/${p._id}/video-tasks/${own.body.id}/cancel?share=ler`, FREE);
    assert.strictEqual(cancel.status, 403);
    const list = await call("GET", `/${PREMIUM}/${p._id}/video-tasks?share=ler`, FREE);
    assert.strictEqual(list.status, 200);
    assert.strictEqual(list.body.length, 1);
  });

  test("convidado Free com edição num projeto Premium: aplicam-se os limites e a quota do convidado (COM-025)", async () => {
    const p = await Project.create({ name: "p", user_id: PREMIUM, imgs: [], tools: [], sharedLinks: [{ id: "editar", permission: "edit" }] });
    const longo = await makeVideo(p._id, PREMIUM, 120);
    const curto = await makeVideo(p._id, PREMIUM, 30);

    const r1 = await call("POST", `/${PREMIUM}/${p._id}/video-tasks?share=editar`, FREE, { tool: "noop", videoId: String(longo._id) });
    assert.strictEqual(r1.status, 422);
    assert.strictEqual(r1.body.code, "VIDEO_TOO_LONG");
    assert.strictEqual(r1.body.upgrade, true);

    const r2 = await call("POST", `/${PREMIUM}/${p._id}/video-tasks?share=editar`, FREE, { tool: "noop", videoId: String(curto._id) });
    assert.strictEqual(r2.status, 202);
    assert.strictEqual(r2.body.startedBy, FREE);
    assert.deepStrictEqual(reserves, [FREE], "a operação é gasta pelo convidado, não pelo dono");
    const t = await VideoTask.findById(r2.body.id);
    assert.strictEqual(t.profile, "free");
    assert.strictEqual(t.priority, 1);
    assert.strictEqual(String(t.owner_id), PREMIUM);
  });

  test("downgrade Premium → Free: o vídeo de 120 s deixa de ser aceite (COM-008)", async () => {
    const p = await Project.create({ name: "p", user_id: PREMIUM, imgs: [], tools: [] });
    const v = await makeVideo(p._id, PREMIUM, 120);
    const before = await call("POST", `/${PREMIUM}/${p._id}/video-tasks`, PREMIUM, { tool: "noop", videoId: String(v._id) });
    assert.strictEqual(before.status, 202);
    await call("POST", `/${PREMIUM}/${p._id}/video-tasks/${before.body.id}/cancel`, PREMIUM);

    types[PREMIUM] = "free";
    const after = await call("POST", `/${PREMIUM}/${p._id}/video-tasks`, PREMIUM, { tool: "noop", videoId: String(v._id) });
    assert.strictEqual(after.status, 422);
    assert.strictEqual(after.body.code, "VIDEO_TOO_LONG");
  });

  test("vídeo de outro projeto → 404, sem revelar que existe", async () => {
    const p1 = await Project.create({ name: "a", user_id: PREMIUM, imgs: [], tools: [] });
    const p2 = await Project.create({ name: "b", user_id: PREMIUM, imgs: [], tools: [] });
    const v = await makeVideo(p2._id, PREMIUM);
    const r = await call("POST", `/${PREMIUM}/${p1._id}/video-tasks`, PREMIUM, { tool: "noop", videoId: String(v._id) });
    assert.strictEqual(r.status, 404);
  });
});
