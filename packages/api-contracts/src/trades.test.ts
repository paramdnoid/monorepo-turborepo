import assert from "node:assert/strict";
import { test } from "node:test";

import { tradeSlugSchema } from "./trades.js";

test("tradeSlugSchema accepts maler", () => {
  assert.equal(tradeSlugSchema.parse("maler"), "maler");
});
