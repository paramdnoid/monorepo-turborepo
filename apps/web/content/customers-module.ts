import type { Locale } from "@/lib/i18n/locale";

/** Icons aus `TradeFeatureIcon` / `iconMap` (apps/web/components/marketing/trades/trade-feature-icon.tsx). */
export type CustomersNavIconName = "Users" | "MapPin";

export type CustomersNavItem = {
  href: string;
  label: string;
  tooltip: string;
  icon: CustomersNavIconName;
};

export type CustomersSidebarCopy = {
  groupLabel: string;
  items: CustomersNavItem[];
};

export type CustomersPageKind = "list" | "addresses" | "detail";

type HeaderPair = { title: string; subtitle: string };

type CustomersCopy = {
  sidebar: CustomersSidebarCopy;
  headers: Record<
    CustomersPageKind,
    HeaderPair
  >;
  list: {
    searchPlaceholder: string;
    search: string;
    includeArchived: string;
    newCustomer: string;
    empty: string;
    loadError: string;
    tableName: string;
    tableCity: string;
    tableNumber: string;
    tableCategory: string;
    archived: string;
    open: string;
    cancel: string;
    create: string;
    billingAddressOptional: string;
    searchAutoHint: string;
    paginationPrev: string;
    paginationNext: string;
    paginationTemplate: string;
    tableActions: string;
    exportCsv: string;
    exportBusy: string;
    exportError: string;
    exportReady: string;
    selectAllOnPage: string;
    selectRow: string;
    selectedCount: string;
    batchArchive: string;
    batchUnarchive: string;
    batchCategoryLabel: string;
    batchCategoryPlaceholder: string;
    batchSetCategory: string;
    batchClearCategory: string;
    batchBusy: string;
    batchError: string;
    batchForbidden: string;
    batchUpdated: string;
    batchNoop: string;
  };
  addressesList: {
    searchPlaceholder: string;
    search: string;
    includeArchived: string;
    empty: string;
    loadError: string;
    tableCustomer: string;
    tableKind: string;
    tableCity: string;
    tableStreet: string;
    openCustomer: string;
    searchAutoHint: string;
    paginationPrev: string;
    paginationNext: string;
    paginationTemplate: string;
    tableActions: string;
  };
  detail: {
    back: string;
    save: string;
    saving: string;
    saved: string;
    loadError: string;
    notFound: string;
    displayName: string;
    customerNumber: string;
    vatId: string;
    taxNumber: string;
    notes: string;
    paymentTermsDays: string;
    cashDiscountPercent: string;
    cashDiscountDays: string;
    reminderLevel1DaysAfterDue: string;
    reminderLevel2DaysAfterDue: string;
    reminderLevel3DaysAfterDue: string;
    archive: string;
    unarchive: string;
    addressesHeading: string;
    addAddress: string;
    addingAddress: string;
    addressKind: string;
    addressLabel: string;
    recipientName: string;
    addressLine2: string;
    street: string;
    postalCode: string;
    city: string;
    country: string;
    defaultForKind: string;
    deleteAddress: string;
    saveAddress: string;
    newAddressTitle: string;
    validation: string;
    conflictNumber: string;
    edit: string;
    cancel: string;
    addressesSectionIntro: string;
    addressesEmptyHint: string;
    masterDialogTitle: string;
    masterDialogDescription: string;
    newAddressDialogDescription: string;
    addressDialogEditTitle: string;
    addressDialogEditDescription: string;
    deleteAddressConfirmTitle: string;
    deleteAddressConfirmDescription: string;
    deleteAddressConfirm: string;
  };
  kinds: {
    billing: string;
    shipping: string;
    site: string;
    other: string;
  };
  geocode: {
    lookupLabel: string;
    lookupHint: string;
    lookupButton: string;
    applyFirst: string;
    noneFound: string;
    failed: string;
    standardBadge: string;
    queryPlaceholder: string;
    suggestionsHeading: string;
    applyThis: string;
    notConfiguredHint: string;
    locateTitle: string;
    autoFilledHint: string;
    locateUnsupported: string;
    locateDenied: string;
    locateUnavailable: string;
    locateTimeout: string;
    locateFailed: string;
  };
  overview: {
    stampTitle: string;
    stampSubtitle: string;
    customersLink: string;
    salesLink: string;
  };
};

