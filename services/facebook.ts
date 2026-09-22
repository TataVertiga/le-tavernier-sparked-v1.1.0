// services/facebook.ts
import { messageFor } from "./templates.js";
import { alreadyPosted, rememberPosted } from "../utils/postMemory.js";

const FB_PAGE_ID = process.env.FB_PAGE_ID as string;
const FB_PAGE_TOKEN = process.env.FB_PAGE_TOKEN as string;
const requestedGraphVersion = process.env.META_GRAPH_VERSION?.trim() || "v24.0";
const GRAPH_VERSION = /^v\d+\.\d+$/.test(requestedGraphVersion) ? requestedGraphVersion : "v24.0";

/** Publie un post texte sur la Page Facebook (endpoint /feed). */
export async function publierPostFacebook(message: string): Promise<string> {
  if (!FB_PAGE_ID || !FB_PAGE_TOKEN) {
    throw new Error("[FACEBOOK] FB_PAGE_ID ou FB_PAGE_TOKEN manquant dans .env");
  }

  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${FB_PAGE_ID}/feed`, {
    method: "POST",
    signal: AbortSignal.timeout(15_000),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ message, access_token: FB_PAGE_TOKEN }),
  });

  const data: any = await res.json();

  if (!res.ok || !data?.id) {
    const msg = data?.error?.message ?? JSON.stringify(data);
    throw new Error(`[FACEBOOK] API error: ${msg}`);
  }

  console.log("[FACEBOOK] ✅ Post publié:", data.id);
  return String(data.id);
}

/** Wrapper: pioche un template + évite le doublon pour un live donné. */
export async function publierFacebookDepuisTemplate(twitchUser: string, liveId: string) {
  if (alreadyPosted("facebook", liveId)) {
    console.log("[FACEBOOK] ⏭️ déjà posté pour ce live:", liveId);
    return { status: "duplicate" as const };
  }
  const msg = messageFor("facebook", twitchUser);
  const postId = await publierPostFacebook(msg);
  rememberPosted("facebook", liveId);
  return { status: "posted" as const, postId };
}
