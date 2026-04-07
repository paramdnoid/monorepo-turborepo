import assert from "node:assert/strict";
import { test } from "node:test";

import { datevExportBookingsQuerySchema } from "./datev.js";

test("datevExportBookingsQuerySchema parses base params", () => {
  const parsed = datevExportBookingsQuerySchema.safeParse({
    from: "2026-04-01",
    to: "2026-04-30",
  });
  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.equal(parsed.data.from, "2026-04-01");
  assert.equal(parsed.data.to, "2026-04-30");
  assert.equal(parsed.data.strict, undefined);
  assert.equal(parsed.data.dryRun, undefined);
});

test("datevExportBookingsQuerySchema accepts strict/dryRun flags", () => {
  const parsed = datevExportBookingsQuerySchema.safeParse({
    from: "2026-04-01",
    to: "2026-04-30",
    strict: "1",
    dryRun: "true",
  });
  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.equal(parsed.data.strict, "1");
  assert.equal(parsed.data.dryRun, "true");
});

test("datevExportBookingsQuerySchema rejects invalid flags", () => {
  const parsed = datevExportBookingsQuerySchema.safeParse({
    from: "2026-04-01",
    to: "2026-04-30",
    strict: "yes",
  });
  assert.equal(parsed.success, false);
});

