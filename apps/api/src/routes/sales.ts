import { readFile } from "node:fs/promises";

import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  ilike,
  max,
  ne,
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
  salesOpenInvoicesListQuerySchema,
  salesOpenInvoicesSortBySchema,
  salesCreateInvoiceFromQuoteSchema,
  salesCreateInvoiceLineSchema,
  salesCreateInvoiceSchema,
  salesCreateQuoteLineSchema,
  salesCreateQuoteSchema,
  salesQuotesListQuerySchema,
  salesQuotesSortBySchema,
  salesPatchInvoiceLineSchema,
  salesCreateInvoicePaymentSchema,
  salesCamtMatchRequestSchema,
  salesCamtImportResponseSchema,
  salesCreateInvoiceReminderSchema,
  salesPatchInvoiceSchema,
  salesPatchQuoteLineSchema,
  salesPatchQuoteSchema,
  salesReorderDocumentLinesSchema,
  SALES_REMINDER_TEMPLATE_LEVEL_MAX,
  salesReminderTemplateLocaleSchema,
  salesReminderTemplatesPutBodySchema,
} from "@repo/api-contracts";

import {
  customers,
  projects,
  salesLifecycleEvents,
  salesInvoiceLines,
  salesInvoicePayments,
  salesInvoiceReminders,
  salesInvoices,
  salesQuoteLines,
  salesQuotes,
  salesReminderTemplates,
  type Db,
} from "@repo/db";

import {
  invoiceBalanceCents,
  invoicePaidTotalCentsFromParts,
} from "../sales-invoice-balance.js";
import { resolveProjectAssetsRoot } from "../env.js";
import { absoluteAssetPath } from "../project-assets-storage.js";
import {
  buildInvoicePdfBuffer,
  buildInvoiceReminderPdfBuffer,
  buildQuotePdfBuffer,
  interpolateSalesReminderTemplateText,
  salesPdfFilename,
  salesReminderPdfFilename,
  salesDefaultReminderIntro,
  type SalesLetterhead,
  type SalesPdfLang,
} from "../sales-pdf.js";
import {
  canEditSalesDocuments,
  canEditTeamPalette,
} from "../auth/permissions.js";
import type { AuthContext } from "../auth/verify-token.js";
import {
  parseCamtBankToCustomerXml,
  rankOpenInvoicesForCamt,
} from "../sales-camt.js";

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

