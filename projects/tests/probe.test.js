// Validação pelo conteúdo com os vídeos gerados por tests/fixtures/make-videos.sh (REQ-VID-COM-003, COM-045)
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const { probe, checkIntegrity } = require("../video/probe");
const L = require("../video/limits");

const OUT = path.join(__dirname, "fixtures", "out");
const has = fs.existsSync(path.join(OUT, "ok_720p_30s.mp4"));
const opts = { skip: has ? false : "gere os vídeos com: bash tests/fixtures/make-videos.sh" };

async function verdict(name, profile = "free") {
  const p = path.join(OUT, name);
  const meta = await probe(p);
  try {
    L.validateInput(meta);
    L.validateProfile({ ...meta, sizeBytes: fs.statSync(p).size }, profile);
    if (!(await checkIntegrity(p))) return "CORRUPTED_FILE";
    return "ok";
  } catch (e) {
    return e.code;
  }
}

test("vídeos válidos são aceites", opts, async () => {
  assert.strictEqual(await verdict("ok_720p_30s.mp4"), "ok");
  assert.strictEqual(await verdict("ok_1080p_60s.mp4"), "ok");
  assert.strictEqual(await verdict("noaudio.mp4"), "ok");
  assert.strictEqual(await verdict("vertical_1080x1920.mp4"), "ok");
  assert.strictEqual(await verdict("uhd_4k.mp4", "premium"), "ok");
});

test("formatos fora da matriz são recusados, mesmo com extensão .mp4", opts, async () => {
  assert.strictEqual(await verdict("hevc.mp4"), "UNSUPPORTED_FORMAT");
  assert.strictEqual(await verdict("mov.mov"), "UNSUPPORTED_FORMAT");
  assert.strictEqual(await verdict("webm.webm"), "UNSUPPORTED_FORMAT");
  assert.strictEqual(await verdict("fake_webm.mp4"), "UNSUPPORTED_FORMAT");
  assert.strictEqual(await verdict("mp3audio.mp4"), "UNSUPPORTED_FORMAT");
});

test("limites do perfil e ficheiros corrompidos", opts, async () => {
  assert.strictEqual(await verdict("long_61s.mp4"), "VIDEO_TOO_LONG");
  assert.strictEqual(await verdict("uhd_4k.mp4"), "RESOLUTION_TOO_HIGH");
  assert.strictEqual(await verdict("truncated.mp4"), "CORRUPTED_FILE");
  assert.strictEqual(await verdict("random.mp4"), "CORRUPTED_FILE");
});

test("metadados lidos do ficheiro (COM-002)", opts, async () => {
  const m = await probe(path.join(OUT, "ok_720p_30s.mp4"));
  assert.strictEqual(m.width, 1280);
  assert.strictEqual(m.height, 720);
  assert.strictEqual(m.durationS, 30);
  assert.strictEqual(m.fps, 30);
  assert.strictEqual(m.videoCodec, "h264");
  assert.strictEqual(m.audioCodec, "aac");
});
