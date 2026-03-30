import {
  jsonb,
  pgTable,
  text,
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
  createdAt: timestamp("created_at", { withTimezone: true })
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
