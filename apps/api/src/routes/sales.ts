import { readFile } from "node:fs/promises";

import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  max,
  or,
  sql,
  sum,
  type SQL,
} from "drizzle-orm";
import type { Context } from "hono";
import { z } from "zod";

import {
  salesInvoicesListQuerySchema,
  salesInvoicesSortBySchema,
  salesCreateInvoiceFromQuoteSchema,
  salesCreateInvoiceLineSchema,
  salesCreateInvoiceSchema,
  salesCreateQuoteLineSchema,
  salesCreateQuoteSchema,
  salesQuotesListQuerySchema,
  salesQuotesSortBySchema,
  salesPatchInvoiceLineSchema,
  salesPatchInvoiceSchema,
  salesPatchQuoteLineSchema,
  salesPatchQuoteSchema,
  salesReorderDocumentLinesSchema,
} from "@repo/api-contracts";

import {
  customers,
  projects,
  salesLifecycleEvents,
  salesInvoiceLines,
  salesInvoices,
  salesQuoteLines,
  salesQuotes,
  type Db,
} from "@repo/db";

import { resolveProjectAssetsRoot } from "../env.js";
import { absoluteAssetPath } from "../project-assets-storage.js";
import {
  buildInvoicePdfBuffer,
  buildQuotePdfBuffer,
  salesPdfFilename,
  type SalesLetterhead,
  type SalesPdfLang,
} from "../sales-pdf.js";
import { canEditSalesDocuments } from "../auth/permissions.js";
import type { AuthContext } from "../auth/verify-token.js";

async function letterheadForPdf(org: {
  name: string;
  senderAddress: string | null;
  vatId: string | null;
  taxNumber: string | null;
  logoStorageRelativePath: string | null;
  logoContentType: string | null;
}): Promise<SalesLetterhead> {
  let logoImage: Buffer | null = null;
  const root = resolveProjectAssetsRoot();
  if (
    root &&
    org.logoStorageRelativePath &&
    (org.logoContentType === "image/jpeg" ||
      org.logoContentType === "image/png")
  ) {
    try {
      logoImage = await readFile(
        absoluteAssetPath(root, org.logoStorageRelativePath),
      );
    } catch {
      logoImage = null;
    }
  }
  return {
    orgName: org.name,
    senderAddress: org.senderAddress,
    vatId: org.vatId,
    taxNumber: org.taxNumber,
    logoImage,
  };
}

function uuidSetsEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const sa = [...a].sort();
  const sb = [...b].sort();
  for (let i = 0; i < sa.length; i++) {
    if (sa[i] !== sb[i]) {
      return false;
    }
  }
  return true;
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "23505"
  );
}

type SalesLifecycleEntity = "quote" | "invoice";
type SalesLifecycleAction =
  | "quote_archived"
  | "quote_unarchived"
  | "quote_deleted"
  | "invoice_cancelled"
  | "invoice_deleted";

async function logSalesLifecycleEvent(
  db: Db,
  args: {
    tenantId: string;
    actorSub: string;
    entityType: SalesLifecycleEntity;
    entityId: string;
    action: SalesLifecycleAction;
    fromStatus: string | null;
    toStatus: string | null;
  },
): Promise<void> {
  await db.insert(salesLifecycleEvents).values({
    tenantId: args.tenantId,
    actorSub: args.actorSub,
    entityType: args.entityType,
    entityId: args.entityId,
    action: args.action,
    fromStatus: args.fromStatus,
    toStatus: args.toStatus,
  });
}

function salesListPermissions(auth: AuthContext): {
  canEdit: boolean;
  canArchive: boolean;
  canExport: boolean;
  canBatch: boolean;
} {
  const canEdit = canEditSalesDocuments(auth);
  return {
    canEdit,
    canArchive: canEdit,
    canExport: canEdit,
    canBatch: canEdit,
  };
}

function parseOptionalInstant(
  v: string | null | undefined,
): { ok: true; value: Date | null } | { ok: false } {
  if (v === undefined) {
    return { ok: true, value: null };
  }
  if (v === null || v === "") {
    return { ok: true, value: null };
  }
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) {
    return { ok: false };
  }
  return { ok: true, value: d };
}

function parseYmdBoundary(
  value: string | undefined,
  boundary: "start" | "end",
): { ok: true; value: Date | null } | { ok: false } {
  if (!value) {
    return { ok: true, value: null };
  }
  const parsed = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .safeParse(value);
  if (!parsed.success) {
    return { ok: false };
  }
  const suffix = boundary === "start" ? "T00:00:00.000Z" : "T23:59:59.999Z";
  const dt = new Date(`${value}${suffix}`);
  if (Number.isNaN(dt.getTime())) {
    return { ok: false };
  }
  return { ok: true, value: dt };
}

function parseListNumber(
  raw: string | undefined,
  kind: "limit" | "offset",
): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n)) return undefined;
  if (kind === "limit") {
    if (n < 1 || n > 200) return undefined;
  } else if (n < 0) {
    return undefined;
  }
  return n;
}

