import { type Locale, normalizeLocale } from "@/lib/i18n/locale"

const uiTextDe = {
  landing: {
    header: {
      navLinks: [
        { href: "#trades", label: "Gewerke" },
        { href: "#features", label: "Features" },
        { href: "#how-it-works", label: "So funktionierts" },
        { href: "#pricing", label: "Preise" },
        { href: "/legal/faq", label: "FAQ" },
      ],
      faqLabel: "FAQ",
      signInDesktop: "ANMELDEN",
      startTrialDesktop: "TESTPHASE STARTEN",
      openMenuLabel: "Menue oeffnen",
      navigationSheetLabel: "Navigation",
      navigationSheetTitle: "Navigation",
      navigationSheetDescription: "Schnellzugriffe auf Bereiche und Einstieg.",
      mobileNavigationLabel: "Mobile Navigation",
      signInMobile: "Anmelden",
      startTrialMobile: "Testphase starten",
    },
    footer: {
      ariaLabel: "Fussbereich",
      productNavAriaLabel: "Produkt-Links",
      supportNavAriaLabel: "Support-Links",
      legalNavAriaLabel: "Rechtliches",
      productHeading: "Produkt",
      supportHeading: "Support",
      legalHeading: "Rechtliches",
      productLinks: [
        { href: "#features", label: "Features" },
        { href: "#pricing", label: "Preise" },
        { href: "#trades", label: "Branchenloesungen" },
      ],
      supportLinks: [
        { href: "mailto:support@zunftgewerk.de", label: "Kontakt" },
      ],
      legalLinks: [
        { href: "/legal/imprint", label: "Impressum" },
        { href: "/legal/terms", label: "AGB" },
        { href: "/legal/privacy", label: "Datenschutz" },
      ],
      brandDescription:
        "Die All-in-One Software fuer Kaminfeger, Maler und SHK-Betriebe. DSGVO-konform und made in Germany.",
      faqLabel: "FAQ",
      copyrightSuffix: "ZunftGewerk KG. Alle Rechte vorbehalten.",
      builtWithLabel: "Entwickelt mit",
      swissFlagLabel: "Schweizer Flagge",
      swissPartner: "Buendner Kaminfeger GmbH",
      germanFlagLabel: "Deutsche Flagge",
      germanPartner: "Tivialis Personalvermittlung KG",
    },
    pricing: {
      headingPrefix: "Planungssicher.",
      headingHighlight: "Skalierbar.",
      description: "Transparente Pakete fuer kleine Betriebe bis wachsende Unternehmen.",
      priceHint: "Alle Preise zzgl. MwSt. - 30 Tage Testphase - Zahlung startet nach Trial-Ende.",
      plans: [
        {
          tier: "starter",
          name: "Starter",
          description: "Fuer kleine Betriebe mit professionellen Anforderungen.",
          ctaText: "Plan waehlen",
          ctaLink: "/onboarding?plan=starter",
          features: [
            "Max. 5 Benutzer",
            "10 GB Speicher",
            "5 Lizenzen",
            "30 Tage Testphase",
            "Mobile App",
            "Desktop App",
            "DSGVO-konform",
            "Starke Datenverschluesselung",
            "Abrechnung startet nach Trial-Ende",
          ],
        },
        {
          tier: "professional",
          name: "Professional",
          description: "Fuer wachsende Betriebe mit erweiterten Anforderungen und mehr Personal.",
          ctaText: "Plan waehlen",
          ctaLink: "/onboarding?plan=professional",
          features: [
            "Max. 10 Benutzer",
            "50 GB Speicher",
            "10 Lizenzen",
            "30 Tage Testphase",
            "Mobile App",
            "Desktop App",
            "DSGVO-konform",
            "Starke Datenverschluesselung",
            "Abrechnung startet nach Trial-Ende",
            "DATEV-Schnittstelle",
            "GAEB-Schnittstelle",
          ],
        },
      ],
    },
  },
  auth: {
    brandHomeLabel: "ZunftGewerk - Zur Startseite",
    signInAria: "Zur Anmeldung",
    signInBadge: "Anmeldung",
    signInHeadline: "Willkommen zurueck.",
    signInDescription: "Melde dich mit deinem ZunftGewerk-Konto an.",
    signInCardTitle: "Bei deinem Konto anmelden",
    usernameOrEmailLabel: "Benutzername oder E-Mail",
    emailLabel: "E-Mail",
    passwordLabel: "Passwort",
    forgotPassword: "Passwort vergessen?",
    passwordShow: "Passwort anzeigen",
    passwordHide: "Passwort ausblenden",
    signInPending: "Anmeldung…",
    signInDesktopHandoff: "Desktop-App wird verbunden…",
    signInSubmit: "Anmelden",
    missingCredentials: "Bitte E-Mail und Passwort eingeben.",
    invalidCredentials: "E-Mail oder Passwort sind ungueltig.",
    securityHintDsgvo: "DSGVO-konforme Anmeldung",
    securityHint2fa: "2FA und sichere Session-Token",
    resetTitle: "Passwort vergessen",
    resetDescription: "Gib deine E-Mail ein. Wir senden dir einen sicheren Link zum Zuruecksetzen.",
    resetBadge: "Sicherheit",
    resetEmailLabel: "E-Mail",
    resetSubmit: "Reset-Link senden",
    resetSubmitting: "Wird gesendet…",
    resetSuccess:
      "Wenn ein Konto mit dieser E-Mail existiert, wurde ein Reset-Link versendet. Bitte pruefe dein Postfach.",
    resetInvalidEmail: "Bitte gib eine gueltige E-Mail ein.",
    resetRequestError: "Reset-Link konnte nicht angefordert werden. Bitte versuche es erneut.",
    resetPasswordTitle: "Neues Passwort setzen",
    resetPasswordDescription: "Lege jetzt dein neues Passwort fuer dein ZunftGewerk-Konto fest.",
    resetPasswordBadge: "Passwort-Reset",
    resetPasswordLabel: "Neues Passwort",
    resetPasswordConfirmLabel: "Passwort bestaetigen",
    resetPasswordSubmit: "Passwort speichern",
    resetPasswordSubmitting: "Wird gespeichert…",
    resetPasswordSuccess: "Dein Passwort wurde erfolgreich aktualisiert. Du kannst dich jetzt anmelden.",
    resetPasswordInvalidToken: "Reset-Link ist ungueltig oder abgelaufen.",
    resetPasswordMismatch: "Passwort und Bestaetigung stimmen nicht ueberein.",
    resetPasswordTooShort: "Das Passwort muss mindestens 8 Zeichen haben.",
    resetPasswordRequestError: "Passwort konnte nicht aktualisiert werden. Bitte versuche es erneut.",
    backToSignIn: "Zurueck zur Anmeldung",
  },
  onboarding: {
    metaTitle: "Onboarding",
    countryNames: { CH: "Schweiz", DE: "Deutschland", AT: "Oesterreich" },
    metaDescription: "Waehle dein Gewerk und starte die Einrichtung deines ZunftGewerk-Kontos.",
    badge: "Onboarding",
    heading: "Willkommen im Onboarding",
    description:
      "Waehle zuerst Tarif und Abrechnung und richte danach deinen Betrieb ein.",
    steps: {
      label: "Schritt",
      of: "von",
      planTitle: "Tarif und Abrechnung",
      profileAndTradeTitle: "Betriebsdaten und Gewerk",
      credentialsTitle: "Zugangsdaten",
      verifyEmailTitle: "E-Mail bestaetigen",
      checkoutTitle: "Checkout",
    },
    account: {
      profileHeading: "Betriebsdaten",
      profileDescription:
        "Trage zuerst deinen Handwerksbetrieb und deine Personendaten ein.",
      credentialsHeading: "Zugangsdaten",
      credentialsDescription:
        "Bestaetige die Kontakt-E-Mail fuer dein Unternehmensprofil.",
      companyNameLabel: "Name des Handwerkbetriebs",
      firstNameLabel: "Vorname",
      lastNameLabel: "Nachname",
      emailLabel: "E-Mail",
      passwordLabel: "Passwort",
      confirmPasswordLabel: "Passwort bestaetigen",
      companyNamePlaceholder: "Muster Handwerk GmbH…",
      firstNamePlaceholder: "Max…",
      lastNamePlaceholder: "Mustermann…",
      emailPlaceholder: "max@betrieb.de…",
      passwordPlaceholder: "Mindestens 8 Zeichen…",
      confirmPasswordPlaceholder: "Passwort wiederholen…",
      confirmPasswordMismatch:
        "Passwort und Bestaetigung muessen identisch sein.",
    },
    tradeSelection: {
      heading: "Gewerk auswaehlen",
      description:
        "Die Auswahl steuert die branchenspezifischen Funktionen in deinem weiteren Setup.",
      ariaLabel: "Gewerkeauswahl",
      currentLabel: "Ausgewaehlt",
      currentDescriptionLabel: "Beschreibung",
      moreTradesHint: "Weitere Gewerke werden schrittweise hinzugefuegt.",
    },
    planSelection: {
      heading: "Tarif und Abrechnung",
      description:
        "Waehle den Tarif und den Abrechnungszyklus fuer dein Test-Abo.",
      planLabel: "Tarif",
      planAriaLabel: "Tarifauswahl",
      starterLabel: "Starter",
      professionalLabel: "Professional",
      billingLabel: "Abrechnung",
      billingAriaLabel: "Abrechnungszyklus auswaehlen",
      monthlyLabel: "Monatlich",
      yearlyLabel: "Jaehrlich",
      costOverviewLabel: "Kostenuebersicht",
      perMonthLabel: "/ Monat",
      perMonthYearlyLabel: "/ Monat, jaehrlich abgerechnet",
      perYearTotalLabel: "/ Jahr",
      yearlyTotalLabel: "Jaehrlich gesamt",
      yearlyIfMonthlyLabel: "Jahresgesamtbetrag bei Monatszahlung",
      savingsPrefix: "Du sparst im Jahresabo",
      savingsBadgeSuffix: "guenstiger",
      trialHint: "Tage Testphase. Abrechnung startet danach.",
    },
    checkout: {
      heading: "Checkout",
      description:
        "Schliesse jetzt deine Zahlungsdaten direkt im Onboarding-Formular ab.",
      paymentMethodLabel: "Zahlungsmethode",
      cardMethodLabel: "Karte",
      directDebitMethodLabel: "SEPA-Lastschrift",
      directDebitComingSoon: "Bald verfuegbar",
      paymentMethodUnavailable: "Diese Zahlungsmethode ist aktuell noch nicht verfuegbar.",
      paymentDataLabel: "Zahlungsdaten",
      cardholderNameLabel: "Name des Karteninhabers",
      cardholderNamePlaceholder: "Vollstaendiger Name…",
      cardNumberLabel: "Kartennummer",
      expiryLabel: "Ablauf",
      cvcLabel: "CVC",
      cvcPlaceholder: "123…",
      countryLabel: "Land",
      termsHint:
        "Mit der Angabe Ihrer Kartendaten erklaeren Sie sich damit einverstanden, dass ZunftGewerk Sandbox Ihre Karte fuer zukuenftige Zahlungen gemaess seinen Bedingungen belastet.",
      secureHint:
        "Die Zahlungsdaten werden sicher von Stripe verarbeitet und nicht auf unseren Servern gespeichert.",
      missingPublishableKey:
        "Stripe Checkout konnte nicht geladen werden. Bitte NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY setzen.",
      backToCredentials: "Zurueck: Zugangsdaten",
      backToVerify: "Zurueck: E-Mail",
      confirmPayment: "Zahlung speichern",
      confirmingPayment: "Wird gespeichert…",
    },
    actions: {
      cancel: "Zum Dashboard",
      back: "Zurueck",
      continue: "Weiter",
      finish: "Fertig",
      finishing: "Speichern…",
      startCheckout: "Weiter zu Stripe Checkout",
      preparingCheckout: "Checkout wird vorbereitet…",
      submitError:
        "Onboarding konnte nicht gespeichert werden. Bitte versuche es erneut.",
      duplicateEmailError:
        "Diese E-Mail ist bereits registriert. Bitte melde dich an oder nutze eine andere E-Mail.",
      profileRequiredHint:
        "Bitte fuelle Betriebsname, Vorname, Nachname aus und waehle ein Gewerk.",
      profileReadyHint:
        "Betriebsdaten und Gewerk sind vollstaendig. Du kannst mit den Kontaktdaten fortfahren.",
      credentialsRequiredHint:
        "Bitte gib eine gueltige Kontakt-E-Mail ein und setze ein Passwort mit mindestens 8 Zeichen.",
      authRedirectHint:
        "Konto wird angelegt und Zahlungsformular vorbereitet.",
      checkoutCancelledHint:
        "Stripe-Checkout wurde abgebrochen. Du kannst den Vorgang hier erneut starten.",
      checkoutReadyHint:
        "Checkout ist bereit. Trage jetzt deine Zahlungsdaten direkt im Onboarding ein.",
      credentialsReadyHint:
        "Alle Pflichtangaben sind vorhanden. Du kannst das Onboarding abschliessen.",
      planReadyHint:
        "Tarif und Abrechnung sind gesetzt. Du kannst mit den Betriebsdaten fortfahren.",
      verificationEmailHint:
        "Wir haben dir eine Bestaetigungsmail gesendet. Bitte oeffne den Link in der E-Mail, um deine Adresse zu verifizieren.",
      verifyPendingHint:
        "Bitte oeffne den Link in der E-Mail. Wir pruefen automatisch, ob deine Adresse bestaetigt ist.",
      verifyReadyHint:
        "E-Mail ist bestaetigt. Du kannst mit dem Checkout fortfahren.",
      continueToCheckout: "Zum Checkout",
    },
  },
  dashboard: {
    overview: "Uebersicht",
    overviewDescription: "Willkommen im Dashboard. Hier erscheinen deine wichtigsten Kennzahlen.",
    employees: "Mitarbeitende",
    employeeProfile: "Mitarbeitendenprofil",
    dataRecordsTitle: "Datensaetze",
    dataRecordsDescription: "Live-Status aus dem Backend ueber den BFF-Proxy.",
    dataRecordsLoading: "Lade Datensaetze…",
    dataRecordsError: "Die Datensaetze konnten nicht geladen werden.",
    dataRecordsRetry: "Erneut laden",
    dataRecordsTotal: "Gesamtanzahl",
    dataRecordsNoData: "Keine Datensaetze gefunden.",
    dataRecordsLastUpdated: "Zuletzt aktualisiert",
    dataRecordsVersionLabel: "Version",
    dataRecordsPreviewLabel: "Vorschau",
  },
  dashboardWorkbench: {
    kpiCard: {
      statusLabel: "Status",
      priorityLabel: "Prioritaet",
      trendLabel: "Trend",
      benchmarkLabel: "Zeitraum",
      refreshedLabel: "Aktualisiert",
      statusGood: "Stabil",
      statusMedium: "Beobachten",
      statusBad: "Kritisch",
      priorityHigh: "Hoch",
      priorityMedium: "Mittel",
      priorityLow: "Niedrig",
    },
    overviewEmployeesTable: {
      title: "Mitarbeitenden-Tabelle",
      description: "Aktueller Personalbestand mit Rollen, Status und Schnellzugriff auf Profile.",
    },
    coreKpisTitle: "Betriebsstatus",
    coreKpisDescription:
      "Die wichtigsten operativen Kennzahlen fuer die heutige Einsatz- und Auftragslage.",
    focusAreasTitle: "Fokusbereiche",
    focusAreasDescription:
      "Diese Fachbereiche sollten heute priorisiert bearbeitet werden.",
    widgetsTitle: "Fachmodule",
    widgetsDescription:
      "Gewerkespezifische Arbeitsbereiche mit vorbereiteten Listen, Fristen und Handlungsempfehlungen.",
    meta: {
      observabilityTitle: "Systemstatus",
      observabilityDescription:
        "Datenquelle, Berechnungsdauer und Aktualitaet der Dashboard-Aggregation.",
      trendsTitle: "Leistungsentwicklung",
      trendsDescription:
        "Zeitreihe der wichtigsten Gewerke-Kennzahlen mit Vergleich auf Tagesbasis.",
      trendsDrilldownHint: "Tipp: Auf einen hervorgehobenen Datenpunkt klicken, um ins passende Fachmodul zu wechseln.",
      thresholdLabelPrefix: "Schwelle",
      thresholdLegendTitle: "Schwellenwerte",
      trendStatusGood: "im Ziel",
      trendStatusBad: "ausserhalb Ziel",
      sourceLabel: "Datenquelle",
      sourceLive: "Live",
      sourceFallback: "Fallback",
      durationLabel: "Berechnungszeit",
      recordTotalLabel: "Datensaetze",
      complianceTitle: "Compliance-Checks",
      complianceDescription:
        "Regulatorische Mindestanforderungen fuer den gewaehlten Gewerkekontext.",
      compliancePassed: "Erfuellt",
      complianceFailed: "Offen",
      complianceNotConfigured:
        "Keine gewerkespezifischen Compliance-Checks fuer dieses Modul hinterlegt.",
    },
    routeDescriptions: {
      workOrders: "Strukturierter Auftragsbereich.",
      schedule: "Strukturierter Planungsbereich.",
      serviceControl:
        "Serviceleitstand fuer SLA-gesteuerte Disposition von Stoerungseinsaetzen und Wartungsauftraegen.",
      assetFiles:
        "Anlagenakte mit Wartungshistorie, Serviceprotokollen und Faelligkeiten aus Wartungsvertraegen.",
      emergencyBoard:
        "Notdienstboard fuer stoerungsgetriebene Einsaetze mit Eskalationsstufen, Bereitschaft und Reaktionszeiten.",
      serviceContracts:
        "Vertragsverwaltung fuer Wartungsvereinbarungen inklusive SLA, Laufzeiten, Preisgleitklauseln und Verlangerung.",
      partsLogistics:
        "Ersatzteillogistik fuer Fahrzeuglager, Mindestbestaende und Nachbestellung pro Serviceauftrag.",
      measurementCenter:
        "Aufmasscenter fuer Raum- und Flaechenerfassung inklusive Positionszuordnung fuer Angebot und Abrechnung.",
      postCalculation:
        "Nachkalkulation mit Soll-Ist-Vergleich von Material, Lohnzeiten und Deckungsbeitrag pro Projekt.",
      materialManagement:
        "Materialwirtschaft mit Farbtonverwaltung, Preislisten, Lagerbestand und Materialabruf je Baustelle.",
      gaeb:
        "GAEB-Schnittstelle fuer LV-Import, Positionsabgleich und Export in standardisierte Austauschformate.",
      siteDocumentation:
        "Mobile Baustellendokumentation mit Fotos, Tagesberichten und Fortschrittsnachweisen.",
      quoting:
        "Angebotswesen mit Kalkulation, Variantenvergleich und Freigabestatus pro Kunde und Objekt.",
      customers: "Strukturierter Kundenbereich.",
      billing: "Strukturierter Abrechnungsbereich.",
      employees:
        "Mitarbeitendenmodul fuer Stammdaten, Verfuegbarkeiten, Urlaubsplanung und Krankmeldungen.",
      employeesNew: "Neuen Mitarbeitenden im Mandanten anlegen.",
      sweepLedger:
        "Elektronisches Kehrbuch mit chronologischen Eintraegen, Formblatt-Zuordnung und Vollstaendigkeitspruefung.",
      fireplacesRegistry:
        "Feuerstaetten- und Anlagenregister mit Brennstoffart, Leistung und Zustandshistorie pro Liegenschaft.",
      deadlines:
        "Fristenverwaltung mit automatischen Warnungen, Bescheidvorbereitung und Ausfuehrungsnachweisen.",
      inspections:
        "Planung und Protokollierung von Feuerstaettenschauen mit Maengelerfassung und Nachkontrolle.",
      defects:
        "Maengelverwaltung mit Klassifikation, Foto-Dokumentation und Eskalationslogik an Behoerden.",
      emissions:
        "Messwesen fuer Abgasprotokolle, Grenzwertpruefung nach 1. BImSchV und Messgeraeteverwaltung.",
      notices:
        "Bescheidwesen mit Erstellung, Versand und Empfangsbestaetigung von Feuerstaettenbescheiden.",
      districtStats:
        "Bezirksstatistik mit Deckungsgrad, Compliance-Reporting und Jahresbericht fuer Behoerden.",
      documents:
        "Dokumentenmanagement fuer Formblatt-Vorlagen, Protokoll-Archive und revisionssichere Ablage.",
    },
    nav: {
      groups: { common: "Allgemein", district: "Kehrbezirk", projectControl: "Projektsteuerung", serviceOperations: "Servicebetrieb", administration: "Verwaltung" },
      overview: "Uebersicht",
      workOrders: "Auftragscenter",
      schedule: "Einsatzplanung",
      serviceControl: "Serviceleitstand",
      assetFiles: "Anlagenakte",
      emergencyBoard: "Notdienstboard",
      serviceContracts: "Wartungsvertraege",
      partsLogistics: "Ersatzteillogistik",
      measurementCenter: "Aufmasscenter",
      postCalculation: "Nachkalkulation",
      materialManagement: "Materialwirtschaft",
      gaeb: "GAEB-Schnittstelle",
      siteDocumentation: "Baustellendoku",
      quoting: "Angebotswesen",
      customers: "Kundenakte",
      billing: "Abrechnung",
      employees: "Mitarbeitende",
      sweepLedger: "Kehrbuch",
      fireplacesRegistry: "Feuerstaetten",
      deadlines: "Fristenverwaltung",
      inspections: "Feuerstaettenschau",
      defects: "Maengelverwaltung",
      emissions: "Messwesen",
      notices: "Bescheidwesen",
      districtStats: "Bezirksstatistik",
      documents: "Dokumente",
    },
    customersCreate: {
      pageTitle: "Kundenakte anlegen",
      createButton: "Kundenakte anlegen",
      createButtonAria: "Neue Kundenakte anlegen",
      backToList: "Zurueck zur Liste",
      stepCustomer: "Schritt 1: Kunde",
      stepContactsAddresses: "Schritt 2: Kontakte & Adressen",
      stepObject: "Schritt 3: Objekt",
      nextStep: "Weiter",
      backStep: "Zurueck",
      sectionCustomer: "Kunde",
      sectionContacts: "Kontakte",
      sectionAddresses: "Adressen",
      sectionObject: "Erstes Objekt",
      fieldCustomerNo: "Kundennummer",
      fieldCustomerType: "Kundentyp",
      typeCompany: "Firma",
      typePerson: "Privatperson",
      fieldDisplayName: "Anzeigename",
      fieldCompanyName: "Firmenname",
      fieldFirstName: "Vorname",
      fieldLastName: "Nachname",
      fieldEmail: "E-Mail",
      fieldPhone: "Telefon",
      fieldStatus: "Status",
      statusActive: "Aktiv",
      statusInactive: "Inaktiv",
      addContact: "Kontakt hinzufuegen",
      addAddress: "Adresse hinzufuegen",
      removeRow: "Entfernen",
      contactsOptionalHint: "Optional: Kontakte erfassen oder ueberspringen.",
      addressesOptionalHint: "Optional: Adressen erfassen oder ueberspringen.",
      fieldContactRole: "Rolle",
      fieldContactName: "Name",
      fieldContactEmail: "E-Mail",
      fieldContactPhone: "Telefon",
      fieldContactPrimary: "Hauptkontakt",
      fieldAddressType: "Adresstyp",
      addressTypeMain: "Hauptadresse",
      addressTypeBilling: "Rechnungsadresse",
      addressTypeService: "Serviceadresse",
      addressTypeObject: "Objektadresse",
      fieldAddressStreet: "Strasse",
      fieldAddressHouseNo: "Hausnummer",
      fieldAddressPostalCode: "PLZ",
      fieldAddressCity: "Ort",
      fieldAddressCountry: "Land (ISO-2)",
      fieldObjectNo: "Objektnummer",
      fieldObjectName: "Objektname",
      fieldObjectType: "Objekttyp",
      objectTypeProperty: "Liegenschaft",
      objectTypeSite: "Baustelle",
      objectTypeAsset: "Anlagenstandort",
      submit: "Anlegen",
      submitting: "Wird angelegt…",
      errorGeneric: "Die Kundenakte konnte nicht angelegt werden.",
      errorValidation: "Bitte Eingaben pruefen.",
      errorConflict: "Kunden- oder Objektnummer ist bereits vergeben.",
      errorUnauthorized: "Du bist nicht angemeldet. Bitte erneut anmelden.",
      errorForbidden: "Keine Berechtigung zum Anlegen von Kundenakten.",
    },
    customersList: {
      cardTitle: "Kundenliste",
      listMeta: "{count} angezeigt",
      searchPlaceholder: "Name oder Nummer suchen",
      searchAriaLabel: "Kunden durchsuchen",
      statusFilterAriaLabel: "Kundenstatus filtern",
      statusAll: "Alle Status",
      statusActive: "Aktiv",
      statusInactive: "Inaktiv",
      tableNo: "Nr.",
      tableName: "Name",
      tableType: "Typ",
      tableStatus: "Status",
      tableAction: "Aktion",
      profile: "Profil",
      emptyFiltered: "Keine Kunden im aktuellen Filter gefunden.",
      applyFilters: "Filter anwenden",
      resetFilters: "Filter zuruecksetzen",
      exportCsv: "CSV Export",
      kpiTotal: "Kunden gesamt",
      kpiActive: "Aktive Kunden",
      kpiInactive: "Inaktive Kunden",
      kpiNewThisMonth: "Neue Kunden (Monat)",
      kpiTotalHint: "Alle erfassten Kunden",
      kpiActiveHint: "Mit Status aktiv",
      kpiInactiveHint: "Mit Status inaktiv",
      kpiNewThisMonthHint: "Im laufenden Kalendermonat angelegt",
    },
    customersProfileLayout: {
      backToList: "Zurueck zur Liste",
      typeCompany: "Firma",
      typePerson: "Privatperson",
    },
    customersProfileActions: {
      edit: "Bearbeiten",
      editAria: "Kundenakte bearbeiten",
      delete: "Loeschen",
      deleteAria: "Kundenakte loeschen",
      deleteDialogTitle: "Kundenakte loeschen?",
      deleteDialogDescription:
        'Die Kundenakte "{name}" und alle zugehoerigen Kontakte, Adressen und Objekte werden dauerhaft aus der Ansicht entfernt.',
      deleteCancel: "Abbrechen",
      deleteConfirm: "Endgueltig loeschen",
      deleteInProgress: "Wird geloescht…",
      deleteErrorGeneric: "Die Kundenakte konnte nicht geloescht werden.",
      deleteErrorUnauthorized: "Du bist nicht angemeldet. Bitte erneut anmelden.",
      deleteErrorForbidden: "Keine Berechtigung zum Loeschen dieser Kundenakte.",
    },
    customersEdit: {
      pageTitle: "Kundenakte bearbeiten",
      sectionTitle: "Stammdaten",
      backToProfile: "Zurueck zur Kundenakte",
      submit: "Speichern",
      submitting: "Wird gespeichert…",
      fieldVatId: "USt-IdNr.",
      fieldCustomerNoReadonly: "Kundennummer (nicht aenderbar)",
      errorGeneric: "Die Kundenakte konnte nicht gespeichert werden.",
      errorValidation: "Bitte Eingaben pruefen.",
      errorConflict: "Daten wurden zwischenzeitlich geaendert. Bitte Seite neu laden und erneut speichern.",
      errorUnauthorized: "Du bist nicht angemeldet. Bitte erneut anmelden.",
      errorForbidden: "Keine Berechtigung zum Bearbeiten dieser Kundenakte.",
    },
    customersProfileNav: {
      ariaLabel: "Kundenakte Navigation",
      overview: "Uebersicht",
      contacts: "Kontakte",
      addresses: "Adressen",
      objects: "Objekte",
      history: "Historie",
    },
    customersHistory: {
      title: "Historie",
      empty: "Noch keine Ereignisse vorhanden.",
      eventAt: "Zeitpunkt",
      source: "Quelle",
    },
    customersObjectNav: {
      ariaLabel: "Objekt Navigation",
      overview: "Objekt-Uebersicht",
      trade: "Gewerksmodule",
      kaminfeger: "Kaminfeger",
      shk: "SHK",
      maler: "Maler",
    },
    customersObjectOverview: {
      title: "Objekt-Uebersicht",
      fieldNo: "Objektnr.",
      fieldName: "Name",
      fieldType: "Typ",
      fieldUsage: "Nutzung",
      moduleDescription: "Objektbezogenes Fachmodul mit aktiven Daten und Aktionen.",
      kaminfegerTitle: "Kaminfeger",
      kaminfegerCta: "Kaminfeger-Modul oeffnen",
      shkTitle: "SHK",
      shkCta: "SHK-Modul oeffnen",
      malerTitle: "Maler",
      malerCta: "Maler-Modul oeffnen",
    },
    customersOverview: {
      sectionCustomer: "Kundenstammdaten",
      sectionContact: "Kontaktdaten",
      sectionObjects: "Objekte",
      fieldNo: "Nr.",
      fieldType: "Typ",
      fieldStatus: "Status",
      fieldEmail: "E-Mail",
      fieldPhone: "Telefon",
      noObjects: "Noch keine Objekte vorhanden.",
      objectNo: "Objektnr.",
      objectName: "Objekt",
      objectType: "Typ",
      objectDetails: "Details",
      map: {
        title: "Standortkarte",
        description: "Anzeige der geokodierten Kundenadresse.",
        noLocation: "Keine geokodierte Adresse verfuegbar. Bitte zuerst Adresse geocoden.",
        fieldAddress: "Adresse",
        fieldCoordinates: "Koordinaten",
        mapIframeAriaDescription:
          "Kartendaten © OpenStreetMap-Mitwirkende, Lizenz und Quellenangabe unter openstreetmap.org/copyright",
      },
    },
    customersContacts: {
      title: "Kontakte",
      description: "Ansprechpersonen fuer die Kundenakte.",
      add: "Kontakt hinzufuegen",
      save: "Kontakte speichern",
      saving: "Speichern…",
      fieldRole: "Rolle",
      fieldName: "Name",
      fieldEmail: "E-Mail",
      fieldPhone: "Telefon",
      fieldPrimary: "Hauptkontakt",
      remove: "Entfernen",
      empty: "Keine Kontakte hinterlegt.",
      saved: "Kontakte gespeichert.",
      errorGeneric: "Kontakte konnten nicht gespeichert werden.",
    },
    customersAddresses: {
      title: "Adressen",
      description: "Adressdaten und Geocoding fuer Kunde und Objektzuordnung.",
      add: "Adresse hinzufuegen",
      save: "Adressen speichern",
      saving: "Speichern…",
      geocode: "Geocoden",
      fieldType: "Adresstyp",
      typeMain: "Hauptadresse",
      typeBilling: "Rechnungsadresse",
      typeService: "Serviceadresse",
      typeObject: "Objektadresse",
      fieldStreet: "Strasse",
      fieldHouseNo: "Hausnummer",
      fieldPostalCode: "PLZ",
      fieldCity: "Ort",
      fieldCountry: "Land (ISO-2)",
      fieldLatitude: "Breitengrad",
      fieldLongitude: "Laengengrad",
      remove: "Entfernen",
      empty: "Keine Adressen hinterlegt.",
      saved: "Adressen gespeichert.",
      savedAndGeocoded: "Adresse gespeichert und automatisch geocodiert.",
      savedButGeocodeFailed: "Adresse gespeichert. Automatisches Geocoding ist fehlgeschlagen.",
      geocodeApproximate:
        "Geocoding lieferte nur eine ungenaue Fallback-Position. Bitte OpenRouteService-Konfiguration pruefen oder Koordinaten manuell setzen.",
      errorConflict: "Datensatz wurde zwischenzeitlich geaendert. Die aktuellen Daten wurden neu geladen.",
      errorCoordinatesLatitude: "Breitengrad muss zwischen -90 und 90 liegen.",
      errorCoordinatesLongitude: "Laengengrad muss zwischen -180 und 180 liegen.",
      errorCoordinatesPair: "Bitte Breiten- und Laengengrad beide ausfuellen oder beide leer lassen.",
      errorGeneric: "Adressen konnten nicht gespeichert werden.",
    },
    customersKaminfeger: {
      title: "Kaminfeger-Modul",
      fireplacesTitle: "Feuerstaetten",
      noticesTitle: "Bescheide",
      deadlinesTitle: "Fristen",
      ledgerTitle: "Kehrbuch",
      fieldFireplaceNo: "Feuerstaetten-Nr.",
      fieldKind: "Art",
      fieldFuelType: "Brennstoff",
      fieldNominalPower: "Nennleistung (kW)",
      fieldIssuedAt: "Ausgestellt am",
      fieldValidFrom: "Gueltig ab",
      fieldLegalBasis: "Rechtsgrundlage",
      fieldDeadlineType: "Fristtyp",
      fieldDueDate: "Faellig am",
      fieldEntryDate: "Eintragsdatum",
      fieldWorkType: "Arbeitsart",
      fieldResult: "Ergebnis",
      fieldPerformedBy: "Durchgefuehrt von",
      create: "Anlegen",
      creating: "Speichern…",
      complete: "Als erledigt markieren",
      saved: "Gespeichert.",
      errorGeneric: "Eintrag konnte nicht gespeichert werden.",
      empty: "Noch keine Eintraege vorhanden.",
    },
    customersShk: {
      title: "SHK-Modul",
      assetsTitle: "Assets",
      contractsTitle: "Servicevertraege",
      maintenanceTitle: "Wartungsplan",
      eventsTitle: "Serviceeinsaetze",
      fieldAssetNo: "Asset-Nr.",
      fieldAssetType: "Asset-Typ",
      fieldManufacturer: "Hersteller",
      fieldAssetStatus: "Asset-Status",
      assetStatusActive: "Aktiv",
      assetStatusInactive: "Inaktiv",
      fieldContractNo: "Vertrags-Nr.",
      fieldContractStart: "Vertragsstart",
      fieldSlaHours: "SLA (Stunden)",
      fieldContractBillingCycle: "Abrechnungszyklus",
      billingCycleMonthly: "Monatlich",
      billingCycleYearly: "Jaehrlich",
      fieldContractStatus: "Vertragsstatus",
      contractStatusActive: "Aktiv",
      contractStatusPaused: "Pausiert",
      contractStatusEnded: "Beendet",
      fieldAssetId: "Asset-ID",
      fieldMaintenanceNextDue: "Naechste Faelligkeit",
      fieldMaintenanceIntervalValue: "Intervallwert",
      fieldMaintenanceContract: "Wartungsvertrag",
      fieldMaintenanceIntervalUnit: "Intervall-Einheit (MONTH|YEAR)",
      intervalUnitMonth: "Monat",
      intervalUnitYear: "Jahr",
      fieldEventStartedAt: "Startzeit",
      fieldEventType: "Einsatztyp",
      eventTypeMaintenance: "Wartung",
      eventTypeIncident: "Stoerung",
      eventTypeInspection: "Pruefung",
      fieldEventSummary: "Zusammenfassung",
      fieldEventId: "Einsatz-ID",
      noAssetsHint: "Bitte zuerst ein Asset anlegen",
      noContractOption: "Kein Vertrag",
      unknownContract: "Unbekannter Vertrag",
      planLabel: "Plan",
      slaLabel: "SLA",
      statusLoading: "wird geladen",
      planStatusMissing: "Kein Plan",
      planStatusActive: "Aktiv",
      planStatusOverdue: "Ueberfaellig",
      slaStatusNone: "Kein offener Einsatz",
      slaStatusOpen: "Offen",
      slaStatusOverdue: "Ueberfaellig",
      summaryContract: "Aktiver Vertrag",
      summaryNextDue: "Naechste Wartung",
      summaryOpenEvents: "Offene Einsaetze",
      summaryNoPlan: "Kein Wartungsplan",
      refresh: "Liste aktualisieren",
      create: "Anlegen",
      creating: "Speichern…",
      close: "Als erledigt markieren",
      saved: "Gespeichert.",
      errorGeneric: "Eintrag konnte nicht gespeichert werden.",
      empty: "Noch keine Eintraege vorhanden.",
    },
    customersMaler: {
      title: "Maler-Modul",
      projectsTitle: "Projekte",
      measurementTitle: "Aufmass",
      boqTitle: "LV / Positionen",
      postCalculationTitle: "Nachkalkulation",
      siteReportsTitle: "Baustellenberichte",
      selectProject: "Projekt waehlen",
      selectSheet: "Aufmassblatt waehlen",
      fieldProjectNo: "Projekt-Nr.",
      fieldProjectName: "Projektname",
      fieldProjectStatus: "Projektstatus",
      statusPlanned: "Geplant",
      statusRunning: "In Bearbeitung",
      statusDone: "Abgeschlossen",
      fieldProjectStart: "Startdatum",
      fieldSheetNo: "Blatt-Nr.",
      fieldMeasuredAt: "Aufgenommen am",
      fieldMethod: "Methode",
      methodOnsite: "Vor Ort",
      methodPlan: "Plan",
      methodPhoto: "Foto",
      fieldSheetState: "Status",
      sheetStateDraft: "Entwurf",
      sheetStateApproved: "Freigegeben",
      fieldItemType: "Positionstyp",
      itemTypeArea: "Flaeche",
      itemTypeLength: "Laenge",
      itemTypeCount: "Anzahl",
      itemTypeVolume: "Volumen",
      fieldItemDescription: "Beschreibung",
      fieldItemQuantity: "Menge",
      fieldItemUnit: "Einheit",
      fieldBoqNo: "Positions-Nr.",
      fieldBoqTitle: "Titel",
      fieldBoqQuantity: "Menge",
      fieldBoqUnitPrice: "Einheitspreis netto",
      fieldCalcDate: "Kalkuliert am",
      fieldCalcPlanned: "Sollkosten netto",
      fieldCalcActual: "Istkosten netto",
      fieldCalcMargin: "Marge (%)",
      fieldReportDate: "Berichtsdatum",
      fieldWeather: "Wetter",
      fieldProgressNote: "Fortschritt",
      fieldBlockingIssue: "Blocker",
      create: "Anlegen",
      creating: "Speichern…",
      saved: "Gespeichert.",
      errorGeneric: "Eintrag konnte nicht gespeichert werden.",
      empty: "Noch keine Eintraege vorhanden.",
    },
    employeesCreate: {
      pageTitle: "Mitarbeitenden anlegen",
      createButton: "Mitarbeitenden anlegen",
      createButtonAria: "Neuen Mitarbeitenden anlegen",
      backToList: "Zurueck zur Liste",
      sectionPerson: "Person und Kontakt",
      sectionAddress: "Adresse (optional)",
      addAddressLabel: "Adresse direkt mit erfassen",
      fieldEmployeeNo: "Personalnummer",
      fieldFirstName: "Vorname",
      fieldLastName: "Nachname",
      fieldEmail: "E-Mail",
      fieldPhone: "Telefon",
      fieldRoleTitle: "Rollenbezeichnung",
      fieldStatus: "Status",
      fieldEmploymentType: "Beschaeftigungstyp",
      statusActive: "Aktiv",
      statusOnboarding: "Onboarding",
      statusInactive: "Inaktiv",
      employmentFullTime: "Vollzeit",
      employmentPartTime: "Teilzeit",
      employmentContractor: "Freier Vertrag",
      employmentApprentice: "Auszubildende:r",
      fieldStreet: "Strasse",
      fieldHouseNo: "Hausnummer",
      fieldPostalCode: "PLZ",
      fieldCity: "Ort",
      fieldCountry: "Land (ISO-2)",
      fieldGeocodingSource: "Geocoding-Quelle",
      fieldLatitude: "Breitengrad",
      fieldLongitude: "Laengengrad",
      submit: "Anlegen",
      submitting: "Wird angelegt…",
      coordinatesPreview: "Koordinatenvorschau",
      coordinatesNone: "Keine Koordinaten hinterlegt",
      errorGeneric: "Der Mitarbeitende konnte nicht angelegt werden.",
      errorValidation: "Bitte Eingaben pruefen.",
      errorConflict: "Diese Personalnummer ist im Mandanten bereits vergeben.",
      errorUnauthorized: "Du bist nicht angemeldet. Bitte erneut anmelden.",
      errorForbidden: "Keine Berechtigung zum Anlegen von Mitarbeitenden.",
    },
    employeesList: {
      cardTitle: "Mitarbeiterliste",
      listMeta: "{count} angezeigt",
      searchPlaceholder: "Name, Nummer oder Rolle suchen",
      searchAriaLabel: "Mitarbeitende durchsuchen",
      statusFilterAria: "Status filtern",
      statusAll: "Alle Status",
      statusActive: "Aktiv",
      statusOnboarding: "Onboarding",
      statusInactive: "Inaktiv",
      tableNo: "Nr.",
      tableName: "Name",
      tableRole: "Rolle",
      tableStatus: "Status",
      tableAction: "Aktion",
      profile: "Profil",
      emptyFiltered: "Keine Mitarbeitenden im aktuellen Filter gefunden.",
    },
    employeesProfileLayout: {
      backToList: "Zurueck zur Liste",
      roleFallback: "Ohne Rollenbezeichnung",
      employmentTypes: {
        FULL_TIME: "Vollzeit",
        PART_TIME: "Teilzeit",
        CONTRACTOR: "Freier Vertrag",
        APPRENTICE: "Auszubildende:r",
      },
    },
    employeesProfileNav: {
      ariaLabel: "Mitarbeitendenbereich Navigation",
      stammdaten: "Stammdaten",
      verfuegbarkeit: "Verfuegbarkeit",
      urlaub: "Urlaubsplanung",
      krankmeldungen: "Krankmeldungen",
    },
    employeesMaster: {
      sectionPerson: "Person und Kontakt",
      sectionAddress: "Adresse und Standort",
      fieldFirstName: "Vorname",
      fieldLastName: "Nachname",
      fieldEmail: "E-Mail",
      fieldPhone: "Telefon",
      fieldRoleTitle: "Rolle",
      fieldStatus: "Status",
      fieldEmploymentType: "Beschaeftigungstyp",
      statusActive: "Aktiv",
      statusOnboarding: "Onboarding",
      statusInactive: "Inaktiv",
      employmentFullTime: "Vollzeit",
      employmentPartTime: "Teilzeit",
      employmentContractor: "Freier Vertrag",
      employmentApprentice: "Auszubildende:r",
      fieldStreet: "Strasse",
      fieldHouseNo: "Hausnummer",
      fieldPostalCode: "PLZ",
      fieldCity: "Ort",
      fieldCountry: "Land",
      fieldGeocodingSource: "Geocoding-Quelle",
      fieldGeoPrecision: "Geocoding-Genauigkeit",
      fieldLatitude: "Breitengrad",
      fieldLongitude: "Laengengrad",
      fieldFormattedAddress: "Formatierte Adresse",
      formattedAddressNone: "Noch keine formatierte Adresse.",
      geoPrecisionNone: "Keine Angabe",
      coordinatesPreview: "Koordinatenvorschau",
      coordinatesNone: "Keine Koordinaten hinterlegt",
      save: "Stammdaten speichern",
      saving: "Speichern…",
      geocodeButton: "Adresse geocoden",
      msgSaved: "Stammdaten wurden gespeichert.",
      msgGeocodeOk: "Koordinaten wurden aus der Adresse ermittelt.",
      errorEmployeeSave: "Stammdaten konnten nicht gespeichert werden.",
      errorAddressSave: "Adresse konnte nicht gespeichert werden.",
      errorGeocode: "Geocoding fehlgeschlagen.",
      errorUnexpected: "Unerwarteter Fehler beim Speichern.",
      errorConflict: "Datensatz wurde zwischenzeitlich geaendert. Bitte Seite neu laden und erneut speichern.",
      errorCoordinatesLatitude: "Breitengrad muss zwischen -90 und 90 liegen.",
      errorCoordinatesLongitude: "Laengengrad muss zwischen -180 und 180 liegen.",
      errorCoordinatesPair: "Bitte Breiten- und Laengengrad beide ausfuellen oder beide leer lassen.",
      errorFirstNameRequired: "Vorname darf nicht leer sein.",
      errorLastNameRequired: "Nachname darf nicht leer sein.",
    },
    employeesAvailability: {
      weekdayShortLabels: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
      fieldWeekday: "Wochentag",
      fieldFrom: "Von",
      fieldTo: "Bis",
      fieldEffectiveFrom: "Gueltig ab",
      fieldEffectiveTo: "Gueltig bis",
      fieldTimezone: "Zeitzone",
      exceptionNoReason: "Keine Begruendung",
      exceptionDefaultReason: "Manuelle Ausnahme",
      rulesTitle: "Wochenmuster",
      rulesAdd: "Regel",
      rulesSave: "Regeln speichern",
      rulesSaved: "Regeln gespeichert.",
      rulesSaveFailed: "Regeln konnten nicht gespeichert werden.",
      exceptionsTitle: "Ausnahmen",
      exceptionsAdd: "Ausnahme",
      exceptionDeleteAria: "Ausnahme loeschen",
      exceptionNone: "Keine Ausnahmen definiert.",
      exceptionCreated: "Ausnahme angelegt.",
      exceptionCreateFailed: "Ausnahme konnte nicht angelegt werden.",
      exceptionDeleted: "Ausnahme geloescht.",
      exceptionDeleteFailed: "Ausnahme konnte nicht geloescht werden.",
      errorTimeOrder: "Startzeit muss vor Endzeit liegen.",
      errorDateOrder: "Gueltig-ab-Datum darf nicht nach Gueltig-bis liegen.",
    },
    employeesVacation: {
      balanceTitle: "Urlaubsstand {year}",
      metricAllowance: "Anspruch",
      metricUsed: "Verbrauch",
      metricCarryOver: "Uebertrag",
      metricRemaining: "Verfuegbar",
      requestTitle: "Urlaubsantrag erfassen",
      fieldFrom: "Von",
      fieldTo: "Bis",
      fieldReason: "Grund",
      submit: "Antrag senden",
      historyTitle: "Antragshistorie",
      historyEmpty: "Noch keine Urlaubsantraege vorhanden.",
      msgSubmitted: "Urlaubsantrag eingereicht.",
      msgApproved: "Antrag genehmigt.",
      msgRejected: "Antrag abgelehnt.",
      msgRequestFailed: "Urlaubsantrag konnte nicht erstellt werden.",
      msgDecisionFailed: "Entscheidung konnte nicht gespeichert werden.",
      msgForbidden: "Keine Berechtigung fuer diese Entscheidung.",
      approve: "Genehmigen",
      reject: "Ablehnen",
      decisionApproveNote: "Genehmigt",
      decisionRejectNote: "Abgelehnt",
      errorDateOrder: "Das Startdatum darf nicht nach dem Enddatum liegen.",
    },
    employeesSick: {
      quickTitle: "Schnelle Krankmeldung",
      defaultReason: "Krankmeldung",
      fieldFrom: "Von",
      fieldTo: "Bis",
      fieldConfidential: "Hinweis (vertraulich)",
      confidentialPlaceholder: "Optional",
      submit: "Krankmeldung senden",
      certificateLabel: "Attest erforderlich",
      historyTitle: "Krankmeldungen Historie",
      historyEmpty: "Keine Krankmeldungen vorhanden.",
      certificateYes: "Ja",
      certificateNo: "Nein",
      certificateLine: "Attest erforderlich: {value}",
      confidentialLine: "Vertrauliche Notiz: {text}",
      privacyNote: "Datenschutz: Vertrauliche Angaben werden rollenbasiert reduziert ausgeliefert.",
      msgOk: "Krankmeldung erfasst.",
      msgFailed: "Krankmeldung konnte nicht erfasst werden.",
    },
    trades: {
      kaminfeger: {
        label: "Kaminfeger",
        description:
          "Bezirkssteuerung mit digitalem Kehrbuch, Fristenmonitoring und Bescheidvorbereitung.",
        coreKpis: [
          { label: "Faellige Fristen (14 Tage)", value: "12", hint: "+3 zur Vorwoche" },
          { label: "Offene Maengelmeldungen", value: "7", hint: "2 kritisch priorisiert" },
          { label: "Feuerstaettenschauen diese Woche", value: "18", hint: "81% bereits terminiert" },
          { label: "Kehrbuchvollstaendigkeit", value: "98.4%", hint: "Chronologie vollstaendig" },
        ],
        focusAreas: [
          "Fristwarnungen fuer Feuerstaettenbescheide",
          "Maengel mit unmittelbarem Handlungsbedarf",
          "Nicht bestaetigte Formblatt-Rueckmeldungen",
        ],
        widgets: [
          {
            title: "Fristenmonitor",
            description: "Ueberwachung offener Fristen aus Feuerstaettenbescheiden und Nachweisen.",
            actionLabel: "Fristenliste oeffnen",
            items: [
              "4 Liegenschaften mit Fristablauf in 72 Stunden",
              "2 Bescheide warten auf Ausfuehrungsnachweis",
              "6 Nachkontrollen fuer naechste Woche einplanen",
            ],
          },
          {
            title: "Kehrbuch und Anlagenhistorie",
            description: "Vollstaendigkeit und Chronologie der elektronischen Eintraege sicherstellen.",
            actionLabel: "Kehrbuch pruefen",
            items: [
              "1 Anlage mit unvollstaendiger Brennstoffangabe",
              "3 neue Messergebnisse noch ohne Anlagenzuordnung",
              "Uebergabeprotokoll fuer Bezirksvertretung vorbereiten",
            ],
          },
        ],
      },
      maler: {
        label: "Maler",
        description:
          "Projektsteuerung von Aufmass bis Nachkalkulation mit mobiler Baustellendokumentation.",
        coreKpis: [
          { label: "Aktive Baustellen", value: "21", hint: "5 kurz vor Fertigstellung" },
          { label: "Offene Nachtraege", value: "9", hint: "3 mit Kundenfreigabe ausstehend" },
          { label: "Soll-Ist Stundenabweichung", value: "-6.1%", hint: "Verbessert gegenueber letzter Woche" },
          { label: "Nachkalkulationsquote", value: "74%", hint: "Ziel 90% zum Monatsende" },
        ],
        focusAreas: [
          "Nachkalkulation fuer laufende Grossprojekte",
          "Aufmassfreigaben fuer neue Ausschreibungen",
          "Materialabruf mit aktualisierten Einkaufspreisen",
        ],
        widgets: [
          {
            title: "Aufmass und Leistungsverzeichnis",
            description: "Raum- und flaechenbezogene Positionen fuer Angebot und Abrechnung konsolidieren.",
            actionLabel: "Aufmasscenter oeffnen",
            items: [
              "3 Projekte mit fehlendem Schlussaufmass",
              "2 LV-Importe aus GAEB warten auf Pruefung",
              "Farbtonwechsel in 4 Positionen dokumentieren",
            ],
          },
          {
            title: "Nachkalkulation und Deckungsbeitrag",
            description: "Material- und Lohnkosten gegen Kalkulationsannahmen auswerten.",
            actionLabel: "Nachkalkulation starten",
            items: [
              "Projekt Nordfassade: Marge unter Zielkorridor",
              "12 Rapportzettel noch ohne Kostenstelle",
              "Abweichungsanalyse fuer zwei Teams ausstehend",
            ],
          },
        ],
      },
      shk: {
        label: "SHK",
        description:
          "Service- und Wartungssteuerung fuer Anlagenbetrieb, SLA-Einsaetze und Teileverfuegbarkeit.",
        coreKpis: [
          { label: "Wartungen faellig (7 Tage)", value: "26", hint: "18 bereits disponiert" },
          { label: "Stoerungseinsaetze offen", value: "11", hint: "3 mit SLA-Risiko" },
          { label: "First-Time-Fix-Rate", value: "87%", hint: "+2.4% zum Vormonat" },
          { label: "Kritische Ersatzteile", value: "5", hint: "Nachbestellung heute ausloesen" },
        ],
        focusAreas: [
          "SLA-kritische Kundendienste priorisieren",
          "Wartungsstau in Servicevertraegen reduzieren",
          "Teileverfuegbarkeit in Fahrzeuglagern sichern",
        ],
        widgets: [
          {
            title: "Serviceleitstand",
            description: "Disposition laufender Stoerungs- und Wartungseinsaetze mit Priorisierung.",
            actionLabel: "Leitstand oeffnen",
            items: [
              "3 Einsaetze mit SLA unter 4 Stunden",
              "2 Techniker benoetigen Spezialwerkzeug",
              "1 Wiedervorlage wegen fehlendem Ersatzteil",
            ],
          },
          {
            title: "Anlagenakte und Wartungsvertraege",
            description: "Historie, Protokolle und naechste Servicefenster pro Anlage steuern.",
            actionLabel: "Anlagenakte oeffnen",
            items: [
              "14 Anlagen ohne aktualisierten Wartungsbericht",
              "8 Vertraege mit faelliger Preispruefung",
              "Dokumentationsluecke bei 2 Inbetriebnahmen",
            ],
          },
        ],
      },
    },
  },
  dataTable: {
    view: "Ansicht",
    selectView: "Ansicht auswaehlen",
    outline: "Gliederung",
    pastPerformance: "Bisherige Leistung",
    keyPersonnel: "Schluesselpersonal",
    focusDocuments: "Fokus-Dokumente",
    columns: "Spalten",
    addSection: "Abschnitt hinzufuegen",
    noResults: "Keine Ergebnisse.",
    rowsPerPage: "Zeilen pro Seite",
    page: "Seite",
    of: "von",
    selectedRowsSuffix: "Zeile(n) ausgewaehlt.",
    goToFirstPage: "Zur ersten Seite",
    goToPreviousPage: "Zur vorherigen Seite",
    goToNextPage: "Zur naechsten Seite",
    goToLastPage: "Zur letzten Seite",
    openMenu: "Menue oeffnen",
    dragToReorder: "Zum Neuordnen ziehen",
    selectAll: "Alle auswaehlen",
    selectRow: "Zeile auswaehlen",
    saveLoadingPrefix: "Speichert",
    saveSuccess: "Gespeichert",
    saveError: "Fehler",
    header: "Ueberschrift",
    sectionType: "Abschnittstyp",
    status: "Status",
    target: "Ziel",
    limit: "Limit",
    reviewer: "Pruefer",
    assignReviewer: "Pruefer zuweisen",
    actionEdit: "Bearbeiten",
    actionCopy: "Kopie erstellen",
    actionFavorite: "Favorisieren",
    actionDelete: "Loeschen",
  },
  tableCellViewer: {
    visitorsLastMonths: "Zeigt die Gesamtbesuche der letzten 6 Monate.",
    trendThisMonth: "Anstieg um 5,2% in diesem Monat",
    trendDescription:
      "Zeigt die Gesamtbesuche der letzten 6 Monate. Dieser Text ist ein Platzhalter fuer das Layout.",
    monthJanuary: "Januar",
    monthFebruary: "Februar",
    monthMarch: "Maerz",
    monthApril: "April",
    monthMay: "Mai",
    monthJune: "Juni",
    type: "Typ",
    selectType: "Typ auswaehlen",
    optionTypeTableOfContents: "Inhaltsverzeichnis",
    optionTypeExecutiveSummary: "Zusammenfassung",
    optionTypeTechnicalApproach: "Technischer Ansatz",
    optionTypeDesign: "Design",
    optionTypeCapabilities: "Faehigkeiten",
    optionTypeFocusDocuments: "Fokus-Dokumente",
    optionTypeNarrative: "Narrativ",
    optionTypeCoverPage: "Titelseite",
    status: "Status",
    selectStatus: "Status auswaehlen",
    optionStatusDone: "Abgeschlossen",
    optionStatusInProgress: "In Bearbeitung",
    optionStatusNotStarted: "Nicht gestartet",
    header: "Ueberschrift",
    target: "Ziel",
    limit: "Limit",
    reviewer: "Pruefer",
    selectReviewer: "Pruefer auswaehlen",
    submit: "Speichern",
    done: "Fertig",
  },
  sidebar: {
    panelTitle: "Seitenleiste",
    panelDescription: "Zeigt die mobile Seitenleiste an.",
    toggle: "Seitenleiste umschalten",
  },
  chartArea: {
    title: "Gesamtbesuche",
    subtitleFull: "Gesamtwert der letzten 3 Monate",
    subtitleShort: "Letzte 3 Monate",
    period3Months: "Letzte 3 Monate",
    period30Days: "Letzte 30 Tage",
    period7Days: "Letzte 7 Tage",
    selectValue: "Zeitraum auswaehlen",
    visitors: "Besucher",
    desktop: "Desktop",
    mobile: "Mobil",
  },
  branding: {
    homeAriaLabel: "ZunftGewerk zur Startseite",
    tagline: "Handwerk. Digital.",
  },
  legal: {
    headerNavAriaLabel: "Rechtliche Seiten",
    tocAriaLabel: "Inhaltsverzeichnis",
    tocHeading: "Inhalt",
    homeCta: "Zur Startseite",
    tabs: { imprint: "Impressum", privacy: "Datenschutz", terms: "AGB", faq: "FAQ" },
    imprint: {
      metaTitle: "Impressum - ZunftGewerk",
      metaDescription: "Rechtliche Angaben gemaess TMG und MStV.",
      contentHtml: `<h1>Impressum</h1>
<h2>Angaben gemaess § 5 TMG</h2>
<p>ZunftGewerk KG<br />Haus der Demokratie und Menschenrechte<br />Greifswalder Strasse 4<br />10405 Berlin<br />Deutschland</p>
<h2>Vertreten durch</h2>
<p>Geschaeftsfuehrer: Stefan Waanders</p>
<h2>Kontakt</h2>
<p>Telefon: <a href="tel:+493031991451">+49 (0) 30 3199 1451</a><br />E-Mail: <a href="mailto:hallo@zunftgewerk.de">hallo@zunftgewerk.de</a></p>
<h2>Handelsregister</h2>
<p>Registergericht: Amtsgericht Charlottenburg, Berlin<br />Registernummer: HRA 61889 B</p>
<h2>Umsatzsteuer-ID</h2>
<p>Umsatzsteuer-Identifikationsnummer gemaess § 27 a Umsatzsteuergesetz:<br />DE364076562</p>
<h2>Verantwortlich fuer den Inhalt nach § 18 Abs. 2 MStV</h2>
<p>Stefan Waanders<br />Greifswalder Strasse 4<br />10405 Berlin</p>
<h2>Haftung fuer Inhalte</h2>
<p>Als Diensteanbieter sind wir gemaess § 7 Abs. 1 TMG fuer eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, uebermittelte oder gespeicherte fremde Informationen zu ueberwachen oder nach Umstaenden zu forschen, die auf eine rechtswidrige Taetigkeit hinweisen.</p>
<p>Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberuehrt. Eine diesbezuegliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung moeglich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.</p>
<h2>Haftung fuer Links</h2>
<p>Unser Angebot enthaelt Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb koennen wir fuer diese fremden Inhalte auch keine Gewaehr uebernehmen. Fuer die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten wurden zum Zeitpunkt der Verlinkung auf moegliche Rechtsverstoesse ueberprueft. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar.</p>
<p>Eine permanente inhaltliche Kontrolle der verlinkten Seiten ist jedoch ohne konkrete Anhaltspunkte einer Rechtsverletzung nicht zumutbar. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Links umgehend entfernen.</p>
<h2>Urheberrecht</h2>
<p>Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfaeltigung, Bearbeitung, Verbreitung und jede Art der Verwertung ausserhalb der Grenzen des Urheberrechtes beduerfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers. Downloads und Kopien dieser Seite sind nur fuer den privaten, nicht kommerziellen Gebrauch gestattet.</p>
<p>Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden die Urheberrechte Dritter beachtet. Insbesondere werden Inhalte Dritter als solche gekennzeichnet. Sollten Sie trotzdem auf eine Urheberrechtsverletzung aufmerksam werden, bitten wir um einen entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Inhalte umgehend entfernen.</p>
<h2>Hosting</h2>
<p>Keyweb AG<br />Neuwerkstrasse 45/46<br />99084 Erfurt</p>`,
    },
    privacy: {
      metaTitle: "Datenschutz - ZunftGewerk",
      metaDescription: "Datenschutzerklaerung zur Verarbeitung personenbezogener Daten.",
      contentHtml: `<h1>Datenschutzerklaerung</h1>
<h2>1. Verantwortlicher</h2>
<p>ZunftGewerk KG<br />Haus der Demokratie und Menschenrechte<br />Greifswalder Strasse 4<br />10405 Berlin<br />Deutschland</p>
<p>Telefon: +49 (0) 30 3199 1451<br />E-Mail: <a href="mailto:datenschutz@zunftgewerk.de">datenschutz@zunftgewerk.de</a></p>
<h2>2. Erhebung und Verarbeitung personenbezogener Daten</h2>
<p>Beim Besuch unserer Website erfasst unser Server automatisch Informationen in sogenannten Server-Log-Dateien, die Ihr Browser uebermittelt. Dazu gehoeren:</p>
<ul>
  <li>IP-Adresse des anfragenden Rechners</li>
  <li>Datum und Uhrzeit des Zugriffs</li>
  <li>Name und URL der abgerufenen Datei</li>
  <li>Referrer-URL (zuvor besuchte Seite)</li>
  <li>Verwendeter Browser und ggf. Betriebssystem</li>
</ul>
<p>Diese Daten werden ausschliesslich zur Sicherstellung eines stoerungsfreien Betriebs und zur Verbesserung unseres Angebots ausgewertet. Eine Zuordnung zu bestimmten Personen findet nicht statt. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der technischen Bereitstellung und Sicherheit).</p>
<h2>3. Registrierung und Account</h2>
<p>Fuer die Nutzung unserer SaaS-Plattform ist eine Registrierung erforderlich. Dabei werden folgende Daten verarbeitet:</p>
<ul>
  <li>E-Mail-Adresse</li>
  <li>Passwort (gespeichert als Argon2id-Hash, nicht im Klartext)</li>
  <li>Name des Unternehmens / Betriebs</li>
  <li>Anschrift und Kontaktdaten des Betriebs</li>
  <li>Angaben zu Mitarbeitenden und Geraeten (im Rahmen der Nutzung)</li>
</ul>
<p>Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfuellung). Die Daten werden fuer die Dauer des Vertragsverhaeltnisses gespeichert und nach Kontoloeschung geloescht, soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen.</p>
<h2>4. Zahlungsdaten / Stripe</h2>
<p>Fuer die Zahlungsabwicklung nutzen wir den Dienst <strong>Stripe Inc.</strong> (510 Townsend Street, San Francisco, CA 94103, USA). Bei der Buchung eines kostenpflichtigen Tarifs werden Ihre Zahlungsdaten (Kreditkartennummer, Ablaufdatum, CVC) direkt an Stripe uebermittelt und dort verarbeitet. Wir speichern keine vollstaendigen Zahlungsdaten auf unseren Servern.</p>
<p>Stripe ist als Auftragsverarbeiter gemaess Art. 28 DSGVO eingesetzt. Weitere Informationen finden Sie in der <a href="https://stripe.com/de/privacy" target="_blank" rel="noopener noreferrer">Datenschutzerklaerung von Stripe</a>.</p>
<h2>5. Cookies</h2>
<p>Wir verwenden ausschliesslich technisch notwendige Cookies. Analytische oder Marketing-Cookies werden nicht eingesetzt.</p>
<ul>
  <li><strong>zg_refresh_token</strong> - Session-Cookie zur Authentifizierung. Enthaelt ein kryptographisch zufaelliges Token zur Aufrechterhaltung Ihrer Sitzung. Wird beim Abmelden oder nach Ablauf geloescht.</li>
  <li><strong>zg_consent</strong> - Speichert Ihre Einwilligung zum Einsatz von Cookies. Laufzeit: 1 Jahr.</li>
</ul>
<p>Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse) bzw. § 25 Abs. 2 TDDDG (technisch erforderliche Cookies).</p>
<h2>6. Mobile App</h2>
<p>Unsere mobile Anwendung speichert Authentifizierungstoken im verschluesselten Geraetespeicher (SecureStore). Darueber hinaus werden folgende Daten lokal auf dem Geraet verarbeitet:</p>
<ul>
  <li>Geraete-ID zur Lizenzierung und Synchronisierung</li>
  <li>Offline-Daten (verschluesselt mit AES-256-GCM in einer lokalen Datenbank)</li>
  <li>Synchronisierungsstatus (Vektoruhren)</li>
</ul>
<p>Diese Daten verlassen das Geraet nur im Rahmen der Synchronisierung mit unseren Servern (verschluesselt via TLS).</p>
<h2>7. Auftragsverarbeiter</h2>
<p>Wir setzen folgende Dienstleister als Auftragsverarbeiter gemaess Art. 28 DSGVO ein:</p>
<ul>
  <li><strong>Keyweb AG</strong> (Neuwerkstrasse 45/46, 99084 Erfurt) - Hosting und Serverinfrastruktur</li>
  <li><strong>Stripe Inc.</strong> (510 Townsend Street, San Francisco, CA 94103, USA) - Zahlungsabwicklung</li>
</ul>
<p>Mit allen Auftragsverarbeitern bestehen Vertraege gemaess Art. 28 DSGVO. Fuer die Datenuebermittlung in die USA (Stripe) gelten die EU-Standardvertragsklauseln.</p>
<h2>8. Datensicherheit</h2>
<p>Wir treffen umfangreiche technische und organisatorische Massnahmen zum Schutz Ihrer Daten:</p>
<ul>
  <li>Transportverschluesselung mittels TLS fuer alle Verbindungen</li>
  <li>Passwort-Hashing mit Argon2id (time=3, memory=64 MB, parallelism=1)</li>
  <li>Verschluesselung von MFA-Geheimnissen mit AES-128-GCM</li>
  <li>Signierung von Authentifizierungstoken mit RSA SHA-256 (RS256)</li>
  <li>Refresh-Token-Rotation mit automatischer Erkennung von Token-Missbrauch</li>
</ul>
<h2>9. Speicherdauer</h2>
<ul>
  <li><strong>Account-Daten:</strong> bis zur Loeschung des Accounts durch den Vertragspartner</li>
  <li><strong>Server-Log-Dateien:</strong> 90 Tage</li>
  <li><strong>Audit-Protokolle:</strong> gemaess gesetzlichen Aufbewahrungspflichten (bis zu 10 Jahre)</li>
  <li><strong>Rechnungsdaten:</strong> 10 Jahre (§ 147 AO, § 257 HGB)</li>
</ul>
<h2>10. Ihre Rechte</h2>
<p>Sie haben gemaess DSGVO folgende Rechte bezueglich Ihrer personenbezogenen Daten:</p>
<ul>
  <li><strong>Auskunft</strong> (Art. 15 DSGVO)</li>
  <li><strong>Berichtigung</strong> (Art. 16 DSGVO)</li>
  <li><strong>Loeschung</strong> (Art. 17 DSGVO)</li>
  <li><strong>Einschraenkung der Verarbeitung</strong> (Art. 18 DSGVO)</li>
  <li><strong>Datenuebertragbarkeit</strong> (Art. 20 DSGVO)</li>
  <li><strong>Widerspruch</strong> (Art. 21 DSGVO)</li>
  <li><strong>Widerruf der Einwilligung</strong> (Art. 7 Abs. 3 DSGVO)</li>
  <li><strong>Beschwerde bei einer Aufsichtsbehoerde</strong> (Art. 77 DSGVO) - Berliner Beauftragte fuer Datenschutz und Informationsfreiheit, Friedrichstrasse 219, 10969 Berlin, <a href="https://www.datenschutz-berlin.de" target="_blank" rel="noopener noreferrer">www.datenschutz-berlin.de</a></li>
</ul>
<h2>11. Kontakt</h2>
<p>Bei Fragen zum Datenschutz wenden Sie sich bitte an: <a href="mailto:datenschutz@zunftgewerk.de">datenschutz@zunftgewerk.de</a></p>
<p>Stand: Maerz 2026</p>`,
    },
    terms: {
      metaTitle: "AGB - ZunftGewerk",
      metaDescription: "Allgemeine Geschaeftsbedingungen fuer die ZunftGewerk-Software.",
      contentHtml: `<h1>Allgemeine Geschaeftsbedingungen</h1>
<h2>§ 1 Geltungsbereich</h2>
<p>Diese Allgemeinen Geschaeftsbedingungen (nachfolgend "AGB") gelten fuer alle Vertraege zwischen der ZunftGewerk KG, Greifswalder Strasse 4, 10405 Berlin (nachfolgend "Anbieter") und ihren Vertragspartnern (nachfolgend "Vertragspartner") ueber die Nutzung der ZunftGewerk-Software als Software-as-a-Service (nachfolgend "SaaS" oder "Plattform").</p>
<p>Abweichende, entgegenstehende oder ergaenzende Geschaeftsbedingungen des Vertragspartners werden nur dann Vertragsbestandteil, wenn der Anbieter ihrer Geltung ausdruecklich schriftlich zugestimmt hat.</p>
<h2>§ 2 Vertragsschluss</h2>
<ol>
  <li>Der Vertrag kommt durch die Registrierung und Aktivierung eines Accounts auf der Plattform zustande.</li>
  <li>Mit der Registrierung bestaetigt der Vertragspartner, diese AGB gelesen zu haben und mit ihrer Geltung einverstanden zu sein.</li>
  <li>Der Anbieter kann die Registrierung ohne Angabe von Gruenden ablehnen.</li>
  <li>Fuer einzelne Tarife kann ein kostenloser Testzeitraum gewaehrt werden. Nach Ablauf des Testzeitraums geht das Abonnement in den gewaehlten kostenpflichtigen Tarif ueber, sofern der Vertragspartner nicht zuvor kuendigt.</li>
</ol>
<h2>§ 3 Leistungsumfang</h2>
<ol>
  <li>Der Anbieter stellt dem Vertragspartner die ZunftGewerk-Software als SaaS-Loesung ueber das Internet zur Verfuegung. Der genaue Funktionsumfang ergibt sich aus dem jeweils gebuchten Tarif (Starter oder Professional).</li>
  <li>Der Anbieter bemueht sich um eine Verfuegbarkeit der Plattform von 99,5 % im Jahresmittel. Hiervon ausgenommen sind geplante Wartungsarbeiten sowie Ausfaelle, die ausserhalb des Einflussbereichs des Anbieters liegen.</li>
  <li>Der Anbieter ist berechtigt, die Software weiterzuentwickeln und den Funktionsumfang zu erweitern. Wesentliche Einschraenkungen bestehender Funktionen werden mit einer Frist von 30 Tagen angekuendigt.</li>
</ol>
<h2>§ 4 Pflichten des Vertragspartners</h2>
<ol>
  <li>Der Vertragspartner ist verpflichtet, seine Zugangsdaten vertraulich zu behandeln und vor dem Zugriff durch unbefugte Dritte zu schuetzen.</li>
  <li>Der Vertragspartner darf die Plattform nicht fuer rechtswidrige Zwecke nutzen oder Inhalte einstellen, die gegen geltendes Recht verstossen.</li>
  <li>Es ist dem Vertragspartner untersagt, die Software zu dekompilieren, zu reverse-engineeren oder abgeleitete Werke zu erstellen, es sei denn, dies ist nach zwingend geltendem Recht erlaubt.</li>
  <li>Der Vertragspartner stellt sicher, dass die von ihm eingegebenen Daten korrekt und aktuell sind. Er ist fuer die Erstellung regelmaessiger Backups mittels der bereitgestellten Exportfunktionen verantwortlich.</li>
</ol>
<h2>§ 5 Verguetung und Zahlung</h2>
<ol>
  <li>Die Verguetung richtet sich nach dem vom Vertragspartner gewaehlten Tarif. Alle Preise verstehen sich zuzueglich der gesetzlichen Umsatzsteuer.</li>
  <li>Die Zahlungsabwicklung erfolgt ueber den Dienstleister Stripe Inc. Der Vertragspartner ermaechtigt den Anbieter, die faelligen Betraege ueber die hinterlegte Zahlungsmethode einzuziehen.</li>
  <li>Rechnungen werden elektronisch bereitgestellt und sind sofort faellig.</li>
  <li>Kommt der Vertragspartner mit der Zahlung in Verzug, ist der Anbieter berechtigt, den Zugang zur Plattform nach Mahnung und Setzung einer angemessenen Nachfrist zu sperren.</li>
</ol>
<h2>§ 6 Vertragslaufzeit und Kuendigung</h2>
<ol>
  <li>Der Vertrag wird je nach gewaehltem Tarif auf monatlicher oder jaehrlicher Basis abgeschlossen und verlaengert sich automatisch um die jeweilige Vertragslaufzeit, sofern er nicht rechtzeitig gekuendigt wird.</li>
  <li>Die Kuendigung ist jederzeit zum Ende der laufenden Abrechnungsperiode moeglich und kann ueber die Kontoeinstellungen oder per E-Mail an <a href="mailto:hallo@zunftgewerk.de">hallo@zunftgewerk.de</a> erfolgen.</li>
  <li>Das Recht zur ausserordentlichen Kuendigung aus wichtigem Grund bleibt unberuehrt.</li>
  <li>Nach Vertragsende stellt der Anbieter dem Vertragspartner seine Daten fuer einen Zeitraum von 30 Tagen zum Export zur Verfuegung. Danach werden die Daten unwiderruflich geloescht.</li>
</ol>
<h2>§ 7 Gewaehrleistung und Haftung</h2>
<ol>
  <li>Der Anbieter gewaehrleistet, dass die Plattform im Wesentlichen den beschriebenen Funktionen entspricht.</li>
  <li>Die Haftung des Anbieters ist bei leichter Fahrlaessigkeit auf die Verletzung wesentlicher Vertragspflichten beschraenkt und der Hoehe nach auf den vorhersehbaren, vertragstypischen Schaden begrenzt.</li>
  <li>Die vorstehenden Haftungsbeschraenkungen gelten nicht bei Vorsatz, grober Fahrlaessigkeit, der Verletzung von Leben, Koerper oder Gesundheit sowie bei zwingenden gesetzlichen Haftungsvorschriften.</li>
  <li>Der Anbieter haftet nicht fuer Ausfaelle oder Stoerungen, die auf hoehere Gewalt oder sonstige Umstaende ausserhalb seines Einflussbereichs zurueckzufuehren sind.</li>
</ol>
<h2>§ 8 Datenschutz</h2>
<p>Einzelheiten zur Verarbeitung personenbezogener Daten entnehmen Sie bitte unserer <a href="/legal/privacy">Datenschutzerklaerung</a>. Soweit der Vertragspartner im Rahmen der Nutzung personenbezogene Daten Dritter verarbeitet, schliessen die Parteien einen Auftragsverarbeitungsvertrag gemaess Art. 28 DSGVO.</p>
<h2>§ 9 Geistiges Eigentum</h2>
<ol>
  <li>Die ZunftGewerk-Software, einschliesslich aller Quellcodes, Dokumentationen, Designs und Markenzeichen, ist und bleibt geistiges Eigentum des Anbieters.</li>
  <li>Der Vertragspartner erhaelt fuer die Dauer des Vertrags ein nicht ausschliessliches, nicht uebertragbares, widerrufliches Nutzungsrecht an der Software im Rahmen des gebuchten Tarifs.</li>
  <li>Die vom Vertragspartner in die Plattform eingegebenen Daten verbleiben im Eigentum des Vertragspartners. Der Anbieter erhaelt ein Nutzungsrecht nur insoweit, als dies zur Erbringung der vertraglich vereinbarten Leistungen erforderlich ist.</li>
</ol>
<h2>§ 10 Aenderungen der AGB</h2>
<ol>
  <li>Der Anbieter behaelt sich vor, diese AGB mit Wirkung fuer die Zukunft zu aendern. Der Vertragspartner wird ueber Aenderungen mindestens 30 Tage vor Inkrafttreten per E-Mail informiert.</li>
  <li>Widerspricht der Vertragspartner den geaenderten AGB nicht innerhalb von 30 Tagen nach Zugang der Aenderungsmitteilung, gelten die geaenderten AGB als angenommen.</li>
  <li>Im Fall des Widerspruchs steht beiden Parteien ein Sonderkuendigungsrecht zu.</li>
</ol>
<h2>§ 11 Schlussbestimmungen</h2>
<ol>
  <li>Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts (CISG).</li>
  <li>Ist der Vertragspartner Kaufmann oder juristische Person des oeffentlichen Rechts, ist ausschliesslicher Gerichtsstand Berlin.</li>
  <li>Sollten einzelne Bestimmungen dieser AGB unwirksam sein oder werden, bleibt die Wirksamkeit der uebrigen Bestimmungen unberuehrt.</li>
</ol>
<p>Stand: Maerz 2026</p>`,
    },
    faq: {
      metaTitle: "FAQ - ZunftGewerk",
      metaDescription:
        "Ausfuehrliche Antworten zu ZunftGewerk: Produkt, Datenschutz, Tarife, Clients, Zahlungen, Schnittstellen und Support.",
      pageTitle: "Haeufig gestellte Fragen",
      pageIntro:
        "Hier finden Sie ausfuehrliche Antworten zu unserer Plattform. Die Liste wird regelmaessig ergaenzt.",
    },
  },
  landingSections: {
    hero: {
      badge: "Fuer Kaminfeger, Maler und SHK-Betriebe",
      headingPrefix: "Die Handwerker\u00a0Software,",
      headingHighlight: "die mitdenkt",
      description:
        "Skalieren Sie Ablaeufe von Einsatzplanung bis Faktura mit einer Oberflaeche, die fuer produktive Mitarbeitende gebaut ist.",
      primaryCta: "30 Tage Testphase starten",
      secondaryCta: "Funktionen entdecken",
      trustDsgvo: "DSGVO-konform",
      trustEncryption: "Starke Verschluesselung",
      trustPayment: "Zahlung erst nach Trial-Ende",
      trustSupport: "Persoenlicher Support",
      metricTempoLabel: "Plattform-Tempo",
      metricTempoValue: "60%",
      metricTempoDescription: "weniger Admin-Aufwand im Bueroalltag",
      metricControlLabel: "Datenkontrolle",
      metricControlValue: "100%",
      metricControlDescription: "verschluesselte Speicherung sensibler Daten",
      dashboardPreviewAlt: "ZunftGewerk Dashboard Vorschau",
      liveStatusLabel: "Live-Status",
      liveStatusTitle: "Multi-Geraete-Sync",
      liveStatusDescription: "Desktop, Tablet und Smartphone in Echtzeit",
    },
    features: {
      badge: "Funktionen",
      headingPrefix: "Operative Exzellenz",
      headingHighlight: "in einem System",
      description:
        "Von Disposition bis Dokumentation: Alle Kernprozesse greifen nahtlos ineinander.",
    },
    featuresCarousel: {
      regionAriaLabel: "Funktionen",
      hint:
        "Mit den Pfeiltasten oder den Navigationspunkten koennen Sie zwischen den Funktionen wechseln.",
      activePrefix: "Aktiv",
      of: "von",
      interactiveReady: "Interaktiv",
      interactiveLoading: "Interaktion wird geladen",
      previousLabelPrefix: "Vorherige Funktion.",
      nextLabelPrefix: "Naechste Funktion.",
      navigationAriaLabel: "Feature-Navigation",
      mobileBack: "Zurueck",
      mobileNext: "Weiter",
    },
    howItWorks: {
      kicker: "So funktionierts",
      headingPrefix: "In 3 Schritten zum",
      headingHighlight: "digitalen Betrieb",
      description: "Starten Sie in wenigen Minuten ohne technisches Vorwissen.",
    },
    trades: {
      headingPrefix: "Fuer Ihr Gewerk",
      headingHighlight: "optimiert",
      description:
        "Branchenspezifische Funktionen, die genau auf Ihre Anforderungen zugeschnitten sind.",
      specificLabel: "Branchenspezifisch",
      coreFeaturesLabel: "Immer inklusive",
      cta: "Jetzt Testphase starten",
      secondaryHeading: "Weitere Gewerke",
      comingSoon: "Bald",
    },
    cta: {
      kicker: "Jetzt durchstarten",
      headingPrefix: "Bereit, Ihren Betrieb zu",
      headingHighlight: "digitalisieren",
      description:
        "Starten Sie noch heute mit ZunftGewerk - 30 Tage Testphase ohne Risiko. Ihre sensiblen Nutzer- und Betriebsdaten werden bei uns verschluesselt gespeichert.",
      primaryCta: "Testphase starten",
      secondaryCta: "Beratungsgespraech buchen",
      trustItems: [
        "AES-256-GCM Verschluesselung",
        "Hosting in Deutschland",
        "Abrechnung erst nach Testphase",
        "In 2 Minuten startklar",
      ],
    },
    pricing: {
      billingAriaLabel: "Abrechnungszeitraum",
      billingMonthly: "Monatlich",
      billingYearly: "Jaehrlich",
      popularBadge: "Beliebtester Plan",
      savingsSuffix: "guenstiger",
      trialDaysSuffix: "Tage Testphase",
      featureListFromPrefix: "Alles aus",
      ctaDefaultPopular: "Jetzt starten",
      ctaDefaultOutline: "Auswaehlen",
      freeLabel: "Kostenlos",
      customLabel: "Individuell",
      monthlySuffix: "/ Monat",
      yearlySuffix: "/ Monat, jaehrl. abgerechnet",
    },
  },
  errors: {
    employeePageTitlePrefix: "Mitarbeiter",
    root: {
      title: "Ein unerwarteter Fehler ist aufgetreten",
      description: "Bitte versuche es erneut oder gehe zur Startseite.",
      retry: "Erneut versuchen",
      home: "Zur Startseite",
      errorIdPrefix: "Fehler-ID",
    },
    notFound: {
      title: "Seite nicht gefunden",
      description: "Die angeforderte Seite existiert nicht oder wurde verschoben.",
      home: "Zur Startseite",
      dashboard: "Zum Dashboard",
    },
    dashboard: {
      title: "Dashboard konnte nicht geladen werden",
      description: "Bitte versuche es erneut oder wechsle zur Uebersicht.",
      retry: "Erneut laden",
      overview: "Zur Uebersicht",
      errorIdPrefix: "Fehler-ID",
    },
    employees: {
      title: "Fehler im Mitarbeitenden-Modul",
      retry: "Erneut versuchen",
    },
    employeeDetail: {
      title: "Mitarbeiterprofil konnte nicht geladen werden",
      retry: "Erneut laden",
    },
    employeeNotFound: {
      title: "Mitarbeiter nicht gefunden",
      description: "Das gewaehlte Profil existiert nicht oder gehoert nicht zu deinem Tenant.",
      backToList: "Zurueck zur Mitarbeiterliste",
    },
  },
  api: {
    genericError: "Ein Fehler ist aufgetreten. Bitte versuche es erneut.",
    forgotPasswordEmailSubject: "Sicherheitsinfo: Passwort-Reset angefordert",
    forgotPasswordEmailTitle: "Passwort-Reset angefordert",
    forgotPasswordEmailGreeting: "Hallo,",
    forgotPasswordEmailIntro: "wir haben eine Passwort-Zuruecksetzung fuer dein ZunftGewerk-Konto angefordert.",
    forgotPasswordEmailActionHint: "Falls die Anfrage von dir stammt, oeffne den folgenden sicheren Link:",
    forgotPasswordEmailResetLabel: "Reset-Link",
    forgotPasswordEmailSignInLabel: "Zur Anmeldung",
    forgotPasswordEmailSupportLabel: "Support",
    forgotPasswordEmailIgnoreHint: "Falls du das nicht warst, kannst du diese E-Mail ignorieren.",
    forgotPasswordEmailSecurityBadge: "Sicherheit",
    forgotPasswordEmailHeading: "Passwort zuruecksetzen",
    forgotPasswordEmailBody: "Wir haben soeben eine Passwort-Zuruecksetzung fuer dein Konto erhalten. Wenn die Anfrage von dir stammt, setze dein Passwort jetzt ueber den sicheren Link neu.",
    forgotPasswordEmailButton: "Passwort jetzt neu setzen",
    forgotPasswordEmailFallbackHint: "Falls du das nicht warst, ignoriere diese Nachricht oder melde dich direkt unter",
    auth: {
      invalidBody: "Ungueltiger Request-Body.",
      invalidEmail: "Bitte gib eine gueltige E-Mail ein.",
      invalidPassword: "Bitte gib ein gueltiges Passwort ein.",
      resetTokenInvalid: "Reset-Link ist ungueltig oder abgelaufen.",
      resetUnavailable: "Passwort-Reset ist aktuell nicht verfuegbar.",
      credentialsRequired: "E-Mail und Passwort sind erforderlich.",
      invalidCredentials: "E-Mail oder Passwort sind ungueltig.",
      tokenResponseIncomplete: "Token-Antwort unvollstaendig.",
      loginRateLimited: "Zu viele Anmeldeversuche. Bitte kurz warten.",
      loginAuthServiceUnavailable:
        "Anmeldung ist voruebergehend nicht erreichbar. Bitte spaeter erneut versuchen.",
      loginCsrfInvalid: "Sicherheitspruefung fehlgeschlagen. Bitte Seite neu laden.",
      bffSessionInvalid:
        "Sitzung ungueltig oder abgelaufen. Bitte erneut anmelden.",
      loginRedirectInvalid: "Ungueltige Weiterleitung.",
      loginNativeIncomplete:
        "Fuer die App-Anmeldung werden redirect_uri, state und code_challenge benoetigt.",
      tokenOtcInvalid: "Code ungueltig oder abgelaufen.",
      tokenPkceInvalid: "PKCE-Verifizierung fehlgeschlagen.",
      tokenRedirectMismatch: "redirect_uri stimmt nicht ueberein.",
    },
    emailVerification: {
      signupSubject: "Bitte E-Mail bestaetigen — ZunftGewerk",
      signupBody:
        "Hallo {firstName},\n\nbitte bestaetige deine E-Mail-Adresse fuer dein ZunftGewerk-Konto, indem du den folgenden Link oeffnest:\n\n{link}\n\nWenn du dich nicht registriert hast, kannst du diese Nachricht ignorieren.",
      signupHtmlKicker: "Konto",
      signupHtmlHeading: "E-Mail bestaetigen",
      signupHtmlGreeting: "Hallo {firstName},",
      signupHtmlIntro:
        "bitte bestaetige deine E-Mail-Adresse fuer dein ZunftGewerk-Konto. Klicke auf die Schaltflaeche unten, um deine Registrierung abzuschliessen.",
      signupHtmlButton: "E-Mail-Adresse bestaetigen",
      signupHtmlLinkFallback:
        "Falls die Schaltflaeche nicht funktioniert, kopiere diesen Link in die Adresszeile deines Browsers:",
      signupHtmlFooter:
        "Wenn du dich nicht registriert hast, kannst du diese Nachricht ignorieren.",
      signupHtmlImprintHeading: "Impressum",
      signupHtmlImprintLines:
        "ZunftGewerk KG\nHaus der Demokratie und Menschenrechte\nGreifswalder Strasse 4\n10405 Berlin\nDeutschland",
      signupHtmlImprintLinkLabel: "Vollstaendiges Impressum",
      signupHtmlLogoAlt: "ZunftGewerk",
      bannerOk: "E-Mail-Adresse bestaetigt. Danke!",
      bannerInvalid: "Bestaetigungslink ist ungueltig oder abgelaufen.",
      bannerConfig: "Bestaetigung ist derzeit nicht moeglich. Bitte spaeter erneut versuchen.",
    },
    onboarding: {
      registrationRestricted: "Registrierung ist nur ueber das Onboarding-Formular erlaubt.",
      invalidRegistrationData: "Ungueltige Registrierungsdaten.",
      registrationUnavailable: "Registrierung ist derzeit nicht verfuegbar.",
      registrationFailed: "Registrierung konnte nicht abgeschlossen werden.",
      registrationAutoSigninFailed:
        "Registrierung erfolgreich, aber automatische Anmeldung fehlgeschlagen.",
      emailAlreadyExists: "Diese E-Mail ist bereits registriert.",
      completionRestricted: "Abschluss ist nur ueber das Onboarding-Formular erlaubt.",
      sessionMissing: "Session nicht gefunden.",
      invalidBillingData: "Ungueltige Abrechnungsdaten.",
      stripeConfigInvalid: "Stripe ist nicht korrekt konfiguriert.",
      setupIntentLoadFailed: "Stripe SetupIntent konnte nicht geladen werden.",
      paymentMethodNotConfirmed: "Zahlungsmethode ist noch nicht bestaetigt.",
      stripeDataIncomplete: "Stripe-Daten sind unvollstaendig.",
      subscriptionsCheckFailed: "Bestehende Abonnements konnten nicht geprueft werden.",
      subscriptionCreateFailed: "Abonnement konnte nicht erstellt werden.",
    },
    health: {
      replayGuidance:
        "Replay-Schutz ist aktiv, aber nicht cluster-sicher. Fuer Produktion AUTH_PASSWORD_RESET_REDIS_URL setzen.",
    },
  },
  common: {
    more: "Mehr",
    unknownUserInitials: "BN",
    close: "Schliessen",
    done: "Fertig",
    breadcrumbAriaLabel: "Breadcrumb",
    switchToDarkMode: "Dark Mode aktivieren",
    switchToLightMode: "Light Mode aktivieren",
    cycleThemeMode: "Theme wechseln",
    themeModeLight: "Light",
    themeModeDark: "Dark",
    themeModeSystem: "System",
  },
  navUser: {
    profileFromSession: "Profil aus Session",
    authProtected: "Authentifiziert (OIDC)",
    oidcSession: "Sichere Token-Session",
    logout: "Abmelden",
    loggingOut: "Abmeldung…",
  },
  webShell: {
    desktopDownload: {
      title: "Desktop-App",
      description:
        "Installierbare App fuer Windows, macOS und Linux. OS und CPU-Architektur werden im Browser erkannt (keine vollstaendige Hardware-Analyse).",
      cta: "Desktop-App herunterladen",
      detectedPrefix: "Erkannt:",
      osLabels: {
        windows: "Windows",
        macos: "macOS",
        linux: "Linux",
        unknown: "Unbekannt",
      },
      archLabels: {
        arm64: "arm64",
        x64: "x64",
        unknown: "Architektur unbekannt",
      },
      otherDownloads: "Weitere Plattformen",
      configMissing:
        "Download-Links sind noch nicht konfiguriert. Bitte NEXT_PUBLIC_DESKTOP_DOWNLOADS_JSON setzen.",
      inElectron: "Du nutzt bereits die Desktop-App.",
    },
  },
} as const

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends readonly (infer U)[]
    ? readonly (U extends string ? string : DeepPartial<U>)[]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K] extends string
        ? string
        : T[K]
}

