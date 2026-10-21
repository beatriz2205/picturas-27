const test = require("node:test");
const assert = require("node:assert/strict");
const { validate, dedupKey } = require("../video/tools/detect");

test("rejects an empty tool list", () => {
  assert.throws(() => validate({ tools: [] }), (error) => error.code === "INVALID_PARAMS" && Boolean(error.fields.tools));
});

test("rejects unknown and repeated tools", () => {
  assert.throws(() => validate({ tools: ["x"] }), /inválidos/);
  assert.throws(() => validate({ tools: ["obj_ai", "obj_ai"] }), /inválidos/);
});

test("validates threshold and defaults it to 0.5", () => {
  assert.equal(validate({ tools: ["people_ai"] }).params.threshold, 0.5);
  assert.throws(() => validate({ tools: ["people_ai"], threshold: 1.2 }), (error) => Boolean(error.fields.threshold));
});

test("canonical deduplication is independent of tool order", () => {
  assert.equal(
    dedupKey({ tools: ["obj_ai", "people_ai"], threshold: 0.5 }),
    dedupKey({ tools: ["people_ai", "obj_ai"], threshold: 0.5, annotatedVideo: false }),
  );
});
