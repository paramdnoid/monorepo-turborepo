import assert from "node:assert/strict";
import test from "node:test";

import { customersBatchArchiveRequestSchema } from "./customers.js";

test("customers batch request accepts category-only updates", () => {
  const parsed = customersBatchArchiveRequestSchema.safeParse({
    customerIds: ["2ee7c687-cc65-4a3f-a5cb-fec598b65bff"],
    category: "A-Kunde",
  });
  assert.equal(parsed.success, true);
});

test("customers batch request rejects empty action payload", () => {
  const parsed = customersBatchArchiveRequestSchema.safeParse({
    customerIds: ["2ee7c687-cc65-4a3f-a5cb-fec598b65bff"],
  });
  assert.equal(parsed.success, false);
});
