// events/tiktokAuto.ts
import {
  Client,
  Events,
  PermissionFlagsBits,
  TextChannel,
  ChannelType,
  Message,
} from "discord.js";
import { fetchTikTokOEmbed } from "../services/tiktok.js";
import { buildTikTokEmbed, buildTikTokButtons } from "../utils/embedTemplates.js";
import { isPublishingPaused } from "../state/tavernierState.js";
import { envFlag } from "../core/config.js";

const ENABLED = envFlag("TIKTOK_AUTOCONVERT_ENABLED");
const ADMIN_ONLY = envFlag("TIKTOK_AUTOCONVERT_ADMIN_ONLY", true);
const DELETE_ORIGINAL = envFlag("TIKTOK_DELETE_ORIGINAL");
const ALLOWED_IDS = (process.env.TIKTOK_ALLOWED_CHANNEL_IDS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

const TIKTOK_REGEX = /(https?:\/\/(?:www\.)?(?:vt\.tiktok\.com\/\S+|tiktok\.com\/\S+))/i;

// Anti-doublon simple (15 min)
const recent = new Map<string, number>();
const TTL_MS = 15 * 60 * 1000;

function isAllowedChannel(msg: Message) {
  if (ALLOWED_IDS.length === 0) return true;
  return ALLOWED_IDS.includes(msg.channel.id);
}
function extractUrl(s: string) {
  const m = s.match(TIKTOK_REGEX);
  return m?.[1];
}
function pruneRecent() {
  const now = Date.now();
  for (const [k, t] of recent.entries()) if (now - t > TTL_MS) recent.delete(k);
}

function randomTikTokRP(roleId?: string | null) {
  const ping = roleId ? `<@&${roleId}> ` : "";
  const lines = [
    `${ping}🕺 Un gueux vient d’esquisser quelques pas honteux !`,
    `${ping}🍷 La piste est poisseuse et la danse… discutable. Viens juger !`,
    `${ping}📯 À la Taverne, même les talons compensés n’y survivent pas !`,
  ];
  return lines[Math.floor(Math.random() * lines.length)];
}

export default function registerTikTokAuto(client: Client) {
  if (!ENABLED) return;

  client.on(Events.MessageCreate, async (msg) => {
    try {
      if (msg.author.bot || msg.webhookId) return;
      if (!msg.guild) return;
      if (msg.channel.type !== ChannelType.GuildText) return;
      if (!isAllowedChannel(msg)) return;

      const url = extractUrl(msg.content);
      if (!url) return;
      if (isPublishingPaused()) return;

      // Admin-only (par défaut)
      if (ADMIN_ONLY) {
        const member = await msg.guild.members.fetch(msg.author.id).catch(() => null);
        const hasAdmin = member?.permissions.has(PermissionFlagsBits.Administrator) ?? false;
        if (!hasAdmin) return;
      }

      pruneRecent();
      if (recent.has(url)) return;
      recent.set(url, Date.now());

      const { url: finalUrl, meta } = await fetchTikTokOEmbed(url);
      const embed = buildTikTokEmbed({
        videoUrl: finalUrl,
        authorName: meta?.author_name,
        authorUrl: meta?.author_url,
        title: meta?.title,
        thumbUrl: meta?.thumbnail_url,
      });
      const row = buildTikTokButtons(finalUrl, meta?.author_name, meta?.author_url);

      // 🔔 Ping rôle TikTok (si défini) + RP
      const roleId = process.env.TIKTOK_ROLE_ID || null;
      const content = randomTikTokRP(roleId);

      await (msg.channel as TextChannel).send({
        content,
        embeds: [embed],
        components: [row],
        allowedMentions: roleId ? { roles: [roleId] } : { parse: [] },
      });

      if (DELETE_ORIGINAL && msg.deletable) {
        await msg.delete().catch(() => {});
      }
    } catch (e) {
      console.error("[TikTokAuto] error:", e);
    }
  });
}
