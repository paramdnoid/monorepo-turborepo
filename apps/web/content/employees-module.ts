import type { Locale } from "@/lib/i18n/locale";

type EmployeesCopy = {
  listTitle: string;
  listDescription: string;
  addEmployee: string;
  adding: string;
  loadError: string;
  backToList: string;
  empty: string;
  tableName: string;
  tableRole: string;
  tableCity: string;
  tableGeo: string;
  geoYes: string;
  geoNo: string;
  detailLoadError: string;
  detailNotFound: string;
  save: string;
  saving: string;
  saved: string;
  saveError: string;
  privacyHint: string;
  sectionMain: string;
  fieldDisplayName: string;
  fieldRole: string;
  fieldNotes: string;
  sectionPrivateAddress: string;
  fieldAddressLabel: string;
  fieldAddressLine2: string;
  fieldRecipient: string;
  fieldStreet: string;
  fieldPostal: string;
  fieldCity: string;
  fieldCountry: string;
  fieldLatitude: string;
  fieldLongitude: string;
  sectionAvailability: string;
  weekdayLabel: string;
  startTime: string;
  endTime: string;
  addSlot: string;
  removeSlot: string;
  archiveLabel: string;
  archivedHint: string;
  createDialogTitle: string;
  createDialogDescription: string;
  cancel: string;
  createSubmit: string;
  wizardNext: string;
  wizardBack: string;
  createNameRequired: string;
  createWizardStep1Description: string;
  createWizardStep2Description: string;
  createWizardStep3Description: string;
};

const de: EmployeesCopy = {
  listTitle: "Team",
  listDescription:
    "Stammdaten, private Startadresse mit Koordinaten und woechentliche Verfuegbarkeit.",
  addEmployee: "Mitarbeiter anlegen",
  adding: "Wird angelegt…",
  loadError: "Liste konnte nicht geladen werden.",
  backToList: "Zurueck zur Liste",
  empty: "Noch keine Mitarbeiter erfasst.",
  tableName: "Name",
  tableRole: "Rolle",
  tableCity: "Ort",
  tableGeo: "Geokoord.",
  geoYes: "Ja",
  geoNo: "—",
  detailLoadError: "Daten konnten nicht geladen werden.",
  detailNotFound: "Mitarbeiter nicht gefunden.",
  save: "Speichern",
  saving: "Speichern…",
  saved: "Gespeichert.",
  saveError: "Speichern fehlgeschlagen.",
  privacyHint:
    "Interne Adresse nur fuer Planung — nicht in Kundenunterlagen verwenden.",
  sectionMain: "Stammdaten",
  fieldDisplayName: "Anzeigename",
  fieldRole: "Rolle / Funktion",
  fieldNotes: "Notizen",
  sectionPrivateAddress: "Private Startadresse",
  fieldAddressLabel: "Bezeichnung",
  fieldAddressLine2: "Adresszusatz",
  fieldRecipient: "Empfaenger",
  fieldStreet: "Strasse",
  fieldPostal: "PLZ",
  fieldCity: "Ort",
  fieldCountry: "Land (ISO-2)",
  fieldLatitude: "Breitengrad",
  fieldLongitude: "Laengengrad",
  sectionAvailability: "Woechentliche Verfuegbarkeit",
  weekdayLabel: "Wochentag",
  startTime: "Von",
  endTime: "Bis",
  addSlot: "Zeitfenster hinzufuegen",
  removeSlot: "Entfernen",
  archiveLabel: "Archiviert",
  archivedHint: "Archivierte Mitarbeiter werden in der Standardliste ausgeblendet.",
  createDialogTitle: "Neuen Mitarbeiter anlegen",
  createDialogDescription:
    "Stammdaten, private Startadresse mit Koordinaten und woechentliche Verfuegbarkeit. Pflicht ist nur der Anzeigename.",
  cancel: "Abbrechen",
  createSubmit: "Anlegen",
  wizardNext: "Weiter",
  wizardBack: "Zurueck",
  createNameRequired: "Bitte einen Anzeigenamen eingeben.",
  createWizardStep1Description:
    "Name, Rolle und Notizen — nur der Anzeigename ist Pflicht.",
  createWizardStep2Description:
    "Private Startadresse fuer Planung und Routen (optional, mit Geocoding).",
  createWizardStep3Description:
    "Woechentliche Verfuegbarkeit optional als Zeitfenster.",
};

