import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type Client,
  type TextChannel,
} from "discord.js";
import { log } from "../core/logger.js";
import { isPublishingPaused } from "../state/tavernierState.js";
import { createLiveEmbed } from "../utils/embedTemplates.js";
import { publishLiveAcrossSocials } from "./socialPublisher.js";
import { twitchChannelUrl, type TwitchStream } from "./twitch.js";

function randomRpMessage(roleId?: string) {
  const ping = roleId ? `<@&${roleId}> ` : "";
  const lines = [
    `${ping}🍺 Ô gueux, rangez vos chopines : **La Patronne** ouvre les tonneaux en direct !`,
    `${ping}📯 Ôyez, ôyez ! La Taverne s’anime, **La Patronne** est EN LIVE !`,
    `${ping}🔥 Sortez les chopes et cachez les marmots : **La Patronne** crie plus fort que vos estomacs !`,
    `${ping}🎺 Approchez, tas de feignasses ! **La Patronne** sert le spectacle avec de la mousse !`,
  ];
  return lines[Math.floor(Math.random() * lines.length)];
}

async function sendDiscordAnnouncement(client: Client, stream: TwitchStream): Promise<boolean> {
  const channelId = process.env.CHANNEL_ID?.trim();
  if (!channelId) {
    log.warn("TWITCH", "Annonce Discord ignorée: CHANNEL_ID manquant");
    return false;
  }

  const fetched = client.channels.cache.get(channelId) ?? await client.channels.fetch(channelId).catch(() => null);
  if (!fetched?.isTextBased()) {
    log.warn("TWITCH", `Annonce Discord ignorée: salon ${channelId} introuvable ou non textuel`);
    return false;
  }
  const channel = fetched as TextChannel;
  const url = twitchChannelUrl();
  const thumbnail = stream.thumbnail_url
    ? `${stream.thumbnail_url.replace("{width}x{height}", "1280x720")}?rand=${Date.now()}`
    : undefined;
  const title = stream.title ? `**${stream.title}**\n\n` : "";
  const embed = createLiveEmbed({
    title: "🔴 Live sur Twitch !",
    description: `${title}On débouche les tonneaux → ${url}`,
    url,
    thumbnailUrl: thumbnail,
  });
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setLabel("📺 Voir le live").setURL(url).setStyle(ButtonStyle.Link),
  );
  const roleId = process.env.DISCORD_TWITCH_ROLE_ID?.trim();

  await channel.send({
    content: randomRpMessage(roleId),
    embeds: [embed],
    components: [row],
    allowedMentions: roleId ? { roles: [roleId] } : { parse: [] },
  });
  log.info("TWITCH", `Annonce Discord envoyée pour le stream ${stream.id}`);
  return true;
}

export async function announceTwitchLive(client: Client, stream: TwitchStream): Promise<void> {
  if (isPublishingPaused()) {
    log.info("TWITCH", `Live ${stream.id} détecté, publications bloquées (pause=ON)`);
    return;
  }

  const twitchUser = process.env.TWITCH_USERNAME?.trim() || stream.user_login || "twitch";
  // Le vrai stream.id reste stable pendant tout le live et change au suivant.
  const [discordResult] = await Promise.allSettled([
    sendDiscordAnnouncement(client, stream),
    publishLiveAcrossSocials(twitchUser, stream.id),
  ]);
  if (discordResult.status === "rejected") {
    log.error("TWITCH", "Échec de l'annonce Discord", discordResult.reason);
  }
}

export function announceTwitchEnd(): void {
  log.info("TWITCH", "Stream terminé");
}