const uiTextEnOverrides: DeepPartial<typeof uiTextDe> = {
  landing: {
    header: {
      navLinks: [
        { href: "#trades", label: "Trades" },
        { href: "#features", label: "Features" },
        { href: "#how-it-works", label: "How it works" },
        { href: "#pricing", label: "Pricing" },
        { href: "/legal/faq", label: "FAQ" },
      ],
      faqLabel: "FAQ",
      signInDesktop: "SIGN IN",
      startTrialDesktop: "START TRIAL",
      openMenuLabel: "Open menu",
      navigationSheetLabel: "Navigation",
      navigationSheetTitle: "Navigation",
      navigationSheetDescription: "Quick access to sections and entry points.",
      mobileNavigationLabel: "Mobile navigation",
      signInMobile: "Sign in",
      startTrialMobile: "Start trial",
    },
    footer: {
      ariaLabel: "Footer",
      productNavAriaLabel: "Product links",
      supportNavAriaLabel: "Support links",
      legalNavAriaLabel: "Legal",
      productHeading: "Product",
      supportHeading: "Support",
      legalHeading: "Legal",
      productLinks: [
        { href: "#features", label: "Features" },
        { href: "#pricing", label: "Pricing" },
        { href: "#trades", label: "Industry solutions" },
      ],
      supportLinks: [{ href: "mailto:support@zunftgewerk.de", label: "Contact" }],
      legalLinks: [
        { href: "/legal/imprint", label: "Imprint" },
        { href: "/legal/terms", label: "Terms" },
        { href: "/legal/privacy", label: "Privacy" },
      ],
      brandDescription:
        "All-in-one software for chimney sweeps, painters, and HVAC businesses. GDPR-compliant and made in Germany.",
      copyrightSuffix: "ZunftGewerk KG. All rights reserved.",
      builtWithLabel: "Built with",
      swissFlagLabel: "Swiss flag",
      swissPartner: "Buendner Chimney Sweep GmbH",
      germanFlagLabel: "German flag",
      germanPartner: "Tivialis Staffing KG",
      faqLabel: "FAQ",
    },
    pricing: {
      headingPrefix: "Reliable planning.",
      headingHighlight: "Scalable.",
      description: "Transparent plans for small businesses up to growing companies.",
      priceHint: "All prices exclude VAT - 30-day trial - billing starts after trial.",
      plans: [
        {
          tier: "starter",
          name: "Starter",
          description: "For small businesses with professional requirements.",
          ctaText: "Choose plan",
          ctaLink: "/onboarding?plan=starter",
          features: [
            "Max. 5 users",
            "10 GB storage",
            "5 licenses",
            "30-day trial",
            "Mobile app",
            "Desktop app",
            "GDPR compliant",
            "Strong data encryption",
            "Billing starts after trial",
          ],
        },
        {
          tier: "professional",
          name: "Professional",
          description: "For growing businesses with advanced requirements and larger teams.",
          ctaText: "Choose plan",
          ctaLink: "/onboarding?plan=professional",
          features: [
            "Max. 10 users",
            "50 GB storage",
            "10 licenses",
            "30-day trial",
            "Mobile app",
            "Desktop app",
            "GDPR compliant",
            "Strong data encryption",
            "Billing starts after trial",
            "DATEV interface",
            "GAEB interface",
          ],
        },
      ],
    },
  },
  auth: {
    brandHomeLabel: "ZunftGewerk - Back to home",
    signInAria: "Go to sign in",
    signInBadge: "Sign in",
    signInHeadline: "Welcome back.",
    signInDescription: "Sign in with your ZunftGewerk account.",
    signInCardTitle: "Sign in to your account",
    usernameOrEmailLabel: "Username or email",
    emailLabel: "Email",
    passwordLabel: "Password",
    forgotPassword: "Forgot password?",
    passwordShow: "Show password",
    passwordHide: "Hide password",
    signInPending: "Signing in…",
    signInDesktopHandoff: "Connecting desktop app…",
    signInSubmit: "Sign in",
    missingCredentials: "Please enter email and password.",
    invalidCredentials: "Email or password is invalid.",
    resetTitle: "Forgot password",
    resetDescription: "Enter your email. We will send you a secure reset link.",
    resetBadge: "Security",
    resetEmailLabel: "Email",
    resetSubmit: "Send reset link",
    resetSubmitting: "Sending…",
    resetSuccess:
      "If an account with this email exists, a reset link has been sent. Please check your inbox.",
    resetInvalidEmail: "Please enter a valid email address.",
    resetRequestError: "Could not request a reset link. Please try again.",
    resetPasswordTitle: "Set a new password",
    resetPasswordDescription: "Set your new password for your ZunftGewerk account.",
    resetPasswordBadge: "Password reset",
    resetPasswordLabel: "New password",
    resetPasswordConfirmLabel: "Confirm password",
    resetPasswordSubmit: "Save password",
    resetPasswordSubmitting: "Saving…",
    resetPasswordSuccess: "Your password has been updated. You can sign in now.",
    resetPasswordInvalidToken: "Reset link is invalid or has expired.",
    resetPasswordMismatch: "Password and confirmation do not match.",
    resetPasswordTooShort: "Password must be at least 8 characters long.",
    resetPasswordRequestError: "Could not update password. Please try again.",
    backToSignIn: "Back to sign in",
    securityHintDsgvo: "GDPR-compliant sign in",
    securityHint2fa: "2FA and secure session tokens",
  },
  onboarding: {
    metaTitle: "Onboarding",
    countryNames: { CH: "Switzerland", DE: "Germany", AT: "Austria" },
    metaDescription: "Choose your trade and start setting up your ZunftGewerk account.",
    badge: "Onboarding",
    heading: "Welcome to onboarding",
    description: "Choose your plan and billing first, then set up your business profile.",
    steps: {
      label: "Step",
      of: "of",
      planTitle: "Plan and billing",
      profileAndTradeTitle: "Business profile and trade",
      credentialsTitle: "Credentials",
      verifyEmailTitle: "Confirm email",
      checkoutTitle: "Checkout",
    },
    account: {
      profileHeading: "Business profile",
      profileDescription:
        "First, enter your company and personal details.",
      credentialsHeading: "Credentials",
      credentialsDescription: "Confirm the contact email for your company profile.",
      companyNameLabel: "Company name",
      firstNameLabel: "First name",
      lastNameLabel: "Last name",
      emailLabel: "Email",
      passwordLabel: "Password",
      confirmPasswordLabel: "Confirm password",
      companyNamePlaceholder: "Sample Crafts GmbH…",
      firstNamePlaceholder: "Max…",
      lastNamePlaceholder: "Mustermann…",
      emailPlaceholder: "max@company.com…",
      passwordPlaceholder: "At least 8 characters…",
      confirmPasswordPlaceholder: "Repeat password…",
      confirmPasswordMismatch: "Password and confirmation must match.",
    },
    tradeSelection: {
      heading: "Select trade",
      description:
        "This choice controls trade-specific functions in your setup.",
      ariaLabel: "Trade selection",
      currentLabel: "Selected",
      currentDescriptionLabel: "Description",
      moreTradesHint: "More trades will be added gradually.",
    },
    planSelection: {
      heading: "Plan and billing",
      description: "Choose your plan and billing cycle for the trial subscription.",
      planLabel: "Plan",
      planAriaLabel: "Plan selection",
      starterLabel: "Starter",
      professionalLabel: "Professional",
      billingLabel: "Billing",
      billingAriaLabel: "Select billing cycle",
      monthlyLabel: "Monthly",
      yearlyLabel: "Yearly",
      costOverviewLabel: "Cost overview",
      perMonthLabel: "/ month",
      perMonthYearlyLabel: "/ month, billed yearly",
      perYearTotalLabel: "/ year",
      yearlyTotalLabel: "Yearly total",
      yearlyIfMonthlyLabel: "Yearly total with monthly billing",
      savingsPrefix: "You save with yearly billing",
      savingsBadgeSuffix: "cheaper",
      trialHint: "days trial. Billing starts afterwards.",
    },
    checkout: {
      heading: "Checkout",
      description: "Complete your payment details directly in onboarding.",
      paymentMethodLabel: "Payment method",
      cardMethodLabel: "Card",
      directDebitMethodLabel: "SEPA direct debit",
      directDebitComingSoon: "Coming soon",
      paymentDataLabel: "Payment details",
      cardholderNameLabel: "Cardholder name",
      cardholderNamePlaceholder: "Full name…",
      cardNumberLabel: "Card number",
      expiryLabel: "Expiry",
      cvcLabel: "CVC",
      cvcPlaceholder: "123…",
      countryLabel: "Country",
      termsHint:
        "By providing your card details, you agree that ZunftGewerk Sandbox may charge your card for future payments according to its terms.",
      secureHint:
        "Payment details are processed securely by Stripe and are not stored on our servers.",
      missingPublishableKey:
        "Stripe checkout could not be loaded. Please set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.",
      backToCredentials: "Back to credentials",
      backToVerify: "Back to email confirmation",
      confirmPayment: "Save payment method",
      confirmingPayment: "Saving payment method…",
      paymentMethodUnavailable: "This payment method is currently not available.",
    },
    actions: {
      cancel: "Go to dashboard",
      back: "Back",
      continue: "Continue",
      finish: "Done",
      finishing: "Saving…",
      startCheckout: "Continue to Stripe checkout",
      preparingCheckout: "Preparing checkout…",
      submitError: "Could not save onboarding. Please try again.",
      duplicateEmailError:
        "This email is already registered. Please sign in or use another email.",
      profileRequiredHint:
        "Please fill in company name, first name, last name, and select a trade.",
      profileReadyHint:
        "Business profile and trade are complete. You can continue with credentials.",
      credentialsRequiredHint:
        "Please enter a valid contact email and set a password with at least 8 characters.",
      authRedirectHint: "Creating account and preparing payment form.",
      checkoutCancelledHint:
        "Stripe checkout was cancelled. You can restart the process here.",
      checkoutReadyHint:
        "Checkout is ready. Enter your payment details directly in onboarding.",
      credentialsReadyHint:
        "All required fields are present. You can complete onboarding.",
      planReadyHint: "Plan and billing are set. You can continue with company details.",
      verificationEmailHint:
        "We sent you a confirmation email. Open the link in the message to verify your address.",
      verifyPendingHint:
        "Open the link in the email. We automatically check when your address is confirmed.",
      verifyReadyHint: "Your email is confirmed. You can continue to checkout.",
      continueToCheckout: "Continue to checkout",
    },
  },
  dashboard: {
    overview: "Overview",
    overviewDescription: "Welcome to your dashboard. Your most important metrics appear here.",
    employees: "Employees",
    employeeProfile: "Employee profile",
    dataRecordsTitle: "Data records",
    dataRecordsDescription: "Live status from backend via BFF proxy.",
    dataRecordsLoading: "Loading data records…",
    dataRecordsError: "Could not load data records.",
    dataRecordsRetry: "Retry",
    dataRecordsTotal: "Total",
    dataRecordsNoData: "No data records found.",
    dataRecordsLastUpdated: "Last updated",
    dataRecordsVersionLabel: "Version",
    dataRecordsPreviewLabel: "Preview",
  },
  dashboardWorkbench: {
    kpiCard: {
      statusLabel: "Status",
      priorityLabel: "Priority",
      trendLabel: "Trend",
      benchmarkLabel: "Window",
      refreshedLabel: "Refreshed",
      statusGood: "Stable",
      statusMedium: "Watch",
      statusBad: "Critical",
      priorityHigh: "High",
      priorityMedium: "Medium",
      priorityLow: "Low",
    },
    overviewEmployeesTable: {
      title: "Employees table",
      description: "Current workforce overview with role, status, and direct profile access.",
    },
    coreKpisTitle: "Operational status",
    coreKpisDescription:
      "Key operational indicators for today's dispatch and order situation.",
    focusAreasTitle: "Focus areas",
    focusAreasDescription:
      "These specialized domains should be prioritized today.",
    widgetsTitle: "Trade modules",
    widgetsDescription:
      "Trade-specific work areas with prepared lists, deadlines, and recommended actions.",
    meta: {
      observabilityTitle: "System status",
      observabilityDescription:
        "Data source, processing duration, and freshness of dashboard aggregation.",
      trendsTitle: "Performance trends",
      trendsDescription:
        "Time series of key trade metrics with day-level comparison.",
      trendsDrilldownHint:
        "Tip: click a highlighted data point to open the related module route.",
      thresholdLabelPrefix: "Threshold",
      thresholdLegendTitle: "Thresholds",
      trendStatusGood: "on target",
      trendStatusBad: "off target",
      sourceLabel: "Data source",
      sourceLive: "Live",
      sourceFallback: "Fallback",
      durationLabel: "Processing time",
      recordTotalLabel: "Records",
      complianceTitle: "Compliance checks",
      complianceDescription:
        "Regulatory baseline checks for the selected trade context.",
      compliancePassed: "Passed",
      complianceFailed: "Open",
      complianceNotConfigured:
        "No trade-specific compliance checks configured for this module.",
    },
    routeDescriptions: {
      workOrders: "Structured work order operations.",
      schedule: "Structured scheduling operations.",
      serviceControl:
        "Service control tower for SLA-based dispatch of incident jobs and maintenance work orders.",
      assetFiles:
        "Asset file with maintenance history, service logs, and due items from service contracts.",
      emergencyBoard:
        "Emergency board for incident-driven assignments with escalation levels, on-call shifts, and response times.",
      serviceContracts:
        "Service contract management covering SLA targets, contract terms, price adjustment clauses, and renewals.",
      partsLogistics:
        "Spare parts logistics for van stock, minimum levels, and replenishment per service order.",
      measurementCenter:
        "Measurement center for room and area capture with position mapping for quotes and billing.",
      postCalculation:
        "Post-calculation with planned-vs-actual comparison for materials, labor time, and project margin.",
      materialManagement:
        "Material management with tint control, price lists, stock levels, and site-level call-offs.",
      gaeb:
        "GAEB interface for BOQ import, position matching, and export in standardized exchange formats.",
      siteDocumentation:
        "Mobile site documentation with photos, daily reports, and progress evidence.",
      quoting:
        "Quoting workflows with calculation, variant comparison, and approval state per customer and site.",
      customers: "Structured customer operations.",
      billing: "Structured billing operations.",
      employees:
        "Workforce module for master data, availability, vacation planning, and sickness reporting.",
      employeesNew: "Create a new employee in your tenant.",
      sweepLedger:
        "Electronic sweep ledger with chronological entries, form assignment, and completeness checks.",
      fireplacesRegistry:
        "Fireplace and asset registry with fuel type, capacity, and condition history per property.",
      deadlines:
        "Deadline management with automatic alerts, notice preparation, and execution proofs.",
      inspections:
        "Planning and documentation of fireplace inspections with defect recording and follow-up.",
      defects:
        "Defect management with classification, photo documentation, and escalation to authorities.",
      emissions:
        "Emission measurement protocols, limit checks per 1st BImSchV, and instrument management.",
      notices:
        "Notice management for creation, dispatch, and delivery confirmation of fireplace notices.",
      districtStats:
        "District statistics with coverage rate, compliance reporting, and annual authority report.",
      documents:
        "Document management for form templates, protocol archives, and audit-proof storage.",
    },
    nav: {
      groups: { common: "General", district: "District", projectControl: "Project control", serviceOperations: "Service operations", administration: "Administration" },
      overview: "Overview",
      workOrders: "Work order center",
      schedule: "Scheduling",
      serviceControl: "Service control tower",
      assetFiles: "Asset files",
      emergencyBoard: "Emergency board",
      serviceContracts: "Service contracts",
      partsLogistics: "Parts logistics",
      measurementCenter: "Measurement center",
      postCalculation: "Post-calculation",
      materialManagement: "Material management",
      gaeb: "GAEB interface",
      siteDocumentation: "Site docs",
      quoting: "Quoting",
      customers: "Customer records",
      billing: "Billing",
      employees: "Employees",
      sweepLedger: "Sweep ledger",
      fireplacesRegistry: "Fireplaces",
      deadlines: "Deadlines",
      inspections: "Inspections",
      defects: "Defects",
      emissions: "Emissions",
      notices: "Notices",
      districtStats: "District stats",
      documents: "Documents",
    },
    customersCreate: {
      pageTitle: "Create customer record",
      createButton: "Create customer record",
      createButtonAria: "Create new customer record",
      backToList: "Back to list",
      stepCustomer: "Step 1: Customer",
      stepContactsAddresses: "Step 2: Contacts & addresses",
      stepObject: "Step 3: Object",
      nextStep: "Next",
      backStep: "Back",
      sectionCustomer: "Customer",
      sectionContacts: "Contacts",
      sectionAddresses: "Addresses",
      sectionObject: "First object",
      fieldCustomerNo: "Customer number",
      fieldCustomerType: "Customer type",
      typeCompany: "Company",
      typePerson: "Private person",
      fieldDisplayName: "Display name",
      fieldCompanyName: "Company name",
      fieldFirstName: "First name",
      fieldLastName: "Last name",
      fieldEmail: "Email",
      fieldPhone: "Phone",
      fieldStatus: "Status",
      statusActive: "Active",
      statusInactive: "Inactive",
      addContact: "Add contact",
      addAddress: "Add address",
      removeRow: "Remove",
      contactsOptionalHint: "Optional: add contacts or skip this step.",
      addressesOptionalHint: "Optional: add addresses or skip this step.",
      fieldContactRole: "Role",
      fieldContactName: "Name",
      fieldContactEmail: "Email",
      fieldContactPhone: "Phone",
      fieldContactPrimary: "Primary contact",
      fieldAddressType: "Address type",
      addressTypeMain: "Main address",
      addressTypeBilling: "Billing address",
      addressTypeService: "Service address",
      addressTypeObject: "Object address",
      fieldAddressStreet: "Street",
      fieldAddressHouseNo: "House number",
      fieldAddressPostalCode: "Postal code",
      fieldAddressCity: "City",
      fieldAddressCountry: "Country (ISO-2)",
      fieldObjectNo: "Object number",
      fieldObjectName: "Object name",
      fieldObjectType: "Object type",
      objectTypeProperty: "Property",
      objectTypeSite: "Construction site",
      objectTypeAsset: "Asset location",
      submit: "Create",
      submitting: "Creating…",
      errorGeneric: "The customer record could not be created.",
      errorValidation: "Please check your input.",
      errorConflict: "Customer or object number already exists.",
      errorUnauthorized: "You are not signed in. Please sign in again.",
      errorForbidden: "You do not have permission to create customer records.",
    },
    customersList: {
      cardTitle: "Customer list",
      listMeta: "{count} shown",
      searchPlaceholder: "Search by name or number",
      searchAriaLabel: "Search customers",
      statusFilterAriaLabel: "Filter customer status",
      statusAll: "All statuses",
      statusActive: "Active",
      statusInactive: "Inactive",
      tableNo: "No.",
      tableName: "Name",
      tableType: "Type",
      tableStatus: "Status",
      tableAction: "Action",
      profile: "Profile",
      emptyFiltered: "No customers match the current filter.",
      applyFilters: "Apply filters",
      resetFilters: "Reset filters",
      exportCsv: "CSV export",
      kpiTotal: "Total customers",
      kpiActive: "Active customers",
      kpiInactive: "Inactive customers",
      kpiNewThisMonth: "New customers (month)",
      kpiTotalHint: "All customers on file",
      kpiActiveHint: "Active status",
      kpiInactiveHint: "Inactive status",
      kpiNewThisMonthHint: "Created in the current calendar month",
    },
    customersProfileLayout: {
      backToList: "Back to list",
      typeCompany: "Company",
      typePerson: "Private person",
    },
    customersProfileActions: {
      edit: "Edit",
      editAria: "Edit customer record",
      delete: "Delete",
      deleteAria: "Delete customer record",
      deleteDialogTitle: "Delete customer record?",
      deleteDialogDescription:
        'The customer record "{name}" and all related contacts, addresses, and objects will be permanently removed from view.',
      deleteCancel: "Cancel",
      deleteConfirm: "Delete permanently",
      deleteInProgress: "Deleting…",
      deleteErrorGeneric: "The customer record could not be deleted.",
      deleteErrorUnauthorized: "You are not signed in. Please sign in again.",
      deleteErrorForbidden: "You do not have permission to delete this customer record.",
    },
    customersEdit: {
      pageTitle: "Edit customer record",
      sectionTitle: "Master data",
      backToProfile: "Back to customer record",
      submit: "Save",
      submitting: "Saving…",
      fieldVatId: "VAT ID",
      fieldCustomerNoReadonly: "Customer number (cannot be changed)",
      errorGeneric: "The customer record could not be saved.",
      errorValidation: "Please check your input.",
      errorConflict: "Data was changed in the meantime. Please reload the page and try again.",
      errorUnauthorized: "You are not signed in. Please sign in again.",
      errorForbidden: "You do not have permission to edit this customer record.",
    },
    customersProfileNav: {
      ariaLabel: "Customer record navigation",
      overview: "Overview",
      contacts: "Contacts",
      addresses: "Addresses",
      objects: "Objects",
      history: "History",
    },
    customersHistory: {
      title: "History",
      empty: "No events yet.",
      eventAt: "Timestamp",
      source: "Source",
    },
    customersObjectNav: {
      ariaLabel: "Object navigation",
      overview: "Object overview",
      trade: "Trade modules",
      kaminfeger: "Chimney sweep",
      shk: "HVAC",
      maler: "Painter",
    },
    customersObjectOverview: {
      title: "Object overview",
      fieldNo: "Object no.",
      fieldName: "Name",
      fieldType: "Type",
      fieldUsage: "Usage",
      moduleDescription: "Object-specific trade module with live data and actions.",
      kaminfegerTitle: "Chimney sweep",
      kaminfegerCta: "Open chimney sweep module",
      shkTitle: "HVAC",
      shkCta: "Open HVAC module",
      malerTitle: "Painter",
      malerCta: "Open painter module",
    },
    customersOverview: {
      sectionCustomer: "Customer master data",
      sectionContact: "Contact details",
      sectionObjects: "Objects",
      fieldNo: "No.",
      fieldType: "Type",
      fieldStatus: "Status",
      fieldEmail: "Email",
      fieldPhone: "Phone",
      noObjects: "No objects yet.",
      objectNo: "Object no.",
      objectName: "Object",
      objectType: "Type",
      objectDetails: "Details",
      map: {
        title: "Location map",
        description: "Displays the geocoded customer address.",
        noLocation: "No geocoded address available yet. Please geocode an address first.",
        fieldAddress: "Address",
        fieldCoordinates: "Coordinates",
        mapIframeAriaDescription:
          "Map data © OpenStreetMap contributors; license and attribution at openstreetmap.org/copyright",
      },
    },
    customersContacts: {
      title: "Contacts",
      description: "Contact persons for this customer record.",
      add: "Add contact",
      save: "Save contacts",
      saving: "Saving…",
      fieldRole: "Role",
      fieldName: "Name",
      fieldEmail: "Email",
      fieldPhone: "Phone",
      fieldPrimary: "Primary contact",
      remove: "Remove",
      empty: "No contacts on file.",
      saved: "Contacts saved.",
      errorGeneric: "Contacts could not be saved.",
    },
    customersAddresses: {
      title: "Addresses",
      description: "Address data and geocoding for customer and object mapping.",
      add: "Add address",
      save: "Save addresses",
      saving: "Saving…",
      geocode: "Geocode",
      fieldType: "Address type",
      typeMain: "Main address",
      typeBilling: "Billing address",
      typeService: "Service address",
      typeObject: "Object address",
      fieldStreet: "Street",
      fieldHouseNo: "House number",
      fieldPostalCode: "Postal code",
      fieldCity: "City",
      fieldCountry: "Country (ISO-2)",
      fieldLatitude: "Latitude",
      fieldLongitude: "Longitude",
      remove: "Remove",
      empty: "No addresses on file.",
      saved: "Addresses saved.",
      savedAndGeocoded: "Address saved and geocoded automatically.",
      savedButGeocodeFailed: "Address saved. Automatic geocoding failed.",
      geocodeApproximate:
        "Geocoding returned only an approximate fallback position. Please check OpenRouteService configuration or enter coordinates manually.",
      errorConflict: "Record was updated in the meantime. Latest data was reloaded.",
      errorCoordinatesLatitude: "Latitude must be between -90 and 90.",
      errorCoordinatesLongitude: "Longitude must be between -180 and 180.",
      errorCoordinatesPair: "Enter both latitude and longitude, or leave both empty.",
      errorGeneric: "Addresses could not be saved.",
    },
    customersKaminfeger: {
      title: "Chimney sweep module",
      fireplacesTitle: "Fireplaces",
      noticesTitle: "Notices",
      deadlinesTitle: "Deadlines",
      ledgerTitle: "Sweep ledger",
      fieldFireplaceNo: "Fireplace no.",
      fieldKind: "Type",
      fieldFuelType: "Fuel type",
      fieldNominalPower: "Nominal power (kW)",
      fieldIssuedAt: "Issued at",
      fieldValidFrom: "Valid from",
      fieldLegalBasis: "Legal basis",
      fieldDeadlineType: "Deadline type",
      fieldDueDate: "Due date",
      fieldEntryDate: "Entry date",
      fieldWorkType: "Work type",
      fieldResult: "Result",
      fieldPerformedBy: "Performed by",
      create: "Create",
      creating: "Saving…",
      complete: "Mark as done",
      saved: "Saved.",
      errorGeneric: "Entry could not be saved.",
      empty: "No entries yet.",
    },
    customersShk: {
      title: "HVAC module",
      assetsTitle: "Assets",
      contractsTitle: "Service contracts",
      maintenanceTitle: "Maintenance plan",
      eventsTitle: "Service events",
      fieldAssetNo: "Asset no.",
      fieldAssetType: "Asset type",
      fieldManufacturer: "Manufacturer",
      fieldAssetStatus: "Asset status",
      assetStatusActive: "Active",
      assetStatusInactive: "Inactive",
      fieldContractNo: "Contract no.",
      fieldContractStart: "Contract start",
      fieldSlaHours: "SLA (hours)",
      fieldContractBillingCycle: "Billing cycle",
      billingCycleMonthly: "Monthly",
      billingCycleYearly: "Yearly",
      fieldContractStatus: "Contract status",
      contractStatusActive: "Active",
      contractStatusPaused: "Paused",
      contractStatusEnded: "Ended",
      fieldAssetId: "Asset ID",
      fieldMaintenanceNextDue: "Next due date",
      fieldMaintenanceIntervalValue: "Interval value",
      fieldMaintenanceContract: "Maintenance contract",
      fieldMaintenanceIntervalUnit: "Interval unit (MONTH|YEAR)",
      intervalUnitMonth: "Month",
      intervalUnitYear: "Year",
      fieldEventStartedAt: "Started at",
      fieldEventType: "Event type",
      eventTypeMaintenance: "Maintenance",
      eventTypeIncident: "Incident",
      eventTypeInspection: "Inspection",
      fieldEventSummary: "Summary",
      fieldEventId: "Event ID",
      noAssetsHint: "Please create an asset first",
      noContractOption: "No contract",
      unknownContract: "Unknown contract",
      planLabel: "Plan",
      slaLabel: "SLA",
      statusLoading: "loading",
      planStatusMissing: "No plan",
      planStatusActive: "Active",
      planStatusOverdue: "Overdue",
      slaStatusNone: "No open event",
      slaStatusOpen: "Open",
      slaStatusOverdue: "Overdue",
      summaryContract: "Active contract",
      summaryNextDue: "Next maintenance",
      summaryOpenEvents: "Open events",
      summaryNoPlan: "No maintenance plan",
      refresh: "Refresh list",
      create: "Create",
      creating: "Saving…",
      close: "Mark as done",
      saved: "Saved.",
      errorGeneric: "Entry could not be saved.",
      empty: "No entries yet.",
    },
    customersMaler: {
      title: "Painter module",
      projectsTitle: "Projects",
      measurementTitle: "Measurement",
      boqTitle: "BOQ / Positions",
      postCalculationTitle: "Post-calculation",
      siteReportsTitle: "Site reports",
      selectProject: "Select project",
      selectSheet: "Select measurement sheet",
      fieldProjectNo: "Project no.",
      fieldProjectName: "Project name",
      fieldProjectStatus: "Project status",
      statusPlanned: "Planned",
      statusRunning: "Running",
      statusDone: "Done",
      fieldProjectStart: "Start date",
      fieldSheetNo: "Sheet no.",
      fieldMeasuredAt: "Measured at",
      fieldMethod: "Method",
      methodOnsite: "On-site",
      methodPlan: "Plan",
      methodPhoto: "Photo",
      fieldSheetState: "State",
      sheetStateDraft: "Draft",
      sheetStateApproved: "Approved",
      fieldItemType: "Item type",
      itemTypeArea: "Area",
      itemTypeLength: "Length",
      itemTypeCount: "Count",
      itemTypeVolume: "Volume",
      fieldItemDescription: "Description",
      fieldItemQuantity: "Quantity",
      fieldItemUnit: "Unit",
      fieldBoqNo: "Position no.",
      fieldBoqTitle: "Title",
      fieldBoqQuantity: "Quantity",
      fieldBoqUnitPrice: "Net unit price",
      fieldCalcDate: "Calculated at",
      fieldCalcPlanned: "Planned net cost",
      fieldCalcActual: "Actual net cost",
      fieldCalcMargin: "Margin (%)",
      fieldReportDate: "Report date",
      fieldWeather: "Weather",
      fieldProgressNote: "Progress note",
      fieldBlockingIssue: "Blocking issue",
      create: "Create",
      creating: "Saving…",
      saved: "Saved.",
      errorGeneric: "Entry could not be saved.",
      empty: "No entries yet.",
    },
    employeesCreate: {
      pageTitle: "Create employee",
      createButton: "Create employee",
      createButtonAria: "Create new employee",
      backToList: "Back to list",
      sectionPerson: "Person and contact",
      sectionAddress: "Address (optional)",
      addAddressLabel: "Also capture address now",
      fieldEmployeeNo: "Employee number",
      fieldFirstName: "First name",
      fieldLastName: "Last name",
      fieldEmail: "Email",
      fieldPhone: "Phone",
      fieldRoleTitle: "Role title",
      fieldStatus: "Status",
      fieldEmploymentType: "Employment type",
      statusActive: "Active",
      statusOnboarding: "Onboarding",
      statusInactive: "Inactive",
      employmentFullTime: "Full time",
      employmentPartTime: "Part time",
      employmentContractor: "Contractor",
      employmentApprentice: "Apprentice",
      fieldStreet: "Street",
      fieldHouseNo: "House number",
      fieldPostalCode: "Postal code",
      fieldCity: "City",
      fieldCountry: "Country (ISO-2)",
      fieldGeocodingSource: "Geocoding source",
      fieldLatitude: "Latitude",
      fieldLongitude: "Longitude",
      submit: "Create",
      submitting: "Creating…",
      coordinatesPreview: "Coordinate preview",
      coordinatesNone: "No coordinates on file",
      errorGeneric: "The employee could not be created.",
      errorValidation: "Please check your input.",
      errorConflict: "This employee number is already in use for your tenant.",
      errorUnauthorized: "You are not signed in. Please sign in again.",
      errorForbidden: "You do not have permission to create employees.",
    },
    employeesList: {
      cardTitle: "Employee list",
      listMeta: "{count} shown",
      searchPlaceholder: "Search by name, number, or role",
      searchAriaLabel: "Search employees",
      statusFilterAria: "Filter by status",
      statusAll: "All statuses",
      statusActive: "Active",
      statusOnboarding: "Onboarding",
      statusInactive: "Inactive",
      tableNo: "No.",
      tableName: "Name",
      tableRole: "Role",
      tableStatus: "Status",
      tableAction: "Action",
      profile: "Profile",
      emptyFiltered: "No employees match the current filter.",
    },
    employeesProfileLayout: {
      backToList: "Back to list",
      roleFallback: "No role title",
      employmentTypes: {
        FULL_TIME: "Full time",
        PART_TIME: "Part time",
        CONTRACTOR: "Contractor",
        APPRENTICE: "Apprentice",
      },
    },
    employeesProfileNav: {
      ariaLabel: "Employee profile navigation",
      stammdaten: "Master data",
      verfuegbarkeit: "Availability",
      urlaub: "Vacation",
      krankmeldungen: "Sick leave",
    },
    employeesMaster: {
      sectionPerson: "Person and contact",
      sectionAddress: "Address and location",
      fieldFirstName: "First name",
      fieldLastName: "Last name",
      fieldEmail: "Email",
      fieldPhone: "Phone",
      fieldRoleTitle: "Role",
      fieldStatus: "Status",
      fieldEmploymentType: "Employment type",
      statusActive: "Active",
      statusOnboarding: "Onboarding",
      statusInactive: "Inactive",
      employmentFullTime: "Full time",
      employmentPartTime: "Part time",
      employmentContractor: "Contractor",
      employmentApprentice: "Apprentice",
      fieldStreet: "Street",
      fieldHouseNo: "House number",
      fieldPostalCode: "Postal code",
      fieldCity: "City",
      fieldCountry: "Country",
      fieldGeocodingSource: "Geocoding source",
      fieldGeoPrecision: "Geocoding precision",
      fieldLatitude: "Latitude",
      fieldLongitude: "Longitude",
      fieldFormattedAddress: "Formatted address",
      formattedAddressNone: "No formatted address yet.",
      geoPrecisionNone: "Not specified",
      coordinatesPreview: "Coordinate preview",
      coordinatesNone: "No coordinates on file",
      save: "Save master data",
      saving: "Saving…",
      geocodeButton: "Geocode address",
      msgSaved: "Master data saved.",
      msgGeocodeOk: "Coordinates were derived from the address.",
      errorEmployeeSave: "Master data could not be saved.",
      errorAddressSave: "Address could not be saved.",
      errorGeocode: "Geocoding failed.",
      errorUnexpected: "Unexpected error while saving.",
      errorConflict: "Record changed in the meantime. Reload the page and try again.",
      errorCoordinatesLatitude: "Latitude must be between -90 and 90.",
      errorCoordinatesLongitude: "Longitude must be between -180 and 180.",
      errorCoordinatesPair: "Enter both latitude and longitude, or leave both empty.",
      errorFirstNameRequired: "First name cannot be empty.",
      errorLastNameRequired: "Last name cannot be empty.",
    },
    employeesAvailability: {
      weekdayShortLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      fieldWeekday: "Weekday",
      fieldFrom: "From",
      fieldTo: "To",
      fieldEffectiveFrom: "Valid from",
      fieldEffectiveTo: "Valid to",
      fieldTimezone: "Time zone",
      exceptionNoReason: "No reason given",
      exceptionDefaultReason: "Manual exception",
      rulesTitle: "Weekly pattern",
      rulesAdd: "Rule",
      rulesSave: "Save rules",
      rulesSaved: "Rules saved.",
      rulesSaveFailed: "Rules could not be saved.",
      exceptionsTitle: "Exceptions",
      exceptionsAdd: "Exception",
      exceptionDeleteAria: "Delete exception",
      exceptionNone: "No exceptions defined.",
      exceptionCreated: "Exception created.",
      exceptionCreateFailed: "Exception could not be created.",
      exceptionDeleted: "Exception deleted.",
      exceptionDeleteFailed: "Exception could not be deleted.",
      errorTimeOrder: "Start time must be before end time.",
      errorDateOrder: "Valid-from date cannot be after valid-to date.",
    },
    employeesVacation: {
      balanceTitle: "Vacation balance {year}",
      metricAllowance: "Allowance",
      metricUsed: "Used",
      metricCarryOver: "Carry-over",
      metricRemaining: "Remaining",
      requestTitle: "New vacation request",
      fieldFrom: "From",
      fieldTo: "To",
      fieldReason: "Reason",
      submit: "Submit request",
      historyTitle: "Request history",
      historyEmpty: "No vacation requests yet.",
      msgSubmitted: "Vacation request submitted.",
      msgApproved: "Request approved.",
      msgRejected: "Request rejected.",
      msgRequestFailed: "Vacation request could not be created.",
      msgDecisionFailed: "Decision could not be saved.",
      msgForbidden: "You are not allowed to make this decision.",
      approve: "Approve",
      reject: "Reject",
      decisionApproveNote: "Approved",
      decisionRejectNote: "Rejected",
      errorDateOrder: "Start date cannot be after end date.",
    },
    employeesSick: {
      quickTitle: "Quick sick leave",
      defaultReason: "Sick leave",
      fieldFrom: "From",
      fieldTo: "To",
      fieldConfidential: "Note (confidential)",
      confidentialPlaceholder: "Optional",
      submit: "Submit sick leave",
      certificateLabel: "Certificate required",
      historyTitle: "Sick leave history",
      historyEmpty: "No sick leave records.",
      certificateYes: "Yes",
      certificateNo: "No",
      certificateLine: "Certificate required: {value}",
      confidentialLine: "Confidential note: {text}",
      privacyNote: "Privacy: Confidential fields are reduced based on your role.",
      msgOk: "Sick leave recorded.",
      msgFailed: "Sick leave could not be recorded.",
    },
    trades: {
      kaminfeger: {
        label: "Chimney sweep",
        description:
          "District operations with digital sweep ledger, deadline monitoring, and notice preparation.",
        coreKpis: [
          { label: "Due deadlines (14 days)", value: "12", hint: "+3 versus last week" },
          { label: "Open defect reports", value: "7", hint: "2 marked critical" },
          { label: "Inspections this week", value: "18", hint: "81% already scheduled" },
          { label: "Ledger completeness", value: "98.4%", hint: "Chronology complete" },
        ],
        focusAreas: [
          "Deadline alerts for regulatory notices",
          "Defects requiring immediate action",
          "Unconfirmed compliance form responses",
        ],
        widgets: [
          {
            title: "Deadline monitor",
            description: "Track open deadlines from notices and submitted proofs.",
            actionLabel: "Open deadline list",
            items: [
              "4 properties with deadlines in 72 hours",
              "2 notices awaiting execution proof",
              "Schedule 6 follow-up checks for next week",
            ],
          },
          {
            title: "Sweep ledger and asset history",
            description: "Ensure completeness and chronology of electronic records.",
            actionLabel: "Review sweep ledger",
            items: [
              "1 asset with incomplete fuel information",
              "3 new measurements missing asset mapping",
              "Prepare handover protocol for district coverage",
            ],
          },
        ],
      },
      maler: {
        label: "Painter",
        description:
          "Project control from measurement to post-calculation with mobile site documentation.",
        coreKpis: [
          { label: "Active projects", value: "21", hint: "5 close to completion" },
          { label: "Open change orders", value: "9", hint: "3 awaiting customer approval" },
          { label: "Planned vs actual hours", value: "-6.1%", hint: "Improved over last week" },
          { label: "Post-calculation coverage", value: "74%", hint: "Target 90% by month-end" },
        ],
        focusAreas: [
          "Post-calculation for ongoing major projects",
          "Measurement approvals for new tenders",
          "Material call-offs with updated purchase prices",
        ],
        widgets: [
          {
            title: "Measurement and bill of quantities",
            description: "Consolidate room and area positions for quote and billing.",
            actionLabel: "Open measurement center",
            items: [
              "3 projects missing final measurement",
              "2 GAEB imports pending validation",
              "Document color changes in 4 positions",
            ],
          },
          {
            title: "Post-calculation and margin",
            description: "Evaluate material and labor costs against baseline assumptions.",
            actionLabel: "Start post-calculation",
            items: [
              "Project North facade: margin below target",
              "12 daily reports missing cost center mapping",
              "Variance analysis pending for two teams",
            ],
          },
        ],
      },
      shk: {
        label: "HVAC",
        description:
          "Service and maintenance control for assets, SLA incidents, and parts availability.",
        coreKpis: [
          { label: "Maintenance due (7 days)", value: "26", hint: "18 already dispatched" },
          { label: "Open incident jobs", value: "11", hint: "3 with SLA risk" },
          { label: "First-time-fix rate", value: "87%", hint: "+2.4% versus last month" },
          { label: "Critical spare parts", value: "5", hint: "Trigger replenishment today" },
        ],
        focusAreas: [
          "Prioritize SLA-critical service incidents",
          "Reduce backlog in maintenance contracts",
          "Secure spare parts in vehicle stocks",
        ],
        widgets: [
          {
            title: "Service control tower",
            description: "Dispatch ongoing incident and maintenance jobs by priority.",
            actionLabel: "Open control tower",
            items: [
              "3 jobs with SLA below 4 hours",
              "2 technicians require specialized tools",
              "1 revisit due to missing spare part",
            ],
          },
          {
            title: "Asset file and service contracts",
            description: "Control history, reports, and next service windows per asset.",
            actionLabel: "Open asset file",
            items: [
              "14 assets without updated maintenance report",
              "8 contracts pending price review",
              "Documentation gap on 2 commissioning jobs",
            ],
          },
        ],
      },
    },
  },
  dataTable: {
    view: "View",
    selectView: "Select view",
    outline: "Outline",
    pastPerformance: "Past performance",
    keyPersonnel: "Key personnel",
    focusDocuments: "Focus documents",
    columns: "Columns",
    addSection: "Add section",
    noResults: "No results.",
    rowsPerPage: "Rows per page",
    page: "Page",
    of: "of",
    selectedRowsSuffix: "row(s) selected.",
    goToFirstPage: "Go to first page",
    goToPreviousPage: "Go to previous page",
    goToNextPage: "Go to next page",
    goToLastPage: "Go to last page",
    openMenu: "Open menu",
    dragToReorder: "Drag to reorder",
    selectAll: "Select all",
    selectRow: "Select row",
    saveLoadingPrefix: "Saving",
    saveSuccess: "Saved",
    saveError: "Error",
    header: "Header",
    sectionType: "Section type",
    status: "Status",
    target: "Target",
    limit: "Limit",
    reviewer: "Reviewer",
    assignReviewer: "Assign reviewer",
    actionEdit: "Edit",
    actionCopy: "Copy",
    actionFavorite: "Favorite",
    actionDelete: "Delete",
  },
  tableCellViewer: {
    visitorsLastMonths: "Showing total visitors for the last 6 months.",
    trendThisMonth: "Trending up by 5.2% this month",
    trendDescription:
      "Showing total visitors for the last 6 months. This text is placeholder copy for the layout.",
    monthJanuary: "January",
    monthFebruary: "February",
    monthMarch: "March",
    monthApril: "April",
    monthMay: "May",
    monthJune: "June",
    type: "Type",
    selectType: "Select type",
    optionTypeTableOfContents: "Table of contents",
    optionTypeExecutiveSummary: "Executive summary",
    optionTypeTechnicalApproach: "Technical approach",
    optionTypeDesign: "Design",
    optionTypeCapabilities: "Capabilities",
    optionTypeFocusDocuments: "Focus documents",
    optionTypeNarrative: "Narrative",
    optionTypeCoverPage: "Cover page",
    status: "Status",
    selectStatus: "Select status",
    optionStatusDone: "Done",
    optionStatusInProgress: "In progress",
    optionStatusNotStarted: "Not started",
    header: "Header",
    target: "Target",
    limit: "Limit",
    reviewer: "Reviewer",
    selectReviewer: "Select reviewer",
    submit: "Save",
    done: "Done",
  },
  sidebar: {
    panelTitle: "Sidebar",
    panelDescription: "Displays the mobile sidebar.",
    toggle: "Toggle sidebar",
  },
  chartArea: {
    title: "Total visitors",
    subtitleFull: "Total for the last 3 months",
    subtitleShort: "Last 3 months",
    period3Months: "Last 3 months",
    period30Days: "Last 30 days",
    period7Days: "Last 7 days",
    selectValue: "Select time range",
    visitors: "Visitors",
    desktop: "Desktop",
    mobile: "Mobile",
  },
  common: {
    more: "More",
    unknownUserInitials: "NA",
    close: "Close",
    done: "Done",
    breadcrumbAriaLabel: "Breadcrumb",
    switchToDarkMode: "Enable dark mode",
    switchToLightMode: "Enable light mode",
    cycleThemeMode: "Switch theme",
    themeModeLight: "Light",
    themeModeDark: "Dark",
    themeModeSystem: "System",
  },
  branding: {
    homeAriaLabel: "ZunftGewerk home",
    tagline: "Crafts. Digital.",
  },
  legal: {
    headerNavAriaLabel: "Legal pages",
    tocAriaLabel: "Table of contents",
    tocHeading: "Contents",
    homeCta: "Back to home",
    tabs: { imprint: "Imprint", privacy: "Privacy", terms: "Terms", faq: "FAQ" },
    imprint: {
      metaTitle: "Imprint - ZunftGewerk",
      metaDescription: "Legal information according to German TMG and MStV.",
      contentHtml: `<h1>Imprint</h1>
<h2>Information pursuant to Section 5 German Telemedia Act (TMG)</h2>
<p>ZunftGewerk KG<br />Haus der Demokratie und Menschenrechte<br />Greifswalder Strasse 4<br />10405 Berlin<br />Germany</p>
<h2>Represented by</h2>
<p>Managing Director: Stefan Waanders</p>
<h2>Contact</h2>
<p>Phone: <a href="tel:+493031991451">+49 (0) 30 3199 1451</a><br />Email: <a href="mailto:hallo@zunftgewerk.de">hallo@zunftgewerk.de</a></p>
<h2>Commercial register</h2>
<p>Register court: Amtsgericht Charlottenburg, Berlin<br />Register number: HRA 61889 B</p>
<h2>VAT ID</h2>
<p>VAT identification number pursuant to Section 27 a German VAT Act:<br />DE364076562</p>
<h2>Responsible for editorial content pursuant to Section 18 para. 2 MStV</h2>
<p>Stefan Waanders<br />Greifswalder Strasse 4<br />10405 Berlin</p>
<h2>Liability for content</h2>
<p>As a service provider, we are responsible for our own content on these pages in accordance with general law pursuant to Section 7 para. 1 TMG. According to Sections 8 to 10 TMG, however, as a service provider we are not obliged to monitor transmitted or stored third-party information or to investigate circumstances indicating illegal activity.</p>
<p>Obligations to remove or block the use of information under general law remain unaffected. Liability in this respect is only possible from the point in time at which a specific infringement becomes known. Upon notification of corresponding infringements, we will remove such content immediately.</p>
<h2>Liability for links</h2>
<p>Our offer contains links to external third-party websites over whose content we have no influence. Therefore, we cannot assume any liability for this third-party content. The respective provider or operator of the linked pages is always responsible for the content of the linked pages. Linked pages were checked for possible legal violations at the time of linking. Illegal content was not recognisable at the time of linking.</p>
<p>Permanent monitoring of linked pages is unreasonable without concrete evidence of a legal violation. If we become aware of legal violations, we will remove such links immediately.</p>
<h2>Copyright</h2>
<p>The content and works created by the site operators on these pages are subject to German copyright law. Reproduction, editing, distribution and any kind of exploitation outside the limits of copyright require the written consent of the respective author or creator. Downloads and copies of this site are permitted for private, non-commercial use only.</p>
<p>Where content on this site was not created by the operator, third-party copyrights are respected. In particular, third-party content is identified as such. Should you nevertheless become aware of a copyright infringement, please notify us accordingly. Upon becoming aware of legal violations, we will remove such content immediately.</p>
<h2>Hosting</h2>
<p>Keyweb AG<br />Neuwerkstrasse 45/46<br />99084 Erfurt</p>`,
    },
    privacy: {
      metaTitle: "Privacy - ZunftGewerk",
      metaDescription: "Privacy notice on processing personal data.",
      contentHtml: `<h1>Privacy Policy</h1>
<h2>1. Controller</h2>
<p>ZunftGewerk KG<br />Haus der Demokratie und Menschenrechte<br />Greifswalder Strasse 4<br />10405 Berlin<br />Germany</p>
<p>Phone: +49 (0) 30 3199 1451<br />Email: <a href="mailto:datenschutz@zunftgewerk.de">datenschutz@zunftgewerk.de</a></p>
<h2>2. Collection and processing of personal data</h2>
<p>When you visit our website, our server automatically collects information in server log files that your browser transmits. This includes:</p>
<ul>
  <li>IP address of the requesting device</li>
  <li>Date and time of access</li>
  <li>Name and URL of the requested file</li>
  <li>Referrer URL (previously visited page)</li>
  <li>Browser used and, if applicable, operating system</li>
</ul>
<p>This data is evaluated exclusively to ensure trouble-free operation and to improve our offering. It is not assigned to specific individuals. The legal basis is Art. 6 para. 1 lit. f GDPR (legitimate interest in technical provision and security).</p>
<h2>3. Registration and account</h2>
<p>Registration is required to use our SaaS platform. The following data is processed:</p>
<ul>
  <li>Email address</li>
  <li>Password (stored as Argon2id hash, not in plain text)</li>
  <li>Company name</li>
  <li>Company address and contact details</li>
  <li>Information about employees and assets (within product usage)</li>
</ul>
<p>The legal basis is Art. 6 para. 1 lit. b GDPR (contract performance). Data is stored for the duration of the contractual relationship and deleted after account deletion unless statutory retention obligations apply.</p>
<h2>4. Payment data / Stripe</h2>
<p>For payment processing, we use <strong>Stripe Inc.</strong> (510 Townsend Street, San Francisco, CA 94103, USA). When booking a paid plan, your payment data (card number, expiry date, CVC) is transmitted directly to Stripe and processed there. We do not store complete payment data on our servers.</p>
<p>Stripe is engaged as a processor pursuant to Art. 28 GDPR. More information is available in the <a href="https://stripe.com/de/privacy" target="_blank" rel="noopener noreferrer">Stripe Privacy Policy</a>.</p>
<h2>5. Cookies</h2>
<p>We only use technically necessary cookies. Analytical or marketing cookies are not used.</p>
<ul>
  <li><strong>zg_refresh_token</strong> - session cookie for authentication. Contains a cryptographically random token to maintain your session. Deleted on sign-out or expiry.</li>
  <li><strong>zg_consent</strong> - stores your cookie consent decision. Retention: 1 year.</li>
</ul>
<p>The legal basis is Art. 6 para. 1 lit. f GDPR (legitimate interest) and Section 25 para. 2 German TDDDG (technically necessary cookies).</p>
<h2>6. Mobile app</h2>
<p>Our mobile application stores authentication tokens in encrypted device storage (SecureStore). In addition, the following data is processed locally on the device:</p>
<ul>
  <li>Device ID for licensing and synchronization</li>
  <li>Offline data (encrypted with AES-256-GCM in a local database)</li>
  <li>Synchronization status (vector clocks)</li>
</ul>
<p>This data only leaves the device during synchronization with our servers (encrypted via TLS).</p>
<h2>7. Processors</h2>
<p>We use the following service providers as processors pursuant to Art. 28 GDPR:</p>
<ul>
  <li><strong>Keyweb AG</strong> (Neuwerkstrasse 45/46, 99084 Erfurt) - hosting and server infrastructure</li>
  <li><strong>Stripe Inc.</strong> (510 Townsend Street, San Francisco, CA 94103, USA) - payment processing</li>
</ul>
<p>We have concluded data processing agreements with all processors pursuant to Art. 28 GDPR. EU standard contractual clauses apply for data transfers to the USA (Stripe).</p>
<h2>8. Data security</h2>
<p>We implement extensive technical and organizational measures to protect your data:</p>
<ul>
  <li>TLS transport encryption for all connections</li>
  <li>Password hashing with Argon2id (time=3, memory=64 MB, parallelism=1)</li>
  <li>Encryption of MFA secrets with AES-128-GCM</li>
  <li>Signing of authentication tokens using RSA SHA-256 (RS256)</li>
  <li>Refresh token rotation with automatic abuse detection</li>
</ul>
<h2>9. Retention periods</h2>
<ul>
  <li><strong>Account data:</strong> until deletion of the account by the contractual partner</li>
  <li><strong>Server log files:</strong> 90 days</li>
  <li><strong>Audit logs:</strong> according to legal retention obligations (up to 10 years)</li>
  <li><strong>Invoice data:</strong> 10 years (German Fiscal Code and Commercial Code)</li>
</ul>
<h2>10. Your rights</h2>
<p>Under GDPR, you have the following rights regarding your personal data:</p>
<ul>
  <li><strong>Access</strong> (Art. 15 GDPR)</li>
  <li><strong>Rectification</strong> (Art. 16 GDPR)</li>
  <li><strong>Erasure</strong> (Art. 17 GDPR)</li>
  <li><strong>Restriction of processing</strong> (Art. 18 GDPR)</li>
  <li><strong>Data portability</strong> (Art. 20 GDPR)</li>
  <li><strong>Objection</strong> (Art. 21 GDPR)</li>
  <li><strong>Withdrawal of consent</strong> (Art. 7 para. 3 GDPR)</li>
  <li><strong>Complaint to a supervisory authority</strong> (Art. 77 GDPR), e.g. Berliner Beauftragte fuer Datenschutz und Informationsfreiheit, Friedrichstrasse 219, 10969 Berlin, <a href="https://www.datenschutz-berlin.de" target="_blank" rel="noopener noreferrer">www.datenschutz-berlin.de</a></li>
</ul>
<h2>11. Contact</h2>
<p>If you have questions about data protection, please contact: <a href="mailto:datenschutz@zunftgewerk.de">datenschutz@zunftgewerk.de</a></p>
<p>Last updated: March 2026</p>`,
    },
    terms: {
      metaTitle: "Terms - ZunftGewerk",
      metaDescription: "General terms and conditions for ZunftGewerk software.",
      contentHtml: `<h1>General Terms and Conditions</h1>
<h2>Section 1 Scope</h2>
<p>These General Terms and Conditions (hereinafter "Terms") apply to all contracts between ZunftGewerk KG, Greifswalder Strasse 4, 10405 Berlin (hereinafter "Provider") and its contractual partners (hereinafter "Customer") regarding the use of the ZunftGewerk software as Software as a Service (hereinafter "SaaS" or "Platform").</p>
<p>Deviating, conflicting or supplementary terms of the Customer become part of the contract only if the Provider expressly agrees to their validity in writing.</p>
<h2>Section 2 Conclusion of contract</h2>
<ol>
  <li>The contract is concluded through registration and activation of an account on the platform.</li>
  <li>By registering, the Customer confirms that they have read and accepted these Terms.</li>
  <li>The Provider may reject registration without stating reasons.</li>
  <li>For individual plans, a free trial period may be granted. After the trial period expires, the subscription converts into the selected paid plan unless cancelled beforehand.</li>
</ol>
<h2>Section 3 Scope of services</h2>
<ol>
  <li>The Provider makes the ZunftGewerk software available to the Customer as a SaaS solution over the internet. The exact scope of functions depends on the selected plan (Starter or Professional).</li>
  <li>The Provider strives for platform availability of 99.5% annual average. Planned maintenance and outages beyond the Provider's control are excluded.</li>
  <li>The Provider is entitled to further develop the software and extend functionality. Material restrictions of existing functions will be announced 30 days in advance.</li>
</ol>
<h2>Section 4 Customer obligations</h2>
<ol>
  <li>The Customer must keep access credentials confidential and protect them from unauthorized third-party access.</li>
  <li>The Customer may not use the platform for unlawful purposes or upload unlawful content.</li>
  <li>The Customer is prohibited from decompiling, reverse engineering or creating derivative works, unless mandatory law permits it.</li>
  <li>The Customer ensures entered data is correct and up to date and is responsible for regular backups via provided export functions.</li>
</ol>
<h2>Section 5 Fees and payment</h2>
<ol>
  <li>Fees depend on the selected plan. All prices are exclusive of statutory VAT.</li>
  <li>Payments are processed via Stripe Inc. The Customer authorizes the Provider to collect due amounts using the stored payment method.</li>
  <li>Invoices are provided electronically and are due immediately.</li>
  <li>If the Customer is in default, the Provider may suspend access after reminder and reasonable grace period.</li>
</ol>
<h2>Section 6 Contract term and termination</h2>
<ol>
  <li>The contract is concluded on a monthly or yearly basis depending on the selected plan and renews automatically unless terminated in due time.</li>
  <li>Termination is possible at any time effective at the end of the current billing period via account settings or email to <a href="mailto:hallo@zunftgewerk.de">hallo@zunftgewerk.de</a>.</li>
  <li>The right to terminate for cause remains unaffected.</li>
  <li>After contract end, the Provider makes Customer data available for export for 30 days, after which the data is irrevocably deleted.</li>
</ol>
<h2>Section 7 Warranty and liability</h2>
<ol>
  <li>The Provider warrants that the platform substantially corresponds to the described functions.</li>
  <li>In cases of slight negligence, Provider liability is limited to breaches of essential contractual obligations and to foreseeable, typical contractual damage.</li>
  <li>These limitations do not apply in cases of intent, gross negligence, injury to life, body or health, or mandatory statutory liability.</li>
  <li>The Provider is not liable for outages or disruptions caused by force majeure or other circumstances beyond its control.</li>
</ol>
<h2>Section 8 Data protection</h2>
<p>Details on processing personal data can be found in our <a href="/legal/privacy">Privacy Policy</a>. If the Customer processes third-party personal data when using the platform, the parties conclude a data processing agreement under Art. 28 GDPR.</p>
<h2>Section 9 Intellectual property</h2>
<ol>
  <li>The ZunftGewerk software, including source code, documentation, designs and trademarks, remains the Provider's intellectual property.</li>
  <li>The Customer receives a non-exclusive, non-transferable, revocable right of use for the duration of the contract within the booked plan.</li>
  <li>Data entered by the Customer remains the Customer's property. The Provider receives a right of use only to the extent required to provide contractual services.</li>
</ol>
<h2>Section 10 Changes to these Terms</h2>
<ol>
  <li>The Provider reserves the right to amend these Terms for the future. The Customer will be informed by email at least 30 days before changes take effect.</li>
  <li>If the Customer does not object within 30 days after receiving the change notice, the amended Terms are deemed accepted.</li>
  <li>In case of objection, both parties have a special right of termination.</li>
</ol>
<h2>Section 11 Final provisions</h2>
<ol>
  <li>The law of the Federal Republic of Germany applies, excluding the UN Convention on Contracts for the International Sale of Goods (CISG).</li>
  <li>If the Customer is a merchant or legal entity under public law, exclusive place of jurisdiction is Berlin.</li>
  <li>If any provision of these Terms is or becomes invalid, the validity of the remaining provisions remains unaffected.</li>
</ol>
<p>Last updated: March 2026</p>`,
    },
    faq: {
      metaTitle: "FAQ - ZunftGewerk",
      metaDescription:
        "In-depth answers about ZunftGewerk: product, privacy, plans, clients, billing, integrations, and support.",
      pageTitle: "Frequently asked questions",
      pageIntro: "Detailed answers about our platform. This page is updated regularly.",
    },
  },
  landingSections: {
    hero: {
      badge: "For chimney sweeps, painters, and HVAC businesses",
      headingPrefix: "The trades\u00a0software,",
      headingHighlight: "that thinks ahead",
      description:
        "Scale workflows from scheduling to invoicing with an interface built for productive teams.",
      primaryCta: "Start 30-day trial",
      secondaryCta: "Discover features",
      trustDsgvo: "GDPR compliant",
      trustEncryption: "Strong encryption",
      trustPayment: "Billing starts after trial",
      trustSupport: "Personal support",
      metricTempoLabel: "Platform speed",
      metricTempoValue: "60%",
      metricTempoDescription: "less admin effort in everyday office work",
      metricControlLabel: "Data control",
      metricControlValue: "100%",
      metricControlDescription: "encrypted storage of sensitive data",
      dashboardPreviewAlt: "ZunftGewerk dashboard preview",
      liveStatusLabel: "Live status",
      liveStatusTitle: "Multi-device sync",
      liveStatusDescription: "Desktop, tablet, and smartphone in real time",
    },
    features: {
      badge: "Features",
      headingPrefix: "Operational excellence",
      headingHighlight: "in one system",
      description:
        "From dispatch to documentation: all core processes work together seamlessly.",
    },
    featuresCarousel: {
      regionAriaLabel: "Features",
      hint: "Use arrow keys or navigation dots to switch between features.",
      activePrefix: "Active",
      of: "of",
      interactiveReady: "Interactive",
      interactiveLoading: "Loading interaction",
      previousLabelPrefix: "Previous feature.",
      nextLabelPrefix: "Next feature.",
      navigationAriaLabel: "Feature navigation",
      mobileBack: "Back",
      mobileNext: "Next",
    },
    howItWorks: {
      kicker: "How it works",
      headingPrefix: "Go digital in",
      headingHighlight: "3 steps",
      description: "Get started in minutes without technical expertise.",
    },
    trades: {
      headingPrefix: "Optimized for",
      headingHighlight: "your trade",
      description:
        "Trade-specific capabilities tailored exactly to your requirements.",
      specificLabel: "Trade-specific",
      coreFeaturesLabel: "Always included",
      cta: "Start trial now",
      secondaryHeading: "More trades",
      comingSoon: "Soon",
    },
    cta: {
      kicker: "Get started now",
      headingPrefix: "Ready to",
      headingHighlight: "digitize your business",
      description:
        "Start with ZunftGewerk today - 30-day risk-free trial. Your sensitive user and business data is encrypted at rest.",
      primaryCta: "Start trial",
      secondaryCta: "Book consultation",
      trustItems: [
        "AES-256-GCM encryption",
        "Hosting in Germany",
        "Billing after trial only",
        "Ready in 2 minutes",
      ],
    },
    pricing: {
      billingAriaLabel: "Billing interval",
      billingMonthly: "Monthly",
      billingYearly: "Yearly",
      popularBadge: "Most popular plan",
      savingsSuffix: "cheaper",
      trialDaysSuffix: "days trial",
      featureListFromPrefix: "Everything from",
      ctaDefaultPopular: "Start now",
      ctaDefaultOutline: "Select",
      freeLabel: "Free",
      customLabel: "Custom",
      monthlySuffix: "/ month",
      yearlySuffix: "/ month, billed yearly",
    },
  },
  errors: {
    employeePageTitlePrefix: "Employee",
    root: {
      title: "An unexpected error occurred",
      description: "Please try again or return to the home page.",
      retry: "Try again",
      home: "Back to home",
      errorIdPrefix: "Error ID",
    },
    notFound: {
      title: "Page not found",
      description: "The requested page does not exist or has been moved.",
      home: "Back to home",
      dashboard: "Go to dashboard",
    },
    dashboard: {
      title: "Could not load dashboard",
      description: "Please try again or switch to overview.",
      retry: "Reload",
      overview: "Go to overview",
      errorIdPrefix: "Error ID",
    },
    employees: {
      title: "Error in employee module",
      retry: "Try again",
    },
    employeeDetail: {
      title: "Could not load employee profile",
      retry: "Reload",
    },
    employeeNotFound: {
      title: "Employee not found",
      description: "The selected profile does not exist or does not belong to your tenant.",
      backToList: "Back to employee list",
    },
  },
  api: {
    genericError: "An error occurred. Please try again.",
    forgotPasswordEmailSubject: "Security notice: password reset requested",
    forgotPasswordEmailTitle: "Password reset requested",
    forgotPasswordEmailGreeting: "Hello,",
    forgotPasswordEmailIntro: "we received a password reset request for your ZunftGewerk account.",
    forgotPasswordEmailActionHint: "If this request was made by you, open the secure link below:",
    forgotPasswordEmailResetLabel: "Reset link",
    forgotPasswordEmailSignInLabel: "Sign in",
    forgotPasswordEmailSupportLabel: "Support",
    forgotPasswordEmailIgnoreHint: "If this was not you, you can ignore this email.",
    forgotPasswordEmailSecurityBadge: "Security",
    forgotPasswordEmailHeading: "Reset password",
    forgotPasswordEmailBody: "We just received a password reset request for your account. If this request was made by you, reset your password now using the secure link.",
    forgotPasswordEmailButton: "Reset password now",
    forgotPasswordEmailFallbackHint: "If this was not you, ignore this message or contact us at",
    auth: {
      invalidBody: "Invalid request body.",
      invalidEmail: "Please enter a valid email address.",
      invalidPassword: "Please enter a valid password.",
      resetTokenInvalid: "Reset link is invalid or has expired.",
      resetUnavailable: "Password reset is currently unavailable.",
      credentialsRequired: "Email and password are required.",
      invalidCredentials: "Email or password is invalid.",
      tokenResponseIncomplete: "Token response is incomplete.",
      loginRateLimited: "Too many sign-in attempts. Please wait briefly.",
      loginAuthServiceUnavailable:
        "Sign-in is temporarily unavailable. Please try again later.",
      loginCsrfInvalid: "Security check failed. Please reload the page.",
      bffSessionInvalid: "Session is invalid or expired. Please sign in again.",
      loginRedirectInvalid: "Invalid redirect.",
      loginNativeIncomplete:
        "App sign-in requires redirect_uri, state, and code_challenge.",
      tokenOtcInvalid: "Code is invalid or expired.",
      tokenPkceInvalid: "PKCE verification failed.",
      tokenRedirectMismatch: "redirect_uri does not match.",
    },
    emailVerification: {
      signupSubject: "Please confirm your email — ZunftGewerk",
      signupBody:
        "Hello {firstName},\n\nplease confirm your email address for your ZunftGewerk account by opening this link:\n\n{link}\n\nIf you did not register, you can ignore this message.",
      signupHtmlKicker: "Account",
      signupHtmlHeading: "Confirm your email",
      signupHtmlGreeting: "Hello {firstName},",
      signupHtmlIntro:
        "Please confirm your email address for your ZunftGewerk account. Click the button below to complete your registration.",
      signupHtmlButton: "Confirm email address",
      signupHtmlLinkFallback:
        "If the button does not work, copy this link into your browser's address bar:",
      signupHtmlFooter: "If you did not register, you can ignore this message.",
      signupHtmlImprintHeading: "Legal notice",
      signupHtmlImprintLines:
        "ZunftGewerk KG\nHaus der Demokratie und Menschenrechte\nGreifswalder Strasse 4\n10405 Berlin\nGermany",
      signupHtmlImprintLinkLabel: "Full imprint",
      signupHtmlLogoAlt: "ZunftGewerk",
      bannerOk: "Email address confirmed. Thank you!",
      bannerInvalid: "Confirmation link is invalid or has expired.",
      bannerConfig: "Confirmation is currently unavailable. Please try again later.",
    },
    onboarding: {
      registrationRestricted: "Registration is only allowed via the onboarding form.",
      invalidRegistrationData: "Invalid registration data.",
      registrationUnavailable: "Registration is currently unavailable.",
      registrationFailed: "Registration could not be completed.",
      registrationAutoSigninFailed:
        "Registration succeeded, but automatic sign-in failed.",
      emailAlreadyExists: "This email is already registered.",
      completionRestricted: "Completion is only allowed via the onboarding form.",
      sessionMissing: "Session not found.",
      invalidBillingData: "Invalid billing data.",
      stripeConfigInvalid: "Stripe is not configured correctly.",
      setupIntentLoadFailed: "Could not load Stripe SetupIntent.",
      paymentMethodNotConfirmed: "Payment method is not confirmed yet.",
      stripeDataIncomplete: "Stripe data is incomplete.",
      subscriptionsCheckFailed: "Could not check existing subscriptions.",
      subscriptionCreateFailed: "Could not create subscription.",
    },
    health: {
      replayGuidance:
        "Replay protection is active but not cluster-safe. Set AUTH_PASSWORD_RESET_REDIS_URL for production.",
    },
  },
  navUser: {
    profileFromSession: "Profile from session",
    authProtected: "Authenticated (OIDC)",
    oidcSession: "Secure token session",
    logout: "Sign out",
    loggingOut: "Signing out…",
  },
  webShell: {
    desktopDownload: {
      title: "Desktop app",
      description:
        "Installable app for Windows, macOS, and Linux. OS and CPU architecture are detected in the browser (not a full hardware inventory).",
      cta: "Download desktop app",
      detectedPrefix: "Detected:",
      osLabels: {
        windows: "Windows",
        macos: "macOS",
        linux: "Linux",
        unknown: "Unknown",
      },
      archLabels: {
        arm64: "arm64",
        x64: "x64",
        unknown: "Unknown architecture",
      },
      otherDownloads: "Other platforms",
      configMissing:
        "Download links are not configured yet. Set NEXT_PUBLIC_DESKTOP_DOWNLOADS_JSON.",
      inElectron: "You are already using the desktop app.",
    },
  },
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function mergeDeep<T>(base: T, overrides: DeepPartial<T>): T {
  if (Array.isArray(base)) {
    return (Array.isArray(overrides) && overrides.length > 0 ? overrides : base) as T
  }

  if (isRecord(base) && isRecord(overrides)) {
    const result: Record<string, unknown> = { ...base }
    const overrideRecord = overrides as Record<string, unknown>

    for (const key of Object.keys(overrideRecord)) {
      const baseValue = result[key]
      const overrideValue = overrideRecord[key]
      if (overrideValue === undefined) continue

      if (Array.isArray(baseValue) && Array.isArray(overrideValue)) {
        result[key] = overrideValue.length > 0 ? overrideValue : baseValue
        continue
      }

      if (isRecord(baseValue) && isRecord(overrideValue)) {
        result[key] = mergeDeep(baseValue, overrideValue)
        continue
      }

      result[key] = overrideValue
    }
    return result as T
  }

  return (overrides as T) ?? base
}

const uiTextEn = mergeDeep(uiTextDe, uiTextEnOverrides)

export type UiText = typeof uiTextDe

export function getUiText(locale: Locale): UiText {
  return locale === "en" ? uiTextEn : uiTextDe
}

export function getRuntimeLocale(): Locale {
  if (typeof document === "undefined") return "de"
  return normalizeLocale(document.documentElement.lang) ?? "de"
}

function createRuntimeUiTextProxy(path: PropertyKey[] = []): unknown {
  return new Proxy(
    {},
    {
      get(_target, property) {
        const currentValue = path.reduce<unknown>(
          (acc, key) => (acc as Record<PropertyKey, unknown> | undefined)?.[key],
          getUiText(getRuntimeLocale()) as unknown
        ) as Record<PropertyKey, unknown> | undefined

        const nextValue = currentValue?.[property]

        if (typeof nextValue === "function") {
          return nextValue.bind(currentValue)
        }

        if (nextValue !== null && typeof nextValue === "object") {
          return createRuntimeUiTextProxy([...path, property])
        }

        return nextValue
      },
      ownKeys() {
        const currentValue = path.reduce<unknown>(
          (acc, key) => (acc as Record<PropertyKey, unknown> | undefined)?.[key],
          getUiText(getRuntimeLocale()) as unknown
        ) as Record<PropertyKey, unknown> | undefined
        return Reflect.ownKeys(currentValue ?? {})
      },
      getOwnPropertyDescriptor() {
        return { enumerable: true, configurable: true }
      },
    }
  )
}

export const uiText = createRuntimeUiTextProxy() as UiText
