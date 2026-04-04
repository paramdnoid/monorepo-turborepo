import type { Locale } from "@/lib/i18n/locale";

export type GaebModuleCopy = {
  benefitTitle: string;
  benefitBody: string;
  formatMatrixTitle: string;
  formatMatrixIntro: string;
  formats: { id: string; import: string; export: string }[];
  privacyTitle: string;
  privacyBody: string;
  legalTitle: string;
  legalBody: string;
  supportedSubsetNote: string;
  faqLabel: string;
  uploadTitle: string;
  uploadHint: string;
  projectLabel: string;
  projectOptional: string;
  importButton: string;
  importing: string;
  importsTitle: string;
  importsEmpty: string;
  refresh: string;
  loadError: string;
  sessionRequired: string;
  columns: {
    outline: string;
    text: string;
    qty: string;
    unit: string;
  };
  noNodes: string;
  approveTitle: string;
  approveBody: string;
  approveButton: string;
  approving: string;
  approvedBadge: string;
  pendingBadge: string;
  failedBadge: string;
  exportTitle: string;
  exportHint: string;
  exportButton: string;
  exporting: string;
  reimportDiffTitle: string;
  reimportDiffBody: string;
  diffMissing: string;
  diffAdded: string;
  retentionNote: string;
};

const de: GaebModuleCopy = {
  benefitTitle: "Funktion",
  benefitBody:
    "GAEB-Dateien fuer Ausschreibungen und Leistungsverzeichnisse importieren, pruefen und in einem unterstuetzten Teilmenge wieder exportieren. Positionen und Gliederung erscheinen zur Kontrolle vor der Freigabe.",
  formatMatrixTitle: "Unterstuetzte Formate (MVP)",
  formatMatrixIntro:
    "Der MVP fokussiert GAEB DA XML (typischer Namespace der GAEB-DA-Spezifikation). Weitere Versionen und X83 folgen schrittweise — siehe Matrix.",
  formats: [
    {
      id: "da-xml-32",
      import: "GAEB DA XML (3.2, Teilmenge)",
      export: "GAEB DA XML (kanonischer Rückexport aus internem LV-Modell)",
    },
    {
      id: "x83",
      import: "X83 — Erkennung, eingeschraenkte Unterstuetzung in Planung",
      export: "—",
    },
    {
      id: "gaeb-90",
      import: "GAEB 90 — nicht unterstuetzt",
      export: "—",
    },
  ],
  privacyTitle: "Datenschutz",
  privacyBody:
    "Leistungsverzeichnisse koennen Projekt- und Auftraggeberhinweise enthalten. Verarbeitung nur im authentifizierten Mandanten; Dateien mit personenbezogenen Inhalten vor Upload pruefen.",
  legalTitle: "Rechtliches",
  legalBody:
    "Keine Rechtsberatung. GAEB-Dateien vor verbindlicher Abgabe gegen das vorgesehene Bieter- bzw. Auftraggeber-Tool pruefen.",
  supportedSubsetNote:
    "Es wird eine definierte Teilmenge der Spezifikation unterstuetzt; unbekannte Konstrukte werden ignoriert oder als Warnung ausgegeben.",
  faqLabel: "FAQ: Schnittstellen & Exporte",
  uploadTitle: "Datei importieren",
  uploadHint: "XML-Datei (GAEB DA), max. 5 MB. Optional einem Projekt zuordnen.",
  projectLabel: "Projekt",
  projectOptional: "Ohne Zuordnung",
  importButton: "Hochladen und parsen",
  importing: "Wird verarbeitet …",
  importsTitle: "Zuletzt importierte LV",
  importsEmpty: "Noch keine Importe.",
  refresh: "Aktualisieren",
  loadError: "Daten konnten nicht geladen werden.",
  sessionRequired: "Bitte anmelden, um GAEB zu nutzen.",
  columns: {
    outline: "OZ",
    text: "Kurztext",
    qty: "Menge",
    unit: "Einheit",
  },
  noNodes: "Keine Positionen im Parser-Ergebnis.",
  approveTitle: "Freigabe",
  approveBody:
    "Nach sachlicher Pruefung können Sie den Import freigeben. Der Export steht anschließend zur Verfügung.",
  approveButton: "Import freigeben",
  approving: "Wird gespeichert …",
  approvedBadge: "Freigegeben",
  pendingBadge: "In Pruefung",
  failedBadge: "Fehler",
  exportTitle: "Export",
  exportHint: "Download als GAEB DA XML (Rückexport aus gespeicherten Daten).",
  exportButton: "GAEB XML herunterladen",
  exporting: "Export wird vorbereitet …",
  reimportDiffTitle: "Abgleich",
  reimportDiffBody:
    "Vergleicht gespeicherte OZ-Liste mit dem letzten Parser-Lauf (Uebersicht).",
  diffMissing: "Entfallen (laut letztem Stand)",
  diffAdded: "Neu (laut letztem Stand)",
  retentionNote:
    "Aufbewahrung: Daten werden zur Einhaltung von Aufbewahrungsfristen zeitlich begrenzt vorgehalten (Standard 90 Tage ab Import); anschließend loeschen.",
};

