import "dotenv/config";
import { createDiscordClient } from "./core/client.js";
import { discordToken, markService, serviceReadiness } from "./core/config.js";
import {
  deploySlashCommands,
  loadEvents,
  loadSlashCommands,
  registerManualEvents,
  registerPresence,
  registerSlashHandler,
} from "./core/discordSetup.js";
import { startHttpServer } from "./core/http.js";
import { registerLifecycle } from "./core/lifecycle.js";
import { log } from "./core/logger.js";
import { ensureRuntimeFiles } from "./core/runtimeFiles.js";
import { printPermsConfig } from "./utils/permUtils.js";

const client = createDiscordClient();

async function boot(): Promise<void> {
  const token = discordToken();
  if (!token) throw new Error("DISCORD_TOKEN (ou TOKEN) manquant");

  const runtime = ensureRuntimeFiles();
  if (runtime.invalid.length) {
    throw new Error(`Données runtime invalides: ${runtime.invalid.join(", ")}`);
  }

  printPermsConfig();
  startHttpServer();

  registerSlashHandler(client);
  registerManualEvents(client);
  if (serviceReadiness("tiktok").ready) markService("tiktok", "running");
  registerLifecycle(client);
  registerPresence(client);

  const commands = await loadSlashCommands(client);
  await deploySlashCommands(commands);
  await loadEvents(client);
  await client.login(token);
}

void boot().catch(error => {
  log.error("BOOT", "Démarrage impossible", error);
  process.exit(1);
});

export default client;
