import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { Events } from "discord.js";
import { createDiscordClient } from "../core/client.js";
import { loadSlashCommands, registerManualEvents } from "../core/discordSetup.js";

test("toutes les commandes Discord peuvent être importées", async () => {
  const originalDirectory = process.cwd();
  const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "tavernier-commands-"));
  const client = createDiscordClient();

  try {
    process.chdir(temporaryDirectory);
    const json = await loadSlashCommands(client);
    assert.ok(json.length >= 17);
    for (const name of ["bot", "giveaway", "rolespanel", "testcrosspost"]) {
      assert.ok(client.commands.has(name), `commande /${name} absente`);
    }
  } finally {
    client.destroy();
    process.chdir(originalDirectory);
    fs.rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});

test("les événements manuels incluent toujours les réponses locales noIA", () => {
  const client = createDiscordClient();

  try {
    registerManualEvents(client);
    // giveaway + slash utilisent InteractionCreate; bonjour + noIA utilisent
    // MessageCreate. Ce garde-fou évite de laisser noIA débranché au démarrage.
    assert.ok(client.listenerCount(Events.InteractionCreate) >= 1);
    assert.ok(client.listenerCount(Events.MessageCreate) >= 2);
  } finally {
    client.destroy();
  }
});
