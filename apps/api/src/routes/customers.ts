import type { SQL } from "drizzle-orm";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Context } from "hono";
import { z } from "zod";

import {
  customerAddressKindSchema,
  customerCreateAddressSchema,
  customerCreateSchema,
  customerPatchAddressSchema,
  customerPatchSchema,
} from "@repo/api-contracts";

import {
  customerAddresses,
  customers,
  type Db,
} from "@repo/db";

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "23505"
  );
}

function normalizeOptionalCustomerNumber(
  v: string | null | undefined,
): string | null {
  if (v === undefined || v === null) {
    return null;
  }
  const t = v.trim();
  return t === "" ? null : t;
}

function mapAddressRow(r: typeof customerAddresses.$inferSelect) {
  const kindParsed = customerAddressKindSchema.safeParse(r.kind);
  const kind = kindParsed.success ? kindParsed.data : "other";
  return {
    id: r.id,
    kind,
    label: r.label ?? null,
    recipientName: r.recipientName,
    addressLine2: r.addressLine2 ?? null,
    street: r.street,
    postalCode: r.postalCode,
    city: r.city,
    country: r.country,
    isDefault: r.isDefault,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

function addressSortRank(a: typeof customerAddresses.$inferSelect): number {
  const kindRank =
    a.kind === "billing" ? 0 : a.kind === "shipping" ? 1 : a.kind === "site" ? 2 : 3;
  return (a.isDefault ? 0 : 10) + kindRank;
}

function pickListCity(
  addresses: readonly typeof customerAddresses.$inferSelect[],
): string | null {
  if (addresses.length === 0) {
    return null;
  }
  const sorted = [...addresses].sort(
    (x, y) => addressSortRank(x) - addressSortRank(y),
  );
  return sorted[0]?.city ?? null;
}

async function clearDefaultFlagsForKind(
  db: Db,
  customerId: string,
  kind: string,
): Promise<void> {
  await db
    .update(customerAddresses)
    .set({ isDefault: false, updatedAt: new Date() })
    .where(
      and(
        eq(customerAddresses.customerId, customerId),
        eq(customerAddresses.kind, kind),
      ),
    );
}

async function assertCustomerForTenant(
  db: Db,
  tenantId: string,
  customerId: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: customers.id })
    .from(customers)
    .where(
      and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)),
    )
    .limit(1);
  return Boolean(rows[0]);
}

async function loadCustomerDetail(
  db: Db,
  tenantId: string,
  customerId: string,
) {
  const rows = await db
    .select()
    .from(customers)
    .where(
      and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)),
    )
    .limit(1);
  const row = rows[0];
  if (!row) {
    return null;
  }
  const addrs = await db
    .select()
    .from(customerAddresses)
    .where(eq(customerAddresses.customerId, customerId))
    .orderBy(asc(customerAddresses.createdAt));
  return {
    customer: {
      id: row.id,
      displayName: row.displayName,
      customerNumber: row.customerNumber ?? null,
      vatId: row.vatId ?? null,
      taxNumber: row.taxNumber ?? null,
      notes: row.notes ?? null,
      archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      addresses: addrs.map(mapAddressRow),
    },
  };
}

