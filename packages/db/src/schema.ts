import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  time,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Mandant pro Keycloak-/Auth-Tenant.
 * `tenantId` entspricht dem externen Tenant-Identifier (z. B. Keycloak `tenant_id`).
 */
export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: text("tenant_id").notNull().unique(),
  name: text("name").notNull(),
  /** @see `@repo/api-contracts` — kaminfeger | maler | shk */
  tradeSlug: text("trade_slug").notNull(),
  /** Mehrzeilige Absenderadresse für Belege (optional). */
  senderAddress: text("sender_address"),
  /** Strukturierte Absenderadresse (Quelle der Wahrheit in Settings). */
  senderStreet: text("sender_street"),
  senderHouseNumber: text("sender_house_number"),
  senderPostalCode: text("sender_postal_code"),
  senderCity: text("sender_city"),
  /** ISO 3166-1 alpha-2 */
  senderCountry: text("sender_country"),
  senderLatitude: doublePrecision("sender_latitude"),
  senderLongitude: doublePrecision("sender_longitude"),
  vatId: text("vat_id"),
  taxNumber: text("tax_number"),
  /** Relativ zu PROJECT_ASSETS_ROOT; gemeinsam mit Projekt-Assets-Pfadlogik. */
  logoStorageRelativePath: text("logo_storage_relative_path"),
  logoContentType: text("logo_content_type"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/**
 * Mandantenparameter fuer DATEV-Export (Buchhaltung / Steuerberater).
 * Eine Zeile pro `tenant_id`; fehlende Konten muessen vor Export gesetzt sein.
 */
export const organizationDatevSettings = pgTable("organization_datev_settings", {
  tenantId: text("tenant_id")
    .primaryKey()
    .references(() => organizations.tenantId, { onDelete: "cascade" }),
  advisorNumber: text("advisor_number"),
  clientNumber: text("client_number"),
  /** Debitor / Debitoren-Sammelkonto (Soll bei einzeiliger Ausgangsrechnung). */
  defaultDebtorAccount: text("default_debtor_account"),
  /** Erlöskonto (Haben). */
  defaultRevenueAccount: text("default_revenue_account"),
  /** DATEV BU-/Steuerschluessel, z. B. leer oder „9“ fuer 19 % USt. */
  defaultVatKey: text("default_vat_key"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** Maler-Stamm: Projekt/Auftrag (Sync `entityType`: `project`). */
export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => organizations.tenantId, { onDelete: "cascade" }),
  title: text("title").notNull(),
  projectNumber: text("project_number"),
  /** planned | active | on-hold | completed */
  status: text("status").notNull().default("active"),
  customerId: uuid("customer_id").references(() => customers.id, {
    onDelete: "set null",
  }),
  siteAddressId: uuid("site_address_id").references(() => customerAddresses.id, {
    onDelete: "set null",
  }),
  customerLabel: text("customer_label"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (t) => ({
  tenantProjectNumberUnique: unique("projects_tenant_project_number").on(
    t.tenantId,
    t.projectNumber,
  ),
  tenantCustomerIdx: index("projects_tenant_customer_idx").on(
    t.tenantId,
    t.customerId,
  ),
  siteAddressIdx: index("projects_site_address_idx").on(t.siteAddressId),
}));

/** Kunde / Geschaeftspartner je Mandant (Stammdaten). */
export const customers = pgTable(
  "customers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => organizations.tenantId, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    customerNumber: text("customer_number"),
    category: text("category"),
    vatId: text("vat_id"),
    taxNumber: text("tax_number"),
    notes: text("notes"),
    /** Zahlungsziel in Tagen (Default für neue Rechnungen). */
    paymentTermsDays: integer("payment_terms_days"),
    /** Skonto in Basispunkten (2.5% => 250), optional. */
    cashDiscountPercentBps: integer("cash_discount_percent_bps"),
    /** Skonto-Frist in Tagen, optional. */
    cashDiscountDays: integer("cash_discount_days"),
    /** Mahnung Stufe 1: Tage nach `due_at` (Default-Policy pro Kunde). */
    reminderLevel1DaysAfterDue: integer("reminder_level_1_days_after_due"),
    /** Mahnung Stufe 2: Tage nach `due_at` (Default-Policy pro Kunde). */
    reminderLevel2DaysAfterDue: integer("reminder_level_2_days_after_due"),
    /** Mahnung Stufe 3: Tage nach `due_at` (Default-Policy pro Kunde). */
    reminderLevel3DaysAfterDue: integer("reminder_level_3_days_after_due"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    tenantCustomerNumber: unique("customers_tenant_customer_number").on(
      t.tenantId,
      t.customerNumber,
    ),
  }),
);

/** Adresse zu einem Kunden (Rechnung, Lieferung, Baustelle, …). */
export const customerAddresses = pgTable("customer_addresses", {
  id: uuid("id").defaultRandom().primaryKey(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  label: text("label"),
  recipientName: text("recipient_name").notNull(),
  addressLine2: text("address_line2"),
  street: text("street").notNull(),
  postalCode: text("postal_code").notNull(),
  city: text("city").notNull(),
  country: text("country").notNull().default("DE"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  geocodedAt: timestamp("geocoded_at", { withTimezone: true }),
  /** `manual` | `ors` — Freitext in DB, Validierung in API. */
  geocodeSource: text("geocode_source"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/**
 * Mitarbeiter je Mandant (Workforce / Planung).
 * Private Adresse inkl. optionaler Koordinaten — nur intern, nicht fuer Kundenbelege.
 */
export const employees = pgTable("employees", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => organizations.tenantId, { onDelete: "cascade" }),
  /** Personalnummer; eindeutig je Mandant (NULL erlaubt). */
  employeeNo: text("employee_no"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  email: text("email"),
  phone: text("phone"),
  /** ACTIVE | ONBOARDING | INACTIVE */
  status: text("status").notNull().default("ACTIVE"),
  /** FULL_TIME | PART_TIME | CONTRACTOR | APPRENTICE */
  employmentType: text("employment_type").notNull().default("FULL_TIME"),
  /** IANA timezone, z. B. Europe/Berlin */
  availabilityTimeZone: text("availability_time_zone")
    .notNull()
    .default("Europe/Berlin"),
  displayName: text("display_name").notNull(),
  roleLabel: text("role_label"),
  notes: text("notes"),
  privateAddressLabel: text("private_address_label"),
  privateAddressLine2: text("private_address_line2"),
  privateRecipientName: text("private_recipient_name"),
  privateStreet: text("private_street"),
  privatePostalCode: text("private_postal_code"),
  privateCity: text("private_city"),
  privateCountry: text("private_country"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  geocodedAt: timestamp("geocoded_at", { withTimezone: true }),
  /** `manual` | `ors` — Freitext in DB, Validierung in API. */
  geocodeSource: text("geocode_source"),
  /** Relativer Pfad unter PROJECT_ASSETS_ROOT fuer Mitarbeiter-Profilbild. */
  profileImageStorageRelativePath: text("profile_image_storage_relative_path"),
  profileImageContentType: text("profile_image_content_type"),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (t) => ({
  tenantEmployeeNo: unique("employees_tenant_employee_no").on(
    t.tenantId,
    t.employeeNo,
  ),
}));

/** Mandantenweiter Skill-Katalog fuer Mitarbeitende (frei definierbar). */
export const employeeSkillsCatalog = pgTable(
  "employee_skills_catalog",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => organizations.tenantId, { onDelete: "cascade" }),
    name: text("name").notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    tenantNameUnique: unique("employee_skills_catalog_tenant_name").on(
      t.tenantId,
      t.name,
    ),
    tenantArchivedIdx: index("employee_skills_catalog_tenant_archived_idx").on(
      t.tenantId,
      t.archivedAt,
    ),
  }),
);

/** N:M Zuordnung Mitarbeitende ↔ Skills. */
export const employeeSkillLinks = pgTable(
  "employee_skill_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => employeeSkillsCatalog.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    employeeSkillUnique: unique("employee_skill_links_employee_skill").on(
      t.employeeId,
      t.skillId,
    ),
    employeeIdx: index("employee_skill_links_employee_id_idx").on(t.employeeId),
    skillIdx: index("employee_skill_links_skill_id_idx").on(t.skillId),
  }),
);

/** Beziehungen zwischen Mitarbeitenden (z. B. Ausschluss oder Mentor/Trainee). */
export const employeeRelationships = pgTable(
  "employee_relationships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => organizations.tenantId, { onDelete: "cascade" }),
    fromEmployeeId: uuid("from_employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    toEmployeeId: uuid("to_employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    /** MUTUALLY_EXCLUSIVE | MENTOR_TRAINEE */
    kind: text("kind").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    tenantEdgeKindUnique: unique("employee_relationships_tenant_edge_kind").on(
      t.tenantId,
      t.fromEmployeeId,
      t.toEmployeeId,
      t.kind,
    ),
    fromEmployeeIdx: index("employee_relationships_from_employee_idx").on(
      t.fromEmployeeId,
    ),
    toEmployeeIdx: index("employee_relationships_to_employee_idx").on(
      t.toEmployeeId,
    ),
    tenantKindIdx: index("employee_relationships_tenant_kind_idx").on(
      t.tenantId,
      t.kind,
    ),
  }),
);

/** Datei-Anhaenge je Mitarbeitendem; Blob liegt auf dem API-Dateisystem. */
export const employeeAttachments = pgTable(
  "employee_attachments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => organizations.tenantId, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("document"),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    storageRelativePath: text("storage_relative_path").notNull(),
    sha256: text("sha256"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    employeeCreatedIdx: index("employee_attachments_employee_created_idx").on(
      t.employeeId,
      t.createdAt,
    ),
    tenantEmployeeIdx: index("employee_attachments_tenant_employee_idx").on(
      t.tenantId,
      t.employeeId,
    ),
  }),
);

