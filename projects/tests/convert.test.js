const test = require("node:test");
const assert = require("node:assert/strict");
const { VIDEO_TOOLS } = require("../config/video");
const VideoAsset = require("../models/videoAsset");
const tasks = require("../video/taskService");

const convert = VIDEO_TOOLS.convert;

function video(overrides = {}) {
  return {
    kind: "video",
    container: "mp4",
    video_codec: "h264",
    audio_codec: "aac",
    width: 1920,
    height: 1080,
    duration_s: 60,
    size_bytes: 52_428_800,
    ...overrides,
  };
}

function validationError(params, source = video(), profile = "free") {
  try {
    convert.validate(params, source, profile);
  } catch (error) {
    return error;
  }
  assert.fail("Expected converter validation to fail");
}

test("convert is registered on the conversion queue with deduplication", () => {
  assert.equal(convert.queue, "video_convert_queue");
  assert.equal(convert.dedup, true);
});

test("convert options expose exactly MP4 and WebM formats", () => {
  const result = convert.options(video(), "free");
  assert.deepEqual(result.formats, [
    { id: "mp4", label: "MP4 (H.264/AAC)" },
    { id: "webm", label: "WebM (VP9/Opus)" },
  ]);
});

test("1080p Free options include original and only lower presets", () => {
  const result = convert.options(video(), "free");
  assert.deepEqual(result.heights, [
    { value: 1080, label: "Original (1080p)" },
    { value: 720, label: "720p" },
    { value: 480, label: "480p" },
    { value: 360, label: "360p" },
  ]);
  assert.deepEqual(result.defaults, { format: "mp4", height: 1080 });
});

test("4K Free options omit the original height and cap output at 1080p", () => {
  const result = convert.options(video({ width: 3840, height: 2160 }), "free");
  assert.deepEqual(
    result.heights.map(({ value }) => value),
    [1080, 720, 480, 360]
  );
});

test("720p video options contain no larger resolutions", () => {
  const result = convert.options(video({ width: 1280, height: 720 }), "free");
  assert.deepEqual(
    result.heights.map(({ value }) => value),
    [720, 480, 360]
  );
});

test("MP4 at the original resolution is rejected with NO_CHANGE", () => {
  const error = validationError({ format: "mp4", height: 1080 });
  assert.equal(error.http, 400);
  assert.equal(error.code, "INVALID_PARAMS");
  assert.equal(error.extra.fields._, "NO_CHANGE");
});

test("unsupported formats are rejected with valid options", () => {
  const error = validationError({ format: "mov", height: 720 });
  assert.equal(error.http, 400);
  assert.equal(error.code, "INVALID_PARAMS");
  assert.ok(error.extra.fields.format);
  assert.deepEqual(error.extra.options.formats.map(({ id }) => id), ["mp4", "webm"]);
});

test("heights outside the permitted list are rejected with valid options", () => {
  const error = validationError({ format: "webm", height: 1440 });
  assert.equal(error.http, 400);
  assert.ok(error.extra.fields.height);
  assert.deepEqual(error.extra.options.heights.map(({ value }) => value), [1080, 720, 480, 360]);
});

test("WebM is rejected as a conversion input", () => {
  assert.throws(
    () => convert.options(video({ container: "webm", video_codec: "vp9", audio_codec: "opus" }), "free"),
    (error) => error.http === 415 && error.code === "UNSUPPORTED_FORMAT"
  );
});

test("registered convert and filter tasks reject WebM origins with 415", async () => {
  const findOne = VideoAsset.findOne;
  VideoAsset.findOne = async () => ({ acceptedAsInput: false });
  try {
    for (const tool of ["convert", "filter"]) {
      await assert.rejects(
        tasks.accept({
          callerId: "670f00000000000000000001",
          profile: "free",
          ownerId: "670f00000000000000000002",
          projectId: "670f00000000000000000003",
          body: { tool, videoId: "670f00000000000000000004" },
        }),
        (error) => error.http === 415 && error.code === "UNSUPPORTED_FORMAT"
      );
    }
  } finally {
    VideoAsset.findOne = findOne;
  }
});

test("output name extension follows the requested format", () => {
  assert.equal(convert.correctOutputName("clip.mov", "webm"), "clip.webm");
  assert.equal(convert.correctOutputName("clip", "mp4"), "clip.mp4");
  assert.equal(convert.correctOutputName(undefined, "webm"), undefined);
});
