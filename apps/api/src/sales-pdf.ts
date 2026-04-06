import PDFDocument from "pdfkit";

type PdfDocInstance = InstanceType<typeof PDFDocument>;

export type SalesPdfLang = "de" | "en";

/** WinAnsi / Standard-Fonts: Umlaute und Sonderzeichen fuer Freitext transkribieren. */
export function pdfSafeText(input: string): string {
  return input
    .replace(/\u00a0/g, " ")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/Ä/g, "Ae")
    .replace(/Ö/g, "Oe")
    .replace(/Ü/g, "Ue")
    .replace(/ß/g, "ss");
}

type PdfLabels = {
  docNo: string;
  recipient: string;
  status: string;
  total: string;
  openBalance: string;
  validUntil: string;
  issued: string;
  due: string;
  paid: string;
  quoteRef: string;
  projectId: string;
  updated: string;
  reminderTitle: string;
  reminderLevel: string;
  reminderDate: string;
  reminderIntro: string;
  reminderFeeLabel: string;
  noteLabel: string;
  positions: string;
  colDesc: string;
  colQty: string;
  colUnit: string;
  colPrice: string;
  colSum: string;
  senderNote: string;
  grandTotal: string;
  vatId: string;
  taxNumber: string;
};

const labels: Record<SalesPdfLang, { quoteTitle: string; invoiceTitle: string } & PdfLabels> = {
  de: {
    quoteTitle: "Angebot",
    invoiceTitle: "Rechnung",
    docNo: "Belegnr.",
    recipient: "Leistungsempfaenger / Kunde",
    status: "Status",
    total: "Betrag (Kopf)",
    openBalance: "Offener Betrag",
    validUntil: "Gueltig bis",
    issued: "Rechnungsdatum",
    due: "Faellig am",
    paid: "Bezahlt am",
    quoteRef: "Angebots-ID",
    projectId: "Projekt-ID",
    updated: "Stand",
    reminderTitle: "Mahnung",
    reminderLevel: "Stufe",
    reminderDate: "Datum",
    reminderIntro:
      "Bitte begleichen Sie den offenen Betrag. Falls Sie bereits gezahlt haben, betrachten Sie dieses Schreiben bitte als gegenstandslos.",
    reminderFeeLabel: "Mahngebuehr",
    noteLabel: "Notiz",
    positions: "Positionen",
    colDesc: "Beschreibung",
    colQty: "Menge",
    colUnit: "Einh.",
    colPrice: "Einzelpreis",
    colSum: "Zeilensumme",
    senderNote:
      "Hinweis: Vollstaendige Absenderadresse und Steuerdaten koennen unter Einstellungen ergaenzt werden.",
    grandTotal: "Gesamtbetrag",
    vatId: "USt-IdNr.",
    taxNumber: "Steuernummer",
  },
  en: {
    quoteTitle: "Quote",
    invoiceTitle: "Invoice",
    docNo: "Doc no.",
    recipient: "Bill to / customer",
    status: "Status",
    total: "Amount (header)",
    openBalance: "Open balance",
    validUntil: "Valid until",
    issued: "Issued",
    due: "Due",
    paid: "Paid on",
    quoteRef: "Quote ID",
    projectId: "Project ID",
    updated: "Updated",
    reminderTitle: "Reminder",
    reminderLevel: "Level",
    reminderDate: "Date",
    reminderIntro:
      "Please settle the open balance. If you have already paid, please disregard this message.",
    reminderFeeLabel: "Reminder fee",
    noteLabel: "Note",
    positions: "Line items",
    colDesc: "Description",
    colQty: "Qty",
    colUnit: "Unit",
    colPrice: "Unit price",
    colSum: "Line total",
    senderNote:
      "Note: Complete sender address and tax IDs can be added under Settings.",
    grandTotal: "Total",
    vatId: "VAT ID",
    taxNumber: "Tax number",
  },
};

export function salesDefaultReminderIntro(lang: SalesPdfLang): string {
  return labels[lang].reminderIntro;
}

export type SalesReminderTemplateInterpolationInput = {
  invoiceDocumentNumber: string;
  customerLabel: string;
  dueAt: string | null;
  issuedAt: string | null;
  totalCents: number;
  balanceCents: number;
  currency: string;
  reminderLevel: number;
  reminderSentAt: string;
};

