import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  time,
  TimestampStyles,
} from "discord.js";

/* ===============================================================
   BRAND / CONSTANTES
   =============================================================== */
const BRAND = {
  tavernGold: 0xd4af37,          // or de taverne
  twitchColor: 0x9146ff,         // violet Twitch
  youtubeRed: 0xff0000,          // rouge YouTube
  tiktokRed: 0xEE1D52,           // rouge TikTok
  twitchIcon: process.env.TWITCH_LOGO_URL || "https://i.imgur.com/WAM26So.png",
  youtubeIcon: "https://i.imgur.com/nnp9OHj.png",
  tavernIcon: process.env.TAVERN_ICON_URL || "https://i.imgur.com/WAM26So.png",
  tiktokIcon: process.env.TIKTOK_ICON_URL || "https://i.imgur.com/DQRq5q4.png",
};

function formatViews(n?: number) {
  if (typeof n !== "number") return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

/* ===============================================================
   EMBEDS SIMPLES (compat avec index.ts existant)
   =============================================================== */
export function createLiveEmbed(args: {
  title: string;
  description: string;
  url: string;
  thumbnailUrl?: string;
}) {
  const { title, description, url, thumbnailUrl } = args;
  const embed = new EmbedBuilder()
    .setColor(BRAND.tavernGold)
    .setAuthor({ name: "Twitch • En direct", iconURL: BRAND.twitchIcon })
    .setTitle(title)
    .setURL(url)
    .setDescription(description)
    .setFooter({
      text: "La Taverne — Un live, une chope, zéro dignité",
      iconURL: BRAND.tavernIcon,
    });

  if (thumbnailUrl) embed.setImage(thumbnailUrl);
  return embed;
}

export function createClipEmbed(args: {
  title?: string;
  url: string;
  thumbnailUrl?: string;
  broadcasterName?: string;
  creatorName?: string;
  viewCount?: number;
  createdAtISO?: string;
}) {
  const {
    title,
    url,
    thumbnailUrl,
    broadcasterName,
    creatorName,
    viewCount,
    createdAtISO,
  } = args;

  const created = createdAtISO ? new Date(createdAtISO) : undefined;

  const embed = new EmbedBuilder()
    .setColor(BRAND.twitchColor)
    .setAuthor({ name: "Twitch • Clip", iconURL: BRAND.twitchIcon })
    .setTitle((title || "").trim() || "🎬 Nouveau clip !")
    .setURL(url)
    .setDescription(
      [
        `🍺 **${broadcasterName || "Un gueux"}** s’est fait trancher net !`,
        creatorName ? `✂️ Clip forgé par **${creatorName}**.` : null,
        `> “Encore une tournée ? … *et un ralentiiii…*”`,
      ]
        .filter(Boolean)
        .join("\n")
    )
    .setFooter({
      text:
        `👀 ${formatViews(viewCount)} vues` +
        (created ? ` • ${time(created, TimestampStyles.RelativeTime)}` : ""),
      iconURL: BRAND.twitchIcon,
    });

  if (thumbnailUrl) embed.setImage(thumbnailUrl);
  return embed;
}

/* ===============================================================
   BUILDERS COMPLETS (Embed + BOUTONS)
   =============================================================== */
export function buildTwitchLiveMessage(params: {
  channelUrl: string;
  streamTitle: string;
  gameName?: string;
  thumbnail_template_url?: string;
  started_at?: string; // ISO
  displayName: string;
  isMature?: boolean;
  rolePingId?: string | null;
}) {
  const {
    channelUrl,
    streamTitle,
    gameName,
    thumbnail_template_url,
    started_at,
    displayName,
    isMature,
    rolePingId,
  } = params;

  const started = started_at ? new Date(started_at) : undefined;
  const content = rolePingId
    ? `<@&${rolePingId}> 🍻 **${displayName}** ouvre les tonneaux !`
    : `🍻 **${displayName}** ouvre les tonneaux !`;

  const lines = [
    `🏷️ **Titre** : ${streamTitle || "Live mystère & chopines"}`,
    gameName ? `🎮 **Jeu** : ${gameName}` : null,
    started ? `⏱️ **Depuis** : ${time(started, TimestampStyles.RelativeTime)}` : null,
    isMature ? "🔞 **Contenu mature** : cachez les marmots" : null,
    "",
    `> “À la taverne ! Le spectacle se boit frais.”`,
  ].filter(Boolean) as string[];

  const embed = new EmbedBuilder()
    .setColor(BRAND.tavernGold)
    .setAuthor({ name: "Twitch • En direct", iconURL: BRAND.twitchIcon })
    .setTitle(`🍺 ${displayName} est EN LIVE !`)
    .setURL(channelUrl)
    .setDescription(lines.join("\n"))
    .setFooter({
      text: "La Taverne — Un live, une chope, zéro dignité",
      iconURL: BRAND.tavernIcon,
    });

  if (thumbnail_template_url) {
    const img = thumbnail_template_url.replace("{width}x{height}", "1280x720");
    embed.setImage(img);
  }

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setLabel("📺 Voir le live").setStyle(ButtonStyle.Link).setURL(channelUrl),
  );

  return {
    content,
    embeds: [embed],
    components: [row],
    allowedMentions: rolePingId ? { roles: [rolePingId] } : undefined,
  };
}

