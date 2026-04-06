import assert from "node:assert/strict";
import { test } from "node:test";

import {
  projectCreateRequestSchema,
  projectPatchRequestSchema,
  projectsListResponseSchema,
} from "./entities/project.js";

test("projectsListResponseSchema parses enriched project list", () => {
  const parsed = projectsListResponseSchema.safeParse({
    projects: [
      {
        id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        title: "Projekt Alpha",
        projectNumber: "P-2026-001",
        status: "active",
        customerId: "95ea4cf4-3b30-4fce-a8f1-95f35fce7d11",
        siteAddressId: "2ed5f939-d53f-4b44-92fc-90dbf6e78aa1",
        customerLabel: "Musterkunde GmbH",
        startDate: "2026-04-01",
        endDate: "2026-05-15",
        archivedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    total: 1,
  });
  assert.equal(parsed.success, true);
});

test("projectCreateRequestSchema rejects start after end", () => {
  const parsed = projectCreateRequestSchema.safeParse({
    title: "Projekt Beta",
    startDate: "2026-06-01",
    endDate: "2026-05-01",
  });
  assert.equal(parsed.success, false);
});

test("projectCreateRequestSchema rejects siteAddressId without customerId", () => {
  const parsed = projectCreateRequestSchema.safeParse({
    title: "Projekt Gamma",
    siteAddressId: "2ed5f939-d53f-4b44-92fc-90dbf6e78aa1",
  });
  assert.equal(parsed.success, false);
});

test("projectCreateRequestSchema allows null siteAddressId without customerId", () => {
  const parsed = projectCreateRequestSchema.safeParse({
    title: "Projekt Delta",
    customerId: null,
    siteAddressId: null,
  });
  assert.equal(parsed.success, true);
});

test("projectPatchRequestSchema rejects siteAddressId without customerId", () => {
  const parsed = projectPatchRequestSchema.safeParse({
    siteAddressId: "2ed5f939-d53f-4b44-92fc-90dbf6e78aa1",
  });
  assert.equal(parsed.success, false);
});

test("projectPatchRequestSchema allows clearing siteAddressId without customerId", () => {
  const parsed = projectPatchRequestSchema.safeParse({
    siteAddressId: null,
  });
  assert.equal(parsed.success, true);
});