function addDaysUtc(base: Date, days: number): Date {
  const out = new Date(base);
  out.setUTCDate(out.getUTCDate() + days);
  return out;
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
    projectId: r.projectId ?? null,
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
    projectId: r.projectId ?? null,
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

function mapInvoicePaymentRow(r: typeof salesInvoicePayments.$inferSelect) {
  return {
    id: r.id,
    amountCents: r.amountCents,
    paidAt: r.paidAt.toISOString(),
    note: r.note ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

function mapInvoiceReminderRow(r: typeof salesInvoiceReminders.$inferSelect) {
  return {
    id: r.id,
    level: r.level,
    sentAt: r.sentAt.toISOString(),
    channel: r.channel,
    note: r.note ?? null,
    createdAt: r.createdAt.toISOString(),
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

/**
 * Wenn Zahlungszeilen existieren, Status/`paidAt` aus Summe und Beträgen ableiten (Legacy ohne Zeilen bleibt unverändert).
 */
async function syncInvoicePaymentState(db: Db, invoiceId: string): Promise<void> {
  const [inv] = await db
    .select()
    .from(salesInvoices)
    .where(eq(salesInvoices.id, invoiceId))
    .limit(1);
  if (!inv) return;

  const [agg] = await db
    .select({ t: sum(salesInvoicePayments.amountCents) })
    .from(salesInvoicePayments)
    .where(
      and(
        eq(salesInvoicePayments.invoiceId, invoiceId),
        eq(salesInvoicePayments.tenantId, inv.tenantId),
      ),
    );
  const paymentSum = sumFromAggregate(agg?.t);

  if (paymentSum === 0) {
    return;
  }

  const total = inv.totalCents;

  const paymentDates = await db
    .select({ paidAt: salesInvoicePayments.paidAt })
    .from(salesInvoicePayments)
    .where(
      and(
        eq(salesInvoicePayments.invoiceId, invoiceId),
        eq(salesInvoicePayments.tenantId, inv.tenantId),
      ),
    );
  let maxPaidAt: Date | null = null;
  for (const p of paymentDates) {
    if (!maxPaidAt || p.paidAt.getTime() > maxPaidAt.getTime()) {
      maxPaidAt = p.paidAt;
    }
  }

  if (paymentSum >= total) {
    await db
      .update(salesInvoices)
      .set({
        status: "paid",
        paidAt: maxPaidAt ?? new Date(),
        updatedAt: new Date(),
      })
      .where(eq(salesInvoices.id, invoiceId));
    return;
  }

  const updates: {
    paidAt: null;
    status?: string;
    updatedAt: Date;
  } = { paidAt: null, updatedAt: new Date() };

  if (inv.status === "paid") {
    const now = new Date();
    updates.status = inv.dueAt != null && inv.dueAt < now ? "overdue" : "sent";
  }

  await db.update(salesInvoices).set(updates).where(eq(salesInvoices.id, invoiceId));
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

  const paymentRows = await db
    .select()
    .from(salesInvoicePayments)
    .where(
      and(
        eq(salesInvoicePayments.invoiceId, invoiceId),
        eq(salesInvoicePayments.tenantId, tenantId),
      ),
    )
    .orderBy(asc(salesInvoicePayments.paidAt), asc(salesInvoicePayments.createdAt));

  const reminderRows = await db
    .select()
    .from(salesInvoiceReminders)
    .where(
      and(
        eq(salesInvoiceReminders.invoiceId, invoiceId),
        eq(salesInvoiceReminders.tenantId, tenantId),
      ),
    )
    .orderBy(
      asc(salesInvoiceReminders.sentAt),
      asc(salesInvoiceReminders.createdAt),
    );

  const paidFromRows = paymentRows.reduce((s, p) => s + p.amountCents, 0);
  const paidTotalCents = invoicePaidTotalCentsFromParts({
    totalCents: row.totalCents,
    status: row.status,
    paidAt: row.paidAt,
    paidFromRowsSum: paidFromRows,
  });
  const balanceCents = invoiceBalanceCents(row.totalCents, paidTotalCents);

  return {
    invoice: {
      ...mapInvoiceRow(row),
      quoteId: row.quoteId ?? null,
      projectId: row.projectId ?? null,
      lines: lines.map(mapInvoiceLineRow),
      payments: paymentRows.map(mapInvoicePaymentRow),
      reminders: reminderRows.map(mapInvoiceReminderRow),
      paidTotalCents,
      balanceCents,
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
      projectId: c.req.query("projectId")?.trim() || undefined,
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
    if (query.projectId) {
      const ok = await assertProjectForTenant(db, auth.tenantId, query.projectId);
      if (!ok) {
        return c.json({
          quotes: [],
          total: 0,
          permissions: salesListPermissions(auth),
        });
      }
      where.push(eq(salesQuotes.projectId, query.projectId));
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
      projectId: c.req.query("projectId")?.trim() || undefined,
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
    if (query.projectId) {
      const ok = await assertProjectForTenant(db, auth.tenantId, query.projectId);
      if (!ok) {
        return c.json({
          invoices: [],
          total: 0,
          permissions: salesListPermissions(auth),
        });
      }
      where.push(eq(salesInvoices.projectId, query.projectId));
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

function csvEscapeCell(value: string): string {
  const trimmed = value.trimStart();
  let out = value.replace(/"/g, '""');
  if (/^[=+\-@]/.test(trimmed)) {
    out = `'${out}`;
  }
  if (/[\n\r",]/.test(out) || out.includes(",")) {
    return `"${out}"`;
  }
  return out;
}

function buildSalesOpenInvoicesPayAggSubquery(db: Db, tenantId: string) {
  return db
    .select({
      invoiceId: salesInvoicePayments.invoiceId,
      sumCents: sum(salesInvoicePayments.amountCents),
    })
    .from(salesInvoicePayments)
    .where(eq(salesInvoicePayments.tenantId, tenantId))
    .groupBy(salesInvoicePayments.invoiceId)
    .as("pay_agg");
}

/** SQL-Ausdruck „bezahlter Betrag“ inkl. Legacy bezahlt ohne Zahlungszeilen. */
function sqlInvoicePaidTotalCents(
  payAgg: ReturnType<typeof buildSalesOpenInvoicesPayAggSubquery>,
) {
  return sql`(
    CASE
      WHEN COALESCE(${payAgg.sumCents}, 0) > 0 THEN COALESCE(${payAgg.sumCents}, 0)
      WHEN ${salesInvoices.status} = 'paid' AND ${salesInvoices.paidAt} IS NOT NULL THEN ${salesInvoices.totalCents}
      ELSE 0
    END
  )`;
}

function sqlInvoiceBalanceCents(
  payAgg: ReturnType<typeof buildSalesOpenInvoicesPayAggSubquery>,
) {
  const paid = sqlInvoicePaidTotalCents(payAgg);
  return sql`${salesInvoices.totalCents} - (${paid})`;
}

export function createSalesOpenInvoicesListHandler(getDb: () => Db | undefined) {
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
    const queryParse = salesOpenInvoicesListQuerySchema.safeParse({
      q: c.req.query("q")?.trim() || undefined,
      projectId: c.req.query("projectId")?.trim() || undefined,
      sortBy: c.req.query("sortBy")?.trim() || undefined,
      sortDir: c.req.query("sortDir")?.trim() || undefined,
      limit,
      offset,
    });
    if (!queryParse.success) {
      return c.json({ error: "validation_error" }, 400);
    }
    const query = queryParse.data;
    const tenantId = auth.tenantId;
    const payAgg = buildSalesOpenInvoicesPayAggSubquery(db, tenantId);
    const balanceExpr = sqlInvoiceBalanceCents(payAgg);
    const whereParts: SQL[] = [
      eq(salesInvoices.tenantId, tenantId),
      ne(salesInvoices.status, "cancelled"),
      sql`${balanceExpr} > 0`,
    ];
    if (query.q) {
      const pattern = `%${query.q}%`;
      whereParts.push(
        or(
          ilike(salesInvoices.documentNumber, pattern),
          ilike(salesInvoices.customerLabel, pattern),
        )!,
      );
    }
    if (query.projectId) {
      whereParts.push(eq(salesInvoices.projectId, query.projectId));
    }
    const whereExpr = and(...whereParts)!;
    const [countRow] = await db
      .select({ c: count() })
      .from(salesInvoices)
      .leftJoin(payAgg, eq(salesInvoices.id, payAgg.invoiceId))
      .where(whereExpr);
    const sortBy = salesOpenInvoicesSortBySchema.parse(query.sortBy ?? "dueAt");
    const sortDir = query.sortDir ?? "asc";
    const paidTotalExpr = sqlInvoicePaidTotalCents(payAgg);
    const orderExpr =
      sortBy === "balanceCents"
        ? balanceExpr
        : sortBy === "dueAt"
          ? salesInvoices.dueAt
          : sortBy === "documentNumber"
            ? salesInvoices.documentNumber
            : sortBy === "customerLabel"
              ? salesInvoices.customerLabel
              : sortBy === "totalCents"
                ? salesInvoices.totalCents
                : salesInvoices.updatedAt;
    const rows = await db
      .select({
        ...getTableColumns(salesInvoices),
        paidTotalCents: sql<number>`(${paidTotalExpr})::int`.mapWith(Number),
        balanceCents: sql<number>`(${balanceExpr})::int`.mapWith(Number),
      })
      .from(salesInvoices)
      .leftJoin(payAgg, eq(salesInvoices.id, payAgg.invoiceId))
      .where(whereExpr)
      .orderBy(
        sortDir === "asc" ? asc(orderExpr) : desc(orderExpr),
        desc(salesInvoices.createdAt),
      )
      .limit(query.limit ?? 25)
      .offset(query.offset ?? 0);
    const invoices = rows.map((r) => ({
      ...mapInvoiceRow(r),
      paidTotalCents: r.paidTotalCents,
      balanceCents: r.balanceCents,
    }));
    return c.json({
      invoices,
      total: Number(countRow?.c ?? 0),
      permissions: salesListPermissions(auth),
    });
  };
}

const SALES_OPEN_INVOICES_EXPORT_MAX = 10_000;

export function createSalesOpenInvoicesExportGetHandler(
  getDb: () => Db | undefined,
) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }
    const lang = c.req.query("lang")?.trim() === "en" ? "en" : "de";
    const projectIdRaw = c.req.query("projectId")?.trim() || undefined;
    const projectIdParse = z.string().uuid().optional().safeParse(projectIdRaw);
    if (!projectIdParse.success) {
      return c.json({ error: "validation_error" }, 400);
    }
    const projectId = projectIdParse.data;
    const tenantId = auth.tenantId;
    const payAgg = buildSalesOpenInvoicesPayAggSubquery(db, tenantId);
    const balanceExpr = sqlInvoiceBalanceCents(payAgg);
    const whereParts: SQL[] = [
      eq(salesInvoices.tenantId, tenantId),
      ne(salesInvoices.status, "cancelled"),
      sql`${balanceExpr} > 0`,
    ];
    if (projectId) {
      whereParts.push(eq(salesInvoices.projectId, projectId));
    }
    const whereExpr = and(...whereParts)!;
    const paidTotalExpr = sqlInvoicePaidTotalCents(payAgg);
    const rows = await db
      .select({
        ...getTableColumns(salesInvoices),
        paidTotalCents: sql<number>`(${paidTotalExpr})::int`.mapWith(Number),
        balanceCents: sql<number>`(${balanceExpr})::int`.mapWith(Number),
      })
      .from(salesInvoices)
      .leftJoin(payAgg, eq(salesInvoices.id, payAgg.invoiceId))
      .where(whereExpr)
      .orderBy(asc(salesInvoices.dueAt), desc(salesInvoices.createdAt))
      .limit(SALES_OPEN_INVOICES_EXPORT_MAX);
    const header =
      lang === "en"
        ? [
            "Document no.",
            "Customer",
            "Due",
            "Gross",
            "Paid",
            "Open balance",
            "Currency",
            "Status",
          ]
        : [
            "Belegnr.",
            "Kunde",
            "Faellig",
            "Brutto",
            "Bezahlt",
            "Saldo",
            "Waehrung",
            "Status",
          ];
    const lines: string[] = [header.join(",")];
    for (const r of rows) {
      const inv = mapInvoiceRow(r);
      const due = inv.dueAt ? inv.dueAt.slice(0, 10) : "";
      lines.push(
        [
          csvEscapeCell(inv.documentNumber),
          csvEscapeCell(inv.customerLabel),
          csvEscapeCell(due),
          String(inv.totalCents),
          String(r.paidTotalCents),
          String(r.balanceCents),
          csvEscapeCell(inv.currency),
          csvEscapeCell(inv.status),
        ].join(","),
      );
    }
    const body = "\uFEFF" + lines.join("\n");
    const day = new Date().toISOString().slice(0, 10);
    const filename =
      lang === "en"
        ? `open-invoices-${day}.csv`
        : `offene-posten-${day}.csv`;
    return c.body(body, 200, {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${filename}"`,
    });
  };
}

export function createSalesCamtMatchPostHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) return c.json({ error: "missing_auth" }, 500);
    if (!canEditSalesDocuments(auth)) return c.json({ error: "forbidden" }, 403);
    const db = getDb();
    if (!db) return c.json({ error: "database_unavailable" }, 503);

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    const parsed = salesCamtMatchRequestSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: "validation_error" }, 400);

    const paidAt = new Date(parsed.data.paidAt);
    if (Number.isNaN(paidAt.getTime())) {
      return c.json({ error: "invalid_paid_at" }, 400);
    }

    const tenantId = auth.tenantId;
    const payAgg = buildSalesOpenInvoicesPayAggSubquery(db, tenantId);
    const balanceExpr = sqlInvoiceBalanceCents(payAgg);
    const rows = await db
      .select({
        id: salesInvoices.id,
        documentNumber: salesInvoices.documentNumber,
        customerLabel: salesInvoices.customerLabel,
        currency: salesInvoices.currency,
        dueAt: salesInvoices.dueAt,
        balanceCents: sql<number>`(${balanceExpr})::int`.mapWith(Number),
      })
      .from(salesInvoices)
      .leftJoin(payAgg, eq(salesInvoices.id, payAgg.invoiceId))
      .where(
        and(
          eq(salesInvoices.tenantId, tenantId),
          ne(salesInvoices.status, "cancelled"),
          sql`${balanceExpr} > 0`,
        ),
      )
      .limit(250);

    const remittanceInfo = parsed.data.remittanceInfo ?? "";
    const debtorName = parsed.data.debtorName ?? "";
    const ranked = rankOpenInvoicesForCamt(rows, {
      amountCents: parsed.data.amountCents,
      remittanceInfo,
      debtorName,
      candidateLimit: parsed.data.candidateLimit ?? 5,
    });
    return c.json(ranked);
  };
}

const MAX_CAMT_UPLOAD_BYTES = 2_000_000;

export function createSalesCamtImportPostHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) return c.json({ error: "missing_auth" }, 500);
    if (!canEditSalesDocuments(auth)) return c.json({ error: "forbidden" }, 403);
    const db = getDb();
    if (!db) return c.json({ error: "database_unavailable" }, 503);

    const contentType = c.req.header("content-type") ?? "";
    let xml: string;
    if (contentType.includes("multipart/form-data")) {
      let body: Record<string, unknown>;
      try {
        body = (await c.req.parseBody()) as Record<string, unknown>;
      } catch {
        return c.json({ error: "invalid_multipart" }, 400);
      }
      const file = body.file;
      if (!file || typeof file === "string") {
        return c.json({ error: "missing_file" }, 400);
      }
      const blob = file as Blob;
      if (blob.size > MAX_CAMT_UPLOAD_BYTES) {
        return c.json({ error: "file_too_large" }, 413);
      }
      xml = await blob.text();
    } else if (
      contentType.includes("application/xml") ||
      contentType.includes("text/xml")
    ) {
      const buf = await c.req.arrayBuffer();
      if (buf.byteLength > MAX_CAMT_UPLOAD_BYTES) {
        return c.json({ error: "file_too_large" }, 413);
      }
      xml = new TextDecoder("utf-8").decode(buf);
    } else {
      return c.json({ error: "unsupported_content_type" }, 415);
    }

    const rawLimit = c.req.query("candidateLimit");
    const limitN = rawLimit ? Number(rawLimit) : 5;
    const candidateLimit =
      Number.isInteger(limitN) && limitN >= 1 && limitN <= 20 ? limitN : 5;

    const { warnings: parseWarnings, lines: parsedLines } =
      parseCamtBankToCustomerXml(xml);

    const tenantId = auth.tenantId;
    const payAgg = buildSalesOpenInvoicesPayAggSubquery(db, tenantId);
    const balanceExpr = sqlInvoiceBalanceCents(payAgg);
    const rows = await db
      .select({
        id: salesInvoices.id,
        documentNumber: salesInvoices.documentNumber,
        customerLabel: salesInvoices.customerLabel,
        currency: salesInvoices.currency,
        dueAt: salesInvoices.dueAt,
        balanceCents: sql<number>`(${balanceExpr})::int`.mapWith(Number),
      })
      .from(salesInvoices)
      .leftJoin(payAgg, eq(salesInvoices.id, payAgg.invoiceId))
      .where(
        and(
          eq(salesInvoices.tenantId, tenantId),
          ne(salesInvoices.status, "cancelled"),
          sql`${balanceExpr} > 0`,
        ),
      )
      .limit(250);

    const openRows = rows.map((r) => ({
      id: r.id,
      documentNumber: r.documentNumber,
      customerLabel: r.customerLabel,
      currency: r.currency,
      dueAt: r.dueAt,
      balanceCents: r.balanceCents,
    }));

    const entries = parsedLines.map((line) => {
      if (line.cdtDbtInd !== "CRDT" || line.amountCents < 1) {
        return {
          lineIndex: line.lineIndex,
          cdtDbtInd: line.cdtDbtInd,
          amountCents: line.amountCents,
          currency: line.currency,
          bookingDate: line.bookingDate,
          paidAtIso: line.paidAtIso,
          remittanceInfo: line.remittanceInfo,
          debtorName: line.debtorName,
          skipped: true as const,
          skipReason:
            line.cdtDbtInd !== "CRDT" ? ("not_credit" as const) : ("no_amount" as const),
          matches: [],
          suggestedInvoiceId: null,
        };
      }

      const ranked = rankOpenInvoicesForCamt(openRows, {
        amountCents: line.amountCents,
        remittanceInfo: line.remittanceInfo,
        debtorName: line.debtorName,
        candidateLimit,
      });

      return {
        lineIndex: line.lineIndex,
        cdtDbtInd: line.cdtDbtInd,
        amountCents: line.amountCents,
        currency: line.currency,
        bookingDate: line.bookingDate,
        paidAtIso: line.paidAtIso,
        remittanceInfo: line.remittanceInfo,
        debtorName: line.debtorName,
        skipped: false as const,
        matches: ranked.matches,
        suggestedInvoiceId: ranked.suggestedInvoiceId,
      };
    });

    const payload = {
      parseWarnings: parseWarnings,
      candidateLimit,
      entries,
    };
    const safe = salesCamtImportResponseSchema.safeParse(payload);
    if (!safe.success) {
      return c.json({ error: "response_serialization" }, 500);
    }
    return c.json(safe.data);
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
    const payCountRows = await db
      .select({ c: count() })
      .from(salesInvoicePayments)
      .where(
        and(
          eq(salesInvoicePayments.invoiceId, id),
          eq(salesInvoicePayments.tenantId, auth.tenantId),
        ),
      )
      .limit(1);
    const payCountRow = payCountRows[0];
    if (Number(payCountRow?.c ?? 0) > 0) {
      return c.json({ error: "cannot_cancel_with_payments" }, 409);
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

    let issuedAtValue = issuedAt.value;
    let dueAtValue = dueAt.value;
    if (dueAtValue === null && input.customerId) {
      const rows = await db
        .select({ paymentTermsDays: customers.paymentTermsDays })
        .from(customers)
        .where(
          and(
            eq(customers.id, input.customerId),
            eq(customers.tenantId, auth.tenantId),
          ),
        )
        .limit(1);
      const terms = rows[0]?.paymentTermsDays ?? null;
      if (typeof terms === "number") {
        const shouldApply = issuedAtValue !== null || input.status !== "draft";
        if (shouldApply) {
          const base = issuedAtValue ?? new Date();
          issuedAtValue = issuedAtValue ?? base;
          dueAtValue = addDaysUtc(base, terms);
        }
      }
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
          issuedAt: issuedAtValue,
          dueAt: dueAtValue,
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

        let issuedAtValue = issuedAt.value;
        let dueAtValue = dueAt.value;
        if (dueAtValue === null && quoteRow.customerId) {
          const custRows = await tx
            .select({ paymentTermsDays: customers.paymentTermsDays })
            .from(customers)
            .where(
              and(
                eq(customers.id, quoteRow.customerId),
                eq(customers.tenantId, auth.tenantId),
              ),
            )
            .limit(1);
          const terms = custRows[0]?.paymentTermsDays ?? null;
          if (typeof terms === "number") {
            const shouldApply = issuedAtValue !== null || input.status !== "draft";
            if (shouldApply) {
              const base = issuedAtValue ?? new Date();
              issuedAtValue = issuedAtValue ?? base;
              dueAtValue = addDaysUtc(base, terms);
            }
          }
        }

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
            issuedAt: issuedAtValue,
            dueAt: dueAtValue,
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
      await syncInvoicePaymentState(db, id);
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

export function createSalesInvoicePaymentPostHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) return c.json({ error: "missing_auth" }, 500);
    if (!canEditSalesDocuments(auth)) return c.json({ error: "forbidden" }, 403);
    const idParse = z.string().uuid().safeParse(c.req.param("id"));
    if (!idParse.success) return c.json({ error: "invalid_id" }, 400);
    const id = idParse.data;
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    const parsed = salesCreateInvoicePaymentSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "validation_error" }, 400);
    }
    const db = getDb();
    if (!db) return c.json({ error: "database_unavailable" }, 503);

    const row = await invoiceForTenant(db, auth.tenantId, id);
    if (!row) return c.json({ error: "not_found" }, 404);
    if (row.status === "cancelled") {
      return c.json({ error: "invalid_state" }, 409);
    }

    const paidAt = new Date(parsed.data.paidAt);
    if (Number.isNaN(paidAt.getTime())) {
      return c.json({ error: "invalid_paid_at" }, 400);
    }

    const [agg] = await db
      .select({ t: sum(salesInvoicePayments.amountCents) })
      .from(salesInvoicePayments)
      .where(
        and(
          eq(salesInvoicePayments.invoiceId, id),
          eq(salesInvoicePayments.tenantId, auth.tenantId),
        ),
      );
    const prevSum = sumFromAggregate(agg?.t);
    if (prevSum + parsed.data.amountCents > row.totalCents) {
      return c.json({ error: "payment_exceeds_balance" }, 409);
    }

    await db.insert(salesInvoicePayments).values({
      tenantId: auth.tenantId,
      invoiceId: id,
      amountCents: parsed.data.amountCents,
      paidAt,
      note: parsed.data.note ?? null,
    });
    await syncInvoicePaymentState(db, id);
    const payload = await buildInvoiceDetailPayload(db, auth.tenantId, id);
    if (!payload) return c.json({ error: "not_found" }, 404);
    return c.json(payload);
  };
}

