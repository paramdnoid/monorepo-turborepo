import {
  projectsListResponseSchema,
  salesInvoicesListResponseSchema,
  salesQuotesListResponseSchema,
} from "@repo/api-contracts";

export async function fetchSalesProjectOptions(): Promise<
  { id: string; title: string }[]
> {
  try {
    const res = await fetch("/api/web/projects?includeArchived=1&limit=200", {
      credentials: "include",
    });
    if (!res.ok) return [];
    const json: unknown = await res.json();
    const parsed = projectsListResponseSchema.safeParse(json);
    return parsed.success ? parsed.data.projects : [];
  } catch {
    return [];
  }
}

export async function fetchSalesQuoteLinkOptions(): Promise<
  { id: string; label: string }[]
> {
  try {
    const res = await fetch(
      "/api/web/sales/quotes?limit=200&sortBy=updatedAt&sortDir=desc",
      { credentials: "include" },
    );
    if (!res.ok) return [];
    const json: unknown = await res.json();
    const parsed = salesQuotesListResponseSchema.safeParse(json);
    if (!parsed.success) return [];
    return parsed.data.quotes.map((q) => ({
      id: q.id,
      label: `${q.documentNumber} · ${q.customerLabel}`,
    }));
  } catch {
    return [];
  }
}

export async function fetchSalesInvoiceLinkOptions(): Promise<
  { id: string; label: string }[]
> {
  try {
    const res = await fetch(
      "/api/web/sales/invoices?limit=200&sortBy=updatedAt&sortDir=desc",
      { credentials: "include" },
    );
    if (!res.ok) return [];
    const json: unknown = await res.json();
    const parsed = salesInvoicesListResponseSchema.safeParse(json);
    if (!parsed.success) return [];
    return parsed.data.invoices.map((inv) => ({
      id: inv.id,
      label: `${inv.documentNumber} · ${inv.customerLabel}`,
    }));
  } catch {
    return [];
  }
}

export async function buildProjectTitleMap(): Promise<Map<string, string>> {
  const rows = await fetchSalesProjectOptions();
  return new Map(rows.map((p) => [p.id, p.title]));
}

export async function buildQuoteLinkLabelMap(): Promise<Map<string, string>> {
  const rows = await fetchSalesQuoteLinkOptions();
  return new Map(rows.map((q) => [q.id, q.label]));
}

export async function buildInvoiceLinkLabelMap(): Promise<Map<string, string>> {
  const rows = await fetchSalesInvoiceLinkOptions();
  return new Map(rows.map((inv) => [inv.id, inv.label]));
}
