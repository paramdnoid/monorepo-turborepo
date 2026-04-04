import test from "node:test";
import assert from "node:assert/strict";

import { salesCreateInvoiceFromQuoteSchema } from "./sales.js";

test("salesCreateInvoiceFromQuoteSchema accepts minimal body", () => {
  const parsed = salesCreateInvoiceFromQuoteSchema.safeParse({
    documentNumber: "RE-2026-001",
  });
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.status, "draft");
  }
});

test("salesCreateInvoiceFromQuoteSchema rejects empty document number", () => {
  const parsed = salesCreateInvoiceFromQuoteSchema.safeParse({
    documentNumber: "   ",
  });
  assert.equal(parsed.success, false);
});