export function buildTwitchClipMessage(clip: {
  url: string;
  title?: string;
  thumbnail_url?: string;
  view_count?: number;
  created_at?: string; // ISO
  broadcaster_name?: string;
  creator_name?: string;
}) {
  const created = clip.created_at ? new Date(clip.created_at) : undefined;
  const embed = new EmbedBuilder()
    .setColor(BRAND.twitchColor)
    .setAuthor({ name: "Twitch • Clip", iconURL: BRAND.twitchIcon })
    .setTitle(clip.title?.trim() || "🎬 Nouveau clip !")
    .setURL(clip.url)
    .setDescription(
      [
        `🍺 **${clip.broadcaster_name || "Un gueux"}** s’est fait trancher net !`,
        clip.creator_name ? `✂️ Clip forgé par **${clip.creator_name}**.` : null,
        `> “Encore une tournée ? … *et un ralentiiii…*”`,
      ]
        .filter(Boolean)
        .join("\n")
    )
    .setFooter({
      text:
        `👀 ${formatViews(clip.view_count)}` +
        (created ? ` • ${time(created, TimestampStyles.RelativeTime)}` : ""),
      iconURL: BRAND.twitchIcon,
    });

  if (clip.thumbnail_url) embed.setImage(clip.thumbnail_url);

  const cta = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setLabel("🎬 Voir le clip").setStyle(ButtonStyle.Link).setURL(clip.url)
  );

  return { content: undefined, embeds: [embed], components: [cta], allowedMentions: { parse: [] } };
}

export function buildYouTubeVideoMessage(video: {
  url: string;
  title: string;
  channelTitle: string;
  thumbnail_url: string;
  publishedAt?: string; // ISO
  viewCount?: number;
  rolePingId?: string | null;
}) {
  const when = video.publishedAt ? new Date(video.publishedAt) : undefined;

  const content = video.rolePingId
    ? `<@&${video.rolePingId}> 🔔 Nouvelle chope de pixels sur YouTube !`
    : "🔔 Nouvelle chope de pixels sur YouTube !";

  const embed = new EmbedBuilder()
    .setColor(BRAND.youtubeRed)
    .setAuthor({ name: "YouTube • Nouvelle vidéo", iconURL: BRAND.youtubeIcon })
    .setTitle(video.title || "🎥 Nouvelle vidéo !")
    .setURL(video.url)
    .setDescription(
      [
        `📺 **Chaîne** : ${video.channelTitle}`,
        `👀 **Vues** : ${formatViews(video.viewCount)}`,
        when ? `🗓️ Publiée ${time(when, TimestampStyles.RelativeTime)}` : null,
        "",
        `> “Servez-vous, c’est maison — et ça pique un peu.”`,
      ]
        .filter(Boolean)
        .join("\n")
    )
    .setImage(video.thumbnail_url)
    .setFooter({ text: "La Taverne sur YouTube", iconURL: BRAND.youtubeIcon });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setLabel("▶️ Voir la vidéo").setStyle(ButtonStyle.Link).setURL(video.url),
  );

  return {
    content,
    embeds: [embed],
    components: [row],
    allowedMentions: video.rolePingId ? { roles: [video.rolePingId] } : undefined,
  };
}

