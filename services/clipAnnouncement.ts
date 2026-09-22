import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type Client,
  type TextChannel,
} from "discord.js";
import { log } from "../core/logger.js";
import { isPublishingPaused } from "../state/tavernierState.js";
import { createClipEmbed } from "../utils/embedTemplates.js";
import { normalizeClipThumbnail, type TwitchClip } from "./twitchClips.js";

export async function announceTwitchClip(client: Client, clip: TwitchClip): Promise<boolean> {
  if (isPublishingPaused()) {
    log.info("CLIPS", `Clip ${clip.id} différé (pause=ON)`);
    return false;
  }

  const channelId = process.env.DISCORD_CLIPS_CHANNEL_ID?.trim();
  if (!channelId) {
    log.warn("CLIPS", "DISCORD_CLIPS_CHANNEL_ID manquant; clip conservé pour un nouvel essai");
    return false;
  }
  const fetched = client.channels.cache.get(channelId) ?? await client.channels.fetch(channelId).catch(() => null);
  if (!fetched?.isTextBased()) {
    log.warn("CLIPS", `Salon ${channelId} introuvable ou non textuel; clip conservé pour un nouvel essai`);
    return false;
  }

  const embed = createClipEmbed({
    title: clip.title,
    url: clip.url,
    thumbnailUrl: normalizeClipThumbnail(clip.thumbnail_url),
    creatorName: clip.creator_name,
    viewCount: clip.view_count,
  });
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setLabel("🎬 Voir le clip").setURL(clip.url).setStyle(ButtonStyle.Link),
  );
  await (fetched as TextChannel).send({ embeds: [embed], components: [row] });
  log.info("CLIPS", `Clip envoyé: ${clip.id}`);
  return true;
}
