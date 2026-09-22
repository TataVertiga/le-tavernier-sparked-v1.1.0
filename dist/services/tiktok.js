// services/tiktok.ts
import axios from "axios";
const OEMBED_ENDPOINT = "https://www.tiktok.com/oembed?url=";
const AXIOS_WEB_HEADERS = {
    // Simule un vrai navigateur pour éviter certains blocs TikTok
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept-Language": "fr,fr-FR;q=0.9,en;q=0.8",
};
function isLikelyTikTokUrl(url) {
    return /(tiktok\.com|vt\.tiktok\.com)/i.test(url);
}
function parseOg(content, prop) {
    const m = content.match(new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, "i")) ||
        content.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`, "i"));
    return m?.[1];
}
function parseAuthorFromUrl(u) {
    try {
        const url = new URL(u);
        // ex: /@pseudo/video/123...
        const seg = url.pathname.split("/").filter(Boolean);
        const at = seg.find((s) => s.startsWith("@"));
        return at ? at.replace(/^@/, "") : undefined;
    }
    catch {
        return undefined;
    }
}
/** Suit les redirections des liens courts vt.tiktok.com */
async function followRedirect(rawUrl) {
    try {
        const resp = await axios.get(rawUrl, { maxRedirects: 5, timeout: 10000, headers: AXIOS_WEB_HEADERS });
        // @ts-ignore
        return resp.request?.res?.responseUrl || resp.request?._redirectable?._currentUrl || rawUrl;
    }
    catch {
        return rawUrl;
    }
}
/** Essaie oEmbed, puis fallback HTML/OG si échec */
export async function fetchTikTokOEmbed(rawUrl) {
    if (!isLikelyTikTokUrl(rawUrl))
        return { url: rawUrl, meta: null };
    // 1) tentative oEmbed directe
    try {
        const { data } = await axios.get(OEMBED_ENDPOINT + encodeURIComponent(rawUrl), {
            timeout: 10000,
            headers: AXIOS_WEB_HEADERS,
        });
        if (data)
            return { url: rawUrl, meta: data };
    }
    catch { }
    // 2) suivre redirection (liens vt.) et retenter oEmbed
    const finalUrl = await followRedirect(rawUrl);
    if (finalUrl !== rawUrl) {
        try {
            const { data } = await axios.get(OEMBED_ENDPOINT + encodeURIComponent(finalUrl), {
                timeout: 10000,
                headers: AXIOS_WEB_HEADERS,
            });
            if (data)
                return { url: finalUrl, meta: data };
        }
        catch { }
    }
    // 3) Fallback : GET HTML + parse OpenGraph
    try {
        const { data: html } = await axios.get(finalUrl, { timeout: 12000, headers: AXIOS_WEB_HEADERS });
        const title = parseOg(html, "og:title") || "Vidéo TikTok";
        const thumbnail_url = parseOg(html, "og:image");
        const authorFromUrl = parseAuthorFromUrl(finalUrl);
        const meta = {
            title,
            thumbnail_url,
            author_name: authorFromUrl ? `@${authorFromUrl}` : undefined,
            author_url: authorFromUrl ? `https://www.tiktok.com/@${authorFromUrl}` : undefined,
        };
        return { url: finalUrl, meta };
    }
    catch {
        // dernier recours : au moins retourner l’URL finale
        return { url: finalUrl, meta: null };
    }
}
