import { Client, Events, Message } from "discord.js";
import { log } from "../core/logger.js";
import { markService, serviceReadiness } from "../core/config.js";
import { isMuted } from "../state/tavernierState.js";
import { generateOllamaReply, ollamaChannelId } from "../services/ollama.js";

function isTriggered(message: Message): boolean {
  const botId = message.client.user?.id;
  const byMention = botId ? message.mentions.users.has(botId) : false;
  const byKeyword = /(^|\s)#?noia(\s|$)/i.test(message.content);
  const channelId = ollamaChannelId();
  const inOllamaChannel = Boolean(channelId) && message.channel.id === channelId;
  return byMention || byKeyword || inOllamaChannel;
}

function messageText(message: Message): string {
  const botId = message.client.user?.id;
  return message.content
    .replace(botId ? new RegExp("<@!?" + botId + ">", "g") : /$^/, " ")
    .replace(/(^|\s)#?noia(?=\s|$)/gi, " ")
    .trim();
}

export function registerMessageAI(client: Client): void {
  client.on(Events.MessageCreate, async (message: Message) => {
    try {
      if (!serviceReadiness("ollama").enabled) return;
      if (message.author.bot || isMuted() || !isTriggered(message)) return;

      const ollama = serviceReadiness("ollama");
      if (!ollama.ready) {
        await message.reply({
          content: "L’IA locale est activée, mais sa configuration est incomplète. Vérifie OLLAMA_MODEL dans le fichier .env.",
          allowedMentions: { repliedUser: false },
        });
        return;
      }

      const input = messageText(message);
      if (!input) {
        await message.reply({
          content: "Je suis là 🍺 Dis-moi ce que tu as en tête.",
          allowedMentions: { repliedUser: false },
        });
        return;
      }

      let typingTimer: ReturnType<typeof setInterval> | undefined;
      const sendTyping = "sendTyping" in message.channel && typeof message.channel.sendTyping === "function"
        ? message.channel.sendTyping.bind(message.channel)
        : undefined;
      if (sendTyping) {
        await sendTyping().catch(() => undefined);
        typingTimer = setInterval(() => {
          void sendTyping().catch(() => undefined);
        }, 8_000);
      }

      try {
        const key = message.channel.id + ":" + message.author.id;
        const answer = await generateOllamaReply(key, input);
        if (Math.random() < 0.25) {
          await message.react("🍺").catch(() => undefined);
        }
        await message.reply({
          content: answer.length > 1_900 ? answer.slice(0, 1_899) + "…" : answer,
          allowedMentions: { parse: [], repliedUser: false },
        });
      } catch (error) {
        if (error instanceof Error && error.message === "OLLAMA_BUSY") {
          await message.reply({
            content: "J’ai trop de messages d’un coup, laisse-moi finir ma chope et je reviens vers toi.",
            allowedMentions: { repliedUser: false },
          });
        } else {
          markService("ollama", "error", error instanceof Error ? error.message : String(error));
          log.error("OLLAMA", "Impossible de répondre à ce message", error);
          await message.reply({
            content: "Je n’arrive pas à utiliser Ollama. Vérifie qu’il est lancé et que le modèle est installé sur le PC, puis réessaie.",
            allowedMentions: { repliedUser: false },
          });
        }
      } finally {
        if (typingTimer) clearInterval(typingTimer);
      }
    } catch (error) {
      log.error("OLLAMA", "Échec du gestionnaire de conversation", error);
    }
  });
}

export default { registerMessageAI };