const de: CustomersCopy = {
  sidebar: {
    groupLabel: "Stammdaten",
    items: [
      {
        href: "/web/customers/list",
        label: "Kunden",
        tooltip: "Kundenstamm",
        icon: "Users",
      },
      {
        href: "/web/customers/addresses",
        label: "Adressen",
        tooltip: "Alle Adressen",
        icon: "MapPin",
      },
    ],
  },
  headers: {
    list: {
      title: "Kunden",
      subtitle: "Stammdaten fuer Belege und Projekte",
    },
    addresses: {
      title: "Adressen",
      subtitle: "Rechnungs-, Liefer- und Objektadressen im Ueberblick",
    },
    detail: {
      title: "Kunde",
      subtitle: "Stammdaten und Adressen bearbeiten",
    },
  },
  list: {
    searchPlaceholder: "Suche Name, Kundennummer …",
    search: "Suchen",
    includeArchived: "Archivierte anzeigen",
    newCustomer: "Neuer Kunde",
    empty: "Noch keine Kunden angelegt.",
    loadError: "Kunden konnten nicht geladen werden.",
    tableName: "Name",
    tableCity: "Ort",
    tableNumber: "Nr.",
    tableCategory: "Kategorie",
    archived: "archiviert",
    open: "Oeffnen",
    cancel: "Abbrechen",
    create: "Anlegen",
    billingAddressOptional: "optional",
    searchAutoHint: "Die Suche startet kurz nach der Eingabe.",
    paginationPrev: "Zurueck",
    paginationNext: "Weiter",
    paginationTemplate: "{from}–{to} von {total}",
    tableActions: "Aktionen",
    exportCsv: "CSV exportieren",
    exportBusy: "Export laeuft…",
    exportError: "CSV-Export fehlgeschlagen.",
    exportReady: "CSV-Export bereit.",
    selectAllOnPage: "Alle auf Seite auswaehlen",
    selectRow: "Zeile auswaehlen",
    selectedCount: "{n} ausgewaehlt",
    batchArchive: "Archivieren",
    batchUnarchive: "Wiederherstellen",
    batchCategoryLabel: "Kategorie",
    batchCategoryPlaceholder: "z. B. A-Kunde",
    batchSetCategory: "Kategorie setzen",
    batchClearCategory: "Kategorie leeren",
    batchBusy: "Batch laeuft…",
    batchError: "Batch-Aktion fehlgeschlagen.",
    batchForbidden: "Keine Berechtigung fuer Batch-Aktionen.",
    batchUpdated: "{n} Kunden aktualisiert.",
    batchNoop: "Keine Kunden aktualisiert.",
  },
  addressesList: {
    searchPlaceholder: "Suche Kunde, Strasse, Ort, PLZ …",
    search: "Suchen",
    includeArchived: "Archivierte Kunden einbeziehen",
    empty: "Keine Adressen gefunden.",
    loadError: "Adressen konnten nicht geladen werden.",
    tableCustomer: "Kunde",
    tableKind: "Art",
    tableCity: "Ort",
    tableStreet: "Strasse",
    openCustomer: "Kunde oeffnen",
    searchAutoHint: "Die Suche startet kurz nach der Eingabe.",
    paginationPrev: "Zurueck",
    paginationNext: "Weiter",
    paginationTemplate: "{from}–{to} von {total}",
    tableActions: "Aktionen",
  },
  detail: {
    back: "Zur Liste",
    save: "Speichern",
    saving: "Speichern…",
    saved: "Gespeichert.",
    loadError: "Kunde konnte nicht geladen werden.",
    notFound: "Kunde nicht gefunden.",
    displayName: "Anzeigename / Firma",
    customerNumber: "Kundennummer",
    vatId: "USt-IdNr.",
    taxNumber: "Steuernummer",
    notes: "Notizen",
    paymentTermsDays: "Zahlungsziel (Tage)",
    cashDiscountPercent: "Skonto (%)",
    cashDiscountDays: "Skonto (Tage)",
    reminderLevel1DaysAfterDue: "Mahnung Stufe 1 (Tage nach Faelligkeit)",
    reminderLevel2DaysAfterDue: "Mahnung Stufe 2 (Tage nach Faelligkeit)",
    reminderLevel3DaysAfterDue: "Mahnung Stufe 3 (Tage nach Faelligkeit)",
    archive: "Archivieren",
    unarchive: "Wiederherstellen",
    addressesHeading: "Adressen",
    addAddress: "Adresse hinzufuegen",
    addingAddress: "Adresse wird hinzugefuegt…",
    addressKind: "Art",
    addressLabel: "Bezeichnung (optional)",
    recipientName: "Empfaenger",
    addressLine2: "Adresszeile 2",
    street: "Strasse",
    postalCode: "PLZ",
    city: "Ort",
    country: "Land (ISO)",
    defaultForKind: "Standard fuer diese Art",
    deleteAddress: "Loeschen",
    saveAddress: "Adresse speichern",
    newAddressTitle: "Neue Adresse",
    validation: "Bitte alle Pflichtfelder ausfuellen.",
    conflictNumber: "Kundennummer bereits vergeben.",
    edit: "Bearbeiten",
    cancel: "Abbrechen",
    addressesSectionIntro:
      "Rechnungs-, Liefer- und Objektadressen. Uebernehmen Sie Suchtreffer oder pflegen Sie Daten manuell.",
    addressesEmptyHint:
      "Noch keine Adresse hinterlegt. Legen Sie mindestens eine Rechnungsadresse an.",
    masterDialogTitle: "Kundendaten bearbeiten",
    masterDialogDescription:
      "Name, Nummern und Notizen. Aenderungen gelten fuer alle Gewerke.",
    newAddressDialogDescription:
      "Adresse suchen oder manuell eintragen. Pflichtfelder sind vollstaendig auszufuellen.",
    addressDialogEditTitle: "Adresse bearbeiten",
    addressDialogEditDescription:
      "Aenderungen wirken sich auf neue Belege und Vorkommnisse aus.",
    deleteAddressConfirmTitle: "Adresse loeschen?",
    deleteAddressConfirmDescription:
      "Die Adresse wird dauerhaft entfernt. Diese Aktion kann nicht rueckgaengig gemacht werden.",
    deleteAddressConfirm: "Loeschen",
  },
  kinds: {
    billing: "Rechnung",
    shipping: "Lieferung",
    site: "Baustelle / Objekt",
    other: "Sonstige",
  },
  geocode: {
    lookupLabel: "Adresse suchen (Geocoding)",
    lookupHint:
      "Suchbegriff eingeben (z. B. Strasse und Ort), dann Vorschlag uebernehmen.",
    lookupButton: "Vorschlaege suchen",
    applyFirst: "Ersten Vorschlag uebernehmen",
    noneFound: "Keine Treffer.",
    failed: "Suche fehlgeschlagen.",
    standardBadge: "Standard",
    queryPlaceholder: "Strasse, Ort …",
    suggestionsHeading: "Treffer",
    applyThis: "Uebernehmen",
    notConfiguredHint:
      "Adresssuche ist nicht konfiguriert. Felder koennen manuell befuellt werden.",
    locateTitle: "GPS-Standort ermitteln",
    autoFilledHint: "Automatisch ermittelt – bitte pruefen und ggf. korrigieren.",
    locateUnsupported: "Ihr Browser unterstuetzt keine GPS-Ortung.",
    locateDenied:
      "GPS-Zugriff wurde verweigert. Bitte aktivieren Sie die Standortfreigabe in Ihren Browser-Einstellungen.",
    locateUnavailable:
      "Position nicht verfuegbar. Standortdienste sind moeglicherweise deaktiviert.",
    locateTimeout:
      "Zeitueberschreitung bei der Standortermittlung. Bitte versuchen Sie es erneut.",
    locateFailed: "Standort konnte nicht ermittelt werden.",
  },
  overview: {
    stampTitle: "Stammdaten",
    stampSubtitle: "Fuer alle Gewerke: Kunden und Adressen verwalten.",
    customersLink: "Kunden & Adressen",
    salesLink: "Angebote & Rechnungen",
  },
};

