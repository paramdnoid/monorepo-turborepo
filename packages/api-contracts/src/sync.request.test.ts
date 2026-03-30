import assert from "node:assert/strict";
import { test } from "node:test";

import { syncBatchRequestSchema } from "./sync.js";

test("syncBatchRequestSchema ohne tenantId im Body", () => {
  const parsed = syncBatchRequestSchema.safeParse({
    deviceId: "550e8400-e29b-41d4-a716-446655440000",
    mutations: [],
  });
  assert.equal(parsed.success, true);
});
