export const SALES_BATCH_PREFILL_EVENT = "sales:batch-payment-prefill";

export type SalesBatchPrefillEventDetail = {
  invoiceId: string;
  documentNumber: string;
  amountCents: number;
  currency: string;
  balanceCents: number;
  bookingDate: string | null;
  remittanceInfo: string;
};

/** Bulk payload uses `items`; single-line dispatch sends a flat detail object. */
export type SalesBatchPrefillEventPayload =
  | SalesBatchPrefillEventDetail
  | { items: SalesBatchPrefillEventDetail[] };

export function isSalesBatchPrefillBulkPayload(
  detail: SalesBatchPrefillEventPayload,
): detail is { items: SalesBatchPrefillEventDetail[] } {
  return (
    typeof detail === "object" &&
    detail !== null &&
    "items" in detail &&
    Array.isArray((detail as { items: unknown }).items)
  );
}

/**
 * Combines multiple CAMT lines that map to the same invoice (sums amounts, capped at balance).
 */
export function aggregatePrefillItemsByInvoice(
  items: SalesBatchPrefillEventDetail[],
): {
  invoiceId: string;
  documentNumber: string;
  currency: string;
  balanceCents: number;
  amountCents: number;
  bookingDate: string | null;
  remittanceParts: string[];
}[] {
  const byInvoice = new Map<string, SalesBatchPrefillEventDetail[]>();
  for (const item of items) {
    const list = byInvoice.get(item.invoiceId) ?? [];
    list.push(item);
    byInvoice.set(item.invoiceId, list);
  }

  const out: {
    invoiceId: string;
    documentNumber: string;
    currency: string;
    balanceCents: number;
    amountCents: number;
    bookingDate: string | null;
    remittanceParts: string[];
  }[] = [];

  for (const [, group] of byInvoice) {
    const first = group[0];
    if (!first) continue;
    let sumCents = 0;
    const remittanceParts: string[] = [];
    let bookingDate: string | null = null;
    for (const g of group) {
      const lineAmt = Math.min(
        Math.max(g.amountCents, 1),
        g.balanceCents,
      );
      sumCents += lineAmt;
      const r = g.remittanceInfo.trim();
      if (r) remittanceParts.push(r);
      if (g.bookingDate) {
        if (!bookingDate || g.bookingDate > bookingDate) {
          bookingDate = g.bookingDate;
        }
      }
    }
    sumCents = Math.min(sumCents, first.balanceCents);
    out.push({
      invoiceId: first.invoiceId,
      documentNumber: first.documentNumber,
      currency: first.currency,
      balanceCents: first.balanceCents,
      amountCents: sumCents,
      bookingDate,
      remittanceParts,
    });
  }

  return out;
}

export function dispatchSalesBatchPrefill(
  detail: SalesBatchPrefillEventDetail,
): void {
  window.dispatchEvent(
    new CustomEvent<SalesBatchPrefillEventPayload>(SALES_BATCH_PREFILL_EVENT, {
      detail,
    }),
  );
}

export function dispatchSalesBatchPrefillMany(
  items: SalesBatchPrefillEventDetail[],
): void {
  window.dispatchEvent(
    new CustomEvent<SalesBatchPrefillEventPayload>(SALES_BATCH_PREFILL_EVENT, {
      detail: { items },
    }),
  );
}
