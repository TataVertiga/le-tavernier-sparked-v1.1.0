import assert from "node:assert/strict";
import test from "node:test";
import { envFlag, serviceReadiness } from "../core/config.js";

test("envFlag comprend les valeurs usuelles", () => {
  const previous = process.env.TEST_TAVERNIER_FLAG;
  try {
    process.env.TEST_TAVERNIER_FLAG = "ON";
    assert.equal(envFlag("TEST_TAVERNIER_FLAG"), true);
    process.env.TEST_TAVERNIER_FLAG = "false";
    assert.equal(envFlag("TEST_TAVERNIER_FLAG", true), false);
    delete process.env.TEST_TAVERNIER_FLAG;
    assert.equal(envFlag("TEST_TAVERNIER_FLAG", true), true);
  } finally {
    if (previous === undefined) delete process.env.TEST_TAVERNIER_FLAG;
    else process.env.TEST_TAVERNIER_FLAG = previous;
  }
});

test("Twitter signale une configuration incomplète sans révéler les valeurs", () => {
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
    process.env.TWITTER_API_KEY = "secret-value";
    delete process.env.TWITTER_API_SECRET;
    delete process.env.TWITTER_ACCESS_TOKEN;
    delete process.env.TWITTER_ACCESS_SECRET;

    const readiness = serviceReadiness("twitter");
    assert.equal(readiness.enabled, true);
    assert.equal(readiness.ready, false);
    assert.ok(readiness.missing.includes("TWITTER_API_SECRET"));
    assert.ok(!JSON.stringify(readiness).includes("secret-value"));
  } finally {
    for (const name of names) {
      const value = previous[name];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
});