/**
 * Woechentliche Verfuegbarkeit: mehrere Slots pro Tag moeglich.
 * `weekday`: 0 = Sonntag .. 6 = Samstag (wie JavaScript Date#getDay()).
 */
export const employeeAvailabilityRules = pgTable(
  "employee_availability_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    /** 0–6; 0 = Sonntag (JS-Konvention). */
    weekday: integer("weekday").notNull(),
    /** Ortszeit Mandant (ohne TZ in DB). */
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    /**
     * Wenn true, endet der Slot am Folgetag (z. B. 22:00–06:00).
     * Dann ist `end_time` typischerweise kleiner als `start_time`.
     */
    crossesMidnight: boolean("crosses_midnight").notNull().default(false),
    /** Optionaler Gültigkeitszeitraum für dieses Wochenmuster. */
    validFrom: date("valid_from"),
    validTo: date("valid_to"),
    sortIndex: integer("sort_index").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    employeeIdIdx: index("employee_availability_rules_employee_id_idx").on(
      t.employeeId,
    ),
  }),
);

/**
 * Einmalige Verfügbarkeits-Ausnahmen pro Datum (Overrides).
 * - `isUnavailable=true`: ganzer Tag nicht verfügbar
 * - `isUnavailable=false`: expliziter Zeit-Slot (optional über Mitternacht)
 */
