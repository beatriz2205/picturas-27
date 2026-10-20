// spec 001 (T010, T013, T016, T020) — submissão de vídeo ponta a ponta no serviço de projetos.
// Usa um MongoDB real (TEST_MONGO_URL) e simula os serviços users e imageStorageService.
// Exemplo: docker run -d --name test-mongo -p 27099:27017 mongo:4.4
//          TEST_MONGO_URL=mongodb://localhost:27099/test npm test
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");
const crypto = require("crypto");

const MONGO = process.env.TEST_MONGO_URL;
const OUT = path.join(__dirname, "fixtures", "out");
const skip = !MONGO ? "defina TEST_MONGO_URL" : !fs.existsSync(path.join(OUT, "ok_720p_30s.mp4")) ? "gere os vídeos de teste" : false;

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "video-upload-"));
const STORE = fs.mkdtempSync(path.join(os.tmpdir(), "video-store-"));
process.env.VIDEO_UPLOAD_TMP_DIR = TMP;

const FREE = "6710aaaaaaaaaaaaaaaaaaaa";
const PREMIUM = "6710bbbbbbbbbbbbbbbbbbbb";
const ANON = "6710cccccccccccccccccccc";
const OTHER = "6710dddddddddddddddddddd";
const types = { [FREE]: "free", [PREMIUM]: "premium", [ANON]: "anonymous", [OTHER]: "free" };

let usersCalls = [];
let onStore = null; // gancho para simular a remoção do projeto durante o envio

// Simula o serviço users (GET /:user/type/) e regista as chamadas (SUBMIT-010: a quota não é tocada)
const usersStub = http.createServer((req, res) => {
  usersCalls.push(`${req.method} ${req.url}`);
  const m = req.url.match(/^\/([0-9a-f]{24})\/type\/$/);
  res.setHeader("Content-Type", "application/json");
  if (req.method === "GET" && m) return res.end(JSON.stringify({ type: types[m[1]] }));
  res.statusCode = 404;
  res.end("{}");
});

// Simula o imageStorageService (rotas usadas por video/storage.js)
const storageStub = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  let m;
  if (req.method === "GET" && url.pathname === "/health") return res.end("{}");
  if (req.method === "POST" && (m = url.pathname.match(/^\/video\/([^/]+)\/([^/]+)\/([^/]+)$/))) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = Buffer.concat(chunks);
    // extrair o ficheiro do multipart (um só campo)
    const boundary = "--" + req.headers["content-type"].split("boundary=")[1];
    const start = body.indexOf("\r\n\r\n") + 4;
    const end = body.lastIndexOf("\r\n" + boundary);
    const key = `${m[2]}/${m[3]}/${crypto.randomUUID()}.mp4`;
    fs.mkdirSync(path.join(STORE, m[1], m[2], m[3]), { recursive: true });
    fs.writeFileSync(path.join(STORE, m[1], key), body.subarray(start, end));
    if (onStore) await onStore();
    res.statusCode = 201;
    return res.end(JSON.stringify({ key }));
  }
  if (req.method === "DELETE" && (m = url.pathname.match(/^\/delete\/([^/]+)\/(.+)$/))) {
    fs.rmSync(path.join(STORE, m[1], decodeURIComponent(m[2])), { force: true });
    return res.end("{}");
  }
  if (req.method === "GET" && (m = url.pathname.match(/^\/image\/public\/(.+)$/))) {
    return res.end(JSON.stringify({ url: `https://localhost:8080/s3/${m[1]}?exp=${url.searchParams.get("expires")}` }));
  }
  res.statusCode = 404;
  res.end("{}");
});

let base, app, server, mongoose, Project, VideoAsset;

function listen(srv) {
  return new Promise((r) => srv.listen(0, "127.0.0.1", () => r(srv.address().port)));
}

test.before(async () => {
  if (skip) return;
  process.env.USERS_URL = `http://127.0.0.1:${await listen(usersStub)}/`;
  process.env.IMG_STORAGE_URL = `http://127.0.0.1:${await listen(storageStub)}`;

  mongoose = require("mongoose");
  await mongoose.connect(MONGO);
  Project = require("../controllers/project");
  VideoAsset = require("../models/videoAsset");
  await VideoAsset.syncIndexes();

  const express = require("express");
  const { router } = require("../routes/videos");
  app = express();
  app.use(express.json());
  app.use("/", router);
  server = http.createServer(app);
  base = `http://127.0.0.1:${await listen(server)}`;
});

test.after(async () => {
  if (skip) return;
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  server.close();
  usersStub.close();
  storageStub.close();
});

