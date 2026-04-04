import { and, desc, eq } from "drizzle-orm";
import type { Context } from "hono";

import type { EmployeePatchInput } from "@repo/api-contracts";
import { employeeActivityListResponseSchema } from "@repo/api-contracts";

import {
  employeeActivityEvents,
  employeeAvailabilityOverrides,
  employeeAvailabilityRules,
  employees,
  type Db,
} from "@repo/db";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type EmployeeActivityAction =
  | "employee_created"
  | "employee_updated"
  | "employee_deleted"
  | "employee_skills_updated"
  | "employee_relationship_upserted"
  | "employee_relationship_deleted"
  | "employee_profile_image_updated"
  | "employee_profile_image_deleted"
  | "employee_attachment_uploaded"
  | "employee_attachment_deleted"
  | "vacation_requested"
  | "vacation_decided"
  | "sick_report_created";

function normalizeOptionalText(v: string | null | undefined): string | null {
  if (v === undefined || v === null) {
    return null;
  }
  const t = v.trim();
  return t === "" ? null : t;
}

function normTime(t: string): string {
  return t.length >= 8 ? t.slice(0, 5) : t;
}

function formatDateForCompare(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value);
}

function eqNullableString(a: string | null | undefined, b: string | null | undefined) {
  return normalizeOptionalText(a ?? undefined) === normalizeOptionalText(b ?? undefined);
}

function serializeAvailabilityFromDb(
  rules: readonly (typeof employeeAvailabilityRules.$inferSelect)[],
) {
  const normalized = [...rules].map((r) => ({
    weekday: r.weekday,
    startTime: normTime(String(r.startTime)),
    endTime: normTime(String(r.endTime)),
    crossesMidnight: Boolean(r.crossesMidnight),
    validFrom: r.validFrom ? formatDateForCompare(r.validFrom) : null,
    validTo: r.validTo ? formatDateForCompare(r.validTo) : null,
    sortIndex: r.sortIndex,
  }));
  normalized.sort((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y)));
  return JSON.stringify(normalized);
}

function serializeAvailabilityFromPatch(
  rules: NonNullable<EmployeePatchInput["availability"]>,
) {
  const normalized = [...rules].map((r) => ({
    weekday: r.weekday,
    startTime: normTime(r.startTime.length === 5 ? `${r.startTime}:00` : r.startTime),
    endTime: normTime(r.endTime.length === 5 ? `${r.endTime}:00` : r.endTime),
    crossesMidnight: r.crossesMidnight,
    validFrom: r.validFrom ?? null,
    validTo: r.validTo ?? null,
    sortIndex: r.sortIndex,
  }));
  normalized.sort((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y)));
  return JSON.stringify(normalized);
}

function serializeOverridesFromDb(
  rows: readonly (typeof employeeAvailabilityOverrides.$inferSelect)[],
) {
  const normalized = [...rows].map((r) => ({
    date: formatDateForCompare(r.date),
    isUnavailable: Boolean(r.isUnavailable),
    startTime: r.startTime ? normTime(String(r.startTime)) : null,
    endTime: r.endTime ? normTime(String(r.endTime)) : null,
    crossesMidnight: Boolean(r.crossesMidnight),
    sortIndex: r.sortIndex,
    note: r.note ?? null,
  }));
  normalized.sort((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y)));
  return JSON.stringify(normalized);
}

function serializeOverridesFromPatch(
  rows: NonNullable<EmployeePatchInput["availabilityOverrides"]>,
) {
  const normalized = rows.map((r) => ({
    date: r.date,
    isUnavailable: r.isUnavailable,
    startTime:
      r.startTime === null || r.startTime === undefined
        ? null
        : normTime(r.startTime.length === 5 ? `${r.startTime}:00` : r.startTime),
    endTime:
      r.endTime === null || r.endTime === undefined
        ? null
        : normTime(r.endTime.length === 5 ? `${r.endTime}:00` : r.endTime),
    crossesMidnight: r.crossesMidnight,
    sortIndex: r.sortIndex,
    note: r.note ?? null,
  }));
  normalized.sort((x, y) => JSON.stringify(x).localeCompare(JSON.stringify(y)));
  return JSON.stringify(normalized);
}

