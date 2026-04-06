import test from "node:test";
import assert from "node:assert/strict";

import {
  salesCreateInvoiceFromQuoteSchema,
  salesInvoiceDetailResponseSchema,
  salesInvoicesListQuerySchema,
  salesOpenInvoicesListResponseSchema,
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
    projectId: "95ea4cf4-3b30-4fce-a8f1-95f35fce7d11",
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

test("salesInvoiceDetailResponseSchema accepts payments and balances", () => {
  const parsed = salesInvoiceDetailResponseSchema.safeParse({
    invoice: {
      id: "95ea4cf4-3b30-4fce-a8f1-95f35fce7d11",
      documentNumber: "RE-1",
      customerLabel: "Kunde",
      customerId: null,
      projectId: null,
      status: "sent",
      currency: "EUR",
      totalCents: 10_000,
      issuedAt: "2026-01-01T12:00:00.000Z",
      dueAt: null,
      paidAt: null,
      createdAt: "2026-01-01T12:00:00.000Z",
      updatedAt: "2026-01-01T12:00:00.000Z",
      quoteId: null,
      lines: [],
      payments: [
        {
          id: "123e4567-e89b-12d3-a456-426614174000",
          amountCents: 2500,
          paidAt: "2026-01-02T12:00:00.000Z",
          note: null,
          createdAt: "2026-01-02T12:00:00.000Z",
        },
      ],
      reminders: [
        {
          id: "4fdc3ca8-f94e-4a5d-86d9-03ce48a1167a",
          level: 1,
          sentAt: "2026-01-10T12:00:00.000Z",
          channel: "manual",
          note: null,
          createdAt: "2026-01-10T12:00:00.000Z",
        },
      ],
      paidTotalCents: 2500,
      balanceCents: 7500,
    },
  });
  assert.equal(parsed.success, true);
});

test("salesOpenInvoicesListResponseSchema parses list payload", () => {
  const parsed = salesOpenInvoicesListResponseSchema.safeParse({
    invoices: [
      {
        id: "123e4567-e89b-12d3-a456-426614174000",
        documentNumber: "RE-1",
        customerLabel: "Kunde",
        customerId: null,
        projectId: null,
        status: "sent",
        currency: "EUR",
        totalCents: 5000,
        issuedAt: null,
        dueAt: "2026-02-01T12:00:00.000Z",
        paidAt: null,
        createdAt: "2026-01-01T12:00:00.000Z",
        updatedAt: "2026-01-01T12:00:00.000Z",
        paidTotalCents: 1000,
        balanceCents: 4000,
      },
    ],
    total: 1,
    permissions: {
      canEdit: true,
      canArchive: true,
      canExport: true,
      canBatch: true,
    },
  });
  assert.equal(parsed.success, true);
});