function mapQuoteRow(r: typeof salesQuotes.$inferSelect) {
  return {
    id: r.id,
    documentNumber: r.documentNumber,
    customerLabel: r.customerLabel,
    customerId: r.customerId ?? null,
    status: r.status,
    currency: r.currency,
    totalCents: r.totalCents,
    validUntil: r.validUntil ? r.validUntil.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

function mapInvoiceRow(r: typeof salesInvoices.$inferSelect) {
  return {
    id: r.id,
    documentNumber: r.documentNumber,
    customerLabel: r.customerLabel,
    customerId: r.customerId ?? null,
    status: r.status,
    currency: r.currency,
    totalCents: r.totalCents,
    issuedAt: r.issuedAt ? r.issuedAt.toISOString() : null,
    dueAt: r.dueAt ? r.dueAt.toISOString() : null,
    paidAt: r.paidAt ? r.paidAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

function mapQuoteLineRow(r: typeof salesQuoteLines.$inferSelect) {
  return {
    id: r.id,
    sortIndex: r.sortIndex,
    description: r.description,
    quantity: r.quantity ?? null,
    unit: r.unit ?? null,
    unitPriceCents: r.unitPriceCents,
    lineTotalCents: r.lineTotalCents,
  };
}

function mapInvoiceLineRow(r: typeof salesInvoiceLines.$inferSelect) {
  return {
    id: r.id,
    sortIndex: r.sortIndex,
    description: r.description,
    quantity: r.quantity ?? null,
    unit: r.unit ?? null,
    unitPriceCents: r.unitPriceCents,
    lineTotalCents: r.lineTotalCents,
  };
}

function sumFromAggregate(v: unknown): number {
  if (v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function salesQuoteLineCount(db: Db, quoteId: string): Promise<number> {
  const [row] = await db
    .select({ c: count() })
    .from(salesQuoteLines)
    .where(eq(salesQuoteLines.quoteId, quoteId));
  return Number(row?.c ?? 0);
}

async function salesInvoiceLineCount(db: Db, invoiceId: string): Promise<number> {
  const [row] = await db
    .select({ c: count() })
    .from(salesInvoiceLines)
    .where(eq(salesInvoiceLines.invoiceId, invoiceId));
  return Number(row?.c ?? 0);
}

async function recalcQuoteTotalCents(db: Db, quoteId: string): Promise<void> {
  const [agg] = await db
    .select({ t: sum(salesQuoteLines.lineTotalCents) })
    .from(salesQuoteLines)
    .where(eq(salesQuoteLines.quoteId, quoteId));
  const total = sumFromAggregate(agg?.t);
  await db
    .update(salesQuotes)
    .set({ totalCents: total, updatedAt: new Date() })
    .where(eq(salesQuotes.id, quoteId));
}

async function recalcInvoiceTotalCents(db: Db, invoiceId: string): Promise<void> {
  const [agg] = await db
    .select({ t: sum(salesInvoiceLines.lineTotalCents) })
    .from(salesInvoiceLines)
    .where(eq(salesInvoiceLines.invoiceId, invoiceId));
  const total = sumFromAggregate(agg?.t);
  await db
    .update(salesInvoices)
    .set({ totalCents: total, updatedAt: new Date() })
    .where(eq(salesInvoices.id, invoiceId));
}

async function buildQuoteDetailPayload(
  db: Db,
  tenantId: string,
  quoteId: string,
) {
  const rows = await db
    .select()
    .from(salesQuotes)
    .where(
      and(eq(salesQuotes.id, quoteId), eq(salesQuotes.tenantId, tenantId)),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const lines = await db
    .select()
    .from(salesQuoteLines)
    .where(eq(salesQuoteLines.quoteId, quoteId))
    .orderBy(asc(salesQuoteLines.sortIndex));
  return {
    quote: {
      ...mapQuoteRow(row),
      projectId: row.projectId ?? null,
      lines: lines.map(mapQuoteLineRow),
    },
  };
}

async function buildInvoiceDetailPayload(
  db: Db,
  tenantId: string,
  invoiceId: string,
) {
  const rows = await db
    .select()
    .from(salesInvoices)
    .where(
      and(
        eq(salesInvoices.id, invoiceId),
        eq(salesInvoices.tenantId, tenantId),
      ),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const lines = await db
    .select()
    .from(salesInvoiceLines)
    .where(eq(salesInvoiceLines.invoiceId, invoiceId))
    .orderBy(asc(salesInvoiceLines.sortIndex));
  return {
    invoice: {
      ...mapInvoiceRow(row),
      quoteId: row.quoteId ?? null,
      projectId: row.projectId ?? null,
      lines: lines.map(mapInvoiceLineRow),
    },
  };
}

async function quoteForTenant(
  db: Db,
  tenantId: string,
  quoteId: string,
): Promise<typeof salesQuotes.$inferSelect | null> {
  const rows = await db
    .select()
    .from(salesQuotes)
    .where(and(eq(salesQuotes.id, quoteId), eq(salesQuotes.tenantId, tenantId)))
    .limit(1);
  return rows[0] ?? null;
}

async function invoiceForTenant(
  db: Db,
  tenantId: string,
  invoiceId: string,
): Promise<typeof salesInvoices.$inferSelect | null> {
  const rows = await db
    .select()
    .from(salesInvoices)
    .where(
      and(eq(salesInvoices.id, invoiceId), eq(salesInvoices.tenantId, tenantId)),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function nextQuoteLineSortIndex(db: Db, quoteId: string): Promise<number> {
  const [row] = await db
    .select({ m: max(salesQuoteLines.sortIndex) })
    .from(salesQuoteLines)
    .where(eq(salesQuoteLines.quoteId, quoteId));
  const prev = row?.m != null ? Number(row.m) : -1;
  return prev + 1;
}

async function nextInvoiceLineSortIndex(
  db: Db,
  invoiceId: string,
): Promise<number> {
  const [row] = await db
    .select({ m: max(salesInvoiceLines.sortIndex) })
    .from(salesInvoiceLines)
    .where(eq(salesInvoiceLines.invoiceId, invoiceId));
  const prev = row?.m != null ? Number(row.m) : -1;
  return prev + 1;
}

export function createSalesQuotesListHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }
    const rawLimit = c.req.query("limit");
    const rawOffset = c.req.query("offset");
    const limit = parseListNumber(rawLimit, "limit");
    const offset = parseListNumber(rawOffset, "offset");
    if ((rawLimit && limit === undefined) || (rawOffset && offset === undefined)) {
      return c.json({ error: "validation_error" }, 400);
    }
    const queryParse = salesQuotesListQuerySchema.safeParse({
      q: c.req.query("q")?.trim() || undefined,
      status: c.req.query("status")?.trim() || undefined,
      dateFrom: c.req.query("dateFrom")?.trim() || undefined,
      dateTo: c.req.query("dateTo")?.trim() || undefined,
      sortBy: c.req.query("sortBy")?.trim() || undefined,
      sortDir: c.req.query("sortDir")?.trim() || undefined,
      limit,
      offset,
    });
    if (!queryParse.success) {
      return c.json({ error: "validation_error" }, 400);
    }
    const query = queryParse.data;
    const from = parseYmdBoundary(query.dateFrom, "start");
    const to = parseYmdBoundary(query.dateTo, "end");
    if (!from.ok || !to.ok) {
      return c.json({ error: "validation_error" }, 400);
    }
    if (from.value && to.value && from.value.getTime() > to.value.getTime()) {
      return c.json({ error: "validation_error" }, 400);
    }
    const where: SQL[] = [eq(salesQuotes.tenantId, auth.tenantId)];
    if (query.status) {
      where.push(eq(salesQuotes.status, query.status));
    }
    if (query.q) {
      const pattern = `%${query.q}%`;
      where.push(
        or(
          ilike(salesQuotes.documentNumber, pattern),
          ilike(salesQuotes.customerLabel, pattern),
        )!,
      );
    }
    if (from.value) {
      where.push(sql`${salesQuotes.updatedAt} >= ${from.value}`);
    }
    if (to.value) {
      where.push(sql`${salesQuotes.updatedAt} <= ${to.value}`);
    }
    const whereExpr = and(...where)!;
    const [countRow] = await db
      .select({ c: count() })
      .from(salesQuotes)
      .where(whereExpr);
    const sortBy = salesQuotesSortBySchema.parse(query.sortBy ?? "updatedAt");
    const sortDir = query.sortDir ?? "desc";
    const sortColumn =
      sortBy === "documentNumber"
        ? salesQuotes.documentNumber
        : sortBy === "customerLabel"
          ? salesQuotes.customerLabel
          : sortBy === "status"
            ? salesQuotes.status
            : sortBy === "totalCents"
              ? salesQuotes.totalCents
              : sortBy === "validUntil"
                ? salesQuotes.validUntil
                : salesQuotes.updatedAt;
    const rows = await db
      .select()
      .from(salesQuotes)
      .where(whereExpr)
      .orderBy(
        sortDir === "asc" ? asc(sortColumn) : desc(sortColumn),
        desc(salesQuotes.createdAt),
      )
      .limit(query.limit ?? 25)
      .offset(query.offset ?? 0);
    return c.json({
      quotes: rows.map(mapQuoteRow),
      total: Number(countRow?.c ?? 0),
      permissions: salesListPermissions(auth),
    });
  };
}

export function createSalesQuoteDetailHandler(getDb: () => Db | undefined) {
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
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }
    const payload = await buildQuoteDetailPayload(db, auth.tenantId, id);
    if (!payload) {
      return c.json({ error: "not_found" }, 404);
    }
    return c.json(payload);
  };
}

export function createSalesQuoteArchivePostHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) return c.json({ error: "missing_auth" }, 500);
    if (!canEditSalesDocuments(auth)) return c.json({ error: "forbidden" }, 403);
    const idParse = z.string().uuid().safeParse(c.req.param("id"));
    if (!idParse.success) return c.json({ error: "invalid_id" }, 400);
    const id = idParse.data;
    const db = getDb();
    if (!db) return c.json({ error: "database_unavailable" }, 503);

    const row = await quoteForTenant(db, auth.tenantId, id);
    if (!row) return c.json({ error: "not_found" }, 404);
    if (row.status === "expired") {
      const payload = await buildQuoteDetailPayload(db, auth.tenantId, id);
      if (!payload) return c.json({ error: "not_found" }, 404);
      return c.json(payload);
    }
    if (
      row.status !== "draft" &&
      row.status !== "sent" &&
      row.status !== "accepted" &&
      row.status !== "rejected"
    ) {
      return c.json({ error: "invalid_state" }, 409);
    }
    await db
      .update(salesQuotes)
      .set({ status: "expired", updatedAt: new Date() })
      .where(and(eq(salesQuotes.id, id), eq(salesQuotes.tenantId, auth.tenantId)));
    await logSalesLifecycleEvent(db, {
      tenantId: auth.tenantId,
      actorSub: auth.sub?.trim() || "unknown",
      entityType: "quote",
      entityId: id,
      action: "quote_archived",
      fromStatus: row.status,
      toStatus: "expired",
    });
    const payload = await buildQuoteDetailPayload(db, auth.tenantId, id);
    if (!payload) return c.json({ error: "not_found" }, 404);
    return c.json(payload);
  };
}

export function createSalesQuoteUnarchivePostHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) return c.json({ error: "missing_auth" }, 500);
    if (!canEditSalesDocuments(auth)) return c.json({ error: "forbidden" }, 403);
    const idParse = z.string().uuid().safeParse(c.req.param("id"));
    if (!idParse.success) return c.json({ error: "invalid_id" }, 400);
    const id = idParse.data;
    const db = getDb();
    if (!db) return c.json({ error: "database_unavailable" }, 503);

    const row = await quoteForTenant(db, auth.tenantId, id);
    if (!row) return c.json({ error: "not_found" }, 404);
    if (row.status !== "expired") {
      return c.json({ error: "invalid_state" }, 409);
    }
    await db
      .update(salesQuotes)
      .set({ status: "draft", updatedAt: new Date() })
      .where(and(eq(salesQuotes.id, id), eq(salesQuotes.tenantId, auth.tenantId)));
    await logSalesLifecycleEvent(db, {
      tenantId: auth.tenantId,
      actorSub: auth.sub?.trim() || "unknown",
      entityType: "quote",
      entityId: id,
      action: "quote_unarchived",
      fromStatus: row.status,
      toStatus: "draft",
    });
    const payload = await buildQuoteDetailPayload(db, auth.tenantId, id);
    if (!payload) return c.json({ error: "not_found" }, 404);
    return c.json(payload);
  };
}

export function createSalesQuoteDeleteHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) return c.json({ error: "missing_auth" }, 500);
    if (!canEditSalesDocuments(auth)) return c.json({ error: "forbidden" }, 403);
    const idParse = z.string().uuid().safeParse(c.req.param("id"));
    if (!idParse.success) return c.json({ error: "invalid_id" }, 400);
    const id = idParse.data;
    const db = getDb();
    if (!db) return c.json({ error: "database_unavailable" }, 503);

    const row = await quoteForTenant(db, auth.tenantId, id);
    if (!row) return c.json({ error: "not_found" }, 404);
    if (row.status !== "draft") {
      return c.json({ error: "invalid_state" }, 409);
    }
    const [invoiceRefs] = await db
      .select({ c: count() })
      .from(salesInvoices)
      .where(
        and(
          eq(salesInvoices.tenantId, auth.tenantId),
          eq(salesInvoices.quoteId, id),
        ),
      );
    if (Number(invoiceRefs?.c ?? 0) > 0) {
      return c.json({ error: "quote_has_invoices" }, 409);
    }
    const deleted = await db
      .delete(salesQuotes)
      .where(and(eq(salesQuotes.id, id), eq(salesQuotes.tenantId, auth.tenantId)))
      .returning({ id: salesQuotes.id });
    if (!deleted[0]) return c.json({ error: "not_found" }, 404);
    await logSalesLifecycleEvent(db, {
      tenantId: auth.tenantId,
      actorSub: auth.sub?.trim() || "unknown",
      entityType: "quote",
      entityId: id,
      action: "quote_deleted",
      fromStatus: row.status,
      toStatus: null,
    });
    return c.body(null, 204);
  };
}

export function createSalesInvoicesListHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }
    const rawLimit = c.req.query("limit");
    const rawOffset = c.req.query("offset");
    const limit = parseListNumber(rawLimit, "limit");
    const offset = parseListNumber(rawOffset, "offset");
    if ((rawLimit && limit === undefined) || (rawOffset && offset === undefined)) {
      return c.json({ error: "validation_error" }, 400);
    }
    const queryParse = salesInvoicesListQuerySchema.safeParse({
      q: c.req.query("q")?.trim() || undefined,
      status: c.req.query("status")?.trim() || undefined,
      dateFrom: c.req.query("dateFrom")?.trim() || undefined,
      dateTo: c.req.query("dateTo")?.trim() || undefined,
      sortBy: c.req.query("sortBy")?.trim() || undefined,
      sortDir: c.req.query("sortDir")?.trim() || undefined,
      limit,
      offset,
    });
    if (!queryParse.success) {
      return c.json({ error: "validation_error" }, 400);
    }
    const query = queryParse.data;
    const from = parseYmdBoundary(query.dateFrom, "start");
    const to = parseYmdBoundary(query.dateTo, "end");
    if (!from.ok || !to.ok) {
      return c.json({ error: "validation_error" }, 400);
    }
    if (from.value && to.value && from.value.getTime() > to.value.getTime()) {
      return c.json({ error: "validation_error" }, 400);
    }
    const where: SQL[] = [eq(salesInvoices.tenantId, auth.tenantId)];
    if (query.status) {
      where.push(eq(salesInvoices.status, query.status));
    }
    if (query.q) {
      const pattern = `%${query.q}%`;
      where.push(
        or(
          ilike(salesInvoices.documentNumber, pattern),
          ilike(salesInvoices.customerLabel, pattern),
        )!,
      );
    }
    if (from.value) {
      where.push(sql`${salesInvoices.updatedAt} >= ${from.value}`);
    }
    if (to.value) {
      where.push(sql`${salesInvoices.updatedAt} <= ${to.value}`);
    }
    const whereExpr = and(...where)!;
    const [countRow] = await db
      .select({ c: count() })
      .from(salesInvoices)
      .where(whereExpr);
    const sortBy = salesInvoicesSortBySchema.parse(query.sortBy ?? "updatedAt");
    const sortDir = query.sortDir ?? "desc";
    const sortColumn =
      sortBy === "documentNumber"
        ? salesInvoices.documentNumber
        : sortBy === "customerLabel"
          ? salesInvoices.customerLabel
          : sortBy === "status"
            ? salesInvoices.status
            : sortBy === "totalCents"
              ? salesInvoices.totalCents
              : sortBy === "dueAt"
                ? salesInvoices.dueAt
                : salesInvoices.updatedAt;
    const rows = await db
      .select()
      .from(salesInvoices)
      .where(whereExpr)
      .orderBy(
        sortDir === "asc" ? asc(sortColumn) : desc(sortColumn),
        desc(salesInvoices.createdAt),
      )
      .limit(query.limit ?? 25)
      .offset(query.offset ?? 0);
    return c.json({
      invoices: rows.map(mapInvoiceRow),
      total: Number(countRow?.c ?? 0),
      permissions: salesListPermissions(auth),
    });
  };
}

