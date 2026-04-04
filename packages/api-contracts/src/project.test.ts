import assert from "node:assert/strict";
import { test } from "node:test";

import {
  projectCreateRequestSchema,
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