export function createCustomersListHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }
    const qRaw = c.req.query("q")?.trim() ?? "";
    const includeArchived =
      c.req.query("includeArchived") === "1" ||
      c.req.query("includeArchived") === "true";

    const limitRaw = c.req.query("limit");
    const offsetRaw = c.req.query("offset");
    let limit = 25;
    let offset = 0;
    if (limitRaw !== undefined && limitRaw !== "") {
      const n = Number(limitRaw);
      if (Number.isFinite(n)) {
        limit = Math.min(500, Math.max(1, Math.trunc(n)));
      }
    }
    if (offsetRaw !== undefined && offsetRaw !== "") {
      const n = Number(offsetRaw);
      if (Number.isFinite(n)) {
        offset = Math.max(0, Math.trunc(n));
      }
    }

    const conditions: SQL[] = [eq(customers.tenantId, auth.tenantId)];
    if (!includeArchived) {
      conditions.push(isNull(customers.archivedAt));
    }
    if (qRaw.length > 0) {
      const pattern = `%${qRaw.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
      conditions.push(
        sql`(${customers.displayName} ilike ${pattern} escape '\\' or ${customers.customerNumber} ilike ${pattern} escape '\\')`,
      );
    }

    const [countRow] = await db
      .select({ n: sql<number>`cast(count(*) as int)` })
      .from(customers)
      .where(and(...conditions));

    const total = countRow?.n ?? 0;

    const custRows = await db
      .select()
      .from(customers)
      .where(and(...conditions))
      .orderBy(asc(customers.displayName))
      .limit(limit)
      .offset(offset);

    const ids = custRows.map((r) => r.id);
    const addrByCustomer = new Map<
      string,
      (typeof customerAddresses.$inferSelect)[]
    >();
    if (ids.length > 0) {
      const allAddr = await db
        .select()
        .from(customerAddresses)
        .where(inArray(customerAddresses.customerId, ids));
      for (const a of allAddr) {
        const list = addrByCustomer.get(a.customerId) ?? [];
        list.push(a);
        addrByCustomer.set(a.customerId, list);
      }
    }

    return c.json({
      customers: custRows.map((r) => ({
        id: r.id,
        displayName: r.displayName,
        customerNumber: r.customerNumber ?? null,
        city: pickListCity(addrByCustomer.get(r.id) ?? []),
        archivedAt: r.archivedAt ? r.archivedAt.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      total,
    });
  };
}

/** Mandantenweite Adressliste (Join Kunde + Adresse), paginiert. */
export function createCustomerAddressesListHandler(
  getDb: () => Db | undefined,
) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }

    const qRaw = c.req.query("q")?.trim() ?? "";
    const includeArchived =
      c.req.query("includeArchived") === "1" ||
      c.req.query("includeArchived") === "true";

    const limitRaw = c.req.query("limit");
    const offsetRaw = c.req.query("offset");
    let limit = 25;
    let offset = 0;
    if (limitRaw !== undefined && limitRaw !== "") {
      const n = Number(limitRaw);
      if (Number.isFinite(n)) {
        limit = Math.min(500, Math.max(1, Math.trunc(n)));
      }
    }
    if (offsetRaw !== undefined && offsetRaw !== "") {
      const n = Number(offsetRaw);
      if (Number.isFinite(n)) {
        offset = Math.max(0, Math.trunc(n));
      }
    }

    const conditions: SQL[] = [eq(customers.tenantId, auth.tenantId)];
    if (!includeArchived) {
      conditions.push(isNull(customers.archivedAt));
    }
    if (qRaw.length > 0) {
      const pattern = `%${qRaw.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
      conditions.push(
        sql`(
          ${customers.displayName} ilike ${pattern} escape '\\'
          or ${customers.customerNumber} ilike ${pattern} escape '\\'
          or ${customerAddresses.recipientName} ilike ${pattern} escape '\\'
          or ${customerAddresses.street} ilike ${pattern} escape '\\'
          or ${customerAddresses.postalCode} ilike ${pattern} escape '\\'
          or ${customerAddresses.city} ilike ${pattern} escape '\\'
          or coalesce(${customerAddresses.label}, '') ilike ${pattern} escape '\\'
          or coalesce(${customerAddresses.addressLine2}, '') ilike ${pattern} escape '\\'
        )`,
      );
    }

    const whereClause = and(...conditions);

    const [countRow] = await db
      .select({ n: sql<number>`cast(count(${customerAddresses.id}) as int)` })
      .from(customerAddresses)
      .innerJoin(customers, eq(customerAddresses.customerId, customers.id))
      .where(whereClause);

    const total = countRow?.n ?? 0;

    const joined = await db
      .select({ cust: customers, addr: customerAddresses })
      .from(customerAddresses)
      .innerJoin(customers, eq(customerAddresses.customerId, customers.id))
      .where(whereClause)
      .orderBy(
        asc(customers.displayName),
        sql`(case when ${customerAddresses.isDefault} then 0 else 1 end)`,
        sql`(case ${customerAddresses.kind}
          when 'billing' then 0
          when 'shipping' then 1
          when 'site' then 2
          else 3 end)`,
        asc(customerAddresses.city),
        asc(customerAddresses.street),
      )
      .limit(limit)
      .offset(offset);

    return c.json({
      rows: joined.map(({ cust, addr }) => ({
        customerId: cust.id,
        displayName: cust.displayName,
        customerNumber: cust.customerNumber ?? null,
        customerArchivedAt: cust.archivedAt
          ? cust.archivedAt.toISOString()
          : null,
        address: mapAddressRow(addr),
      })),
      total,
    });
  };
}

