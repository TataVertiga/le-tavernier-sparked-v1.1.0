// services/templates.ts
import { readFileSync } from "fs";
import path from "path";
let cache = null;
function loadTemplates() {
    if (cache)
        return cache;
    const file = path.resolve(process.cwd(), "data", "templates.json");
    const raw = readFileSync(file, "utf-8");
    cache = JSON.parse(raw);
    return cache;
}
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
export function messageFor(platform, twitchUser) {
    const tpls = loadTemplates();
    const url = `https://twitch.tv/${twitchUser}`;
    return (pick(tpls[platform]) || "{url}").replace("{url}", url);
}
// helpers si besoin ailleurs
export const msgTwitter = (u) => messageFor("twitter", u);
export const msgFacebook = (u) => messageFor("facebook", u);
export const msgBluesky = (u) => messageFor("bluesky", u);
export const msgThreads = (u) => messageFor("threads", u);
