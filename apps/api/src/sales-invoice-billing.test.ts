import assert from "node:assert/strict";
import { test } from "node:test";

import {
  computeInvoiceTaxBreakdown,
  scaleLineTotalsForHeaderDiscount,
} from "./sales-invoice-billing.js";

test("computeInvoiceTaxBreakdown splits 19% VAT from gross", () => {
  const rows = computeInvoiceTaxBreakdown([
    { taxRateBps: 1900, lineTotalCents: 1190 },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.taxRateBps, 1900);
  assert.equal(rows[0]?.grossCents, 1190);
  assert.equal(rows[0]?.netCents + rows[0]?.taxCents, 1190);
});

test("computeInvoiceTaxBreakdown aggregates 7% and 19% buckets", () => {
  const rows = computeInvoiceTaxBreakdown([
    { taxRateBps: 700, lineTotalCents: 1070 },
    { taxRateBps: 1900, lineTotalCents: 1190 },
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0]?.taxRateBps, 700);
  assert.equal(rows[1]?.taxRateBps, 1900);
});

test("scaleLineTotalsForHeaderDiscount applies 10% header discount", () => {
  const scaled = scaleLineTotalsForHeaderDiscount(
    [{ taxRateBps: 1900, lineTotalCents: 1000 }],
    1000,
  );
  assert.equal(scaled[0]?.lineTotalCents, 900);
});

test("scaleLineTotalsForHeaderDiscount is identity when 0 bps", () => {
  const scaled = scaleLineTotalsForHeaderDiscount(
    [{ taxRateBps: 700, lineTotalCents: 100 }],
    0,
  );
  assert.equal(scaled[0]?.lineTotalCents, 100);
});
