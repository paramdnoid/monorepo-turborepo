import type { Locale } from "@/lib/i18n/locale";

export type CustomersPageKind = "list" | "detail";

type HeaderPair = { title: string; subtitle: string };

type CustomersCopy = {
  sidebarGroup: string;
  navItem: string;
  navTooltip: string;
  headers: Record<CustomersPageKind, HeaderPair>;
  list: {
    searchPlaceholder: string;
    includeArchived: string;
    newCustomer: string;
    empty: string;
    loadError: string;
    tableName: string;
    tableCity: string;
    tableNumber: string;
    archived: string;
    open: string;
  };
  detail: {
    back: string;
    save: string;
    saved: string;
    loadError: string;
    notFound: string;
    displayName: string;
    customerNumber: string;
    vatId: string;
    taxNumber: string;
    notes: string;
    archive: string;
    unarchive: string;
    addressesHeading: string;
    addAddress: string;
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
  };
  kinds: {
    billing: string;
    shipping: string;
    site: string;
    other: string;
  };
};

const de: CustomersCopy = {
  sidebarGroup: "Stammdaten",
  navItem: "Kunden & Adressen",
  navTooltip: "Kundenstamm und Adressen",
  headers: {
    list: {
      title: "Kunden & Adressen",
      subtitle: "Stammdaten fuer Belege und Projekte",
    },
    detail: {
      title: "Kunde",
      subtitle: "Stammdaten und Adressen bearbeiten",
    },
  },
  list: {
    searchPlaceholder: "Suche Name, Kundennummer …",
    includeArchived: "Archivierte anzeigen",
    newCustomer: "Neuer Kunde",
    empty: "Noch keine Kunden angelegt.",
    loadError: "Kunden konnten nicht geladen werden.",
    tableName: "Name",
    tableCity: "Ort",
    tableNumber: "Nr.",
    archived: "archiviert",
    open: "Oeffnen",
  },
  detail: {
    back: "Zur Liste",
    save: "Speichern",
    saved: "Gespeichert.",
    loadError: "Kunde konnte nicht geladen werden.",
    notFound: "Kunde nicht gefunden.",
    displayName: "Anzeigename / Firma",
    customerNumber: "Kundennummer",
    vatId: "USt-IdNr.",
    taxNumber: "Steuernummer",
    notes: "Notizen",
    archive: "Archivieren",
    unarchive: "Wiederherstellen",
    addressesHeading: "Adressen",
    addAddress: "Adresse hinzufuegen",
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
  },
  kinds: {
    billing: "Rechnung",
    shipping: "Lieferung",
    site: "Baustelle / Objekt",
    other: "Sonstige",
  },
};

const en: CustomersCopy = {
  sidebarGroup: "Master data",
  navItem: "Customers & addresses",
  navTooltip: "Customer master data and addresses",
  headers: {
    list: {
      title: "Customers & addresses",
      subtitle: "Master data for documents and projects",
    },
    detail: {
      title: "Customer",
      subtitle: "Edit master data and addresses",
    },
  },
  list: {
    searchPlaceholder: "Search name, customer no. …",
    includeArchived: "Show archived",
    newCustomer: "New customer",
    empty: "No customers yet.",
    loadError: "Could not load customers.",
    tableName: "Name",
    tableCity: "City",
    tableNumber: "No.",
    archived: "archived",
    open: "Open",
  },
  detail: {
    back: "Back to list",
    save: "Save",
    saved: "Saved.",
    loadError: "Could not load customer.",
    notFound: "Customer not found.",
    displayName: "Display name / company",
    customerNumber: "Customer number",
    vatId: "VAT ID",
    taxNumber: "Tax number",
    notes: "Notes",
    archive: "Archive",
    unarchive: "Restore",
    addressesHeading: "Addresses",
    addAddress: "Add address",
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
  },
  kinds: {
    billing: "Billing",
    shipping: "Shipping",
    site: "Site / object",
    other: "Other",
  },
};

function copy(locale: Locale): CustomersCopy {
  return locale === "en" ? en : de;
}

export function getCustomersSidebarCopy(locale: Locale): {
  groupLabel: string;
  items: { href: string; label: string; tooltip: string }[];
} {
  const c = copy(locale);
  return {
    groupLabel: c.sidebarGroup,
    items: [
      {
        href: "/web/kunden",
        label: c.navItem,
        tooltip: c.navTooltip,
      },
    ],
  };
}

export function getCustomersHeaderMeta(
  pathname: string,
  locale: Locale,
): HeaderPair | null {
  const c = copy(locale);
  const p = pathname.length > 1 && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;
  if (p === "/web/kunden") {
    return c.headers.list;
  }
  if (
    /^\/web\/kunden\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      p,
    )
  ) {
    return c.headers.detail;
  }
  return null;
}

export function getCustomersListCopy(locale: Locale) {
  return copy(locale).list;
}

export function getCustomersDetailCopy(locale: Locale) {
  return copy(locale).detail;
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