test.beforeEach(async () => {
  if (skip) return;
  usersCalls = [];
  onStore = null;
  await mongoose.connection.db.collection("projects").deleteMany({});
  await VideoAsset.deleteMany({});
});

async function newProject(owner = FREE, extra = {}) {
  return Project.create({ name: "p", user_id: owner, mediaType: "videos", imgs: [], tools: [], ...extra });
}

// Envio multipart em stream, como o gateway faz (fetch não envia ficheiros grandes sem buffering)
function upload(urlPath, { file, caller, uploadId = crypto.randomUUID(), fields = {}, headers = {}, abortAfterBytes }) {
  return new Promise((resolve, reject) => {
    const boundary = "----test" + crypto.randomBytes(8).toString("hex");
    const filePath = path.join(OUT, file);
    const size = fs.statSync(filePath).size;
    const head = Buffer.concat([
      ...Object.entries(fields).map(([k, v]) => Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`)),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="video"; filename="${file}"\r\nContent-Type: video/mp4\r\n\r\n`),
    ]);
    const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
    const req = http.request(base + urlPath, {
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": head.length + size + tail.length,
        "X-Caller-Id": caller,
        Authorization: "Bearer test",
        "X-Upload-Id": uploadId,
        "X-Video-Size": String(size),
        ...headers,
      },
    });
    let answered = false;
    req.on("response", async (res) => {
      answered = true;
      let data = "";
      for await (const c of res) data += c;
      resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null });
    });
    // Uma rejeição antecipada fecha a ligação a meio do envio (EPIPE/ECONNRESET): esperar pela resposta
    req.on("error", (e) => {
      if (abortAfterBytes) return resolve({ status: "aborted" });
      setTimeout(() => (answered ? null : reject(e)), 500);
    });
    req.write(head);
    const stream = fs.createReadStream(filePath, abortAfterBytes ? { end: abortAfterBytes } : {});
    stream.on("data", (c) => {
      if (answered || req.destroyed) return stream.destroy();
      req.write(c);
    });
    stream.on("end", () => {
      if (abortAfterBytes) {
        setTimeout(() => {
          req.destroy();
          resolve({ status: "aborted" });
        }, 200);
      } else req.end(tail);
    });
  });
}

const tmpFiles = () => fs.readdirSync(TMP);
const sha = (f) => crypto.createHash("sha256").update(fs.readFileSync(path.join(OUT, f))).digest("hex");

test("US1: submeter um vídeo válido cria a entrada e guarda o ficheiro (SUBMIT-001, 006)", { skip }, async () => {
  const p = await newProject();
  const r = await upload(`/${FREE}/${p._id}/videos`, { file: "ok_720p_30s.mp4", caller: FREE });
  assert.strictEqual(r.status, 201, JSON.stringify(r.body));
  assert.strictEqual(r.body.name, "ok_720p_30s.mp4");
  assert.strictEqual(r.body.durationS, 30);
  assert.strictEqual(r.body.width, 1280);
  assert.strictEqual(r.body.audioCodec, "aac");
  assert.strictEqual(r.body.acceptedAsInput, true);
  assert.strictEqual((await Project.getOne(FREE, p._id)).mediaType, "videos");
  const asset = await VideoAsset.findById(r.body.id);
  assert.strictEqual(asset.sha256, sha("ok_720p_30s.mp4"));
  assert.ok(fs.existsSync(path.join(STORE, FREE, asset.storage_key)));
  assert.deepStrictEqual(tmpFiles(), [], "o ficheiro temporário é apagado");
});

test("US1: um segundo vídeo é uma nova entrada; nome repetido recebe sufixo (SUBMIT-007)", { skip }, async () => {
  const p = await newProject();
  await upload(`/${FREE}/${p._id}/videos`, { file: "noaudio.mp4", caller: FREE });
  const r = await upload(`/${FREE}/${p._id}/videos`, { file: "noaudio.mp4", caller: FREE });
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.body.name, "noaudio (1).mp4");
  assert.strictEqual(r.body.audioCodec, null);
  assert.strictEqual(await VideoAsset.countDocuments({ project_id: p._id }), 2);
});

test("US1: não permite vídeos num projeto de imagens", { skip }, async () => {
  const typedProject = await newProject(FREE, { mediaType: "images" });
  const typedResult = await upload(`/${FREE}/${typedProject._id}/videos`, {
    file: "noaudio.mp4",
    caller: FREE,
  });
  assert.strictEqual(typedResult.status, 409, JSON.stringify(typedResult.body));

  const legacyProject = await newProject(FREE, {
    mediaType: undefined,
    imgs: [{ og_uri: "src/a.jpg", new_uri: "out/a.jpg", og_img_key: "a", og_sha256: "hash" }],
  });
  const legacyResult = await upload(`/${FREE}/${legacyProject._id}/videos`, {
    file: "noaudio.mp4",
    caller: FREE,
  });
  assert.strictEqual(legacyResult.status, 409, JSON.stringify(legacyResult.body));
  assert.strictEqual(await VideoAsset.countDocuments(), 0);
});