export const employeeAvailabilityOverrides = pgTable(
  "employee_availability_overrides",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    isUnavailable: boolean("is_unavailable").notNull().default(false),
    startTime: time("start_time"),
    endTime: time("end_time"),
    crossesMidnight: boolean("crosses_midnight").notNull().default(false),
    sortIndex: integer("sort_index").notNull().default(0),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    employeeIdIdx: index("employee_availability_overrides_employee_id_idx").on(
      t.employeeId,
    ),
    employeeDateIdx: index("employee_availability_overrides_employee_date_idx").on(
      t.employeeId,
      t.date,
      t.sortIndex,
    ),
  }),
);

/** Urlaubsantraege je Mitarbeitendem. */
export const employeeVacationRequests = pgTable(
  "employee_vacation_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => organizations.tenantId, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    fromDate: date("from_date").notNull(),
    toDate: date("to_date").notNull(),
    reason: text("reason"),
    /** pending | approved | rejected */
    status: text("status").notNull().default("pending"),
    decisionNote: text("decision_note"),
    decidedBy: text("decided_by"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    employeeIdIdx: index("employee_vacation_requests_employee_id_idx").on(
      t.employeeId,
    ),
    tenantStatusFromIdx: index("employee_vacation_requests_tenant_status_from_idx").on(
      t.tenantId,
      t.status,
      t.fromDate,
    ),
  }),
);

/** Krankmeldungen je Mitarbeitendem (vertrauliche Notiz optional). */
export const employeeSickReports = pgTable(
  "employee_sick_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => organizations.tenantId, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    fromDate: date("from_date").notNull(),
    toDate: date("to_date").notNull(),
    confidentialNote: text("confidential_note"),
    certificateRequired: boolean("certificate_required").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    employeeIdIdx: index("employee_sick_reports_employee_id_idx").on(t.employeeId),
    tenantFromIdx: index("employee_sick_reports_tenant_from_idx").on(
      t.tenantId,
      t.fromDate,
    ),
  }),
);

/**
 * Geplante Einsaetze im Scheduling (persistiert je Mandant).
 * `reminderMinutesBefore`: optionale Vorlaufzeit fuer Kalender-Erinnerungen.
 */
export const schedulingAssignments = pgTable(
  "scheduling_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => organizations.tenantId, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    startTime: time("start_time").notNull(),
    plannedDurationMinutes: integer("planned_duration_minutes").notNull().default(60),
    windowStartTime: time("window_start_time"),
    windowEndTime: time("window_end_time"),
    title: text("title").notNull(),
    place: text("place"),
    /** Strukturierter Ort (Geocode); ergänzt `place` für Karte/Routing. */
    placeStreet: text("place_street"),
    placeHouseNumber: text("place_house_number"),
    placePostalCode: text("place_postal_code"),
    placeCity: text("place_city"),
    /** ISO 3166-1 alpha-2 */
    placeCountry: text("place_country"),
    placeLatitude: doublePrecision("place_latitude"),
    placeLongitude: doublePrecision("place_longitude"),
    reminderMinutesBefore: integer("reminder_minutes_before"),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    addressId: uuid("address_id").references(() => customerAddresses.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    tenantDateStartIdx: index("scheduling_assignments_tenant_date_start_idx").on(
      t.tenantId,
      t.date,
      t.startTime,
    ),
    employeeDateStartIdx: index(
      "scheduling_assignments_employee_date_start_idx",
    ).on(t.employeeId, t.date, t.startTime),
    tenantProjectIdx: index("scheduling_assignments_tenant_project_idx").on(
      t.tenantId,
      t.projectId,
    ),
  }),
);