export function createSalesInvoicePaymentDeleteHandler(
  getDb: () => Db | undefined,
) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) return c.json({ error: "missing_auth" }, 500);
    if (!canEditSalesDocuments(auth)) return c.json({ error: "forbidden" }, 403);
    const invoiceIdParse = z.string().uuid().safeParse(c.req.param("id"));
    const paymentIdParse = z.string().uuid().safeParse(c.req.param("paymentId"));
    if (!invoiceIdParse.success || !paymentIdParse.success) {
      return c.json({ error: "invalid_id" }, 400);
    }
    const invoiceId = invoiceIdParse.data;
    const paymentId = paymentIdParse.data;
    const db = getDb();
    if (!db) return c.json({ error: "database_unavailable" }, 503);

    const inv = await invoiceForTenant(db, auth.tenantId, invoiceId);
    if (!inv) return c.json({ error: "not_found" }, 404);
    if (inv.status === "cancelled") {
      return c.json({ error: "invalid_state" }, 409);
    }

    const deleted = await db
      .delete(salesInvoicePayments)
      .where(
        and(
          eq(salesInvoicePayments.id, paymentId),
          eq(salesInvoicePayments.invoiceId, invoiceId),
          eq(salesInvoicePayments.tenantId, auth.tenantId),
        ),
      )
      .returning({ id: salesInvoicePayments.id });

    if (!deleted[0]) {
      return c.json({ error: "not_found" }, 404);
    }

    await syncInvoicePaymentState(db, invoiceId);
    const payload = await buildInvoiceDetailPayload(db, auth.tenantId, invoiceId);
    if (!payload) return c.json({ error: "not_found" }, 404);
    return c.json(payload);
  };
}

export function createSalesInvoiceReminderPostHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) return c.json({ error: "missing_auth" }, 500);
    if (!canEditSalesDocuments(auth)) return c.json({ error: "forbidden" }, 403);
    const idParse = z.string().uuid().safeParse(c.req.param("id"));
    if (!idParse.success) return c.json({ error: "invalid_id" }, 400);
    const id = idParse.data;

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    const parsed = salesCreateInvoiceReminderSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "validation_error" }, 400);
    }

    const db = getDb();
    if (!db) return c.json({ error: "database_unavailable" }, 503);

    const inv = await invoiceForTenant(db, auth.tenantId, id);
    if (!inv) return c.json({ error: "not_found" }, 404);
    if (inv.status === "cancelled") {
      return c.json({ error: "invalid_state" }, 409);
    }

    const sentAt = new Date(parsed.data.sentAt);
    if (Number.isNaN(sentAt.getTime())) {
      return c.json({ error: "invalid_sent_at" }, 400);
    }

    await db.insert(salesInvoiceReminders).values({
      tenantId: auth.tenantId,
      invoiceId: id,
      level: parsed.data.level,
      sentAt,
      channel: parsed.data.channel,
      note: parsed.data.note ?? null,
    });

    await db
      .update(salesInvoices)
      .set({ updatedAt: new Date() })
      .where(and(eq(salesInvoices.id, id), eq(salesInvoices.tenantId, auth.tenantId)));

    const payload = await buildInvoiceDetailPayload(db, auth.tenantId, id);
    if (!payload) return c.json({ error: "not_found" }, 404);
    return c.json(payload);
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

