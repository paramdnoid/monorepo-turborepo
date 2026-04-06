import { and, asc, eq, gte, isNull, lte } from "drizzle-orm";
import type { Context } from "hono";

import {
  workTimeEntriesListResponseSchema,
  workTimeEntryCreateSchema,
  workTimeEntryPatchSchema,
} from "@repo/api-contracts";
import { employees, projects, workTimeEntries, type Db } from "@repo/db";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function mapEntryRow(r: typeof workTimeEntries.$inferSelect) {
  return {
    id: r.id,
    employeeId: r.employeeId,
    workDate: String(r.workDate),
    durationMinutes: r.durationMinutes,
    projectId: r.projectId ?? null,
    notes: r.notes ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

async function assertProjectForTenant(
  db: Db,
  tenantId: string,
  projectId: string | null | undefined,
): Promise<{ ok: true; projectId: string | null } | { ok: false }> {
  if (projectId === undefined || projectId === null) {
    return { ok: true, projectId: null };
  }
  const rows = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.tenantId, tenantId)))
    .limit(1);
  if (!rows[0]) {
    return { ok: false };
  }
  return { ok: true, projectId };
}

async function assertEmployeeForTenant(
  db: Db,
  tenantId: string,
  employeeId: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: employees.id })
    .from(employees)
    .where(
      and(
        eq(employees.id, employeeId),
        eq(employees.tenantId, tenantId),
        isNull(employees.archivedAt),
      ),
    )
    .limit(1);
  return Boolean(rows[0]);
}

export function createWorkTimeEntriesListHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }

    const from = c.req.query("from")?.trim() ?? "";
    const to = c.req.query("to")?.trim() ?? "";
    if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
      return c.json({ error: "validation_error" }, 400);
    }
    if (from > to) {
      return c.json({ error: "validation_error" }, 400);
    }

    const employeeId = c.req.query("employeeId")?.trim() ?? "";
    if (employeeId && !UUID_RE.test(employeeId)) {
      return c.json({ error: "validation_error" }, 400);
    }
    const projectId = c.req.query("projectId")?.trim() ?? "";
    if (projectId && !UUID_RE.test(projectId)) {
      return c.json({ error: "validation_error" }, 400);
    }

    const listConditions = [
      eq(workTimeEntries.tenantId, auth.tenantId),
      gte(workTimeEntries.workDate, from),
      lte(workTimeEntries.workDate, to),
      ...(employeeId ? [eq(workTimeEntries.employeeId, employeeId)] : []),
      ...(projectId ? [eq(workTimeEntries.projectId, projectId)] : []),
    ];

    const rows = await db
      .select()
      .from(workTimeEntries)
      .where(and(...listConditions))
      .orderBy(
        asc(workTimeEntries.workDate),
        asc(workTimeEntries.createdAt),
      );

    const body = { entries: rows.map(mapEntryRow) };
    const parsed = workTimeEntriesListResponseSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "serialize_error" }, 500);
    }
    return c.json(parsed.data);
  };
}

export function createWorkTimeEntryPostHandler(getDb: () => Db | undefined) {
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
    const parsed = workTimeEntryCreateSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "validation_error", issues: parsed.error.issues },
        400,
      );
    }

    const okEmp = await assertEmployeeForTenant(
      db,
      auth.tenantId,
      parsed.data.employeeId,
    );
    if (!okEmp) {
      return c.json({ error: "employee_not_found" }, 404);
    }

    const proj = await assertProjectForTenant(
      db,
      auth.tenantId,
      parsed.data.projectId,
    );
    if (!proj.ok) {
      return c.json({ error: "project_not_found" }, 404);
    }

    const notesTrimmed = parsed.data.notes?.trim();
    const now = new Date();
    const [inserted] = await db
      .insert(workTimeEntries)
      .values({
        tenantId: auth.tenantId,
        employeeId: parsed.data.employeeId,
        workDate: parsed.data.workDate,
        durationMinutes: parsed.data.durationMinutes,
        projectId: proj.projectId,
        notes: notesTrimmed ? notesTrimmed : null,
        updatedAt: now,
      })
      .returning();
    if (!inserted) {
      return c.json({ error: "insert_failed" }, 500);
    }

    return c.json({ entry: mapEntryRow(inserted) }, 201);
  };
}

export function createWorkTimeEntryPatchHandler(getDb: () => Db | undefined) {
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

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    const parsed = workTimeEntryPatchSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "validation_error", issues: parsed.error.issues },
        400,
      );
    }

    const currentRows = await db
      .select()
      .from(workTimeEntries)
      .where(
        and(eq(workTimeEntries.id, id), eq(workTimeEntries.tenantId, auth.tenantId)),
      )
      .limit(1);
    const current = currentRows[0];
    if (!current) {
      return c.json({ error: "not_found" }, 404);
    }

    const patch = parsed.data;
    const nextEmployeeId = patch.employeeId ?? current.employeeId;
    const nextWorkDate = patch.workDate ?? String(current.workDate);
    const nextDuration =
      patch.durationMinutes ?? current.durationMinutes;
    let nextProjectId = current.projectId ?? null;
    if (patch.projectId !== undefined) {
      const proj = await assertProjectForTenant(
        db,
        auth.tenantId,
        patch.projectId,
      );
      if (!proj.ok) {
        return c.json({ error: "project_not_found" }, 404);
      }
      nextProjectId = proj.projectId;
    }
    let nextNotes = current.notes ?? null;
    if (patch.notes !== undefined) {
      const t = patch.notes?.trim();
      nextNotes = t ? t : null;
    }

    const okEmp = await assertEmployeeForTenant(
      db,
      auth.tenantId,
      nextEmployeeId,
    );
    if (!okEmp) {
      return c.json({ error: "employee_not_found" }, 404);
    }

    const now = new Date();
    const [updated] = await db
      .update(workTimeEntries)
      .set({
        employeeId: nextEmployeeId,
        workDate: nextWorkDate,
        durationMinutes: nextDuration,
        projectId: nextProjectId,
        notes: nextNotes,
        updatedAt: now,
      })
      .where(
        and(eq(workTimeEntries.id, id), eq(workTimeEntries.tenantId, auth.tenantId)),
      )
      .returning();
    if (!updated) {
      return c.json({ error: "not_found" }, 404);
    }
    return c.json({ entry: mapEntryRow(updated) });
  };
}

export function createWorkTimeEntryDeleteHandler(getDb: () => Db | undefined) {
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

    const deleted = await db
      .delete(workTimeEntries)
      .where(
        and(eq(workTimeEntries.id, id), eq(workTimeEntries.tenantId, auth.tenantId)),
      )
      .returning({ id: workTimeEntries.id });

    if (!deleted[0]) {
      return c.json({ error: "not_found" }, 404);
    }
    return c.body(null, 204);
  };
}