/**
 * Erfasste Arbeitszeiten (Ist-Stunden) je Mandant, mit optionalem Projektbezug.
 */
export const workTimeEntries = pgTable(
  "work_time_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => organizations.tenantId, { onDelete: "cascade" }),
    employeeId: uuid("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    workDate: date("work_date").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    tenantWorkDateIdx: index("work_time_entries_tenant_work_date_idx").on(
      t.tenantId,
      t.workDate,
    ),
    tenantEmployeeIdx: index("work_time_entries_tenant_employee_idx").on(
      t.tenantId,
      t.employeeId,
    ),
    tenantProjectIdx: index("work_time_entries_tenant_project_idx").on(
      t.tenantId,
      t.projectId,
    ),
  }),
);

/**
 * Audit-/Aktivitaetsereignisse je Mitarbeitendem (ohne vertrauliche Krank-Notizen im JSON).
 * `employee_id` wird bei Loeschen des Mitarbeitenden auf NULL gesetzt (Events bleiben fuer den Mandanten).
 */
export const employeeActivityEvents = pgTable(
  "employee_activity_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => organizations.tenantId, { onDelete: "cascade" }),
    employeeId: uuid("employee_id").references(() => employees.id, {
      onDelete: "set null",
    }),
    actorSub: text("actor_sub").notNull(),
    action: text("action").notNull(),
    detail: jsonb("detail").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    employeeCreatedIdx: index("employee_activity_events_employee_created_idx").on(
      t.employeeId,
      t.createdAt,
    ),
    tenantCreatedIdx: index("employee_activity_events_tenant_created_idx").on(
      t.tenantId,
      t.createdAt,
    ),
  }),
);

/**
 * Dateien der digitalen Projektmappe (Metadaten); Blob liegt auf dem API-Dateisystem.
 * `kind`: z. B. plan | photo | document | other
 */
export const projectAssets = pgTable("project_assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => organizations.tenantId, { onDelete: "cascade" }),
  projectId: uuid("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  filename: text("filename").notNull(),
  contentType: text("content_type").notNull(),
  byteSize: integer("byte_size").notNull(),
  storageRelativePath: text("storage_relative_path").notNull(),
  sha256: text("sha256"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** GAEB / LV Import je Mandant (Ausschreibung, Teilmenge DA XML). */
export const lvDocuments = pgTable("lv_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => organizations.tenantId, { onDelete: "cascade" }),
  projectId: uuid("project_id").references(() => projects.id, {
    onDelete: "set null",
  }),
  filename: text("filename").notNull(),
  /** z. B. da_xml | unknown */
  sourceFormat: text("source_format").notNull(),
  fileSha256: text("file_sha256").notNull(),
  /** pending_review | failed | approved */
  status: text("status").notNull(),
  rawText: text("raw_text").notNull(),
  parseErrors: jsonb("parse_errors").$type<{ code: string; message: string }[]>(),
  warnings: jsonb("warnings").$type<{ code: string; message: string }[]>(),
  /** OZ/Sortierschluessel zum UI-Abgleich (Snapshot letzter erfolgreicher Parse). */
  outlineSnapshot: jsonb("outline_snapshot").$type<string[]>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  /** DSGVO: Vorgabe-Aufbewahrung (Application Layer kann purge Task nutzen). */
  purgeAfterAt: timestamp("purge_after_at", { withTimezone: true }).notNull(),
});

export const lvNodes = pgTable("lv_nodes", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => lvDocuments.id, { onDelete: "cascade" }),
  parentId: uuid("parent_id").references((): AnyPgColumn => lvNodes.id, {
    onDelete: "cascade",
  }),
  sortIndex: integer("sort_index").notNull(),
  /** section | item */
  nodeType: text("node_type").notNull(),
  outlineNumber: text("outline_number"),
  shortText: text("short_text"),
  longText: text("long_text"),
  quantity: text("quantity"),
  unit: text("unit"),
});

/**
 * Idempotente Sync-Mutationen (Offline → Server).
 * Pro (tenant_id, idempotency_key) höchstens eine Zeile.
 */
