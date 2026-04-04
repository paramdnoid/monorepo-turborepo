import assert from "node:assert/strict";
import { test } from "node:test";

import {
  colorPreferencesPutSchema,
  colorPreferencesResponseSchema,
  notificationPreferencesPutSchema,
  notificationPreferencesResponseSchema,
} from "./settings.js";

test("notificationPreferencesPutSchema accepts booleans only", () => {
  const parsed = notificationPreferencesPutSchema.safeParse({
    productUpdates: true,
    securityAlerts: false,
  });
  assert.equal(parsed.success, true);
});

test("notificationPreferencesResponseSchema parses response payload", () => {
  const parsed = notificationPreferencesResponseSchema.safeParse({
    preferences: {
      productUpdates: true,
      securityAlerts: true,
      updatedAt: new Date().toISOString(),
    },
  });
  assert.equal(parsed.success, true);
});

test("colorPreferencesResponseSchema parses payload", () => {
  const parsed = colorPreferencesResponseSchema.safeParse({
    palette: {
      scope: "user",
      favorites: [{ system: "ral", id: "RAL 1000" }],
      recent: [{ system: "ncs", id: "NCS S 0502-Y" }],
      updatedAt: new Date().toISOString(),
      updatedBySub: null,
    },
    permissions: { canEditTeamPalette: true },
  });
  assert.equal(parsed.success, true);
});

test("colorPreferencesPutSchema rejects duplicates", () => {
  const parsed = colorPreferencesPutSchema.safeParse({
    scope: "team",
    favorites: [
      { system: "ral", id: "RAL 1000" },
      { system: "ral", id: "RAL 1000" },
    ],
    recent: [],
  });
  assert.equal(parsed.success, false);
});

