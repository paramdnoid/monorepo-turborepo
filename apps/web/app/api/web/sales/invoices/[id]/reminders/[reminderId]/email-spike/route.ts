import { NextResponse } from "next/server";

import {
  salesInvoiceDetailResponseSchema,
  salesReminderEmailSpikeRequestSchema,
  salesReminderEmailSpikeResponseSchema,
  salesReminderTemplatesResolvedResponseSchema,
} from "@repo/api-contracts";

import { getUiText } from "@/content/ui-text";
import { validateWebAccessTokenSession } from "@/lib/auth/validate-web-session";
import { getRequestLocale } from "@/lib/i18n/request-locale";
import { createSmtpTransport, isSmtpConfigured } from "@/lib/mail/smtp-transport";

const API_BASE =
  process.env.NEXT_PUBLIC_WEB_API_BASE_URL ?? "http://127.0.0.1:4000";

function noStoreInit(init?: ResponseInit): ResponseInit {
  return {
    ...init,
    headers: {
      ...init?.headers,
      "Cache-Control": "private, no-store",
    },
  };
}

function formatMoney(cents: number, currency: string, locale: "de" | "en"): string {
  const lang = locale === "en" ? "en-US" : "de-DE";
  return new Intl.NumberFormat(lang, {
    style: "currency",
    currency: currency || "EUR",
  }).format(cents / 100);
}

function formatDate(iso: string | null, locale: "de" | "en"): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const lang = locale === "en" ? "en-GB" : "de-DE";
  return new Intl.DateTimeFormat(lang, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function interpolateReminderText(template: string, params: {
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
}): string {
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

type RouteContext = { params: Promise<{ id: string; reminderId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id, reminderId } = await context.params;
  const reqLocale = getRequestLocale(request);
  const text = getUiText(reqLocale);

  const session = await validateWebAccessTokenSession();
  if (!session.ok) {
    return NextResponse.json(
      { error: text.api.auth.bffSessionInvalid },
      noStoreInit({ status: 401 }),
    );
  }

  let bodyRaw: unknown;
  try {
    bodyRaw = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, noStoreInit({ status: 400 }));
  }

  const bodyParsed = salesReminderEmailSpikeRequestSchema.safeParse(bodyRaw);
  if (!bodyParsed.success) {
    return NextResponse.json({ error: "validation_error" }, noStoreInit({ status: 400 }));
  }

  const body = bodyParsed.data;
  const locale = body.locale ?? (reqLocale === "en" ? "en" : "de");
  const dryRun = body.dryRun ?? true;

  try {
    const invoiceRes = await fetch(
      `${API_BASE}/v1/sales/invoices/${encodeURIComponent(id)}`,
      {
        headers: { Authorization: `Bearer ${session.token}` },
        cache: "no-store",
      },
    );
    if (invoiceRes.status === 404) {
      return NextResponse.json({ error: "not_found" }, noStoreInit({ status: 404 }));
    }
    if (!invoiceRes.ok) {
      return NextResponse.json(
        { error: "upstream_error" },
        noStoreInit({ status: invoiceRes.status >= 500 ? 503 : invoiceRes.status }),
      );
    }
    const invoiceJson: unknown = await invoiceRes.json();
    const invoiceParsed = salesInvoiceDetailResponseSchema.safeParse(invoiceJson);
    if (!invoiceParsed.success) {
      return NextResponse.json({ error: "invalid_upstream" }, noStoreInit({ status: 502 }));
    }
    const invoice = invoiceParsed.data.invoice;
    const reminder = invoice.reminders.find((r) => r.id === reminderId);
    if (!reminder) {
      return NextResponse.json({ error: "not_found" }, noStoreInit({ status: 404 }));
    }

    const resolvedRes = await fetch(
      `${API_BASE}/v1/sales/reminder-templates/resolved?locale=${encodeURIComponent(locale)}&level=${encodeURIComponent(String(reminder.level))}`,
      {
        headers: { Authorization: `Bearer ${session.token}` },
        cache: "no-store",
      },
    );
    if (!resolvedRes.ok) {
      return NextResponse.json(
        { error: "template_unavailable" },
        noStoreInit({ status: resolvedRes.status >= 500 ? 503 : resolvedRes.status }),
      );
    }
    const resolvedJson: unknown = await resolvedRes.json();
    const resolvedParsed =
      salesReminderTemplatesResolvedResponseSchema.safeParse(resolvedJson);
    if (!resolvedParsed.success) {
      return NextResponse.json({ error: "invalid_upstream" }, noStoreInit({ status: 502 }));
    }

    const intro = interpolateReminderText(resolvedParsed.data.introText, {
      locale,
      invoiceDocumentNumber: invoice.documentNumber,
      customerLabel: invoice.customerLabel,
      dueAt: invoice.dueAt,
      issuedAt: invoice.issuedAt,
      totalCents: invoice.totalCents,
      balanceCents: invoice.balanceCents,
      currency: invoice.currency,
      reminderLevel: reminder.level,
      reminderSentAt: reminder.sentAt,
    });

    const feeLine =
      resolvedParsed.data.feeCents != null && resolvedParsed.data.feeCents > 0
        ? locale === "en"
          ? `Reminder fee: ${formatMoney(resolvedParsed.data.feeCents, invoice.currency, locale)}`
          : `Mahngebuehr: ${formatMoney(resolvedParsed.data.feeCents, invoice.currency, locale)}`
        : null;

    const subject =
      locale === "en"
        ? `Reminder ${invoice.documentNumber} (level ${reminder.level})`
        : `Mahnung ${invoice.documentNumber} (Stufe ${reminder.level})`;

    const bodyText = [intro, feeLine].filter(Boolean).join("\n\n");
    const smtpConfigured = isSmtpConfigured();
    let delivered = false;

    if (!dryRun && smtpConfigured) {
      const from =
        process.env.MAIL_FROM?.trim() ||
        process.env.SMTP_USER?.trim() ||
        "noreply@localhost";
      const fromName = process.env.EMAIL_FROM_NAME?.trim();
      const transport = createSmtpTransport();
      await transport.sendMail({
        from: fromName ? `"${fromName}" <${from}>` : from,
        to: body.to,
        subject,
        text: bodyText,
      });
      delivered = true;
    }

    const responsePayload = {
      to: body.to,
      subject,
      bodyText,
      smtpConfigured,
      dryRun,
      delivered,
    };
    const responseParsed =
      salesReminderEmailSpikeResponseSchema.safeParse(responsePayload);
    if (!responseParsed.success) {
      return NextResponse.json({ error: "serialize_error" }, noStoreInit({ status: 500 }));
    }
    return NextResponse.json(responseParsed.data, noStoreInit());
  } catch {
    return NextResponse.json(
      { error: text.api.auth.loginAuthServiceUnavailable },
      noStoreInit({ status: 503 }),
    );
  }
}