export function createSalesInvoiceDetailHandler(getDb: () => Db | undefined) {
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
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }
    const payload = await buildInvoiceDetailPayload(db, auth.tenantId, id);
    if (!payload) {
      return c.json({ error: "not_found" }, 404);
    }
    return c.json(payload);
  };
}

export function createSalesInvoiceCancelPostHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) return c.json({ error: "missing_auth" }, 500);
    if (!canEditSalesDocuments(auth)) return c.json({ error: "forbidden" }, 403);
    const idParse = z.string().uuid().safeParse(c.req.param("id"));
    if (!idParse.success) return c.json({ error: "invalid_id" }, 400);
    const id = idParse.data;
    const db = getDb();
    if (!db) return c.json({ error: "database_unavailable" }, 503);

    const row = await invoiceForTenant(db, auth.tenantId, id);
    if (!row) return c.json({ error: "not_found" }, 404);
    if (row.status === "cancelled") {
      const payload = await buildInvoiceDetailPayload(db, auth.tenantId, id);
      if (!payload) return c.json({ error: "not_found" }, 404);
      return c.json(payload);
    }
    if (row.status === "paid") {
      return c.json({ error: "cannot_cancel_paid" }, 409);
    }
    if (
      row.status !== "draft" &&
      row.status !== "sent" &&
      row.status !== "overdue"
    ) {
      return c.json({ error: "invalid_state" }, 409);
    }
    await db
      .update(salesInvoices)
      .set({ status: "cancelled", paidAt: null, updatedAt: new Date() })
      .where(
        and(eq(salesInvoices.id, id), eq(salesInvoices.tenantId, auth.tenantId)),
      );
    await logSalesLifecycleEvent(db, {
      tenantId: auth.tenantId,
      actorSub: auth.sub?.trim() || "unknown",
      entityType: "invoice",
      entityId: id,
      action: "invoice_cancelled",
      fromStatus: row.status,
      toStatus: "cancelled",
    });
    const payload = await buildInvoiceDetailPayload(db, auth.tenantId, id);
    if (!payload) return c.json({ error: "not_found" }, 404);
    return c.json(payload);
  };
}

export function createSalesInvoiceDeleteHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) return c.json({ error: "missing_auth" }, 500);
    if (!canEditSalesDocuments(auth)) return c.json({ error: "forbidden" }, 403);
    const idParse = z.string().uuid().safeParse(c.req.param("id"));
    if (!idParse.success) return c.json({ error: "invalid_id" }, 400);
    const id = idParse.data;
    const db = getDb();
    if (!db) return c.json({ error: "database_unavailable" }, 503);

    const row = await invoiceForTenant(db, auth.tenantId, id);
    if (!row) return c.json({ error: "not_found" }, 404);
    if (row.status !== "draft") {
      return c.json({ error: "invalid_state" }, 409);
    }
    const deleted = await db
      .delete(salesInvoices)
      .where(
        and(eq(salesInvoices.id, id), eq(salesInvoices.tenantId, auth.tenantId)),
      )
      .returning({ id: salesInvoices.id });
    if (!deleted[0]) return c.json({ error: "not_found" }, 404);
    await logSalesLifecycleEvent(db, {
      tenantId: auth.tenantId,
      actorSub: auth.sub?.trim() || "unknown",
      entityType: "invoice",
      entityId: id,
      action: "invoice_deleted",
      fromStatus: row.status,
      toStatus: null,
    });
    return c.body(null, 204);
  };
}

async function assertProjectForTenant(
  db: Db,
  tenantId: string,
  projectId: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.tenantId, tenantId)))
    .limit(1);
  return Boolean(rows[0]);
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

async function assertQuoteForTenant(
  db: Db,
  tenantId: string,
  quoteId: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: salesQuotes.id })
    .from(salesQuotes)
    .where(and(eq(salesQuotes.id, quoteId), eq(salesQuotes.tenantId, tenantId)))
    .limit(1);
  return Boolean(rows[0]);
}

export function createSalesQuotePostHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    if (!canEditSalesDocuments(auth)) {
      return c.json({ error: "forbidden" }, 403);
    }
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    const parsed = salesCreateQuoteSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "validation_error" }, 400);
    }
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }
    const input = parsed.data;
    if (input.projectId) {
      const ok = await assertProjectForTenant(db, auth.tenantId, input.projectId);
      if (!ok) {
        return c.json({ error: "invalid_project" }, 400);
      }
    }
    if (input.customerId) {
      const ok = await assertCustomerForTenant(
        db,
        auth.tenantId,
        input.customerId,
      );
      if (!ok) {
        return c.json({ error: "invalid_customer" }, 400);
      }
    }
    const vu = parseOptionalInstant(input.validUntil ?? undefined);
    if (!vu.ok) {
      return c.json({ error: "invalid_valid_until" }, 400);
    }
    try {
      const inserted = await db
        .insert(salesQuotes)
        .values({
          tenantId: auth.tenantId,
          documentNumber: input.documentNumber,
          customerLabel: input.customerLabel,
          status: input.status,
          currency: input.currency,
          totalCents: input.totalCents,
          validUntil: vu.value,
          projectId: input.projectId ?? null,
          customerId: input.customerId ?? null,
        })
        .returning();
      const row = inserted[0];
      if (!row) {
        return c.json({ error: "insert_failed" }, 500);
      }
      const payload = await buildQuoteDetailPayload(db, auth.tenantId, row.id);
      if (!payload) {
        return c.json({ error: "insert_failed" }, 500);
      }
      return c.json(payload, 201);
    } catch (err) {
      if (isUniqueViolation(err)) {
        return c.json({ error: "document_number_taken" }, 409);
      }
      throw err;
    }
  };
}

