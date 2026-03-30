import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isTradeId, resolveTradeId } from "./resolve-trade";

describe("resolveTradeId", () => {
  it("returns default trade for empty input", () => {
    assert.equal(resolveTradeId(), "kaminfeger");
    assert.equal(resolveTradeId(""), "kaminfeger");
    assert.equal(resolveTradeId("   "), "kaminfeger");
    assert.equal(resolveTradeId(null), "kaminfeger");
  });

  it("returns known trade ids unchanged", () => {
    assert.equal(resolveTradeId("kaminfeger"), "kaminfeger");
    assert.equal(resolveTradeId("maler"), "maler");
    assert.equal(resolveTradeId("shk"), "shk");
  });

  it("resolves configured synonyms to canonical trades", () => {
    assert.equal(resolveTradeId("Schornsteinfeger"), "kaminfeger");
    assert.equal(resolveTradeId("painter"), "maler");
    assert.equal(resolveTradeId("HVAC"), "shk");
    assert.equal(resolveTradeId("sanitär"), "shk");
    assert.equal(resolveTradeId("sanitaer-heizung-klima"), "shk");
  });

  it("falls back to default for unknown identifiers", () => {
    assert.equal(resolveTradeId("electrician"), "kaminfeger");
    assert.equal(resolveTradeId("roofing"), "kaminfeger");
  });
});

describe("isTradeId", () => {
  it("accepts only configured canonical identifiers", () => {
    assert.equal(isTradeId("kaminfeger"), true);
    assert.equal(isTradeId("maler"), true);
    assert.equal(isTradeId("shk"), true);

    assert.equal(isTradeId("painter"), false);
    assert.equal(isTradeId("hvac"), false);
    assert.equal(isTradeId("something-else"), false);
  });
});
