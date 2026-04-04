import type { SQL } from "drizzle-orm";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { Context } from "hono";

import {
  employeeCreateSchema,
  employeeDetailResponseSchema,
  employeePatchSchema,
  employeesListResponseSchema,
} from "@repo/api-contracts";

import {
  employeeAvailabilityRules,
  employees,
  type Db,
} from "@repo/db";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function pgTime(value: string): string {
  const t = value.trim();
  return t.length === 5 ? `${t}:00` : t;
}

function formatTimeForApi(value: unknown): string {
  if (typeof value === "string") {
    return value.length === 8 ? value.slice(0, 5) : value;
  }
  return String(value);
}

function mapRuleRow(
  r: typeof employeeAvailabilityRules.$inferSelect,
): {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
  sortIndex: number;
  createdAt: string;
  updatedAt: string;
} {
  return {
    id: r.id,
    weekday: r.weekday,
    startTime: formatTimeForApi(r.startTime),
    endTime: formatTimeForApi(r.endTime),
    sortIndex: r.sortIndex,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

function mapEmployeeDetail(
  row: typeof employees.$inferSelect,
  rules: readonly typeof employeeAvailabilityRules.$inferSelect[],
) {
  const sorted = [...rules].sort((a, b) => {
    if (a.weekday !== b.weekday) {
      return a.weekday - b.weekday;
    }
    if (a.sortIndex !== b.sortIndex) {
      return a.sortIndex - b.sortIndex;
    }
    return String(a.startTime).localeCompare(String(b.startTime));
  });
  return {
    employee: {
      id: row.id,
      displayName: row.displayName,
      roleLabel: row.roleLabel ?? null,
      notes: row.notes ?? null,
      privateAddressLabel: row.privateAddressLabel ?? null,
      privateAddressLine2: row.privateAddressLine2 ?? null,
      privateRecipientName: row.privateRecipientName ?? null,
      privateStreet: row.privateStreet ?? null,
      privatePostalCode: row.privatePostalCode ?? null,
      privateCity: row.privateCity ?? null,
      privateCountry: row.privateCountry ?? null,
      latitude: row.latitude ?? null,
      longitude: row.longitude ?? null,
      geocodedAt: row.geocodedAt ? row.geocodedAt.toISOString() : null,
      geocodeSource:
        row.geocodeSource === "manual" || row.geocodeSource === "ors"
          ? row.geocodeSource
          : null,
      archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      availability: sorted.map(mapRuleRow),
    },
  };
}

async function assertEmployeeForTenant(
  db: Db,
  tenantId: string,
  employeeId: string,
): Promise<typeof employees.$inferSelect | null> {
  const rows = await db
    .select()
    .from(employees)
    .where(
      and(eq(employees.id, employeeId), eq(employees.tenantId, tenantId)),
    )
    .limit(1);
  return rows[0] ?? null;
}

export function createEmployeesListHandler(getDb: () => Db | undefined) {
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

    const conditions: SQL[] = [eq(employees.tenantId, auth.tenantId)];
    if (!includeArchived) {
      conditions.push(isNull(employees.archivedAt));
    }
    if (qRaw.length > 0) {
      const pattern = `%${qRaw.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
      conditions.push(
        sql`(
          ${employees.displayName} ilike ${pattern} escape '\\'
          or coalesce(${employees.roleLabel}, '') ilike ${pattern} escape '\\'
          or coalesce(${employees.privateCity}, '') ilike ${pattern} escape '\\'
        )`,
      );
    }

    const [countRow] = await db
      .select({ n: sql<number>`cast(count(*) as int)` })
      .from(employees)
      .where(and(...conditions));

    const total = countRow?.n ?? 0;

    const rows = await db
      .select()
      .from(employees)
      .where(and(...conditions))
      .orderBy(asc(employees.displayName))
      .limit(limit)
      .offset(offset);

    const body = {
      employees: rows.map((r) => ({
        id: r.id,
        displayName: r.displayName,
        roleLabel: r.roleLabel ?? null,
        city: r.privateCity ?? null,
        hasGeo: r.latitude != null && r.longitude != null,
        archivedAt: r.archivedAt ? r.archivedAt.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      total,
    };

    const parsed = employeesListResponseSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "serialize_error" }, 500);
    }
    return c.json(parsed.data);
  };
}

export function createEmployeePostHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    const parsed = employeeCreateSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "validation_error" }, 400);
    }
    const p = parsed.data;
    const now = new Date();
    const hasCoords = p.latitude != null && p.longitude != null;

    const inserted = await db.transaction(async (tx) => {
      const [emp] = await tx
        .insert(employees)
        .values({
          tenantId: auth.tenantId,
          displayName: p.displayName,
          roleLabel: p.roleLabel ?? null,
          notes: p.notes ?? null,
          privateAddressLabel: p.privateAddressLabel ?? null,
          privateAddressLine2: p.privateAddressLine2 ?? null,
          privateRecipientName: p.privateRecipientName ?? null,
          privateStreet: p.privateStreet ?? null,
          privatePostalCode: p.privatePostalCode ?? null,
          privateCity: p.privateCity ?? null,
          privateCountry: p.privateCountry ?? null,
          latitude: p.latitude ?? null,
          longitude: p.longitude ?? null,
          geocodedAt: hasCoords ? now : null,
          geocodeSource: hasCoords ? (p.geocodeSource ?? "manual") : null,
          updatedAt: now,
        })
        .returning();

      if (!emp) {
        return null;
      }

      if (p.availability.length > 0) {
        await tx.insert(employeeAvailabilityRules).values(
          p.availability.map((rule) => ({
            employeeId: emp.id,
            weekday: rule.weekday,
            startTime: pgTime(rule.startTime),
            endTime: pgTime(rule.endTime),
            sortIndex: rule.sortIndex,
            updatedAt: now,
          })),
        );
      }

      return emp;
    });

    if (!inserted) {
      return c.json({ error: "insert_failed" }, 500);
    }

    const ruleRows = await db
      .select()
      .from(employeeAvailabilityRules)
      .where(eq(employeeAvailabilityRules.employeeId, inserted.id))
      .orderBy(
        asc(employeeAvailabilityRules.weekday),
        asc(employeeAvailabilityRules.sortIndex),
        asc(employeeAvailabilityRules.startTime),
      );

    const out = mapEmployeeDetail(inserted, ruleRows);
    const ok = employeeDetailResponseSchema.safeParse(out);
    if (!ok.success) {
      return c.json({ error: "serialize_error" }, 500);
    }
    return c.json(ok.data, 201);
  };
}

export function createEmployeeDetailHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }

    const id = c.req.param("id") ?? "";
    if (!UUID_RE.test(id)) {
      return c.json({ error: "not_found" }, 404);
    }

    const row = await assertEmployeeForTenant(db, auth.tenantId, id);
    if (!row) {
      return c.json({ error: "not_found" }, 404);
    }

    const ruleRows = await db
      .select()
      .from(employeeAvailabilityRules)
      .where(eq(employeeAvailabilityRules.employeeId, id))
      .orderBy(
        asc(employeeAvailabilityRules.weekday),
        asc(employeeAvailabilityRules.sortIndex),
        asc(employeeAvailabilityRules.startTime),
      );

    const out = mapEmployeeDetail(row, ruleRows);
    const ok = employeeDetailResponseSchema.safeParse(out);
    if (!ok.success) {
      return c.json({ error: "serialize_error" }, 500);
    }
    return c.json(ok.data);
  };
}

export function createEmployeePatchHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }

    const id = c.req.param("id") ?? "";
    if (!UUID_RE.test(id)) {
      return c.json({ error: "not_found" }, 404);
    }

    const row = await assertEmployeeForTenant(db, auth.tenantId, id);
    if (!row) {
      return c.json({ error: "not_found" }, 404);
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    const parsed = employeePatchSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "validation_error" }, 400);
    }
    const p = parsed.data;

    const now = new Date();
    const patch: Partial<typeof employees.$inferInsert> = {
      updatedAt: now,
    };

    if (p.displayName !== undefined) {
      patch.displayName = p.displayName;
    }
    if (p.roleLabel !== undefined) {
      patch.roleLabel = p.roleLabel;
    }
    if (p.notes !== undefined) {
      patch.notes = p.notes;
    }
    if (p.privateAddressLabel !== undefined) {
      patch.privateAddressLabel = p.privateAddressLabel;
    }
    if (p.privateAddressLine2 !== undefined) {
      patch.privateAddressLine2 = p.privateAddressLine2;
    }
    if (p.privateRecipientName !== undefined) {
      patch.privateRecipientName = p.privateRecipientName;
    }
    if (p.privateStreet !== undefined) {
      patch.privateStreet = p.privateStreet;
    }
    if (p.privatePostalCode !== undefined) {
      patch.privatePostalCode = p.privatePostalCode;
    }
    if (p.privateCity !== undefined) {
      patch.privateCity = p.privateCity;
    }
    if (p.privateCountry !== undefined) {
      patch.privateCountry = p.privateCountry;
    }

    let mergedLat = row.latitude ?? null;
    let mergedLng = row.longitude ?? null;
    if (p.latitude !== undefined) {
      mergedLat = p.latitude;
    }
    if (p.longitude !== undefined) {
      mergedLng = p.longitude;
    }

    if (p.latitude !== undefined || p.longitude !== undefined) {
      patch.latitude = mergedLat;
      patch.longitude = mergedLng;
      if (mergedLat != null && mergedLng != null) {
        patch.geocodedAt = now;
        patch.geocodeSource = p.geocodeSource ?? row.geocodeSource ?? "manual";
      } else {
        patch.geocodedAt = null;
        patch.geocodeSource = null;
      }
    } else if (p.geocodeSource !== undefined) {
      patch.geocodeSource = p.geocodeSource;
    }

    if (p.archived !== undefined) {
      patch.archivedAt = p.archived ? now : null;
    }

    await db.transaction(async (tx) => {
      await tx
        .update(employees)
        .set(patch)
        .where(
          and(eq(employees.id, id), eq(employees.tenantId, auth.tenantId)),
        );

      if (p.availability !== undefined) {
        await tx
          .delete(employeeAvailabilityRules)
          .where(eq(employeeAvailabilityRules.employeeId, id));
        if (p.availability.length > 0) {
          await tx.insert(employeeAvailabilityRules).values(
            p.availability.map((rule) => ({
              employeeId: id,
              weekday: rule.weekday,
              startTime: pgTime(rule.startTime),
              endTime: pgTime(rule.endTime),
              sortIndex: rule.sortIndex,
              updatedAt: now,
            })),
          );
        }
      }
    });

    const refreshed = await assertEmployeeForTenant(db, auth.tenantId, id);
    if (!refreshed) {
      return c.json({ error: "not_found" }, 404);
    }
    const ruleRows = await db
      .select()
      .from(employeeAvailabilityRules)
      .where(eq(employeeAvailabilityRules.employeeId, id))
      .orderBy(
        asc(employeeAvailabilityRules.weekday),
        asc(employeeAvailabilityRules.sortIndex),
        asc(employeeAvailabilityRules.startTime),
      );

    const out = mapEmployeeDetail(refreshed, ruleRows);
    const ok = employeeDetailResponseSchema.safeParse(out);
    if (!ok.success) {
      return c.json({ error: "serialize_error" }, 500);
    }
    return c.json(ok.data);
  };
}
