import { markService, serviceReadiness } from "../core/config.js";
import { errorMessage, log } from "../core/logger.js";
import { publierBlueskyDepuisTemplate } from "./bluesky.js";
import { publierFacebookDepuisTemplate } from "./facebook.js";
import { publierThreadsDepuisTemplate } from "./threads.js";
import { publierTweetLiveTwitch } from "./twitter.js";
const publishers = {
    twitter: { label: "X / Twitter", service: "twitter", publish: publierTweetLiveTwitch },
    facebook: { label: "Facebook", service: "facebook", publish: publierFacebookDepuisTemplate },
    bluesky: { label: "Bluesky", service: "bluesky", publish: publierBlueskyDepuisTemplate },
    threads: { label: "Threads", service: "threads", publish: publierThreadsDepuisTemplate },
};
export const socialPlatforms = Object.keys(publishers);
export async function publishLivePost(platform, twitchUser, liveId) {
    const definition = publishers[platform];
    const readiness = serviceReadiness(definition.service);
    if (!readiness.enabled) {
        return { platform, label: definition.label, status: "skipped", detail: "désactivé" };
    }
    if (readiness.missing.length) {
        const detail = `configuration incomplète (${readiness.missing.join(", ")})`;
        markService(definition.service, "error", detail);
        return { platform, label: definition.label, status: "error", detail };
    }
    try {
        const result = await definition.publish(twitchUser, liveId);
        markService(definition.service, "running");
        return { platform, label: definition.label, status: result.status };
    }
    catch (error) {
        const detail = errorMessage(error);
        markService(definition.service, "error", detail);
        return { platform, label: definition.label, status: "error", detail };
    }
}
export async function publishLiveAcrossSocials(twitchUser, liveId) {
    const reports = await Promise.all(socialPlatforms.map(platform => publishLivePost(platform, twitchUser, liveId)));
    for (const report of reports) {
        if (report.status === "error") {
            log.error(report.label.toUpperCase(), report.detail ?? "Échec de publication");
        }
        else if (report.status === "skipped") {
            log.debug(report.label.toUpperCase(), `Publication ignorée (${report.detail})`);
        }
    }
    return reports;
}
