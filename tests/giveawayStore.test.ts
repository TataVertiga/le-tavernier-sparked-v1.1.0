import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

test("le stockage giveaway écrit atomiquement et refuse d'écraser un JSON cassé", async () => {
  const originalDirectory = process.cwd();
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "tavernier-giveaway-"));

  try {
    process.chdir(temporaryDirectory);
    const store = await import(`../services/giveawayStore.js?test=${Date.now()}`);
    const expected = {
      "giveaway-live": {
        messageId: "message",
        channelId: "channel",
        endTime: 42,
        participants: ["user-1", "user-2"],
        description: "récompense",
      },
    };

    store.saveGiveaways(expected);
    assert.deepEqual(store.loadGiveaways(), expected);
    assert.equal(fs.existsSync("data/giveaways.json.tmp"), false);

    fs.writeFileSync("data/giveaways.json", "{cassé", "utf8");
    assert.throws(() => store.loadGiveaways(), /fichier conservé/);
    assert.equal(fs.readFileSync("data/giveaways.json", "utf8"), "{cassé");
  } finally {
    process.chdir(originalDirectory);
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});
