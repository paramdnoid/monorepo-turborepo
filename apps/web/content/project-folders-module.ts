import type { Locale } from "@/lib/i18n/locale";

export type ProjectFoldersModuleCopy = {
  introTitle: string;
  introBody: string;
  projectLabel: string;
  projectPlaceholder: string;
  tabDocuments: string;
  tabPhotos: string;
  tabGaeb: string;
  uploadTitle: string;
  uploadHint: string;
  kindLabel: string;
  kinds: { value: string; label: string }[];
  fileLabel: string;
  uploadButton: string;
  uploading: string;
  refresh: string;
  assetsTitle: string;
  assetsEmpty: string;
  gaebTitle: string;
  gaebEmpty: string;
  gaebOpenModule: string;
  columns: {
    name: string;
    kind: string;
    size: string;
    date: string;
    actions: string;
  };
  download: string;
  delete: string;
  deleting: string;
  loadError: string;
  sessionRequired: string;
  storageUnavailable: string;
};

const de: ProjectFoldersModuleCopy = {
  introTitle: "Digitale Projektmappe",
  introBody:
    "Alle Dokumente, Plaene und Fotos zu einem Projekt — Ablage auf dem Server. GAEB-Ausschreibungen weiterhin im Modul GAEB bearbeiten.",
  projectLabel: "Projekt",
  projectPlaceholder: "Projekt waehlen …",
  tabDocuments: "Dokumente & Plaene",
  tabPhotos: "Fotos",
  tabGaeb: "Ausschreibung (GAEB)",
  uploadTitle: "Datei hochladen",
  uploadHint:
    "PDF, JPEG, PNG oder WebP. Groesse und Typ prueft die API.",
  kindLabel: "Kategorie",
  kinds: [
    { value: "plan", label: "Plan / Zeichnung" },
    { value: "document", label: "Dokument" },
    { value: "other", label: "Sonstiges" },
  ],
  fileLabel: "Datei",
  uploadButton: "Hochladen",
  uploading: "Wird hochgeladen …",
  refresh: "Aktualisieren",
  assetsTitle: "Dateien in dieser Mappe",
  assetsEmpty: "Noch keine Dateien fuer dieses Projekt.",
  gaebTitle: "Importierte GAEB-Dateien (Zuordnung zum Projekt)",
  gaebEmpty: "Keine GAEB-Imports fuer dieses Projekt.",
  gaebOpenModule: "Zum GAEB-Modul",
  columns: {
    name: "Name",
    kind: "Kategorie",
    size: "Groesse",
    date: "Datum",
    actions: "Aktionen",
  },
  download: "Herunterladen",
  delete: "Loeschen",
  deleting: "Loeschen …",
  loadError: "Daten konnten nicht geladen werden.",
  sessionRequired: "Bitte neu anmelden.",
  storageUnavailable:
    "Projektmappe-Speicher ist nicht konfiguriert (API: PROJECT_ASSETS_DIR).",
};

const en: ProjectFoldersModuleCopy = {
  introTitle: "Digital project folder",
  introBody:
    "Documents, drawings, and photos per project — stored on the server. Edit GAEB tenders in the GAEB module.",
  projectLabel: "Project",
  projectPlaceholder: "Select a project …",
  tabDocuments: "Documents & plans",
  tabPhotos: "Photos",
  tabGaeb: "Tender (GAEB)",
  uploadTitle: "Upload file",
  uploadHint: "PDF, JPEG, PNG, or WebP. The API validates size and type.",
  kindLabel: "Category",
  kinds: [
    { value: "plan", label: "Plan / drawing" },
    { value: "document", label: "Document" },
    { value: "other", label: "Other" },
  ],
  fileLabel: "File",
  uploadButton: "Upload",
  uploading: "Uploading …",
  refresh: "Refresh",
  assetsTitle: "Files in this folder",
  assetsEmpty: "No files for this project yet.",
  gaebTitle: "Imported GAEB files (linked to project)",
  gaebEmpty: "No GAEB imports for this project.",
  gaebOpenModule: "Open GAEB module",
  columns: {
    name: "Name",
    kind: "Category",
    size: "Size",
    date: "Date",
    actions: "Actions",
  },
  download: "Download",
  delete: "Delete",
  deleting: "Deleting …",
  loadError: "Could not load data.",
  sessionRequired: "Please sign in again.",
  storageUnavailable:
    "Project folder storage is not configured (API: PROJECT_ASSETS_DIR).",
};

export function getProjectFoldersModuleCopy(
  locale: Locale,
): ProjectFoldersModuleCopy {
  return locale === "en" ? en : de;
}