function clampSalesReminderTemplateLevel(level: number): number {
  if (!Number.isFinite(level)) {
    return 1;
  }
  const n = Math.trunc(level);
  if (n < 1) {
    return 1;
  }
  return Math.min(n, SALES_REMINDER_TEMPLATE_LEVEL_MAX);
}

async function loadResolvedSalesReminderTemplate(
  db: Db,
  tenantId: string,
  locale: SalesPdfLang,
  reminderLevel: number,
): Promise<{ introText: string; feeCents: number | null }> {
  const level = clampSalesReminderTemplateLevel(reminderLevel);
  const [row] = await db
    .select()
    .from(salesReminderTemplates)
    .where(
      and(
        eq(salesReminderTemplates.tenantId, tenantId),
        eq(salesReminderTemplates.locale, locale),
        eq(salesReminderTemplates.level, level),
      ),
    )
    .limit(1);
  const defaultIntro = salesDefaultReminderIntro(locale);
  const introText =
    row?.bodyText != null && row.bodyText.trim() !== ""
      ? row.bodyText.trim()
      : defaultIntro;
  const feeCents =
    row?.feeCents != null && row.feeCents > 0 ? row.feeCents : null;
  return { introText, feeCents };
}

export function createSalesReminderTemplatesListHandler(
  getDb: () => Db | undefined,
) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    if (!canEditTeamPalette(auth)) {
      return c.json({ error: "forbidden" }, 403);
    }
    const localeParsed = salesReminderTemplateLocaleSchema.safeParse(
      c.req.query("locale") ?? "de",
    );
    if (!localeParsed.success) {
      return c.json({ error: "validation_error" }, 400);
    }
    const locale = localeParsed.data;
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }

    const rows = await db
      .select()
      .from(salesReminderTemplates)
      .where(
        and(
          eq(salesReminderTemplates.tenantId, auth.tenantId),
          eq(salesReminderTemplates.locale, locale),
        ),
      );

    const byLevel = new Map(rows.map((r) => [r.level, r]));
    const templates = [];
    for (let level = 1; level <= SALES_REMINDER_TEMPLATE_LEVEL_MAX; level++) {
      const r = byLevel.get(level);
      templates.push({
        level,
        bodyText: r?.bodyText ?? null,
        feeCents: r?.feeCents ?? null,
        updatedAt: r?.updatedAt?.toISOString() ?? null,
      });
    }

    c.header("Cache-Control", "private, no-store");
    return c.json({ templates });
  };
}

