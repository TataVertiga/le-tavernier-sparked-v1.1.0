import cron from "node-cron";
import { Events, type Client } from "discord.js";
import { serviceReadiness, markService, type ServiceKey } from "./config.js";
import { log } from "./logger.js";
import { initReactionRoles } from "../services/reactionRoles.js";
import { resumeGiveaways } from "../services/giveawayManager.js";
import { backupGiveawayFile, rotateBackups } from "../utils/backupGiveaway.js";
import { scheduleMardiGif } from "../services/weeklyGif.js";
import { initAnniversaires } from "../services/anniversaires.js";
import { checkYoutube } from "../services/youtube.js";
import { startTwitchWatcher } from "../services/twitch.js";
import { startTwitchClipsWatcher } from "../services/twitchClips.js";
import { announceTwitchEnd, announceTwitchLive } from "../services/liveAnnouncement.js";
import { announceTwitchClip } from "../services/clipAnnouncement.js";

async function startIsolatedService(
  key: ServiceKey,
  start: () => Promise<void> | void,
): Promise<void> {
  const readiness = serviceReadiness(key);
  if (!readiness.enabled) {
    log.info("SERVICES", `${readiness.label}: désactivé`);
    return;
  }
  if (readiness.missing.length) {
    log.warn("SERVICES", `${readiness.label}: configuration incomplète (${readiness.missing.join(", ")})`);
    return;
  }

  markService(key, "waiting");
  try {
    await start();
    markService(key, "running");
    log.info("SERVICES", `${readiness.label}: actif`);
  } catch (error) {
    markService(key, "error", error instanceof Error ? error.message : String(error));
    log.error("SERVICES", `${readiness.label}: démarrage impossible`, error);
  }
}

async function startExternalServices(client: Client): Promise<void> {
  await Promise.all([
    startIsolatedService("twitch", () => {
      void startTwitchWatcher({
        onStart: stream => announceTwitchLive(client, stream),
        onEnd: announceTwitchEnd,
        onHealthy: () => markService("twitch", "running"),
        onError: error => markService(
          "twitch",
          "error",
          error instanceof Error ? error.message : String(error),
        ),
      }).catch(error => {
        markService("twitch", "error", error instanceof Error ? error.message : String(error));
        log.error("TWITCH", "Watcher interrompu", error);
      });
    }),
    startIsolatedService("clips", () => {
      void startTwitchClipsWatcher({
        onClip: clip => announceTwitchClip(client, clip),
        onHealthy: () => markService("clips", "running"),
        onError: error => markService(
          "clips",
          "error",
          error instanceof Error ? error.message : String(error),
        ),
      }).catch(error => {
        markService("clips", "error", error instanceof Error ? error.message : String(error));
        log.error("CLIPS", "Watcher interrompu", error);
      });
    }),
    startIsolatedService("anniversaires", () => initAnniversaires(client)),
    startIsolatedService("youtube", async () => {
      await checkYoutube(client);
      setInterval(() => void checkYoutube(client), 10 * 60 * 1000);
    }),
  ]);
}

export function registerLifecycle(client: Client): void {
  client.once(Events.ClientReady, readyClient => {
    log.info("DISCORD", `Connecté en tant que ${readyClient.user.tag}`);

    try {
      initReactionRoles(client);
    } catch (error) {
      log.error("DISCORD", "Initialisation des rôles impossible", error);
    }

    try {
      resumeGiveaways(client);
      markService("giveaways", "running");
    } catch (error) {
      markService("giveaways", "error", error instanceof Error ? error.message : String(error));
      log.error("GIVEAWAY", "Reprise des giveaways impossible", error);
    }

    if (serviceReadiness("mardi").enabled) {
      scheduleMardiGif(client);
      markService("mardi", "running");
    }

    cron.schedule("*/10 * * * *", () => {
      backupGiveawayFile();
      rotateBackups(50);
    });

    setTimeout(() => void startExternalServices(client), 3000);
  });
}
