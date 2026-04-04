import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { computeSubstrateRisk } from "./substrate-inspection";

describe("substrate inspection risk", () => {
  it("returns green for uncritical baseline", () => {
    const risk = computeSubstrateRisk({
      underlayType: "plaster",
      underlayOther: "",
      moisture: "dry",
      loadBearing: "good",
      absorbency: "normal",
      contamination: "low",
      cracks: false,
      flaking: false,
      mold: false,
      salts: false,
      testNotes: "",
    });
    assert.equal(risk.level, "green");
    assert.equal(risk.reasons.length, 0);
  });

  it("returns red for severe findings", () => {
    const risk = computeSubstrateRisk({
      underlayType: "concrete",
      underlayOther: "",
      moisture: "damp",
      loadBearing: "poor",
      absorbency: "high",
      contamination: "high",
      cracks: true,
      flaking: true,
      mold: false,
      salts: false,
      testNotes: "",
    });
    assert.equal(risk.level, "red");
    assert.match(risk.reasons.join(" "), /Feuchte/);
    assert.ok(risk.recommendations.length > 0);
  });
});
