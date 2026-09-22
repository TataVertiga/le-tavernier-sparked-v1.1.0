import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { ensureRuntimeFiles } from "../core/runtimeFiles.js";

test("initialise les données runtime sans écraser un fichier existant", () => {
  const originalDirectory = process.cwd();
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "tavernier-runtime-"));

  try {
    process.chdir(temporaryDirectory);
    const firstRun = ensureRuntimeFiles();
    assert.ok(firstRun.created.includes("data/giveaways.json"));
    assert.deepEqual(JSON.parse(fs.readFileSync("data/giveaways.json", "utf8")), {});

    const liveData = '{"giveaway-live":{"participants":["42"]}}';
    fs.writeFileSync("data/giveaways.json", liveData, "utf8");
    const secondRun = ensureRuntimeFiles();
    assert.equal(secondRun.created.length, 0);
    assert.equal(fs.readFileSync("data/giveaways.json", "utf8"), liveData);

    const brokenData = "{pas-json";
    fs.writeFileSync("data/giveaways.json", brokenData, "utf8");
    const brokenRun = ensureRuntimeFiles();
    assert.ok(brokenRun.invalid.includes("data/giveaways.json"));
    assert.equal(fs.readFileSync("data/giveaways.json", "utf8"), brokenData);
  } finally {
    process.chdir(originalDirectory);
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});
