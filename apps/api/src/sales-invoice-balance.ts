/**
 * Einheitliche Saldo-Logik für Rechnungen (Detail, OP-Liste, Export).
 * Legacy: ohne Zahlungszeilen, aber Status bezahlt + paidAt → gilt als voll mit Rechnungsbetrag beglichen.
 */
export function invoicePaidTotalCentsFromParts(args: {
  totalCents: number;
  status: string;
  paidAt: Date | null;
  paidFromRowsSum: number;
}): number {
  if (args.paidFromRowsSum > 0) {
    return args.paidFromRowsSum;
  }
  if (args.status === "paid" && args.paidAt != null) {
    return args.totalCents;
  }
  return 0;
}

export function invoiceBalanceCents(
  totalCents: number,
  paidTotalCents: number,
): number {
  return totalCents - paidTotalCents;
}
