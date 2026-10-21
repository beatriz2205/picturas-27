// UC-VID-006 — validação do pedido de alteração de velocidade (REQ-VID-SPD-001, SPD-005, COM-047).
const test = require("node:test");
const assert = require("node:assert");
const { VIDEO_TOOLS } = require("../config/video");
const { TASK_QUEUES } = require("../video/broker");

const speed = VIDEO_TOOLS.speed;
const VIDEO = { duration_s: 60, fps: 30, width: 1920, height: 1080 };

function run(params) {
  try {
    return { status: 200, params: speed.validate(params, VIDEO, "free").params };
  } catch (e) {
    return { status: e.http, code: e.code, fields: e.extra.fields };
  }
}

test("speed: registado com fila própria, dedup e fila criada pelo broker sem alterar o broker", () => {
  assert.strictEqual(speed.queue, "video_speed_queue");
  assert.strictEqual(speed.dedup, true);
  assert.ok(TASK_QUEUES.includes("video_speed_queue"));
});

test("speed: fatores aceites e duração esperada (SPD-001)", () => {
  assert.deepStrictEqual(run({ factor: 2 }).params, { factor: 2, expectedDurationS: 30 });
  assert.deepStrictEqual(run({ factor: 0.5 }).params, { factor: 0.5, expectedDurationS: 120 });
  assert.strictEqual(run({ factor: 0.75 }).params.expectedDurationS, 80);
});

test("speed: fator ausente, 1×, fora da lista ou não numérico → 400 fields.factor (SPD-005)", () => {
  for (const p of [{}, { factor: 1 }, { factor: 3 }, { factor: 0.25 }, { factor: "2" }]) {
    const r = run(p);
    assert.strictEqual(r.status, 400, JSON.stringify(p));
    assert.strictEqual(r.code, "INVALID_PARAMS");
    assert.ok(r.fields.factor);
  }
});