const en: CustomersCopy = {
  sidebar: {
    groupLabel: "Master data",
    items: [
      {
        href: "/web/customers/list",
        label: "Customers",
        tooltip: "Customer master",
        icon: "Users",
      },
      {
        href: "/web/customers/addresses",
        label: "Addresses",
        tooltip: "All addresses",
        icon: "MapPin",
      },
    ],
  },
  headers: {
    list: {
      title: "Customers",
      subtitle: "Master data for documents and projects",
    },
    addresses: {
      title: "Addresses",
      subtitle: "Billing, delivery, and site addresses at a glance",
    },
    detail: {
      title: "Customer",
      subtitle: "Edit master data and addresses",
    },
  },
  list: {
    searchPlaceholder: "Search name, customer no. …",
    search: "Search",
    includeArchived: "Show archived",
    newCustomer: "New customer",
    empty: "No customers yet.",
    loadError: "Could not load customers.",
    tableName: "Name",
    tableCity: "City",
    tableNumber: "No.",
    tableCategory: "Category",
    archived: "archived",
    open: "Open",
    cancel: "Cancel",
    create: "Create",
    billingAddressOptional: "optional",
    searchAutoHint: "Search runs shortly after you stop typing.",
    paginationPrev: "Previous",
    paginationNext: "Next",
    paginationTemplate: "{from}–{to} of {total}",
    tableActions: "Actions",
    exportCsv: "Export CSV",
    exportBusy: "Exporting…",
    exportError: "CSV export failed.",
    exportReady: "CSV export ready.",
    selectAllOnPage: "Select all on page",
    selectRow: "Select row",
    selectedCount: "{n} selected",
    batchArchive: "Archive",
    batchUnarchive: "Restore",
    batchCategoryLabel: "Category",
    batchCategoryPlaceholder: "e.g. Key account",
    batchSetCategory: "Set category",
    batchClearCategory: "Clear category",
    batchBusy: "Running batch…",
    batchError: "Batch action failed.",
    batchForbidden: "No permission for batch actions.",
    batchUpdated: "{n} customers updated.",
    batchNoop: "No customers were updated.",
  },
  addressesList: {
    searchPlaceholder: "Search customer, street, city, postal code …",
    search: "Search",
    includeArchived: "Include archived customers",
    empty: "No addresses found.",
    loadError: "Could not load addresses.",
    tableCustomer: "Customer",
    tableKind: "Type",
    tableCity: "City",
    tableStreet: "Street",
    openCustomer: "Open customer",
    searchAutoHint: "Search runs shortly after you stop typing.",
    paginationPrev: "Previous",
    paginationNext: "Next",
    paginationTemplate: "{from}–{to} of {total}",
    tableActions: "Actions",
  },
  detail: {
    back: "Back to list",
    save: "Save",
    saving: "Saving…",
    saved: "Saved.",
    loadError: "Could not load customer.",
    notFound: "Customer not found.",
    displayName: "Display name / company",
    customerNumber: "Customer number",
    vatId: "VAT ID",
    taxNumber: "Tax number",
    notes: "Notes",
    paymentTermsDays: "Payment terms (days)",
    cashDiscountPercent: "Cash discount (%)",
    cashDiscountDays: "Cash discount (days)",
    reminderLevel1DaysAfterDue: "Reminder level 1 (days after due)",
    reminderLevel2DaysAfterDue: "Reminder level 2 (days after due)",
    reminderLevel3DaysAfterDue: "Reminder level 3 (days after due)",
    archive: "Archive",
    unarchive: "Restore",
    addressesHeading: "Addresses",
    addAddress: "Add address",
    addingAddress: "Adding address…",
    addressKind: "Type",
    addressLabel: "Label (optional)",
    recipientName: "Recipient",
    addressLine2: "Address line 2",
    street: "Street",
    postalCode: "Postal code",
    city: "City",
    country: "Country (ISO)",
    defaultForKind: "Default for this type",
    deleteAddress: "Delete",
    saveAddress: "Save address",
    newAddressTitle: "New address",
    validation: "Please fill required fields.",
    conflictNumber: "Customer number already in use.",
    edit: "Edit",
    cancel: "Cancel",
    addressesSectionIntro:
      "Billing, shipping, and site addresses. Apply lookup results or enter data manually.",
    addressesEmptyHint: "No address yet. Add at least one billing address.",
    masterDialogTitle: "Edit customer details",
    masterDialogDescription:
      "Name, numbers, and notes. Changes apply across all trades.",
    newAddressDialogDescription:
      "Look up an address or type it in. Required fields must be complete.",
    addressDialogEditTitle: "Edit address",
    addressDialogEditDescription:
      "Changes affect new documents and downstream uses.",
    deleteAddressConfirmTitle: "Delete address?",
    deleteAddressConfirmDescription:
      "The address will be removed permanently. This cannot be undone.",
    deleteAddressConfirm: "Delete",
  },
  kinds: {
    billing: "Billing",
    shipping: "Shipping",
    site: "Site / object",
    other: "Other",
  },
  geocode: {
    lookupLabel: "Address lookup (geocoding)",
    lookupHint: "Enter a query (e.g. street and city), then apply a suggestion.",
    lookupButton: "Search suggestions",
    applyFirst: "Apply first suggestion",
    noneFound: "No results.",
    failed: "Lookup failed.",
    standardBadge: "Default",
    queryPlaceholder: "Street, city …",
    suggestionsHeading: "Results",
    applyThis: "Apply",
    notConfiguredHint:
      "Address lookup is not configured. You can fill in the fields manually.",
    locateTitle: "Use GPS location",
    autoFilledHint: "Filled automatically — please verify and adjust if needed.",
    locateUnsupported: "Your browser does not support geolocation.",
    locateDenied:
      "Location access was denied. Please allow location access in your browser settings.",
    locateUnavailable:
      "Location unavailable. Location services might be disabled.",
    locateTimeout: "Location lookup timed out. Please try again.",
    locateFailed: "Could not determine location.",
  },
  overview: {
    stampTitle: "Master data",
    stampSubtitle: "For all trades: manage customers and addresses.",
    customersLink: "Customers & addresses",
    salesLink: "Quotes & invoices",
  },
};

