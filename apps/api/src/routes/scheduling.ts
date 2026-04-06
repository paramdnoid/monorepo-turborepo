import { and, asc, eq, gte, inArray, isNull, lte, ne, or } from "drizzle-orm";
import type { Context } from "hono";

import {
  schedulingAssignmentCreateResponseSchema,
  schedulingAssignmentCreateSchema,
  schedulingAssignmentPatchSchema,
  schedulingAssignmentsListResponseSchema,
  schedulingDayResponseSchema,
} from "@repo/api-contracts";
import {
  employeeAvailabilityOverrides,
  employeeAvailabilityRules,
  employeeRelationships,
  employeeSickReports,
  employeeVacationRequests,
  employees,
  projects,
  schedulingAssignments,
  type Db,
} from "@repo/db";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseIsoDateToWeekday(isoDate: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) {
    return null;
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isInteger(y) || !Number.isInteger(mo) || !Number.isInteger(d)) {
    return null;
  }
  const utc = new Date(Date.UTC(y, mo - 1, d));
  if (Number.isNaN(utc.getTime())) {
    return null;
  }
  return utc.getUTCDay();
}

/** Inklusive Tage von dateFrom bis dateTo (YYYY-MM-DD); null wenn ungueltig oder from > to. */
function daysBetweenInclusiveYmd(dateFrom: string, dateTo: string): number | null {
  const m1 = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateFrom);
  const m2 = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateTo);
  if (!m1 || !m2) {
    return null;
  }
  const t1 = Date.UTC(Number(m1[1]), Number(m1[2]) - 1, Number(m1[3]));
  const t2 = Date.UTC(Number(m2[1]), Number(m2[2]) - 1, Number(m2[3]));
  if (Number.isNaN(t1) || Number.isNaN(t2) || t1 > t2) {
    return null;
  }
  return Math.floor((t2 - t1) / 86_400_000) + 1;
}

const SCHEDULING_ASSIGNMENTS_RANGE_MAX_DAYS = 31;

function formatTimeForApi(value: unknown): string {
  if (typeof value === "string") {
    return value.length === 8 ? value.slice(0, 5) : value;
  }
  return String(value);
}

function normalizeEmployeeStatus(v: string): "ACTIVE" | "ONBOARDING" | "INACTIVE" {
  if (v === "ACTIVE" || v === "ONBOARDING" || v === "INACTIVE") {
    return v;
  }
  return "ACTIVE";
}

