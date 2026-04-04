/**
 * UI copy for employee routes (`/web/employees/*`). Single source of truth for this module;
 * avoid duplicating strings under `content/ui-text.ts` `dashboardWorkbench`.
 */
import type { Locale } from "@/lib/i18n/locale";

type EmployeesCopy = {
  listTitle: string;
  listDescription: string;
  addEmployee: string;
  adding: string;
  loadError: string;
  backToList: string;
  profileNavAriaLabel: string;
  empty: string;
  tableName: string;
  tableEmployeeNo: string;
  tableRole: string;
  tableEmployeeStatus: string;
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
  saveConflict: string;
  saveForbidden: string;
  permissionReadOnly: string;
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
  fieldAvailabilityTimeZone: string;
  weekdayLabel: string;
  startTime: string;
  endTime: string;
  fieldValidFrom: string;
  fieldValidTo: string;
  crossesMidnightLabel: string;
  sectionAvailabilityOverrides: string;
  addOverride: string;
  overrideDate: string;
  overrideUnavailable: string;
  overrideNote: string;
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
  searchPlaceholder: string;
  searchAriaLabel: string;
  includeArchivedLabel: string;
  listSortHint: string;
  emptyFiltered: string;
  tableStatus: string;
  badgeArchived: string;
  badgeActive: string;
  paginationPrev: string;
  paginationNext: string;
  listLoadingAria: string;
  createdBanner: string;
  openProfile: string;
  dismissBanner: string;
  fieldGeocodedAt: string;
  geocodedAtNone: string;
  archiveDialogTitle: string;
  archiveDialogDescription: string;
  archiveDialogConfirm: string;
  archiveDialogCancel: string;
  availabilityTimeOrderError: string;
  availabilityOverlapError: string;
  availabilityOverrideOverlapError: string;
  notesCharCount: string;
  validationErrorHint: string;
  savedAria: string;
  deleteSectionTitle: string;
  deleteSectionDescription: string;
  deleteButton: string;
  deleting: string;
  deleteError: string;
  deleteForbidden: string;
  deleteDialogTitle: string;
  deleteDialogDescription: string;
  deleteDialogConfirm: string;
  deletedBanner: string;
  fieldEmployeeNo: string;
  fieldFirstName: string;
  fieldLastName: string;
  fieldEmail: string;
  fieldPhone: string;
  fieldStatus: string;
  fieldEmploymentType: string;
  statusAll: string;
  statusActive: string;
  statusOnboarding: string;
  statusInactive: string;
  employmentFullTime: string;
  employmentPartTime: string;
  employmentContractor: string;
  employmentApprentice: string;
  employeeNoTaken: string;
  sectionVacation: string;
  vacationHistoryTitle: string;
  vacationFrom: string;
  vacationTo: string;
  vacationReason: string;
  vacationSubmit: string;
  vacationSubmitting: string;
  vacationSubmitError: string;
  vacationListError: string;
  vacationEmpty: string;
  vacationStatusPending: string;
  vacationStatusApproved: string;
  vacationStatusRejected: string;
  vacationApprove: string;
  vacationReject: string;
  vacationDecisionError: string;
  vacationDecisionForbidden: string;
  vacationDecisionNoPermission: string;
  vacationCreated: string;
  sectionSick: string;
  sectionActivity: string;
  activityIntro: string;
  activityLoadError: string;
  activityEmpty: string;
  activityActionEmployeeCreated: string;
  activityActionEmployeeUpdated: string;
  activityActionEmployeeDeleted: string;
  activityActionEmployeeSkillsUpdated: string;
  activityActionEmployeeRelationshipUpserted: string;
  activityActionEmployeeRelationshipDeleted: string;
  activityActionEmployeeProfileImageUpdated: string;
  activityActionEmployeeProfileImageDeleted: string;
  activityActionEmployeeAttachmentUploaded: string;
  activityActionEmployeeAttachmentDeleted: string;
  activityActionVacationRequested: string;
  activityActionVacationDecided: string;
  activityActionSickReportCreated: string;
  activityChangedFields: string;
  activityVacationRange: string;
  activityDecisionStatus: string;
  activitySickCertificate: string;
  activitySickConfidentialFlag: string;
  sickHistoryTitle: string;
  sickFrom: string;
  sickTo: string;
  sickConfidential: string;
  sickCertificateRequired: string;
  sickSubmit: string;
  sickSubmitting: string;
  sickSubmitError: string;
  sickListError: string;
  sickEmpty: string;
  sickCreated: string;
  sickConfidentialNoPermission: string;
  sickConfidentialRedacted: string;
  exportCsvButton: string;
  exportCsvError: string;
  batchSelectAllAria: string;
  batchSelectRowAria: string;
  batchSelectedCount: string;
  batchArchiveSelected: string;
  batchUnarchiveSelected: string;
  batchBusy: string;
  batchError: string;
  batchForbidden: string;
  tableCreatedAt: string;
  tableUpdatedAt: string;
  toastExportReady: string;
  toastBatchUpdated: string;
  toastBatchNoop: string;
  toastEmployeeCreated: string;
  toastVacationApproved: string;
  toastVacationRejected: string;
  skillsCardTitle: string;
  skillsCardDescription: string;
  skillsEmpty: string;
  skillsSave: string;
  skillsSaved: string;
  skillsSaveError: string;
  skillsCreatePlaceholder: string;
  skillsCreateCatalog: string;
  skillsCreateError: string;
  relationshipsCardTitle: string;
  relationshipsCardDescription: string;
  relationshipKindLabel: string;
  relationshipKindMutex: string;
  relationshipKindMentor: string;
  relationshipCounterpartLabel: string;
  relationshipNoteLabel: string;
  relationshipAdd: string;
  relationshipRemove: string;
  relationshipSaveError: string;
  relationshipsEmpty: string;
  filesCardTitle: string;
  filesCardDescription: string;
  profileImageAlt: string;
  filesProfileUploadAria: string;
  filesAttachmentUploadAria: string;
  filesProfileDelete: string;
  filesAttachmentsTitle: string;
  filesUploadError: string;
  filesDeleteError: string;
  filesEmpty: string;
  filesKindDocument: string;
  filesKindCertificate: string;
  filesKindOther: string;
  filesDownload: string;
  filesDeleteAttachment: string;
  validationIssueLatitudeLongitudePair: string;
  validationIssueLatitudeRange: string;
  validationIssueLongitudeRange: string;
  validationIssueInvalidTime: string;
  validationIssueInvalidDate: string;
  validationIssueInvalidTimezone: string;
  validationIssueGeneric: string;
};

