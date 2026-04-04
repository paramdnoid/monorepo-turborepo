import type { Locale } from "@/lib/i18n/locale";

/** Lucide icon names supported by `TradeFeatureIcon`. */
export type SalesNavIconName = "FilePenLine" | "Banknote";

export type SalesNavItem = {
  href: string;
  label: string;
  tooltip: string;
  icon: SalesNavIconName;
};

export type SalesSidebarCopy = {
  groupLabel: string;
  items: SalesNavItem[];
};

export type SalesPageKind = "quotes" | "invoices";

type HeaderPair = { title: string; subtitle: string };

type SalesMessages = {
  sidebar: SalesSidebarCopy;
  headers: Record<SalesPageKind, HeaderPair> & {
    root: HeaderPair;
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
    openMasterCustomer: string;
    newInvoiceFromQuote: string;
    invoiceFromQuoteHint: string;
    createInvoiceFromQuote: string;
  };
  salesLifecycle: {
    archiveQuote: string;
    unarchiveQuote: string;
    cancelInvoice: string;
    deleteQuote: string;
    deleteInvoice: string;
    confirmAction: string;
    confirmCancel: string;
    confirmTitleArchiveQuote: string;
    confirmTitleUnarchiveQuote: string;
    confirmTitleCancelInvoice: string;
    confirmTitleDeleteQuote: string;
    confirmTitleDeleteInvoice: string;
    confirmDescArchiveQuote: string;
    confirmDescUnarchiveQuote: string;
    confirmDescCancelInvoice: string;
    confirmDescDeleteQuote: string;
    confirmDescDeleteInvoice: string;
    actionFailed: string;
    actionDone: string;
    deletedRedirectHint: string;
  };
};

