// src/services/twitch.ts
// Basé sur Helix (App Access Token) — pas besoin d'OAuth user.
// Node >=18: fetch global dispo.
import { setTimeout as sleep } from "node:timers/promises";
import { envFlag } from "../core/config.js";
const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID || "";
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET || "";
const TWITCH_USERNAME = (process.env.TWITCH_USERNAME || "").toLowerCase();
const ENABLED = envFlag("TWITCH_ENABLED");
const configuredInterval = Number(process.env.TWITCH_CHECK_EVERY ?? 60);
const INTERVAL_SEC = Number.isFinite(configuredInterval)
    ? Math.max(15, configuredInterval)
    : 60;
let token = null;
let broadcasterId = "";
let wasLive = false;
let readyLogged = false;
// ----- HTTP helpers
async function ensureToken() {
    const needs = !token || Date.now() - token.obtained_at > (token.expires_in - 60) * 1000;
    if (needs) {
        const url = new URL("https://id.twitch.tv/oauth2/token");
        url.searchParams.set("client_id", TWITCH_CLIENT_ID);
        url.searchParams.set("client_secret", TWITCH_CLIENT_SECRET);
        url.searchParams.set("grant_type", "client_credentials");
        const res = await fetch(url, { method: "POST", signal: AbortSignal.timeout(15_000) });
        if (!res.ok)
            throw new Error(`[TWITCH] Token error ${res.status}`);
        const data = (await res.json());
        token = { access_token: data.access_token, expires_in: data.expires_in, obtained_at: Date.now() };
    }
    return token;
}
async function twitchFetch(url) {
    const tk = await ensureToken();
    const res = await fetch(url, {
        signal: AbortSignal.timeout(15_000),
        headers: {
            "Client-ID": TWITCH_CLIENT_ID,
            "Authorization": `Bearer ${tk.access_token}`,
        },
    });
    if (!res.ok) {
        const text = await res.text();
        if (res.status === 401)
            token = null;
        throw new Error(`[TWITCH] HTTP ${res.status} ${res.statusText} – ${text}`);
    }
    return (await res.json());
}
async function resolveBroadcasterId() {
    const json = await twitchFetch(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(TWITCH_USERNAME)}`);
    const user = json.data[0];
    if (!user)
        throw new Error(`[TWITCH] user not found: ${TWITCH_USERNAME}`);
    return user.id;
}
async function getLive() {
    const json = await twitchFetch(`https://api.twitch.tv/helix/streams?user_id=${broadcasterId}`);
    const stream = json.data[0];
    if (!stream || stream.type !== "live")
        return null;
    return stream;
}
export function twitchChannelUrl() {
    return `https://twitch.tv/${TWITCH_USERNAME}`;
}
export async function startTwitchWatcher(handlers = {}) {
    if (!ENABLED)
        return;
    while (true) {
        try {
            // La résolution et l'authentification restent dans la boucle : un timeout
            // au démarrage ne peut plus désactiver Twitch jusqu'au prochain reboot.
            if (!broadcasterId)
                broadcasterId = await resolveBroadcasterId();
            await ensureToken();
            if (!readyLogged) {
                console.log(`[TWITCH] Ready for ${TWITCH_USERNAME} (id ${broadcasterId})`);
                readyLogged = true;
            }
            const live = await getLive();
            const isLive = !!live;
            await handlers.onHealthy?.();
            if (isLive && !wasLive) {
                wasLive = true;
                if (handlers.onStart)
                    await handlers.onStart(live);
            }
            else if (!isLive && wasLive) {
                wasLive = false;
                if (handlers.onEnd)
                    await handlers.onEnd();
            }
            else if (handlers.onTick) {
                await handlers.onTick(isLive);
            }
        }
        catch (e) {
            console.error("[TWITCH] loop error:", e);
            await handlers.onError?.(e);
        }
        await sleep(INTERVAL_SEC * 1000);
    }
}
