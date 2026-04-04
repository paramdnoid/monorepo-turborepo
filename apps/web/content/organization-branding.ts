import type { Locale } from "@/lib/i18n/locale";

export type OrganizationBrandingCopy = {
  cardTitle: string;
  cardDescription: string;
  companyName: string;
  companyNameHint: string;
  senderAddress: string;
  senderAddressHint: string;
  vatId: string;
  taxNumber: string;
  logoLabel: string;
  logoHint: string;
  uploadLogo: string;
  clearLogo: string;
  save: string;
  saving: string;
  saved: string;
  saveFailed: string;
  loadFailed: string;
  uploadFailed: string;
  legalHint: string;
  retry: string;
  nameRequired: string;
};

const de: OrganizationBrandingCopy = {
  cardTitle: "Firma & Belegkopf",
  cardDescription:
    "Diese Angaben erscheinen auf Angeboten, Rechnungen und in der Druckvorschau. Die Handwerkszuordnung (Trade-Slug) bleibt unveraendert.",
  companyName: "Firmenname",
  companyNameHint: "Wird prominent im Briefkopf verwendet.",
  senderAddress: "Absenderadresse",
  senderAddressHint: "Mehrzeilig moeglich (Strasse, PLZ Ort, Land).",
  vatId: "USt-IdNr.",
  taxNumber: "Steuernummer",
  logoLabel: "Logo",
  logoHint: "JPEG, PNG oder WebP, max. 2 MB. Wird in Vorschau und (JPEG/PNG) im serverseitigen PDF genutzt.",
  uploadLogo: "Logo hochladen",
  clearLogo: "Logo entfernen",
  save: "Speichern",
  saving: "Speichern…",
  saved: "Gespeichert.",
  saveFailed: "Speichern fehlgeschlagen.",
  loadFailed: "Daten konnten nicht geladen werden.",
  uploadFailed: "Logo-Upload fehlgeschlagen.",
  legalHint:
    "Fuer rechtskonforme Rechnungen sind vollstaendige Absenderdaten in der Regel erforderlich — pruefen Sie bei Ihrem Steuerberater.",
  retry: "Erneut laden",
  nameRequired: "Der Firmenname darf nicht leer sein.",
};

const en: OrganizationBrandingCopy = {
  cardTitle: "Company & document header",
  cardDescription:
    "These details appear on quotes, invoices, and print preview. Trade assignment (trade slug) is unchanged.",
  companyName: "Company name",
  companyNameHint: "Shown prominently in the letterhead.",
  senderAddress: "Sender address",
  senderAddressHint: "Multiple lines supported (street, postal code, country).",
  vatId: "VAT ID",
  taxNumber: "Tax number",
  logoLabel: "Logo",
  logoHint:
    "JPEG, PNG or WebP, max. 2 MB. Used in preview and (JPEG/PNG) in server-side PDF.",
  uploadLogo: "Upload logo",
  clearLogo: "Remove logo",
  save: "Save",
  saving: "Saving…",
  saved: "Saved.",
  saveFailed: "Could not save.",
  loadFailed: "Could not load data.",
  uploadFailed: "Logo upload failed.",
  legalHint:
    "Fully compliant invoices usually require complete sender details — confirm with your tax advisor.",
  retry: "Retry",
  nameRequired: "Company name cannot be empty.",
};

export function getOrganizationBrandingCopy(
  locale: Locale,
): OrganizationBrandingCopy {
  return locale === "en" ? en : de;
}