export const syncMutationReceipts = pgTable(
  "sync_mutation_receipts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => organizations.tenantId, { onDelete: "cascade" }),
    idempotencyKey: uuid("idempotency_key").notNull(),
    deviceId: uuid("device_id").notNull(),
    entityType: text("entity_type").notNull(),
    operation: text("operation").notNull(),
    payload: jsonb("payload").notNull().$type<Record<string, unknown>>(),
    /** z. B. `projects.id` bei create/update */
    resultEntityId: uuid("result_entity_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    tenantIdempotencyUnique: unique(
      "sync_mutation_receipts_tenant_idempotency",
    ).on(t.tenantId, t.idempotencyKey),
  }),
);

/**
 * Letzte Anmeldung Web vs. App (Keycloak `sub`) — gegenseitige Invalidierung
 * (Web-Session-Cookie vs. Desktop-App-Session), siehe apps/web `peer-session` API.
 */
export const authPeerSessions = pgTable("auth_peer_sessions", {
  userSub: text("user_sub").primaryKey(),
  lastWebLoginAt: timestamp("last_web_login_at", { withTimezone: true }),
  lastAppLoginAt: timestamp("last_app_login_at", { withTimezone: true }),
});

/**
 * Persistente Benachrichtigungseinstellungen je Nutzer und Mandant.
 * Der Nutzer wird über den Keycloak `sub` (auth.sub) identifiziert.
 */
export const userNotificationPreferences = pgTable(
  "user_notification_preferences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => organizations.tenantId, { onDelete: "cascade" }),
    userSub: text("user_sub").notNull(),
    productUpdates: boolean("product_updates").notNull().default(true),
    securityAlerts: boolean("security_alerts").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    tenantUserUnique: unique("user_notification_preferences_tenant_user").on(
      t.tenantId,
      t.userSub,
    ),
  }),
);

type StoredColorRefRow = {
  system: "ral" | "ncs";
  id: string;
};

/**
 * Persistente Farb-Palette pro Nutzer und Mandant.
 * Enthält Favoriten und zuletzt verwendete Farben für geräteübergreifende Nutzung.
 */
export const userColorPreferences = pgTable(
  "user_color_preferences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => organizations.tenantId, { onDelete: "cascade" }),
    userSub: text("user_sub").notNull(),
    favorites: jsonb("favorites")
      .$type<StoredColorRefRow[]>()
      .notNull()
      .default([]),
    recent: jsonb("recent")
      .$type<StoredColorRefRow[]>()
      .notNull()
      .default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    tenantUserUnique: unique("user_color_preferences_tenant_user").on(
      t.tenantId,
      t.userSub,
    ),
  }),
);

/**
 * Gemeinsame Team-Palette je Mandant.
 * Kann von berechtigten Rollen gepflegt und von allen Mandantenmitgliedern gelesen werden.
 */
export const teamColorPalettes = pgTable("team_color_palettes", {
  tenantId: text("tenant_id")
    .primaryKey()
    .references(() => organizations.tenantId, { onDelete: "cascade" }),
  favorites: jsonb("favorites")
    .$type<StoredColorRefRow[]>()
    .notNull()
    .default([]),
  recent: jsonb("recent")
    .$type<StoredColorRefRow[]>()
    .notNull()
    .default([]),
  updatedBySub: text("updated_by_sub"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** Lieferant / Katalogquelle je Mandant (DATANORM, BMEcat/IDS-Datei). */
export const catalogSuppliers = pgTable("catalog_suppliers", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => organizations.tenantId, { onDelete: "cascade" }),
  name: text("name").notNull(),
  /** z. B. datanorm | bmecat */
  sourceKind: text("source_kind").notNull(),
  meta: jsonb("meta").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** IDS-Connect-Warenkorb-Entwurf je Mandant (Proxy zu externem Shop; Snapshot fuer UI/Retry). */
export const idsConnectCarts = pgTable(
  "ids_connect_carts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => organizations.tenantId, { onDelete: "cascade" }),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => catalogSuppliers.id, { onDelete: "cascade" }),
    externalCartId: text("external_cart_id"),
    /** draft | submitted | error */
    status: text("status").notNull().default("draft"),
    snapshot: jsonb("snapshot")
      .$type<{
        lines: Array<{
          externalId: string;
          sku: string;
          name: string | null;
          quantity: string;
          unit: string | null;
          unitPrice: string;
          currency: string;
        }>;
      }>()
      .notNull()
      .default({ lines: [] }),
    purgeAfterAt: timestamp("purge_after_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    tenantIdx: index("ids_connect_carts_tenant_id_idx").on(t.tenantId),
    supplierIdx: index("ids_connect_carts_supplier_id_idx").on(t.supplierId),
    purgeIdx: index("ids_connect_carts_purge_after_at_idx").on(t.purgeAfterAt),
  }),
);

/**
 * Hochgeladener Katalogimport je Mandant (DATANORM-Paket oder BMEcat-XML).
 * Flow wie GAEB: pending_review → approved; Rohdaten werden nicht dauerhaft gespeichert.
 */
export const catalogImportBatches = pgTable("catalog_import_batches", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => organizations.tenantId, { onDelete: "cascade" }),
  supplierId: uuid("supplier_id").references(() => catalogSuppliers.id, {
    onDelete: "set null",
  }),
  filename: text("filename").notNull(),
  /** datanorm | bmecat */
  sourceFormat: text("source_format").notNull(),
  fileSha256: text("file_sha256").notNull(),
  /** pending_review | failed | approved */
  status: text("status").notNull(),
  parseErrors: jsonb("parse_errors").$type<{ code: string; message: string }[]>(),
  warnings: jsonb("warnings").$type<{ code: string; message: string }[]>(),
  articleCount: integer("article_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  purgeAfterAt: timestamp("purge_after_at", { withTimezone: true }).notNull(),
});

/** Zeilen-Snapshot eines Imports zur UI-Preview (und Quelle beim Freigeben). */
export const catalogImportLines = pgTable("catalog_import_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  batchId: uuid("batch_id")
    .notNull()
    .references(() => catalogImportBatches.id, { onDelete: "cascade" }),
  sortIndex: integer("sort_index").notNull(),
  supplierSku: text("supplier_sku").notNull(),
  name: text("name"),
  unit: text("unit"),
  /** Dezimalstring, z. B. "12.50" */
  price: text("price").notNull(),
  currency: text("currency").notNull().default("EUR"),
  ean: text("ean"),
  groupKey: text("group_key"),
});

