import assert from "node:assert/strict";
import test from "node:test";
import { parseDuration } from "../commands/giveaway.js";
import { getChopeBar } from "../utils/giveawayUI.js";

test("parse les durées du giveaway", () => {
  assert.equal(parseDuration("5m"), 5 * 60 * 1000);
  assert.equal(parseDuration("2h"), 2 * 60 * 60 * 1000);
  assert.equal(parseDuration("1d"), 24 * 60 * 60 * 1000);
  assert.equal(parseDuration("demain"), null);
});

test("la jauge du giveaway reste bornée", () => {
  assert.equal(getChopeBar(0).bar, "░".repeat(10));
  assert.equal(getChopeBar(10).bar, "█".repeat(10));
  assert.equal(getChopeBar(999).bar, "█".repeat(10));
});