const de: EmployeesCopy = {
  listTitle: "Team",
  listDescription:
    "Stammdaten, private Startadresse mit Koordinaten und woechentliche Verfuegbarkeit.",
  addEmployee: "Mitarbeiter anlegen",
  adding: "Wird angelegt…",
  loadError: "Liste konnte nicht geladen werden.",
  backToList: "Zurueck zur Liste",
  profileNavAriaLabel: "Profilnavigation Mitarbeitende",
  empty: "Noch keine Mitarbeiter erfasst.",
  tableName: "Name",
  tableEmployeeNo: "Pers.-Nr.",
  tableRole: "Rolle",
  tableEmployeeStatus: "Status",
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
  saveConflict: "Konflikt erkannt. Daten wurden neu geladen; bitte pruefen und erneut speichern.",
  saveForbidden: "Du hast keine Berechtigung, Mitarbeitende zu bearbeiten.",
  permissionReadOnly: "Nur lesender Zugriff: Bearbeiten ist fuer deine Rolle gesperrt.",
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
  fieldAvailabilityTimeZone: "Zeitzone",
  weekdayLabel: "Wochentag",
  startTime: "Von",
  endTime: "Bis",
  fieldValidFrom: "Gueltig ab",
  fieldValidTo: "Gueltig bis",
  crossesMidnightLabel: "Endet am Folgetag",
  sectionAvailabilityOverrides: "Ausnahmen / Overrides",
  addOverride: "Ausnahme hinzufuegen",
  overrideDate: "Datum",
  overrideUnavailable: "Ganztags nicht verfuegbar",
  overrideNote: "Notiz",
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
  searchPlaceholder: "Name, Personalnr., Rolle oder Ort suchen …",
  searchAriaLabel: "Mitarbeitende durchsuchen",
  includeArchivedLabel: "Archivierte einblenden",
  listSortHint: "Sortierung: Anzeigename A–Z.",
  emptyFiltered: "Keine Treffer fuer die aktuelle Suche oder Filter.",
  tableStatus: "Archiv",
  badgeArchived: "Archiviert",
  badgeActive: "Aktiv",
  paginationPrev: "Zurueck",
  paginationNext: "Weiter",
  listLoadingAria: "Mitarbeiterliste wird geladen",
  createdBanner: "Mitarbeitende:r wurde angelegt.",
  openProfile: "Zum Profil",
  dismissBanner: "Schliessen",
  fieldGeocodedAt: "Geocoding-Zeitpunkt",
  geocodedAtNone: "Noch nicht geocodiert.",
  archiveDialogTitle: "Mitarbeitende:n archivieren?",
  archiveDialogDescription:
    "Archivierte Personen erscheinen nicht mehr in der Standardliste. Du kannst die Archivierung spaeter wieder aufheben.",
  archiveDialogConfirm: "Archivieren",
  archiveDialogCancel: "Abbrechen",
  availabilityTimeOrderError:
    "Ungueltige Zeitfolge. Ohne Nachtschicht muss Ende nach Start liegen; mit Nachtschicht muss Ende vor Start liegen.",
  availabilityOverlapError:
    "Ueberlappende Zeitfenster am selben Wochentag — bitte anpassen.",
  availabilityOverrideOverlapError:
    "Ueberlappende Ausnahmen am selben Datum — bitte anpassen.",
  notesCharCount: "{n} / {max} Zeichen",
  validationErrorHint:
    "Die Eingabe wurde abgelehnt. Bitte Felder und Verfuegbarkeit pruefen.",
  savedAria: "Aenderungen gespeichert.",
  deleteSectionTitle: "Mitarbeitende:r loeschen",
  deleteSectionDescription:
    "Dieser Vorgang entfernt den Datensatz dauerhaft inklusive Verfuegbarkeiten.",
  deleteButton: "Dauerhaft loeschen",
  deleting: "Loeschen…",
  deleteError: "Loeschen fehlgeschlagen.",
  deleteForbidden: "Du hast keine Berechtigung, Mitarbeitende zu loeschen.",
  deleteDialogTitle: "Mitarbeitende:n wirklich dauerhaft loeschen?",
  deleteDialogDescription:
    "Diese Aktion kann nicht rueckgaengig gemacht werden.",
  deleteDialogConfirm: "Jetzt loeschen",
  deletedBanner: "Mitarbeitende:r wurde geloescht.",
  fieldEmployeeNo: "Personalnummer",
  fieldFirstName: "Vorname",
  fieldLastName: "Nachname",
  fieldEmail: "E-Mail",
  fieldPhone: "Telefon",
  fieldStatus: "Status",
  fieldEmploymentType: "Beschaeftigungstyp",
  statusAll: "Alle Status",
  statusActive: "Aktiv",
  statusOnboarding: "Onboarding",
  statusInactive: "Inaktiv",
  employmentFullTime: "Vollzeit",
  employmentPartTime: "Teilzeit",
  employmentContractor: "Freier Vertrag",
  employmentApprentice: "Auszubildende:r",
  employeeNoTaken: "Diese Personalnummer ist im Mandanten bereits vergeben.",
  sectionVacation: "Urlaubsplanung",
  vacationHistoryTitle: "Antragshistorie",
  vacationFrom: "Von",
  vacationTo: "Bis",
  vacationReason: "Grund",
  vacationSubmit: "Urlaubsantrag senden",
  vacationSubmitting: "Wird gesendet…",
  vacationSubmitError: "Urlaubsantrag konnte nicht erstellt werden.",
  vacationListError: "Urlaubsantraege konnten nicht geladen werden.",
  vacationEmpty: "Noch keine Urlaubsantraege vorhanden.",
  vacationStatusPending: "Ausstehend",
  vacationStatusApproved: "Genehmigt",
  vacationStatusRejected: "Abgelehnt",
  vacationApprove: "Genehmigen",
  vacationReject: "Ablehnen",
  vacationDecisionError: "Entscheidung konnte nicht gespeichert werden.",
  vacationDecisionForbidden:
    "Du hast keine Berechtigung, Urlaubsantraege zu genehmigen oder abzulehnen.",
  vacationDecisionNoPermission:
    "Genehmigungsaktionen sind fuer deine Rolle nicht freigeschaltet.",
  vacationCreated: "Urlaubsantrag eingereicht.",
  sectionSick: "Schnelle Krankmeldung",
  sectionActivity: "Aktivitaet",
  activityIntro:
    "Chronologischer Verlauf (ohne Inhalt vertraulicher Krank-Notizen).",
  activityLoadError: "Aktivitaet konnte nicht geladen werden.",
  activityEmpty: "Noch keine Aktivitaetsereignisse.",
  activityActionEmployeeCreated: "Mitarbeitende:r angelegt",
  activityActionEmployeeUpdated: "Daten geaendert",
  activityActionEmployeeDeleted: "Mitarbeitende:r geloescht",
  activityActionEmployeeSkillsUpdated: "Skills aktualisiert",
  activityActionEmployeeRelationshipUpserted: "Beziehung gespeichert",
  activityActionEmployeeRelationshipDeleted: "Beziehung entfernt",
  activityActionEmployeeProfileImageUpdated: "Profilbild aktualisiert",
  activityActionEmployeeProfileImageDeleted: "Profilbild entfernt",
  activityActionEmployeeAttachmentUploaded: "Anhang hochgeladen",
  activityActionEmployeeAttachmentDeleted: "Anhang entfernt",
  activityActionVacationRequested: "Urlaubsantrag eingereicht",
  activityActionVacationDecided: "Urlaubsantrag entschieden",
  activityActionSickReportCreated: "Krankmeldung erfasst",
  activityChangedFields: "Betroffene Bereiche: {fields}",
  activityVacationRange: "Zeitraum {from} – {to}",
  activityDecisionStatus: "Entscheidung: {status}",
  activitySickCertificate: "Attest: {value}",
  activitySickConfidentialFlag: "Vertrauliche Notiz: {value}",
  sickHistoryTitle: "Krankmeldungen Historie",
  sickFrom: "Von",
  sickTo: "Bis",
  sickConfidential: "Hinweis (vertraulich)",
  sickCertificateRequired: "Attest erforderlich",
  sickSubmit: "Krankmeldung senden",
  sickSubmitting: "Wird gesendet…",
  sickSubmitError: "Krankmeldung konnte nicht erfasst werden.",
  sickListError: "Krankmeldungen konnten nicht geladen werden.",
  sickEmpty: "Keine Krankmeldungen vorhanden.",
  sickCreated: "Krankmeldung erfasst.",
  sickConfidentialNoPermission:
    "Vertrauliche Notizen koennen nur von berechtigten Rollen erfasst werden.",
  sickConfidentialRedacted: "Vertrauliche Notiz ausgeblendet.",
  exportCsvButton: "CSV exportieren",
  exportCsvError: "Export konnte nicht erstellt werden.",
  batchSelectAllAria: "Alle auf dieser Seite auswaehlen",
  batchSelectRowAria: "Zeile auswaehlen",
  batchSelectedCount: "{n} ausgewaehlt",
  batchArchiveSelected: "Ausgewaehlte archivieren",
  batchUnarchiveSelected: "Ausgewaehlte reaktivieren",
  batchBusy: "Wird aktualisiert…",
  batchError: "Massenaktion fehlgeschlagen.",
  batchForbidden: "Du hast keine Berechtigung fuer Massenaktionen.",
  tableCreatedAt: "Angelegt",
  tableUpdatedAt: "Geaendert",
  toastExportReady: "Export wurde heruntergeladen.",
  toastBatchUpdated: "{n} Eintraege aktualisiert.",
  toastBatchNoop: "Keine Aenderung noetig.",
  toastEmployeeCreated: "Mitarbeitende:r angelegt.",
  toastVacationApproved: "Antrag genehmigt.",
  toastVacationRejected: "Antrag abgelehnt.",
  skillsCardTitle: "Qualifikationen & Skills",
  skillsCardDescription:
    "Mandantenweiter Katalog; Zuordnung pro Person fuer Planung und Auswertung.",
  skillsEmpty: "Noch keine Skills im Katalog.",
  skillsSave: "Skills speichern",
  skillsSaved: "Skills aktualisiert.",
  skillsSaveError: "Skills konnten nicht gespeichert werden.",
  skillsCreatePlaceholder: "Neuer Skill (z. B. Stapler, Erste Hilfe)",
  skillsCreateCatalog: "Zum Katalog hinzufuegen",
  skillsCreateError: "Skill konnte nicht angelegt werden.",
  relationshipsCardTitle: "Abhaengigkeiten zwischen Mitarbeitenden",
  relationshipsCardDescription:
    "Einsatzregeln: nicht gemeinsam einsetzbar oder Mentor–Trainee (Hinweis in der Planung).",
  relationshipKindLabel: "Typ",
  relationshipKindMutex: "Nicht gemeinsam einsetzbar",
  relationshipKindMentor: "Mentor → Trainee",
  relationshipCounterpartLabel: "Verknuepfte:r Mitarbeitende:r",
  relationshipNoteLabel: "Notiz",
  relationshipAdd: "Beziehung speichern",
  relationshipRemove: "Entfernen",
  relationshipSaveError: "Beziehung konnte nicht gespeichert werden.",
  relationshipsEmpty: "Noch keine Beziehungen vorhanden.",
  filesCardTitle: "Profilbild & Anhaenge",
  filesCardDescription:
    "Bild fuer Listen und Detail; Dokumente und Bescheinigungen als Anhaenge.",
  profileImageAlt: "Profilbild",
  filesProfileUploadAria: "Profilbild-Datei waehlen",
  filesAttachmentUploadAria: "Anhang-Datei waehlen",
  filesProfileDelete: "Profilbild loeschen",
  filesAttachmentsTitle: "Anhaenge",
  filesUploadError: "Upload fehlgeschlagen.",
  filesDeleteError: "Loeschen fehlgeschlagen.",
  filesEmpty: "Noch keine Anhaenge vorhanden.",
  filesKindDocument: "Dokument",
  filesKindCertificate: "Bescheinigung",
  filesKindOther: "Sonstiges",
  filesDownload: "Herunterladen",
  filesDeleteAttachment: "Loeschen",
  validationIssueLatitudeLongitudePair:
    "Breiten- und Laengengrad nur gemeinsam angeben.",
  validationIssueLatitudeRange: "Breitengrad ungueltig (-90 bis 90).",
  validationIssueLongitudeRange: "Laengengrad ungueltig (-180 bis 180).",
  validationIssueInvalidTime: "Ungueltige Uhrzeit.",
  validationIssueInvalidDate: "Ungueltiges Datum.",
  validationIssueInvalidTimezone: "Ungueltige Zeitzone.",
  validationIssueGeneric: "Eingabe ungueltig.",
};

