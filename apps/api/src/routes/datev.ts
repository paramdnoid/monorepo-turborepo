import { and, eq, inArray, sql } from "drizzle-orm";
import type { Context } from "hono";

import {
  datevSettingsPatchSchema,
  datevSettingsResponseSchema,
  datevExportBookingsQuerySchema,
} from "@repo/api-contracts";
import { buildDatevBookingsCsv } from "@repo/datev-export";
import {
  organizationDatevSettings,
  salesInvoices,
  type Db,
} from "@repo/db";

function logDatev(c: Context, event: string, data: Record<string, unknown>) {
  const requestId = c.get("requestId");
  console.log(
    JSON.stringify({
      level: "info",
      service: "zunftgewerk-api",
      requestId,
      event,
      ...data,
    }),
  );
}

function rowToSettingsPayload(row: typeof organizationDatevSettings.$inferSelect) {
  return {
    advisorNumber: row.advisorNumber ?? null,
    clientNumber: row.clientNumber ?? null,
    defaultDebtorAccount: row.defaultDebtorAccount ?? null,
    defaultRevenueAccount: row.defaultRevenueAccount ?? null,
    defaultVatKey: row.defaultVatKey ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function getOrCreateDatevSettings(
  db: Db,
  tenantId: string,
): Promise<typeof organizationDatevSettings.$inferSelect> {
  const existing = await db
    .select()
    .from(organizationDatevSettings)
    .where(eq(organizationDatevSettings.tenantId, tenantId))
    .limit(1);
  const first = existing[0];
  if (first) {
    return first;
  }
  const inserted = await db
    .insert(organizationDatevSettings)
    .values({ tenantId })
    .returning();
  const row = inserted[0];
  if (!row) {
    throw new Error("datev_settings_insert_failed");
  }
  return row;
}

export function createDatevSettingsGetHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }
    try {
      const row = await getOrCreateDatevSettings(db, auth.tenantId);
      const payload = datevSettingsResponseSchema.parse({
        settings: rowToSettingsPayload(row),
      });
      return c.json(payload);
    } catch {
      return c.json({ error: "load_failed" }, 500);
    }
  };
}

export function createDatevSettingsPatchHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    const parsed = datevSettingsPatchSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "validation_error" }, 400);
    }
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }

    await getOrCreateDatevSettings(db, auth.tenantId);

    const patch = parsed.data;
    const updates: Partial<{
      advisorNumber: string | null;
      clientNumber: string | null;
      defaultDebtorAccount: string | null;
      defaultRevenueAccount: string | null;
      defaultVatKey: string | null;
    }> = {};

    if (patch.advisorNumber !== undefined) {
      updates.advisorNumber = patch.advisorNumber;
    }
    if (patch.clientNumber !== undefined) {
      updates.clientNumber = patch.clientNumber;
    }
    if (patch.defaultDebtorAccount !== undefined) {
      updates.defaultDebtorAccount = patch.defaultDebtorAccount;
    }
    if (patch.defaultRevenueAccount !== undefined) {
      updates.defaultRevenueAccount = patch.defaultRevenueAccount;
    }
    if (patch.defaultVatKey !== undefined) {
      updates.defaultVatKey = patch.defaultVatKey;
    }

    if (Object.keys(updates).length === 0) {
      const row = await getOrCreateDatevSettings(db, auth.tenantId);
      return c.json(
        datevSettingsResponseSchema.parse({
          settings: rowToSettingsPayload(row),
        }),
      );
    }

    const [updated] = await db
      .update(organizationDatevSettings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(organizationDatevSettings.tenantId, auth.tenantId))
      .returning();

    if (!updated) {
      return c.json({ error: "update_failed" }, 500);
    }

    logDatev(c, "datev_settings_patch", { tenantId: auth.tenantId });

    return c.json(
      datevSettingsResponseSchema.parse({
        settings: rowToSettingsPayload(updated),
      }),
    );
  };
}

const EXPORTABLE_INVOICE_STATUSES = ["sent", "paid", "overdue"] as const;

export function createDatevBookingsExportHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }

    const q = {
      from: c.req.query("from") ?? "",
      to: c.req.query("to") ?? "",
    };
    const parsedQ = datevExportBookingsQuerySchema.safeParse(q);
    if (!parsedQ.success) {
      return c.json({ error: "validation_error", details: parsedQ.error.flatten() }, 400);
    }
    const { from, to } = parsedQ.data;
    if (from > to) {
      return c.json({ error: "invalid_range" }, 400);
    }

    const settings = await getOrCreateDatevSettings(db, auth.tenantId);
    const debtor = settings.defaultDebtorAccount?.trim() ?? "";
    const revenue = settings.defaultRevenueAccount?.trim() ?? "";
    if (!debtor || !revenue) {
      return c.json(
        { error: "missing_accounts", code: "DATEV_ACCOUNTS" },
        409,
      );
    }

    const fromTs = new Date(`${from}T00:00:00.000Z`);
    const toTs = new Date(`${to}T23:59:59.999Z`);

    const rows = await db
      .select({
        documentNumber: salesInvoices.documentNumber,
        totalCents: salesInvoices.totalCents,
        issuedAt: salesInvoices.issuedAt,
        createdAt: salesInvoices.createdAt,
        currency: salesInvoices.currency,
        customerLabel: salesInvoices.customerLabel,
      })
      .from(salesInvoices)
      .where(
        and(
          eq(salesInvoices.tenantId, auth.tenantId),
          inArray(salesInvoices.status, [...EXPORTABLE_INVOICE_STATUSES]),
          sql`coalesce(${salesInvoices.issuedAt}, ${salesInvoices.createdAt}) >= ${fromTs}`,
          sql`coalesce(${salesInvoices.issuedAt}, ${salesInvoices.createdAt}) <= ${toTs}`,
        ),
      );

    const vatKey = settings.defaultVatKey?.trim() ?? "";

    const invoices = rows.map((r) => {
      const d = r.issuedAt ?? r.createdAt;
      const postingDate = d.toISOString().slice(0, 10);
      return {
        documentNumber: r.documentNumber,
        totalCents: r.totalCents,
        postingDate,
        description: `Rechnung ${r.documentNumber} — ${r.customerLabel}`,
      };
    });

    const csv = buildDatevBookingsCsv({
      invoices,
      debtorAccount: debtor,
      revenueAccount: revenue,
      vatKey,
      currency: rows[0]?.currency ?? "EUR",
    });

    logDatev(c, "datev_bookings_export", {
      tenantId: auth.tenantId,
      from,
      to,
      rowCount: invoices.length,
    });

    const safeFrom = from.replace(/[^\d-]/g, "");
    const safeTo = to.replace(/[^\d-]/g, "");
    c.header("Content-Type", "text/csv; charset=utf-8");
    c.header(
      "Content-Disposition",
      `attachment; filename="datev-buchungen-${safeFrom}-${safeTo}.csv"`,
    );
    return c.body(csv);
  };
}