import assert from "node:assert/strict";
import test from "node:test";
import { publierTweetLiveTwitch } from "../services/twitter.js";

test("Twitter propage une erreur d'authentification au lieu d'annoncer un faux succès", async () => {
  const names = [
    "TWITTER_ENABLED",
    "TWITTER_API_KEY",
    "TWITTER_API_SECRET",
    "TWITTER_ACCESS_TOKEN",
    "TWITTER_ACCESS_SECRET",
  ] as const;
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));

  try {
    process.env.TWITTER_ENABLED = "true";
    for (const name of names.slice(1)) delete process.env[name];
    await assert.rejects(
      () => publierTweetLiveTwitch("tata", "stream-test"),
      /Clés OAuth incomplètes/,
    );
  } finally {
    for (const name of names) {
      const value = previous[name];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
