// services/giveawayManager.ts
import { Client, TextChannel } from "discord.js";
import { loadGiveaways, saveGiveaways, type GiveawayEntry } from "./giveawayStore.js";
const CHECK_INTERVAL = 60 * 1000; // Vérifie toutes les minutes
const endingsInProgress = new Set<string>();

export function resumeGiveaways(client: Client) {
  // LOG AU DEMARRAGE (reprise de giveaways)
  const data = loadGiveaways();
  const nbGiveaways = Object.keys(data).length;
  if (nbGiveaways > 0) {
    console.log(`[GIVEAWAY] Reprise de ${nbGiveaways} giveaway(s) en cours`);
    for (const [id, g] of Object.entries<any>(data)) {
      console.log(`[GIVEAWAY] → ID: ${id}, Fin: ${new Date(g.endTime).toLocaleString()}, Channel: ${g.channelId}`);
    }
  } else {
    console.log("[GIVEAWAY] Pas de giveaway en cours");
  }

  setInterval(() => {
    try {
      const data = loadGiveaways();
      const now = Date.now();

      for (const [id, giveaway] of Object.entries(data)) {
        if (now >= giveaway.endTime && !endingsInProgress.has(id)) {
          endingsInProgress.add(id);
          void endGiveaway(client, id, giveaway).finally(() => endingsInProgress.delete(id));
        }
      }
    } catch (err) {
      console.error("[GIVEAWAY] Erreur dans la reprise :", err);
    }
  }, CHECK_INTERVAL);
}

async function removeGiveaway(giveawayId: string) {
  const current = loadGiveaways();
  delete current[giveawayId];
  saveGiveaways(current, true);
}

async function endGiveaway(client: Client, giveawayId: string, giveaway: GiveawayEntry) {
  try {
    const fetchedChannel = client.channels.cache.get(giveaway.channelId)
      ?? await client.channels.fetch(giveaway.channelId).catch(() => null);
    if (!fetchedChannel?.isTextBased()) {
      console.warn(`[GIVEAWAY] Salon indisponible pour ${giveawayId}; données conservées pour réessayer`);
      return;
    }
    const channel = fetchedChannel as TextChannel;

    const msg = await channel.messages.fetch(giveaway.messageId).catch(() => null);
    if (!msg) {
      console.warn(`[GIVEAWAY] Message indisponible pour ${giveawayId}; données conservées pour réessayer`);
      return;
    }

    let winnerText = "";
    if (!giveaway.participants || giveaway.participants.length === 0) {
      winnerText = "Aucun gueux n’a participé… 🍺";
      console.log(`[GIVEAWAY] Aucun participant pour le tirage (ID: ${giveawayId})`);
    } else {
      const winnerId = giveaway.participants[Math.floor(Math.random() * giveaway.participants.length)];
      winnerText = `🎉 Bravo à <@${winnerId}> qui remporte la récompense ! 🍻`;
      console.log(`[GIVEAWAY] Tirage effectué (ID: ${giveawayId}, gagnant: ${winnerId})`);
    }

    await channel.send(`🏆 **Fin du Giveaway !**\n${winnerText}`);

    // Retirer du fichier
    await removeGiveaway(giveawayId);

    // Désactiver les boutons
    if (msg.editable) {
      msg.edit({ components: [] }).catch(() => null);
    }

    console.log(`[GIVEAWAY] Terminé : ${giveawayId}`);
  } catch (err) {
    console.error(`[GIVEAWAY] Erreur lors de la clôture :`, err);
  }
}
