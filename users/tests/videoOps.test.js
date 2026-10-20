// spec 000 (T017) — quota de vídeo atómica: POST /:user/video-ops/reserve | refund (D8).
// Usa um MongoDB real (TEST_MONGO_URL), como os testes do serviço projects.
// Exemplo: docker run -d --name test-mongo -p 27099:27017 mongo:4.4
//          TEST_MONGO_URL=mongodb://localhost:27099/test npm test
const test = require("node:test");
const assert = require("node:assert");
const mongoose = require("mongoose");
const express = require("express");

const MONGO = process.env.TEST_MONGO_URL;
const skip = MONGO ? false : "defina TEST_MONGO_URL";

process.env.FREE_DAILY_OP = "5";
process.env.FIELD_ENCRYPTION_KEY = process.env.FIELD_ENCRYPTION_KEY || "test-key";

let base;
let server;
let User;
let today;

async function makeUser(type, processedToday) {
  const ops = processedToday === undefined ? [] : [{ day: today(), processed: processedToday }];
  const u = await User.create({
    type,
    email: type === "anonymous" ? undefined : `${new mongoose.Types.ObjectId()}@test.local`,
    operations: ops,
  });
  return String(u._id);
}

async function processedToday(id) {
  const u = await User.findById(id).lean();
  const op = u.operations.find((o) => o.day.getTime() === today().getTime());
  return op ? op.processed : 0;
}

const post = (path, body) =>
  fetch(`${base}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });

test.describe("video-ops", { skip }, () => {
  test.before(async () => {
    await mongoose.connect(MONGO);
    User = require("../models/user");
    ({ today } = require("../controllers/videoOps"));
    await User.deleteMany({});
    const app = express();
    app.use(express.json());
    app.use("/", require("../routes/users"));
    server = app.listen(0);
    base = `http://127.0.0.1:${server.address().port}`;
  });

  test.after(async () => {
    server && server.close();
    await mongoose.disconnect();
  });

  test("Free reserva até 5 e a 6.ª dá 409 (COM-021)", async () => {
    const id = await makeUser("free");
    for (let i = 0; i < 5; i++) {
      const r = await post(`/${id}/video-ops/reserve`);
      assert.strictEqual(r.status, 200);
      const body = await r.json();
      assert.strictEqual(body.reserved, true);
      assert.strictEqual(new Date(body.day).getTime(), today().getTime());
    }
    const r = await post(`/${id}/video-ops/reserve`);
    assert.strictEqual(r.status, 409);
    assert.strictEqual((await r.json()).code, "QUOTA_EXHAUSTED");
    assert.strictEqual(await processedToday(id), 5);
  });

  test("10 reservas concorrentes com 1 restante: só 1 aceite (COM-051)", async () => {
    const id = await makeUser("free", 4);
    const codes = await Promise.all(Array.from({ length: 10 }, () => post(`/${id}/video-ops/reserve`).then((r) => r.status)));
    assert.strictEqual(codes.filter((c) => c === 200).length, 1);
    assert.strictEqual(await processedToday(id), 5);
  });

  test("10 reservas concorrentes no primeiro uso do dia: 5 aceites, uma só entrada", async () => {
    const id = await makeUser("free");
    const codes = await Promise.all(Array.from({ length: 10 }, () => post(`/${id}/video-ops/reserve`).then((r) => r.status)));
    assert.strictEqual(codes.filter((c) => c === 200).length, 5);
    const u = await User.findById(id).lean();
    assert.strictEqual(u.operations.length, 1);
    assert.strictEqual(u.operations[0].processed, 5);
  });

  test("devolução no dia da reserva, mesmo depois da meia-noite (D8)", async () => {
    const id = await makeUser("free", 2);
    const yesterday = new Date(today().getTime() - 24 * 3600e3);
    await User.updateOne({ _id: id }, { $push: { operations: { day: yesterday, processed: 3 } } });
    const r = await post(`/${id}/video-ops/refund`, { day: yesterday.toISOString() });
    assert.strictEqual(r.status, 200);
    const u = await User.findById(id).lean();
    assert.strictEqual(u.operations.find((o) => o.day.getTime() === yesterday.getTime()).processed, 2);
    assert.strictEqual(await processedToday(id), 2);
  });

  test("devolução não desce abaixo de 0", async () => {
    const id = await makeUser("free", 0);
    const r = await post(`/${id}/video-ops/refund`, { day: today().toISOString() });
    assert.strictEqual(r.status, 200);
    assert.strictEqual((await r.json()).refunded, false);
    assert.strictEqual(await processedToday(id), 0);
  });

  test("devolução sem dia válido → 400", async () => {
    const id = await makeUser("free", 1);
    assert.strictEqual((await post(`/${id}/video-ops/refund`, {})).status, 400);
  });

  test("Premium não tem contador", async () => {
    const id = await makeUser("premium");
    const r = await post(`/${id}/video-ops/reserve`);
    assert.strictEqual(r.status, 200);
    assert.deepStrictEqual(await r.json(), { reserved: false, profile: "premium" });
    assert.strictEqual((await User.findById(id).lean()).operations.length, 0);
  });

  test("anónimo → 403", async () => {
    const id = await makeUser("anonymous");
    assert.strictEqual((await post(`/${id}/video-ops/reserve`)).status, 403);
  });

  test("quota partilhada com as ferramentas avançadas de imagem (PUT /:user/process/:n)", async () => {
    const id = await makeUser("free");
    const put = await fetch(`${base}/${id}/process/3`, { method: "PUT" });
    assert.strictEqual(put.status, 204);
    assert.strictEqual((await post(`/${id}/video-ops/reserve`)).status, 200);
    assert.strictEqual((await post(`/${id}/video-ops/reserve`)).status, 200);
    assert.strictEqual((await post(`/${id}/video-ops/reserve`)).status, 409);
    const user = await (await fetch(`${base}/${id}`)).json();
    assert.strictEqual(user.remaining_operations, 0);
  });
});
