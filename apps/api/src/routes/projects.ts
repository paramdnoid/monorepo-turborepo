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
import { customerAddresses, customers, projects, type Db } from "@repo/db";

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
