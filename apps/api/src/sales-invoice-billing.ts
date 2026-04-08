import { and, eq } from "drizzle-orm";

import { salesInvoices, type Db } from "@repo/db";

/** Brutto-Zeilen → Netto/USt je Steuersatz (Brutto inkl. USt). */
export function computeInvoiceTaxBreakdown(
  lines: Array<{
    taxRateBps: number | null;
    lineTotalCents: number;
  }>,
): Array<{
  taxRateBps: number;
  netCents: number;
  taxCents: number;
  grossCents: number;
}> {
  const byRate = new Map<number, number>();
  for (const line of lines) {
    const rate = Number.isFinite(line.taxRateBps) ? Number(line.taxRateBps) : 1900;
    const prev = byRate.get(rate) ?? 0;
    byRate.set(rate, prev + line.lineTotalCents);
  }
  const rows = [...byRate.entries()]
    .map(([taxRateBps, grossCents]) => {
      if (taxRateBps <= 0) {
        return {
          taxRateBps: 0,
          netCents: grossCents,
          taxCents: 0,
          grossCents,
        };
      }
      const divisor = 10_000 + taxRateBps;
      const netCents = Math.round((grossCents * 10_000) / divisor);
      const taxCents = grossCents - netCents;
      return { taxRateBps, netCents, taxCents, grossCents };
    })
    .sort((a, b) => a.taxRateBps - b.taxRateBps);
  return rows;
}

/** Kopfrabatt auf Brutto-Zeilensummen (MVP: gleichmäßiger Faktor, Cent gerundet pro Zeile). */
export function scaleLineTotalsForHeaderDiscount(
  lines: Array<{ taxRateBps: number | null; lineTotalCents: number }>,
  headerDiscountBps: number,
): Array<{ taxRateBps: number | null; lineTotalCents: number }> {
  if (headerDiscountBps <= 0) {
    return lines.map((l) => ({ ...l }));
  }
  const factor = (10_000 - headerDiscountBps) / 10_000;
  return lines.map((l) => ({
    ...l,
    lineTotalCents: Math.max(0, Math.round(l.lineTotalCents * factor)),
  }));
}

export type InvoiceBillingValidationInput = {
  /** Beim PATCH: aktuelle Rechnungs-ID (Zyklus-Check). */
  invoiceId?: string;
  billingType: string;
  parentInvoiceId: string | null;
  creditForInvoiceId: string | null;
  projectId: string | null;
  customerId: string | null;
};

/**
 * Prüft Teilrechnungs-Kette (Zyklus, Root-Typ), Projekt- und Kunden-Konsistenz bei Parent/Gutschrift.
 */
export async function validateInvoiceBillingReferences(
  db: Db,
  tenantId: string,
  input: InvoiceBillingValidationInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const {
    invoiceId,
    billingType,
    parentInvoiceId,
    creditForInvoiceId,
    projectId,
    customerId,
  } = input;

  if (billingType === "invoice") {
    if (parentInvoiceId) return { ok: false, error: "invalid_parent_invoice" };
    if (creditForInvoiceId) return { ok: false, error: "invalid_credit_reference" };
  } else if (billingType === "partial" || billingType === "final") {
    if (!parentInvoiceId) return { ok: false, error: "invalid_parent_invoice" };
    if (creditForInvoiceId) return { ok: false, error: "invalid_credit_reference" };
  } else if (billingType === "credit_note") {
    if (!creditForInvoiceId) return { ok: false, error: "invalid_credit_reference" };
    if (parentInvoiceId) return { ok: false, error: "invalid_parent_invoice" };
  } else {
    return { ok: false, error: "validation_error" };
  }

  if (parentInvoiceId) {
    const parentRows = await db
      .select()
      .from(salesInvoices)
      .where(
        and(
          eq(salesInvoices.id, parentInvoiceId),
          eq(salesInvoices.tenantId, tenantId),
        ),
      )
      .limit(1);
    const parent = parentRows[0];
    if (!parent) return { ok: false, error: "invalid_parent_invoice" };

    if (invoiceId && parentInvoiceId === invoiceId) {
      return { ok: false, error: "invalid_parent_invoice" };
    }

    let cur: string | null = parentInvoiceId;
    const seen = new Set<string>();
    while (cur) {
      if (invoiceId && cur === invoiceId) {
        return { ok: false, error: "billing_chain_cycle" };
      }
      if (seen.has(cur)) {
        return { ok: false, error: "billing_chain_cycle" };
      }
      seen.add(cur);
      const [row] = await db
        .select()
        .from(salesInvoices)
        .where(
          and(eq(salesInvoices.id, cur), eq(salesInvoices.tenantId, tenantId)),
        )
        .limit(1);
      if (!row) return { ok: false, error: "invalid_parent_invoice" };
      cur = row.parentInvoiceId;
    }

    const chainArr = Array.from(seen);
    const rootId = chainArr[chainArr.length - 1]!;
    const [root] = await db
      .select()
      .from(salesInvoices)
      .where(
        and(eq(salesInvoices.id, rootId), eq(salesInvoices.tenantId, tenantId)),
      )
      .limit(1);
    if (root && root.parentInvoiceId == null && root.billingType !== "invoice") {
      return { ok: false, error: "billing_invalid_chain_root" };
    }

    if (projectId && parent.projectId && projectId !== parent.projectId) {
      return { ok: false, error: "billing_project_mismatch" };
    }
    if (customerId && parent.customerId && customerId !== parent.customerId) {
      return { ok: false, error: "billing_customer_mismatch" };
    }
  }

  if (creditForInvoiceId) {
    const creditRows = await db
      .select()
      .from(salesInvoices)
      .where(
        and(
          eq(salesInvoices.id, creditForInvoiceId),
          eq(salesInvoices.tenantId, tenantId),
        ),
      )
      .limit(1);
    const credited = creditRows[0];
    if (!credited) return { ok: false, error: "invalid_credit_reference" };

    if (invoiceId && creditForInvoiceId === invoiceId) {
      return { ok: false, error: "invalid_credit_reference" };
    }

    if (projectId && credited.projectId && projectId !== credited.projectId) {
      return { ok: false, error: "billing_project_mismatch" };
    }
    if (customerId && credited.customerId && customerId !== credited.customerId) {
      return { ok: false, error: "billing_customer_mismatch" };
    }
  }

  return { ok: true };
}
