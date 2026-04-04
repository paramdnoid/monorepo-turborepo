import type { Locale } from "@/lib/i18n/locale";

/** Lucide icon names supported by `TradeFeatureIcon`. */
export type BelegeNavIconName = "Receipt" | "FileText";

export type BelegeNavItem = {
  href: string;
  label: string;
  tooltip: string;
  icon: BelegeNavIconName;
};

export type BelegeSidebarCopy = {
  groupLabel: string;
  items: BelegeNavItem[];
};

export type BelegePageKind = "overview" | "quotes" | "invoices";

type HeaderPair = { title: string; subtitle: string };

type BelegeMessages = {
  sidebar: BelegeSidebarCopy;
  headers: Record<BelegePageKind, HeaderPair> & {
    quotesDetail: HeaderPair;
    invoicesDetail: HeaderPair;
    quotesPrint: HeaderPair;
    invoicesPrint: HeaderPair;
  };
  print: {
    backToDocument: string;
    printAction: string;
    printHint: string;
    downloadPdf: string;
    documentTitleQuote: string;
    documentTitleInvoice: string;
    documentNoLabel: string;
    recipientLabel: string;
    totalLabel: string;
    senderHint: string;
    vatIdLabel: string;
    taxNumberLabel: string;
  };
  placeholder: {
    noteTitle: string;
    noteBody: string;
  };
  salesTable: {
    docNumber: string;
    customer: string;
    status: string;
    total: string;
    date: string;
    validUntil: string;
    dueDate: string;
    issued: string;
    paidAt: string;
    emptyQuotes: string;
    emptyInvoices: string;
    loadError: string;
    notFound: string;
    backToList: string;
    projectId: string;
    quoteRef: string;
    project: string;
    listHint: string;
    previewPrint: string;
  };
  salesLines: {
    heading: string;
    description: string;
    quantity: string;
    unit: string;
    unitPrice: string;
    lineTotal: string;
    addLine: string;
    deleteLine: string;
    emptyLines: string;
    newLineTitle: string;
    lineSaveFailed: string;
    moveUp: string;
    moveDown: string;
    lineCalcFromQty: string;
  };
  salesForm: {
    newQuote: string;
    newInvoice: string;
    edit: string;
    save: string;
    cancel: string;
    saving: string;
    docNumber: string;
    customer: string;
    total: string;
    totalPlaceholder: string;
    validUntil: string;
    issued: string;
    due: string;
    paid: string;
    linkQuote: string;
    noneQuote: string;
    validationAmount: string;
    conflictNumber: string;
    saveFailed: string;
    linkProject: string;
    noneProject: string;
    totalFromLines: string;
    masterCustomer: string;
    noMasterCustomer: string;
    fillLabelFromMaster: string;
    newInvoiceFromQuote: string;
    invoiceFromQuoteHint: string;
    createInvoiceFromQuote: string;
  };
};

