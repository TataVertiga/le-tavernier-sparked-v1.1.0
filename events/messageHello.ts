import { Client, Events, Message } from "discord.js";
import { isMuted } from "../state/tavernierState.js";

// Regex : cherche un mot de salutation isolé (pas collé dans un autre mot)
const salutRegex = /\b(bonjour|bjr|yaoi|bonsoir|salut|slt|yo|yop|coucou|cc|kikoo|hey+|heya)\b/i;

export default function registerMessageHello(client: Client) {
  client.on(Events.MessageCreate, async (message: Message) => {
    // Ignore les bots
    if (message.author.bot) return;
    if (isMuted()) return;

    const content = message.content.toLowerCase();

    // Vérifie si ça match une salutation
    if (salutRegex.test(content)) {
      try {
        await message.react("👋");
      } catch (err) {
        console.error("[HELLO] Impossible d’ajouter la réaction:", err);
      }
    }
  });
}
