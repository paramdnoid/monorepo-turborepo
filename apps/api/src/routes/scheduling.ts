import { and, asc, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import type { Context } from "hono";

import {
  schedulingAssignmentCreateResponseSchema,
  schedulingAssignmentCreateSchema,
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
  schedulingAssignments,
  type Db,
} from "@repo/db";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
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
    if (date && !DATE_RE.test(date)) {
      return c.json({ error: "validation_error" }, 400);
    }

    const where = date
      ? and(
          eq(schedulingAssignments.tenantId, auth.tenantId),
          eq(schedulingAssignments.date, date),
        )
      : eq(schedulingAssignments.tenantId, auth.tenantId);

    const rows = await db
      .select()
      .from(schedulingAssignments)
      .where(where)
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
      return c.json({ error: "validation_error" }, 400);
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
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
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
    const where = date
      ? and(
          eq(schedulingAssignments.tenantId, auth.tenantId),
          eq(schedulingAssignments.date, date),
        )
      : eq(schedulingAssignments.tenantId, auth.tenantId);

    const assignments = await db
      .select()
      .from(schedulingAssignments)
      .where(where)
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
    const employeeRows = await db
      .select({ id: employees.id, displayName: employees.displayName })
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, auth.tenantId),
          inArray(employees.id, employeeIds),
        ),
      );
    const employeeNameById = new Map(employeeRows.map((e) => [e.id, e.displayName]));

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
      if (employeeName) {
        lines.push(`DESCRIPTION:${escapeIcsText(employeeName)}`);
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
