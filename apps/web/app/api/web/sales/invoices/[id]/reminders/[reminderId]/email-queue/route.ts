import { NextResponse } from "next/server";

import {
  salesInvoiceDetailResponseSchema,
  salesReminderEmailJobCreateResponseSchema,
  salesReminderEmailQueueResponseSchema,
  salesReminderEmailSpikeRequestSchema,
  salesReminderTemplatesResolvedResponseSchema,
} from "@repo/api-contracts";

import { getUiText } from "@/content/ui-text";
import { validateWebAccessTokenSession } from "@/lib/auth/validate-web-session";
import { getRequestLocale } from "@/lib/i18n/request-locale";
import { buildReminderEmailSubjectAndBody } from "@/lib/mail/reminder-email-content";
import { isSmtpConfigured } from "@/lib/mail/smtp-transport";

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

    const { subject, bodyText } = buildReminderEmailSubjectAndBody({
      invoice,
      reminder,
      resolvedIntroText: resolvedParsed.data.introText,
      feeCents: resolvedParsed.data.feeCents,
      locale,
    });

    const smtpConfigured = isSmtpConfigured();

    if (dryRun) {
      const responsePayload = {
        to: body.to,
        subject,
        bodyText,
        smtpConfigured,
        dryRun: true,
        delivered: false,
      };
      const responseParsed =
        salesReminderEmailQueueResponseSchema.safeParse(responsePayload);
      if (!responseParsed.success) {
        return NextResponse.json({ error: "serialize_error" }, noStoreInit({ status: 500 }));
      }
      return NextResponse.json(responseParsed.data, noStoreInit());
    }

    const createRes = await fetch(
      `${API_BASE}/v1/sales/invoices/${encodeURIComponent(id)}/reminders/${encodeURIComponent(reminderId)}/email-jobs`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: body.to,
          subject,
          bodyText,
          locale,
        }),
      },
    );
    const createText = await createRes.text();
    let createJson: unknown;
    try {
      createJson = JSON.parse(createText);
    } catch {
      return NextResponse.json({ error: "invalid_upstream" }, noStoreInit({ status: 502 }));
    }
    if (!createRes.ok) {
      return NextResponse.json(
        typeof createJson === "object" && createJson !== null && "error" in createJson
          ? createJson
          : { error: "upstream_error" },
        noStoreInit({ status: createRes.status >= 500 ? 503 : createRes.status }),
      );
    }
    const createParsed = salesReminderEmailJobCreateResponseSchema.safeParse(createJson);
    if (!createParsed.success) {
      return NextResponse.json({ error: "invalid_upstream" }, noStoreInit({ status: 502 }));
    }
    const jobId = createParsed.data.job.id;

    const responsePayload = {
      to: body.to,
      subject,
      bodyText,
      smtpConfigured,
      dryRun: false,
      delivered: false,
      jobId,
      deliveryAttempts: 0,
    };
    const responseParsed = salesReminderEmailQueueResponseSchema.safeParse(responsePayload);
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