export function createCustomerPostHandler(getDb: () => Db | undefined) {
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
    const parsed = customerCreateSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "validation_error" }, 400);
    }
    const input = parsed.data;
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }

    const customerNumber = normalizeOptionalCustomerNumber(
      input.customerNumber ?? undefined,
    );

    try {
      const inserted = await db
        .insert(customers)
        .values({
          tenantId: auth.tenantId,
          displayName: input.displayName,
          customerNumber,
          vatId: normalizeOptionalCustomerNumber(input.vatId ?? undefined),
          taxNumber: normalizeOptionalCustomerNumber(input.taxNumber ?? undefined),
          notes:
            input.notes === undefined || input.notes === null
              ? null
              : input.notes.trim() === ""
                ? null
                : input.notes.trim(),
        })
        .returning({ id: customers.id });
      const id = inserted[0]?.id;
      if (!id) {
        return c.json({ error: "insert_failed" }, 500);
      }

      if (input.defaultAddress) {
        const a = input.defaultAddress;
        const kindParse = customerAddressKindSchema.safeParse(a.kind);
        const kind = kindParse.success ? kindParse.data : "billing";
        if (a.isDefault) {
          await clearDefaultFlagsForKind(db, id, kind);
        }
        await db.insert(customerAddresses).values({
          customerId: id,
          kind,
          label: a.label ?? null,
          recipientName: a.recipientName,
          addressLine2: a.addressLine2 ?? null,
          street: a.street,
          postalCode: a.postalCode,
          city: a.city,
          country: a.country,
          isDefault: Boolean(a.isDefault),
        });
      }

      const payload = await loadCustomerDetail(db, auth.tenantId, id);
      if (!payload) {
        return c.json({ error: "insert_failed" }, 500);
      }
      return c.json(payload, 201);
    } catch (err) {
      if (isUniqueViolation(err)) {
        return c.json({ error: "customer_number_taken" }, 409);
      }
      throw err;
    }
  };
}

export function createCustomerDetailHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    const idParse = z.string().uuid().safeParse(c.req.param("id"));
    if (!idParse.success) {
      return c.json({ error: "invalid_id" }, 400);
    }
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }
    const payload = await loadCustomerDetail(db, auth.tenantId, idParse.data);
    if (!payload) {
      return c.json({ error: "not_found" }, 404);
    }
    return c.json(payload);
  };
}

export function createCustomerPatchHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    const idParse = z.string().uuid().safeParse(c.req.param("id"));
    if (!idParse.success) {
      return c.json({ error: "invalid_id" }, 400);
    }
    const id = idParse.data;
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    const parsed = customerPatchSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "validation_error" }, 400);
    }
    const patch = parsed.data;
    if (Object.keys(patch).length === 0) {
      return c.json({ error: "empty_patch" }, 400);
    }
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }
    const updates: {
      updatedAt: Date;
      displayName?: string;
      customerNumber?: string | null;
      vatId?: string | null;
      taxNumber?: string | null;
      notes?: string | null;
      archivedAt?: Date | null;
    } = { updatedAt: new Date() };
    if (patch.displayName !== undefined) {
      updates.displayName = patch.displayName;
    }
    if (patch.customerNumber !== undefined) {
      updates.customerNumber = normalizeOptionalCustomerNumber(
        patch.customerNumber,
      );
    }
    if (patch.vatId !== undefined) {
      updates.vatId = normalizeOptionalCustomerNumber(patch.vatId);
    }
    if (patch.taxNumber !== undefined) {
      updates.taxNumber = normalizeOptionalCustomerNumber(patch.taxNumber);
    }
    if (patch.notes !== undefined) {
      updates.notes =
        patch.notes === null
          ? null
          : patch.notes.trim() === ""
            ? null
            : patch.notes.trim();
    }
    if (patch.archived !== undefined) {
      updates.archivedAt = patch.archived ? new Date() : null;
    }
    try {
      const result = await db
        .update(customers)
        .set(updates)
        .where(
          and(eq(customers.id, id), eq(customers.tenantId, auth.tenantId)),
        )
        .returning({ id: customers.id });
      if (!result[0]) {
        return c.json({ error: "not_found" }, 404);
      }
      const payload = await loadCustomerDetail(db, auth.tenantId, id);
      if (!payload) {
        return c.json({ error: "not_found" }, 404);
      }
      return c.json(payload);
    } catch (err) {
      if (isUniqueViolation(err)) {
        return c.json({ error: "customer_number_taken" }, 409);
      }
      throw err;
    }
  };
}

