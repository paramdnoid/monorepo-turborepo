/**
 * Gemeinsame Textaufbereitung für Mahn-E-Mail (Spike + produktiver Outbox-Pfad).
 */

export function formatMoney(
  cents: number,
  currency: string,
  locale: "de" | "en",
): string {
  const lang = locale === "en" ? "en-US" : "de-DE";
  return new Intl.NumberFormat(lang, {
    style: "currency",
    currency: currency || "EUR",
  }).format(cents / 100);
}

export function formatDate(iso: string | null, locale: "de" | "en"): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const lang = locale === "en" ? "en-GB" : "de-DE";
  return new Intl.DateTimeFormat(lang, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export function interpolateReminderText(
  template: string,
  params: {
    locale: "de" | "en";
    invoiceDocumentNumber: string;
    customerLabel: string;
    dueAt: string | null;
    issuedAt: string | null;
    totalCents: number;
    balanceCents: number;
    currency: string;
    reminderLevel: number;
    reminderSentAt: string;
  },
): string {
  const entries: Record<string, string> = {
    invoiceNumber: params.invoiceDocumentNumber,
    documentNumber: params.invoiceDocumentNumber,
    customerName: params.customerLabel,
    customerLabel: params.customerLabel,
    dueDate: formatDate(params.dueAt, params.locale),
    issuedDate: formatDate(params.issuedAt, params.locale),
    reminderDate: formatDate(params.reminderSentAt, params.locale),
    reminderLevel: String(params.reminderLevel),
    openBalance: formatMoney(
      params.balanceCents,
      params.currency,
      params.locale,
    ),
    total: formatMoney(params.totalCents, params.currency, params.locale),
    currency: params.currency,
  };
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (full, keyRaw) => {
    const key = String(keyRaw);
    return entries[key] ?? full;
  });
}

export function buildReminderEmailSubjectAndBody(input: {
  invoice: {
    documentNumber: string;
    customerLabel: string;
    dueAt: string | null;
    issuedAt: string | null;
    totalCents: number;
    balanceCents: number;
    currency: string;
  };
  reminder: { level: number; sentAt: string };
  resolvedIntroText: string;
  feeCents: number | null | undefined;
  locale: "de" | "en";
}): { subject: string; bodyText: string } {
  const intro = interpolateReminderText(input.resolvedIntroText, {
    locale: input.locale,
    invoiceDocumentNumber: input.invoice.documentNumber,
    customerLabel: input.invoice.customerLabel,
    dueAt: input.invoice.dueAt,
    issuedAt: input.invoice.issuedAt,
    totalCents: input.invoice.totalCents,
    balanceCents: input.invoice.balanceCents,
    currency: input.invoice.currency,
    reminderLevel: input.reminder.level,
    reminderSentAt: input.reminder.sentAt,
  });

  const feeLine =
    input.feeCents != null && input.feeCents > 0
      ? input.locale === "en"
        ? `Reminder fee: ${formatMoney(input.feeCents, input.invoice.currency, input.locale)}`
        : `Mahngebuehr: ${formatMoney(input.feeCents, input.invoice.currency, input.locale)}`
      : null;

  const subject =
    input.locale === "en"
      ? `Reminder ${input.invoice.documentNumber} (level ${input.reminder.level})`
      : `Mahnung ${input.invoice.documentNumber} (Stufe ${input.reminder.level})`;

  const bodyText = [intro, feeLine].filter(Boolean).join("\n\n");
  return { subject, bodyText };
}
