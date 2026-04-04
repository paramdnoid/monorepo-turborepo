import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { computeRoomBookTotals } from "./room-book-boq";

describe("room book totals", () => {
  it("treats empty values as zero", () => {
    const totals = computeRoomBookTotals([
      {
        id: "room-1",
        lines: [{ id: "line-1", quantity: "", unit: "m2", unitPriceEur: "" }],
      },
    ]);
    assert.equal(totals.overallTotal, 0);
    assert.equal(totals.byRoom[0]?.roomTotal, 0);
  });

  it("aggregates totals and quantities per unit", () => {
    const totals = computeRoomBookTotals([
      {
        id: "room-1",
        lines: [
          { id: "l1", quantity: "10", unit: "m2", unitPriceEur: "12.5" },
          { id: "l2", quantity: "4", unit: "h", unitPriceEur: "35" },
        ],
      },
      {
        id: "room-2",
        lines: [{ id: "l3", quantity: "5", unit: "m2", unitPriceEur: "10" }],
      },
    ]);

    assert.equal(totals.overallTotal, 315);
    assert.equal(totals.overallQuantitiesByUnit.get("m2"), 15);
    assert.equal(totals.overallQuantitiesByUnit.get("h"), 4);
  });
});