const de: SalesMessages = {
  sidebar: {
    groupLabel: "Belege",
    items: [
      {
        href: "/web/sales/quotes",
        label: "Angebote",
        tooltip: "Angebote",
        icon: "FilePenLine",
      },
      {
        href: "/web/sales/invoices",
        label: "Rechnungen",
        tooltip: "Rechnungen",
        icon: "Banknote",
      },
    ],
  },
  headers: {
    root: {
      title: "Sales",
      subtitle: "Angebote und Rechnungen als gemeinsamer Vertriebsarbeitsbereich",
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
    openMasterCustomer: "Stammdatenkunde oeffnen",
    newInvoiceFromQuote: "Rechnung aus Angebot",
    invoiceFromQuoteHint:
      "Kopfdaten und alle Positionen werden aus dem gewählten Angebot übernommen. Der Gesamtbetrag ergibt sich aus den Zeilen.",
    createInvoiceFromQuote: "Rechnung aus Angebot erstellen",
  },
  salesLifecycle: {
    archiveQuote: "Angebot archivieren",
    unarchiveQuote: "Angebot reaktivieren",
    cancelInvoice: "Rechnung stornieren",
    deleteQuote: "Angebot loeschen",
    deleteInvoice: "Rechnung loeschen",
    confirmAction: "Aktion bestaetigen",
    confirmCancel: "Abbrechen",
    confirmTitleArchiveQuote: "Angebot archivieren?",
    confirmTitleUnarchiveQuote: "Angebot reaktivieren?",
    confirmTitleCancelInvoice: "Rechnung stornieren?",
    confirmTitleDeleteQuote: "Angebot endgueltig loeschen?",
    confirmTitleDeleteInvoice: "Rechnung endgueltig loeschen?",
    confirmDescArchiveQuote:
      "Das Angebot wird auf den Status „abgelaufen“ gesetzt und aus aktiven Listen gefiltert.",
    confirmDescUnarchiveQuote:
      "Das Angebot wird wieder aktiv und auf den Status „Entwurf“ gesetzt.",
    confirmDescCancelInvoice:
      "Die Rechnung wird als storniert markiert. Der Vorgang kann nicht als „bezahlt“ fortgesetzt werden.",
    confirmDescDeleteQuote:
      "Loeschen ist nur fuer Entwuerfe ohne verknuepfte Rechnung erlaubt.",
    confirmDescDeleteInvoice:
      "Loeschen ist nur fuer Rechnungen im Entwurfsstatus erlaubt.",
    actionFailed: "Aktion fehlgeschlagen.",
    actionDone: "Aktion erfolgreich.",
    deletedRedirectHint: "Beleg wurde geloescht und die Liste geoeffnet.",
  },
};

const en: SalesMessages = {
  sidebar: {
    groupLabel: "Quotes & invoicing",
    items: [
      {
        href: "/web/sales/quotes",
        label: "Quotes",
        tooltip: "Quotes",
        icon: "FilePenLine",
      },
      {
        href: "/web/sales/invoices",
        label: "Invoices",
        tooltip: "Invoices",
        icon: "Banknote",
      },
    ],
  },
  headers: {
    root: {
      title: "Sales",
      subtitle: "Quotes and invoices as one shared sales workspace",
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
    openMasterCustomer: "Open master data customer",
    newInvoiceFromQuote: "Invoice from quote",
    invoiceFromQuoteHint:
      "Header data and all line items are copied from the selected quote. The total is derived from the lines.",
    createInvoiceFromQuote: "Create invoice from quote",
  },
  salesLifecycle: {
    archiveQuote: "Archive quote",
    unarchiveQuote: "Restore quote",
    cancelInvoice: "Cancel invoice",
    deleteQuote: "Delete quote",
    deleteInvoice: "Delete invoice",
    confirmAction: "Confirm action",
    confirmCancel: "Cancel",
    confirmTitleArchiveQuote: "Archive quote?",
    confirmTitleUnarchiveQuote: "Restore quote?",
    confirmTitleCancelInvoice: "Cancel invoice?",
    confirmTitleDeleteQuote: "Delete quote permanently?",
    confirmTitleDeleteInvoice: "Delete invoice permanently?",
    confirmDescArchiveQuote:
      "The quote will be moved to an expired state and hidden from active lists.",
    confirmDescUnarchiveQuote:
      "The quote will become active again and move back to draft.",
    confirmDescCancelInvoice:
      "The invoice is marked as cancelled. It can no longer proceed as paid.",
    confirmDescDeleteQuote:
      "Delete is allowed only for draft quotes without linked invoices.",
    confirmDescDeleteInvoice:
      "Delete is allowed only for invoices in draft state.",
    actionFailed: "Action failed.",
    actionDone: "Action completed.",
    deletedRedirectHint: "Document deleted and list opened.",
  },
};

function messages(locale: Locale): SalesMessages {
  return locale === "en" ? en : de;
}

export function getSalesSidebarCopy(locale: Locale): SalesSidebarCopy {
  return messages(locale).sidebar;
}

export function getSalesHeaderMeta(
  pathname: string,
  locale: Locale,
): { title: string; subtitle: string } | null {
  if (!pathname.startsWith("/web/sales")) return null;
  const rest =
    pathname === "/web/sales" ? "" : pathname.slice("/web/sales".length);
  const parts = rest.replace(/^\//, "").split("/").filter(Boolean);

  const m = messages(locale).headers;
  if (parts.length === 0) {
    return m.root;
  }
  if (parts[0] === "quotes") {
    if (parts.length >= 3 && parts[2] === "print") return m.quotesPrint;
    return parts.length >= 2 ? m.quotesDetail : m.quotes;
  }
  if (parts[0] === "invoices") {
    if (parts.length >= 3 && parts[2] === "print") return m.invoicesPrint;
    return parts.length >= 2 ? m.invoicesDetail : m.invoices;
  }
  return m.quotes;
}

export function getSalesPageTitle(
  kind: SalesPageKind,
  locale: Locale,
): string {
  return messages(locale).headers[kind].title;
}

export function getSalesPageDescription(
  kind: SalesPageKind,
  locale: Locale,
): string {
  return messages(locale).headers[kind].subtitle;
}

export function getSalesTableCopy(locale: Locale) {
  return messages(locale).salesTable;
}

export function getSalesFormCopy(locale: Locale) {
  return messages(locale).salesForm;
}

export function getSalesLifecycleCopy(locale: Locale) {
  return messages(locale).salesLifecycle;
}

export function getSalesLinesCopy(locale: Locale) {
  return messages(locale).salesLines;
}

export function getSalesPrintCopy(locale: Locale) {
  return messages(locale).print;
}