const en: EmployeesCopy = {
  listTitle: "Team",
  listDescription:
    "Master data, private start address with coordinates, and weekly availability.",
  addEmployee: "Add employee",
  adding: "Creating…",
  loadError: "Could not load the list.",
  backToList: "Back to list",
  profileNavAriaLabel: "Employee profile navigation",
  empty: "No employees yet.",
  tableName: "Name",
  tableEmployeeNo: "No.",
  tableRole: "Role",
  tableEmployeeStatus: "Status",
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
  saveConflict: "Conflict detected. Data was reloaded; please review and save again.",
  saveForbidden: "You do not have permission to edit employees.",
  permissionReadOnly: "Read-only access: editing is disabled for your role.",
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
  fieldAvailabilityTimeZone: "Time zone",
  weekdayLabel: "Weekday",
  startTime: "From",
  endTime: "To",
  fieldValidFrom: "Valid from",
  fieldValidTo: "Valid to",
  crossesMidnightLabel: "Ends next day",
  sectionAvailabilityOverrides: "Exceptions / overrides",
  addOverride: "Add exception",
  overrideDate: "Date",
  overrideUnavailable: "Unavailable all day",
  overrideNote: "Note",
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
  searchPlaceholder: "Search name, employee no., role, or city…",
  searchAriaLabel: "Search employees",
  includeArchivedLabel: "Show archived",
  listSortHint: "Sorted by display name (A–Z).",
  emptyFiltered: "No matches for the current search or filters.",
  tableStatus: "Archive",
  badgeArchived: "Archived",
  badgeActive: "Active",
  paginationPrev: "Previous",
  paginationNext: "Next",
  listLoadingAria: "Loading employee list",
  createdBanner: "Employee created.",
  openProfile: "Open profile",
  dismissBanner: "Dismiss",
  fieldGeocodedAt: "Geocoded at",
  geocodedAtNone: "Not geocoded yet.",
  archiveDialogTitle: "Archive this employee?",
  archiveDialogDescription:
    "Archived people are hidden from the default list. You can undo this later.",
  archiveDialogConfirm: "Archive",
  archiveDialogCancel: "Cancel",
  availabilityTimeOrderError:
    "Invalid time order. Without overnight, end must be after start; with overnight, end must be before start.",
  availabilityOverlapError:
    "Overlapping time windows on the same weekday — please adjust.",
  availabilityOverrideOverlapError:
    "Overlapping exceptions on the same date — please adjust.",
  notesCharCount: "{n} / {max} characters",
  validationErrorHint:
    "The input was rejected. Please check fields and availability.",
  savedAria: "Changes saved.",
  deleteSectionTitle: "Delete employee",
  deleteSectionDescription:
    "This permanently removes the record including availability rules.",
  deleteButton: "Delete permanently",
  deleting: "Deleting…",
  deleteError: "Delete failed.",
  deleteForbidden: "You do not have permission to delete employees.",
  deleteDialogTitle: "Permanently delete this employee?",
  deleteDialogDescription: "This action cannot be undone.",
  deleteDialogConfirm: "Delete now",
  deletedBanner: "Employee deleted.",
  fieldEmployeeNo: "Employee number",
  fieldFirstName: "First name",
  fieldLastName: "Last name",
  fieldEmail: "Email",
  fieldPhone: "Phone",
  fieldStatus: "Status",
  fieldEmploymentType: "Employment type",
  statusAll: "All statuses",
  statusActive: "Active",
  statusOnboarding: "Onboarding",
  statusInactive: "Inactive",
  employmentFullTime: "Full time",
  employmentPartTime: "Part time",
  employmentContractor: "Contractor",
  employmentApprentice: "Apprentice",
  employeeNoTaken: "This employee number is already in use for your tenant.",
  sectionVacation: "Vacation planning",
  vacationHistoryTitle: "Request history",
  vacationFrom: "From",
  vacationTo: "To",
  vacationReason: "Reason",
  vacationSubmit: "Submit vacation request",
  vacationSubmitting: "Submitting…",
  vacationSubmitError: "Vacation request could not be created.",
  vacationListError: "Vacation requests could not be loaded.",
  vacationEmpty: "No vacation requests yet.",
  vacationStatusPending: "Pending",
  vacationStatusApproved: "Approved",
  vacationStatusRejected: "Rejected",
  vacationApprove: "Approve",
  vacationReject: "Reject",
  vacationDecisionError: "Decision could not be saved.",
  vacationDecisionForbidden:
    "You do not have permission to approve or reject vacation requests.",
  vacationDecisionNoPermission:
    "Approval actions are disabled for your current role.",
  vacationCreated: "Vacation request submitted.",
  sectionSick: "Quick sick report",
  sectionActivity: "Activity",
  activityIntro: "Chronological log (no confidential sick note contents).",
  activityLoadError: "Activity could not be loaded.",
  activityEmpty: "No activity events yet.",
  activityActionEmployeeCreated: "Employee created",
  activityActionEmployeeUpdated: "Record updated",
  activityActionEmployeeDeleted: "Employee deleted",
  activityActionEmployeeSkillsUpdated: "Skills updated",
  activityActionEmployeeRelationshipUpserted: "Relationship saved",
  activityActionEmployeeRelationshipDeleted: "Relationship removed",
  activityActionEmployeeProfileImageUpdated: "Profile image updated",
  activityActionEmployeeProfileImageDeleted: "Profile image removed",
  activityActionEmployeeAttachmentUploaded: "Attachment uploaded",
  activityActionEmployeeAttachmentDeleted: "Attachment removed",
  activityActionVacationRequested: "Vacation request submitted",
  activityActionVacationDecided: "Vacation request decided",
  activityActionSickReportCreated: "Sick report recorded",
  activityChangedFields: "Changed: {fields}",
  activityVacationRange: "Period {from} – {to}",
  activityDecisionStatus: "Decision: {status}",
  activitySickCertificate: "Certificate: {value}",
  activitySickConfidentialFlag: "Confidential note: {value}",
  sickHistoryTitle: "Sick reports history",
  sickFrom: "From",
  sickTo: "To",
  sickConfidential: "Confidential note",
  sickCertificateRequired: "Certificate required",
  sickSubmit: "Submit sick report",
  sickSubmitting: "Submitting…",
  sickSubmitError: "Sick report could not be created.",
  sickListError: "Sick reports could not be loaded.",
  sickEmpty: "No sick reports yet.",
  sickCreated: "Sick report submitted.",
  sickConfidentialNoPermission:
    "Confidential notes can only be created by permitted roles.",
  sickConfidentialRedacted: "Confidential note hidden.",
  exportCsvButton: "Export CSV",
  exportCsvError: "Could not create export.",
  batchSelectAllAria: "Select all on this page",
  batchSelectRowAria: "Select row",
  batchSelectedCount: "{n} selected",
  batchArchiveSelected: "Archive selected",
  batchUnarchiveSelected: "Restore selected",
  batchBusy: "Updating…",
  batchError: "Bulk action failed.",
  batchForbidden: "You do not have permission for bulk actions.",
  tableCreatedAt: "Created",
  tableUpdatedAt: "Updated",
  toastExportReady: "Export downloaded.",
  toastBatchUpdated: "{n} record(s) updated.",
  toastBatchNoop: "No changes needed.",
  toastEmployeeCreated: "Employee created.",
  toastVacationApproved: "Request approved.",
  toastVacationRejected: "Request rejected.",
  skillsCardTitle: "Skills & qualifications",
  skillsCardDescription:
    "Tenant-wide catalog; assign per employee for planning and reporting.",
  skillsEmpty: "No skills in the catalog yet.",
  skillsSave: "Save skills",
  skillsSaved: "Skills updated.",
  skillsSaveError: "Could not save skills.",
  skillsCreatePlaceholder: "New skill (e.g. forklift, first aid)",
  skillsCreateCatalog: "Add to catalog",
  skillsCreateError: "Could not create skill.",
  relationshipsCardTitle: "Employee relationships",
  relationshipsCardDescription:
    "Scheduling rules: not assignable together, or mentor → trainee (warnings in planning).",
  relationshipKindLabel: "Type",
  relationshipKindMutex: "Not assignable together",
  relationshipKindMentor: "Mentor → trainee",
  relationshipCounterpartLabel: "Related employee",
  relationshipNoteLabel: "Note",
  relationshipAdd: "Save relationship",
  relationshipRemove: "Remove",
  relationshipSaveError: "Could not save relationship.",
  relationshipsEmpty: "No relationships yet.",
  filesCardTitle: "Profile image & attachments",
  filesCardDescription:
    "Image for lists and profile; documents and certificates as attachments.",
  profileImageAlt: "Profile image",
  filesProfileUploadAria: "Choose profile image file",
  filesAttachmentUploadAria: "Choose attachment file",
  filesProfileDelete: "Remove profile image",
  filesAttachmentsTitle: "Attachments",
  filesUploadError: "Upload failed.",
  filesDeleteError: "Delete failed.",
  filesEmpty: "No attachments yet.",
  filesKindDocument: "Document",
  filesKindCertificate: "Certificate",
  filesKindOther: "Other",
  filesDownload: "Download",
  filesDeleteAttachment: "Delete",
  validationIssueLatitudeLongitudePair:
    "Enter both latitude and longitude, or neither.",
  validationIssueLatitudeRange: "Invalid latitude (-90 to 90).",
  validationIssueLongitudeRange: "Invalid longitude (-180 to 180).",
  validationIssueInvalidTime: "Invalid time.",
  validationIssueInvalidDate: "Invalid date.",
  validationIssueInvalidTimezone: "Invalid time zone.",
  validationIssueGeneric: "Invalid input.",
};

