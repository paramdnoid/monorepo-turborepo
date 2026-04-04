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
  validUntil: string;
  issued: string;
  due: string;
  paid: string;
  quoteRef: string;
  projectId: string;
  updated: string;
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
    validUntil: "Gueltig bis",
    issued: "Rechnungsdatum",
    due: "Faellig am",
    paid: "Bezahlt am",
    quoteRef: "Angebots-ID",
    projectId: "Projekt-ID",
    updated: "Stand",
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
    validUntil: "Valid until",
    issued: "Issued",
    due: "Due",
    paid: "Paid on",
    quoteRef: "Quote ID",
    projectId: "Project ID",
    updated: "Updated",
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

export function salesPdfFilename(kind: "quote" | "invoice", documentNumber: string): string {
  const safe = pdfSafeText(documentNumber).replace(/[^\w.\-+]+/g, "_");
  return kind === "quote" ? `Angebot_${safe}.pdf` : `Rechnung_${safe}.pdf`;
}
