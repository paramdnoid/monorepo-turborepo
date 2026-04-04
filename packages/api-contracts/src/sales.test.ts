import test from "node:test";
import assert from "node:assert/strict";

import {
  salesCreateInvoiceFromQuoteSchema,
  salesInvoicesListQuerySchema,
  salesQuotesListResponseSchema,
} from "./sales.js";

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

test("salesInvoicesListQuerySchema parses valid list query", () => {
  const parsed = salesInvoicesListQuerySchema.safeParse({
    q: "RE-2026",
    status: "sent",
    dateFrom: "2026-01-01",
    dateTo: "2026-12-31",
    sortBy: "updatedAt",
    sortDir: "desc",
    limit: 25,
    offset: 0,
  });
  assert.equal(parsed.success, true);
});

test("salesQuotesListResponseSchema requires total", () => {
  const parsed = salesQuotesListResponseSchema.safeParse({
    quotes: [],
    total: 0,
    permissions: {
      canEdit: true,
      canArchive: true,
      canExport: true,
      canBatch: true,
    },
  });
  assert.equal(parsed.success, true);
});