/** Freigegebener Artikelstamm je Mandant/Lieferant. */
export const catalogArticles = pgTable(
  "catalog_articles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => organizations.tenantId, { onDelete: "cascade" }),
    supplierId: uuid("supplier_id")
      .notNull()
      .references(() => catalogSuppliers.id, { onDelete: "cascade" }),
    supplierSku: text("supplier_sku").notNull(),
    name: text("name"),
    unit: text("unit"),
    ean: text("ean"),
    lastBatchId: uuid("last_batch_id").references(() => catalogImportBatches.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    tenantSupplierSku: unique("catalog_articles_tenant_supplier_sku").on(
      t.tenantId,
      t.supplierId,
      t.supplierSku,
    ),
  }),
);

/** Letzter Preis je Artikel (History wird über weitere Zeilen erweitert). */
export const catalogPrices = pgTable("catalog_prices", {
  id: uuid("id").defaultRandom().primaryKey(),
  articleId: uuid("article_id")
    .notNull()
    .references(() => catalogArticles.id, { onDelete: "cascade" }),
  batchId: uuid("batch_id")
    .notNull()
    .references(() => catalogImportBatches.id, { onDelete: "cascade" }),
  price: text("price").notNull(),
  currency: text("currency").notNull().default("EUR"),
  validFrom: timestamp("valid_from", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** Einmalcode nach Web-Login für nativen OAuth-Callback (Desktop/Mobile); kurzlebig. */
export const nativeLoginOtc = pgTable("native_login_otc", {
  code: text("code").primaryKey(),
  payload: jsonb("payload")
    .notNull()
    .$type<{
      codeChallenge: string;
      redirectUri: string;
      accessToken: string;
      refreshToken: string | null;
      expiresIn: number;
    }>(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

/**
 * Angebot je Mandant (Kopfdaten; Positionen folgen später).
 * Status: draft | sent | accepted | rejected | expired
 */
export const salesQuotes = pgTable(
  "sales_quotes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => organizations.tenantId, { onDelete: "cascade" }),
    documentNumber: text("document_number").notNull(),
    customerLabel: text("customer_label").notNull(),
    status: text("status").notNull(),
    currency: text("currency").notNull().default("EUR"),
    totalCents: integer("total_cents").notNull().default(0),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    tenantDocumentNumber: unique("sales_quotes_tenant_document_number").on(
      t.tenantId,
      t.documentNumber,
    ),
  }),
);

/**
 * Rechnung je Mandant.
 * Status: draft | sent | paid | overdue | cancelled
 */
export const salesInvoices = pgTable(
  "sales_invoices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => organizations.tenantId, { onDelete: "cascade" }),
    documentNumber: text("document_number").notNull(),
    customerLabel: text("customer_label").notNull(),
    status: text("status").notNull(),
    /** `invoice` | `partial` | `final` | `credit_note` */
    billingType: text("billing_type").notNull().default("invoice"),
    currency: text("currency").notNull().default("EUR"),
    totalCents: integer("total_cents").notNull().default(0),
    /** Rabatt auf Summe der Positions-Bruttobeträge in Basispunkten (z. B. 500 = 5 %). */
    headerDiscountBps: integer("header_discount_bps").notNull().default(0),
    quoteId: uuid("quote_id").references(() => salesQuotes.id, {
      onDelete: "set null",
    }),
    parentInvoiceId: uuid("parent_invoice_id").references(
      (): AnyPgColumn => salesInvoices.id,
      {
        onDelete: "set null",
      },
    ),
    creditForInvoiceId: uuid("credit_for_invoice_id").references(
      (): AnyPgColumn => salesInvoices.id,
      {
        onDelete: "set null",
      },
    ),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    dueAt: timestamp("due_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    isFinalized: boolean("is_finalized").notNull().default(false),
    finalizedAt: timestamp("finalized_at", { withTimezone: true }),
    snapshotHash: text("snapshot_hash"),
    snapshotJson: jsonb("snapshot_json").$type<Record<string, unknown>>(),
    customerId: uuid("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    tenantDocumentNumber: unique("sales_invoices_tenant_document_number").on(
      t.tenantId,
      t.documentNumber,
    ),
    tenantParentIdx: index("sales_invoices_tenant_parent_idx").on(
      t.tenantId,
      t.parentInvoiceId,
    ),
    tenantCreditForIdx: index("sales_invoices_tenant_credit_for_idx").on(
      t.tenantId,
      t.creditForInvoiceId,
    ),
  }),
);

/**
 * Zahlungseingaenge auf eine Rechnung (Teilzahlungen; Saldo = total_cents − Summe).
 */
export const salesInvoicePayments = pgTable(
  "sales_invoice_payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => organizations.tenantId, { onDelete: "cascade" }),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => salesInvoices.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull(),
    paidAt: timestamp("paid_at", { withTimezone: true }).notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    invoiceIdx: index("sales_invoice_payments_invoice_idx").on(t.invoiceId),
    tenantPaidAtIdx: index("sales_invoice_payments_tenant_paid_at_idx").on(
      t.tenantId,
      t.paidAt,
    ),
  }),
);

/**
 * Persistierte CAMT-Importe je Mandant (dedupliziert über Datei-Hash).
 * Roh-XML wird nicht gespeichert; nur Metadaten + Zeilen-Snapshot.
 */
export const salesCamtImportBatches = pgTable(
  "sales_camt_import_batches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => organizations.tenantId, { onDelete: "cascade" }),
    filename: text("filename"),
    fileSha256: text("file_sha256").notNull(),
    parseWarnings: jsonb("parse_warnings").$type<string[]>(),
    entryCount: integer("entry_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    tenantHashUnique: unique("sales_camt_import_batches_tenant_hash_unique").on(
      t.tenantId,
      t.fileSha256,
    ),
    tenantCreatedIdx: index("sales_camt_import_batches_tenant_created_idx").on(
      t.tenantId,
      t.createdAt,
    ),
  }),
);

