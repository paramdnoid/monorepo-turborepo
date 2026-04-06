import assert from "node:assert/strict";
import test from "node:test";

import {
  customerCreateSchema,
  customerPatchSchema,
  customersBatchArchiveRequestSchema,
} from "./customers.js";

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

test("customerCreateSchema accepts payment terms fields", () => {
  const parsed = customerCreateSchema.safeParse({
    displayName: "Musterkunde GmbH",
    paymentTermsDays: 30,
    cashDiscountPercentBps: 250,
    cashDiscountDays: 10,
    reminderLevel1DaysAfterDue: 7,
    reminderLevel2DaysAfterDue: 14,
    reminderLevel3DaysAfterDue: 30,
  });
  assert.equal(parsed.success, true);
});

test("customerPatchSchema accepts clearing payment terms fields", () => {
  const parsed = customerPatchSchema.safeParse({
    paymentTermsDays: null,
    cashDiscountPercentBps: null,
    cashDiscountDays: null,
    reminderLevel1DaysAfterDue: null,
    reminderLevel2DaysAfterDue: null,
    reminderLevel3DaysAfterDue: null,
  });
  assert.equal(parsed.success, true);
});