test("US1: a submissão não toca na quota de operações (SUBMIT-010)", { skip }, async () => {
  const p = await newProject();
  await upload(`/${FREE}/${p._id}/videos`, { file: "noaudio.mp4", caller: FREE });
  assert.ok(usersCalls.length > 0 && usersCalls.every((c) => /^GET \/[0-9a-f]{24}\/type\/$/.test(c)), usersCalls.join(","));
});

test("US2: tamanho declarado acima do limite é recusado sem receber o ficheiro (SUBMIT-003)", { skip }, async () => {
  const p = await newProject();
  const r = await upload(`/${FREE}/${p._id}/videos`, { file: "ok_720p_30s.mp4", caller: FREE, headers: { "X-Video-Size": String(150 * 1024 * 1024) } });
  assert.strictEqual(r.status, 413);
  assert.strictEqual(r.body.code, "VIDEO_TOO_LARGE");
  assert.strictEqual(r.body.upgrade, true);
  assert.deepStrictEqual(tmpFiles(), []);
  assert.strictEqual(await VideoAsset.countDocuments(), 0);
});

test("US2: formatos e limites inválidos são recusados sem entrada (COM-003 a 007)", { skip }, async () => {
  const p = await newProject();
  const cases = [
    ["hevc.mp4", FREE, 415, "UNSUPPORTED_FORMAT"],
    ["fake_webm.mp4", FREE, 415, "UNSUPPORTED_FORMAT"],
    ["long_61s.mp4", FREE, 422, "VIDEO_TOO_LONG"],
    ["uhd_4k.mp4", FREE, 422, "RESOLUTION_TOO_HIGH"],
    ["truncated.mp4", FREE, 422, "CORRUPTED_FILE"],
    ["random.mp4", FREE, 422, "CORRUPTED_FILE"],
  ];
  for (const [file, caller, status, code] of cases) {
    const r = await upload(`/${FREE}/${p._id}/videos`, { file, caller });
    assert.strictEqual(r.status, status, file);
    assert.strictEqual(r.body.code, code, file);
  }
  assert.strictEqual(await VideoAsset.countDocuments(), 0);
  assert.deepStrictEqual(tmpFiles(), []);
  // o mesmo 4K é aceite no Premium
  const pp = await newProject(PREMIUM);
  assert.strictEqual((await upload(`/${PREMIUM}/${pp._id}/videos`, { file: "uhd_4k.mp4", caller: PREMIUM })).status, 201);
});

test("US2: anónimo e convidado com link 'ver' não submetem (COM-001)", { skip }, async () => {
  const p = await newProject(FREE, { sharedLinks: [{ id: "ver-123", permission: "read" }, { id: "edit-123", permission: "edit" }] });
  const anon = await upload(`/${FREE}/${p._id}/videos`, { file: "noaudio.mp4", caller: ANON });
  assert.strictEqual(anon.status, 401);
  const read = await upload(`/${FREE}/${p._id}/videos?share=ver-123`, { file: "noaudio.mp4", caller: OTHER });
  assert.strictEqual(read.status, 403);
  // convidado com link "editar" submete com o seu próprio perfil (COM-025)
  const edit = await upload(`/${FREE}/${p._id}/videos?share=edit-123`, { file: "noaudio.mp4", caller: OTHER });
  assert.strictEqual(edit.status, 201);
  assert.strictEqual(String((await VideoAsset.findById(edit.body.id)).created_by), OTHER);
});

test("US3: repetir com o mesmo X-Upload-Id não duplica (SUBMIT-008, 009)", { skip }, async () => {
  const p = await newProject();
  const uploadId = crypto.randomUUID();
  const a = await upload(`/${FREE}/${p._id}/videos`, { file: "noaudio.mp4", caller: FREE, uploadId });
  const b = await upload(`/${FREE}/${p._id}/videos`, { file: "noaudio.mp4", caller: FREE, uploadId });
  assert.strictEqual(a.status, 201);
  assert.strictEqual(b.status, 200);
  assert.strictEqual(b.body.id, a.body.id);

  const id2 = crypto.randomUUID();
  const [c, d] = await Promise.all([
    upload(`/${FREE}/${p._id}/videos`, { file: "noaudio.mp4", caller: FREE, uploadId: id2 }),
    upload(`/${FREE}/${p._id}/videos`, { file: "noaudio.mp4", caller: FREE, uploadId: id2 }),
  ]);
  assert.deepStrictEqual([c.status, d.status].sort(), [200, 201]);
  assert.strictEqual(await VideoAsset.countDocuments({ project_id: p._id }), 2);
  const stored = fs.readdirSync(path.join(STORE, FREE, String(p._id), "video_src"));
  assert.strictEqual(stored.length, 2, "o objeto da repetição perdedora é apagado");
});

