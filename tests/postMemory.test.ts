import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("la mémoire des posts refuse d'écraser un JSON cassé", async () => {
  const originalDirectory = process.cwd();
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "tavernier-post-memory-"));

  try {
    process.chdir(temporaryDirectory);
    fs.mkdirSync("data", { recursive: true });
    fs.writeFileSync("data/last_posts.json", "{cassé", "utf8");

    const memory = await import(`../utils/postMemory.js?test=${Date.now()}`);
    assert.throws(() => memory.alreadyPosted("twitter", "live-1"), /fichier conservé/);
    assert.equal(fs.readFileSync("data/last_posts.json", "utf8"), "{cassé");
  } finally {
    process.chdir(originalDirectory);
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});
