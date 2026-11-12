import test from "node:test";
import assert from "node:assert/strict";
import { createMailJobRunner } from "../src/mailJobs.js";

test("почтовое задание запускается в фоне и не допускает параллельную рассылку", async () => {
  const runner = createMailJobRunner();
  let release;
  const gate = new Promise((resolve) => (release = resolve));

  const started = runner.start({
    kind: "credentials",
    items: [{ email: "anna@test.ru" }],
    send: () => gate,
  });

  assert.equal(started.status, "running");
  assert.equal(started.processed, 0);
  assert.equal(
    runner.start({ kind: "round2-notice", items: [], send: async () => {} }),
    null
  );

  release();
  await new Promise((resolve) => setImmediate(resolve));

  const finished = runner.get();
  assert.equal(finished.status, "done");
  assert.equal(finished.processed, 1);
  assert.deepEqual(finished.sent, ["anna@test.ru"]);
});
