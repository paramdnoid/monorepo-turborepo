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
  sourceIdsConnect: string;
  idsConnectModeLabel: string;
  idsConnectModeMock: string;
  idsConnectModeHttp: string;
  idsConnectBaseUrlLabel: string;
  idsConnectApiKeyLabel: string;
  idsConnectLiveTitle: string;
  idsConnectLiveHint: string;
  idsConnectPickSupplier: string;
  idsConnectSearchPlaceholder: string;
  idsConnectSearchButton: string;
  idsConnectNewCart: string;
  idsConnectAddToCart: string;
  idsConnectCartLines: string;
  idsConnectSubmitCart: string;
  idsConnectCartStatus: string;
  idsConnectNoSuppliers: string;
  idsConnectQuantity: string;
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
  stockTitle: string;
  stockHint: string;
  stockFilterSupplier: string;
  stockSearchLabel: string;
  stockSearchPlaceholder: string;
  stockSearchApply: string;
  stockEmpty: string;
  stockSupplierCol: string;
  stockLoadMore: string;
  stockLoading: string;
};

const de: ResourceManagementModuleCopy = {
  benefitTitle: "Funktion",
  benefitBody:
    "Lieferanten-Kataloge als DATANORM-Paket (ZIP/Text) oder BMEcat-XML importieren, optional Live-Suche und Warenkorb ueber IDS-Connect-kompatible Endpunkte (Mock oder HTTP-Adapter). Nach Datei-Upload pruefen Sie die extrahierten Zeilen und geben den Import frei — erst dann werden Artikel und Preise in Ihren Mandantenstamm uebernommen.",
  scopeTitle: "Umfang",
  scopeBody:
    "DATANORM: semikolongetrennte W- und P-Saetze. BMEcat: PRODUCT-Knoten mit SUPPLIER_PID und PRICE_DETAILS. IDS Connect Live: serverseitiger Aufruf normalisierter Pfade unter der konfigurierten Basis-URL (siehe API) oder Mock-Modus ohne externe Verbindung.",
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
  sourceIdsConnect: "IDS Connect (Live)",
  idsConnectModeLabel: "Verbindung",
  idsConnectModeMock: "Mock (ohne externe API)",
  idsConnectModeHttp: "HTTP (Basis-URL + API-Key)",
  idsConnectBaseUrlLabel: "Basis-URL des Adapters",
  idsConnectApiKeyLabel: "API-Key / Bearer (optional)",
  idsConnectLiveTitle: "IDS Connect — Live-Suche und Warenkorb",
  idsConnectLiveHint:
    "Waehlen Sie einen IDS-Connect-Lieferanten. Suche und Warenkorb laufen ueber die API (Mock oder konfigurierten HTTP-Adapter).",
  idsConnectPickSupplier: "IDS-Lieferant",
  idsConnectSearchPlaceholder: "Suchbegriff",
  idsConnectSearchButton: "Suchen",
  idsConnectNewCart: "Neuer Warenkorb",
  idsConnectAddToCart: "In Warenkorb",
  idsConnectCartLines: "Positionen",
  idsConnectSubmitCart: "Warenkorb senden",
  idsConnectCartStatus: "Status",
  idsConnectNoSuppliers:
    "Legen Sie zuerst einen Lieferanten mit Quellformat IDS Connect an.",
  idsConnectQuantity: "Menge",
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
  stockTitle: "Artikelstamm (freigegeben)",
  stockHint:
    "Alle aus Katalogimporten freigegebenen Artikel mit zuletzt gespeichertem Preis. Filter nach Lieferant und Textsuche.",
  stockFilterSupplier: "Lieferant",
  stockSearchLabel: "Suche",
  stockSearchPlaceholder: "Art.-Nr. oder Bezeichnung",
  stockSearchApply: "Suchen",
  stockEmpty: "Noch keine Artikel im Stamm.",
  stockSupplierCol: "Lieferant",
  stockLoadMore: "Weitere laden",
  stockLoading: "Laden …",
};

const en: ResourceManagementModuleCopy = {
  benefitTitle: "What this does",
  benefitBody:
    "Import supplier catalogs as DATANORM (ZIP/text) or BMEcat XML, optionally live search and cart via IDS-Connect-compatible endpoints (mock or HTTP adapter). After file upload, review rows and approve to merge articles into master data.",
  scopeTitle: "Scope",
  scopeBody:
    "DATANORM: W/P records. BMEcat: PRODUCT and PRICE_DETAILS. IDS Connect live: server calls normalized paths under your configured base URL (see API) or mock mode without outbound calls.",
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
  sourceIdsConnect: "IDS Connect (live)",
  idsConnectModeLabel: "Connection",
  idsConnectModeMock: "Mock (no external API)",
  idsConnectModeHttp: "HTTP (base URL + API key)",
  idsConnectBaseUrlLabel: "Adapter base URL",
  idsConnectApiKeyLabel: "API key / Bearer (optional)",
  idsConnectLiveTitle: "IDS Connect — live search and cart",
  idsConnectLiveHint:
    "Pick an IDS Connect supplier. Search and cart go through the API (mock or configured HTTP adapter).",
  idsConnectPickSupplier: "IDS supplier",
  idsConnectSearchPlaceholder: "Search term",
  idsConnectSearchButton: "Search",
  idsConnectNewCart: "New cart",
  idsConnectAddToCart: "Add to cart",
  idsConnectCartLines: "Lines",
  idsConnectSubmitCart: "Submit cart",
  idsConnectCartStatus: "Status",
  idsConnectNoSuppliers: "Create a supplier with source IDS Connect first.",
  idsConnectQuantity: "Qty",
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
  stockTitle: "Approved article master",
  stockHint:
    "Items released from catalog imports with the latest stored price. Filter by supplier and search SKU or description.",
  stockFilterSupplier: "Supplier",
  stockSearchLabel: "Search",
  stockSearchPlaceholder: "SKU or description",
  stockSearchApply: "Search",
  stockEmpty: "No articles in master data yet.",
  stockSupplierCol: "Supplier",
  stockLoadMore: "Load more",
  stockLoading: "Loading…",
};

export function getResourceManagementModuleCopy(
  locale: Locale,
): ResourceManagementModuleCopy {
  return locale === "en" ? en : de;
}
