import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { webSessionOutcomeFromChecks } from "./web-session-outcome";

describe("webSessionOutcomeFromChecks", () => {
  it("returns missing_or_expired when token is undefined", () => {
    const r = webSessionOutcomeFromChecks(undefined, false);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.reason, "missing_or_expired");
  });

  it("returns superseded_by_app when token is valid shape but superseded", () => {
    const jwt =
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1MSIsImV4cCI6OTk5OTk5OTk5OX0.signature";
    const r = webSessionOutcomeFromChecks(jwt, true);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.reason, "superseded_by_app");
  });

  it("returns ok with token when not expired and not superseded", () => {
    const jwt =
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1MSIsImV4cCI6OTk5OTk5OTk5OX0.signature";
    const r = webSessionOutcomeFromChecks(jwt, false);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.token, jwt);
  });
});
