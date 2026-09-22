import { Client, Events, Message } from "discord.js";
import bank from "../data/tavernReplies.json" with { type: "json" };
import { isMuted } from "../state/tavernierState.js";

type ThreadKey = string;
type Category = "salut" | "insulte" | "bye" | "specialPing" | "random";

type ConvState = {
  lastIdx: Partial<Record<Category, number>>;
  history: Partial<Record<Category, string[]>>;
};

const state = new Map<ThreadKey, ConvState>();
const HISTORY_SIZE = 8;

function isTriggered(message: Message): boolean {
  const byMention = message.mentions.has(message.client.user!);
  const byKeyword = /(^|\s)#?noia(\s|$)/i.test(message.content);
  return byMention || byKeyword;
}

function detectCategory(message: Message): Category {
  const text = (message.content || "").toLowerCase();

  if (message.mentions.everyone || /@everyone|@here/.test(message.content)) return "specialPing";
  if (message.mentions.roles.size > 0) return "specialPing";
  if (/\b(bonjour|salut|coucou|hello|yo|wesh)\b/.test(text)) return "salut";
  if (/\b(au[\s-]?revoir|aurevoir|ciao|bye|bonne\s*nuit|bonne\s*journée|à\s*plus|a\+)\b/.test(text)) return "bye";
  if (/\b(bouffon|idiot|con|abruti|clochard|naze|nul|sale|ta\s*gueule|tg)\b/.test(text)) return "insulte";
  return "random";
}

function pickFromCategory(category: Category, conversation: ConvState): string {
  const replies = bank[category] as string[] | undefined;
  if (!replies?.length) return "[…]";

  const lastIndex = conversation.lastIdx[category] ?? -1;
  let index = (lastIndex + 1) % replies.length;
  const history = conversation.history[category] ?? [];

  for (let tries = 0; tries < Math.min(replies.length, 5); tries++) {
    if (!history.includes(replies[index])) break;
    index = (index + 1) % replies.length;
  }

  const value = replies[index];
  conversation.lastIdx[category] = index;
  conversation.history[category] = [...history, value].slice(-HISTORY_SIZE);
  return value;
}

export function registerMessageNoIA(client: Client): void {
  client.on(Events.MessageCreate, async (message: Message) => {
    try {
      if (message.author.bot || isMuted() || !isTriggered(message)) return;

      const key: ThreadKey = `${message.channel.id}:${message.author.id}`;
      const conversation = state.get(key) ?? { lastIdx: {}, history: {} };
      const reply = pickFromCategory(detectCategory(message), conversation);
      state.set(key, conversation);

      if (Math.random() < 0.25) {
        await message.react("🍺").catch(() => undefined);
      }
      await message.reply({ content: reply, allowedMentions: { repliedUser: false } });
    } catch (error) {
      console.error("[noIA] handler error:", error);
    }
  });
}

export default { registerMessageNoIA };
