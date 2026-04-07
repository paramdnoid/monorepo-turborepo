import assert from "node:assert/strict";
import { test } from "node:test";

import {
  meResponseSchema,
  organizationPatchRequestSchema,
} from "./me.js";

test("meResponseSchema parses extended organization", () => {
  const parsed = meResponseSchema.safeParse({
    sub: "user-1",
    tenantId: "tenant-a",
    organization: {
      id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      name: "Acme GmbH",
      tradeSlug: "maler",
      senderAddress: "Hauptstr. 1\n12345 Berlin",
      senderStreet: "Hauptstr.",
      senderHouseNumber: "1",
      senderPostalCode: "12345",
      senderCity: "Berlin",
      senderCountry: "DE",
      senderLatitude: 52.52,
      senderLongitude: 13.405,
      vatId: "DE123456789",
      taxNumber: "12/345/67890",
      hasLogo: true,
    },
  });
  assert.equal(parsed.success, true);
});

test("organizationPatchRequestSchema accepts clearLogo", () => {
  const parsed = organizationPatchRequestSchema.safeParse({ clearLogo: true });
  assert.equal(parsed.success, true);
});

test("organizationPatchRequestSchema accepts sender coords together", () => {
  const parsed = organizationPatchRequestSchema.safeParse({
    senderLatitude: 52.52,
    senderLongitude: 13.405,
  });
  assert.equal(parsed.success, true);
});

test("organizationPatchRequestSchema rejects partial sender coords", () => {
  const parsed = organizationPatchRequestSchema.safeParse({
    senderLatitude: 52.52,
  });
  assert.equal(parsed.success, false);
});
