import type { SQL } from "drizzle-orm";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNull,
  lte,
  sql,
  sum,
} from "drizzle-orm";
import type { Context } from "hono";

import {
  projectCreateRequestSchema,
  projectHubResponseSchema,
  projectPatchRequestSchema,
  projectResponseSchema,
  projectsListResponseSchema,
  projectStatusSchema,
} from "@repo/api-contracts";
import {
  customerAddresses,
  customers,
  employees,
  lvDocuments,
  projectAssets,
  projects,
  salesInvoicePayments,
  salesInvoiceReminders,
  salesInvoices,
  salesQuotes,
  schedulingAssignments,
  workTimeEntries,
  type Db,
} from "@repo/db";

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

function isoDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysIsoLocal(ymd: string, days: number): string {
  const parts = ymd.split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    return ymd;
  }
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return isoDateLocal(dt);
}

function toInt(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function toPercent(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return 0;
  }
  return Math.round((numerator / denominator) * 1000) / 10;
}

function percentDelta(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) {
    return current === 0 ? 0 : null;
  }
  return Math.round((((current - previous) / Math.abs(previous)) * 100) * 10) / 10;
}

function formatSiteAddressLabel(a: {
  label: string | null;
  recipientName: string;
  street: string;
  postalCode: string;
  city: string;
}): string {
  const label = a.label?.trim();
  const head = label && label.length > 0 ? label : a.recipientName.trim();
  return `${head} · ${a.street.trim()}, ${a.postalCode.trim()} ${a.city.trim()}`;
}

type ProjectRowForApi = {
  id: string;
  title: string;
  projectNumber: string | null;
  status: string;
  customerId: string | null;
  siteAddressId: string | null;
  customerLabel: string | null;
  customerDisplayName?: string | null;
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
    customerId: row.customerId ?? null,
    siteAddressId: row.siteAddressId ?? null,
    customerLabel: row.customerDisplayName ?? row.customerLabel ?? null,
    startDate: row.startDate ? formatDateForApi(row.startDate) : null,
    endDate: row.endDate ? formatDateForApi(row.endDate) : null,
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

type CustomerLookupRow = { id: string; displayName: string };

async function getCustomerForTenant(
  db: Db,
  tenantId: string,
  customerId: string,
): Promise<CustomerLookupRow | null> {
  const rows = await db
    .select({
      id: customers.id,
      displayName: customers.displayName,
    })
    .from(customers)
    .where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)))
    .limit(1);
  return rows[0] ?? null;
}

