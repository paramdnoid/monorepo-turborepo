import type { Locale } from "@/lib/i18n/locale";

export type ResourceManagementModuleCopy = {
  benefitTitle: string;
  benefitBody: string;
  scopeTitle: string;
  scopeBody: string;
  datanormTitle: string;
  datanormBody: string;
  bmecatTitle: string;
  bmecatBody: string;
  retentionNote: string;
  privacyTitle: string;
  privacyBody: string;
  supplierSectionTitle: string;
  supplierNameLabel: string;
  sourceKindLabel: string;
  sourceDatanorm: string;
  sourceBmecat: string;
  addSupplier: string;
  supplierSelectLabel: string;
  supplierPlaceholder: string;
  uploadTitle: string;
  uploadHint: string;
  fileLabel: string;
  importButton: string;
  importing: string;
  importsTitle: string;
  importsEmpty: string;
  refresh: string;
  loadError: string;
  sessionRequired: string;
  columns: {
    sku: string;
    name: string;
    unit: string;
    price: string;
    currency: string;
  };
  previewTitle: string;
  previewHint: string;
  lineTruncationNote: string;
  approveTitle: string;
  approveBody: string;
  approveButton: string;
  approving: string;
  approvedBadge: string;
  pendingBadge: string;
  failedBadge: string;
  articleCount: string;
  formatLabel: string;
};

const de: ResourceManagementModuleCopy = {
  benefitTitle: "Funktion",
  benefitBody:
    "Lieferanten-Kataloge als DATANORM-Paket (ZIP/Text) oder BMEcat-XML (typisch IDS-/Haendler-Kataloge) importieren. Nach dem Upload pruefen Sie die extrahierten Zeilen und geben den Import frei — erst dann werden Artikel und Preise in Ihren Mandantenstamm uebernommen.",
  scopeTitle: "MVP-Umfang",
  scopeBody:
    "DATANORM: semikolongetrennte W- und P-Saetze (gaengiges Lieferantenformat). BMEcat: PRODUCT-Knoten mit SUPPLIER_PID und PRICE_DETAILS. Keine Live-Anbindung IDS-Connect-API in dieser Ausbaustufe — nur Dateiupload.",
  datanormTitle: "DATANORM",
  datanormBody:
    "ZIP mit einer oder mehreren Textdateien oder eine einzelne .txt — Kodierung wird als Windows-1252 oder UTF-8 versucht.",
  bmecatTitle: "BMEcat / IDS-Katalogdatei",
  bmecatBody:
    "XML nach ueblichem BMEcat-Layout (BMECAT, T_NEW_CATALOG, PRODUCT, PRICE_AMOUNT). Geeignet fuer statische Katalogdateien Ihres Grosshaendlers.",
  retentionNote:
    "Nach Ablauf der Aufbewahrungsfrist werden Import-Metadaten und Vorschauzeilen nicht mehr angezeigt; freigegebene Artikel bleiben im Stamm erhalten.",
  privacyTitle: "Datenschutz",
  privacyBody:
    "Rohdateien werden nicht dauerhaft gespeichert — es bleiben strukturierte Importzeilen und Pruefhinweise fuer die eingestellte Frist.",
  supplierSectionTitle: "Lieferant anlegen",
  supplierNameLabel: "Anzeigename",
  sourceKindLabel: "Quellformat",
  sourceDatanorm: "DATANORM",
  sourceBmecat: "BMEcat (IDS-/Katalog-XML)",
  addSupplier: "Lieferant speichern",
  supplierSelectLabel: "Lieferant fuer Upload",
  supplierPlaceholder: "Bitte Lieferant waehlen",
  uploadTitle: "Katalog importieren",
  uploadHint:
    "Waehlen Sie den zuvor angelegten Lieferanten — das API leitet die Datei an den passenden Parser.",
  fileLabel: "Datei (ZIP, TXT, XML)",
  importButton: "Hochladen und parsen",
  importing: "Import laeuft …",
  importsTitle: "Letzte Importe",
  importsEmpty: "Noch keine Katalogimporte.",
  refresh: "Aktualisieren",
  loadError: "Daten konnten nicht geladen werden.",
  sessionRequired: "Bitte melden Sie sich an.",
  columns: {
    sku: "Art.-Nr.",
    name: "Bezeichnung",
    unit: "ME",
    price: "Preis",
    currency: "WHG",
  },
  previewTitle: "Vorschau",
  previewHint:
    "Nur ein Ausschnitt — Detailsliste ist begrenzt; die Gesamtzahl steht in der Kachel.",
  lineTruncationNote:
    "Es werden hoechstens 500 Zeilen angezeigt; der Import enthaelt ggf. mehr.",
  approveTitle: "Freigabe",
  approveBody:
    "Mit der Freigabe werden Artikel in Ihrem Stamm angelegt oder aktualisiert und Preiszeilen gespeichert.",
  approveButton: "Import freigeben",
  approving: "Freigabe …",
  approvedBadge: "Freigegeben",
  pendingBadge: "Pruefung",
  failedBadge: "Fehler",
  articleCount: "Positionen",
  formatLabel: "Format",
};

