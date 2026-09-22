import { markService, serviceReadiness, type ServiceKey } from "../core/config.js";
import { errorMessage, log } from "../core/logger.js";
import { publierBlueskyDepuisTemplate } from "./bluesky.js";
import { publierFacebookDepuisTemplate } from "./facebook.js";
import { publierThreadsDepuisTemplate } from "./threads.js";
import { publierTweetLiveTwitch } from "./twitter.js";

export type SocialPlatform = "twitter" | "facebook" | "bluesky" | "threads";
export type SocialPublishReport = {
  platform: SocialPlatform;
  label: string;
  status: "posted" | "duplicate" | "skipped" | "error";
  detail?: string;
};

const publishers: Record<SocialPlatform, {
  label: string;
  service: ServiceKey;
  publish: (twitchUser: string, liveId: string) => Promise<{ status: "posted" | "duplicate" }>;
}> = {
  twitter: { label: "X / Twitter", service: "twitter", publish: publierTweetLiveTwitch },
  facebook: { label: "Facebook", service: "facebook", publish: publierFacebookDepuisTemplate },
  bluesky: { label: "Bluesky", service: "bluesky", publish: publierBlueskyDepuisTemplate },
  threads: { label: "Threads", service: "threads", publish: publierThreadsDepuisTemplate },
};

export const socialPlatforms = Object.keys(publishers) as SocialPlatform[];

export async function publishLivePost(
  platform: SocialPlatform,
  twitchUser: string,
  liveId: string,
): Promise<SocialPublishReport> {
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
  } catch (error) {
    const detail = errorMessage(error);
    markService(definition.service, "error", detail);
    return { platform, label: definition.label, status: "error", detail };
  }
}

export async function publishLiveAcrossSocials(twitchUser: string, liveId: string) {
  const reports = await Promise.all(
    socialPlatforms.map(platform => publishLivePost(platform, twitchUser, liveId)),
  );

  for (const report of reports) {
    if (report.status === "error") {
      log.error(report.label.toUpperCase(), report.detail ?? "Échec de publication");
    } else if (report.status === "skipped") {
      log.debug(report.label.toUpperCase(), `Publication ignorée (${report.detail})`);
    }
  }
  return reports;
}
