// services/threads.ts
import { messageFor } from "./templates.js";
import { alreadyPosted, rememberPosted } from "../utils/postMemory.js";

const THREADS_TOKEN = process.env.THREADS_ACCESS_TOKEN as string;

/**
 * Publie un post TEXTE sur Threads en 1 appel.
 * POST /v1.0/me/threads?media_type=TEXT&auto_publish_text=true
 */
export async function publierPostThreads(text: string): Promise<string> {
  if (!THREADS_TOKEN) {
    throw new Error("[THREADS] THREADS_ACCESS_TOKEN manquant dans .env");
  }

  const endpoint = "https://graph.threads.net/v1.0/me/threads";
  const params = new URLSearchParams({
    media_type: "TEXT",
    text,
    auto_publish_text: "true",
    access_token: THREADS_TOKEN,
  });

  const res = await fetch(`${endpoint}?${params.toString()}`, {
    method: "POST",
    signal: AbortSignal.timeout(15_000),
  });
  const data: any = await res.json();

  if (!res.ok) {
    const msg = data?.error?.message ?? JSON.stringify(data);
    throw new Error(`[THREADS] API error: ${msg}`);
  }

  const id = data?.id ?? data?.creation_id ?? "unknown";
  console.log("[THREADS] ✅ Post publié:", id);
  return String(id);
}

/** Wrapper: pioche un template + évite le doublon pour un live donné. */
export async function publierThreadsDepuisTemplate(twitchUser: string, liveId: string) {
  if (alreadyPosted("threads", liveId)) {
    console.log("[THREADS] ⏭️ déjà posté pour", liveId);
    return { status: "duplicate" as const };
  }
  const msg = messageFor("threads", twitchUser);
  const postId = await publierPostThreads(msg);
  rememberPosted("threads", liveId);
  return { status: "posted" as const, postId };
}
