import assert from "node:assert/strict";
import test from "node:test";

import {
  salesReminderTemplatesListResponseSchema,
  salesReminderTemplatesPutBodySchema,
  salesReminderTemplatesResolvedResponseSchema,
} from "./sales-reminder-templates.js";

test("salesReminderTemplatesPutBodySchema accepts ten items", () => {
  const items = Array.from({ length: 10 }, (_, i) => ({
    level: i + 1,
    bodyText: "",
    feeCents: null as number | null,
  }));
  const parsed = salesReminderTemplatesPutBodySchema.safeParse({
    locale: "de",
    items,
  });
  assert.equal(parsed.success, true);
});

test("salesReminderTemplatesListResponseSchema parses templates", () => {
  const parsed = salesReminderTemplatesListResponseSchema.safeParse({
    templates: [
      {
        level: 1,
        bodyText: "Hallo",
        feeCents: 500,
        updatedAt: "2026-04-06T12:00:00.000Z",
      },
    ],
  });
  assert.equal(parsed.success, true);
});

test("salesReminderTemplatesResolvedResponseSchema", () => {
  const parsed = salesReminderTemplatesResolvedResponseSchema.safeParse({
    introText: "Bitte zahlen.",
    feeCents: null,
  });
  assert.equal(parsed.success, true);
});
