// services/bluesky.ts
import { BskyAgent, RichText } from "@atproto/api";
import { messageFor } from "./templates.js";
import { alreadyPosted, rememberPosted } from "../utils/postMemory.js";

const BSKY_SERVICE = process.env.BSKY_SERVICE ?? "https://bsky.social";
const BSKY_IDENTIFIER = process.env.BSKY_IDENTIFIER as string;
const BSKY_PASSWORD = process.env.BSKY_PASSWORD as string;

let agent: BskyAgent | null = null;

async function getAgent(): Promise<BskyAgent> {
  if (agent) return agent;
  if (!BSKY_IDENTIFIER || !BSKY_PASSWORD) {
    throw new Error("[BLUESKY] BSKY_IDENTIFIER ou BSKY_PASSWORD manquant dans .env");
  }
  agent = new BskyAgent({ service: BSKY_SERVICE });
  await agent.login({ identifier: BSKY_IDENTIFIER, password: BSKY_PASSWORD });
  return agent;
}

/** Publie un statut texte sur Bluesky. Retourne l’URL publique du post. */
export async function publierPostBluesky(text: string): Promise<string> {
  const a = await getAgent();
  try {
    // Facets pour rendre les URLs cliquables
    const rt = new RichText({ text });
    await rt.detectFacets(a);

    const res = await a.post({
      text: rt.text,
      facets: rt.facets,
    });

    const rkey = res.uri.split("/").pop()!;
    const did = a.session?.did;
    const url = did ? `https://bsky.app/profile/${did}/post/${rkey}` : res.uri;
    console.log("[BLUESKY] ✅ Post:", url);
    return url;
  } catch (e: any) {
    const msg = e?.message ?? JSON.stringify(e);
    console.error("[BLUESKY] ❌", msg);
    throw new Error(`[BLUESKY] API error: ${msg}`);
  }
}

/** Wrapper: pioche un template + évite le doublon pour un live donné. */
export async function publierBlueskyDepuisTemplate(twitchUser: string, liveId: string) {
  if (alreadyPosted("bluesky", liveId)) {
    console.log("[BLUESKY] ⏭️ déjà posté pour", liveId);
    return { status: "duplicate" as const };
  }
  const msg = messageFor("bluesky", twitchUser);
  const postUrl = await publierPostBluesky(msg);
  rememberPosted("bluesky", liveId);
  return { status: "posted" as const, postId: postUrl };
}