export function createSalesReminderTemplatesPutHandler(
  getDb: () => Db | undefined,
) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    if (!canEditTeamPalette(auth)) {
      return c.json({ error: "forbidden" }, 403);
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    const parsed = salesReminderTemplatesPutBodySchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "validation_error" }, 400);
    }

    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }

    const { locale, items } = parsed.data;
    const now = new Date();

    for (const item of items) {
      const bodyTextNorm =
        item.bodyText.trim() === "" ? null : item.bodyText.trim();
      const feeNorm =
        item.feeCents === null || item.feeCents === 0 ? null : item.feeCents;

      if (bodyTextNorm === null && feeNorm === null) {
        await db
          .delete(salesReminderTemplates)
          .where(
            and(
              eq(salesReminderTemplates.tenantId, auth.tenantId),
              eq(salesReminderTemplates.locale, locale),
              eq(salesReminderTemplates.level, item.level),
            ),
          );
        continue;
      }

      await db
        .insert(salesReminderTemplates)
        .values({
          tenantId: auth.tenantId,
          locale,
          level: item.level,
          bodyText: bodyTextNorm,
          feeCents: feeNorm,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [
            salesReminderTemplates.tenantId,
            salesReminderTemplates.locale,
            salesReminderTemplates.level,
          ],
          set: {
            bodyText: bodyTextNorm,
            feeCents: feeNorm,
            updatedAt: now,
          },
        });
    }

    const rows = await db
      .select()
      .from(salesReminderTemplates)
      .where(
        and(
          eq(salesReminderTemplates.tenantId, auth.tenantId),
          eq(salesReminderTemplates.locale, locale),
        ),
      );

    const byLevel = new Map(rows.map((r) => [r.level, r]));
    const templates = [];
    for (let level = 1; level <= SALES_REMINDER_TEMPLATE_LEVEL_MAX; level++) {
      const r = byLevel.get(level);
      templates.push({
        level,
        bodyText: r?.bodyText ?? null,
        feeCents: r?.feeCents ?? null,
        updatedAt: r?.updatedAt?.toISOString() ?? null,
      });
    }

    c.header("Cache-Control", "private, no-store");
    return c.json({ templates });
  };
}

