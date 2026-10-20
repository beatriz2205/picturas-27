// spec 004, T006 — validação dos filtros e opções (REQ-VID-FLT-001, FLT-003; research F5)
const test = require("node:test");
const assert = require("node:assert");
const { VIDEO_TOOLS } = require("../config/video");
const { dedupKeyFor } = require("../video/taskService");

const filter = VIDEO_TOOLS.filter;

// Devolve {status, fields} do erro, ou os params aceites
function run(params) {
  try {
    return { status: 200, params: filter.validate(params).params };
  } catch (e) {
    return { status: e.http, code: e.code, fields: e.extra.fields };
  }
}

test("filter: registado com a fila própria e dedup", () => {
  assert.strictEqual(filter.queue, "video_filter_queue");
  assert.strictEqual(filter.dedup, true);
});

test("filter: 150 → 400 fields.brightness (FLT-003)", () => {
  const r = run({ style: "custom", brightness: 150, contrast: 0, saturation: 0 });
  assert.strictEqual(r.status, 400);
  assert.strictEqual(r.code, "INVALID_PARAMS");
  assert.ok(r.fields.brightness);
});

test("filter: −101 → 400", () => {
  const r = run({ style: "custom", brightness: 0, contrast: -101, saturation: 0 });
  assert.strictEqual(r.status, 400);
  assert.ok(r.fields.contrast);
});

test("filter: 10,5 e texto → 400", () => {
  assert.ok(run({ style: "custom", saturation: 10.5 }).fields.saturation);
  assert.ok(run({ style: "custom", saturation: "10" }).fields.saturation);
});

test("filter: limites −100 e +100 aceites", () => {
  const r = run({ style: "custom", brightness: -100, contrast: 100, saturation: 0 });
  assert.strictEqual(r.status, 200);
});

test("filter: estilo ou tonalidade desconhecidos → 400", () => {
  assert.ok(run({ style: "neon", brightness: 10 }).fields.style);
  assert.ok(run({ style: "custom", tint: "azul", brightness: 10 }).fields.tint);
});

test("filter: tudo a 0 sem tonalidade → NO_CHANGE (F5)", () => {
  const r = run({ style: "none", brightness: 0, contrast: 0, saturation: 0 });
  assert.strictEqual(r.status, 400);
  assert.strictEqual(r.fields._, "NO_CHANGE");
  assert.strictEqual(run({}).fields._, "NO_CHANGE");
});

test("filter: bw aceite e traz a tonalidade do estilo quando omitida", () => {
  const r = run({ style: "bw", brightness: 0, contrast: 10, saturation: -100 });
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(r.params, { style: "bw", tint: null, brightness: 0, contrast: 10, saturation: -100 });
  assert.strictEqual(run({ style: "sepia", brightness: 5, contrast: 0, saturation: -100 }).params.tint, "sepia");
});

test("filter: só a tonalidade já é uma alteração (FA1)", () => {
  const r = run({ style: "custom", tint: "sepia30", brightness: 0, contrast: 0, saturation: 0 });
  assert.strictEqual(r.status, 200);
});

test("filter: o estilo é só um rótulo na deduplicação", () => {
  const a = filter.validate({ style: "bw", brightness: 0, contrast: 10, saturation: -100 }).params;
  const b = filter.validate({ style: "custom", tint: null, brightness: 0, contrast: 10, saturation: -100 }).params;
  const key = (p) => dedupKeyFor("u", "v", "filter", filter.dedupParams(p));
  assert.strictEqual(key(a), key(b));
  const c = filter.validate({ style: "custom", brightness: 1, contrast: 10, saturation: -100 }).params;
  assert.notStrictEqual(key(a), key(c));
});

test("filter-options: três estilos e o intervalo (FLT-001, FLT-002)", () => {
  const o = filter.options();
  assert.deepStrictEqual(o.styles.map((s) => s.id), ["bw", "sepia", "vintage"]);
  assert.deepStrictEqual(o.range, { min: -100, max: 100, neutral: 0 });
  assert.strictEqual(o.styles.find((s) => s.id === "bw").saturation, -100);
  // os valores dos estilos passam na própria validação
  for (const s of o.styles) assert.strictEqual(run({ style: s.id, ...s }).status, 200);
});

test("toFactor: −100 → 0, 0 → 1, +100 → 2 (A18)", () => {
  assert.deepStrictEqual([-100, 0, 100, 50].map(filter.toFactor), [0, 1, 2, 1.5]);
});