function copy(locale: Locale): CustomersCopy {
  return locale === "en" ? en : de;
}

export function getCustomersSidebarCopy(locale: Locale): CustomersSidebarCopy {
  return copy(locale).sidebar;
}

const CUSTOMER_DETAIL_UUID_RE =
  /^\/web\/customers\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getCustomersHeaderMeta(
  pathname: string,
  locale: Locale,
): HeaderPair | null {
  const c = copy(locale);
  const p = pathname.length > 1 && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;
  if (!p.startsWith("/web/customers")) {
    return null;
  }
  if (p === "/web/customers" || p === "/web/customers/list") {
    return c.headers.list;
  }
  if (p === "/web/customers/addresses") {
    return c.headers.addresses;
  }
  if (CUSTOMER_DETAIL_UUID_RE.test(p)) {
    return c.headers.detail;
  }
  return null;
}

export function getCustomersPageTitle(
  kind: CustomersPageKind,
  locale: Locale,
): string {
  return copy(locale).headers[kind].title;
}

export function getCustomersPageDescription(
  kind: CustomersPageKind,
  locale: Locale,
): string {
  return copy(locale).headers[kind].subtitle;
}

export function getCustomersListCopy(locale: Locale) {
  return copy(locale).list;
}

export function getCustomersAddressesListCopy(locale: Locale) {
  return copy(locale).addressesList;
}