/**
 * Zeilen-Snapshot eines CAMT-Imports zur späteren Vorschau/Zuordnung.
 */
export const salesCamtImportLines = pgTable(
  "sales_camt_import_lines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => salesCamtImportBatches.id, { onDelete: "cascade" }),
    lineIndex: integer("line_index").notNull(),
    cdtDbtInd: text("cdt_dbt_ind").notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull(),
    bookingDate: date("booking_date"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    remittanceInfo: text("remittance_info").notNull(),
    debtorName: text("debtor_name").notNull(),
    skipped: boolean("skipped").notNull().default(false),
    skipReason: text("skip_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    batchLineUnique: unique("sales_camt_import_lines_batch_line_unique").on(
      t.batchId,
      t.lineIndex,
    ),
    batchIdx: index("sales_camt_import_lines_batch_idx").on(t.batchId),
  }),
);

/**
 * Mahn-Historie zu einer Rechnung (manuell; später ggf. E-Mail).
 */
export const salesInvoiceReminders = pgTable(
  "sales_invoice_reminders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => organizations.tenantId, { onDelete: "cascade" }),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => salesInvoices.id, { onDelete: "cascade" }),
    /** 1..N (Mahn-/Erinnerungsstufe). */
    level: integer("level").notNull(),
    /** Zeitpunkt der Mahnung (nicht identisch mit DB `created_at`). */
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull(),
    /** `manual` | `email` (später) — Validierung in API. */
    channel: text("channel").notNull().default("manual"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    invoiceIdx: index("sales_invoice_reminders_invoice_idx").on(t.invoiceId),
    tenantSentAtIdx: index("sales_invoice_reminders_tenant_sent_at_idx").on(
      t.tenantId,
      t.sentAt,
    ),
  }),
);

