// spec 000, T014 — limites por perfil e matriz de formatos (REQ-VID-COM-003 a 006, COM-010, COM-040, COM-045)
const test = require("node:test");
const assert = require("node:assert");
const L = require("../video/limits");

const MB = 1024 * 1024;
const meta = (o = {}) => ({
  formatNames: ["mov", "mp4", "m4a", "3gp", "3g2", "mj2"],
  majorBrand: "isom",
  videoStreams: 1,
  audioStreams: 1,
  videoCodec: "h264",
  audioCodec: "aac",
  width: 1920,
  height: 1080,
  durationS: 30,
  sizeBytes: 10 * MB,
  ...o,
});
const code = (fn) => {
  try {
    fn();
    return "ok";
  } catch (e) {
    return e.code;
  }
};

test("matriz de entrada: só MP4/H.264 com AAC ou sem áudio", () => {
  assert.strictEqual(code(() => L.validateInput(meta())), "ok");
  assert.strictEqual(code(() => L.validateInput(meta({ audioStreams: 0, audioCodec: null }))), "ok");
  assert.strictEqual(code(() => L.validateInput(meta({ videoCodec: "hevc" }))), "UNSUPPORTED_FORMAT");
  assert.strictEqual(code(() => L.validateInput(meta({ audioCodec: "mp3" }))), "UNSUPPORTED_FORMAT");
  assert.strictEqual(code(() => L.validateInput(meta({ majorBrand: "qt" }))), "UNSUPPORTED_FORMAT");
  assert.strictEqual(code(() => L.validateInput(meta({ formatNames: ["matroska", "webm"], majorBrand: null }))), "UNSUPPORTED_FORMAT");
  assert.strictEqual(code(() => L.validateInput(meta({ videoStreams: 2 }))), "UNSUPPORTED_FORMAT");
  assert.strictEqual(code(() => L.validateInput(null)), "CORRUPTED_FILE");
});

test("limites Free: exatamente no limite é aceite, acima é recusado", () => {
  assert.strictEqual(code(() => L.validateProfile(meta({ sizeBytes: 100 * MB }), "free")), "ok");
  assert.strictEqual(code(() => L.validateProfile(meta({ sizeBytes: 101 * MB }), "free")), "VIDEO_TOO_LARGE");
  assert.strictEqual(code(() => L.validateProfile(meta({ durationS: 60 }), "free")), "ok");
  assert.strictEqual(code(() => L.validateProfile(meta({ durationS: 61 }), "free")), "VIDEO_TOO_LONG");
  assert.strictEqual(code(() => L.validateProfile(meta({ width: 3840, height: 2160 }), "free")), "RESOLUTION_TOO_HIGH");
  assert.strictEqual(code(() => L.validateProfile(meta({ width: 1080, height: 1920 }), "free")), "ok", "vídeo vertical 1080p");
});

test("limites Premium", () => {
  assert.strictEqual(code(() => L.validateProfile(meta({ sizeBytes: 500 * MB, durationS: 600, width: 3840, height: 2160 }), "premium")), "ok");
  assert.strictEqual(code(() => L.validateProfile(meta({ sizeBytes: 501 * MB }), "premium")), "VIDEO_TOO_LARGE");
  assert.strictEqual(code(() => L.validateProfile(meta({ durationS: 601 }), "premium")), "VIDEO_TOO_LONG");
  assert.strictEqual(code(() => L.validateProfile(meta({ width: 7680, height: 4320 }), "premium")), "RESOLUTION_TOO_HIGH");
});

test("perfil anónimo não tem limites de vídeo (sem acesso)", () => {
  assert.strictEqual(code(() => L.validateProfile(meta(), "anonymous")), "AUTH_REQUIRED");
});

test("mensagem indica o limite e sugere Premium no Free (COM-007, COM-024)", () => {
  try {
    L.validateProfile(meta({ durationS: 90 }), "free");
    assert.fail();
  } catch (e) {
    assert.match(e.message, /1 min 30 s; o limite do plano Free é 1 min/);
    assert.strictEqual(e.extra.upgrade, true);
    assert.deepStrictEqual(e.extra.limit, { name: "duration", value: 60, unit: "s", profile: "free" });
  }
});

test("resoluções de saída permitidas (COM-010)", () => {
  assert.deepStrictEqual(L.allowedHeights(meta({ width: 3840, height: 2160 }), "free"), [1080, 720, 480, 360]);
  assert.deepStrictEqual(L.allowedHeights(meta({ width: 3840, height: 2160 }), "premium"), [2160, 1440, 1080, 720, 480, 360]);
  assert.deepStrictEqual(L.allowedHeights(meta({ width: 1280, height: 720 }), "free"), [720, 480, 360]);
});

test("tempo máximo: max(15 min, 15 min por minuto) (COM-040)", () => {
  assert.strictEqual(L.timeoutMs(30), 15 * 60e3);
  assert.strictEqual(L.timeoutMs(600), 150 * 60e3);
});
