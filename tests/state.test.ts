import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("importer l'état ne crée pas de donnée runtime avant son utilisation", async () => {
  const originalDirectory = process.cwd();
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "tavernier-state-"));

  try {
    process.chdir(temporaryDirectory);
    const state = await import(`../state/tavernierState.js?test=${Date.now()}`);
    assert.equal(fs.existsSync("data/tavernier_state.json"), false);

    assert.deepEqual(state.getState(), { mute: false, pausePublishing: false });
    assert.equal(fs.existsSync("data/tavernier_state.json"), true);
  } finally {
    process.chdir(originalDirectory);
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});