export function formatCustomersAddressesPaginationRange(
  locale: Locale,
  from: number,
  to: number,
  total: number,
): string {
  return copy(locale).addressesList.paginationTemplate
    .replace("{from}", String(from))
    .replace("{to}", String(to))
    .replace("{total}", String(total));
}

/** Ersetzt `{from}`, `{to}`, `{total}` im Pagination-Template der aktiven Locale. */
export function formatCustomersPaginationRange(
  locale: Locale,
  from: number,
  to: number,
  total: number,
): string {
  return copy(locale).list.paginationTemplate
    .replace("{from}", String(from))
    .replace("{to}", String(to))
    .replace("{total}", String(total));
}

export function getCustomersDetailCopy(locale: Locale) {
  return copy(locale).detail;
}

export function getCustomersGeocodeCopy(locale: Locale) {
  return copy(locale).geocode;
}

export function getCustomersOverviewCopy(locale: Locale) {
  return copy(locale).overview;
}

/** Sidebar: aktiv fuer Kundenliste und Kundendetail (UUID), nicht fuer Adressenroute. */
export function isCustomersSidebarListActive(
  itemHref: string,
  pathname: string,
): boolean {
  if (itemHref !== "/web/customers/list") {
    return false;
  }
  if (pathname === "/web/customers" || pathname === "/web/customers/list") {
    return true;
  }
  return CUSTOMER_DETAIL_UUID_RE.test(pathname);
}

export function getCustomersKindLabel(
  locale: Locale,
  kind: string,
): string {
  const k = copy(locale).kinds;
  if (kind === "billing") {
    return k.billing;
  }
  if (kind === "shipping") {
    return k.shipping;
  }
  if (kind === "site") {
    return k.site;
  }
  return k.other;
}
