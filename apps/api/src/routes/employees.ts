import { createHash, randomUUID } from "node:crypto";
import { Readable } from "node:stream";

import type { SQL } from "drizzle-orm";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Context, Handler } from "hono";
import type { ZodError } from "zod";

import {
  employeeAttachmentKindSchema,
  employeeAttachmentsListResponseSchema,
  employeeCreateSchema,
  employeeProfileImageResponseSchema,
  employeeRelationshipUpsertSchema,
  employeeRelationshipsListResponseSchema,
  employeeSkillCatalogCreateSchema,
  employeeSkillCatalogListResponseSchema,
  employeeSkillLinksPatchSchema,
  employeeSkillLinksResponseSchema,
  employeeSickCreateSchema,
  employeeSickListResponseSchema,
  employeeStatusSchema,
  employeeDetailResponseSchema,
  employeeVacationCreateSchema,
  employeeVacationDecisionPatchSchema,
  employeeVacationListResponseSchema,
  employeePatchSchema,
  employeesBatchArchiveRequestSchema,
  employeesBatchArchiveResponseSchema,
  employeesListResponseSchema,
} from "@repo/api-contracts";

import {
  employeeAttachments,
  employeeAvailabilityOverrides,
  employeeAvailabilityRules,
  employeeRelationships,
  employeeSickReports,
  employeeSkillLinks,
  employeeSkillsCatalog,
  employeeVacationRequests,
  employees,
  type Db,
} from "@repo/db";

import {
  canCreateSickConfidential,
  canDecideVacation,
  canDeleteEmployees,
  canEditEmployees,
  canViewSickConfidential,
} from "../auth/permissions.js";
import {
  collectEmployeePatchChangeKeys,
  insertEmployeeActivityEvent,
} from "./employee-activity-log.js";
import { resolveProjectAssetsRoot } from "../env.js";
import {
  createAssetReadStream,
  removeAssetFile,
  writeAssetFile,
} from "../project-assets-storage.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PROFILE_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
const PROFILE_IMAGE_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const EMPLOYEE_ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;
const EMPLOYEE_ATTACHMENT_CONTENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function safePathSegment(s: string): string {
  const cleaned = s.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
  return cleaned.length > 0 ? cleaned : "x";
}

function sanitizeDisplayFilename(name: string): string {
  const base = name.replace(/\\/g, "/").split("/").pop() ?? "upload";
  const trimmed = base.trim().slice(0, 255);
  return trimmed.length > 0 ? trimmed : "upload";
}

function employeeVersionToken(row: { id: string; updatedAt: Date }): string {
  return `${row.id}:${row.updatedAt.getTime()}`;
}

function employeeEtag(row: { id: string; updatedAt: Date }): string {
  return `"${employeeVersionToken(row)}"`;
}

function parseIfMatchToken(v: string | undefined): string | null {
  if (!v) return null;
  const first = v.split(",")[0]?.trim();
  if (!first) return null;
  if (first === "*") return "*";
  const unprefixed = first.startsWith("W/") ? first.slice(2).trim() : first;
  if (unprefixed.startsWith('"') && unprefixed.endsWith('"')) {
    return unprefixed.slice(1, -1);
  }
  return unprefixed;
}

function jsonEmployeeValidationError(err: ZodError) {
  return {
    error: "validation_error" as const,
    issues: err.issues.map((issue) => ({
      path: issue.path.map((p) => String(p)),
      message: issue.message,
    })),
  };
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "23505"
  );
}

function normalizeOptionalText(v: string | null | undefined): string | null {
  if (v === undefined || v === null) {
    return null;
  }
  const t = v.trim();
  return t === "" ? null : t;
}

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