const en: GaebModuleCopy = {
  benefitTitle: "What this does",
  benefitBody:
    "Import, validate, and re-export GAEB tender and bill-of-quantities files within a supported subset. Items and structure appear for review before approval.",
  formatMatrixTitle: "Supported formats (MVP)",
  formatMatrixIntro:
    "The MVP focuses on GAEB DA XML (typical GAEB-DA namespace). More versions and X83 will follow — see matrix.",
  formats: [
    {
      id: "da-xml-32",
      import: "GAEB DA XML (3.2, subset)",
      export: "GAEB DA XML (canonical re-export from internal BOQ model)",
    },
    {
      id: "x83",
      import: "X83 — detection; limited support planned",
      export: "—",
    },
    {
      id: "gaeb-90",
      import: "GAEB 90 — not supported",
      export: "—",
    },
  ],
  privacyTitle: "Privacy",
  privacyBody:
    "Bill-of-quantities files may include project or client hints. Processing stays within your authenticated tenant; review files for personal data before upload.",
  legalTitle: "Legal",
  legalBody:
    "Not legal advice. Validate GAEB files against the intended tendering workflow before binding submission.",
  supportedSubsetNote:
    "Only a defined subset of the specification is supported; unknown constructs may be skipped or reported as warnings.",
  faqLabel: "FAQ: interfaces & exports",
  uploadTitle: "Import file",
  uploadHint: "XML file (GAEB DA), max 5 MB. Optionally link to a project.",
  projectLabel: "Project",
  projectOptional: "None",
  importButton: "Upload and parse",
  importing: "Processing…",
  importsTitle: "Recent BOQ imports",
  importsEmpty: "No imports yet.",
  refresh: "Refresh",
  loadError: "Could not load data.",
  sessionRequired: "Sign in to use GAEB.",
  columns: {
    outline: "No.",
    text: "Short text",
    qty: "Qty",
    unit: "Unit",
  },
  noNodes: "No line items in parse result.",
  approveTitle: "Approval",
  approveBody:
    "After review you can approve the import. Export becomes available once approved.",
  approveButton: "Approve import",
  approving: "Saving…",
  approvedBadge: "Approved",
  pendingBadge: "Pending review",
  failedBadge: "Failed",
  exportTitle: "Export",
  exportHint: "Download as GAEB DA XML (re-export from stored data).",
  exportButton: "Download GAEB XML",
  exporting: "Preparing export…",
  reimportDiffTitle: "Diff overview",
  reimportDiffBody:
    "Compares saved outline keys with the last successful parse snapshot.",
  diffMissing: "Removed (vs. last snapshot)",
  diffAdded: "Added (vs. last snapshot)",
  retentionNote:
    "Retention: data is kept for a limited time (default 90 days from import) to support compliance; older records should be purged.",
};

export function getGaebModuleCopy(locale: Locale): GaebModuleCopy {
  return locale === "en" ? en : de;
}
