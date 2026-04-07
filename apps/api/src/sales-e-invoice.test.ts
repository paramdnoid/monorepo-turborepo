import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildCiiEInvoiceXml,
  parseMultilineAddress,
  validateCiiEInvoiceData,
  type EInvoiceParty,
  type EInvoiceSnapshot,
} from "./sales-e-invoice.js";

test("parseMultilineAddress parses street + PLZ Ort", () => {
  const parsed = parseMultilineAddress("Musterstraße 1\n12345 Musterstadt");
  assert.ok(parsed);
  assert.equal(parsed.street, "Musterstraße 1");
  assert.equal(parsed.postalCode, "12345");
  assert.equal(parsed.city, "Musterstadt");
  assert.equal(parsed.country, "DE");
  assert.equal(parsed.addressLine2, null);
});

test("parseMultilineAddress parses country suffix", () => {
  const parsed = parseMultilineAddress(
    "Abt. Buchhaltung\nMusterstraße 1\n12345 Musterstadt\nDE",
  );
  assert.ok(parsed);
  assert.equal(parsed.street, "Musterstraße 1");
  assert.equal(parsed.addressLine2, "Abt. Buchhaltung");
  assert.equal(parsed.country, "DE");
});

function sampleParties(): { seller: EInvoiceParty; buyer: EInvoiceParty } {
  return {
    seller: {
      name: "Local Dev GmbH",
      address: {
        street: "Musterstraße 1",
        addressLine2: null,
        postalCode: "12345",
        city: "Musterstadt",
        country: "DE",
      },
      vatId: "DE123456789",
      taxNumber: null,
    },
    buyer: {
      name: "Kunde AG",
      address: {
        street: "Kundenweg 2",
        addressLine2: "c/o Einkauf",
        postalCode: "23456",
        city: "Kundenstadt",
        country: "DE",
      },
      vatId: null,
      taxNumber: null,
    },
  };
}

function sampleInvoice(billingType: EInvoiceSnapshot["billingType"]): EInvoiceSnapshot {
  return {
    documentNumber: "RE-0001",
    issuedAt: "2026-04-07",
    dueAt: "2026-04-21",
    currency: "EUR",
    customerLabel: "Kunde AG",
    totalCents: 11_900,
    balanceCents: 11_900,
    billingType,
    lines: [
      {
        id: "00000000-0000-4000-8000-000000000001",
        sortIndex: 0,
        description: "Leistung",
        quantity: "1",
        unit: "Stk",
        unitPriceCents: 11_900,
        lineTotalCents: 11_900,
        taxRateBps: 1900,
        discountBps: 0,
      },
    ],
    taxBreakdown: [
      { taxRateBps: 1900, netCents: 10_000, taxCents: 1_900, grossCents: 11_900 },
    ],
  };
}

test("validateCiiEInvoiceData errors on empty lines", () => {
  const { seller, buyer } = sampleParties();
  const invoice = sampleInvoice("invoice");
  invoice.lines = [];
  const res = validateCiiEInvoiceData({
    profile: "zugferd",
    invoice,
    seller,
    buyer,
    buyerReference: null,
  });
  assert.equal(res.ok, false);
  assert.ok(res.errors.some((e) => e.code === "invoice_lines_missing"));
});

test("buildCiiEInvoiceXml contains seller/buyer parties and buyer reference", () => {
  const { seller, buyer } = sampleParties();
  const invoice = sampleInvoice("invoice");
  const xml = buildCiiEInvoiceXml({
    profile: "xrechnung",
    invoice,
    seller,
    buyer,
    buyerReference: "1234567890",
  });
  assert.match(xml, /<ram:SellerTradeParty>/);
  assert.match(xml, /<ram:BuyerTradeParty>/);
  assert.match(xml, /<ram:BuyerReference>1234567890<\/ram:BuyerReference>/);
  assert.match(xml, /<ram:TypeCode>380<\/ram:TypeCode>/);
  assert.match(xml, /<ram:ChargeAmount>100\.00<\/ram:ChargeAmount>/);
});

test("buildCiiEInvoiceXml uses credit note type code 381", () => {
  const { seller, buyer } = sampleParties();
  const invoice = sampleInvoice("credit_note");
  const xml = buildCiiEInvoiceXml({
    profile: "zugferd",
    invoice,
    seller,
    buyer,
    buyerReference: null,
  });
  assert.match(xml, /<ram:TypeCode>381<\/ram:TypeCode>/);
});

