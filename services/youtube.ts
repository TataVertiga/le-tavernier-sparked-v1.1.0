import axios from "axios";
import fs from "fs";
import path from "path";
import { Client, TextChannel } from "discord.js";
import { buildYouTubeVideoMessage, youtubeRoleId } from "../utils/embedTemplates.js";
import { isPublishingPaused } from "../state/tavernierState.js";
import { writeJsonAtomic } from "../utils/jsonFiles.js";

const DISCORD_CHANNEL_ID = process.env.CHANNEL_ID;
const YT_API = process.env.YOUTUBE_API_KEY; // optionnel
const YT_CHANNEL = process.env.YOUTUBE_CHANNEL_ID;

// Priorité au RSS explicite
const YT_RSS_URL =
  process.env.YOUTUBE_RSS_URL ||
  (YT_CHANNEL ? `https://www.youtube.com/feeds/videos.xml?channel_id=${YT_CHANNEL}` : undefined);

function isValidYoutubeChannelId(v?: string) {
  return typeof v === "string" && v.startsWith("UC") && v.length >= 10;
}

// ---- Persistence: derniers IDs annoncés ----
const lastFile = path.join(process.cwd(), "data", "last_youtube.json");

type LastData = {
  lastIds?: string[];
  lastDate?: string;
};

function getLastData(): LastData {
  if (fs.existsSync(lastFile)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(lastFile, "utf8"));
      return {
        lastIds: Array.isArray(parsed.lastIds) ? parsed.lastIds : [],
        lastDate: parsed.lastDate || undefined,
      };
    } catch {
      return { lastIds: [] };
    }
  }
  return { lastIds: [] };
}

/**
 * ✅ Sauvegarde des 50 derniers IDs annoncés
 * ✅ IMPORTANT: lastDate est ancrée à NOW (pas à la date YouTube)
 *    => empêche le bot de rester “coincé dans le passé” si une vieille vidéo passe une fois.
 */
function saveLastData(videoId: string) {
  const data = getLastData();
  const lastIds = Array.isArray(data.lastIds) ? data.lastIds : [];
  lastIds.unshift(videoId);

  const next: LastData = {
    lastIds: lastIds.slice(0, 50),
    lastDate: new Date().toISOString(),
  };

  writeJsonAtomic(lastFile, next);
}

// ---- RSS parsing (sans dépendance) ----
type RssEntry = {
  videoId: string;
  title: string;
  publishedAt: string;
};

function extractTag(entryXml: string, tag: string) {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = entryXml.match(re);
  return m?.[1]?.trim();
}

function parseYoutubeRss(xml: string): RssEntry[] {
  const entries: RssEntry[] = [];
  const entryRe = /<entry>([\s\S]*?)<\/entry>/gi;

  let m: RegExpExecArray | null;
  while ((m = entryRe.exec(xml))) {
    const entryXml = m[1];

    const videoId = extractTag(entryXml, "yt:videoId") || extractTag(entryXml, "videoId");
    const title = extractTag(entryXml, "title") || "Sans titre";
    const publishedAt = extractTag(entryXml, "published") || ""; // si vide => on ignore plus tard

    if (!videoId) continue;
    entries.push({ videoId, title, publishedAt });
  }

  return entries;
}

// ---- Optional: détails via API (viewCount / channelTitle / thumbs) ----
async function fetchDetails(videoId: string) {
  if (!YT_API) return null;

  const detailsUrl =
    `https://www.googleapis.com/youtube/v3/videos` +
    `?part=statistics,snippet,liveStreamingDetails&key=${encodeURIComponent(YT_API)}` +
    `&id=${encodeURIComponent(videoId)}`;

  const detailsRes = await axios.get(detailsUrl, { timeout: 15_000 });
  const info = detailsRes.data?.items?.[0];
  if (!info) return null;

  const viewCount = info.statistics?.viewCount ? Number(info.statistics.viewCount) : undefined;
  const channelTitle = info.snippet?.channelTitle;
  const bestThumb =
    info.snippet?.thumbnails?.maxres?.url ||
    info.snippet?.thumbnails?.high?.url ||
    info.snippet?.thumbnails?.medium?.url ||
    `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

  return { viewCount, channelTitle, thumbnail: bestThumb, snippetTitle: info.snippet?.title };
}

export async function checkYoutube(client: Client) {
  if (!DISCORD_CHANNEL_ID || !YT_RSS_URL) return;
  if (!process.env.YOUTUBE_RSS_URL && !isValidYoutubeChannelId(YT_CHANNEL)) {
    console.error("[YOUTUBE] YOUTUBE_CHANNEL_ID invalide (attendu UC...).");
    return;
  }
  if (isPublishingPaused()) {
    console.log("[YOUTUBE] Publication différée (pause=ON)");
    return;
  }

  // ✅ Anti-archives: on ne poste rien de plus vieux que X jours
  const MAX_AGE_DAYS = 30;

  try {
    console.log("[YOUTUBE] 🔍 Vérification des nouvelles vidéos...");

    const rssRes = await axios.get(YT_RSS_URL, { responseType: "text", timeout: 15_000 });
    const items = parseYoutubeRss(rssRes.data || "");

    const lastData = getLastData();
    const lastDate = lastData.lastDate ? new Date(lastData.lastDate) : null;
    const now = Date.now();

    for (const it of items) {
      const videoId = it.videoId;
      const publishedAt = it.publishedAt;
      const published = new Date(publishedAt);

      // Si la date est invalide => on ignore (anti-spam RSS)
      if (Number.isNaN(published.getTime())) continue;

      // Anti-archives (ex: si ça date d’1 an, poubelle)
      const ageDays = (now - published.getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays > MAX_AGE_DAYS) continue;

      // Anti-repost: tout ce qui est <= lastDate est ignoré
      if (lastDate && published <= lastDate) continue;

      // Anti-repost: si déjà annoncé (mémoire IDs)
      if ((lastData.lastIds || []).includes(videoId)) continue;

      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const details = await fetchDetails(videoId);

      const viewCount = details?.viewCount;
      const title = details?.snippetTitle || it.title || "Sans titre";
      const channelTitle = details?.channelTitle || "Chaîne";
      const thumbnail_url = details?.thumbnail || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;

      const channel = client.channels.cache.get(DISCORD_CHANNEL_ID) as TextChannel;
      if (!channel) {
        console.error("[YOUTUBE] ❌ Channel Discord introuvable :", DISCORD_CHANNEL_ID);
        return;
      }

      const rolePingId = youtubeRoleId();
      const payload = buildYouTubeVideoMessage({
        url: videoUrl,
        title,
        channelTitle,
        thumbnail_url,
        publishedAt,
        viewCount,
        rolePingId,
      });

      await channel.send(payload);
      console.log("[YOUTUBE] 📢 Nouvelle vidéo YouTube annoncée !");

      // ✅ On sauvegarde l’ID et on ancre la date à maintenant
      saveLastData(videoId);
      break;
    }
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error("[YOUTUBE] ❌ Erreur :", err.message);
    } else {
      console.error("[YOUTUBE] ❌ Erreur inconnue");
    }
  }
}