export function createCustomerAddressPostHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    const customerIdParse = z.string().uuid().safeParse(c.req.param("id"));
    if (!customerIdParse.success) {
      return c.json({ error: "invalid_id" }, 400);
    }
    const customerId = customerIdParse.data;
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    const parsed = customerCreateAddressSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "validation_error" }, 400);
    }
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }
    const ok = await assertCustomerForTenant(db, auth.tenantId, customerId);
    if (!ok) {
      return c.json({ error: "not_found" }, 404);
    }
    const a = parsed.data;
    const kind = customerAddressKindSchema.safeParse(a.kind).success
      ? a.kind
      : "billing";
    if (a.isDefault) {
      await clearDefaultFlagsForKind(db, customerId, kind);
    }
    const inserted = await db
      .insert(customerAddresses)
      .values({
        customerId,
        kind,
        label: a.label ?? null,
        recipientName: a.recipientName,
        addressLine2: a.addressLine2 ?? null,
        street: a.street,
        postalCode: a.postalCode,
        city: a.city,
        country: a.country,
        isDefault: Boolean(a.isDefault),
      })
      .returning({ id: customerAddresses.id });
    const newId = inserted[0]?.id;
    if (!newId) {
      return c.json({ error: "insert_failed" }, 500);
    }
    const payload = await loadCustomerDetail(db, auth.tenantId, customerId);
    if (!payload) {
      return c.json({ error: "not_found" }, 404);
    }
    return c.json(payload, 201);
  };
}

export function createCustomerAddressPatchHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    const customerIdParse = z.string().uuid().safeParse(c.req.param("id"));
    const addressIdParse = z.string().uuid().safeParse(c.req.param("addressId"));
    if (!customerIdParse.success || !addressIdParse.success) {
      return c.json({ error: "invalid_id" }, 400);
    }
    const customerId = customerIdParse.data;
    const addressId = addressIdParse.data;
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    const parsed = customerPatchAddressSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "validation_error" }, 400);
    }
    const patch = parsed.data;
    if (Object.keys(patch).length === 0) {
      return c.json({ error: "empty_patch" }, 400);
    }
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }
    const custOk = await assertCustomerForTenant(db, auth.tenantId, customerId);
    if (!custOk) {
      return c.json({ error: "not_found" }, 404);
    }
    const existing = await db
      .select()
      .from(customerAddresses)
      .where(
        and(
          eq(customerAddresses.id, addressId),
          eq(customerAddresses.customerId, customerId),
        ),
      )
      .limit(1);
    const row = existing[0];
    if (!row) {
      return c.json({ error: "not_found" }, 404);
    }
    const nextKind = patch.kind ?? row.kind;
    const kindParse = customerAddressKindSchema.safeParse(nextKind);
    const kind = kindParse.success ? kindParse.data : row.kind;

    if (patch.isDefault === true) {
      await clearDefaultFlagsForKind(db, customerId, kind);
    }

    const updates: Partial<typeof customerAddresses.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (patch.kind !== undefined) {
      updates.kind = kind;
    }
    if (patch.label !== undefined) {
      updates.label = patch.label;
    }
    if (patch.recipientName !== undefined) {
      updates.recipientName = patch.recipientName;
    }
    if (patch.addressLine2 !== undefined) {
      updates.addressLine2 = patch.addressLine2;
    }
    if (patch.street !== undefined) {
      updates.street = patch.street;
    }
    if (patch.postalCode !== undefined) {
      updates.postalCode = patch.postalCode;
    }
    if (patch.city !== undefined) {
      updates.city = patch.city;
    }
    if (patch.country !== undefined) {
      updates.country = patch.country;
    }
    if (patch.isDefault !== undefined) {
      updates.isDefault = patch.isDefault;
    }

    await db
      .update(customerAddresses)
      .set(updates)
      .where(eq(customerAddresses.id, addressId));

    const payload = await loadCustomerDetail(db, auth.tenantId, customerId);
    if (!payload) {
      return c.json({ error: "not_found" }, 404);
    }
    return c.json(payload);
  };
}

export function createCustomerAddressDeleteHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    const customerIdParse = z.string().uuid().safeParse(c.req.param("id"));
    const addressIdParse = z.string().uuid().safeParse(c.req.param("addressId"));
    if (!customerIdParse.success || !addressIdParse.success) {
      return c.json({ error: "invalid_id" }, 400);
    }
    const customerId = customerIdParse.data;
    const addressId = addressIdParse.data;
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }
    const custOk = await assertCustomerForTenant(db, auth.tenantId, customerId);
    if (!custOk) {
      return c.json({ error: "not_found" }, 404);
    }
    const del = await db
      .delete(customerAddresses)
      .where(
        and(
          eq(customerAddresses.id, addressId),
          eq(customerAddresses.customerId, customerId),
        ),
      )
      .returning({ id: customerAddresses.id });
    if (!del[0]) {
      return c.json({ error: "not_found" }, 404);
    }
    const payload = await loadCustomerDetail(db, auth.tenantId, customerId);
    if (!payload) {
      return c.json({ error: "not_found" }, 404);
    }
    return c.json(payload);
  };
}
