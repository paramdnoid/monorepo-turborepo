import assert from "node:assert/strict";
import test from "node:test";

import { interpolateSalesReminderTemplateText } from "./sales-pdf.js";

test("interpolateSalesReminderTemplateText ersetzt bekannte Platzhalter", () => {
  const out = interpolateSalesReminderTemplateText({
    templateText:
      "Beleg {{invoiceNumber}} fuer {{customerName}} faellig {{dueDate}}. Offen: {{openBalance}}",
    lang: "de",
    values: {
      invoiceDocumentNumber: "RE-2026-001",
      customerLabel: "Muster GmbH",
      dueAt: "2026-04-10T00:00:00.000Z",
      issuedAt: "2026-04-01T00:00:00.000Z",
      totalCents: 12_345,
      balanceCents: 6_000,
      currency: "EUR",
      reminderLevel: 2,
      reminderSentAt: "2026-04-15T12:00:00.000Z",
    },
  });

  assert.match(out, /RE-2026-001/);
  assert.match(out, /Muster GmbH/);
  assert.match(out, /60,00\s*€/);
});

test("interpolateSalesReminderTemplateText laesst unbekannte Platzhalter unveraendert", () => {
  const out = interpolateSalesReminderTemplateText({
    templateText: "Hallo {{unknownToken}}",
    lang: "de",
    values: {
      invoiceDocumentNumber: "RE-1",
      customerLabel: "Test",
      dueAt: null,
      issuedAt: null,
      totalCents: 0,
      balanceCents: 0,
      currency: "EUR",
      reminderLevel: 1,
      reminderSentAt: "2026-04-15T12:00:00.000Z",
    },
  });

  assert.equal(out, "Hallo {{unknownToken}}");
});