function formatDateForApi(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
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
  crossesMidnight: boolean;
  validFrom: string | null;
  validTo: string | null;
  sortIndex: number;
  createdAt: string;
  updatedAt: string;
} {
  return {
    id: r.id,
    weekday: r.weekday,
    startTime: formatTimeForApi(r.startTime),
    endTime: formatTimeForApi(r.endTime),
    crossesMidnight: Boolean(r.crossesMidnight),
    validFrom: r.validFrom ? formatDateForApi(r.validFrom) : null,
    validTo: r.validTo ? formatDateForApi(r.validTo) : null,
    sortIndex: r.sortIndex,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

function mapOverrideRow(
  r: typeof employeeAvailabilityOverrides.$inferSelect,
): {
  id: string;
  date: string;
  isUnavailable: boolean;
  startTime: string | null;
  endTime: string | null;
  crossesMidnight: boolean;
  sortIndex: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
} {
  return {
    id: r.id,
    date: formatDateForApi(r.date),
    isUnavailable: Boolean(r.isUnavailable),
    startTime: r.startTime ? formatTimeForApi(r.startTime) : null,
    endTime: r.endTime ? formatTimeForApi(r.endTime) : null,
    crossesMidnight: Boolean(r.crossesMidnight),
    sortIndex: r.sortIndex,
    note: r.note ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

function mapSkillRow(r: typeof employeeSkillsCatalog.$inferSelect) {
  return {
    id: r.id,
    name: r.name,
    archivedAt: r.archivedAt ? r.archivedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

function mapRelationshipRow(
  r: typeof employeeRelationships.$inferSelect,
  counterpartDisplayName: string | null,
) {
  return {
    id: r.id,
    fromEmployeeId: r.fromEmployeeId,
    toEmployeeId: r.toEmployeeId,
    kind:
      r.kind === "MUTUALLY_EXCLUSIVE" || r.kind === "MENTOR_TRAINEE"
        ? r.kind
        : "MUTUALLY_EXCLUSIVE",
    note: r.note ?? null,
    counterpartDisplayName,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

function mapAttachmentRow(r: typeof employeeAttachments.$inferSelect) {
  return {
    id: r.id,
    employeeId: r.employeeId,
    kind:
      r.kind === "document" || r.kind === "certificate" || r.kind === "other"
        ? r.kind
        : "document",
    filename: r.filename,
    contentType: r.contentType,
    byteSize: r.byteSize,
    sha256: r.sha256 ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

function profileImageStoragePathFor(
  tenantId: string,
  employeeId: string,
  contentType: string,
): string {
  const ext =
    contentType === "image/jpeg"
      ? ".jpg"
      : contentType === "image/png"
        ? ".png"
        : contentType === "image/webp"
          ? ".webp"
          : "";
  return [
    safePathSegment(tenantId),
    "employees",
    safePathSegment(employeeId),
    `profile${ext}`,
  ].join("/");
}

function attachmentStoragePathFor(
  tenantId: string,
  employeeId: string,
  attachmentId: string,
): string {
  return [
    safePathSegment(tenantId),
    "employees",
    safePathSegment(employeeId),
    "attachments",
    safePathSegment(attachmentId),
  ].join("/");
}

function mapEmployeeDetail(
  row: typeof employees.$inferSelect,
  rules: readonly typeof employeeAvailabilityRules.$inferSelect[],
  overrides: readonly typeof employeeAvailabilityOverrides.$inferSelect[],
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
    canDecideVacation: boolean;
    canViewSickConfidential: boolean;
    canCreateSickConfidential: boolean;
  },
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
  const sortedOverrides = [...overrides].sort((a, b) => {
    const d = String(a.date).localeCompare(String(b.date));
    if (d !== 0) {
      return d;
    }
    if (a.sortIndex !== b.sortIndex) {
      return a.sortIndex - b.sortIndex;
    }
    return String(a.startTime ?? "").localeCompare(String(b.startTime ?? ""));
  });
  return {
    employee: {
      id: row.id,
      employeeNo: row.employeeNo ?? null,
      firstName: row.firstName ?? null,
      lastName: row.lastName ?? null,
      email: row.email ?? null,
      phone: row.phone ?? null,
      status:
        row.status === "ACTIVE" || row.status === "ONBOARDING" || row.status === "INACTIVE"
          ? row.status
          : "ACTIVE",
      employmentType:
        row.employmentType === "FULL_TIME" ||
        row.employmentType === "PART_TIME" ||
        row.employmentType === "CONTRACTOR" ||
        row.employmentType === "APPRENTICE"
          ? row.employmentType
          : "FULL_TIME",
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
      profileImageContentType: row.profileImageContentType ?? null,
      hasProfileImage: Boolean(row.profileImageStorageRelativePath),
      archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      availabilityTimeZone:
        row.availabilityTimeZone?.trim() || "Europe/Berlin",
      availability: sorted.map(mapRuleRow),
      availabilityOverrides: sortedOverrides.map(mapOverrideRow),
    },
    permissions,
  };
}

function mapVacationRow(r: typeof employeeVacationRequests.$inferSelect) {
  return {
    id: r.id,
    employeeId: r.employeeId,
    fromDate: String(r.fromDate),
    toDate: String(r.toDate),
    reason: r.reason ?? null,
    status:
      r.status === "pending" || r.status === "approved" || r.status === "rejected"
        ? r.status
        : "pending",
    decisionNote: r.decisionNote ?? null,
    decidedBy: r.decidedBy ?? null,
    decidedAt: r.decidedAt ? r.decidedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

function mapSickRow(
  r: typeof employeeSickReports.$inferSelect,
  canViewConfidential: boolean,
) {
  const hasConfidentialNote = Boolean(r.confidentialNote?.trim());
  const confidentialNote = canViewConfidential ? (r.confidentialNote ?? null) : null;
  return {
    id: r.id,
    employeeId: r.employeeId,
    fromDate: String(r.fromDate),
    toDate: String(r.toDate),
    confidentialNote,
    confidentialNoteRedacted: !canViewConfidential && hasConfidentialNote,
    certificateRequired: Boolean(r.certificateRequired),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

function mapEmployeePermissions(auth: { roles: string[]; sub: string; tenantId: string }) {
  return {
    canEdit: canEditEmployees(auth),
    canDelete: canDeleteEmployees(auth),
    canDecideVacation: canDecideVacation(auth),
    canViewSickConfidential: canViewSickConfidential(auth),
    canCreateSickConfidential: canCreateSickConfidential(auth),
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

type ParsedEmployeeListQuery = {
  qRaw: string;
  includeArchived: boolean;
  statusParsed: ReturnType<typeof employeeStatusSchema.safeParse>;
  limit: number;
  offset: number;
};

function parseEmployeeListQuery(c: Context): ParsedEmployeeListQuery {
  const qRaw = c.req.query("q")?.trim() ?? "";
  const includeArchived =
    c.req.query("includeArchived") === "1" ||
    c.req.query("includeArchived") === "true";
  const statusRaw = c.req.query("status")?.trim() ?? "";
  const statusParsed = employeeStatusSchema.safeParse(statusRaw);

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

  return {
    qRaw,
    includeArchived,
    statusParsed,
    limit,
    offset,
  };
}

function buildEmployeeListConditions(
  tenantId: string,
  parsed: ParsedEmployeeListQuery,
): SQL[] {
  const conditions: SQL[] = [eq(employees.tenantId, tenantId)];
  if (!parsed.includeArchived) {
    conditions.push(isNull(employees.archivedAt));
  }
  if (parsed.statusParsed.success) {
    conditions.push(eq(employees.status, parsed.statusParsed.data));
  }
  if (parsed.qRaw.length > 0) {
    const pattern = `%${parsed.qRaw.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
    conditions.push(
      sql`(
          ${employees.displayName} ilike ${pattern} escape '\\'
          or coalesce(${employees.employeeNo}, '') ilike ${pattern} escape '\\'
          or coalesce(${employees.firstName}, '') ilike ${pattern} escape '\\'
          or coalesce(${employees.lastName}, '') ilike ${pattern} escape '\\'
          or coalesce(${employees.roleLabel}, '') ilike ${pattern} escape '\\'
          or coalesce(${employees.privateCity}, '') ilike ${pattern} escape '\\'
        )`,
    );
  }
  return conditions;
}

function csvEscapeCell(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

const EMPLOYEE_EXPORT_MAX_ROWS = 10_000;

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

    const parsedQuery = parseEmployeeListQuery(c);
    const conditions = buildEmployeeListConditions(auth.tenantId, parsedQuery);

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
      .limit(parsedQuery.limit)
      .offset(parsedQuery.offset);

    const body = {
      employees: rows.map((r) => ({
        id: r.id,
        employeeNo: r.employeeNo ?? null,
        firstName: r.firstName ?? null,
        lastName: r.lastName ?? null,
        status:
          r.status === "ACTIVE" || r.status === "ONBOARDING" || r.status === "INACTIVE"
            ? r.status
            : "ACTIVE",
        employmentType:
          r.employmentType === "FULL_TIME" ||
          r.employmentType === "PART_TIME" ||
          r.employmentType === "CONTRACTOR" ||
          r.employmentType === "APPRENTICE"
            ? r.employmentType
            : "FULL_TIME",
        displayName: r.displayName,
        roleLabel: r.roleLabel ?? null,
        city: r.privateCity ?? null,
        hasGeo: r.latitude != null && r.longitude != null,
        archivedAt: r.archivedAt ? r.archivedAt.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      total,
      permissions: {
        canEdit: canEditEmployees(auth),
      },
    };

    const parsed = employeesListResponseSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "serialize_error" }, 500);
    }
    return c.json(parsed.data);
  };
}

export function createEmployeesExportHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }

    const parsedQuery = parseEmployeeListQuery(c);
    const conditions = buildEmployeeListConditions(auth.tenantId, parsedQuery);

    const rows = await db
      .select()
      .from(employees)
      .where(and(...conditions))
      .orderBy(asc(employees.displayName))
      .limit(EMPLOYEE_EXPORT_MAX_ROWS);

    const header = [
      "id",
      "employeeNo",
      "firstName",
      "lastName",
      "displayName",
      "status",
      "employmentType",
      "roleLabel",
      "city",
      "hasGeo",
      "archivedAt",
      "createdAt",
      "updatedAt",
    ].join(",");

    const dataLines = rows.map((r) =>
      [
        csvEscapeCell(r.id),
        csvEscapeCell(r.employeeNo ?? ""),
        csvEscapeCell(r.firstName ?? ""),
        csvEscapeCell(r.lastName ?? ""),
        csvEscapeCell(r.displayName),
        csvEscapeCell(
          r.status === "ACTIVE" || r.status === "ONBOARDING" || r.status === "INACTIVE"
            ? r.status
            : "ACTIVE",
        ),
        csvEscapeCell(
          r.employmentType === "FULL_TIME" ||
            r.employmentType === "PART_TIME" ||
            r.employmentType === "CONTRACTOR" ||
            r.employmentType === "APPRENTICE"
            ? r.employmentType
            : "FULL_TIME",
        ),
        csvEscapeCell(r.roleLabel ?? ""),
        csvEscapeCell(r.privateCity ?? ""),
        csvEscapeCell(r.latitude != null && r.longitude != null ? "true" : "false"),
        csvEscapeCell(r.archivedAt ? r.archivedAt.toISOString() : ""),
        csvEscapeCell(r.createdAt.toISOString()),
        csvEscapeCell(r.updatedAt.toISOString()),
      ].join(","),
    );

    const csv = "\ufeff" + [header, ...dataLines].join("\r\n");
    c.header("Content-Type", "text/csv; charset=utf-8");
    c.header("Content-Disposition", 'attachment; filename="employees-export.csv"');
    c.header("Cache-Control", "private, no-store");
    return c.text(csv, 200);
  };
}

export function createEmployeesBatchArchiveHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    if (!canEditEmployees(auth)) {
      return c.json({ error: "forbidden" }, 403);
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

    const parsedBody = employeesBatchArchiveRequestSchema.safeParse(body);
    if (!parsedBody.success) {
      return c.json({ error: "validation_error" }, 400);
    }

    const { employeeIds, archived } = parsedBody.data;
    const uniqueIds = [...new Set(employeeIds)];

    const detailRows = await db
      .select({ id: employees.id, archivedAt: employees.archivedAt })
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, auth.tenantId),
          inArray(employees.id, uniqueIds),
        ),
      );

    const foundIdSet = new Set(detailRows.map((r) => r.id));
    const notFoundIds = uniqueIds.filter((id) => !foundIdSet.has(id));

    const toUpdate = detailRows.filter((r) => {
      const isArchived = r.archivedAt != null;
      return isArchived !== archived;
    });

    if (toUpdate.length === 0) {
      const out = {
        updated: 0,
        ...(notFoundIds.length > 0 ? { notFoundIds } : {}),
      };
      const ok = employeesBatchArchiveResponseSchema.safeParse(out);
      if (!ok.success) {
        return c.json({ error: "serialize_error" }, 500);
      }
      return c.json(ok.data);
    }

    const now = new Date();
    const touchIds = toUpdate.map((r) => r.id);

    await db.transaction(async (tx) => {
      await tx
        .update(employees)
        .set({
          archivedAt: archived ? now : null,
          updatedAt: now,
        })
        .where(
          and(
            eq(employees.tenantId, auth.tenantId),
            inArray(employees.id, touchIds),
          ),
        );

      for (const employeeId of touchIds) {
        await insertEmployeeActivityEvent(tx, {
          tenantId: auth.tenantId,
          employeeId,
          actorSub: auth.sub,
          action: "employee_updated",
          detail: { changedKeys: ["archived"], batch: true },
        });
      }
    });

    const responseBody = {
      updated: touchIds.length,
      ...(notFoundIds.length > 0 ? { notFoundIds } : {}),
    };
    const ok = employeesBatchArchiveResponseSchema.safeParse(responseBody);
    if (!ok.success) {
      return c.json({ error: "serialize_error" }, 500);
    }
    return c.json(ok.data);
  };
}

export function createEmployeeSkillCatalogListHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) return c.json({ error: "missing_auth" }, 500);
    const db = getDb();
    if (!db) return c.json({ error: "database_unavailable" }, 503);

    const rows = await db
      .select()
      .from(employeeSkillsCatalog)
      .where(
        and(
          eq(employeeSkillsCatalog.tenantId, auth.tenantId),
          isNull(employeeSkillsCatalog.archivedAt),
        ),
      )
      .orderBy(asc(employeeSkillsCatalog.name));
    const body = { skills: rows.map(mapSkillRow) };
    const parsed = employeeSkillCatalogListResponseSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "serialize_error" }, 500);
    }
    return c.json(parsed.data);
  };
}

export function createEmployeeSkillCatalogPostHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) return c.json({ error: "missing_auth" }, 500);
    if (!canEditEmployees(auth)) return c.json({ error: "forbidden" }, 403);
    const db = getDb();
    if (!db) return c.json({ error: "database_unavailable" }, 503);

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    const parsed = employeeSkillCatalogCreateSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "validation_error" }, 400);
    }

    const now = new Date();
    const name = parsed.data.name.trim();
    try {
      const [inserted] = await db
        .insert(employeeSkillsCatalog)
        .values({
          tenantId: auth.tenantId,
          name,
          updatedAt: now,
        })
        .returning();
      if (!inserted) {
        return c.json({ error: "insert_failed" }, 500);
      }
      return c.json({ skill: mapSkillRow(inserted) }, 201);
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      const existing = await db
        .select()
        .from(employeeSkillsCatalog)
        .where(
          and(
            eq(employeeSkillsCatalog.tenantId, auth.tenantId),
            eq(employeeSkillsCatalog.name, name),
          ),
        )
        .limit(1);
      const row = existing[0];
      if (!row) return c.json({ error: "insert_failed" }, 500);
      return c.json({ skill: mapSkillRow(row) });
    }
  };
}

export function createEmployeeSkillLinksGetHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) return c.json({ error: "missing_auth" }, 500);
    const db = getDb();
    if (!db) return c.json({ error: "database_unavailable" }, 503);

    const id = c.req.param("id") ?? "";
    if (!UUID_RE.test(id)) return c.json({ error: "not_found" }, 404);
    const row = await assertEmployeeForTenant(db, auth.tenantId, id);
    if (!row) return c.json({ error: "not_found" }, 404);

    const links = await db
      .select({ skillId: employeeSkillLinks.skillId })
      .from(employeeSkillLinks)
      .where(eq(employeeSkillLinks.employeeId, id));
    const body = { selectedSkillIds: links.map((l) => l.skillId) };
    const parsed = employeeSkillLinksResponseSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: "serialize_error" }, 500);
    return c.json(parsed.data);
  };
}

export function createEmployeeSkillLinksPutHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) return c.json({ error: "missing_auth" }, 500);
    if (!canEditEmployees(auth)) return c.json({ error: "forbidden" }, 403);
    const db = getDb();
    if (!db) return c.json({ error: "database_unavailable" }, 503);

    const id = c.req.param("id") ?? "";
    if (!UUID_RE.test(id)) return c.json({ error: "not_found" }, 404);
    const employee = await assertEmployeeForTenant(db, auth.tenantId, id);
    if (!employee) return c.json({ error: "not_found" }, 404);

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    const parsed = employeeSkillLinksPatchSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: "validation_error" }, 400);

    const uniqueSkillIds = [...new Set(parsed.data.skillIds)];
    if (uniqueSkillIds.length > 0) {
      const skillRows = await db
        .select({ id: employeeSkillsCatalog.id })
        .from(employeeSkillsCatalog)
        .where(
          and(
            eq(employeeSkillsCatalog.tenantId, auth.tenantId),
            inArray(employeeSkillsCatalog.id, uniqueSkillIds),
            isNull(employeeSkillsCatalog.archivedAt),
          ),
        );
      if (skillRows.length !== uniqueSkillIds.length) {
        return c.json({ error: "validation_error", code: "invalid_skill_ids" }, 400);
      }
    }

    const now = new Date();
    await db.transaction(async (tx) => {
      await tx
        .delete(employeeSkillLinks)
        .where(eq(employeeSkillLinks.employeeId, id));
      if (uniqueSkillIds.length > 0) {
        await tx.insert(employeeSkillLinks).values(
          uniqueSkillIds.map((skillId) => ({
            employeeId: id,
            skillId,
          })),
        );
      }
      await tx
        .update(employees)
        .set({ updatedAt: now })
        .where(and(eq(employees.id, id), eq(employees.tenantId, auth.tenantId)));
      await insertEmployeeActivityEvent(tx, {
        tenantId: auth.tenantId,
        employeeId: id,
        actorSub: auth.sub,
        action: "employee_skills_updated",
        detail: { count: uniqueSkillIds.length },
      });
    });

    return c.json({ selectedSkillIds: uniqueSkillIds });
  };
}

export function createEmployeeRelationshipsListHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) return c.json({ error: "missing_auth" }, 500);
    const db = getDb();
    if (!db) return c.json({ error: "database_unavailable" }, 503);

    const id = c.req.param("id") ?? "";
    if (!UUID_RE.test(id)) return c.json({ error: "not_found" }, 404);
    const employee = await assertEmployeeForTenant(db, auth.tenantId, id);
    if (!employee) return c.json({ error: "not_found" }, 404);

    const rows = await db
      .select()
      .from(employeeRelationships)
      .where(
        and(
          eq(employeeRelationships.tenantId, auth.tenantId),
          sql`${employeeRelationships.fromEmployeeId} = ${id} or ${employeeRelationships.toEmployeeId} = ${id}`,
        ),
      )
      .orderBy(desc(employeeRelationships.updatedAt), desc(employeeRelationships.createdAt));
    const counterpartIds = rows.map((r) =>
      r.fromEmployeeId === id ? r.toEmployeeId : r.fromEmployeeId,
    );
    const uniqueCounterpartIds = [...new Set(counterpartIds)];
    const counterpartRows =
      uniqueCounterpartIds.length === 0
        ? []
        : await db
            .select({ id: employees.id, displayName: employees.displayName })
            .from(employees)
            .where(
              and(
                eq(employees.tenantId, auth.tenantId),
                inArray(employees.id, uniqueCounterpartIds),
              ),
            );
    const displayById = new Map(counterpartRows.map((r) => [r.id, r.displayName]));
    const body = {
      relationships: rows.map((r) =>
        mapRelationshipRow(
          r,
          displayById.get(r.fromEmployeeId === id ? r.toEmployeeId : r.fromEmployeeId) ??
            null,
        ),
      ),
    };
    const parsed = employeeRelationshipsListResponseSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: "serialize_error" }, 500);
    return c.json(parsed.data);
  };
}

export function createEmployeeRelationshipUpsertHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) return c.json({ error: "missing_auth" }, 500);
    if (!canEditEmployees(auth)) return c.json({ error: "forbidden" }, 403);
    const db = getDb();
    if (!db) return c.json({ error: "database_unavailable" }, 503);

    const employeeId = c.req.param("id") ?? "";
    if (!UUID_RE.test(employeeId)) return c.json({ error: "not_found" }, 404);
    const employee = await assertEmployeeForTenant(db, auth.tenantId, employeeId);
    if (!employee) return c.json({ error: "not_found" }, 404);

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    const parsed = employeeRelationshipUpsertSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: "validation_error" }, 400);

    if (parsed.data.toEmployeeId === employeeId) {
      return c.json({ error: "validation_error", code: "self_relationship" }, 400);
    }
    const target = await assertEmployeeForTenant(db, auth.tenantId, parsed.data.toEmployeeId);
    if (!target) return c.json({ error: "validation_error", code: "target_not_found" }, 400);

    const now = new Date();
    const kind = parsed.data.kind;
    const canonicalPair: [string, string] =
      kind === "MUTUALLY_EXCLUSIVE"
        ? ([employeeId, parsed.data.toEmployeeId].sort((a, b) =>
            a.localeCompare(b),
          ) as [string, string])
        : [employeeId, parsed.data.toEmployeeId];
    const [fromEmployeeId, toEmployeeId] = canonicalPair;
    const note = parsed.data.note ?? null;

    const [upserted] = await db
      .insert(employeeRelationships)
      .values([
        {
          tenantId: auth.tenantId,
          fromEmployeeId,
          toEmployeeId,
          kind,
          note,
          updatedAt: now,
        },
      ])
      .onConflictDoUpdate({
        target: [
          employeeRelationships.tenantId,
          employeeRelationships.fromEmployeeId,
          employeeRelationships.toEmployeeId,
          employeeRelationships.kind,
        ],
        set: {
          note,
          updatedAt: now,
        },
      })
      .returning();

    if (!upserted) return c.json({ error: "insert_failed" }, 500);

    await db
      .update(employees)
      .set({ updatedAt: now })
      .where(
        and(
          eq(employees.tenantId, auth.tenantId),
          inArray(employees.id, [fromEmployeeId, toEmployeeId]),
        ),
      );

    await insertEmployeeActivityEvent(db, {
      tenantId: auth.tenantId,
      employeeId,
      actorSub: auth.sub,
      action: "employee_relationship_upserted",
      detail: {
        relationshipId: upserted.id,
        kind: upserted.kind,
        counterpartEmployeeId:
          upserted.fromEmployeeId === employeeId
            ? upserted.toEmployeeId
            : upserted.fromEmployeeId,
      },
    });

    const counterpartId =
      upserted.fromEmployeeId === employeeId
        ? upserted.toEmployeeId
        : upserted.fromEmployeeId;
    return c.json(
      mapRelationshipRow(
        upserted,
        counterpartId === target.id ? target.displayName : employee.displayName,
      ),
    );
  };
}

export function createEmployeeRelationshipDeleteHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) return c.json({ error: "missing_auth" }, 500);
    if (!canEditEmployees(auth)) return c.json({ error: "forbidden" }, 403);
    const db = getDb();
    if (!db) return c.json({ error: "database_unavailable" }, 503);

    const employeeId = c.req.param("id") ?? "";
    const relationshipId = c.req.param("relationshipId") ?? "";
    if (!UUID_RE.test(employeeId) || !UUID_RE.test(relationshipId)) {
      return c.json({ error: "not_found" }, 404);
    }
    const employee = await assertEmployeeForTenant(db, auth.tenantId, employeeId);
    if (!employee) return c.json({ error: "not_found" }, 404);

    const deleted = await db
      .delete(employeeRelationships)
      .where(
        and(
          eq(employeeRelationships.id, relationshipId),
          eq(employeeRelationships.tenantId, auth.tenantId),
          sql`${employeeRelationships.fromEmployeeId} = ${employeeId} or ${employeeRelationships.toEmployeeId} = ${employeeId}`,
        ),
      )
      .returning();
    const row = deleted[0];
    if (!row) return c.json({ error: "not_found" }, 404);

    const now = new Date();
    await db
      .update(employees)
      .set({ updatedAt: now })
      .where(
        and(
          eq(employees.tenantId, auth.tenantId),
          inArray(employees.id, [row.fromEmployeeId, row.toEmployeeId]),
        ),
      );
    await insertEmployeeActivityEvent(db, {
      tenantId: auth.tenantId,
      employeeId,
      actorSub: auth.sub,
      action: "employee_relationship_deleted",
      detail: {
        relationshipId,
        kind: row.kind,
      },
    });
    return c.body(null, 204);
  };
}

export function createEmployeeProfileImageGetHandler(
  getDb: () => Db | undefined,
): Handler {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) return c.json({ error: "missing_auth" }, 500);
    const db = getDb();
    if (!db) return c.json({ error: "database_unavailable" }, 503);
    const root = resolveProjectAssetsRoot();
    if (!root) return c.json({ error: "project_assets_storage_unconfigured" }, 503);

    const id = c.req.param("id") ?? "";
    if (!UUID_RE.test(id)) return c.json({ error: "not_found" }, 404);
    const employee = await assertEmployeeForTenant(db, auth.tenantId, id);
    if (!employee || !employee.profileImageStorageRelativePath || !employee.profileImageContentType) {
      return c.body(null, 404);
    }
    try {
      const stream = createAssetReadStream(root, employee.profileImageStorageRelativePath);
      const web = Readable.toWeb(stream) as ReadableStream;
      return new Response(web, {
        headers: {
          "Content-Type": employee.profileImageContentType,
          "Cache-Control": "private, no-store",
        },
      });
    } catch {
      return c.json({ error: "storage_read_failed" }, 500);
    }
  };
}

export function createEmployeeProfileImagePostHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) return c.json({ error: "missing_auth" }, 500);
    if (!canEditEmployees(auth)) return c.json({ error: "forbidden" }, 403);
    const db = getDb();
    if (!db) return c.json({ error: "database_unavailable" }, 503);
    const root = resolveProjectAssetsRoot();
    if (!root) return c.json({ error: "project_assets_storage_unconfigured" }, 503);

    const id = c.req.param("id") ?? "";
    if (!UUID_RE.test(id)) return c.json({ error: "not_found" }, 404);
    const employee = await assertEmployeeForTenant(db, auth.tenantId, id);
    if (!employee) return c.json({ error: "not_found" }, 404);

    let body: Record<string, unknown>;
    try {
      body = await c.req.parseBody({ all: false });
    } catch {
      return c.json({ error: "invalid_multipart" }, 400);
    }
    const file = body["file"];
    if (!(file instanceof File)) return c.json({ error: "missing_file" }, 400);
    if (file.size > PROFILE_IMAGE_MAX_BYTES) {
      return c.json({ error: "file_too_large", maxBytes: PROFILE_IMAGE_MAX_BYTES }, 413);
    }
    const contentType = (file.type || "application/octet-stream").toLowerCase();
    if (!PROFILE_IMAGE_CONTENT_TYPES.has(contentType)) {
      return c.json(
        { error: "unsupported_media_type", allowed: [...PROFILE_IMAGE_CONTENT_TYPES] },
        415,
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const storageRelativePath = profileImageStoragePathFor(auth.tenantId, id, contentType);
    try {
      await writeAssetFile(root, storageRelativePath, buffer);
      if (
        employee.profileImageStorageRelativePath &&
        employee.profileImageStorageRelativePath !== storageRelativePath
      ) {
        await removeAssetFile(root, employee.profileImageStorageRelativePath);
      }
    } catch {
      return c.json({ error: "storage_write_failed" }, 500);
    }

    const now = new Date();
    await db
      .update(employees)
      .set({
        profileImageStorageRelativePath: storageRelativePath,
        profileImageContentType: contentType,
        updatedAt: now,
      })
      .where(and(eq(employees.id, id), eq(employees.tenantId, auth.tenantId)));
    await insertEmployeeActivityEvent(db, {
      tenantId: auth.tenantId,
      employeeId: id,
      actorSub: auth.sub,
      action: "employee_profile_image_updated",
      detail: { contentType, byteSize: buffer.length },
    });

    const out = employeeProfileImageResponseSchema.safeParse({
      hasProfileImage: true,
      contentType,
    });
    if (!out.success) return c.json({ error: "serialize_error" }, 500);
    return c.json(out.data, 201);
  };
}

export function createEmployeeProfileImageDeleteHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) return c.json({ error: "missing_auth" }, 500);
    if (!canEditEmployees(auth)) return c.json({ error: "forbidden" }, 403);
    const db = getDb();
    if (!db) return c.json({ error: "database_unavailable" }, 503);
    const root = resolveProjectAssetsRoot();
    if (!root) return c.json({ error: "project_assets_storage_unconfigured" }, 503);

    const id = c.req.param("id") ?? "";
    if (!UUID_RE.test(id)) return c.json({ error: "not_found" }, 404);
    const employee = await assertEmployeeForTenant(db, auth.tenantId, id);
    if (!employee) return c.json({ error: "not_found" }, 404);

    const relPath = employee.profileImageStorageRelativePath;
    if (relPath) {
      try {
        await removeAssetFile(root, relPath);
      } catch {
        /* ignore */
      }
    }

    const now = new Date();
    await db
      .update(employees)
      .set({
        profileImageStorageRelativePath: null,
        profileImageContentType: null,
        updatedAt: now,
      })
      .where(and(eq(employees.id, id), eq(employees.tenantId, auth.tenantId)));
    if (relPath) {
      await insertEmployeeActivityEvent(db, {
        tenantId: auth.tenantId,
        employeeId: id,
        actorSub: auth.sub,
        action: "employee_profile_image_deleted",
        detail: null,
      });
    }

    const out = employeeProfileImageResponseSchema.safeParse({
      hasProfileImage: false,
      contentType: null,
    });
    if (!out.success) return c.json({ error: "serialize_error" }, 500);
    return c.json(out.data);
  };
}

export function createEmployeeAttachmentsListHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) return c.json({ error: "missing_auth" }, 500);
    const db = getDb();
    if (!db) return c.json({ error: "database_unavailable" }, 503);

    const id = c.req.param("id") ?? "";
    if (!UUID_RE.test(id)) return c.json({ error: "not_found" }, 404);
    const employee = await assertEmployeeForTenant(db, auth.tenantId, id);
    if (!employee) return c.json({ error: "not_found" }, 404);

    const rows = await db
      .select()
      .from(employeeAttachments)
      .where(
        and(
          eq(employeeAttachments.tenantId, auth.tenantId),
          eq(employeeAttachments.employeeId, id),
        ),
      )
      .orderBy(desc(employeeAttachments.createdAt));
    const body = { attachments: rows.map(mapAttachmentRow) };
    const parsed = employeeAttachmentsListResponseSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: "serialize_error" }, 500);
    return c.json(parsed.data);
  };
}

export function createEmployeeAttachmentPostHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) return c.json({ error: "missing_auth" }, 500);
    if (!canEditEmployees(auth)) return c.json({ error: "forbidden" }, 403);
    const db = getDb();
    if (!db) return c.json({ error: "database_unavailable" }, 503);
    const root = resolveProjectAssetsRoot();
    if (!root) return c.json({ error: "project_assets_storage_unconfigured" }, 503);

    const employeeId = c.req.param("id") ?? "";
    if (!UUID_RE.test(employeeId)) return c.json({ error: "not_found" }, 404);
    const employee = await assertEmployeeForTenant(db, auth.tenantId, employeeId);
    if (!employee) return c.json({ error: "not_found" }, 404);

    let body: Record<string, unknown>;
    try {
      body = await c.req.parseBody({ all: false });
    } catch {
      return c.json({ error: "invalid_multipart" }, 400);
    }
    const file = body["file"];
    if (!(file instanceof File)) return c.json({ error: "missing_file" }, 400);
    if (file.size > EMPLOYEE_ATTACHMENT_MAX_BYTES) {
      return c.json(
        { error: "file_too_large", maxBytes: EMPLOYEE_ATTACHMENT_MAX_BYTES },
        413,
      );
    }
    const contentType = (file.type || "application/octet-stream").toLowerCase();
    if (!EMPLOYEE_ATTACHMENT_CONTENT_TYPES.has(contentType)) {
      return c.json(
        { error: "unsupported_media_type", allowed: [...EMPLOYEE_ATTACHMENT_CONTENT_TYPES] },
        415,
      );
    }
    const kindParsed = employeeAttachmentKindSchema.safeParse(
      typeof body["kind"] === "string" ? body["kind"] : "document",
    );
    if (!kindParsed.success) return c.json({ error: "validation_error" }, 400);

    const buffer = Buffer.from(await file.arrayBuffer());
    const sha256 = createHash("sha256").update(buffer).digest("hex");
    const attachmentId = randomUUID();
    const storageRelativePath = attachmentStoragePathFor(
      auth.tenantId,
      employeeId,
      attachmentId,
    );
    try {
      await writeAssetFile(root, storageRelativePath, buffer);
    } catch {
      return c.json({ error: "storage_write_failed" }, 500);
    }

    const now = new Date();
    const [inserted] = await db
      .insert(employeeAttachments)
      .values({
        id: attachmentId,
        tenantId: auth.tenantId,
        employeeId,
        kind: kindParsed.data,
        filename: sanitizeDisplayFilename(file.name),
        contentType,
        byteSize: buffer.length,
        storageRelativePath,
        sha256,
      })
      .returning();
    if (!inserted) return c.json({ error: "insert_failed" }, 500);

    await db
      .update(employees)
      .set({ updatedAt: now })
      .where(and(eq(employees.id, employeeId), eq(employees.tenantId, auth.tenantId)));
    await insertEmployeeActivityEvent(db, {
      tenantId: auth.tenantId,
      employeeId,
      actorSub: auth.sub,
      action: "employee_attachment_uploaded",
      detail: {
        attachmentId,
        kind: kindParsed.data,
        byteSize: buffer.length,
      },
    });
    return c.json(mapAttachmentRow(inserted), 201);
  };
}

export function createEmployeeAttachmentDownloadHandler(
  getDb: () => Db | undefined,
): Handler {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) return c.json({ error: "missing_auth" }, 500);
    const db = getDb();
    if (!db) return c.json({ error: "database_unavailable" }, 503);
    const root = resolveProjectAssetsRoot();
    if (!root) return c.json({ error: "project_assets_storage_unconfigured" }, 503);

    const employeeId = c.req.param("id") ?? "";
    const attachmentId = c.req.param("attachmentId") ?? "";
    if (!UUID_RE.test(employeeId) || !UUID_RE.test(attachmentId)) {
      return c.json({ error: "not_found" }, 404);
    }
    const employee = await assertEmployeeForTenant(db, auth.tenantId, employeeId);
    if (!employee) return c.json({ error: "not_found" }, 404);

    const rows = await db
      .select()
      .from(employeeAttachments)
      .where(
        and(
          eq(employeeAttachments.id, attachmentId),
          eq(employeeAttachments.tenantId, auth.tenantId),
          eq(employeeAttachments.employeeId, employeeId),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) return c.json({ error: "not_found" }, 404);
    try {
      const stream = createAssetReadStream(root, row.storageRelativePath);
      const web = Readable.toWeb(stream) as ReadableStream;
      const encoded = encodeURIComponent(row.filename);
      return new Response(web, {
        headers: {
          "Content-Type": row.contentType,
          "Content-Length": String(row.byteSize),
          "Content-Disposition": `attachment; filename*=UTF-8''${encoded}`,
          "Cache-Control": "private, no-store",
        },
      });
    } catch {
      return c.json({ error: "storage_read_failed" }, 500);
    }
  };
}

export function createEmployeeAttachmentDeleteHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) return c.json({ error: "missing_auth" }, 500);
    if (!canEditEmployees(auth)) return c.json({ error: "forbidden" }, 403);
    const db = getDb();
    if (!db) return c.json({ error: "database_unavailable" }, 503);
    const root = resolveProjectAssetsRoot();
    if (!root) return c.json({ error: "project_assets_storage_unconfigured" }, 503);

    const employeeId = c.req.param("id") ?? "";
    const attachmentId = c.req.param("attachmentId") ?? "";
    if (!UUID_RE.test(employeeId) || !UUID_RE.test(attachmentId)) {
      return c.json({ error: "not_found" }, 404);
    }
    const employee = await assertEmployeeForTenant(db, auth.tenantId, employeeId);
    if (!employee) return c.json({ error: "not_found" }, 404);

    const rows = await db
      .select()
      .from(employeeAttachments)
      .where(
        and(
          eq(employeeAttachments.id, attachmentId),
          eq(employeeAttachments.tenantId, auth.tenantId),
          eq(employeeAttachments.employeeId, employeeId),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) return c.json({ error: "not_found" }, 404);

    await db
      .delete(employeeAttachments)
      .where(
        and(
          eq(employeeAttachments.id, attachmentId),
          eq(employeeAttachments.tenantId, auth.tenantId),
        ),
      );
    try {
      await removeAssetFile(root, row.storageRelativePath);
    } catch {
      /* ignore */
    }

    const now = new Date();
    await db
      .update(employees)
      .set({ updatedAt: now })
      .where(and(eq(employees.id, employeeId), eq(employees.tenantId, auth.tenantId)));
    await insertEmployeeActivityEvent(db, {
      tenantId: auth.tenantId,
      employeeId,
      actorSub: auth.sub,
      action: "employee_attachment_deleted",
      detail: { attachmentId },
    });
    return c.body(null, 204);
  };
}

export function createEmployeePostHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    if (!canEditEmployees(auth)) {
      return c.json({ error: "forbidden" }, 403);
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
      return c.json(jsonEmployeeValidationError(parsed.error), 400);
    }
    const p = parsed.data;
    const now = new Date();
    const hasCoords = p.latitude != null && p.longitude != null;

    try {
      const inserted = await db.transaction(async (tx) => {
        const [emp] = await tx
          .insert(employees)
          .values({
            tenantId: auth.tenantId,
            employeeNo: normalizeOptionalText(p.employeeNo),
            firstName: normalizeOptionalText(p.firstName),
            lastName: normalizeOptionalText(p.lastName),
            email: normalizeOptionalText(p.email),
            phone: normalizeOptionalText(p.phone),
            status: p.status,
            employmentType: p.employmentType,
            availabilityTimeZone: p.availabilityTimeZone,
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
              crossesMidnight: rule.crossesMidnight,
              validFrom: rule.validFrom,
              validTo: rule.validTo,
              sortIndex: rule.sortIndex,
              updatedAt: now,
            })),
          );
        }
        if (p.availabilityOverrides.length > 0) {
          await tx.insert(employeeAvailabilityOverrides).values(
            p.availabilityOverrides.map((o) => ({
              employeeId: emp.id,
              date: o.date,
              isUnavailable: o.isUnavailable,
              startTime: o.startTime ? pgTime(o.startTime) : null,
              endTime: o.endTime ? pgTime(o.endTime) : null,
              crossesMidnight: o.crossesMidnight,
              sortIndex: o.sortIndex,
              note: o.note ?? null,
              updatedAt: now,
            })),
          );
        }

        await insertEmployeeActivityEvent(tx, {
          tenantId: auth.tenantId,
          employeeId: emp.id,
          actorSub: auth.sub,
          action: "employee_created",
          detail: { displayName: emp.displayName },
        });

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
      const overrideRows = await db
        .select()
        .from(employeeAvailabilityOverrides)
        .where(eq(employeeAvailabilityOverrides.employeeId, inserted.id))
        .orderBy(
          asc(employeeAvailabilityOverrides.date),
          asc(employeeAvailabilityOverrides.sortIndex),
          asc(employeeAvailabilityOverrides.startTime),
        );

      const out = mapEmployeeDetail(
        inserted,
        ruleRows,
        overrideRows,
        mapEmployeePermissions(auth),
      );
      const ok = employeeDetailResponseSchema.safeParse(out);
      if (!ok.success) {
        return c.json({ error: "serialize_error" }, 500);
      }
      return c.json(ok.data, 201);
    } catch (err) {
      if (isUniqueViolation(err)) {
        return c.json({ error: "employee_no_taken" }, 409);
      }
      throw err;
    }
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
    const overrideRows = await db
      .select()
      .from(employeeAvailabilityOverrides)
      .where(eq(employeeAvailabilityOverrides.employeeId, id))
      .orderBy(
        asc(employeeAvailabilityOverrides.date),
        asc(employeeAvailabilityOverrides.sortIndex),
        asc(employeeAvailabilityOverrides.startTime),
      );

    const out = mapEmployeeDetail(
      row,
      ruleRows,
      overrideRows,
      mapEmployeePermissions(auth),
    );
    const ok = employeeDetailResponseSchema.safeParse(out);
    if (!ok.success) {
      return c.json({ error: "serialize_error" }, 500);
    }
    c.header("ETag", employeeEtag(row));
    c.header("Cache-Control", "private, no-store");
    return c.json(ok.data);
  };
}

export function createEmployeePatchHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    if (!canEditEmployees(auth)) {
      return c.json({ error: "forbidden" }, 403);
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
      return c.json(jsonEmployeeValidationError(parsed.error), 400);
    }
    const p = parsed.data;

    const ifMatchToken = parseIfMatchToken(c.req.header("if-match"));
    if (!ifMatchToken) {
      return c.json({ error: "missing_if_match" }, 428);
    }
    if (ifMatchToken !== "*" && ifMatchToken !== employeeVersionToken(row)) {
      return c.json({ error: "concurrent_update" }, 409);
    }

    const ruleRowsBefore = await db
      .select()
      .from(employeeAvailabilityRules)
      .where(eq(employeeAvailabilityRules.employeeId, id))
      .orderBy(
        asc(employeeAvailabilityRules.weekday),
        asc(employeeAvailabilityRules.sortIndex),
        asc(employeeAvailabilityRules.startTime),
      );
    const overrideRowsBefore = await db
      .select()
      .from(employeeAvailabilityOverrides)
      .where(eq(employeeAvailabilityOverrides.employeeId, id))
      .orderBy(
        asc(employeeAvailabilityOverrides.date),
        asc(employeeAvailabilityOverrides.sortIndex),
        asc(employeeAvailabilityOverrides.startTime),
      );
    const changeKeys = collectEmployeePatchChangeKeys(
      row,
      p,
      ruleRowsBefore,
      overrideRowsBefore,
    );

    const now = new Date();
    const patch: Partial<typeof employees.$inferInsert> = {
      updatedAt: now,
    };

    if (p.employeeNo !== undefined) {
      patch.employeeNo = normalizeOptionalText(p.employeeNo);
    }
    if (p.firstName !== undefined) {
      patch.firstName = normalizeOptionalText(p.firstName);
    }
    if (p.lastName !== undefined) {
      patch.lastName = normalizeOptionalText(p.lastName);
    }
    if (p.email !== undefined) {
      patch.email = normalizeOptionalText(p.email);
    }
    if (p.phone !== undefined) {
      patch.phone = normalizeOptionalText(p.phone);
    }
    if (p.status !== undefined) {
      patch.status = p.status;
    }
    if (p.employmentType !== undefined) {
      patch.employmentType = p.employmentType;
    }
    if (p.availabilityTimeZone !== undefined) {
      patch.availabilityTimeZone = p.availabilityTimeZone;
    }
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

    try {
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
                crossesMidnight: rule.crossesMidnight,
                validFrom: rule.validFrom,
                validTo: rule.validTo,
                sortIndex: rule.sortIndex,
                updatedAt: now,
              })),
            );
          }
        }
        if (p.availabilityOverrides !== undefined) {
          await tx
            .delete(employeeAvailabilityOverrides)
            .where(eq(employeeAvailabilityOverrides.employeeId, id));
          if (p.availabilityOverrides.length > 0) {
            await tx.insert(employeeAvailabilityOverrides).values(
              p.availabilityOverrides.map((o) => ({
                employeeId: id,
                date: o.date,
                isUnavailable: o.isUnavailable,
                startTime: o.startTime ? pgTime(o.startTime) : null,
                endTime: o.endTime ? pgTime(o.endTime) : null,
                crossesMidnight: o.crossesMidnight,
                sortIndex: o.sortIndex,
                note: o.note ?? null,
                updatedAt: now,
              })),
            );
          }
        }

        if (changeKeys.length > 0) {
          await insertEmployeeActivityEvent(tx, {
            tenantId: auth.tenantId,
            employeeId: id,
            actorSub: auth.sub,
            action: "employee_updated",
            detail: { changedKeys: changeKeys },
          });
        }
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        return c.json({ error: "employee_no_taken" }, 409);
      }
      throw err;
    }

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
    const overrideRows = await db
      .select()
      .from(employeeAvailabilityOverrides)
      .where(eq(employeeAvailabilityOverrides.employeeId, id))
      .orderBy(
        asc(employeeAvailabilityOverrides.date),
        asc(employeeAvailabilityOverrides.sortIndex),
        asc(employeeAvailabilityOverrides.startTime),
      );

    const out = mapEmployeeDetail(
      refreshed,
      ruleRows,
      overrideRows,
      mapEmployeePermissions(auth),
    );
    const ok = employeeDetailResponseSchema.safeParse(out);
    if (!ok.success) {
      return c.json({ error: "serialize_error" }, 500);
    }
    c.header("ETag", employeeEtag(refreshed));
    c.header("Cache-Control", "private, no-store");
    return c.json(ok.data);
  };
}

export function createEmployeeVacationListHandler(getDb: () => Db | undefined) {
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

    const rows = await db
      .select()
      .from(employeeVacationRequests)
      .where(
        and(
          eq(employeeVacationRequests.employeeId, id),
          eq(employeeVacationRequests.tenantId, auth.tenantId),
        ),
      )
      .orderBy(
        desc(employeeVacationRequests.fromDate),
        desc(employeeVacationRequests.createdAt),
      );

    const body = {
      requests: rows.map(mapVacationRow),
      permissions: {
        canDecide: canDecideVacation(auth),
      },
    };
    const parsed = employeeVacationListResponseSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "serialize_error" }, 500);
    }
    return c.json(parsed.data);
  };
}

export function createEmployeeVacationPostHandler(getDb: () => Db | undefined) {
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
    const parsed = employeeVacationCreateSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "validation_error" }, 400);
    }

    const now = new Date();
    const [inserted] = await db
      .insert(employeeVacationRequests)
      .values({
        tenantId: auth.tenantId,
        employeeId: id,
        fromDate: parsed.data.fromDate,
        toDate: parsed.data.toDate,
        reason: parsed.data.reason ?? null,
        status: "pending",
        updatedAt: now,
      })
      .returning();

    if (!inserted) {
      return c.json({ error: "insert_failed" }, 500);
    }
    await insertEmployeeActivityEvent(db, {
      tenantId: auth.tenantId,
      employeeId: id,
      actorSub: auth.sub,
      action: "vacation_requested",
      detail: {
        requestId: inserted.id,
        fromDate: String(inserted.fromDate),
        toDate: String(inserted.toDate),
      },
    });
    return c.json(mapVacationRow(inserted), 201);
  };
}

export function createEmployeeVacationDecisionPatchHandler(
  getDb: () => Db | undefined,
) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    if (!canDecideVacation(auth)) {
      return c.json({ error: "forbidden" }, 403);
    }
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }

    const id = c.req.param("id") ?? "";
    const vacationId = c.req.param("vacationId") ?? "";
    if (!UUID_RE.test(id) || !UUID_RE.test(vacationId)) {
      return c.json({ error: "not_found" }, 404);
    }
    const employee = await assertEmployeeForTenant(db, auth.tenantId, id);
    if (!employee) {
      return c.json({ error: "not_found" }, 404);
    }

    const vacationRows = await db
      .select()
      .from(employeeVacationRequests)
      .where(
        and(
          eq(employeeVacationRequests.id, vacationId),
          eq(employeeVacationRequests.employeeId, id),
          eq(employeeVacationRequests.tenantId, auth.tenantId),
        ),
      )
      .limit(1);
    const existing = vacationRows[0];
    if (!existing) {
      return c.json({ error: "not_found" }, 404);
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    const parsed = employeeVacationDecisionPatchSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "validation_error" }, 400);
    }

    const now = new Date();
    const [updated] = await db
      .update(employeeVacationRequests)
      .set({
        status: parsed.data.status,
        decisionNote: parsed.data.decisionNote ?? null,
        decidedAt: now,
        decidedBy: auth.sub || null,
        updatedAt: now,
      })
      .where(
        and(
          eq(employeeVacationRequests.id, vacationId),
          eq(employeeVacationRequests.employeeId, id),
          eq(employeeVacationRequests.tenantId, auth.tenantId),
        ),
      )
      .returning();

    if (!updated) {
      return c.json({ error: "not_found" }, 404);
    }
    await insertEmployeeActivityEvent(db, {
      tenantId: auth.tenantId,
      employeeId: id,
      actorSub: auth.sub,
      action: "vacation_decided",
      detail: {
        requestId: vacationId,
        status: parsed.data.status,
      },
    });
    return c.json(mapVacationRow(updated));
  };
}

export function createEmployeeSickListHandler(getDb: () => Db | undefined) {
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

    const rows = await db
      .select()
      .from(employeeSickReports)
      .where(
        and(
          eq(employeeSickReports.employeeId, id),
          eq(employeeSickReports.tenantId, auth.tenantId),
        ),
      )
      .orderBy(desc(employeeSickReports.fromDate), desc(employeeSickReports.createdAt));

    const canViewConfidential = canViewSickConfidential(auth);
    const body = {
      reports: rows.map((rowItem) => mapSickRow(rowItem, canViewConfidential)),
      permissions: {
        canViewConfidential,
        canCreateConfidential: canCreateSickConfidential(auth),
      },
    };
    const parsed = employeeSickListResponseSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "serialize_error" }, 500);
    }
    return c.json(parsed.data);
  };
}

export function createEmployeeSickPostHandler(getDb: () => Db | undefined) {
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
    const parsed = employeeSickCreateSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "validation_error" }, 400);
    }
    if (
      parsed.data.confidentialNote !== null &&
      parsed.data.confidentialNote.trim() !== "" &&
      !canCreateSickConfidential(auth)
    ) {
      return c.json({ error: "forbidden_confidential_note" }, 403);
    }

    const now = new Date();
    const [inserted] = await db
      .insert(employeeSickReports)
      .values({
        tenantId: auth.tenantId,
        employeeId: id,
        fromDate: parsed.data.fromDate,
        toDate: parsed.data.toDate,
        confidentialNote: parsed.data.confidentialNote ?? null,
        certificateRequired: parsed.data.certificateRequired ?? false,
        updatedAt: now,
      })
      .returning();

    if (!inserted) {
      return c.json({ error: "insert_failed" }, 500);
    }
    const confidentialAttached = Boolean(parsed.data.confidentialNote?.trim());
    await insertEmployeeActivityEvent(db, {
      tenantId: auth.tenantId,
      employeeId: id,
      actorSub: auth.sub,
      action: "sick_report_created",
      detail: {
        reportId: inserted.id,
        fromDate: String(inserted.fromDate),
        toDate: String(inserted.toDate),
        certificateRequired: Boolean(inserted.certificateRequired),
        confidentialNoteAttached: confidentialAttached,
      },
    });
    return c.json(mapSickRow(inserted, canViewSickConfidential(auth)), 201);
  };
}

export function createEmployeeDeleteHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    if (!canDeleteEmployees(auth)) {
      return c.json({ error: "forbidden" }, 403);
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

    await db.transaction(async (tx) => {
      await insertEmployeeActivityEvent(tx, {
        tenantId: auth.tenantId,
        employeeId: id,
        actorSub: auth.sub,
        action: "employee_deleted",
        detail: { displayName: row.displayName },
      });
      await tx
        .delete(employees)
        .where(and(eq(employees.id, id), eq(employees.tenantId, auth.tenantId)));
    });

    return c.body(null, 204);
  };
}
