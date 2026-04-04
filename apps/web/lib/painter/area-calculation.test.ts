import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { calculateAreaMetrics, rectArea } from "./area-calculation";

describe("area calculation metrics", () => {
  it("handles empty or partial rows without crashing", () => {
    const invalid = rectArea({ lengthM: "", widthM: "2", qty: "1" });
    assert.equal(invalid.valid, false);
    assert.equal(invalid.area, 0);
  });

  it("calculates area, liters, buckets and hours", () => {
    const metrics = calculateAreaMetrics({
      surfaces: [{ lengthM: "5", widthM: "2.5", qty: "2" }],
      deductions: [{ lengthM: "1", widthM: "1.2", qty: "2" }],
      surchargePercent: "10",
      coverageM2PerL: "8",
      coats: "2",
      wastePercent: "10",
      productivityM2PerH: "20",
      setupHours: "0.5",
    });

    assert.equal(metrics.netArea, 22.6);
    assert.equal(metrics.grossArea, 24.860000000000003);
    assert.equal(Math.round(metrics.liters * 100) / 100, 6.84);
    assert.equal(metrics.buckets, 1);
    assert.equal(Math.round(metrics.hours * 100) / 100, 1.74);
  });
});