export function createSalesReminderTemplatesResolvedHandler(
  getDb: () => Db | undefined,
) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    const locale = parseSalesPdfLang(c.req.query("locale"));
    const levelParsed = z.coerce.number().int().safeParse(c.req.query("level"));
    if (!levelParsed.success) {
      return c.json({ error: "validation_error" }, 400);
    }

    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }

    const { introText, feeCents } = await loadResolvedSalesReminderTemplate(
      db,
      auth.tenantId,
      locale,
      levelParsed.data,
    );

    c.header("Cache-Control", "private, no-store");
    return c.json({ introText, feeCents });
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

export function createSalesInvoiceReminderPdfHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    const org = c.get("organization");
    if (!org) {
      return c.json({ error: "missing_organization" }, 500);
    }
    const invoiceIdParse = z.string().uuid().safeParse(c.req.param("id"));
    const reminderIdParse = z
      .string()
      .uuid()
      .safeParse(c.req.param("reminderId"));
    if (!invoiceIdParse.success || !reminderIdParse.success) {
      return c.json({ error: "invalid_id" }, 400);
    }
    const invoiceId = invoiceIdParse.data;
    const reminderId = reminderIdParse.data;
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }
    const payload = await buildInvoiceDetailPayload(db, auth.tenantId, invoiceId);
    if (!payload) {
      return c.json({ error: "not_found" }, 404);
    }
    const reminder = payload.invoice.reminders.find((r) => r.id === reminderId);
    if (!reminder) {
      return c.json({ error: "not_found" }, 404);
    }

    const lang = parseSalesPdfLang(c.req.query("lang"));
    const letterhead = await letterheadForPdf(org);
    const { introText, feeCents } = await loadResolvedSalesReminderTemplate(
      db,
      auth.tenantId,
      lang,
      reminder.level,
    );
    const introResolved = interpolateSalesReminderTemplateText({
      templateText: introText,
      lang,
      values: {
        invoiceDocumentNumber: payload.invoice.documentNumber,
        customerLabel: payload.invoice.customerLabel,
        dueAt: payload.invoice.dueAt,
        issuedAt: payload.invoice.issuedAt,
        totalCents: payload.invoice.totalCents,
        balanceCents: payload.invoice.balanceCents,
        currency: payload.invoice.currency,
        reminderLevel: reminder.level,
        reminderSentAt: reminder.sentAt,
      },
    });
    const buf = await buildInvoiceReminderPdfBuffer({
      letterhead,
      invoice: payload.invoice,
      reminder,
      lang,
      introText: introResolved,
      feeCents,
    });
    const filename = salesReminderPdfFilename(
      payload.invoice.documentNumber,
      reminder.level,
    );
    return c.body(new Uint8Array(buf), 200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, no-store",
    });
  };
}
