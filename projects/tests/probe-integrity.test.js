const test = require("node:test");
const assert = require("node:assert/strict");
const childProcess = require("child_process");

test("integridade distingue corrupção de indisponibilidade e repete erros transitórios", async () => {
  const original = childProcess.execFile;
  const modulePath = require.resolve("../video/probe");
  let replies;
  let calls;
  childProcess.execFile = (_exe, _args, options, callback) => {
    calls++;
    assert.ok(options.timeout > 0 && options.timeout <= 2500);
    const [err, stdout, stderr] = replies.shift();
    callback(err, stdout, stderr);
  };
  delete require.cache[modulePath];
  try {
    const { checkIntegrity } = require("../video/probe");
    calls = 0;
    replies = [[null, "9000", "transient error"], [null, "9000", ""]];
    assert.equal(await checkIntegrity("valid.mp4"), true);
    assert.equal(calls, 2);

    replies = [[null, "100", "corrupt packet"], [null, "100", "corrupt packet"]];
    assert.equal(await checkIntegrity("bad.mp4"), false);

    const timeout = Object.assign(new Error("timeout"), { killed: true, code: null });
    replies = [[timeout, "", ""], [null, "9000", ""]];
    assert.equal(await checkIntegrity("slow.mp4"), true);

    replies = [[timeout, "", ""], [timeout, "", ""]];
    await assert.rejects(checkIntegrity("busy.mp4"), { code: "SERVICE_UNAVAILABLE", http: 503 });
  } finally {
    childProcess.execFile = original;
    delete require.cache[modulePath];
  }
});
