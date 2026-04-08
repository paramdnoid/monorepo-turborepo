import assert from "node:assert/strict";
import { test } from "node:test";

import { mockSearchResponse } from "./outbound.js";

test("mockSearchResponse filters by query", () => {
  const all = mockSearchResponse("");
  assert.equal(all.hits.length >= 1, true);
  const filtered = mockSearchResponse("GH-10001");
  assert.equal(filtered.hits.length, 1);
  assert.equal(filtered.hits[0]?.sku, "GH-10001");
});

test("mockSearchResponse returns empty when no match", () => {
  const r = mockSearchResponse("zzzz-no-match-zzzz");
  assert.equal(r.hits.length, 0);
  assert.equal(r.nextCursor, null);
});