const en: EmployeesCopy = {
  listTitle: "Team",
  listDescription:
    "Master data, private start address with coordinates, and weekly availability.",
  addEmployee: "Add employee",
  adding: "Creating…",
  loadError: "Could not load the list.",
  backToList: "Back to list",
  empty: "No employees yet.",
  tableName: "Name",
  tableRole: "Role",
  tableCity: "City",
  tableGeo: "Geo",
  geoYes: "Yes",
  geoNo: "—",
  detailLoadError: "Could not load data.",
  detailNotFound: "Employee not found.",
  save: "Save",
  saving: "Saving…",
  saved: "Saved.",
  saveError: "Save failed.",
  privacyHint:
    "Internal address for planning only — do not use on customer documents.",
  sectionMain: "Master data",
  fieldDisplayName: "Display name",
  fieldRole: "Role",
  fieldNotes: "Notes",
  sectionPrivateAddress: "Private start address",
  fieldAddressLabel: "Label",
  fieldAddressLine2: "Address line 2",
  fieldRecipient: "Recipient",
  fieldStreet: "Street",
  fieldPostal: "Postal code",
  fieldCity: "City",
  fieldCountry: "Country (ISO-2)",
  fieldLatitude: "Latitude",
  fieldLongitude: "Longitude",
  sectionAvailability: "Weekly availability",
  weekdayLabel: "Weekday",
  startTime: "From",
  endTime: "To",
  addSlot: "Add time window",
  removeSlot: "Remove",
  archiveLabel: "Archived",
  archivedHint: "Archived employees are hidden from the default list.",
  createDialogTitle: "Add new employee",
  createDialogDescription:
    "Master data, private start address with coordinates, and weekly availability. Only the display name is required.",
  cancel: "Cancel",
  createSubmit: "Create",
  wizardNext: "Next",
  wizardBack: "Back",
  createNameRequired: "Enter a display name.",
  createWizardStep1Description:
    "Name, role, and notes — only the display name is required.",
  createWizardStep2Description:
    "Private start address for planning and routing (optional, with geocoding).",
  createWizardStep3Description:
    "Optional weekly availability as time windows.",
};

function copy(locale: Locale): EmployeesCopy {
  return locale === "en" ? en : de;
}

export function getEmployeesCopy(locale: Locale): EmployeesCopy {
  return copy(locale);
}

/** 0 = Stammdaten, 1 = Adresse, 2 = Verfuegbarkeit */
export const EMPLOYEE_CREATE_WIZARD_STEP_COUNT = 3;

export function getEmployeeCreateWizardDescription(
  locale: Locale,
  stepIndex: number,
): string {
  const c = copy(locale);
  if (stepIndex === 0) {
    return c.createWizardStep1Description;
  }
  if (stepIndex === 1) {
    return c.createWizardStep2Description;
  }
  return c.createWizardStep3Description;
}

export function formatEmployeeCreateWizardProgress(
  locale: Locale,
  stepIndex: number,
): string {
  const current = stepIndex + 1;
  const total = EMPLOYEE_CREATE_WIZARD_STEP_COUNT;
  return locale === "en"
    ? `Step ${current} of ${total}`
    : `Schritt ${current} von ${total}`;
}

export function weekdayOptions(locale: Locale): { value: string; label: string }[] {
  if (locale === "en") {
    return [
      { value: "0", label: "Sunday" },
      { value: "1", label: "Monday" },
      { value: "2", label: "Tuesday" },
      { value: "3", label: "Wednesday" },
      { value: "4", label: "Thursday" },
      { value: "5", label: "Friday" },
      { value: "6", label: "Saturday" },
    ];
  }
  return [
    { value: "0", label: "Sonntag" },
    { value: "1", label: "Montag" },
    { value: "2", label: "Dienstag" },
    { value: "3", label: "Mittwoch" },
    { value: "4", label: "Donnerstag" },
    { value: "5", label: "Freitag" },
    { value: "6", label: "Samstag" },
  ];
}