const de: BelegeMessages = {
  sidebar: {
    groupLabel: "Belege",
    items: [
      {
        href: "/web/belege",
        label: "Übersicht Belege",
        tooltip: "Übersicht Belege",
        icon: "Receipt",
      },
      {
        href: "/web/belege/angebote",
        label: "Angebote",
        tooltip: "Angebote",
        icon: "FileText",
      },
      {
        href: "/web/belege/rechnungen",
        label: "Rechnungen",
        tooltip: "Rechnungen",
        icon: "Receipt",
      },
    ],
  },
  headers: {
    overview: {
      title: "Belege",
      subtitle: "Angebots- & Rechnungswesen — gewerkeübergreifend",
    },
    quotes: {
      title: "Angebote",
      subtitle: "Kalkulation, Varianten und Freigaben (Vorschau)",
    },
    invoices: {
      title: "Rechnungen",
      subtitle: "Faktura, Zahlungsstatus und Belegfolgen (Vorschau)",
    },
    quotesDetail: {
      title: "Angebotsdetail",
      subtitle: "Kopfdaten (nur lesen)",
    },
    invoicesDetail: {
      title: "Rechnungsdetail",
      subtitle: "Kopfdaten (nur lesen)",
    },
    quotesPrint: {
      title: "Angebot — Druckvorschau",
      subtitle: "Drucken oder als PDF speichern (Browserdialog)",
    },
    invoicesPrint: {
      title: "Rechnung — Druckvorschau",
      subtitle: "Drucken oder als PDF speichern (Browserdialog)",
    },
  },
  print: {
    backToDocument: "Zurueck zum Beleg",
    printAction: "Drucken",
    printHint: "Im Dialog „Als PDF speichern“ waehlen fuer eine PDF-Datei.",
    downloadPdf: "PDF herunterladen (Server)",
    documentTitleQuote: "Angebot",
    documentTitleInvoice: "Rechnung",
    documentNoLabel: "Belegnr.",
    recipientLabel: "Leistungsempfaenger / Kunde",
    totalLabel: "Gesamtbetrag",
    senderHint:
      "Vollstaendige Absenderadresse und Steuerdaten hinterlegen Sie unter Einstellungen.",
    vatIdLabel: "USt-IdNr.",
    taxNumberLabel: "Steuernummer",
  },
  placeholder: {
    noteTitle: "Hinweis",
    noteBody:
      "Angebote und Rechnungen: Kopfdaten, Projektbezug und Positionen in der UI. HTML-Druckvorschau im Browser; serverseitiges PDF ueber den Button \"PDF herunterladen (Server)\". Buchhaltungs-CSV (DATEV-orientiert) unter Modul „DATEV-Schnittstelle\".",
  },
  salesTable: {
    docNumber: "Nummer",
    customer: "Kunde",
    status: "Status",
    total: "Betrag",
    date: "Stand",
    validUntil: "Gueltig bis",
    dueDate: "Faellig",
    issued: "Rechnungsdatum",
    paidAt: "Bezahlt am",
    emptyQuotes: "Noch keine Angebote.",
    emptyInvoices: "Noch keine Rechnungen.",
    loadError: "Daten konnten nicht geladen werden.",
    notFound: "Beleg nicht gefunden.",
    backToList: "Zurueck zur Liste",
    projectId: "Projekt-ID",
    project: "Projekt",
    quoteRef: "Angebotsbezug",
    listHint:
      "Alle Eintraege des Mandanten — Kopfdaten anlegen und bearbeiten; Druckvorschau und Browser-PDF sowie serverseitiges PDF im Detail und in der Vorschau.",
    previewPrint: "Vorschau / Druck",
  },
  salesLines: {
    heading: "Positionen",
    description: "Beschreibung",
    quantity: "Menge",
    unit: "Einheit",
    unitPrice: "Einzelpreis",
    lineTotal: "Zeilensumme",
    addLine: "Position hinzufuegen",
    deleteLine: "Loeschen",
    emptyLines: "Noch keine Positionen.",
    newLineTitle: "Neue Position",
    lineSaveFailed: "Position konnte nicht gespeichert werden.",
    moveUp: "Nach oben",
    moveDown: "Nach unten",
    lineCalcFromQty: "Aus Menge x Preis",
  },
  salesForm: {
    newQuote: "Neues Angebot",
    newInvoice: "Neue Rechnung",
    edit: "Bearbeiten",
    save: "Speichern",
    cancel: "Abbrechen",
    saving: "Speichern …",
    docNumber: "Belegnummer",
    customer: "Kunde / Bezeichnung",
    total: "Gesamtbetrag",
    totalPlaceholder: "z. B. 1.234,56",
    validUntil: "Gueltig bis",
    issued: "Rechnungsdatum",
    due: "Faellig am",
    paid: "Bezahlt am",
    linkQuote: "Angebot zuordnen",
    noneQuote: "Kein Angebot",
    validationAmount: "Bitte gueltigen Betrag eingeben.",
    conflictNumber: "Diese Belegnummer existiert bereits.",
    saveFailed: "Speichern fehlgeschlagen.",
    linkProject: "Projekt",
    noneProject: "Kein Projekt",
    totalFromLines: "Summe der Positionen",
    masterCustomer: "Stammdatenkunde",
    noMasterCustomer: "Ohne Stammdatenkunde",
    fillLabelFromMaster: "Empfaenger aus Adresse uebernehmen",
    newInvoiceFromQuote: "Rechnung aus Angebot",
    invoiceFromQuoteHint:
      "Kopfdaten und alle Positionen werden aus dem gewählten Angebot übernommen. Der Gesamtbetrag ergibt sich aus den Zeilen.",
    createInvoiceFromQuote: "Rechnung aus Angebot erstellen",
  },
};