const en: ResourceManagementModuleCopy = {
  benefitTitle: "What this does",
  benefitBody:
    "Import supplier catalogs as a DATANORM package (ZIP/text) or BMEcat XML (typical IDS/wholesale catalogs). After upload, review extracted rows and approve — only then articles and prices are merged into your tenant master data.",
  scopeTitle: "MVP scope",
  scopeBody:
    "DATANORM: semicolon-separated W and P records. BMEcat: PRODUCT nodes with SUPPLIER_PID and PRICE_DETAILS. No live IDS Connect API in this phase — file upload only.",
  datanormTitle: "DATANORM",
  datanormBody:
    "ZIP with one or more text files or a single .txt — encoding tries Windows-1252 then UTF-8.",
  bmecatTitle: "BMEcat / IDS catalog file",
  bmecatBody:
    "XML in common BMEcat shape (BMECAT, T_NEW_CATALOG, PRODUCT, PRICE_AMOUNT) for static wholesaler catalogs.",
  retentionNote:
    "After the retention window, import previews disappear from the UI; approved articles remain in stock.",
  privacyTitle: "Privacy",
  privacyBody:
    "Raw uploads are not kept long-term — structured lines and parse notes are retained for the configured period.",
  supplierSectionTitle: "Add supplier",
  supplierNameLabel: "Display name",
  sourceKindLabel: "Source format",
  sourceDatanorm: "DATANORM",
  sourceBmecat: "BMEcat (IDS / catalog XML)",
  addSupplier: "Save supplier",
  supplierSelectLabel: "Supplier for upload",
  supplierPlaceholder: "Choose a supplier",
  uploadTitle: "Import catalog",
  uploadHint:
    "Pick the supplier you created — the API routes the file to the right parser.",
  fileLabel: "File (ZIP, TXT, XML)",
  importButton: "Upload and parse",
  importing: "Import running…",
  importsTitle: "Recent imports",
  importsEmpty: "No catalog imports yet.",
  refresh: "Refresh",
  loadError: "Could not load data.",
  sessionRequired: "Please sign in.",
  columns: {
    sku: "SKU",
    name: "Description",
    unit: "UoM",
    price: "Price",
    currency: "Cur.",
  },
  previewTitle: "Preview",
  previewHint: "Truncated list — total count is shown on the card.",
  lineTruncationNote: "Up to 500 rows are shown; the import may contain more.",
  approveTitle: "Approval",
  approveBody:
    "Approving upserts articles in your master data and records price rows.",
  approveButton: "Approve import",
  approving: "Approving…",
  approvedBadge: "Approved",
  pendingBadge: "Review",
  failedBadge: "Failed",
  articleCount: "Lines",
  formatLabel: "Format",
};

export function getResourceManagementModuleCopy(
  locale: Locale,
): ResourceManagementModuleCopy {
  return locale === "en" ? en : de;
}