export function createSalesQuotePatchHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    if (!canEditSalesDocuments(auth)) {
      return c.json({ error: "forbidden" }, 403);
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
    const parsed = salesPatchQuoteSchema.safeParse(body);
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
    const lineCount = await salesQuoteLineCount(db, id);
    const patchKeysEffective = Object.keys(patch).filter(
      (key) => !(lineCount > 0 && key === "totalCents"),
    );
    if (patchKeysEffective.length === 0) {
      return c.json({ error: "empty_patch" }, 400);
    }
    if (patch.projectId) {
      const ok = await assertProjectForTenant(db, auth.tenantId, patch.projectId);
      if (!ok) {
        return c.json({ error: "invalid_project" }, 400);
      }
    }
    if (patch.customerId !== undefined && patch.customerId !== null) {
      const ok = await assertCustomerForTenant(db, auth.tenantId, patch.customerId);
      if (!ok) {
        return c.json({ error: "invalid_customer" }, 400);
      }
    }
    const updates: {
      updatedAt: Date;
      documentNumber?: string;
      customerLabel?: string;
      customerId?: string | null;
      status?: string;
      currency?: string;
      totalCents?: number;
      validUntil?: Date | null;
      projectId?: string | null;
    } = { updatedAt: new Date() };
    if (patch.documentNumber !== undefined) {
      updates.documentNumber = patch.documentNumber;
    }
    if (patch.customerLabel !== undefined) {
      updates.customerLabel = patch.customerLabel;
    }
    if (patch.customerId !== undefined) {
      updates.customerId = patch.customerId;
    }
    if (patch.status !== undefined) {
      updates.status = patch.status;
    }
    if (patch.currency !== undefined) {
      updates.currency = patch.currency;
    }
    if (patch.totalCents !== undefined && lineCount === 0) {
      updates.totalCents = patch.totalCents;
    }
    if (patch.validUntil !== undefined) {
      const vu = parseOptionalInstant(patch.validUntil);
      if (!vu.ok) {
        return c.json({ error: "invalid_valid_until" }, 400);
      }
      updates.validUntil = vu.value;
    }
    if (patch.projectId !== undefined) {
      updates.projectId = patch.projectId;
    }
    try {
      const result = await db
        .update(salesQuotes)
        .set(updates)
        .where(
          and(eq(salesQuotes.id, id), eq(salesQuotes.tenantId, auth.tenantId)),
        )
        .returning();
      const row = result[0];
      if (!row) {
        return c.json({ error: "not_found" }, 404);
      }
      if (lineCount > 0) {
        await recalcQuoteTotalCents(db, id);
      }
      const payload = await buildQuoteDetailPayload(db, auth.tenantId, id);
      if (!payload) {
        return c.json({ error: "not_found" }, 404);
      }
      return c.json(payload);
    } catch (err) {
      if (isUniqueViolation(err)) {
        return c.json({ error: "document_number_taken" }, 409);
      }
      throw err;
    }
  };
}

export function createSalesInvoicePostHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    if (!canEditSalesDocuments(auth)) {
      return c.json({ error: "forbidden" }, 403);
    }
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    const parsed = salesCreateInvoiceSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "validation_error" }, 400);
    }
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }
    const input = parsed.data;
    if (input.projectId) {
      const ok = await assertProjectForTenant(db, auth.tenantId, input.projectId);
      if (!ok) {
        return c.json({ error: "invalid_project" }, 400);
      }
    }
    if (input.quoteId) {
      const ok = await assertQuoteForTenant(db, auth.tenantId, input.quoteId);
      if (!ok) {
        return c.json({ error: "invalid_quote" }, 400);
      }
    }
    if (input.customerId) {
      const ok = await assertCustomerForTenant(
        db,
        auth.tenantId,
        input.customerId,
      );
      if (!ok) {
        return c.json({ error: "invalid_customer" }, 400);
      }
    }
    const issuedAt = parseOptionalInstant(input.issuedAt ?? undefined);
    if (!issuedAt.ok) {
      return c.json({ error: "invalid_issued_at" }, 400);
    }
    const dueAt = parseOptionalInstant(input.dueAt ?? undefined);
    if (!dueAt.ok) {
      return c.json({ error: "invalid_due_at" }, 400);
    }
    const paidAt = parseOptionalInstant(input.paidAt ?? undefined);
    if (!paidAt.ok) {
      return c.json({ error: "invalid_paid_at" }, 400);
    }
    try {
      const inserted = await db
        .insert(salesInvoices)
        .values({
          tenantId: auth.tenantId,
          documentNumber: input.documentNumber,
          customerLabel: input.customerLabel,
          status: input.status,
          currency: input.currency,
          totalCents: input.totalCents,
          quoteId: input.quoteId ?? null,
          projectId: input.projectId ?? null,
          issuedAt: issuedAt.value,
          dueAt: dueAt.value,
          paidAt: paidAt.value,
          customerId: input.customerId ?? null,
        })
        .returning();
      const row = inserted[0];
      if (!row) {
        return c.json({ error: "insert_failed" }, 500);
      }
      const payload = await buildInvoiceDetailPayload(db, auth.tenantId, row.id);
      if (!payload) {
        return c.json({ error: "insert_failed" }, 500);
      }
      return c.json(payload, 201);
    } catch (err) {
      if (isUniqueViolation(err)) {
        return c.json({ error: "document_number_taken" }, 409);
      }
      throw err;
    }
  };
}

export function createSalesInvoiceFromQuotePostHandler(
  getDb: () => Db | undefined,
) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    if (!canEditSalesDocuments(auth)) {
      return c.json({ error: "forbidden" }, 403);
    }
    const quoteIdParse = z.string().uuid().safeParse(c.req.param("id"));
    if (!quoteIdParse.success) {
      return c.json({ error: "invalid_id" }, 400);
    }
    const quoteId = quoteIdParse.data;
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    const parsed = salesCreateInvoiceFromQuoteSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "validation_error" }, 400);
    }
    const input = parsed.data;
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }
    const quoteOk = await assertQuoteForTenant(db, auth.tenantId, quoteId);
    if (!quoteOk) {
      return c.json({ error: "not_found" }, 404);
    }
    const issuedAt = parseOptionalInstant(input.issuedAt ?? undefined);
    if (!issuedAt.ok) {
      return c.json({ error: "invalid_issued_at" }, 400);
    }
    const dueAt = parseOptionalInstant(input.dueAt ?? undefined);
    if (!dueAt.ok) {
      return c.json({ error: "invalid_due_at" }, 400);
    }
    const paidAt = parseOptionalInstant(input.paidAt ?? undefined);
    if (!paidAt.ok) {
      return c.json({ error: "invalid_paid_at" }, 400);
    }
    let newInvoiceId: string | undefined;
    try {
      await db.transaction(async (tx) => {
        const rows = await tx
          .select()
          .from(salesQuotes)
          .where(
            and(
              eq(salesQuotes.id, quoteId),
              eq(salesQuotes.tenantId, auth.tenantId),
            ),
          )
          .limit(1);
        const quoteRow = rows[0];
        if (!quoteRow) {
          throw new Error("quote_not_found");
        }
        const lineRows = await tx
          .select()
          .from(salesQuoteLines)
          .where(eq(salesQuoteLines.quoteId, quoteId))
          .orderBy(asc(salesQuoteLines.sortIndex));

        const inserted = await tx
          .insert(salesInvoices)
          .values({
            tenantId: auth.tenantId,
            documentNumber: input.documentNumber,
            customerLabel: quoteRow.customerLabel,
            status: input.status,
            currency: quoteRow.currency,
            totalCents: 0,
            quoteId,
            projectId: quoteRow.projectId ?? null,
            issuedAt: issuedAt.value,
            dueAt: dueAt.value,
            paidAt: paidAt.value,
            customerId: quoteRow.customerId ?? null,
          })
          .returning();
        const inv = inserted[0];
        if (!inv) {
          throw new Error("insert_failed");
        }
        newInvoiceId = inv.id;
        if (lineRows.length > 0) {
          await tx.insert(salesInvoiceLines).values(
            lineRows.map((l) => ({
              invoiceId: inv.id,
              sortIndex: l.sortIndex,
              description: l.description,
              quantity: l.quantity ?? null,
              unit: l.unit ?? null,
              unitPriceCents: l.unitPriceCents,
              lineTotalCents: l.lineTotalCents,
            })),
          );
        }
        const [agg] = await tx
          .select({ t: sum(salesInvoiceLines.lineTotalCents) })
          .from(salesInvoiceLines)
          .where(eq(salesInvoiceLines.invoiceId, inv.id));
        const total = sumFromAggregate(agg?.t);
        await tx
          .update(salesInvoices)
          .set({ totalCents: total, updatedAt: new Date() })
          .where(eq(salesInvoices.id, inv.id));
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        return c.json({ error: "document_number_taken" }, 409);
      }
      if (err instanceof Error && err.message === "quote_not_found") {
        return c.json({ error: "not_found" }, 404);
      }
      throw err;
    }
    const payload = await buildInvoiceDetailPayload(
      db,
      auth.tenantId,
      newInvoiceId!,
    );
    if (!payload) {
      return c.json({ error: "insert_failed" }, 500);
    }
    return c.json(payload, 201);
  };
}

