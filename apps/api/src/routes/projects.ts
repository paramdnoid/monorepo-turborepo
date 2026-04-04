import type { SQL } from "drizzle-orm";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { Context } from "hono";

import {
  projectCreateRequestSchema,
  projectPatchRequestSchema,
  projectResponseSchema,
  projectsListResponseSchema,
  projectStatusSchema,
} from "@repo/api-contracts";
import { projects, type Db } from "@repo/db";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "23505"
  );
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

type ProjectRowForApi = {
  id: string;
  title: string;
  projectNumber: string | null;
  status: string;
  customerLabel: string | null;
  startDate: unknown;
  endDate: unknown;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function mapProjectRow(row: ProjectRowForApi) {
  const statusParsed = projectStatusSchema.safeParse(row.status);
  return {
    id: row.id,
    title: row.title,
    projectNumber: row.projectNumber ?? null,
    status: statusParsed.success ? statusParsed.data : "active",
    customerLabel: row.customerLabel ?? null,
    startDate: row.startDate ? formatDateForApi(row.startDate) : null,
    endDate: row.endDate ? formatDateForApi(row.endDate) : null,
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function parseListQuery(c: Context) {
  const qRaw = c.req.query("q")?.trim() ?? "";
  const includeArchived =
    c.req.query("includeArchived") === "1" ||
    c.req.query("includeArchived") === "true";
  const statusRaw = c.req.query("status")?.trim() ?? "";
  const statusParsed = statusRaw
    ? projectStatusSchema.safeParse(statusRaw)
    : { success: true as const, data: undefined };

  const limitRaw = c.req.query("limit");
  const offsetRaw = c.req.query("offset");
  let limit = 200;
  let offset = 0;
  if (limitRaw !== undefined && limitRaw !== "") {
    const n = Number(limitRaw);
    if (Number.isFinite(n)) {
      limit = Math.min(200, Math.max(1, Math.trunc(n)));
    }
  }
  if (offsetRaw !== undefined && offsetRaw !== "") {
    const n = Number(offsetRaw);
    if (Number.isFinite(n)) {
      offset = Math.max(0, Math.trunc(n));
    }
  }
  return { qRaw, includeArchived, statusRaw, statusParsed, limit, offset };
}

export function createProjectsListHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }
    const parsedQuery = parseListQuery(c);
    if (parsedQuery.statusRaw && !parsedQuery.statusParsed.success) {
      return c.json({ error: "validation_error" }, 400);
    }

    const conditions: SQL[] = [eq(projects.tenantId, auth.tenantId)];
    if (!parsedQuery.includeArchived) {
      conditions.push(isNull(projects.archivedAt));
    }
    if (parsedQuery.statusParsed.success && parsedQuery.statusParsed.data) {
      conditions.push(eq(projects.status, parsedQuery.statusParsed.data));
    }
    if (parsedQuery.qRaw.length > 0) {
      const pattern = `%${parsedQuery.qRaw.replace(/%/g, "\\%").replace(/_/g, "\\_")}%`;
      conditions.push(
        sql`(
          ${projects.title} ilike ${pattern} escape '\\'
          or coalesce(${projects.projectNumber}, '') ilike ${pattern} escape '\\'
          or coalesce(${projects.customerLabel}, '') ilike ${pattern} escape '\\'
        )`,
      );
    }

    const [countRow] = await db
      .select({ n: sql<number>`cast(count(*) as int)` })
      .from(projects)
      .where(and(...conditions));

    const rows = await db
      .select({
        id: projects.id,
        title: projects.title,
        projectNumber: projects.projectNumber,
        status: projects.status,
        customerLabel: projects.customerLabel,
        startDate: projects.startDate,
        endDate: projects.endDate,
        archivedAt: projects.archivedAt,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .where(and(...conditions))
      .orderBy(desc(projects.updatedAt), desc(projects.createdAt))
      .limit(parsedQuery.limit)
      .offset(parsedQuery.offset);

    const body = {
      projects: rows.map(mapProjectRow),
      total: countRow?.n ?? 0,
    };
    const parsed = projectsListResponseSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "serialize_error" }, 500);
    }
    return c.json(parsed.data);
  };
}

export function createProjectsCreateHandler(getDb: () => Db | undefined) {
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
    const parsedBody = projectCreateRequestSchema.safeParse(body);
    if (!parsedBody.success) {
      return c.json({ error: "validation_error" }, 400);
    }

    const now = new Date();
    try {
      const [inserted] = await db
        .insert(projects)
        .values({
          tenantId: auth.tenantId,
          title: parsedBody.data.title.trim(),
          projectNumber: parsedBody.data.projectNumber ?? null,
          status: parsedBody.data.status ?? "active",
          customerLabel: parsedBody.data.customerLabel ?? null,
          startDate: parsedBody.data.startDate ?? null,
          endDate: parsedBody.data.endDate ?? null,
          updatedAt: now,
        })
        .returning();
      if (!inserted) {
        return c.json({ error: "insert_failed" }, 500);
      }
      const out = projectResponseSchema.safeParse({ project: mapProjectRow(inserted) });
      if (!out.success) {
        return c.json({ error: "serialize_error" }, 500);
      }
      return c.json(out.data, 201);
    } catch (err) {
      if (isUniqueViolation(err)) {
        return c.json({ error: "project_number_taken" }, 409);
      }
      throw err;
    }
  };
}

export function createProjectPatchHandler(getDb: () => Db | undefined) {
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

    const existingRows = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.tenantId, auth.tenantId)))
      .limit(1);
    const existing = existingRows[0];
    if (!existing) {
      return c.json({ error: "not_found" }, 404);
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    const parsedBody = projectPatchRequestSchema.safeParse(body);
    if (!parsedBody.success) {
      return c.json({ error: "validation_error" }, 400);
    }

    const p = parsedBody.data;
    const nextStart =
      p.startDate !== undefined
        ? p.startDate
        : existing.startDate
          ? formatDateForApi(existing.startDate)
          : null;
    const nextEnd =
      p.endDate !== undefined
        ? p.endDate
        : existing.endDate
          ? formatDateForApi(existing.endDate)
          : null;
    if (nextStart && nextEnd && nextStart > nextEnd) {
      return c.json({ error: "validation_error" }, 400);
    }

    const updates: Partial<typeof projects.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (p.title !== undefined) updates.title = p.title.trim();
    if (p.projectNumber !== undefined) updates.projectNumber = p.projectNumber;
    if (p.status !== undefined) updates.status = p.status;
    if (p.customerLabel !== undefined) updates.customerLabel = p.customerLabel;
    if (p.startDate !== undefined) updates.startDate = p.startDate;
    if (p.endDate !== undefined) updates.endDate = p.endDate;
    if (p.archived !== undefined) {
      updates.archivedAt = p.archived ? new Date() : null;
    }

    try {
      const [updated] = await db
        .update(projects)
        .set(updates)
        .where(and(eq(projects.id, id), eq(projects.tenantId, auth.tenantId)))
        .returning();
      if (!updated) {
        return c.json({ error: "not_found" }, 404);
      }
      const out = projectResponseSchema.safeParse({ project: mapProjectRow(updated) });
      if (!out.success) {
        return c.json({ error: "serialize_error" }, 500);
      }
      return c.json(out.data);
    } catch (err) {
      if (isUniqueViolation(err)) {
        return c.json({ error: "project_number_taken" }, 409);
      }
      throw err;
    }
  };
}