async function hasCustomerSiteAddress(
  db: Db,
  customerId: string,
  siteAddressId: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: customerAddresses.id })
    .from(customerAddresses)
    .where(
      and(
        eq(customerAddresses.id, siteAddressId),
        eq(customerAddresses.customerId, customerId),
      ),
    )
    .limit(1);
  return Boolean(rows[0]);
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
          or coalesce(${customers.displayName}, '') ilike ${pattern} escape '\\'
          or coalesce(${projects.customerLabel}, '') ilike ${pattern} escape '\\'
        )`,
      );
    }

    const [countRow] = await db
      .select({ n: sql<number>`cast(count(*) as int)` })
      .from(projects)
      .leftJoin(
        customers,
        and(
          eq(customers.id, projects.customerId),
          eq(customers.tenantId, auth.tenantId),
        ),
      )
      .where(and(...conditions));

    const rows = await db
      .select({
        id: projects.id,
        title: projects.title,
        projectNumber: projects.projectNumber,
        status: projects.status,
        customerId: projects.customerId,
        siteAddressId: projects.siteAddressId,
        customerDisplayName: customers.displayName,
        customerLabel: projects.customerLabel,
        startDate: projects.startDate,
        endDate: projects.endDate,
        archivedAt: projects.archivedAt,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .leftJoin(
        customers,
        and(
          eq(customers.id, projects.customerId),
          eq(customers.tenantId, auth.tenantId),
        ),
      )
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

    const customerId = parsedBody.data.customerId ?? null;
    let customer: CustomerLookupRow | null = null;
    if (customerId) {
      customer = await getCustomerForTenant(db, auth.tenantId, customerId);
      if (!customer) {
        return c.json({ error: "invalid_customer" }, 400);
      }
    }

    const siteAddressId = parsedBody.data.siteAddressId ?? null;
    if (siteAddressId) {
      if (!customerId) {
        return c.json({ error: "invalid_site_address" }, 400);
      }
      const isCustomerAddress = await hasCustomerSiteAddress(
        db,
        customerId,
        siteAddressId,
      );
      if (!isCustomerAddress) {
        return c.json({ error: "invalid_site_address" }, 400);
      }
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
          customerId,
          siteAddressId,
          customerLabel: customer?.displayName ?? parsedBody.data.customerLabel ?? null,
          startDate: parsedBody.data.startDate ?? null,
          endDate: parsedBody.data.endDate ?? null,
          updatedAt: now,
        })
        .returning();
      if (!inserted) {
        return c.json({ error: "insert_failed" }, 500);
      }
      const out = projectResponseSchema.safeParse({
        project: mapProjectRow({
          ...inserted,
          customerDisplayName: customer?.displayName ?? null,
        }),
      });
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

export function createProjectDetailHandler(getDb: () => Db | undefined) {
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

    const rows = await db
      .select({
        id: projects.id,
        title: projects.title,
        projectNumber: projects.projectNumber,
        status: projects.status,
        customerId: projects.customerId,
        siteAddressId: projects.siteAddressId,
        customerDisplayName: customers.displayName,
        customerLabel: projects.customerLabel,
        startDate: projects.startDate,
        endDate: projects.endDate,
        archivedAt: projects.archivedAt,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .leftJoin(
        customers,
        and(
          eq(customers.id, projects.customerId),
          eq(customers.tenantId, auth.tenantId),
        ),
      )
      .where(and(eq(projects.id, id), eq(projects.tenantId, auth.tenantId)))
      .limit(1);

    const row = rows[0];
    if (!row) {
      return c.json({ error: "not_found" }, 404);
    }

    const out = projectResponseSchema.safeParse({ project: mapProjectRow(row) });
    if (!out.success) {
      return c.json({ error: "serialize_error" }, 500);
    }
    return c.json(out.data);
  };
}

export function createProjectHubDetailHandler(getDb: () => Db | undefined) {
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

    const rows = await db
      .select({
        id: projects.id,
        title: projects.title,
        projectNumber: projects.projectNumber,
        status: projects.status,
        customerId: projects.customerId,
        siteAddressId: projects.siteAddressId,
        customerDisplayName: customers.displayName,
        customerLabel: projects.customerLabel,
        startDate: projects.startDate,
        endDate: projects.endDate,
        archivedAt: projects.archivedAt,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .leftJoin(
        customers,
        and(
          eq(customers.id, projects.customerId),
          eq(customers.tenantId, auth.tenantId),
        ),
      )
      .where(and(eq(projects.id, id), eq(projects.tenantId, auth.tenantId)))
      .limit(1);

    const projectRow = rows[0];
    if (!projectRow) {
      return c.json({ error: "not_found" }, 404);
    }
    const project = mapProjectRow(projectRow);

    let siteAddressLabel: string | null = null;
    if (projectRow.customerId && projectRow.siteAddressId) {
      const [addressRow] = await db
        .select({
          label: customerAddresses.label,
          recipientName: customerAddresses.recipientName,
          street: customerAddresses.street,
          postalCode: customerAddresses.postalCode,
          city: customerAddresses.city,
        })
        .from(customerAddresses)
        .where(
          and(
            eq(customerAddresses.id, projectRow.siteAddressId),
            eq(customerAddresses.customerId, projectRow.customerId),
          ),
        )
        .limit(1);
      if (addressRow) {
        siteAddressLabel = formatSiteAddressLabel(addressRow);
      }
    }

    const now = new Date();
    const nowTs = now.getTime();
    const todayIso = isoDateLocal(now);
    const endIso = addDaysIsoLocal(todayIso, 6);
    const monthFrom = isoDateLocal(new Date(now.getFullYear(), now.getMonth(), 1));
    const monthTo = isoDateLocal(now);
    const last30Start = new Date(nowTs - 30 * 86_400_000);
    const prev30Start = new Date(nowTs - 60 * 86_400_000);

    // Fetch all independent hub blocks in parallel.
    const [
      quoteRows,
      invoiceRows,
      assetRows,
      assetAggRows,
      gaebRows,
      gaebAggRows,
      schedulingRows,
      workTimeRows,
      quoteAllRows,
      invoiceAllRows,
    ] = await Promise.all([
      db
        .select({
          id: salesQuotes.id,
          documentNumber: salesQuotes.documentNumber,
          status: salesQuotes.status,
          currency: salesQuotes.currency,
          totalCents: salesQuotes.totalCents,
          updatedAt: salesQuotes.updatedAt,
        })
        .from(salesQuotes)
        .where(
          and(eq(salesQuotes.tenantId, auth.tenantId), eq(salesQuotes.projectId, id)),
        )
        .orderBy(desc(salesQuotes.updatedAt))
        .limit(8),
      db
        .select({
          id: salesInvoices.id,
          documentNumber: salesInvoices.documentNumber,
          status: salesInvoices.status,
          billingType: salesInvoices.billingType,
          currency: salesInvoices.currency,
          totalCents: salesInvoices.totalCents,
          dueAt: salesInvoices.dueAt,
          updatedAt: salesInvoices.updatedAt,
        })
        .from(salesInvoices)
        .where(
          and(
            eq(salesInvoices.tenantId, auth.tenantId),
            eq(salesInvoices.projectId, id),
          ),
        )
        .orderBy(desc(salesInvoices.updatedAt))
        .limit(8),
      db
        .select({
          id: projectAssets.id,
          filename: projectAssets.filename,
          kind: projectAssets.kind,
          byteSize: projectAssets.byteSize,
          createdAt: projectAssets.createdAt,
        })
        .from(projectAssets)
        .where(
          and(eq(projectAssets.tenantId, auth.tenantId), eq(projectAssets.projectId, id)),
        )
        .orderBy(desc(projectAssets.createdAt))
        .limit(8),
      db
        .select({
          assetCount: count(),
          assetBytesTotal: sum(projectAssets.byteSize),
        })
        .from(projectAssets)
        .where(
          and(eq(projectAssets.tenantId, auth.tenantId), eq(projectAssets.projectId, id)),
        )
        .limit(1),
      db
        .select({
          id: lvDocuments.id,
          filename: lvDocuments.filename,
          status: lvDocuments.status,
          updatedAt: lvDocuments.updatedAt,
        })
        .from(lvDocuments)
        .where(
          and(
            eq(lvDocuments.tenantId, auth.tenantId),
            eq(lvDocuments.projectId, id),
            gt(lvDocuments.purgeAfterAt, now),
          ),
        )
        .orderBy(desc(lvDocuments.updatedAt))
        .limit(8),
      db
        .select({ gaebDocumentCount: count() })
        .from(lvDocuments)
        .where(
          and(
            eq(lvDocuments.tenantId, auth.tenantId),
            eq(lvDocuments.projectId, id),
            gt(lvDocuments.purgeAfterAt, now),
          ),
        )
        .limit(1),
      db
        .select({
          id: schedulingAssignments.id,
          date: schedulingAssignments.date,
          startTime: schedulingAssignments.startTime,
          title: schedulingAssignments.title,
        })
        .from(schedulingAssignments)
        .where(
          and(
            eq(schedulingAssignments.tenantId, auth.tenantId),
            eq(schedulingAssignments.projectId, id),
            gte(schedulingAssignments.date, todayIso),
            lte(schedulingAssignments.date, endIso),
          ),
        )
        .orderBy(asc(schedulingAssignments.date), asc(schedulingAssignments.startTime))
        .limit(100),
      db
        .select({
          id: workTimeEntries.id,
          workDate: workTimeEntries.workDate,
          durationMinutes: workTimeEntries.durationMinutes,
          notes: workTimeEntries.notes,
          employeeName: employees.displayName,
          createdAt: workTimeEntries.createdAt,
        })
        .from(workTimeEntries)
        .leftJoin(employees, eq(employees.id, workTimeEntries.employeeId))
        .where(
          and(
            eq(workTimeEntries.tenantId, auth.tenantId),
            eq(workTimeEntries.projectId, id),
            gte(workTimeEntries.workDate, monthFrom),
            lte(workTimeEntries.workDate, monthTo),
          ),
        )
        .orderBy(desc(workTimeEntries.workDate), desc(workTimeEntries.createdAt))
        .limit(200),
      db
        .select({
          status: salesQuotes.status,
          totalCents: salesQuotes.totalCents,
          createdAt: salesQuotes.createdAt,
        })
        .from(salesQuotes)
        .where(and(eq(salesQuotes.tenantId, auth.tenantId), eq(salesQuotes.projectId, id))),
      db
        .select({
          id: salesInvoices.id,
          documentNumber: salesInvoices.documentNumber,
          customerLabel: salesInvoices.customerLabel,
          totalCents: salesInvoices.totalCents,
          dueAt: salesInvoices.dueAt,
          status: salesInvoices.status,
          currency: salesInvoices.currency,
          issuedAt: salesInvoices.issuedAt,
          createdAt: salesInvoices.createdAt,
        })
        .from(salesInvoices)
        .where(
          and(
            eq(salesInvoices.tenantId, auth.tenantId),
            eq(salesInvoices.projectId, id),
            sql`${salesInvoices.status} <> 'cancelled'`,
          ),
        ),
    ]);

    const workTimeTotalMinutes = workTimeRows.reduce(
      (sum, row) => sum + row.durationMinutes,
      0,
    );
    const assetAgg = assetAggRows[0] ?? { assetCount: 0, assetBytesTotal: 0 };
    const assetCount = toInt(assetAgg.assetCount);
    const assetBytesTotal = toInt(assetAgg.assetBytesTotal);
    const gaebDocumentCount = toInt(gaebAggRows[0]?.gaebDocumentCount ?? 0);
    const invoiceIds = invoiceAllRows.map((row) => row.id);
    const paymentData =
      invoiceIds.length > 0
        ? await Promise.all([
            db
              .select({
                invoiceId: salesInvoicePayments.invoiceId,
                amount: sum(salesInvoicePayments.amountCents),
              })
              .from(salesInvoicePayments)
              .where(
                and(
                  eq(salesInvoicePayments.tenantId, auth.tenantId),
                  inArray(salesInvoicePayments.invoiceId, invoiceIds),
                ),
              )
              .groupBy(salesInvoicePayments.invoiceId),
            db
              .select({
                last30Amount:
                  sql<number>`coalesce(sum(case when ${salesInvoicePayments.paidAt} >= ${last30Start} then ${salesInvoicePayments.amountCents} else 0 end), 0)`,
                previous30Amount:
                  sql<number>`coalesce(sum(case when ${salesInvoicePayments.paidAt} >= ${prev30Start} and ${salesInvoicePayments.paidAt} < ${last30Start} then ${salesInvoicePayments.amountCents} else 0 end), 0)`,
              })
              .from(salesInvoicePayments)
              .where(
                and(
                  eq(salesInvoicePayments.tenantId, auth.tenantId),
                  inArray(salesInvoicePayments.invoiceId, invoiceIds),
                ),
              ),
            db
              .select({
                id: salesInvoiceReminders.id,
                invoiceId: salesInvoiceReminders.invoiceId,
                level: salesInvoiceReminders.level,
                sentAt: salesInvoiceReminders.sentAt,
              })
              .from(salesInvoiceReminders)
              .where(
                and(
                  eq(salesInvoiceReminders.tenantId, auth.tenantId),
                  inArray(salesInvoiceReminders.invoiceId, invoiceIds),
                ),
              )
              .orderBy(
                desc(salesInvoiceReminders.sentAt),
                desc(salesInvoiceReminders.createdAt),
              ),
          ])
        : null;
    const paymentAggRows = paymentData?.[0] ?? [];
    const paymentTrendRow = paymentData?.[1][0] ?? { last30Amount: 0, previous30Amount: 0 };
    const reminderRows = paymentData?.[2] ?? [];

    const paidByInvoiceId = new Map<string, number>();
    for (const row of paymentAggRows) {
      paidByInvoiceId.set(row.invoiceId, toInt(row.amount));
    }
    const remindersByInvoiceId = new Map<
      string,
      { count: number; maxLevel: number | null; latestReminderId: string | null }
    >();
    for (const row of reminderRows) {
      const curr = remindersByInvoiceId.get(row.invoiceId) ?? {
        count: 0,
        maxLevel: null,
        latestReminderId: null,
      };
      curr.count += 1;
      curr.maxLevel = curr.maxLevel == null ? row.level : Math.max(curr.maxLevel, row.level);
      if (!curr.latestReminderId) {
        curr.latestReminderId = row.id;
      }
      remindersByInvoiceId.set(row.invoiceId, curr);
    }

    const openItems = invoiceAllRows
      .map((row) => {
        const paid = paidByInvoiceId.get(row.id) ?? 0;
        const balance = row.totalCents - paid;
        const reminders = remindersByInvoiceId.get(row.id) ?? {
          count: 0,
          maxLevel: null,
          latestReminderId: null,
        };
        return {
          id: row.id,
          documentNumber: row.documentNumber,
          customerLabel: row.customerLabel,
          dueAt: row.dueAt ? row.dueAt.toISOString() : null,
          currency: row.currency,
          balanceCents: balance,
          reminderCount: reminders.count,
          maxReminderLevel: reminders.maxLevel,
          latestReminderId: reminders.latestReminderId,
        };
      })
      .filter((row) => row.balanceCents > 0)
      .sort((a, b) => {
        const da = a.dueAt ?? "9999-12-31T00:00:00.000Z";
        const dbv = b.dueAt ?? "9999-12-31T00:00:00.000Z";
        return da.localeCompare(dbv);
      });

    const quotePipeline = {
      draft: 0,
      sent: 0,
      accepted: 0,
      rejected: 0,
      expired: 0,
    };
    const quoteSegmentCurrent = {
      count: 0,
      volumeCents: 0,
      acceptedCount: 0,
    };
    const quoteSegmentPrevious = {
      count: 0,
      volumeCents: 0,
      acceptedCount: 0,
    };
    const last30StartTs = last30Start.getTime();
    const prev30StartTs = prev30Start.getTime();
    let quoteVolumeCents = 0;
    for (const row of quoteAllRows) {
      quoteVolumeCents += row.totalCents;
      if (row.status === "draft") quotePipeline.draft += 1;
      else if (row.status === "sent") quotePipeline.sent += 1;
      else if (row.status === "accepted") quotePipeline.accepted += 1;
      else if (row.status === "rejected") quotePipeline.rejected += 1;
      else if (row.status === "expired") quotePipeline.expired += 1;

      const createdTs = row.createdAt.getTime();
      if (!Number.isFinite(createdTs)) continue;
      if (createdTs >= last30StartTs) {
        quoteSegmentCurrent.count += 1;
        quoteSegmentCurrent.volumeCents += row.totalCents;
        if (row.status === "accepted") quoteSegmentCurrent.acceptedCount += 1;
      } else if (createdTs >= prev30StartTs) {
        quoteSegmentPrevious.count += 1;
        quoteSegmentPrevious.volumeCents += row.totalCents;
        if (row.status === "accepted") quoteSegmentPrevious.acceptedCount += 1;
      }
    }

    const quoteCount = quoteAllRows.length;
    const acceptedQuoteCount = quotePipeline.accepted;
    const quoteAcceptanceRatePercent = toPercent(acceptedQuoteCount, quoteCount);

    const invoicePipeline = {
      draft: 0,
      sent: 0,
      overdue: 0,
      paid: 0,
    };
    const invoiceSegmentCurrent = {
      count: 0,
      volumeCents: 0,
      paidCount: 0,
    };
    const invoiceSegmentPrevious = {
      count: 0,
      volumeCents: 0,
      paidCount: 0,
    };
    const invoiceCount = invoiceAllRows.length;
    let invoiceVolumeCents = 0;
    for (const row of invoiceAllRows) {
      invoiceVolumeCents += row.totalCents;
      if (row.status === "draft") invoicePipeline.draft += 1;
      else if (row.status === "sent") invoicePipeline.sent += 1;
      else if (row.status === "overdue") invoicePipeline.overdue += 1;
      else if (row.status === "paid") invoicePipeline.paid += 1;

      const segmentTs = (row.issuedAt ?? row.createdAt).getTime();
      if (!Number.isFinite(segmentTs)) continue;
      if (segmentTs >= last30StartTs) {
        invoiceSegmentCurrent.count += 1;
        invoiceSegmentCurrent.volumeCents += row.totalCents;
        if (row.status === "paid") invoiceSegmentCurrent.paidCount += 1;
      } else if (segmentTs >= prev30StartTs) {
        invoiceSegmentPrevious.count += 1;
        invoiceSegmentPrevious.volumeCents += row.totalCents;
        if (row.status === "paid") invoiceSegmentPrevious.paidCount += 1;
      }
    }

    const paidInvoiceCount = invoicePipeline.paid;
    const paidInvoiceRatePercent = toPercent(paidInvoiceCount, invoiceCount);

    const quoteSentOrLaterCount =
      quotePipeline.sent +
      quotePipeline.accepted +
      quotePipeline.rejected +
      quotePipeline.expired;
    const invoiceIssuedCount =
      invoicePipeline.sent + invoicePipeline.overdue + invoicePipeline.paid;

    const segmentLast30 = {
      quoteCount: quoteSegmentCurrent.count,
      quoteVolumeCents: quoteSegmentCurrent.volumeCents,
      acceptedQuoteCount: quoteSegmentCurrent.acceptedCount,
      quoteAcceptanceRatePercent: toPercent(
        quoteSegmentCurrent.acceptedCount,
        quoteSegmentCurrent.count,
      ),
      invoiceCount: invoiceSegmentCurrent.count,
      invoiceVolumeCents: invoiceSegmentCurrent.volumeCents,
      paidInvoiceCount: invoiceSegmentCurrent.paidCount,
      paidInvoiceRatePercent: toPercent(
        invoiceSegmentCurrent.paidCount,
        invoiceSegmentCurrent.count,
      ),
      paymentReceivedCents: toInt(paymentTrendRow?.last30Amount ?? 0),
    };
    const segmentPrevious30 = {
      quoteCount: quoteSegmentPrevious.count,
      quoteVolumeCents: quoteSegmentPrevious.volumeCents,
      acceptedQuoteCount: quoteSegmentPrevious.acceptedCount,
      quoteAcceptanceRatePercent: toPercent(
        quoteSegmentPrevious.acceptedCount,
        quoteSegmentPrevious.count,
      ),
      invoiceCount: invoiceSegmentPrevious.count,
      invoiceVolumeCents: invoiceSegmentPrevious.volumeCents,
      paidInvoiceCount: invoiceSegmentPrevious.paidCount,
      paidInvoiceRatePercent: toPercent(
        invoiceSegmentPrevious.paidCount,
        invoiceSegmentPrevious.count,
      ),
      paymentReceivedCents: toInt(paymentTrendRow?.previous30Amount ?? 0),
    };

    const openBalanceCents = openItems.reduce((sum, row) => sum + row.balanceCents, 0);
    const overdueOpenCount = openItems.filter((row) => {
      if (!row.dueAt) return false;
      const due = new Date(row.dueAt);
      return Number.isFinite(due.getTime()) && due.getTime() < nowTs;
    }).length;

    const payload = {
      project,
      siteAddressLabel,
      quotes: quoteRows.map((row) => ({
        id: row.id,
        documentNumber: row.documentNumber,
        status: row.status,
        currency: row.currency,
        totalCents: row.totalCents,
        updatedAt: row.updatedAt.toISOString(),
      })),
      invoices: invoiceRows.map((row) => ({
        id: row.id,
        documentNumber: row.documentNumber,
        status: row.status,
        billingType:
          row.billingType === "partial" ||
          row.billingType === "final" ||
          row.billingType === "credit_note"
            ? row.billingType
            : "invoice",
        currency: row.currency,
        totalCents: row.totalCents,
        dueAt: row.dueAt ? row.dueAt.toISOString() : null,
        updatedAt: row.updatedAt.toISOString(),
      })),
      assets: assetRows.map((row) => ({
        id: row.id,
        filename: row.filename,
        kind:
          row.kind === "plan" ||
          row.kind === "photo" ||
          row.kind === "other"
            ? row.kind
            : "document",
        byteSize: row.byteSize,
        createdAt: row.createdAt.toISOString(),
      })),
      gaebDocuments: gaebRows.map((row) => ({
        id: row.id,
        filename: row.filename,
        status:
          row.status === "failed" || row.status === "approved"
            ? row.status
            : "pending_review",
        updatedAt: row.updatedAt.toISOString(),
      })),
      schedulingWeek: schedulingRows.map((row) => ({
        id: row.id,
        date: row.date,
        startTime: row.startTime,
        title: row.title,
      })),
      workTime: {
        totalMinutes: workTimeTotalMinutes,
        entries: workTimeRows.slice(0, 5).map((row) => ({
          id: row.id,
          workDate: row.workDate,
          durationMinutes: row.durationMinutes,
          employeeName: row.employeeName ?? null,
          notes: row.notes ?? null,
        })),
      },
      receivables: {
        total: openItems.length,
        invoices: openItems.slice(0, 5),
      },
      pipeline: {
        quotes: {
          draft: quotePipeline.draft,
          sent: quotePipeline.sent,
          accepted: acceptedQuoteCount,
          rejected: quotePipeline.rejected,
          expired: quotePipeline.expired,
        },
        invoices: {
          draft: invoicePipeline.draft,
          sent: invoicePipeline.sent,
          overdue: invoicePipeline.overdue,
          paid: paidInvoiceCount,
        },
        progress: {
          quotesSentOrLaterPercent: toPercent(quoteSentOrLaterCount, quoteCount),
          quotesAcceptedPercent: toPercent(acceptedQuoteCount, quoteCount),
          quotesAcceptedFromSentPercent: toPercent(
            acceptedQuoteCount,
            quoteSentOrLaterCount,
          ),
          invoicesIssuedPercent: toPercent(invoiceIssuedCount, invoiceCount),
          invoicesPaidFromIssuedPercent: toPercent(
            paidInvoiceCount,
            invoiceIssuedCount,
          ),
          invoicesOverdueFromIssuedPercent: toPercent(
            invoicePipeline.overdue,
            invoiceIssuedCount,
          ),
        },
      },
      kpis: {
        quoteCount,
        quoteVolumeCents,
        acceptedQuoteCount,
        quoteAcceptanceRatePercent,
        invoiceCount,
        invoiceVolumeCents,
        paidInvoiceCount,
        paidInvoiceRatePercent,
        openBalanceCents,
        overdueOpenCount,
        next7AssignmentsCount: schedulingRows.length,
        workTimeMinutesMonthToDate: workTimeTotalMinutes,
        assetCount,
        assetBytesTotal,
        gaebDocumentCount,
      },
      segments: {
        last30Days: segmentLast30,
        previous30Days: segmentPrevious30,
        trends: {
          quoteCountDeltaPercent: percentDelta(
            segmentLast30.quoteCount,
            segmentPrevious30.quoteCount,
          ),
          quoteVolumeDeltaPercent: percentDelta(
            segmentLast30.quoteVolumeCents,
            segmentPrevious30.quoteVolumeCents,
          ),
          quoteAcceptanceRateDeltaPercent: percentDelta(
            segmentLast30.quoteAcceptanceRatePercent,
            segmentPrevious30.quoteAcceptanceRatePercent,
          ),
          invoiceCountDeltaPercent: percentDelta(
            segmentLast30.invoiceCount,
            segmentPrevious30.invoiceCount,
          ),
          invoiceVolumeDeltaPercent: percentDelta(
            segmentLast30.invoiceVolumeCents,
            segmentPrevious30.invoiceVolumeCents,
          ),
          paymentReceivedDeltaPercent: percentDelta(
            segmentLast30.paymentReceivedCents,
            segmentPrevious30.paymentReceivedCents,
          ),
          paidInvoiceRateDeltaPercent: percentDelta(
            segmentLast30.paidInvoiceRatePercent,
            segmentPrevious30.paidInvoiceRatePercent,
          ),
        },
      },
    };
    const safe = projectHubResponseSchema.safeParse(payload);
    if (!safe.success) {
      return c.json({ error: "serialize_error" }, 500);
    }
    return c.json(safe.data);
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

    const nextCustomerId =
      p.customerId !== undefined ? p.customerId : existing.customerId;
    const nextSiteAddressId =
      p.customerId !== undefined
        ? p.customerId
          ? p.siteAddressId !== undefined
            ? p.siteAddressId
            : existing.customerId === p.customerId
              ? existing.siteAddressId
              : null
          : null
        : p.siteAddressId !== undefined
          ? p.siteAddressId
          : existing.siteAddressId;

    let nextCustomer: CustomerLookupRow | null = null;
    if (nextCustomerId) {
      nextCustomer = await getCustomerForTenant(db, auth.tenantId, nextCustomerId);
      if (!nextCustomer) {
        return c.json({ error: "invalid_customer" }, 400);
      }
    }
    if (nextSiteAddressId) {
      if (!nextCustomerId) {
        return c.json({ error: "invalid_site_address" }, 400);
      }
      const isCustomerAddress = await hasCustomerSiteAddress(
        db,
        nextCustomerId,
        nextSiteAddressId,
      );
      if (!isCustomerAddress) {
        return c.json({ error: "invalid_site_address" }, 400);
      }
    }

    const updates: Partial<typeof projects.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (p.title !== undefined) updates.title = p.title.trim();
    if (p.projectNumber !== undefined) updates.projectNumber = p.projectNumber;
    if (p.status !== undefined) updates.status = p.status;
    if (p.customerId !== undefined) {
      updates.customerId = nextCustomerId;
      if (nextCustomer) {
        updates.customerLabel = nextCustomer.displayName;
      }
      if (nextCustomerId === null || existing.customerId !== nextCustomerId) {
        updates.siteAddressId = nextSiteAddressId;
      }
    }
    if (p.siteAddressId !== undefined) {
      updates.siteAddressId = nextSiteAddressId;
    }
    if (
      p.customerLabel !== undefined &&
      (p.customerId === undefined || p.customerId === null)
    ) {
      updates.customerLabel = p.customerLabel;
    }
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
      const out = projectResponseSchema.safeParse({
        project: mapProjectRow({
          ...updated,
          customerDisplayName: nextCustomer?.displayName ?? null,
        }),
      });
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
