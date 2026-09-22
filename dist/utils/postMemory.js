// utils/postMemory.ts
import { readFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import { writeJsonAtomic } from "./jsonFiles.js";
const DIR = path.resolve(process.cwd(), "data");
const FILE = path.join(DIR, "last_posts.json");
function load() {
    if (!existsSync(DIR))
        mkdirSync(DIR, { recursive: true });
    if (!existsSync(FILE))
        return {};
    try {
        const parsed = JSON.parse(readFileSync(FILE, "utf-8"));
        return parsed && typeof parsed === "object" ? parsed : {};
    }
    catch (error) {
        throw new Error(`[POST-MEMORY] data/last_posts.json est illisible; fichier conservé: ${error instanceof Error ? error.message : String(error)}`);
    }
}
function save(store) {
    if (!existsSync(DIR))
        mkdirSync(DIR, { recursive: true });
    writeJsonAtomic(FILE, store);
}
export function alreadyPosted(platform, liveId) {
    const entry = load()[platform];
    // L'identifiant Twitch du stream est unique : pas besoin d'un TTL qui pourrait
    // republier le même live après un redémarrage tardif.
    return entry?.liveId === liveId;
}
export function rememberPosted(platform, liveId) {
    const s = load();
    s[platform] = { liveId, time: Date.now() };
    save(s);
}