/**
 * Outbox für Mahn-E-Mails: Audit, Retry-Zähler, Lieferstatus (E-06 Produktivpfad).
 */
export const salesReminderEmailJobs = pgTable(
  "sales_reminder_email_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => organizations.tenantId, { onDelete: "cascade" }),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => salesInvoices.id, { onDelete: "cascade" }),
    reminderId: uuid("reminder_id")
      .notNull()
      .references(() => salesInvoiceReminders.id, { onDelete: "cascade" }),
    toEmail: text("to_email").notNull(),
    subject: text("subject").notNull(),
    bodyText: text("body_text").notNull(),
    /** `de` | `en` — Validierung in API. */
    locale: text("locale").notNull(),
    /** `pending` | `sent` | `failed` */
    status: text("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(3),
    lastError: text("last_error"),
    createdBySub: text("created_by_sub"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (t) => ({
    tenantCreatedIdx: index("sales_reminder_email_jobs_tenant_created_idx").on(
      t.tenantId,
      t.createdAt,
    ),
    invoiceReminderIdx: index("sales_reminder_email_jobs_invoice_reminder_idx").on(
      t.invoiceId,
      t.reminderId,
    ),
  }),
);

/**
 * Mandantenspezifische Mahntexte und optionale Mahngebuehr pro Stufe/Sprache (PDF/Druck).
 * `bodyText` null: Standardfließtext; `feeCents` null: keine Gebuehrzeile.
 */
export const salesReminderTemplates = pgTable(
  "sales_reminder_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => organizations.tenantId, { onDelete: "cascade" }),
    /** `de` | `en` — Validierung in API. */
    locale: text("locale").notNull(),
    /** 1..10; hoehere Mahnstufen nutzen die Vorlage der Stufe 10 (siehe API). */
    level: integer("level").notNull(),
    bodyText: text("body_text"),
    feeCents: integer("fee_cents"),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    tenantLocaleLevelUnique: unique(
      "sales_reminder_templates_tenant_locale_level_unique",
    ).on(t.tenantId, t.locale, t.level),
    tenantLocaleIdx: index("sales_reminder_templates_tenant_locale_idx").on(
      t.tenantId,
      t.locale,
    ),
  }),
);

/** Positionszeile zu einem Angebot. */
export const salesQuoteLines = pgTable("sales_quote_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  quoteId: uuid("quote_id")
    .notNull()
    .references(() => salesQuotes.id, { onDelete: "cascade" }),
  /** Optional: Verweis auf freigegebenen Katalogartikel (Stamm). */
  catalogArticleId: uuid("catalog_article_id").references(
    () => catalogArticles.id,
    { onDelete: "set null" },
  ),
  sortIndex: integer("sort_index").notNull(),
  description: text("description").notNull(),
  quantity: text("quantity"),
  unit: text("unit"),
  /** 700 = 7%, 1900 = 19% */
  taxRateBps: integer("tax_rate_bps").notNull().default(1900),
  /** Rabatt in Basispunkten (z. B. 250 = 2.5%) */
  discountBps: integer("discount_bps").notNull().default(0),
  unitPriceCents: integer("unit_price_cents").notNull().default(0),
  lineTotalCents: integer("line_total_cents").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** Positionszeile zu einer Rechnung. */
export const salesInvoiceLines = pgTable("sales_invoice_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => salesInvoices.id, { onDelete: "cascade" }),
  /** Optional: Verweis auf freigegebenen Katalogartikel (Stamm). */
  catalogArticleId: uuid("catalog_article_id").references(
    () => catalogArticles.id,
    { onDelete: "set null" },
  ),
  sortIndex: integer("sort_index").notNull(),
  description: text("description").notNull(),
  quantity: text("quantity"),
  unit: text("unit"),
  /** 700 = 7%, 1900 = 19% */
  taxRateBps: integer("tax_rate_bps").notNull().default(1900),
  /** Rabatt in Basispunkten (z. B. 250 = 2.5%) */
  discountBps: integer("discount_bps").notNull().default(0),
  unitPriceCents: integer("unit_price_cents").notNull().default(0),
  lineTotalCents: integer("line_total_cents").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/**
 * Audit events for sales lifecycle actions (archive/cancel/delete).
 */
export const salesLifecycleEvents = pgTable(
  "sales_lifecycle_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => organizations.tenantId, { onDelete: "cascade" }),
    actorSub: text("actor_sub").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    action: text("action").notNull(),
    fromStatus: text("from_status"),
    toStatus: text("to_status"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    tenantCreatedIdx: index("sales_lifecycle_events_tenant_created_idx").on(
      t.tenantId,
      t.createdAt,
    ),
    entityCreatedIdx: index("sales_lifecycle_events_entity_created_idx").on(
      t.entityType,
      t.entityId,
      t.createdAt,
    ),
  }),
);