export function createSalesInvoicePatchHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    if (!canEditSalesDocuments(auth)) {
      return c.json({ error: "forbidden" }, 403);
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
    const parsed = salesPatchInvoiceSchema.safeParse(body);
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
    const lineCount = await salesInvoiceLineCount(db, id);
    const patchKeysEffective = Object.keys(patch).filter(
      (key) => !(lineCount > 0 && key === "totalCents"),
    );
    if (patchKeysEffective.length === 0) {
      return c.json({ error: "empty_patch" }, 400);
    }
    if (patch.projectId) {
      const ok = await assertProjectForTenant(db, auth.tenantId, patch.projectId);
      if (!ok) {
        return c.json({ error: "invalid_project" }, 400);
      }
    }
    if (patch.quoteId) {
      const ok = await assertQuoteForTenant(db, auth.tenantId, patch.quoteId);
      if (!ok) {
        return c.json({ error: "invalid_quote" }, 400);
      }
    }
    if (patch.customerId !== undefined && patch.customerId !== null) {
      const ok = await assertCustomerForTenant(db, auth.tenantId, patch.customerId);
      if (!ok) {
        return c.json({ error: "invalid_customer" }, 400);
      }
    }
    const updates: {
      updatedAt: Date;
      documentNumber?: string;
      customerLabel?: string;
      customerId?: string | null;
      status?: string;
      currency?: string;
      totalCents?: number;
      quoteId?: string | null;
      projectId?: string | null;
      issuedAt?: Date | null;
      dueAt?: Date | null;
      paidAt?: Date | null;
    } = { updatedAt: new Date() };
    if (patch.documentNumber !== undefined) {
      updates.documentNumber = patch.documentNumber;
    }
    if (patch.customerLabel !== undefined) {
      updates.customerLabel = patch.customerLabel;
    }
    if (patch.customerId !== undefined) {
      updates.customerId = patch.customerId;
    }
    if (patch.status !== undefined) {
      updates.status = patch.status;
    }
    if (patch.currency !== undefined) {
      updates.currency = patch.currency;
    }
    if (patch.totalCents !== undefined && lineCount === 0) {
      updates.totalCents = patch.totalCents;
    }
    if (patch.quoteId !== undefined) {
      updates.quoteId = patch.quoteId;
    }
    if (patch.projectId !== undefined) {
      updates.projectId = patch.projectId;
    }
    if (patch.issuedAt !== undefined) {
      const v = parseOptionalInstant(patch.issuedAt);
      if (!v.ok) {
        return c.json({ error: "invalid_issued_at" }, 400);
      }
      updates.issuedAt = v.value;
    }
    if (patch.dueAt !== undefined) {
      const v = parseOptionalInstant(patch.dueAt);
      if (!v.ok) {
        return c.json({ error: "invalid_due_at" }, 400);
      }
      updates.dueAt = v.value;
    }
    if (patch.paidAt !== undefined) {
      const v = parseOptionalInstant(patch.paidAt);
      if (!v.ok) {
        return c.json({ error: "invalid_paid_at" }, 400);
      }
      updates.paidAt = v.value;
    }
    try {
      const result = await db
        .update(salesInvoices)
        .set(updates)
        .where(
          and(
            eq(salesInvoices.id, id),
            eq(salesInvoices.tenantId, auth.tenantId),
          ),
        )
        .returning();
      const row = result[0];
      if (!row) {
        return c.json({ error: "not_found" }, 404);
      }
      if (lineCount > 0) {
        await recalcInvoiceTotalCents(db, id);
      }
      const payload = await buildInvoiceDetailPayload(db, auth.tenantId, id);
      if (!payload) {
        return c.json({ error: "not_found" }, 404);
      }
      return c.json(payload);
    } catch (err) {
      if (isUniqueViolation(err)) {
        return c.json({ error: "document_number_taken" }, 409);
      }
      throw err;
    }
  };
}

export function createSalesQuoteLinePostHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    if (!canEditSalesDocuments(auth)) {
      return c.json({ error: "forbidden" }, 403);
    }
    const quoteIdParse = z.string().uuid().safeParse(c.req.param("id"));
    if (!quoteIdParse.success) {
      return c.json({ error: "invalid_id" }, 400);
    }
    const quoteId = quoteIdParse.data;
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    const parsed = salesCreateQuoteLineSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "validation_error" }, 400);
    }
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }
    const quoteOk = await assertQuoteForTenant(db, auth.tenantId, quoteId);
    if (!quoteOk) {
      return c.json({ error: "not_found" }, 404);
    }
    const input = parsed.data;
    const sortIndex = await nextQuoteLineSortIndex(db, quoteId);
    await db.insert(salesQuoteLines).values({
      quoteId,
      sortIndex,
      description: input.description,
      quantity: input.quantity ?? null,
      unit: input.unit ?? null,
      unitPriceCents: input.unitPriceCents,
      lineTotalCents: input.lineTotalCents,
    });
    await recalcQuoteTotalCents(db, quoteId);
    const payload = await buildQuoteDetailPayload(db, auth.tenantId, quoteId);
    if (!payload) {
      return c.json({ error: "not_found" }, 404);
    }
    return c.json(payload, 201);
  };
}

export function createSalesQuoteLinePatchHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    if (!canEditSalesDocuments(auth)) {
      return c.json({ error: "forbidden" }, 403);
    }
    const quoteIdParse = z.string().uuid().safeParse(c.req.param("id"));
    const lineIdParse = z.string().uuid().safeParse(c.req.param("lineId"));
    if (!quoteIdParse.success || !lineIdParse.success) {
      return c.json({ error: "invalid_id" }, 400);
    }
    const quoteId = quoteIdParse.data;
    const lineId = lineIdParse.data;
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    const parsed = salesPatchQuoteLineSchema.safeParse(body);
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
    const access = await db
      .select({ id: salesQuoteLines.id })
      .from(salesQuoteLines)
      .innerJoin(salesQuotes, eq(salesQuoteLines.quoteId, salesQuotes.id))
      .where(
        and(
          eq(salesQuoteLines.id, lineId),
          eq(salesQuotes.id, quoteId),
          eq(salesQuotes.tenantId, auth.tenantId),
        ),
      )
      .limit(1);
    if (!access[0]) {
      return c.json({ error: "not_found" }, 404);
    }
    const updates: {
      updatedAt: Date;
      sortIndex?: number;
      description?: string;
      quantity?: string | null;
      unit?: string | null;
      unitPriceCents?: number;
      lineTotalCents?: number;
    } = { updatedAt: new Date() };
    if (patch.sortIndex !== undefined) {
      updates.sortIndex = patch.sortIndex;
    }
    if (patch.description !== undefined) {
      updates.description = patch.description;
    }
    if (patch.quantity !== undefined) {
      updates.quantity = patch.quantity;
    }
    if (patch.unit !== undefined) {
      updates.unit = patch.unit;
    }
    if (patch.unitPriceCents !== undefined) {
      updates.unitPriceCents = patch.unitPriceCents;
    }
    if (patch.lineTotalCents !== undefined) {
      updates.lineTotalCents = patch.lineTotalCents;
    }
    await db
      .update(salesQuoteLines)
      .set(updates)
      .where(eq(salesQuoteLines.id, lineId));
    await recalcQuoteTotalCents(db, quoteId);
    const payload = await buildQuoteDetailPayload(db, auth.tenantId, quoteId);
    if (!payload) {
      return c.json({ error: "not_found" }, 404);
    }
    return c.json(payload);
  };
}

export function createSalesQuoteLineDeleteHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    if (!canEditSalesDocuments(auth)) {
      return c.json({ error: "forbidden" }, 403);
    }
    const quoteIdParse = z.string().uuid().safeParse(c.req.param("id"));
    const lineIdParse = z.string().uuid().safeParse(c.req.param("lineId"));
    if (!quoteIdParse.success || !lineIdParse.success) {
      return c.json({ error: "invalid_id" }, 400);
    }
    const quoteId = quoteIdParse.data;
    const lineId = lineIdParse.data;
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }
    const access = await db
      .select({ id: salesQuoteLines.id })
      .from(salesQuoteLines)
      .innerJoin(salesQuotes, eq(salesQuoteLines.quoteId, salesQuotes.id))
      .where(
        and(
          eq(salesQuoteLines.id, lineId),
          eq(salesQuotes.id, quoteId),
          eq(salesQuotes.tenantId, auth.tenantId),
        ),
      )
      .limit(1);
    if (!access[0]) {
      return c.json({ error: "not_found" }, 404);
    }
    await db.delete(salesQuoteLines).where(eq(salesQuoteLines.id, lineId));
    await recalcQuoteTotalCents(db, quoteId);
    const payload = await buildQuoteDetailPayload(db, auth.tenantId, quoteId);
    if (!payload) {
      return c.json({ error: "not_found" }, 404);
    }
    return c.json(payload);
  };
}

async function assertInvoiceForTenant(
  db: Db,
  tenantId: string,
  invoiceId: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: salesInvoices.id })
    .from(salesInvoices)
    .where(
      and(
        eq(salesInvoices.id, invoiceId),
        eq(salesInvoices.tenantId, tenantId),
      ),
    )
    .limit(1);
  return Boolean(rows[0]);
}

export function createSalesInvoiceLinePostHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    if (!canEditSalesDocuments(auth)) {
      return c.json({ error: "forbidden" }, 403);
    }
    const invoiceIdParse = z.string().uuid().safeParse(c.req.param("id"));
    if (!invoiceIdParse.success) {
      return c.json({ error: "invalid_id" }, 400);
    }
    const invoiceId = invoiceIdParse.data;
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    const parsed = salesCreateInvoiceLineSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "validation_error" }, 400);
    }
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }
    const invOk = await assertInvoiceForTenant(db, auth.tenantId, invoiceId);
    if (!invOk) {
      return c.json({ error: "not_found" }, 404);
    }
    const input = parsed.data;
    const sortIndex = await nextInvoiceLineSortIndex(db, invoiceId);
    await db.insert(salesInvoiceLines).values({
      invoiceId,
      sortIndex,
      description: input.description,
      quantity: input.quantity ?? null,
      unit: input.unit ?? null,
      unitPriceCents: input.unitPriceCents,
      lineTotalCents: input.lineTotalCents,
    });
    await recalcInvoiceTotalCents(db, invoiceId);
    const payload = await buildInvoiceDetailPayload(db, auth.tenantId, invoiceId);
    if (!payload) {
      return c.json({ error: "not_found" }, 404);
    }
    return c.json(payload, 201);
  };
}

export function createSalesInvoiceLinePatchHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    if (!canEditSalesDocuments(auth)) {
      return c.json({ error: "forbidden" }, 403);
    }
    const invoiceIdParse = z.string().uuid().safeParse(c.req.param("id"));
    const lineIdParse = z.string().uuid().safeParse(c.req.param("lineId"));
    if (!invoiceIdParse.success || !lineIdParse.success) {
      return c.json({ error: "invalid_id" }, 400);
    }
    const invoiceId = invoiceIdParse.data;
    const lineId = lineIdParse.data;
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    const parsed = salesPatchInvoiceLineSchema.safeParse(body);
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
    const access = await db
      .select({ id: salesInvoiceLines.id })
      .from(salesInvoiceLines)
      .innerJoin(
        salesInvoices,
        eq(salesInvoiceLines.invoiceId, salesInvoices.id),
      )
      .where(
        and(
          eq(salesInvoiceLines.id, lineId),
          eq(salesInvoices.id, invoiceId),
          eq(salesInvoices.tenantId, auth.tenantId),
        ),
      )
      .limit(1);
    if (!access[0]) {
      return c.json({ error: "not_found" }, 404);
    }
    const updates: {
      updatedAt: Date;
      sortIndex?: number;
      description?: string;
      quantity?: string | null;
      unit?: string | null;
      unitPriceCents?: number;
      lineTotalCents?: number;
    } = { updatedAt: new Date() };
    if (patch.sortIndex !== undefined) {
      updates.sortIndex = patch.sortIndex;
    }
    if (patch.description !== undefined) {
      updates.description = patch.description;
    }
    if (patch.quantity !== undefined) {
      updates.quantity = patch.quantity;
    }
    if (patch.unit !== undefined) {
      updates.unit = patch.unit;
    }
    if (patch.unitPriceCents !== undefined) {
      updates.unitPriceCents = patch.unitPriceCents;
    }
    if (patch.lineTotalCents !== undefined) {
      updates.lineTotalCents = patch.lineTotalCents;
    }
    await db
      .update(salesInvoiceLines)
      .set(updates)
      .where(eq(salesInvoiceLines.id, lineId));
    await recalcInvoiceTotalCents(db, invoiceId);
    const payload = await buildInvoiceDetailPayload(db, auth.tenantId, invoiceId);
    if (!payload) {
      return c.json({ error: "not_found" }, 404);
    }
    return c.json(payload);
  };
}

