/**
 * Semikolon-CSV fuer Buchungszeilen (haeufig von Steuerberatern in Excel/DATEV-Import geprueft).
 * Spalten orientieren sich an gaengigen DATEV-Buchungsexporten — vor Produktivnutzung mit dem Berater abstimmen.
 */

export type DatevBookingCsvInvoiceRow = {
  documentNumber: string;
  /** Betrag der Buchungszeile in Hauptwaehrung (Brutto oder gesplittet). */
  totalCents: number;
  /** ISO-Datum YYYY-MM-DD */
  postingDate: string;
  description: string;
  /** Optionales row-spezifisches Konto-/Steuerschluessel-Mapping. */
  debtorAccount?: string;
  revenueAccount?: string;
  vatKey?: string;
};

export type BuildDatevBookingsCsvInput = {
  invoices: DatevBookingCsvInvoiceRow[];
  /** Sollkonto (Debitor) */
  debtorAccount: string;
  /** Habenkonto (Erlös) */
  revenueAccount: string;
  /** BU-/Steuerschluessel; leerer String erlaubt */
  vatKey: string;
  currency: string;
};

function formatGermanAmountFromCents(cents: number): string {
  const n = cents / 100;
  return n.toLocaleString("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDisplayDate(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) {
    return isoDate;
  }
  return `${m[3]}.${m[2]}.${m[1]}`;
}

function escapeCsvCell(value: string): string {
  if (/[";\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

const HEADER = [
  "Umsatz (ohne Soll/Haben-Kz)",
  "Sollkonto",
  "Habenkonto",
  "BU-Schlüssel",
  "Belegdatum",
  "Belegfeld 1",
  "Buchungstext",
  "Währungskennzeichen",
].join(";");

/** Erzeugt eine UTF-8-CSV mit Kopfzeile (Semikolon). */
export function buildDatevBookingsCsv(input: BuildDatevBookingsCsvInput): string {
  const lines: string[] = [HEADER];
  const vat = input.vatKey.trim();
  const vatCell = vat.length > 0 ? vat : "";

  for (const inv of input.invoices) {
    const debtor = inv.debtorAccount?.trim() || input.debtorAccount;
    const revenue = inv.revenueAccount?.trim() || input.revenueAccount;
    const rowVat = inv.vatKey?.trim() ?? vatCell;
    const cells = [
      escapeCsvCell(formatGermanAmountFromCents(inv.totalCents)),
      escapeCsvCell(debtor),
      escapeCsvCell(revenue),
      escapeCsvCell(rowVat),
      escapeCsvCell(formatDisplayDate(inv.postingDate)),
      escapeCsvCell(inv.documentNumber),
      escapeCsvCell(inv.description),
      escapeCsvCell(input.currency),
    ];
    lines.push(cells.join(";"));
  }

  return lines.join("\r\n") + "\r\n";
}
