import assert from "node:assert/strict";
import test from "node:test";

import { buildDatevBookingsCsv } from "./bookings-csv.js";

test("buildDatevBookingsCsv: one invoice row and header", () => {
  const csv = buildDatevBookingsCsv({
    currency: "EUR",
    debtorAccount: "1200",
    revenueAccount: "8400",
    vatKey: "9",
    invoices: [
      {
        documentNumber: "R-2026-1",
        totalCents: 11900,
        postingDate: "2026-03-15",
        description: "Rechnung R-2026-1",
      },
    ],
  });
  assert.ok(csv.includes("Umsatz (ohne Soll/Haben-Kz);Sollkonto;"));
  assert.ok(csv.includes("119,00;1200;8400;9;15.03.2026;R-2026-1;"));
  assert.ok(csv.includes("EUR"));
});
