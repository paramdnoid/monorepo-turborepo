import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  loadNotificationPreferences,
  saveNotificationPreferences,
} from "./notification-preferences-client";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("notification preferences client", () => {
  it("loads preferences successfully", async () => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          preferences: {
            productUpdates: true,
            securityAlerts: false,
            updatedAt: "2026-04-04T12:00:00.000Z",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );

    const result = await loadNotificationPreferences("de");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.preferences.productUpdates, true);
    assert.equal(result.preferences.securityAlerts, false);
  });

  it("returns envelope detail+hint when load fails", async () => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          error: "UPSTREAM_UNAVAILABLE",
          detail: "Einstellungen konnten nicht geladen werden.",
          hint: "Bitte spaeter erneut versuchen.",
        }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      );

    const result = await loadNotificationPreferences("de");
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.error, /Einstellungen konnten nicht geladen werden\./);
    assert.match(result.error, /Bitte spaeter erneut versuchen\./);
  });

  it("saves preferences successfully", async () => {
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          preferences: {
            productUpdates: false,
            securityAlerts: true,
            updatedAt: "2026-04-04T12:05:00.000Z",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );

    const result = await saveNotificationPreferences("de", {
      productUpdates: false,
      securityAlerts: true,
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.preferences.productUpdates, false);
    assert.equal(result.preferences.securityAlerts, true);
  });

  it("returns validation error when save input is invalid", async () => {
    let called = false;
    globalThis.fetch = async () => {
      called = true;
      return new Response("{}", { status: 200 });
    };

    const result = await saveNotificationPreferences("de", {
      productUpdates: true,
      securityAlerts: "nope" as unknown as boolean,
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.error, /Ungueltige Eingaben/);
    assert.equal(called, false);
  });

  it("returns fallback error when network fails", async () => {
    globalThis.fetch = async () => {
      throw new Error("network down");
    };

    const result = await saveNotificationPreferences("en", {
      productUpdates: true,
      securityAlerts: true,
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error, "Saving failed.");
  });
});
