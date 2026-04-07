import type { Locale } from "@/lib/i18n/locale";

export type OrganizationBrandingCopy = {
  cardTitle: string;
  cardDescription: string;
  companyName: string;
  companyNameHint: string;
  senderAddress: string;
  senderAddressHint: string;
  senderAddressSearchPlaceholder: string;
  senderAddressNotConfiguredHint: string;
  senderAddressAutoFilledHint: string;
  senderAddressLocateTitle: string;
  senderAddressLocateUnsupported: string;
  senderAddressLocateDenied: string;
  senderAddressLocateUnavailable: string;
  senderAddressLocateTimeout: string;
  senderAddressLocateFailed: string;
  senderStreet: string;
  senderHouseNumber: string;
  senderPostalCode: string;
  senderCity: string;
  senderCountry: string;
  senderCoordinatesLabel: string;
  senderAddressIncompleteError: string;
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
  loading: string;
  logoPreviewAlt: string;
};

const de: OrganizationBrandingCopy = {
  cardTitle: "Firma & Belegkopf",
  cardDescription:
    "Diese Angaben erscheinen auf Angeboten, Rechnungen und in der Druckvorschau. Die Handwerkszuordnung (Trade-Slug) bleibt unveraendert.",
  companyName: "Firmenname",
  companyNameHint: "Wird prominent im Briefkopf verwendet.",
  senderAddress: "Absenderadresse",
  senderAddressHint:
    "Suche, GPS-Ortung oder manuelle Eingabe. Die Daten erscheinen im Briefkopf (Strasse, PLZ Ort, Land).",
  senderAddressSearchPlaceholder: "Adresse suchen…",
  senderAddressNotConfiguredHint:
    "Adresssuche ist nicht konfiguriert. Felder koennen manuell befuellt werden.",
  senderAddressAutoFilledHint:
    "Automatisch ermittelt – bitte pruefen und ggf. korrigieren.",
  senderAddressLocateTitle: "GPS-Standort ermitteln",
  senderAddressLocateUnsupported: "Ihr Browser unterstuetzt keine GPS-Ortung.",
  senderAddressLocateDenied:
    "GPS-Zugriff wurde verweigert. Bitte aktivieren Sie die Standortfreigabe in Ihren Browser-Einstellungen.",
  senderAddressLocateUnavailable:
    "Position nicht verfuegbar. Standortdienste sind moeglicherweise deaktiviert.",
  senderAddressLocateTimeout:
    "Zeitueberschreitung bei der Standortermittlung. Bitte versuchen Sie es erneut.",
  senderAddressLocateFailed: "Standort konnte nicht ermittelt werden.",
  senderStreet: "Strasse",
  senderHouseNumber: "Hausnummer",
  senderPostalCode: "PLZ",
  senderCity: "Stadt",
  senderCountry: "Land",
  senderCoordinatesLabel: "Koordinaten",
  senderAddressIncompleteError:
    "Bitte Strasse, PLZ und Stadt vollstaendig ausfuellen (oder Felder leeren).",
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
  loading: "Daten werden geladen…",
  logoPreviewAlt: "Aktuelles Organisationslogo",
};

const en: OrganizationBrandingCopy = {
  cardTitle: "Company & document header",
  cardDescription:
    "These details appear on quotes, invoices, and print preview. Trade assignment (trade slug) is unchanged.",
  companyName: "Company name",
  companyNameHint: "Shown prominently in the letterhead.",
  senderAddress: "Sender address",
  senderAddressHint:
    "Lookup, GPS, or manual entry. These details appear in the letterhead (street, postal code + city, country).",
  senderAddressSearchPlaceholder: "Search address…",
  senderAddressNotConfiguredHint:
    "Address lookup is not configured. You can fill in the fields manually.",
  senderAddressAutoFilledHint:
    "Filled automatically — please verify and adjust if needed.",
  senderAddressLocateTitle: "Use GPS location",
  senderAddressLocateUnsupported: "Your browser does not support geolocation.",
  senderAddressLocateDenied:
    "Location access was denied. Please allow location access in your browser settings.",
  senderAddressLocateUnavailable:
    "Location unavailable. Location services might be disabled.",
  senderAddressLocateTimeout:
    "Location lookup timed out. Please try again.",
  senderAddressLocateFailed: "Could not determine location.",
  senderStreet: "Street",
  senderHouseNumber: "House no.",
  senderPostalCode: "Postal code",
  senderCity: "City",
  senderCountry: "Country",
  senderCoordinatesLabel: "Coordinates",
  senderAddressIncompleteError:
    "Please fill in street, postal code, and city (or clear the fields).",
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
  loading: "Loading…",
  logoPreviewAlt: "Current organization logo",
};

export function getOrganizationBrandingCopy(
  locale: Locale,
): OrganizationBrandingCopy {
  return locale === "en" ? en : de;
}
