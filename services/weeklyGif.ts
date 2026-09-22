// services/weeklyGif.ts
import cron from "node-cron";
import type { Client, TextChannel } from "discord.js";
import { isPublishingPaused } from "../state/tavernierState.js";

const CHANNEL_ID = process.env.MARDI_CHANNEL_ID || "837135924390264855";
const GIF_URL = process.env.MARDI_GIF_URL || "https://tenor.com/b0kf5.gif";
const TZ = process.env.TIMEZONE || "Europe/Paris";

/**
 * Poste le GIF tous les mardis à 12:12 (Europe/Paris par défaut).
 * CRON: "12 12 * * 2" → minute 12, heure 12, jour de semaine mardi(2).
 */
export function scheduleMardiGif(client: Client) {
  cron.schedule("12 12 * * 2", async () => {
    try {
      if (isPublishingPaused()) {
        console.log("[MARDI] Publication ignorée (pause=ON)");
        return;
      }
      const ch = await client.channels.fetch(CHANNEL_ID);
      if (!ch || !ch.isTextBased()) {
        console.warn(`[MARDI] Canal introuvable ou non textuel: ${CHANNEL_ID}`);
        return;
      }
      await (ch as TextChannel).send(GIF_URL);
      console.log(`[MARDI] GIF envoyé → ${CHANNEL_ID} (@12:12 ${TZ})`);
    } catch (e) {
      console.error("[MARDI] Erreur d’envoi:", e);
    }
  }, { timezone: TZ });

  console.log(`[MARDI] Planifié: mardi 12:12 (${TZ}) → canal ${CHANNEL_ID}`);
}