const en: BelegeMessages = {
  sidebar: {
    groupLabel: "Quotes & invoicing",
    items: [
      {
        href: "/web/belege",
        label: "Documents overview",
        tooltip: "Documents overview",
        icon: "Receipt",
      },
      {
        href: "/web/belege/angebote",
        label: "Quotes",
        tooltip: "Quotes",
        icon: "FileText",
      },
      {
        href: "/web/belege/rechnungen",
        label: "Invoices",
        tooltip: "Invoices",
        icon: "Receipt",
      },
    ],
  },
  headers: {
    overview: {
      title: "Documents",
      subtitle: "Quoting & invoicing — all trades",
    },
    quotes: {
      title: "Quotes",
      subtitle: "Costing, variants and approvals (preview)",
    },
    invoices: {
      title: "Invoices",
      subtitle: "Billing, payment status and document chains (preview)",
    },
    quotesDetail: {
      title: "Quote detail",
      subtitle: "Header data (read-only)",
    },
    invoicesDetail: {
      title: "Invoice detail",
      subtitle: "Header data (read-only)",
    },
    quotesPrint: {
      title: "Quote — print preview",
      subtitle: "Print or save as PDF (browser dialog)",
    },
    invoicesPrint: {
      title: "Invoice — print preview",
      subtitle: "Print or save as PDF (browser dialog)",
    },
  },
  print: {
    backToDocument: "Back to document",
    printAction: "Print",
    printHint: 'Choose "Save as PDF" in the print dialog for a PDF file.',
    downloadPdf: "Download PDF (server)",
    documentTitleQuote: "Quote",
    documentTitleInvoice: "Invoice",
    documentNoLabel: "Doc no.",
    recipientLabel: "Bill to / customer",
    totalLabel: "Total",
    senderHint:
      "Add a full sender address and tax IDs under Settings (company / documents header).",
    vatIdLabel: "VAT ID",
    taxNumberLabel: "Tax number",
  },
  placeholder: {
    noteTitle: "Note",
    noteBody:
      "Quotes and invoices: headers, project link and line items in the UI. HTML print preview in the browser; server-generated PDF via the \"Download PDF (server)\" button. Accounting export will follow.",
  },
  salesTable: {
    docNumber: "No.",
    customer: "Customer",
    status: "Status",
    total: "Amount",
    date: "Updated",
    validUntil: "Valid until",
    dueDate: "Due",
    issued: "Issued",
    paidAt: "Paid at",
    emptyQuotes: "No quotes yet.",
    emptyInvoices: "No invoices yet.",
    loadError: "Could not load data.",
    notFound: "Document not found.",
    backToList: "Back to list",
    projectId: "Project ID",
    project: "Project",
    quoteRef: "Quote reference",
    listHint:
      "All organization documents — create and edit headers; print preview, browser PDF, and server PDF from detail and preview screens.",
    previewPrint: "Preview / print",
  },
  salesLines: {
    heading: "Line items",
    description: "Description",
    quantity: "Qty",
    unit: "Unit",
    unitPrice: "Unit price",
    lineTotal: "Line total",
    addLine: "Add line",
    deleteLine: "Delete",
    emptyLines: "No line items yet.",
    newLineTitle: "New line",
    lineSaveFailed: "Could not save line.",
    moveUp: "Move up",
    moveDown: "Move down",
    lineCalcFromQty: "From qty × price",
  },
  salesForm: {
    newQuote: "New quote",
    newInvoice: "New invoice",
    edit: "Edit",
    save: "Save",
    cancel: "Cancel",
    saving: "Saving…",
    docNumber: "Document no.",
    customer: "Customer / label",
    total: "Total amount",
    totalPlaceholder: "e.g. 1234.56",
    validUntil: "Valid until",
    issued: "Invoice date",
    due: "Due date",
    paid: "Paid on",
    linkQuote: "Link quote",
    noneQuote: "No quote",
    validationAmount: "Enter a valid amount.",
    conflictNumber: "This document number already exists.",
    saveFailed: "Save failed.",
    linkProject: "Project",
    noneProject: "No project",
    totalFromLines: "Sum of line items",
    masterCustomer: "Master data customer",
    noMasterCustomer: "No master data customer",
    fillLabelFromMaster: "Apply address to recipient label",
    newInvoiceFromQuote: "Invoice from quote",
    invoiceFromQuoteHint:
      "Header data and all line items are copied from the selected quote. The total is derived from the lines.",
    createInvoiceFromQuote: "Create invoice from quote",
  },
};

function messages(locale: Locale): BelegeMessages {
  return locale === "en" ? en : de;
}

export function getBelegeSidebarCopy(locale: Locale): BelegeSidebarCopy {
  return messages(locale).sidebar;
}

export function getBelegeHeaderMeta(
  pathname: string,
  locale: Locale,
): { title: string; subtitle: string } | null {
  if (!pathname.startsWith("/web/belege")) return null;
  const rest =
    pathname === "/web/belege" ? "" : pathname.slice("/web/belege".length);
  const parts = rest.replace(/^\//, "").split("/").filter(Boolean);

  const m = messages(locale).headers;
  if (parts.length === 0) return m.overview;
  if (parts[0] === "angebote") {
    if (parts.length >= 3 && parts[2] === "druck") return m.quotesPrint;
    return parts.length >= 2 ? m.quotesDetail : m.quotes;
  }
  if (parts[0] === "rechnungen") {
    if (parts.length >= 3 && parts[2] === "druck") return m.invoicesPrint;
    return parts.length >= 2 ? m.invoicesDetail : m.invoices;
  }
  return m.overview;
}

export function getBelegePlaceholderCopy(locale: Locale) {
  return messages(locale).placeholder;
}

export function getBelegePageTitle(
  kind: BelegePageKind,
  locale: Locale,
): string {
  return messages(locale).headers[kind].title;
}

export function getBelegePageDescription(
  kind: BelegePageKind,
  locale: Locale,
): string {
  return messages(locale).headers[kind].subtitle;
}

export function getBelegeSalesTableCopy(locale: Locale) {
  return messages(locale).salesTable;
}

export function getBelegeSalesFormCopy(locale: Locale) {
  return messages(locale).salesForm;
}

export function getBelegeSalesLinesCopy(locale: Locale) {
  return messages(locale).salesLines;
}

export function getBelegePrintCopy(locale: Locale) {
  return messages(locale).print;
}
