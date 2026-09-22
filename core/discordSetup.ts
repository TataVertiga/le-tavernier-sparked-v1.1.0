import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  ActivityType,
  Collection,
  Events,
  MessageFlags,
  REST,
  Routes,
  type ChatInputCommandInteraction,
  type Client,
} from "discord.js";
import type { TavernierClient } from "./client.js";
import { discordToken, envFlag, markService } from "./config.js";
import { errorMessage, log } from "./logger.js";
import registerGiveawayInteractions from "../events/giveawayInteractions.js";
import registerMessageHello from "../events/messageHello.js";
import { registerMessageNoIA } from "../events/messageNoIA.js";
import registerTikTokAuto from "../events/tiktokAuto.js";

type SlashCommand = {
  data: { name: string; toJSON(): unknown };
  execute(interaction: ChatInputCommandInteraction): Promise<unknown> | unknown;
};

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function moduleFiles(directory: string): Promise<string[]> {
  try {
    const extension = fileURLToPath(import.meta.url).endsWith(".ts") ? ".ts" : ".js";
    return (await fs.readdir(directory))
      .filter(file => file.endsWith(extension) && !file.endsWith(".d.ts"))
      .sort();
  } catch (error) {
    log.warn("BOOT", `Dossier introuvable: ${directory} (${errorMessage(error)})`);
    return [];
  }
}

export async function loadSlashCommands(client: TavernierClient): Promise<unknown[]> {
  const commands = new Collection<string, SlashCommand>();
  const json: unknown[] = [];
  const directory = path.join(projectRoot, "commands");

  for (const file of await moduleFiles(directory)) {
    try {
      const module = await import(pathToFileURL(path.join(directory, file)).href);
      const command = module.default as SlashCommand | undefined;
      if (!command?.data?.name || typeof command.data.toJSON !== "function" || typeof command.execute !== "function") {
        log.warn("DISCORD", `Commande ignorée (format invalide): ${file}`);
        continue;
      }
      commands.set(command.data.name, command);
      json.push(command.data.toJSON());
      log.debug("DISCORD", `Commande chargée: /${command.data.name}`);
    } catch (error) {
      log.error("DISCORD", `Impossible de charger ${file}`, error);
    }
  }

  client.commands = commands;
  log.info("BOOT", `${commands.size} commande(s) slash chargée(s)`);
  return json;
}

export async function deploySlashCommands(commands: unknown[]): Promise<boolean> {
  if (!envFlag("DEPLOY_COMMANDS_ON_START", true)) {
    log.info("BOOT", "Déploiement des commandes désactivé (DEPLOY_COMMANDS_ON_START=false)");
    return false;
  }

  const token = discordToken();
  const clientId = process.env.CLIENT_ID?.trim();
  const guildId = process.env.GUILD_ID?.trim();
  if (!token || !clientId) {
    log.warn("BOOT", "Commandes non déployées: DISCORD_TOKEN/TOKEN ou CLIENT_ID manquant");
    return false;
  }

  try {
    const rest = new REST({ version: "10" }).setToken(token);
    const route = guildId
      ? Routes.applicationGuildCommands(clientId, guildId)
      : Routes.applicationCommands(clientId);
    await rest.put(route, { body: commands });
    log.info("BOOT", guildId
      ? `Commandes déployées sur la guilde ${guildId}`
      : "Commandes déployées globalement");
    return true;
  } catch (error) {
    log.error("BOOT", "Échec du déploiement des commandes", error);
    return false;
  }
}

const manuallyRegisteredEvents = new Set([
  "giveawayInteractions.js",
  "messageHello.js",
  "messageNoIA.js",
  "tiktokAuto.js",
  "giveawayInteractions.ts",
  "messageHello.ts",
  "messageNoIA.ts",
  "tiktokAuto.ts",
]);

export function registerManualEvents(client: Client): void {
  registerGiveawayInteractions(client);
  registerMessageHello(client);
  registerMessageNoIA(client);
  registerTikTokAuto(client);
}

export async function loadEvents(client: Client): Promise<void> {
  const directory = path.join(projectRoot, "events");
  let count = 0;

  for (const file of await moduleFiles(directory)) {
    if (manuallyRegisteredEvents.has(file)) continue;
    try {
      const module = await import(pathToFileURL(path.join(directory, file)).href);
      const event = module.default;
      if (!event?.name || typeof event.execute !== "function") {
        log.warn("DISCORD", `Événement ignoré (format invalide): ${file}`);
        continue;
      }
      client.on(event.name, (...args: unknown[]) => event.execute(...args));
      count++;
      log.debug("DISCORD", `Événement chargé: ${file}`);
    } catch (error) {
      log.error("DISCORD", `Impossible de charger l'événement ${file}`, error);
    }
  }
  log.info("BOOT", `${count} événement(s) Discord chargé(s)`);
}

export function registerSlashHandler(client: TavernierClient): void {
  client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName) as SlashCommand | undefined;

    if (!command) {
      await interaction.reply({ content: "⚠️ Commande inconnue.", flags: MessageFlags.Ephemeral }).catch(() => undefined);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      log.error("COMMAND", `Échec de /${interaction.commandName}`, error);
      const payload = {
        content: "🤕 Le Tavernier a renversé sa chope. Réessaie dans un instant.",
        flags: MessageFlags.Ephemeral,
      } as const;
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload).catch(() => undefined);
      } else {
        await interaction.reply(payload).catch(() => undefined);
      }
    }
  });
}

export function registerPresence(client: Client): void {
  client.once(Events.ClientReady, () => {
    markService("discord", "running");
    client.user?.setPresence({
      activities: [{ name: "tenir le comptoir 🍺", type: ActivityType.Playing }],
      status: "online",
    });
  });
}