function copy(locale: Locale): EmployeesCopy {
  return locale === "en" ? en : de;
}

export function getEmployeesCopy(locale: Locale): EmployeesCopy {
  return copy(locale);
}

/** Entspricht `optionalTrimmedText` in `@repo/api-contracts` / Mitarbeiter-Notizen. */
export const EMPLOYEE_NOTES_MAX_LENGTH = 8000;

export function formatEmployeesListMeta(
  locale: Locale,
  args: { shown: number; total: number },
): string {
  if (locale === "en") {
    return `${args.shown} of ${args.total} employees`;
  }
  return `${args.shown} von ${args.total} Mitarbeitenden`;
}

export function formatEmployeesPagination(
  locale: Locale,
  args: { page: number; pageCount: number },
): string {
  if (locale === "en") {
    return `Page ${args.page} of ${args.pageCount}`;
  }
  return `Seite ${args.page} von ${args.pageCount}`;
}

export function formatEmployeesNotesCharCount(
  locale: Locale,
  n: number,
  max: number,
): string {
  const c = copy(locale);
  return c.notesCharCount.replace("{n}", String(n)).replace("{max}", String(max));
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

export type EmployeeValidationIssue = { path: string[]; message: string };

export function readEmployeeValidationIssues(
  json: unknown,
): EmployeeValidationIssue[] | null {
  if (typeof json !== "object" || json === null) {
    return null;
  }
  const o = json as Record<string, unknown>;
  if (o.error !== "validation_error" || !Array.isArray(o.issues)) {
    return null;
  }
  const out: EmployeeValidationIssue[] = [];
  for (const item of o.issues) {
    if (typeof item !== "object" || item === null) {
      continue;
    }
    const row = item as Record<string, unknown>;
    if (!Array.isArray(row.path) || typeof row.message !== "string") {
      continue;
    }
    out.push({
      path: row.path.map((p) => String(p)),
      message: row.message,
    });
  }
  return out.length > 0 ? out : null;
}

function mapValidationMessage(message: string, t: EmployeesCopy): string {
  switch (message) {
    case "latitude_and_longitude_together":
      return t.validationIssueLatitudeLongitudePair;
    case "latitude_range":
      return t.validationIssueLatitudeRange;
    case "longitude_range":
      return t.validationIssueLongitudeRange;
    case "invalid_time_format":
      return t.validationIssueInvalidTime;
    case "invalid_date":
      return t.validationIssueInvalidDate;
    case "invalid_timezone":
      return t.validationIssueInvalidTimezone;
    default:
      return message.trim() !== "" ? message : t.validationIssueGeneric;
  }
}

function pathLabelForValidation(path: string[], t: EmployeesCopy): string {
  const head = path[0];
  if (!head) {
    return "";
  }
  const labels: Record<string, string> = {
    displayName: t.fieldDisplayName,
    employeeNo: t.fieldEmployeeNo,
    firstName: t.fieldFirstName,
    lastName: t.fieldLastName,
    email: t.fieldEmail,
    phone: t.fieldPhone,
    status: t.fieldStatus,
    employmentType: t.fieldEmploymentType,
    roleLabel: t.fieldRole,
    notes: t.fieldNotes,
    availabilityTimeZone: t.fieldAvailabilityTimeZone,
    latitude: t.fieldLatitude,
    longitude: t.fieldLongitude,
    privateAddressLabel: t.fieldAddressLabel,
    privateAddressLine2: t.fieldAddressLine2,
    privateRecipientName: t.fieldRecipient,
    privateStreet: t.fieldStreet,
    privatePostalCode: t.fieldPostal,
    privateCity: t.fieldCity,
    privateCountry: t.fieldCountry,
    availability: t.sectionAvailability,
    availabilityOverrides: t.sectionAvailabilityOverrides,
    archived: t.archiveLabel,
  };
  const base = labels[head] ?? head;
  if (path.length <= 1) {
    return base;
  }
  return `${base} (${path.slice(1).join(".")})`;
}

/** Kurztext fuer Toasts / Formularhinweise aus API-`issues`. */
export function summarizeEmployeeValidationIssues(
  issues: EmployeeValidationIssue[],
  t: EmployeesCopy,
  locale: Locale,
  max = 4,
): string {
  const parts: string[] = [];
  for (let i = 0; i < Math.min(issues.length, max); i++) {
    const issue = issues[i]!;
    const label = pathLabelForValidation(issue.path, t);
    const detail = mapValidationMessage(issue.message, t);
    parts.push(label ? `${label}: ${detail}` : detail);
  }
  if (issues.length > max) {
    parts.push(
      locale === "en"
        ? `+${issues.length - max} more`
        : `+${issues.length - max} weitere`,
    );
  }
  return parts.join(" · ");
}

export function formatEmployeeListDateTime(iso: string, locale: Locale): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "de-DE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}