export function createSalesInvoiceLineDeleteHandler(
  getDb: () => Db | undefined,
) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    if (!canEditSalesDocuments(auth)) {
      return c.json({ error: "forbidden" }, 403);
    }
    const invoiceIdParse = z.string().uuid().safeParse(c.req.param("id"));
    const lineIdParse = z.string().uuid().safeParse(c.req.param("lineId"));
    if (!invoiceIdParse.success || !lineIdParse.success) {
      return c.json({ error: "invalid_id" }, 400);
    }
    const invoiceId = invoiceIdParse.data;
    const lineId = lineIdParse.data;
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }
    const access = await db
      .select({ id: salesInvoiceLines.id })
      .from(salesInvoiceLines)
      .innerJoin(
        salesInvoices,
        eq(salesInvoiceLines.invoiceId, salesInvoices.id),
      )
      .where(
        and(
          eq(salesInvoiceLines.id, lineId),
          eq(salesInvoices.id, invoiceId),
          eq(salesInvoices.tenantId, auth.tenantId),
        ),
      )
      .limit(1);
    if (!access[0]) {
      return c.json({ error: "not_found" }, 404);
    }
    await db.delete(salesInvoiceLines).where(eq(salesInvoiceLines.id, lineId));
    await recalcInvoiceTotalCents(db, invoiceId);
    const payload = await buildInvoiceDetailPayload(db, auth.tenantId, invoiceId);
    if (!payload) {
      return c.json({ error: "not_found" }, 404);
    }
    return c.json(payload);
  };
}

export function createSalesQuoteLinesReorderHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    if (!canEditSalesDocuments(auth)) {
      return c.json({ error: "forbidden" }, 403);
    }
    const quoteIdParse = z.string().uuid().safeParse(c.req.param("id"));
    if (!quoteIdParse.success) {
      return c.json({ error: "invalid_id" }, 400);
    }
    const quoteId = quoteIdParse.data;
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    const parsed = salesReorderDocumentLinesSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "validation_error" }, 400);
    }
    const { lineIds } = parsed.data;
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }
    const quoteOk = await assertQuoteForTenant(db, auth.tenantId, quoteId);
    if (!quoteOk) {
      return c.json({ error: "not_found" }, 404);
    }
    const existingRows = await db
      .select({ id: salesQuoteLines.id })
      .from(salesQuoteLines)
      .where(eq(salesQuoteLines.quoteId, quoteId));
    const existingIds = existingRows.map((r) => r.id);
    if (!uuidSetsEqual(existingIds, lineIds)) {
      return c.json({ error: "invalid_line_order" }, 400);
    }
    if (lineIds.length === 0) {
      const payload = await buildQuoteDetailPayload(db, auth.tenantId, quoteId);
      if (!payload) {
        return c.json({ error: "not_found" }, 404);
      }
      return c.json(payload);
    }
    await db.transaction(async (tx) => {
      const now = new Date();
      for (let i = 0; i < lineIds.length; i++) {
        const lineId = lineIds[i]!;
        await tx
          .update(salesQuoteLines)
          .set({ sortIndex: i, updatedAt: now })
          .where(
            and(
              eq(salesQuoteLines.id, lineId),
              eq(salesQuoteLines.quoteId, quoteId),
            ),
          );
      }
    });
    await recalcQuoteTotalCents(db, quoteId);
    const payload = await buildQuoteDetailPayload(db, auth.tenantId, quoteId);
    if (!payload) {
      return c.json({ error: "not_found" }, 404);
    }
    return c.json(payload);
  };
}

export function createSalesInvoiceLinesReorderHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    if (!canEditSalesDocuments(auth)) {
      return c.json({ error: "forbidden" }, 403);
    }
    const invoiceIdParse = z.string().uuid().safeParse(c.req.param("id"));
    if (!invoiceIdParse.success) {
      return c.json({ error: "invalid_id" }, 400);
    }
    const invoiceId = invoiceIdParse.data;
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    const parsed = salesReorderDocumentLinesSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "validation_error" }, 400);
    }
    const { lineIds } = parsed.data;
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }
    const invOk = await assertInvoiceForTenant(db, auth.tenantId, invoiceId);
    if (!invOk) {
      return c.json({ error: "not_found" }, 404);
    }
    const existingRows = await db
      .select({ id: salesInvoiceLines.id })
      .from(salesInvoiceLines)
      .where(eq(salesInvoiceLines.invoiceId, invoiceId));
    const existingIds = existingRows.map((r) => r.id);
    if (!uuidSetsEqual(existingIds, lineIds)) {
      return c.json({ error: "invalid_line_order" }, 400);
    }
    if (lineIds.length === 0) {
      const payload = await buildInvoiceDetailPayload(db, auth.tenantId, invoiceId);
      if (!payload) {
        return c.json({ error: "not_found" }, 404);
      }
      return c.json(payload);
    }
    await db.transaction(async (tx) => {
      const now = new Date();
      for (let i = 0; i < lineIds.length; i++) {
        const lineId = lineIds[i]!;
        await tx
          .update(salesInvoiceLines)
          .set({ sortIndex: i, updatedAt: now })
          .where(
            and(
              eq(salesInvoiceLines.id, lineId),
              eq(salesInvoiceLines.invoiceId, invoiceId),
            ),
          );
      }
    });
    await recalcInvoiceTotalCents(db, invoiceId);
    const payload = await buildInvoiceDetailPayload(db, auth.tenantId, invoiceId);
    if (!payload) {
      return c.json({ error: "not_found" }, 404);
    }
    return c.json(payload);
  };
}

function parseSalesPdfLang(raw: string | undefined): SalesPdfLang {
  return raw === "en" ? "en" : "de";
}

export function createSalesQuotePdfHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    const org = c.get("organization");
    if (!org) {
      return c.json({ error: "missing_organization" }, 500);
    }
    const idParse = z.string().uuid().safeParse(c.req.param("id"));
    if (!idParse.success) {
      return c.json({ error: "invalid_id" }, 400);
    }
    const id = idParse.data;
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }
    const payload = await buildQuoteDetailPayload(db, auth.tenantId, id);
    if (!payload) {
      return c.json({ error: "not_found" }, 404);
    }
    const lang = parseSalesPdfLang(c.req.query("lang"));
    const letterhead = await letterheadForPdf(org);
    const buf = await buildQuotePdfBuffer({
      letterhead,
      quote: payload.quote,
      lang,
    });
    const filename = salesPdfFilename("quote", payload.quote.documentNumber);
    return c.body(new Uint8Array(buf), 200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, no-store",
    });
  };
}

export function createSalesInvoicePdfHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    const org = c.get("organization");
    if (!org) {
      return c.json({ error: "missing_organization" }, 500);
    }
    const idParse = z.string().uuid().safeParse(c.req.param("id"));
    if (!idParse.success) {
      return c.json({ error: "invalid_id" }, 400);
    }
    const id = idParse.data;
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }
    const payload = await buildInvoiceDetailPayload(db, auth.tenantId, id);
    if (!payload) {
      return c.json({ error: "not_found" }, 404);
    }
    const lang = parseSalesPdfLang(c.req.query("lang"));
    const letterhead = await letterheadForPdf(org);
    const buf = await buildInvoicePdfBuffer({
      letterhead,
      invoice: payload.invoice,
      lang,
    });
    const filename = salesPdfFilename("invoice", payload.invoice.documentNumber);
    return c.body(new Uint8Array(buf), 200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, no-store",
    });
  };
}
