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
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

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
    vatId: text("vat_id"),
    taxNumber: text("tax_number"),
    notes: text("notes"),
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
    title: text("title").notNull(),
    place: text("place"),
    reminderMinutesBefore: integer("reminder_minutes_before"),
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
    currency: text("currency").notNull().default("EUR"),
    totalCents: integer("total_cents").notNull().default(0),
    quoteId: uuid("quote_id").references(() => salesQuotes.id, {
      onDelete: "set null",
    }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    dueAt: timestamp("due_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
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
  }),
);

/** Positionszeile zu einem Angebot. */
export const salesQuoteLines = pgTable("sales_quote_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  quoteId: uuid("quote_id")
    .notNull()
    .references(() => salesQuotes.id, { onDelete: "cascade" }),
  sortIndex: integer("sort_index").notNull(),
  description: text("description").notNull(),
  quantity: text("quantity"),
  unit: text("unit"),
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
  sortIndex: integer("sort_index").notNull(),
  description: text("description").notNull(),
  quantity: text("quantity"),
  unit: text("unit"),
  unitPriceCents: integer("unit_price_cents").notNull().default(0),
  lineTotalCents: integer("line_total_cents").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
