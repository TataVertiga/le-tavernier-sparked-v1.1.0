// services/templates.ts
import { readFileSync } from "fs";
import path from "path";

export type PlatformAll = "twitter" | "facebook" | "bluesky" | "threads";

let cache: Record<PlatformAll, string[]> | null = null;

function loadTemplates(): Record<PlatformAll, string[]> {
  if (cache) return cache;
  const file = path.resolve(process.cwd(), "data", "templates.json");
  const raw = readFileSync(file, "utf-8");
  cache = JSON.parse(raw);
  return cache!;
}

function pick<T>(arr: T[]) { return arr[Math.floor(Math.random() * arr.length)]; }

export function messageFor(platform: PlatformAll, twitchUser: string): string {
  const tpls = loadTemplates();
  const url = `https://twitch.tv/${twitchUser}`;
  return (pick(tpls[platform]) || "{url}").replace("{url}", url);
}

// helpers si besoin ailleurs
export const msgTwitter  = (u: string) => messageFor("twitter", u);
export const msgFacebook = (u: string) => messageFor("facebook", u);
export const msgBluesky  = (u: string) => messageFor("bluesky", u);
export const msgThreads  = (u: string) => messageFor("threads", u);
