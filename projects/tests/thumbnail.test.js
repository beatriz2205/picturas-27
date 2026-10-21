// spec 001 (T035) — geração da thumbnail (D16; SUBMIT-012, SUBMIT-013). Precisa do ffmpeg e dos vídeos de teste.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const OUT = path.join(__dirname, "fixtures", "out");
const hasFfmpeg = (() => {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return true;
  } catch (_) {
    return false;
  }
})();
const skip = !hasFfmpeg ? "ffmpeg não instalado" : !fs.existsSync(path.join(OUT, "ok_720p_30s.mp4")) ? "gere os vídeos de teste" : false;

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "video-thumb-"));
process.env.VIDEO_UPLOAD_TMP_DIR = TMP;
const { generateThumbnail, storeThumbnail, frameTime } = require("../video/thumbnail");

const dims = (file) =>
  execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", file])
    .toString()
    .trim();

test("frameTime: 10% da duração, no máximo 1 s", () => {
  assert.strictEqual(frameTime(30), 1);
  assert.strictEqual(frameTime(5), 0.5);
  assert.strictEqual(frameTime(0.5), 0.05);
  assert.strictEqual(frameTime(null), 0);
});

test("generateThumbnail: JPEG de 320 px com a proporção do vídeo", { skip }, async () => {
  const wide = await generateThumbnail(path.join(OUT, "ok_720p_30s.mp4"), 30);
  assert.strictEqual(dims(wide), "320,180");
  const tall = await generateThumbnail(path.join(OUT, "vertical_1080x1920.mp4"), 5);
  assert.strictEqual(dims(tall), "320,568");
  fs.rmSync(wide);
  fs.rmSync(tall);
});

test("generateThumbnail: vídeo com menos de 1 s", { skip: skip || (!fs.existsSync(path.join(OUT, "short_0_5s.mp4")) && "gere os vídeos de teste") }, async () => {
  const jpg = await generateThumbnail(path.join(OUT, "short_0_5s.mp4"), 0.5);
  assert.ok(jpg && fs.statSync(jpg).size > 0);
  fs.rmSync(jpg);
});

test("generateThumbnail: entrada inválida devolve null sem lançar nem deixar ficheiros (SUBMIT-013)", { skip }, async () => {
  assert.strictEqual(await generateThumbnail(path.join(TMP, "nao-existe.mp4"), 10), null);
  assert.strictEqual(await generateThumbnail(path.join(OUT, "random.mp4"), 10), null);
  assert.deepStrictEqual(fs.readdirSync(TMP), []);
});

test("storeThumbnail: carrega em video_thumb e apaga o JPEG local; falha do armazenamento → null", { skip }, async () => {
  const calls = [];
  const ok = { uploadFile: async (owner, project, stage, file, type) => (calls.push({ stage, type, exists: fs.existsSync(file) }), `${project}/${stage}/x.jpg`) };
  assert.strictEqual(await storeThumbnail("u", "p", path.join(OUT, "noaudio.mp4"), 5, { storage: ok }), "p/video_thumb/x.jpg");
  assert.deepStrictEqual(calls, [{ stage: "video_thumb", type: "image/jpeg", exists: true }]);

  const down = { uploadFile: async () => { throw new Error("503"); } };
  assert.strictEqual(await storeThumbnail("u", "p", path.join(OUT, "noaudio.mp4"), 5, { storage: down }), null);
  assert.deepStrictEqual(fs.readdirSync(TMP), []);
});