/**
 * Ersetzt bekannte Platzhalter im Mahn-Fließtext.
 * Unbekannte Platzhalter bleiben unverändert, damit Tippfehler sichtbar bleiben.
 */
export function interpolateSalesReminderTemplateText(params: {
  templateText: string;
  lang: SalesPdfLang;
  values: SalesReminderTemplateInterpolationInput;
}): string {
  const { templateText, lang, values } = params;
  const entries: Record<string, string> = {
    invoiceNumber: values.invoiceDocumentNumber,
    documentNumber: values.invoiceDocumentNumber,
    customerName: values.customerLabel,
    customerLabel: values.customerLabel,
    dueDate: formatPdfDate(values.dueAt, lang),
    issuedDate: formatPdfDate(values.issuedAt, lang),
    reminderDate: formatPdfDate(values.reminderSentAt, lang),
    reminderLevel: String(values.reminderLevel),
    openBalance: formatMoney(values.balanceCents, values.currency, lang),
    total: formatMoney(values.totalCents, values.currency, lang),
    currency: values.currency,
  };
  return templateText.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (full, keyRaw) => {
    const key = String(keyRaw);
    return entries[key] ?? full;
  });
}

export type SalesLetterhead = {
  orgName: string;
  senderAddress: string | null;
  vatId: string | null;
  taxNumber: string | null;
  /** JPEG/PNG; WebP wird im PDF nicht eingebettet. */
  logoImage: Buffer | null;
};

function drawSalesLetterhead(
  doc: PdfDocInstance,
  letterhead: SalesLetterhead,
  lang: SalesPdfLang,
): void {
  const L = labels[lang];
  const left = doc.page.margins.left;
  let below = doc.page.margins.top;
  if (letterhead.logoImage) {
    try {
      doc.image(letterhead.logoImage, left, below, { height: 36 });
      below += 42;
    } catch {
      /* PDFKit unterstützt nur kompatible Rasterformate */
    }
  }
  doc.x = left;
  doc.y = below;
  doc
    .fontSize(11)
    .font("Helvetica")
    .text(pdfSafeText(letterhead.orgName), { align: "left" });
  doc.moveDown(0.25);
  if (letterhead.senderAddress) {
    doc
      .fontSize(9)
      .font("Helvetica")
      .text(pdfSafeText(letterhead.senderAddress), { align: "left" });
    doc.moveDown(0.2);
  }
  if (letterhead.vatId) {
    doc
      .fontSize(9)
      .text(`${L.vatId}: ${pdfSafeText(letterhead.vatId)}`);
    doc.moveDown(0.12);
  }
  if (letterhead.taxNumber) {
    doc
      .fontSize(9)
      .text(`${L.taxNumber}: ${pdfSafeText(letterhead.taxNumber)}`);
    doc.moveDown(0.12);
  }
  const hasBranding = Boolean(
    letterhead.senderAddress ||
      letterhead.vatId ||
      letterhead.taxNumber ||
      letterhead.logoImage,
  );
  if (!hasBranding) {
    doc.fontSize(8).fillColor("#444444").text(pdfSafeText(L.senderNote));
  }
  doc.fillColor("#000000");
  doc.font("Helvetica");
  doc.moveDown(1.2);
}

function formatMoney(cents: number, currency: string, lang: SalesPdfLang): string {
  const tag = lang === "en" ? "en-US" : "de-DE";
  return new Intl.NumberFormat(tag, {
    style: "currency",
    currency: currency || "EUR",
  }).format(cents / 100);
}

