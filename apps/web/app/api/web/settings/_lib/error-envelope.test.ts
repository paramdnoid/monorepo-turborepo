import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { mapSettingsErrorEnvelope } from "./error-envelope";

describe("settings error envelope mapping", () => {
  it("maps 401 to AUTH_SESSION_INVALID", () => {
    const out = mapSettingsErrorEnvelope({
      locale: "de",
      operation: "load",
      status: 401,
    });
    assert.equal(out.code, "AUTH_SESSION_INVALID");
    assert.match(out.detail, /Sitzung/i);
  });

  it("maps tenant_not_provisioned with detail passthrough", () => {
    const out = mapSettingsErrorEnvelope({
      locale: "de",
      operation: "load",
      status: 403,
      apiBodyText: JSON.stringify({
        error: "tenant_not_provisioned",
        detail: "Mandant fehlt in DB.",
      }),
    });
    assert.equal(out.code, "TENANT_NOT_PROVISIONED");
    assert.equal(out.detail, "Mandant fehlt in DB.");
  });

  it("maps validation errors to SETTINGS_VALIDATION_ERROR", () => {
    const out = mapSettingsErrorEnvelope({
      locale: "en",
      operation: "save",
      status: 400,
      apiBodyText: JSON.stringify({ error: "validation_error" }),
    });
    assert.equal(out.code, "SETTINGS_VALIDATION_ERROR");
    assert.match(out.detail, /Invalid input/i);
  });

  it("maps upstream unavailable to UPSTREAM_UNAVAILABLE", () => {
    const out = mapSettingsErrorEnvelope({
      locale: "en",
      operation: "load",
      status: 503,
      apiBodyText: JSON.stringify({ error: "database_unavailable" }),
    });
    assert.equal(out.code, "UPSTREAM_UNAVAILABLE");
    assert.equal(typeof out.hint, "string");
  });
});