/* ===============================================================
   TIKTOK — Embed RP + Boutons
   =============================================================== */
export function buildTikTokEmbed(opts: {
  videoUrl: string;
  authorName?: string;
  authorUrl?: string;
  title?: string;
  thumbUrl?: string;
}) {
  const { videoUrl, authorName, authorUrl, title, thumbUrl } = opts;

  const embed = new EmbedBuilder()
    .setColor(BRAND.tiktokRed)
    .setTitle(title || "Vidéo TikTok")
    .setURL(videoUrl)
    .setThumbnail(BRAND.tiktokIcon)
    .setTimestamp(new Date())
    // 👇 description de secours
    .setDescription(
      authorName
        ? `🕺 **${authorName}** a déposé sa danse à la Taverne.\nClique ci-dessous pour la voir.`
        : `🕺 Une danse de gueux a été déposée à la Taverne.\nClique ci-dessous pour la voir.`
    )
    .setFooter({ text: "TikTok • Le Tavernier", iconURL: BRAND.tiktokIcon });

  if (thumbUrl) embed.setImage(thumbUrl);
  if (authorName) {
    embed.setAuthor({ name: authorName, url: authorUrl || undefined, iconURL: BRAND.tiktokIcon });
  }

  return embed;
}

export function buildTikTokButtons(videoUrl: string, authorName?: string, authorUrl?: string) {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel("🍷 Voir le Tiktok")
      .setStyle(ButtonStyle.Link)
      .setURL(videoUrl),
  );

  if (authorUrl) {
    row.addComponents(
      new ButtonBuilder()
        .setLabel(`👤 ${authorName || "Auteur"}`)
        .setStyle(ButtonStyle.Link)
        .setURL(authorUrl),
    );
  }

  return row;
}

/* ===============================================================
   TIKTOK — Message complet (content + embed + boutons + allowedMentions)
   =============================================================== */
export function buildTikTokMessage(opts: {
  videoUrl: string;
  authorName?: string;
  authorUrl?: string;
  title?: string;
  thumbUrl?: string;
  rolePingId?: string | null;
}) {
  const embed = buildTikTokEmbed({
    videoUrl: opts.videoUrl,
    authorName: opts.authorName,
    authorUrl: opts.authorUrl,
    title: opts.title,
    thumbUrl: opts.thumbUrl,
  });

  const row = buildTikTokButtons(opts.videoUrl, opts.authorName, opts.authorUrl);

  const content = opts.rolePingId
    ? `<@&${opts.rolePingId}> 🎵 Nouveau TikTok vient d’arriver à la Taverne !`
    : `🎵 Nouveau TikTok vient d’arriver à la Taverne !`;

  return {
    content,
    embeds: [embed],
    components: [row],
    allowedMentions: opts.rolePingId ? { roles: [opts.rolePingId] } : undefined,
  };
}

/* ===============================================================
   HELPERS
   =============================================================== */
export const twitchRoleId = () => process.env.DISCORD_TWITCH_ROLE_ID ?? null;
export const youtubeRoleId = () => process.env.DISCORD_YOUTUBE_ROLE_ID ?? null;
export const tiktokRoleId = () => process.env.TIKTOK_ROLE_ID ?? null;