function formatPdfDate(iso: string | null, lang: SalesPdfLang): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const tag = lang === "en" ? "en-GB" : "de-DE";
  return new Intl.DateTimeFormat(tag, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function runPdf(build: (doc: PdfDocInstance) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    doc.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    doc.on("error", reject);
    try {
      build(doc);
      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

export type QuotePdfInput = {
  documentNumber: string;
  customerLabel: string;
  status: string;
  currency: string;
  totalCents: number;
  validUntil: string | null;
  updatedAt: string;
  projectId: string | null;
  lines: ReadonlyArray<{
    sortIndex: number;
    description: string;
    quantity: string | null;
    unit: string | null;
    unitPriceCents: number;
    lineTotalCents: number;
  }>;
};

export type InvoicePdfInput = {
  documentNumber: string;
  customerLabel: string;
  status: string;
  currency: string;
  totalCents: number;
  issuedAt: string | null;
  dueAt: string | null;
  paidAt: string | null;
  updatedAt: string;
  projectId: string | null;
  quoteId: string | null;
  lines: QuotePdfInput["lines"];
};

export type InvoiceReminderPdfInput = {
  invoice: Pick<
    InvoicePdfInput,
    | "documentNumber"
    | "customerLabel"
    | "status"
    | "currency"
    | "totalCents"
    | "issuedAt"
    | "dueAt"
    | "paidAt"
    | "updatedAt"
    | "projectId"
    | "quoteId"
  > & {
    balanceCents: number;
  };
  reminder: {
    level: number;
    sentAt: string;
    note: string | null;
  };
};

export function buildQuotePdfBuffer(params: {
  letterhead: SalesLetterhead;
  quote: QuotePdfInput;
  lang: SalesPdfLang;
}): Promise<Buffer> {
  const { letterhead, quote, lang } = params;
  const L = labels[lang];

  return runPdf((doc) => {
    drawSalesLetterhead(doc, letterhead, lang);
    doc.fontSize(20).font("Helvetica-Bold").text(L.quoteTitle);
    doc.font("Helvetica").fontSize(11);
    doc.moveDown(0.5);
    doc.text(`${L.docNo} ${pdfSafeText(quote.documentNumber)}`);
    doc.moveDown(1);

    doc.fontSize(10).font("Helvetica-Bold").text(L.recipient);
    doc.font("Helvetica").fontSize(10);
    doc.text(pdfSafeText(quote.customerLabel), { width: doc.page.width - 96 });
    doc.moveDown(0.8);

    const meta: [string, string][] = [
      [L.status, pdfSafeText(quote.status)],
      [L.total, formatMoney(quote.totalCents, quote.currency, lang)],
      [L.validUntil, formatPdfDate(quote.validUntil, lang)],
      [L.updated, formatPdfDate(quote.updatedAt, lang)],
    ];
    if (quote.projectId) {
      meta.push([L.projectId, quote.projectId]);
    }
    for (const [k, v] of meta) {
      doc.fontSize(9).text(`${k}: ${v}`);
    }
    doc.moveDown(1);

    doc.fontSize(12).font("Helvetica-Bold").text(L.positions);
    doc.font("Helvetica").moveDown(0.35);

    const left = 48;
    const usable = doc.page.width - 96;
    const cDesc = left;
    const cQty = cDesc + usable * 0.42;
    const cUnit = cQty + usable * 0.1;
    const cEp = cUnit + usable * 0.12;
    const cSum = cEp + usable * 0.18;
    let y = doc.y;
    const rowH = 14;
    doc.fontSize(8).font("Helvetica-Bold");
    doc.text(L.colDesc, cDesc, y, { width: cQty - cDesc - 4 });
    doc.text(L.colQty, cQty, y, { width: cUnit - cQty - 4, align: "right" });
    doc.text(L.colUnit, cUnit, y, { width: cEp - cUnit - 4 });
    doc.text(L.colPrice, cEp, y, { width: cSum - cEp - 4, align: "right" });
    doc.text(L.colSum, cSum, y, { width: left + usable - cSum, align: "right" });
    y += rowH;
    doc.font("Helvetica").fontSize(9);

    const sorted = [...quote.lines].sort((a, b) => a.sortIndex - b.sortIndex);
    for (const line of sorted) {
      if (y > doc.page.height - 120) {
        doc.addPage();
        y = 48;
      }
      const descH = doc.heightOfString(pdfSafeText(line.description), {
        width: cQty - cDesc - 4,
      });
      const h = Math.max(rowH, descH);
      doc.text(pdfSafeText(line.description), cDesc, y, {
        width: cQty - cDesc - 4,
      });
      doc.text(pdfSafeText(line.quantity ?? "—"), cQty, y, {
        width: cUnit - cQty - 4,
        align: "right",
      });
      doc.text(pdfSafeText(line.unit ?? "—"), cUnit, y, { width: cEp - cUnit - 4 });
      doc.text(formatMoney(line.unitPriceCents, quote.currency, lang), cEp, y, {
        width: cSum - cEp - 4,
        align: "right",
      });
      doc.text(formatMoney(line.lineTotalCents, quote.currency, lang), cSum, y, {
        width: left + usable - cSum,
        align: "right",
      });
      y += h + 4;
    }

    doc.y = y + 8;
    doc.moveDown(0.5);
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .text(
        `${L.grandTotal}: ${formatMoney(quote.totalCents, quote.currency, lang)}`,
      );
  });
}

export function buildInvoicePdfBuffer(params: {
  letterhead: SalesLetterhead;
  invoice: InvoicePdfInput;
  lang: SalesPdfLang;
}): Promise<Buffer> {
  const { letterhead, invoice, lang } = params;
  const L = labels[lang];

  return runPdf((doc) => {
    drawSalesLetterhead(doc, letterhead, lang);
    doc.fontSize(20).font("Helvetica-Bold").text(L.invoiceTitle);
    doc.font("Helvetica").fontSize(11);
    doc.moveDown(0.5);
    doc.text(`${L.docNo} ${pdfSafeText(invoice.documentNumber)}`);
    doc.moveDown(1);

    doc.fontSize(10).font("Helvetica-Bold").text(L.recipient);
    doc.font("Helvetica").fontSize(10);
    doc.text(pdfSafeText(invoice.customerLabel), {
      width: doc.page.width - 96,
    });
    doc.moveDown(0.8);

    const meta: [string, string][] = [
      [L.status, pdfSafeText(invoice.status)],
      [L.total, formatMoney(invoice.totalCents, invoice.currency, lang)],
      [L.issued, formatPdfDate(invoice.issuedAt, lang)],
      [L.due, formatPdfDate(invoice.dueAt, lang)],
      [L.paid, formatPdfDate(invoice.paidAt, lang)],
      [L.updated, formatPdfDate(invoice.updatedAt, lang)],
    ];
    if (invoice.quoteId) {
      meta.push([L.quoteRef, invoice.quoteId]);
    }
    if (invoice.projectId) {
      meta.push([L.projectId, invoice.projectId]);
    }
    for (const [k, v] of meta) {
      doc.fontSize(9).text(`${k}: ${v}`);
    }
    doc.moveDown(1);

    doc.fontSize(12).font("Helvetica-Bold").text(L.positions);
    doc.font("Helvetica").moveDown(0.35);

    const left = 48;
    const usable = doc.page.width - 96;
    const cDesc = left;
    const cQty = cDesc + usable * 0.42;
    const cUnit = cQty + usable * 0.1;
    const cEp = cUnit + usable * 0.12;
    const cSum = cEp + usable * 0.18;
    let y = doc.y;
    const rowH = 14;
    doc.fontSize(8).font("Helvetica-Bold");
    doc.text(L.colDesc, cDesc, y, { width: cQty - cDesc - 4 });
    doc.text(L.colQty, cQty, y, { width: cUnit - cQty - 4, align: "right" });
    doc.text(L.colUnit, cUnit, y, { width: cEp - cUnit - 4 });
    doc.text(L.colPrice, cEp, y, { width: cSum - cEp - 4, align: "right" });
    doc.text(L.colSum, cSum, y, { width: left + usable - cSum, align: "right" });
    y += rowH;
    doc.font("Helvetica").fontSize(9);

    const sorted = [...invoice.lines].sort((a, b) => a.sortIndex - b.sortIndex);
    for (const line of sorted) {
      if (y > doc.page.height - 120) {
        doc.addPage();
        y = 48;
      }
      const descH = doc.heightOfString(pdfSafeText(line.description), {
        width: cQty - cDesc - 4,
      });
      const h = Math.max(rowH, descH);
      doc.text(pdfSafeText(line.description), cDesc, y, {
        width: cQty - cDesc - 4,
      });
      doc.text(pdfSafeText(line.quantity ?? "—"), cQty, y, {
        width: cUnit - cQty - 4,
        align: "right",
      });
      doc.text(pdfSafeText(line.unit ?? "—"), cUnit, y, { width: cEp - cUnit - 4 });
      doc.text(formatMoney(line.unitPriceCents, invoice.currency, lang), cEp, y, {
        width: cSum - cEp - 4,
        align: "right",
      });
      doc.text(formatMoney(line.lineTotalCents, invoice.currency, lang), cSum, y, {
        width: left + usable - cSum,
        align: "right",
      });
      y += h + 4;
    }

    doc.y = y + 8;
    doc.moveDown(0.5);
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .text(
        `${L.grandTotal}: ${formatMoney(invoice.totalCents, invoice.currency, lang)}`,
      );
  });
}

export function buildInvoiceReminderPdfBuffer(params: {
  letterhead: SalesLetterhead;
  invoice: InvoiceReminderPdfInput["invoice"];
  reminder: InvoiceReminderPdfInput["reminder"];
  lang: SalesPdfLang;
  /** Vollstaendiger Fließtext; sonst `labels[lang].reminderIntro`. */
  introText?: string;
  /** Optionale Mahngebuehr (Rechnungswaehrung), nur wenn > 0. */
  feeCents?: number | null;
}): Promise<Buffer> {
  const { letterhead, invoice, reminder, lang, introText, feeCents } = params;
  const L = labels[lang];
  const intro =
    introText != null && introText.trim() !== ""
      ? introText.trim()
      : L.reminderIntro;

  return runPdf((doc) => {
    drawSalesLetterhead(doc, letterhead, lang);
    doc.fontSize(20).font("Helvetica-Bold").text(L.reminderTitle);
    doc.font("Helvetica").fontSize(11);
    doc.moveDown(0.5);
    doc.text(`${L.docNo} ${pdfSafeText(invoice.documentNumber)}`);
    doc.moveDown(1);

    doc.fontSize(10).font("Helvetica-Bold").text(L.recipient);
    doc.font("Helvetica").fontSize(10);
    doc.text(pdfSafeText(invoice.customerLabel), {
      width: doc.page.width - 96,
    });
    doc.moveDown(0.8);

    const meta: [string, string][] = [
      [L.reminderLevel, String(reminder.level)],
      [L.reminderDate, formatPdfDate(reminder.sentAt, lang)],
      [L.openBalance, formatMoney(invoice.balanceCents, invoice.currency, lang)],
      [L.total, formatMoney(invoice.totalCents, invoice.currency, lang)],
      [L.issued, formatPdfDate(invoice.issuedAt, lang)],
      [L.due, formatPdfDate(invoice.dueAt, lang)],
      [L.paid, formatPdfDate(invoice.paidAt, lang)],
      [L.updated, formatPdfDate(invoice.updatedAt, lang)],
    ];
    if (invoice.quoteId) {
      meta.push([L.quoteRef, invoice.quoteId]);
    }
    if (invoice.projectId) {
      meta.push([L.projectId, invoice.projectId]);
    }
    for (const [k, v] of meta) {
      doc.fontSize(9).text(`${k}: ${pdfSafeText(v)}`);
    }

    doc.moveDown(1.2);
    doc.fontSize(10).font("Helvetica").text(pdfSafeText(intro));

    if (feeCents != null && feeCents > 0) {
      doc.moveDown(0.6);
      doc
        .fontSize(10)
        .font("Helvetica")
        .text(
          `${L.reminderFeeLabel}: ${formatMoney(feeCents, invoice.currency, lang)}`,
        );
    }

    if (reminder.note && reminder.note.trim() !== "") {
      doc.moveDown(1);
      doc.fontSize(10).font("Helvetica-Bold").text(L.noteLabel);
      doc.font("Helvetica").fontSize(10).text(pdfSafeText(reminder.note));
    }
  });
}

export function salesPdfFilename(kind: "quote" | "invoice", documentNumber: string): string {
  const safe = pdfSafeText(documentNumber).replace(/[^\w.\-+]+/g, "_");
  return kind === "quote" ? `Angebot_${safe}.pdf` : `Rechnung_${safe}.pdf`;
}

export function salesReminderPdfFilename(
  invoiceDocumentNumber: string,
  reminderLevel: number,
): string {
  const safe = pdfSafeText(invoiceDocumentNumber).replace(/[^\w.\-+]+/g, "_");
  const lvl = Number.isFinite(reminderLevel) ? Math.max(1, Math.trunc(reminderLevel)) : 1;
  return `Mahnung_${safe}_Stufe_${lvl}.pdf`;
}
