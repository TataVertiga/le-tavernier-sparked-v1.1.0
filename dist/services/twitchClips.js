// services/twitchClips.ts
import { setTimeout as sleep } from "node:timers/promises";
import fs from "node:fs/promises";
import path from "node:path";
import { envFlag } from "../core/config.js";
import { writeJsonAtomic } from "../utils/jsonFiles.js";
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID || "";
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET || "";
const TWITCH_USERNAME = (process.env.TWITCH_USERNAME || "").toLowerCase();
const ENABLED = envFlag("TWITCH_CLIPS_ENABLED");
function finiteNumber(value, fallback, minimum) {
    const parsed = Number(value ?? fallback);
    return Number.isFinite(parsed) ? Math.max(minimum, parsed) : fallback;
}
const EVERY_SEC = finiteNumber(process.env.TWITCH_CLIPS_CHECK_EVERY, 300, 60);
const MIN_VIEWS = finiteNumber(process.env.TWITCH_CLIPS_MIN_VIEWS, 0, 0);
const SINCE_HOURS = finiteNumber(process.env.TWITCH_CLIPS_SINCE_HOURS, 6, 1);
const STATE_FILE = path.resolve(process.cwd(), "data", "twitch_clips_state.json");
let token = null;
let broadcasterId = "";
let state = { postedIds: [] };
let stateLoaded = false;
let readyLogged = false;
// ----- tiny logger
const log = {
    info: (...a) => console.log("[CLIPS]", ...a),
    warn: (...a) => console.warn("[CLIPS]", ...a),
    error: (...a) => console.error("[CLIPS]", ...a),
};
// ----- storage
async function loadState() {
    try {
        const buf = await fs.readFile(STATE_FILE, "utf8");
        const parsed = JSON.parse(buf);
        if (!Array.isArray(parsed.postedIds)) {
            throw new Error("postedIds doit être un tableau");
        }
        state = {
            postedIds: parsed.postedIds.filter((id) => typeof id === "string"),
            ...(typeof parsed.lastCheckISO === "string" ? { lastCheckISO: parsed.lastCheckISO } : {}),
        };
    }
    catch (error) {
        if (error.code === "ENOENT") {
            state = { postedIds: [] };
            return;
        }
        throw new Error(`[CLIPS] data/twitch_clips_state.json illisible; fichier conservé: ${error instanceof Error ? error.message : String(error)}`);
    }
}
async function saveState() {
    writeJsonAtomic(STATE_FILE, state);
}
// ----- auth / http
async function ensureToken() {
    if (!token || Date.now() - token.obtained_at > (token.expires_in - 60) * 1000) {
        const url = new URL("https://id.twitch.tv/oauth2/token");
        url.searchParams.set("client_id", TWITCH_CLIENT_ID);
        url.searchParams.set("client_secret", TWITCH_CLIENT_SECRET);
        url.searchParams.set("grant_type", "client_credentials");
        const res = await fetch(url, { method: "POST", signal: AbortSignal.timeout(15_000) });
        if (!res.ok)
            throw new Error(`[CLIPS] token error ${res.status}`);
        const data = await res.json();
        token = { access_token: data.access_token, expires_in: data.expires_in, obtained_at: Date.now() };
    }
    return token;
}
async function twitchFetch(url) {
    const tk = await ensureToken();
    const res = await fetch(url, {
        signal: AbortSignal.timeout(15_000),
        headers: { "Client-ID": TWITCH_CLIENT_ID, "Authorization": `Bearer ${tk.access_token}` },
    });
    if (!res.ok) {
        const text = await res.text();
        if (res.status === 401)
            token = null;
        throw new Error(`[CLIPS] HTTP ${res.status} ${res.statusText} – ${text}`);
    }
    return res.json();
}
async function resolveBroadcasterId() {
    const data = await twitchFetch(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(TWITCH_USERNAME)}`);
    const user = data.data[0];
    if (!user)
        throw new Error(`[TWITCH-CLIPS] user not found: ${TWITCH_USERNAME}`);
    return user.id;
}
async function fetchClipsSince(startISO, endISO) {
    const url = new URL("https://api.twitch.tv/helix/clips");
    url.searchParams.set("broadcaster_id", broadcasterId);
    url.searchParams.set("started_at", startISO);
    url.searchParams.set("ended_at", endISO);
    url.searchParams.set("first", "100"); // max
    const data = await twitchFetch(url.toString());
    // Twitch renvoie parfois par vues; on laisse l’ordre initial, on resortira plus tard
    return data.data ?? [];
}
export async function startTwitchClipsWatcher(handlers = {}) {
    if (!ENABLED)
        return;
    while (true) {
        try {
            if (!stateLoaded) {
                await loadState();
                stateLoaded = true;
            }
            if (!broadcasterId)
                broadcasterId = await resolveBroadcasterId();
            await ensureToken();
            if (!readyLogged) {
                log.info(`clips watcher ready for ${TWITCH_USERNAME} (id ${broadcasterId})`);
                readyLogged = true;
            }
            const now = new Date();
            const since = state.lastCheckISO
                ? new Date(state.lastCheckISO)
                : new Date(now.getTime() - SINCE_HOURS * 3600 * 1000);
            // Fenêtre [since → now]
            const startISO = since.toISOString();
            const endISO = now.toISOString();
            const clips = await fetchClipsSince(startISO, endISO);
            // Ordonner par date croissante (les résultats "broadcaster" sont par vues, pas par date)
            clips.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            let deferredClip = false;
            for (const clip of clips) {
                if (state.postedIds.includes(clip.id))
                    continue;
                if (clip.view_count < MIN_VIEWS)
                    continue;
                // Post
                if (handlers.onClip) {
                    const sent = await handlers.onClip(clip);
                    if (sent === false) {
                        deferredClip = true;
                        continue;
                    }
                }
                state.postedIds.unshift(clip.id);
                state.postedIds = state.postedIds.slice(0, 200);
            }
            // Si une publication a été différée, on conserve la fenêtre pour la
            // retrouver au prochain passage au lieu de perdre définitivement le clip.
            if (!deferredClip)
                state.lastCheckISO = endISO;
            await saveState();
            await handlers.onHealthy?.();
        }
        catch (e) {
            log.error("loop error:", e);
            await handlers.onError?.(e);
        }
        await sleep(EVERY_SEC * 1000);
    }
}
// Petit util pour uniformiser les miniatures (clips n’ont pas toujours {width}x{height})
export function normalizeClipThumbnail(url, w = 1080, h = 608) {
    if (!url)
        return undefined;
    if (url.includes("{width}") || url.includes("{height}")) {
        return url.replace("{width}", String(w)).replace("{height}", String(h)) + `?rand=${Date.now()}`;
    }
    if (url.includes("{width}x{height}")) {
        return url.replace("{width}x{height}", `${w}x${h}`) + `?rand=${Date.now()}`;
    }
    // sinon, tel quel (ajoute un cache-bust)
    return url + `?rand=${Date.now()}`;
}
