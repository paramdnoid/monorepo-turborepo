import "server-only";

import {
  meResponseSchema,
  type MeResponse,
  salesInvoiceDetailResponseSchema,
  salesQuoteDetailResponseSchema,
  salesReminderTemplatesResolvedResponseSchema,
} from "@repo/api-contracts";
import type { z } from "zod";

const API_BASE =
  process.env.NEXT_PUBLIC_WEB_API_BASE_URL ?? "http://127.0.0.1:4000";

export type SalesMeContext = MeResponse;

export type SalesQuotePrintFetchResult =
  | { ok: true; quote: z.infer<typeof salesQuoteDetailResponseSchema>["quote"]; me: SalesMeContext }
  | { ok: false; status: number };

export type SalesInvoicePrintFetchResult =
  | { ok: true; invoice: z.infer<typeof salesInvoiceDetailResponseSchema>["invoice"]; me: SalesMeContext }
  | { ok: false; status: number };

async function fetchMe(token: string): Promise<SalesMeContext | null> {
  const res = await fetch(`${API_BASE}/v1/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const json: unknown = await res.json();
  const parsed = meResponseSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

export async function fetchQuoteForPrint(
  token: string,
  quoteId: string,
): Promise<SalesQuotePrintFetchResult> {
  const [me, salesRes] = await Promise.all([
    fetchMe(token),
    fetch(`${API_BASE}/v1/sales/quotes/${encodeURIComponent(quoteId)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }),
  ]);

  if (salesRes.status === 404) {
    return { ok: false, status: 404 };
  }
  if (!salesRes.ok) {
    return { ok: false, status: salesRes.status };
  }

  const json: unknown = await salesRes.json();
  const parsed = salesQuoteDetailResponseSchema.safeParse(json);
  if (!parsed.success || !me) {
    return { ok: false, status: 500 };
  }

  return { ok: true, quote: parsed.data.quote, me };
}

export async function fetchResolvedSalesReminderTemplateForPrint(
  token: string,
  locale: "de" | "en",
  level: number,
): Promise<
  | { ok: true; introText: string; feeCents: number | null }
  | { ok: false; status: number }
> {
  const res = await fetch(
    `${API_BASE}/v1/sales/reminder-templates/resolved?locale=${encodeURIComponent(locale)}&level=${encodeURIComponent(String(level))}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );
  if (!res.ok) {
    return { ok: false, status: res.status };
  }
  const json: unknown = await res.json();
  const parsed = salesReminderTemplatesResolvedResponseSchema.safeParse(json);
  if (!parsed.success) {
    return { ok: false, status: 500 };
  }
  return {
    ok: true,
    introText: parsed.data.introText,
    feeCents: parsed.data.feeCents,
  };
}

export async function fetchInvoiceForPrint(
  token: string,
  invoiceId: string,
): Promise<SalesInvoicePrintFetchResult> {
  const [me, salesRes] = await Promise.all([
    fetchMe(token),
    fetch(`${API_BASE}/v1/sales/invoices/${encodeURIComponent(invoiceId)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }),
  ]);

  if (salesRes.status === 404) {
    return { ok: false, status: 404 };
  }
  if (!salesRes.ok) {
    return { ok: false, status: salesRes.status };
  }

  const json: unknown = await salesRes.json();
  const parsed = salesInvoiceDetailResponseSchema.safeParse(json);
  if (!parsed.success || !me) {
    return { ok: false, status: 500 };
  }

  return { ok: true, invoice: parsed.data.invoice, me };
}