test("US3: envio interrompido não deixa entrada nem ficheiro parcial (SUBMIT-005, 006)", { skip }, async () => {
  const p = await newProject();
  const r = await upload(`/${FREE}/${p._id}/videos`, { file: "ok_720p_30s.mp4", caller: FREE, abortAfterBytes: 2 * 1024 * 1024 });
  assert.strictEqual(r.status, "aborted");
  await new Promise((res) => setTimeout(res, 500));
  assert.strictEqual(await VideoAsset.countDocuments(), 0);
  assert.deepStrictEqual(tmpFiles(), []);
});

test("US3: projeto removido durante o envio devolve 410 e apaga o objeto (UC-VID-001/E5)", { skip }, async () => {
  const p = await newProject();
  onStore = () => mongoose.connection.db.collection("projects").deleteMany({ _id: p._id });
  const r = await upload(`/${FREE}/${p._id}/videos`, { file: "noaudio.mp4", caller: FREE });
  assert.strictEqual(r.status, 410);
  assert.strictEqual(await VideoAsset.countDocuments(), 0);
  const dir = path.join(STORE, FREE, String(p._id), "video_src");
  assert.deepStrictEqual(fs.existsSync(dir) ? fs.readdirSync(dir) : [], []);
});

test("US4: criar projeto a partir de um vídeo; vídeo recusado não cria projeto (SUBMIT-002)", { skip }, async () => {
  const before = await mongoose.connection.db.collection("projects").countDocuments();
  const bad = await upload(`/${FREE}/video-project`, { file: "hevc.mp4", caller: FREE, fields: { name: "Novo" } });
  assert.strictEqual(bad.status, 415);
  assert.strictEqual(await mongoose.connection.db.collection("projects").countDocuments(), before);

  const ok = await upload(`/${FREE}/video-project`, { file: "noaudio.mp4", caller: FREE, fields: { name: "Novo" } });
  assert.strictEqual(ok.status, 201, JSON.stringify(ok.body));
  assert.strictEqual(ok.body.project.name, "Novo");
  assert.strictEqual(ok.body.project.mediaType, "videos");
  assert.strictEqual(ok.body.video.name, "noaudio.mp4");
  assert.strictEqual(await mongoose.connection.db.collection("projects").countDocuments(), before + 1);
});

test("listar, obter URL temporário e remover (COM-002, COM-030, COM-034, COM-050)", { skip }, async () => {
  const p = await newProject();
  const r = await upload(`/${FREE}/${p._id}/videos`, { file: "noaudio.mp4", caller: FREE });
  const h = { "X-Caller-Id": FREE, Authorization: "Bearer test" };

  const list = await (await fetch(`${base}/${FREE}/${p._id}/videos`, { headers: h })).json();
  assert.strictEqual(list.length, 1);

  const u = await (await fetch(`${base}/${FREE}/${p._id}/videos/${r.body.id}/url?download=1`, { headers: h })).json();
  assert.match(u.url, /exp=900/);

  const asset = await VideoAsset.findById(r.body.id);
  const del = await fetch(`${base}/${FREE}/${p._id}/videos/${r.body.id}`, { method: "DELETE", headers: h });
  assert.strictEqual(del.status, 204);
  assert.strictEqual(await VideoAsset.countDocuments(), 0);
  assert.ok(!fs.existsSync(path.join(STORE, FREE, asset.storage_key)));

  const limits = await (await fetch(`${base}/${FREE}/video-limits`, { headers: h })).json();
  assert.strictEqual(limits.limits.maxBytes, 100 * 1024 * 1024);
});

test("vários vídeos sem upload_id no mesmo projeto não colidem no índice único (resultados de tarefas)", { skip }, async () => {
  const p = await newProject();
  const base = {
    project_id: p._id, owner_id: FREE, created_by: FREE, kind: "video", origin: "task",
    size_bytes: 1, sha256: "x", container: "mp4",
  };
  await VideoAsset.create({ ...base, name: "a.mp4", storage_key: `${p._id}/video_out/a.mp4` });
  await VideoAsset.create({ ...base, name: "b.mp4", storage_key: `${p._id}/video_out/b.mp4` });
  assert.strictEqual(await VideoAsset.countDocuments({ project_id: p._id }), 2);
});