function mapAssignmentRow(r: typeof schedulingAssignments.$inferSelect) {
  return {
    id: r.id,
    employeeId: r.employeeId,
    date: String(r.date),
    startTime: formatTimeForApi(r.startTime),
    title: r.title,
    place: r.place ?? null,
    reminderMinutesBefore: r.reminderMinutesBefore ?? null,
    projectId: r.projectId ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

async function resolveSchedulingProjectId(
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

type DependencyWarning = {
  kind: "MUTUALLY_EXCLUSIVE" | "MENTOR_TRAINEE";
  employeeId: string;
  relatedEmployeeId: string;
  message: string;
};

function dedupeWarnings(
  warnings: DependencyWarning[],
): DependencyWarning[] {
  const seen = new Set<string>();
  const out: DependencyWarning[] = [];
  for (const w of warnings) {
    const key = `${w.kind}:${w.employeeId}:${w.relatedEmployeeId}:${w.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(w);
  }
  return out;
}

function formatIcsStampUtc(d: Date): string {
  const iso = d.toISOString();
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function formatIcsLocalDateTime(dateIso: string, time: string): string {
  const date = dateIso.replace(/-/g, "");
  const t = time.length === 5 ? `${time}:00` : time;
  const timeCompact = t.replace(/:/g, "");
  return `${date}T${timeCompact}`;
}

function escapeIcsText(v: string): string {
  return v
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function createSchedulingDayHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }

    const requestedDate = c.req.query("date")?.trim() ?? todayIsoDate();
    if (!DATE_RE.test(requestedDate)) {
      return c.json({ error: "validation_error" }, 400);
    }
    const weekday = parseIsoDateToWeekday(requestedDate);
    if (weekday === null) {
      return c.json({ error: "validation_error" }, 400);
    }

    const employeeRows = await db
      .select()
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, auth.tenantId),
          isNull(employees.archivedAt),
          inArray(employees.status, ["ACTIVE", "ONBOARDING"]),
        ),
      )
      .orderBy(asc(employees.displayName));

    if (employeeRows.length === 0) {
      return c.json({ date: requestedDate, employees: [], dependencyWarnings: [] });
    }

    const employeeIds = employeeRows.map((e) => e.id);

    const [ruleRows, overrideRows, vacationRows, sickRows, assignmentRows] =
      await Promise.all([
      db
        .select()
        .from(employeeAvailabilityRules)
        .where(
          and(
            inArray(employeeAvailabilityRules.employeeId, employeeIds),
            eq(employeeAvailabilityRules.weekday, weekday),
            or(
              isNull(employeeAvailabilityRules.validFrom),
              lte(employeeAvailabilityRules.validFrom, requestedDate),
            ),
            or(
              isNull(employeeAvailabilityRules.validTo),
              gte(employeeAvailabilityRules.validTo, requestedDate),
            ),
          ),
        )
        .orderBy(
          asc(employeeAvailabilityRules.employeeId),
          asc(employeeAvailabilityRules.sortIndex),
          asc(employeeAvailabilityRules.startTime),
        ),
      db
        .select()
        .from(employeeAvailabilityOverrides)
        .where(
          and(
            inArray(employeeAvailabilityOverrides.employeeId, employeeIds),
            eq(employeeAvailabilityOverrides.date, requestedDate),
          ),
        )
        .orderBy(
          asc(employeeAvailabilityOverrides.employeeId),
          asc(employeeAvailabilityOverrides.sortIndex),
          asc(employeeAvailabilityOverrides.startTime),
        ),
      db
        .select()
        .from(employeeVacationRequests)
        .where(
          and(
            eq(employeeVacationRequests.tenantId, auth.tenantId),
            inArray(employeeVacationRequests.employeeId, employeeIds),
            eq(employeeVacationRequests.status, "approved"),
            lte(employeeVacationRequests.fromDate, requestedDate),
            gte(employeeVacationRequests.toDate, requestedDate),
          ),
        ),
      db
        .select()
        .from(employeeSickReports)
        .where(
          and(
            eq(employeeSickReports.tenantId, auth.tenantId),
            inArray(employeeSickReports.employeeId, employeeIds),
            lte(employeeSickReports.fromDate, requestedDate),
            gte(employeeSickReports.toDate, requestedDate),
          ),
        ),
      db
        .select()
        .from(schedulingAssignments)
        .where(
          and(
            eq(schedulingAssignments.tenantId, auth.tenantId),
            eq(schedulingAssignments.date, requestedDate),
          ),
        ),
    ]);

    const rulesByEmployee = new Map<string, typeof ruleRows>();
    for (const r of ruleRows) {
      const list = rulesByEmployee.get(r.employeeId) ?? [];
      list.push(r);
      rulesByEmployee.set(r.employeeId, list);
    }
    const overridesByEmployee = new Map<string, typeof overrideRows>();
    for (const o of overrideRows) {
      const list = overridesByEmployee.get(o.employeeId) ?? [];
      list.push(o);
      overridesByEmployee.set(o.employeeId, list);
    }
    const vacationSet = new Set(vacationRows.map((v) => v.employeeId));
    const sickSet = new Set(sickRows.map((s) => s.employeeId));

    const assignmentsByTime = new Map<string, Set<string>>();
    for (const a of assignmentRows) {
      const key = formatTimeForApi(a.startTime);
      const set = assignmentsByTime.get(key) ?? new Set<string>();
      set.add(a.employeeId);
      assignmentsByTime.set(key, set);
    }
    const assignedEmployeeIds = [...new Set(assignmentRows.map((a) => a.employeeId))];
    let dependencyWarnings: DependencyWarning[] = [];
    if (assignedEmployeeIds.length > 0) {
      const relationshipRows = await db
        .select()
        .from(employeeRelationships)
        .where(
          and(
            eq(employeeRelationships.tenantId, auth.tenantId),
            or(
              inArray(employeeRelationships.fromEmployeeId, assignedEmployeeIds),
              inArray(employeeRelationships.toEmployeeId, assignedEmployeeIds),
            ),
            inArray(employeeRelationships.kind, [
              "MUTUALLY_EXCLUSIVE",
              "MENTOR_TRAINEE",
            ]),
          ),
        );
      for (const rel of relationshipRows) {
        if (rel.kind === "MUTUALLY_EXCLUSIVE") {
          for (const [timeKey, set] of assignmentsByTime.entries()) {
            if (set.has(rel.fromEmployeeId) && set.has(rel.toEmployeeId)) {
              dependencyWarnings.push({
                kind: "MUTUALLY_EXCLUSIVE",
                employeeId: rel.fromEmployeeId,
                relatedEmployeeId: rel.toEmployeeId,
                message: `Mutually exclusive employees scheduled at ${timeKey}.`,
              });
            }
          }
        } else if (rel.kind === "MENTOR_TRAINEE") {
          for (const [timeKey, set] of assignmentsByTime.entries()) {
            if (set.has(rel.toEmployeeId) && !set.has(rel.fromEmployeeId)) {
              dependencyWarnings.push({
                kind: "MENTOR_TRAINEE",
                employeeId: rel.toEmployeeId,
                relatedEmployeeId: rel.fromEmployeeId,
                message: `Trainee has assignment at ${timeKey} without mentor.`,
              });
            }
          }
        }
      }
      dependencyWarnings = dedupeWarnings(dependencyWarnings);
    }

    const body = {
      date: requestedDate,
      employees: employeeRows.map((e) => {
        const rules = rulesByEmployee.get(e.id) ?? [];
        const overrides = overridesByEmployee.get(e.id) ?? [];
        const hasSick = sickSet.has(e.id);
        const hasVacation = vacationSet.has(e.id);
        const hasUnavailableOverride = overrides.some((o) => o.isUnavailable);

        let unavailableReason: "vacation" | "sick" | "override" | null = null;
        if (hasSick) {
          unavailableReason = "sick";
        } else if (hasVacation) {
          unavailableReason = "vacation";
        } else if (hasUnavailableOverride) {
          unavailableReason = "override";
        }

        const slots =
          unavailableReason !== null
            ? []
            : overrides.length > 0
              ? overrides
                  .filter((o) => !o.isUnavailable && o.startTime && o.endTime)
                  .map((o) => ({
                    startTime: formatTimeForApi(o.startTime),
                    endTime: formatTimeForApi(o.endTime),
                    crossesMidnight: Boolean(o.crossesMidnight),
                    source: "override" as const,
                  }))
              : rules.map((r) => ({
                  startTime: formatTimeForApi(r.startTime),
                  endTime: formatTimeForApi(r.endTime),
                  crossesMidnight: Boolean(r.crossesMidnight),
                  source: "weekly" as const,
                }));

        return {
          employeeId: e.id,
          displayName: e.displayName,
          employeeNo: e.employeeNo ?? null,
          status: normalizeEmployeeStatus(e.status),
          city: e.privateCity ?? null,
          hasGeo: e.latitude != null && e.longitude != null,
          availabilityTimeZone: e.availabilityTimeZone ?? "Europe/Berlin",
          isAvailable: slots.length > 0 && unavailableReason === null,
          unavailableReason,
          slots,
        };
      }),
      dependencyWarnings,
    };

    const parsed = schedulingDayResponseSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "serialize_error" }, 500);
    }
    return c.json(parsed.data);
  };
}

export function createSchedulingAssignmentsListHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }

    const date = c.req.query("date")?.trim() ?? "";
    const dateFrom = c.req.query("dateFrom")?.trim() ?? "";
    const dateTo = c.req.query("dateTo")?.trim() ?? "";
    if (date && (!DATE_RE.test(date))) {
      return c.json({ error: "validation_error" }, 400);
    }
    if (dateFrom && !DATE_RE.test(dateFrom)) {
      return c.json({ error: "validation_error" }, 400);
    }
    if (dateTo && !DATE_RE.test(dateTo)) {
      return c.json({ error: "validation_error" }, 400);
    }
    if ((dateFrom && !dateTo) || (!dateFrom && dateTo)) {
      return c.json({ error: "validation_error" }, 400);
    }
    if (dateFrom && dateTo) {
      const span = daysBetweenInclusiveYmd(dateFrom, dateTo);
      if (span === null || span > SCHEDULING_ASSIGNMENTS_RANGE_MAX_DAYS) {
        return c.json({ error: "validation_error" }, 400);
      }
    }
    const projectId = c.req.query("projectId")?.trim() ?? "";
    if (projectId && !UUID_RE.test(projectId)) {
      return c.json({ error: "validation_error" }, 400);
    }

    const listConditions = [
      eq(schedulingAssignments.tenantId, auth.tenantId),
      ...(date
        ? [eq(schedulingAssignments.date, date)]
        : dateFrom && dateTo
          ? [
              gte(schedulingAssignments.date, dateFrom),
              lte(schedulingAssignments.date, dateTo),
            ]
          : []),
      ...(projectId ? [eq(schedulingAssignments.projectId, projectId)] : []),
    ];

    const rows = await db
      .select()
      .from(schedulingAssignments)
      .where(and(...listConditions))
      .orderBy(
        asc(schedulingAssignments.date),
        asc(schedulingAssignments.startTime),
        asc(schedulingAssignments.createdAt),
      );

    const body = { assignments: rows.map(mapAssignmentRow) };
    const parsed = schedulingAssignmentsListResponseSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "serialize_error" }, 500);
    }
    return c.json(parsed.data);
  };
}

export function createSchedulingAssignmentPostHandler(getDb: () => Db | undefined) {
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
    const parsed = schedulingAssignmentCreateSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "validation_error", issues: parsed.error.issues },
        400,
      );
    }

    const employeeRows = await db
      .select({ id: employees.id })
      .from(employees)
      .where(
        and(
          eq(employees.id, parsed.data.employeeId),
          eq(employees.tenantId, auth.tenantId),
          isNull(employees.archivedAt),
        ),
      )
      .limit(1);
    if (!employeeRows[0]) {
      return c.json({ error: "employee_not_found" }, 404);
    }

    const sameSlotRows = await db
      .select({ id: schedulingAssignments.id })
      .from(schedulingAssignments)
      .where(
        and(
          eq(schedulingAssignments.tenantId, auth.tenantId),
          eq(schedulingAssignments.employeeId, parsed.data.employeeId),
          eq(schedulingAssignments.date, parsed.data.date),
          eq(schedulingAssignments.startTime, parsed.data.startTime),
        ),
      )
      .limit(1);
    if (sameSlotRows[0]) {
      return c.json({ error: "employee_slot_conflict" }, 409);
    }

    const projectResolved = await resolveSchedulingProjectId(
      db,
      auth.tenantId,
      parsed.data.projectId,
    );
    if (!projectResolved.ok) {
      return c.json({ error: "project_not_found" }, 404);
    }

    const relationshipRows = await db
      .select()
      .from(employeeRelationships)
      .where(
        and(
          eq(employeeRelationships.tenantId, auth.tenantId),
          or(
            eq(employeeRelationships.fromEmployeeId, parsed.data.employeeId),
            eq(employeeRelationships.toEmployeeId, parsed.data.employeeId),
          ),
          inArray(employeeRelationships.kind, [
            "MUTUALLY_EXCLUSIVE",
            "MENTOR_TRAINEE",
          ]),
        ),
      );

    const mutexCounterpartIds = relationshipRows
      .filter((r) => r.kind === "MUTUALLY_EXCLUSIVE")
      .map((r) =>
        r.fromEmployeeId === parsed.data.employeeId ? r.toEmployeeId : r.fromEmployeeId,
      );
    if (mutexCounterpartIds.length > 0) {
      const conflicts = await db
        .select({ employeeId: schedulingAssignments.employeeId })
        .from(schedulingAssignments)
        .where(
          and(
            eq(schedulingAssignments.tenantId, auth.tenantId),
            eq(schedulingAssignments.date, parsed.data.date),
            eq(schedulingAssignments.startTime, parsed.data.startTime),
            inArray(schedulingAssignments.employeeId, [...new Set(mutexCounterpartIds)]),
          ),
        );
      if (conflicts.length > 0) {
        return c.json(
          {
            error: "mutually_exclusive_conflict",
            conflictingEmployeeIds: [...new Set(conflicts.map((c0) => c0.employeeId))],
          },
          409,
        );
      }
    }

    const dependencyWarnings: DependencyWarning[] = [];
    const mentorIds = relationshipRows
      .filter(
        (r) =>
          r.kind === "MENTOR_TRAINEE" && r.toEmployeeId === parsed.data.employeeId,
      )
      .map((r) => r.fromEmployeeId);
    if (mentorIds.length > 0) {
      const mentorAssignments = await db
        .select({ employeeId: schedulingAssignments.employeeId })
        .from(schedulingAssignments)
        .where(
          and(
            eq(schedulingAssignments.tenantId, auth.tenantId),
            eq(schedulingAssignments.date, parsed.data.date),
            eq(schedulingAssignments.startTime, parsed.data.startTime),
            inArray(schedulingAssignments.employeeId, [...new Set(mentorIds)]),
          ),
        );
      const assignedMentorIds = new Set(mentorAssignments.map((m) => m.employeeId));
      for (const mentorId of mentorIds) {
        if (!assignedMentorIds.has(mentorId)) {
          dependencyWarnings.push({
            kind: "MENTOR_TRAINEE",
            employeeId: parsed.data.employeeId,
            relatedEmployeeId: mentorId,
            message: "Trainee is assigned without mentor on same slot.",
          });
        }
      }
    }

    const now = new Date();
    const [inserted] = await db
      .insert(schedulingAssignments)
      .values({
        tenantId: auth.tenantId,
        employeeId: parsed.data.employeeId,
        date: parsed.data.date,
        startTime: parsed.data.startTime,
        title: parsed.data.title.trim(),
        place: parsed.data.place?.trim() ? parsed.data.place.trim() : null,
        reminderMinutesBefore: parsed.data.reminderMinutesBefore ?? null,
        projectId: projectResolved.projectId,
        updatedAt: now,
      })
      .returning();
    if (!inserted) {
      return c.json({ error: "insert_failed" }, 500);
    }

    const mapped = mapAssignmentRow(inserted);
    const out = schedulingAssignmentCreateResponseSchema.safeParse({
      assignment: mapped,
      dependencyWarnings: dedupeWarnings(dependencyWarnings),
    });
    if (!out.success) {
      return c.json({ error: "serialize_error" }, 500);
    }
    return c.json(out.data, 201);
  };
}

export function createSchedulingAssignmentPatchHandler(getDb: () => Db | undefined) {
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
    const parsed = schedulingAssignmentPatchSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { error: "validation_error", issues: parsed.error.issues },
        400,
      );
    }

    const currentRows = await db
      .select()
      .from(schedulingAssignments)
      .where(
        and(
          eq(schedulingAssignments.id, id),
          eq(schedulingAssignments.tenantId, auth.tenantId),
        ),
      )
      .limit(1);
    const current = currentRows[0];
    if (!current) {
      return c.json({ error: "not_found" }, 404);
    }

    const patch = parsed.data;
    const nextEmployeeId = patch.employeeId ?? current.employeeId;
    const nextDate = patch.date ?? String(current.date);
    const nextStartTime = patch.startTime ?? formatTimeForApi(current.startTime);
    const nextTitle =
      patch.title !== undefined ? patch.title.trim() : current.title;
    const nextPlace =
      patch.place !== undefined
        ? patch.place?.trim()
          ? patch.place.trim()
          : null
        : current.place ?? null;
    const nextReminder =
      patch.reminderMinutesBefore !== undefined
        ? patch.reminderMinutesBefore
        : current.reminderMinutesBefore;

    let nextProjectId: string | null = current.projectId ?? null;
    if (patch.projectId !== undefined) {
      const projectResolved = await resolveSchedulingProjectId(
        db,
        auth.tenantId,
        patch.projectId,
      );
      if (!projectResolved.ok) {
        return c.json({ error: "project_not_found" }, 404);
      }
      nextProjectId = projectResolved.projectId;
    }

    const employeeRows = await db
      .select({ id: employees.id })
      .from(employees)
      .where(
        and(
          eq(employees.id, nextEmployeeId),
          eq(employees.tenantId, auth.tenantId),
          isNull(employees.archivedAt),
        ),
      )
      .limit(1);
    if (!employeeRows[0]) {
      return c.json({ error: "employee_not_found" }, 404);
    }

    const sameSlotRows = await db
      .select({ id: schedulingAssignments.id })
      .from(schedulingAssignments)
      .where(
        and(
          eq(schedulingAssignments.tenantId, auth.tenantId),
          eq(schedulingAssignments.employeeId, nextEmployeeId),
          eq(schedulingAssignments.date, nextDate),
          eq(schedulingAssignments.startTime, nextStartTime),
          ne(schedulingAssignments.id, id),
        ),
      )
      .limit(1);
    if (sameSlotRows[0]) {
      return c.json({ error: "employee_slot_conflict" }, 409);
    }

    const relationshipRows = await db
      .select()
      .from(employeeRelationships)
      .where(
        and(
          eq(employeeRelationships.tenantId, auth.tenantId),
          or(
            eq(employeeRelationships.fromEmployeeId, nextEmployeeId),
            eq(employeeRelationships.toEmployeeId, nextEmployeeId),
          ),
          inArray(employeeRelationships.kind, [
            "MUTUALLY_EXCLUSIVE",
            "MENTOR_TRAINEE",
          ]),
        ),
      );

    const mutexCounterpartIds = relationshipRows
      .filter((r) => r.kind === "MUTUALLY_EXCLUSIVE")
      .map((r) =>
        r.fromEmployeeId === nextEmployeeId ? r.toEmployeeId : r.fromEmployeeId,
      );
    if (mutexCounterpartIds.length > 0) {
      const conflicts = await db
        .select({ employeeId: schedulingAssignments.employeeId })
        .from(schedulingAssignments)
        .where(
          and(
            eq(schedulingAssignments.tenantId, auth.tenantId),
            eq(schedulingAssignments.date, nextDate),
            eq(schedulingAssignments.startTime, nextStartTime),
            inArray(schedulingAssignments.employeeId, [
              ...new Set(mutexCounterpartIds),
            ]),
            ne(schedulingAssignments.id, id),
          ),
        );
      if (conflicts.length > 0) {
        return c.json(
          {
            error: "mutually_exclusive_conflict",
            conflictingEmployeeIds: [...new Set(conflicts.map((c0) => c0.employeeId))],
          },
          409,
        );
      }
    }

    const dependencyWarnings: DependencyWarning[] = [];
    const mentorIds = relationshipRows
      .filter((r) => r.kind === "MENTOR_TRAINEE" && r.toEmployeeId === nextEmployeeId)
      .map((r) => r.fromEmployeeId);
    if (mentorIds.length > 0) {
      const mentorAssignments = await db
        .select({ employeeId: schedulingAssignments.employeeId })
        .from(schedulingAssignments)
        .where(
          and(
            eq(schedulingAssignments.tenantId, auth.tenantId),
            eq(schedulingAssignments.date, nextDate),
            eq(schedulingAssignments.startTime, nextStartTime),
            inArray(schedulingAssignments.employeeId, [...new Set(mentorIds)]),
            ne(schedulingAssignments.id, id),
          ),
        );
      const assignedMentorIds = new Set(mentorAssignments.map((m) => m.employeeId));
      for (const mentorId of mentorIds) {
        if (!assignedMentorIds.has(mentorId)) {
          dependencyWarnings.push({
            kind: "MENTOR_TRAINEE",
            employeeId: nextEmployeeId,
            relatedEmployeeId: mentorId,
            message: "Trainee is assigned without mentor on same slot.",
          });
        }
      }
    }

    const now = new Date();
    const [updated] = await db
      .update(schedulingAssignments)
      .set({
        employeeId: nextEmployeeId,
        date: nextDate,
        startTime: nextStartTime,
        title: nextTitle,
        place: nextPlace,
        reminderMinutesBefore: nextReminder ?? null,
        projectId: nextProjectId,
        updatedAt: now,
      })
      .where(
        and(
          eq(schedulingAssignments.id, id),
          eq(schedulingAssignments.tenantId, auth.tenantId),
        ),
      )
      .returning();
    if (!updated) {
      return c.json({ error: "not_found" }, 404);
    }

    const out = schedulingAssignmentCreateResponseSchema.safeParse({
      assignment: mapAssignmentRow(updated),
      dependencyWarnings: dedupeWarnings(dependencyWarnings),
    });
    if (!out.success) {
      return c.json({ error: "serialize_error" }, 500);
    }
    return c.json(out.data);
  };
}

export function createSchedulingAssignmentDeleteHandler(getDb: () => Db | undefined) {
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
      .delete(schedulingAssignments)
      .where(
        and(
          eq(schedulingAssignments.id, id),
          eq(schedulingAssignments.tenantId, auth.tenantId),
        ),
      )
      .returning({ id: schedulingAssignments.id });

    if (!deleted[0]) {
      return c.json({ error: "not_found" }, 404);
    }
    return c.body(null, 204);
  };
}

export function createSchedulingAssignmentsIcsHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }

    const date = c.req.query("date")?.trim() ?? "";
    if (date && !DATE_RE.test(date)) {
      return c.json({ error: "validation_error" }, 400);
    }
    const projectId = c.req.query("projectId")?.trim() ?? "";
    if (projectId && !UUID_RE.test(projectId)) {
      return c.json({ error: "validation_error" }, 400);
    }

    const icsConditions = [
      eq(schedulingAssignments.tenantId, auth.tenantId),
      ...(date ? [eq(schedulingAssignments.date, date)] : []),
      ...(projectId ? [eq(schedulingAssignments.projectId, projectId)] : []),
    ];

    const assignments = await db
      .select()
      .from(schedulingAssignments)
      .where(and(...icsConditions))
      .orderBy(asc(schedulingAssignments.date), asc(schedulingAssignments.startTime));

    if (assignments.length === 0) {
      const emptyIcs = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//zgwerkrepo//Scheduling//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "END:VCALENDAR",
      ].join("\r\n");
      return c.body(emptyIcs, 200, {
        "Content-Type": "text/calendar; charset=utf-8",
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="${date ? `scheduling-${date}.ics` : "scheduling.ics"}"`,
      });
    }

    const employeeIds = Array.from(new Set(assignments.map((a) => a.employeeId)));
    const assignmentProjectIds = Array.from(
      new Set(
        assignments
          .map((a) => a.projectId)
          .filter((id): id is string => typeof id === "string" && id.length > 0),
      ),
    );
    const [employeeRows, projectRows] = await Promise.all([
      db
        .select({ id: employees.id, displayName: employees.displayName })
        .from(employees)
        .where(
          and(
            eq(employees.tenantId, auth.tenantId),
            inArray(employees.id, employeeIds),
          ),
        ),
      assignmentProjectIds.length === 0
        ? Promise.resolve([] as { id: string; title: string }[])
        : db
            .select({ id: projects.id, title: projects.title })
            .from(projects)
            .where(
              and(
                eq(projects.tenantId, auth.tenantId),
                inArray(projects.id, assignmentProjectIds),
              ),
            ),
    ]);
    const employeeNameById = new Map(employeeRows.map((e) => [e.id, e.displayName]));
    const projectTitleById = new Map(projectRows.map((p) => [p.id, p.title]));

    const stamp = formatIcsStampUtc(new Date());
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//zgwerkrepo//Scheduling//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
    ];

    for (const a of assignments) {
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${a.id}@zunftgewerk.local`);
      lines.push(`DTSTAMP:${stamp}`);
      lines.push(`DTSTART:${formatIcsLocalDateTime(String(a.date), formatTimeForApi(a.startTime))}`);
      lines.push("DURATION:PT1H");
      lines.push(`SUMMARY:${escapeIcsText(a.title)}`);
      if (a.place) {
        lines.push(`LOCATION:${escapeIcsText(a.place)}`);
      }
      const employeeName = employeeNameById.get(a.employeeId);
      const projectTitle = a.projectId ? projectTitleById.get(a.projectId) : undefined;
      const descParts = [
        employeeName,
        projectTitle ? `Project: ${projectTitle}` : null,
      ].filter((p): p is string => Boolean(p));
      if (descParts.length > 0) {
        lines.push(`DESCRIPTION:${escapeIcsText(descParts.join(" · "))}`);
      }
      if (a.reminderMinutesBefore != null && a.reminderMinutesBefore > 0) {
        lines.push("BEGIN:VALARM");
        lines.push(`TRIGGER:-PT${a.reminderMinutesBefore}M`);
        lines.push("ACTION:DISPLAY");
        lines.push("DESCRIPTION:Reminder");
        lines.push("END:VALARM");
      }
      lines.push("END:VEVENT");
    }

    lines.push("END:VCALENDAR");
    const ics = lines.join("\r\n");
    return c.body(ics, 200, {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${date ? `scheduling-${date}.ics` : "scheduling.ics"}"`,
    });
  };
}