/** Ermittelt geänderte Bereiche für ein Audit-Event (ohne Werte, Datenschutz). */
export function collectEmployeePatchChangeKeys(
  row: typeof employees.$inferSelect,
  p: EmployeePatchInput,
  ruleRows: readonly (typeof employeeAvailabilityRules.$inferSelect)[],
  overrideRows: readonly (typeof employeeAvailabilityOverrides.$inferSelect)[],
): string[] {
  const keys: string[] = [];

  if (p.employeeNo !== undefined && !eqNullableString(p.employeeNo, row.employeeNo)) {
    keys.push("employeeNo");
  }
  if (p.firstName !== undefined && !eqNullableString(p.firstName, row.firstName)) {
    keys.push("firstName");
  }
  if (p.lastName !== undefined && !eqNullableString(p.lastName, row.lastName)) {
    keys.push("lastName");
  }
  if (p.email !== undefined && !eqNullableString(p.email, row.email)) {
    keys.push("email");
  }
  if (p.phone !== undefined && !eqNullableString(p.phone, row.phone)) {
    keys.push("phone");
  }
  if (p.status !== undefined && p.status !== row.status) {
    keys.push("status");
  }
  if (p.employmentType !== undefined && p.employmentType !== row.employmentType) {
    keys.push("employmentType");
  }
  if (
    p.availabilityTimeZone !== undefined &&
    p.availabilityTimeZone.trim() !== (row.availabilityTimeZone?.trim() || "Europe/Berlin")
  ) {
    keys.push("availabilityTimeZone");
  }
  if (p.displayName !== undefined && p.displayName.trim() !== row.displayName) {
    keys.push("displayName");
  }
  if (p.roleLabel !== undefined && !eqNullableString(p.roleLabel, row.roleLabel)) {
    keys.push("roleLabel");
  }
  if (p.notes !== undefined && !eqNullableString(p.notes, row.notes)) {
    keys.push("notes");
  }
  if (
    p.privateAddressLabel !== undefined &&
    !eqNullableString(p.privateAddressLabel, row.privateAddressLabel)
  ) {
    keys.push("privateAddressLabel");
  }
  if (
    p.privateAddressLine2 !== undefined &&
    !eqNullableString(p.privateAddressLine2, row.privateAddressLine2)
  ) {
    keys.push("privateAddressLine2");
  }
  if (
    p.privateRecipientName !== undefined &&
    !eqNullableString(p.privateRecipientName, row.privateRecipientName)
  ) {
    keys.push("privateRecipientName");
  }
  if (p.privateStreet !== undefined && !eqNullableString(p.privateStreet, row.privateStreet)) {
    keys.push("privateStreet");
  }
  if (
    p.privatePostalCode !== undefined &&
    !eqNullableString(p.privatePostalCode, row.privatePostalCode)
  ) {
    keys.push("privatePostalCode");
  }
  if (p.privateCity !== undefined && !eqNullableString(p.privateCity, row.privateCity)) {
    keys.push("privateCity");
  }
  if (p.privateCountry !== undefined) {
    const next =
      p.privateCountry === null
        ? null
        : p.privateCountry.trim().toUpperCase() || null;
    const prev = row.privateCountry?.trim().toUpperCase() || null;
    if (next !== prev) {
      keys.push("privateCountry");
    }
  }

  if (p.latitude !== undefined || p.longitude !== undefined) {
    const nextLat = p.latitude !== undefined ? p.latitude : row.latitude;
    const nextLng = p.longitude !== undefined ? p.longitude : row.longitude;
    if (nextLat !== row.latitude || nextLng !== row.longitude) {
      keys.push("coordinates");
    }
  } else if (p.geocodeSource !== undefined && p.geocodeSource !== row.geocodeSource) {
    keys.push("geocodeSource");
  }

  if (p.archived !== undefined) {
    const wasArchived = Boolean(row.archivedAt);
    if (p.archived !== wasArchived) {
      keys.push("archived");
    }
  }

  if (p.availability !== undefined) {
    const prev = serializeAvailabilityFromDb(ruleRows);
    const next = serializeAvailabilityFromPatch(p.availability);
    if (prev !== next) {
      keys.push("availability");
    }
  }
  if (p.availabilityOverrides !== undefined) {
    const prev = serializeOverridesFromDb(overrideRows);
    const next = serializeOverridesFromPatch(p.availabilityOverrides);
    if (prev !== next) {
      keys.push("availabilityOverrides");
    }
  }

  return keys;
}

export async function insertEmployeeActivityEvent(
  db: Db,
  args: {
    tenantId: string;
    employeeId: string;
    actorSub: string;
    action: EmployeeActivityAction;
    detail?: Record<string, unknown> | null;
  },
) {
  await db.insert(employeeActivityEvents).values({
    tenantId: args.tenantId,
    employeeId: args.employeeId,
    actorSub: args.actorSub,
    action: args.action,
    detail: args.detail ?? null,
  });
}

function mapActivityRow(r: typeof employeeActivityEvents.$inferSelect) {
  return {
    id: r.id,
    action: r.action,
    actorSub: r.actorSub,
    detail:
      r.detail && typeof r.detail === "object" && !Array.isArray(r.detail)
        ? (r.detail as Record<string, unknown>)
        : null,
    createdAt: r.createdAt.toISOString(),
  };
}

export function createEmployeeActivityListHandler(getDb: () => Db | undefined) {
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

    const [emp] = await db
      .select({ id: employees.id })
      .from(employees)
      .where(and(eq(employees.id, id), eq(employees.tenantId, auth.tenantId)))
      .limit(1);
    if (!emp) {
      return c.json({ error: "not_found" }, 404);
    }

    let limit = 50;
    const limitRaw = c.req.query("limit");
    if (limitRaw !== undefined && limitRaw !== "") {
      const n = Number(limitRaw);
      if (Number.isFinite(n)) {
        limit = Math.min(200, Math.max(1, Math.trunc(n)));
      }
    }

    const rows = await db
      .select()
      .from(employeeActivityEvents)
      .where(
        and(
          eq(employeeActivityEvents.tenantId, auth.tenantId),
          eq(employeeActivityEvents.employeeId, id),
        ),
      )
      .orderBy(desc(employeeActivityEvents.createdAt))
      .limit(limit);

    const body = { events: rows.map(mapActivityRow) };
    const parsed = employeeActivityListResponseSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "serialize_error" }, 500);
    }
    return c.json(parsed.data);
  };
}
