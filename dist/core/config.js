import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
function firstValue(names, fallback = "") {
    for (const name of names) {
        const value = process.env[name]?.trim();
        if (value)
            return value;
    }
    return fallback;
}
export function envFlag(name, fallback = false) {
    const raw = process.env[name]?.trim().toLowerCase();
    if (raw === undefined || raw === "")
        return fallback;
    return ["1", "true", "yes", "on"].includes(raw);
}
export const discordIds = Object.freeze({
    adminRole: firstValue(["ADMIN_ROLE_ID"], "837442801599512607"),
    giveawayChannel: firstValue(["GIVEAWAY_CHANNEL_ID", "GIVEAWAYS_CHANNEL_ID"], "1123654628681199677"),
    gueuxRole: firstValue(["GUEUX_ROLE_ID"], "872399675091714058"),
    welcomeChannel: firstValue(["WELCOME_CHANNEL_ID"], "837135924390264855"),
    presentationChannel: firstValue(["PRESENTATION_CHANNEL_ID"], "871362324668227624"),
    rolesChannel: firstValue(["ROLES_CHANNEL_ID", "ROLES_PANEL_CHANNEL_ID"], "845580188339404800"),
    rulesMessage: firstValue(["RULE_MESSAGE_ID"], "881639401732579349"),
});
const allPresent = (names) => names.every(name => Boolean(process.env[name]?.trim()));
const definitions = {
    discord: {
        label: "Discord",
        required: ["DISCORD_TOKEN|TOKEN"],
        enabled: () => true,
    },
    ollama: {
        label: "IA locale Ollama",
        required: ["OLLAMA_MODEL"],
        enabled: () => envFlag("OLLAMA_ENABLED", false),
    },
    giveaways: { label: "Giveaways", enabled: () => true },
    twitch: {
        label: "Twitch live",
        required: ["TWITCH_CLIENT_ID", "TWITCH_CLIENT_SECRET", "TWITCH_USERNAME", "CHANNEL_ID"],
        enabled: () => envFlag("TWITCH_ENABLED"),
    },
    twitter: {
        label: "X / Twitter",
        required: ["TWITTER_API_KEY", "TWITTER_API_SECRET", "TWITTER_ACCESS_TOKEN", "TWITTER_ACCESS_SECRET"],
        enabled: () => envFlag("TWITTER_ENABLED"),
    },
    facebook: {
        label: "Facebook",
        required: ["FB_PAGE_ID", "FB_PAGE_TOKEN"],
        enabled: () => envFlag("FACEBOOK_ENABLED", allPresent(["FB_PAGE_ID", "FB_PAGE_TOKEN"])),
    },
    bluesky: {
        label: "Bluesky",
        required: ["BSKY_IDENTIFIER", "BSKY_PASSWORD"],
        enabled: () => envFlag("BLUESKY_ENABLED", allPresent(["BSKY_IDENTIFIER", "BSKY_PASSWORD"])),
    },
    threads: {
        label: "Threads",
        required: ["THREADS_ACCESS_TOKEN"],
        enabled: () => envFlag("THREADS_ENABLED", Boolean(process.env.THREADS_ACCESS_TOKEN?.trim())),
    },
    youtube: {
        label: "YouTube",
        required: ["CHANNEL_ID"],
        anyOf: ["YOUTUBE_RSS_URL", "YOUTUBE_CHANNEL_ID"],
        enabled: () => envFlag("YOUTUBE_ENABLED", true),
    },
    clips: {
        label: "Twitch clips",
        required: ["TWITCH_CLIENT_ID", "TWITCH_CLIENT_SECRET", "TWITCH_USERNAME", "DISCORD_CLIPS_CHANNEL_ID"],
        enabled: () => envFlag("TWITCH_CLIPS_ENABLED"),
    },
    anniversaires: {
        label: "Anniversaires",
        required: ["ANNIV_CHANNEL_ID", "GOOGLE_SHEET_ID"],
        anyOf: ["GOOGLE_API_KEY", "data/credentials.json"],
        enabled: () => envFlag("ANNIV_ENABLED", true),
    },
    tiktok: {
        label: "TikTok auto",
        enabled: () => envFlag("TIKTOK_AUTOCONVERT_ENABLED"),
    },
    mardi: {
        label: "GIF du mardi",
        enabled: () => envFlag("MARDI_GIF_ENABLED", true),
    },
};
const runtimeStates = new Map();
function isPresent(name) {
    if (name === "DISCORD_TOKEN|TOKEN") {
        return Boolean(process.env.DISCORD_TOKEN?.trim() || process.env.TOKEN?.trim());
    }
    if (name === "data/credentials.json") {
        return fs.existsSync(path.resolve(process.cwd(), name));
    }
    return Boolean(process.env[name]?.trim());
}
export function serviceReadiness(key) {
    const definition = definitions[key];
    const enabled = definition.enabled();
    const missing = (definition.required ?? []).filter(name => !isPresent(name));
    if (definition.anyOf?.length && !definition.anyOf.some(isPresent)) {
        missing.push(definition.anyOf.join(" ou "));
    }
    return {
        key,
        label: definition.label,
        enabled,
        missing,
        ready: enabled && missing.length === 0,
        runtime: runtimeStates.get(key),
    };
}
export function markService(key, state, detail) {
    runtimeStates.set(key, { state, detail });
}
export function serviceStatusLines() {
    return Object.keys(definitions).map(key => {
        const service = serviceReadiness(key);
        if (!service.enabled)
            return `• ${service.label}: ⚫ désactivé`;
        if (service.missing.length)
            return `• ${service.label}: 🟠 configuration incomplète`;
        if (service.runtime?.state === "error")
            return `• ${service.label}: 🔴 erreur`;
        if (service.runtime?.state === "running")
            return `• ${service.label}: 🟢 actif`;
        return `• ${service.label}: 🟡 prêt`;
    });
}
export function discordToken() {
    return process.env.DISCORD_TOKEN?.trim() || process.env.TOKEN?.trim();
}
