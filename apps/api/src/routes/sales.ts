import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import nodemailer from "nodemailer";

import {
  and,
  asc,
  count,
  desc,
  eq,
  getTableColumns,
  inArray,
  ilike,
  min,
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
  salesCreateBatchInvoicePaymentsSchema,
  salesBatchInvoicePaymentsResponseSchema,
  salesCreateInvoicePaymentSchema,
  salesCamtMatchRequestSchema,
  salesCamtImportBatchDetailResponseSchema,
  salesCamtImportBatchesListResponseSchema,
  salesCamtImportResponseSchema,
  salesCreateInvoiceReminderSchema,
  salesPatchInvoiceSchema,
  salesPatchQuoteLineSchema,
  salesPatchQuoteSchema,
  salesReorderDocumentLinesSchema,
  SALES_REMINDER_TEMPLATE_LEVEL_MAX,
  salesReminderTemplateLocaleSchema,
  salesReminderTemplatesPutBodySchema,
  salesReminderEmailJobCreateSchema,
  salesReminderEmailJobCreateResponseSchema,
  salesReminderEmailJobsListResponseSchema,
  salesReminderEmailJobPatchSchema,
  salesReminderEmailJobRetryResponseSchema,
  salesReminderEmailJobReplayResponseSchema,
  salesReminderEmailJobsProcessRequestSchema,
  salesReminderEmailJobsProcessResponseSchema,
  salesReminderEmailJobsMetricsResponseSchema,
  salesReminderEmailJobRecordSchema,
  salesReminderEmailJobsTenantListQuerySchema,
  salesReminderEmailJobsTenantListResponseSchema,
} from "@repo/api-contracts";

import {
  catalogArticles,
  customerAddresses,
  customers,
  projects,
  salesLifecycleEvents,
  salesInvoiceLines,
  salesCamtImportBatches,
  salesCamtImportLines,
  salesInvoicePayments,
  salesInvoiceReminders,
  salesInvoices,
  salesQuoteLines,
  salesQuotes,
  salesReminderTemplates,
  salesReminderEmailJobs,
  type Db,
} from "@repo/db";

import {
  invoiceBalanceCents,
  invoicePaidTotalCentsFromParts,
} from "../sales-invoice-balance.js";
import {
  computeInvoiceTaxBreakdown,
  scaleLineTotalsForHeaderDiscount,
  validateInvoiceBillingReferences,
} from "../sales-invoice-billing.js";
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
  type CamtParsedStatementLine,
  parseCamtBankToCustomerXml,
  rankOpenInvoicesForCamt,
} from "../sales-camt.js";
import {
  buildCiiEInvoiceXml as buildCiiEInvoiceXmlV2,
  parseMultilineAddress,
  validateCiiEInvoiceData,
  type EInvoiceIssue,
  type EInvoiceParty,
} from "../sales-e-invoice.js";

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
  | "invoice_finalized"
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

function parseLineQuantityMultiplier(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const normalized = raw.trim().replace(",", ".");
  if (!normalized) return null;
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function computeLineTotalCents(input: {
  quantity: string | null | undefined;
  unitPriceCents: number;
  discountBps: number;
  lineTotalCents: number;
}): number {
  const qty = parseLineQuantityMultiplier(input.quantity);
  const base =
    qty == null
      ? Math.max(0, Math.round(input.lineTotalCents))
      : Math.max(0, Math.round(qty * input.unitPriceCents));
  const discounted = Math.round((base * (10_000 - input.discountBps)) / 10_000);
  return Math.max(0, discounted);
}

function envBool(value: string | undefined, defaultTrue: boolean): boolean {
  if (value === undefined || value === "") return defaultTrue;
  return value.toLowerCase() === "true" || value === "1";
}

function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS !== undefined,
  );
}

function createSmtpTransport() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS ?? "";

  if (!host || !user) {
    throw new Error("smtp_not_configured");
  }

  const secure = envBool(process.env.SMTP_SSL, false);
  const requireTLS = envBool(process.env.SMTP_STARTTLS, true);
  const useAuth = envBool(process.env.SMTP_AUTH, true);

  return nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: secure ? false : requireTLS,
    auth: useAuth ? { user, pass } : undefined,
  });
}

function smtpFromAddress(): string {
  const from =
    process.env.MAIL_FROM?.trim() ||
    process.env.SMTP_USER?.trim() ||
    "noreply@localhost";
  const fromName = process.env.EMAIL_FROM_NAME?.trim();
  return fromName ? `"${fromName}" <${from}>` : from;
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
    billingType:
      r.billingType === "partial" ||
      r.billingType === "final" ||
      r.billingType === "credit_note"
        ? r.billingType
        : "invoice",
    parentInvoiceId: r.parentInvoiceId ?? null,
    creditForInvoiceId: r.creditForInvoiceId ?? null,
    currency: r.currency,
    totalCents: r.totalCents,
    headerDiscountBps: r.headerDiscountBps ?? 0,
    issuedAt: r.issuedAt ? r.issuedAt.toISOString() : null,
    dueAt: r.dueAt ? r.dueAt.toISOString() : null,
    paidAt: r.paidAt ? r.paidAt.toISOString() : null,
    isFinalized: Boolean(r.isFinalized),
    finalizedAt: r.finalizedAt ? r.finalizedAt.toISOString() : null,
    snapshotHash: r.snapshotHash ?? null,
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
    taxRateBps: r.taxRateBps ?? 1900,
    discountBps: r.discountBps ?? 0,
    catalogArticleId: r.catalogArticleId ?? null,
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
    taxRateBps: r.taxRateBps ?? 1900,
    discountBps: r.discountBps ?? 0,
    catalogArticleId: r.catalogArticleId ?? null,
  };
}

async function assertCatalogArticleForTenant(
  db: Db,
  tenantId: string,
  articleId: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: catalogArticles.id })
    .from(catalogArticles)
    .where(
      and(eq(catalogArticles.id, articleId), eq(catalogArticles.tenantId, tenantId)),
    )
    .limit(1);
  return Boolean(rows[0]);
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
  const [invRow] = await db
    .select({ headerDiscountBps: salesInvoices.headerDiscountBps })
    .from(salesInvoices)
    .where(eq(salesInvoices.id, invoiceId))
    .limit(1);
  const headerDiscountBps = Math.min(
    10_000,
    Math.max(0, invRow?.headerDiscountBps ?? 0),
  );
  const [agg] = await db
    .select({ t: sum(salesInvoiceLines.lineTotalCents) })
    .from(salesInvoiceLines)
    .where(eq(salesInvoiceLines.invoiceId, invoiceId));
  const lineSum = sumFromAggregate(agg?.t);
  const total = Math.max(
    0,
    Math.round((lineSum * (10_000 - headerDiscountBps)) / 10_000),
  );
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

function billingValidationErrorStatus(err: string): 400 | 409 {
  if (
    err === "billing_chain_cycle" ||
    err === "billing_project_mismatch" ||
    err === "billing_customer_mismatch" ||
    err === "billing_invalid_chain_root"
  ) {
    return 409;
  }
  return 400;
}

function canMutateInvoice(inv: typeof salesInvoices.$inferSelect): boolean {
  return !inv.isFinalized;
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
  const headerDiscountBps = Math.min(
    10_000,
    Math.max(0, row.headerDiscountBps ?? 0),
  );
  const taxBreakdown = computeInvoiceTaxBreakdown(
    scaleLineTotalsForHeaderDiscount(
      lines.map((line) => ({
        taxRateBps: line.taxRateBps,
        lineTotalCents: line.lineTotalCents,
      })),
      headerDiscountBps,
    ),
  );

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
      taxBreakdown,
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
      sumCents: sum(salesInvoicePayments.amountCents).as("sum_cents"),
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

    const rows = await fetchOpenInvoicesForCamt(db, auth.tenantId);

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
const CAMT_IMPORTS_LIST_LIMIT_DEFAULT = 20;
const CAMT_IMPORTS_LIST_LIMIT_MAX = 100;

function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function parseCamtCandidateLimit(rawLimit: string | undefined): number {
  const limitN = rawLimit ? Number(rawLimit) : 5;
  if (!Number.isInteger(limitN)) return 5;
  if (limitN < 1 || limitN > 20) return 5;
  return limitN;
}

function parseCamtImportsListLimit(rawLimit: string | undefined): number {
  const limitN = rawLimit ? Number(rawLimit) : CAMT_IMPORTS_LIST_LIMIT_DEFAULT;
  if (!Number.isInteger(limitN)) return CAMT_IMPORTS_LIST_LIMIT_DEFAULT;
  if (limitN < 1 || limitN > CAMT_IMPORTS_LIST_LIMIT_MAX) {
    return CAMT_IMPORTS_LIST_LIMIT_DEFAULT;
  }
  return limitN;
}

function normalizeCamtCdtDbtInd(v: string): "CRDT" | "DBIT" | "UNKNOWN" {
  if (v === "CRDT" || v === "DBIT" || v === "UNKNOWN") return v;
  return "UNKNOWN";
}

type CamtImportLineSkipReason = "not_credit" | "no_amount";

function mapCamtImportRowsWithMatches(
  lines: CamtParsedStatementLine[],
  openRows: {
    id: string;
    documentNumber: string;
    customerLabel: string;
    currency: string;
    dueAt: Date | null;
    balanceCents: number;
  }[],
  candidateLimit: number,
) {
  return lines.map((line) => {
    if (line.cdtDbtInd !== "CRDT" || line.amountCents < 1) {
      const skipReason: CamtImportLineSkipReason =
        line.cdtDbtInd !== "CRDT" ? "not_credit" : "no_amount";
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
        skipReason,
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
}

function mapStoredCamtLinesToParsedLines(
  rows: Array<typeof salesCamtImportLines.$inferSelect>,
): CamtParsedStatementLine[] {
  return rows.map((line) => ({
    lineIndex: line.lineIndex,
    cdtDbtInd: normalizeCamtCdtDbtInd(line.cdtDbtInd),
    amountCents: line.amountCents,
    currency: line.currency,
    bookingDate: line.bookingDate,
    paidAtIso: line.paidAt ? line.paidAt.toISOString() : null,
    remittanceInfo: line.remittanceInfo,
    debtorName: line.debtorName,
  }));
}

async function fetchOpenInvoicesForCamt(db: Db, tenantId: string) {
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
  return rows.map((r) => ({
    id: r.id,
    documentNumber: r.documentNumber,
    customerLabel: r.customerLabel,
    currency: r.currency,
    dueAt: r.dueAt,
    balanceCents: r.balanceCents,
  }));
}

function mapCamtImportBatchSummaryRow(r: typeof salesCamtImportBatches.$inferSelect) {
  return {
    id: r.id,
    filename: r.filename ?? null,
    fileSha256: r.fileSha256,
    entryCount: r.entryCount,
    createdAt: r.createdAt.toISOString(),
  };
}

export function createSalesCamtImportPostHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) return c.json({ error: "missing_auth" }, 500);
    if (!canEditSalesDocuments(auth)) return c.json({ error: "forbidden" }, 403);
    const db = getDb();
    if (!db) return c.json({ error: "database_unavailable" }, 503);

    const contentType = c.req.header("content-type") ?? "";
    let xml: string;
    let filename: string | null = null;
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
      const blob = file as Blob & { name?: unknown };
      if (blob.size > MAX_CAMT_UPLOAD_BYTES) {
        return c.json({ error: "file_too_large" }, 413);
      }
      if (typeof blob.name === "string" && blob.name.trim()) {
        filename = blob.name.trim();
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

    const candidateLimit = parseCamtCandidateLimit(c.req.query("candidateLimit"));
    const fileSha256 = sha256Hex(xml);
    const tenantId = auth.tenantId;
    const [existingBatch] = await db
      .select()
      .from(salesCamtImportBatches)
      .where(
        and(
          eq(salesCamtImportBatches.tenantId, tenantId),
          eq(salesCamtImportBatches.fileSha256, fileSha256),
        ),
      )
      .limit(1);

    let batchId: string | null = existingBatch?.id ?? null;

    if (!batchId) {
      const parsed = parseCamtBankToCustomerXml(xml);
      const now = new Date();
      await db.transaction(async (tx) => {
        const [inserted] = await tx
          .insert(salesCamtImportBatches)
          .values({
            tenantId,
            filename,
            fileSha256,
            parseWarnings: parsed.warnings.length > 0 ? parsed.warnings : null,
            entryCount: parsed.lines.length,
            createdAt: now,
          })
          .onConflictDoNothing({
            target: [
              salesCamtImportBatches.tenantId,
              salesCamtImportBatches.fileSha256,
            ],
          })
          .returning({ id: salesCamtImportBatches.id });
        const currentBatchId = inserted?.id;
        if (!currentBatchId) {
          const [row] = await tx
            .select({ id: salesCamtImportBatches.id })
            .from(salesCamtImportBatches)
            .where(
              and(
                eq(salesCamtImportBatches.tenantId, tenantId),
                eq(salesCamtImportBatches.fileSha256, fileSha256),
              ),
            )
            .limit(1);
          batchId = row?.id ?? null;
          return;
        }

        batchId = currentBatchId;

        if (parsed.lines.length === 0) return;
        await tx.insert(salesCamtImportLines).values(
          parsed.lines.map((line) => {
            const skipped = line.cdtDbtInd !== "CRDT" || line.amountCents < 1;
            const skipReason =
              line.cdtDbtInd !== "CRDT"
                ? "not_credit"
                : line.amountCents < 1
                  ? "no_amount"
                  : null;
            return {
              batchId: currentBatchId,
              lineIndex: line.lineIndex,
              cdtDbtInd: line.cdtDbtInd,
              amountCents: line.amountCents,
              currency: line.currency,
              bookingDate: line.bookingDate,
              paidAt: line.paidAtIso ? new Date(line.paidAtIso) : null,
              remittanceInfo: line.remittanceInfo,
              debtorName: line.debtorName,
              skipped,
              skipReason,
              createdAt: now,
            };
          }),
        );
      });
    }

    if (!batchId) {
      return c.json({ error: "camt_import_persist_failed" }, 500);
    }

    const [batchRow] = await db
      .select()
      .from(salesCamtImportBatches)
      .where(
        and(
          eq(salesCamtImportBatches.id, batchId),
          eq(salesCamtImportBatches.tenantId, tenantId),
        ),
      )
      .limit(1);
    if (!batchRow) {
      return c.json({ error: "not_found" }, 404);
    }

    const storedLines = await db
      .select()
      .from(salesCamtImportLines)
      .where(eq(salesCamtImportLines.batchId, batchId))
      .orderBy(asc(salesCamtImportLines.lineIndex));
    const parsedLines = mapStoredCamtLinesToParsedLines(storedLines);
    const parseWarnings = Array.isArray(batchRow.parseWarnings)
      ? batchRow.parseWarnings.filter((w): w is string => typeof w === "string")
      : [];

    const openRows = await fetchOpenInvoicesForCamt(db, tenantId);
    const entries = mapCamtImportRowsWithMatches(
      parsedLines,
      openRows,
      candidateLimit,
    );

    const payload = {
      parseWarnings,
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

export function createSalesCamtImportsListHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) return c.json({ error: "missing_auth" }, 500);
    if (!canEditSalesDocuments(auth)) return c.json({ error: "forbidden" }, 403);
    const db = getDb();
    if (!db) return c.json({ error: "database_unavailable" }, 503);

    const limit = parseCamtImportsListLimit(c.req.query("limit"));
    const rows = await db
      .select()
      .from(salesCamtImportBatches)
      .where(eq(salesCamtImportBatches.tenantId, auth.tenantId))
      .orderBy(desc(salesCamtImportBatches.createdAt))
      .limit(limit);
    const payload = {
      batches: rows.map(mapCamtImportBatchSummaryRow),
    };
    const safe = salesCamtImportBatchesListResponseSchema.safeParse(payload);
    if (!safe.success) {
      return c.json({ error: "response_serialization" }, 500);
    }
    return c.json(safe.data);
  };
}

export function createSalesCamtImportDetailHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) return c.json({ error: "missing_auth" }, 500);
    if (!canEditSalesDocuments(auth)) return c.json({ error: "forbidden" }, 403);
    const db = getDb();
    if (!db) return c.json({ error: "database_unavailable" }, 503);

    const idParse = z.string().uuid().safeParse(c.req.param("id"));
    if (!idParse.success) return c.json({ error: "invalid_id" }, 400);
    const batchId = idParse.data;
    const candidateLimit = parseCamtCandidateLimit(c.req.query("candidateLimit"));

    const [batch] = await db
      .select()
      .from(salesCamtImportBatches)
      .where(
        and(
          eq(salesCamtImportBatches.id, batchId),
          eq(salesCamtImportBatches.tenantId, auth.tenantId),
        ),
      )
      .limit(1);
    if (!batch) return c.json({ error: "not_found" }, 404);

    const lineRows = await db
      .select()
      .from(salesCamtImportLines)
      .where(eq(salesCamtImportLines.batchId, batchId))
      .orderBy(asc(salesCamtImportLines.lineIndex));

    const parsedLines = mapStoredCamtLinesToParsedLines(lineRows);
    const openRows = await fetchOpenInvoicesForCamt(db, auth.tenantId);
    const entries = mapCamtImportRowsWithMatches(
      parsedLines,
      openRows,
      candidateLimit,
    );

    const parseWarnings = Array.isArray(batch.parseWarnings)
      ? batch.parseWarnings.filter((w): w is string => typeof w === "string")
      : [];
    const payload = {
      batch: mapCamtImportBatchSummaryRow(batch),
      parseWarnings,
      candidateLimit,
      entries,
    };
    const safe = salesCamtImportBatchDetailResponseSchema.safeParse(payload);
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

const invoiceSnapshotSchema = z.object({
  documentNumber: z.string(),
  issuedAt: z.string().nullable(),
  dueAt: z.string().nullable(),
  currency: z.string(),
  customerLabel: z.string(),
  totalCents: z.number().int(),
  balanceCents: z.number().int(),
  headerDiscountBps: z.number().int().min(0).max(10_000).optional().default(0),
  billingType: z.enum(["invoice", "partial", "final", "credit_note"]).default("invoice"),
  parentInvoiceId: z.string().uuid().nullable().default(null),
  creditForInvoiceId: z.string().uuid().nullable().default(null),
  lines: z
    .array(
      z.object({
        id: z.string().uuid(),
        sortIndex: z.number().int(),
        description: z.string(),
        quantity: z.string().nullable(),
        unit: z.string().nullable(),
        unitPriceCents: z.number().int(),
        lineTotalCents: z.number().int(),
        taxRateBps: z.number().int().min(0).max(10_000),
        discountBps: z.number().int().min(0).max(10_000),
      }),
    )
    .default([]),
  taxBreakdown: z
    .array(
      z.object({
        taxRateBps: z.number().int().min(0).max(10_000),
        netCents: z.number().int(),
        taxCents: z.number().int(),
        grossCents: z.number().int(),
      }),
    )
    .default([]),
});

type InvoiceSnapshot = z.infer<typeof invoiceSnapshotSchema>;

function stableJsonStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJsonStringify(item)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  return `{${entries
    .map(([key, val]) => `${JSON.stringify(key)}:${stableJsonStringify(val)}`)
    .join(",")}}`;
}

function toStableSnapshotHash(payload: unknown): string {
  return createHash("sha256").update(stableJsonStringify(payload)).digest("hex");
}

/** Snapshot fuer PDF/XRechnung/ZUGFeRD: totalCents/taxBreakdown entsprechen Kopfrabatt (headerDiscountBps) und skalierten Zeilen. */
function buildInvoiceSnapshot(
  invoice: NonNullable<Awaited<ReturnType<typeof buildInvoiceDetailPayload>>>["invoice"],
): InvoiceSnapshot {
  const billingType = invoiceSnapshotSchema.shape.billingType.safeParse(
    invoice.billingType,
  );
  return {
    documentNumber: invoice.documentNumber,
    issuedAt: invoice.issuedAt,
    dueAt: invoice.dueAt,
    currency: invoice.currency,
    customerLabel: invoice.customerLabel,
    totalCents: invoice.totalCents,
    balanceCents: invoice.balanceCents,
    headerDiscountBps: invoice.headerDiscountBps ?? 0,
    billingType: billingType.success ? billingType.data : "invoice",
    parentInvoiceId: invoice.parentInvoiceId,
    creditForInvoiceId: invoice.creditForInvoiceId,
    lines: [...invoice.lines]
      .sort(
        (a, b) =>
          a.sortIndex - b.sortIndex || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
      )
      .map((line) => ({
        id: line.id,
        sortIndex: line.sortIndex,
        description: line.description,
        quantity: line.quantity,
        unit: line.unit,
        unitPriceCents: line.unitPriceCents,
        lineTotalCents: line.lineTotalCents,
        taxRateBps: line.taxRateBps,
        discountBps: line.discountBps,
      })),
    taxBreakdown: [...invoice.taxBreakdown].sort(
      (a, b) => a.taxRateBps - b.taxRateBps,
    ),
  };
}

export function createSalesInvoiceFinalizePostHandler(
  getDb: () => Db | undefined,
) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) return c.json({ error: "missing_auth" }, 500);
    if (!canEditSalesDocuments(auth)) return c.json({ error: "forbidden" }, 403);
    const idParse = z.string().uuid().safeParse(c.req.param("id"));
    if (!idParse.success) return c.json({ error: "invalid_id" }, 400);
    const invoiceId = idParse.data;
    const db = getDb();
    if (!db) return c.json({ error: "database_unavailable" }, 503);

    const inv = await invoiceForTenant(db, auth.tenantId, invoiceId);
    if (!inv) return c.json({ error: "not_found" }, 404);
    if (inv.isFinalized) {
      const payload = await buildInvoiceDetailPayload(db, auth.tenantId, invoiceId);
      if (!payload) return c.json({ error: "not_found" }, 404);
      return c.json(payload);
    }
    if (inv.status === "draft" || inv.status === "cancelled") {
      return c.json({ error: "invalid_state" }, 409);
    }

    const detail = await buildInvoiceDetailPayload(db, auth.tenantId, invoiceId);
    if (!detail) return c.json({ error: "not_found" }, 404);
    const billingType = detail.invoice.billingType;
    const parentInvoiceId = detail.invoice.parentInvoiceId ?? null;
    const creditForInvoiceId = detail.invoice.creditForInvoiceId ?? null;
    if (billingType === "invoice") {
      if (parentInvoiceId) {
        return c.json({ error: "invalid_parent_invoice" }, 400);
      }
      if (creditForInvoiceId) {
        return c.json({ error: "invalid_credit_reference" }, 400);
      }
    } else if (billingType === "partial" || billingType === "final") {
      if (!parentInvoiceId) {
        return c.json({ error: "invalid_parent_invoice" }, 400);
      }
      if (creditForInvoiceId) {
        return c.json({ error: "invalid_credit_reference" }, 400);
      }
    } else if (billingType === "credit_note") {
      if (!creditForInvoiceId) {
        return c.json({ error: "invalid_credit_reference" }, 400);
      }
      if (parentInvoiceId) {
        return c.json({ error: "invalid_parent_invoice" }, 400);
      }
    }
    const snapshot = buildInvoiceSnapshot(detail.invoice);
    const snapshotHash = toStableSnapshotHash(snapshot);
    const now = new Date();
    const [updated] = await db
      .update(salesInvoices)
      .set({
        isFinalized: true,
        finalizedAt: now,
        snapshotHash,
        snapshotJson: snapshot as unknown as Record<string, unknown>,
        updatedAt: now,
      })
      .where(
        and(
          eq(salesInvoices.id, invoiceId),
          eq(salesInvoices.tenantId, auth.tenantId),
          eq(salesInvoices.isFinalized, false),
        ),
      )
      .returning();
    if (!updated) {
      const payload = await buildInvoiceDetailPayload(db, auth.tenantId, invoiceId);
      if (!payload) return c.json({ error: "not_found" }, 404);
      return c.json(payload);
    }

    await logSalesLifecycleEvent(db, {
      tenantId: auth.tenantId,
      actorSub: auth.sub?.trim() || "unknown",
      entityType: "invoice",
      entityId: invoiceId,
      action: "invoice_finalized",
      fromStatus: inv.status,
      toStatus: inv.status,
    });
    const payload = await buildInvoiceDetailPayload(db, auth.tenantId, invoiceId);
    if (!payload) return c.json({ error: "not_found" }, 404);
    return c.json(payload);
  };
}

function resolveInvoiceSnapshotSource(
  inv: typeof salesInvoices.$inferSelect,
  fallback: Awaited<ReturnType<typeof buildInvoiceDetailPayload>> | null,
) : InvoiceSnapshot | null {
  if (inv.snapshotJson && typeof inv.snapshotJson === "object") {
    const parsed = invoiceSnapshotSchema.safeParse(inv.snapshotJson);
    if (parsed.success) return parsed.data;
  }
  if (!fallback) return null;
  return buildInvoiceSnapshot(fallback.invoice);
}

export function createSalesInvoiceXRechnungGetHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) return c.json({ error: "missing_auth" }, 500);
    const org = c.get("organization");
    if (!org) return c.json({ error: "missing_organization" }, 500);
    const idParse = z.string().uuid().safeParse(c.req.param("id"));
    if (!idParse.success) return c.json({ error: "invalid_id" }, 400);
    const db = getDb();
    if (!db) return c.json({ error: "database_unavailable" }, 503);
    const validateOnly = c.req.query("validate") === "1";
    const inv = await invoiceForTenant(db, auth.tenantId, idParse.data);
    if (!inv) return c.json({ error: "not_found" }, 404);
    if (!inv.isFinalized) return c.json({ error: "finalize_required" }, 409);
    const detail = await buildInvoiceDetailPayload(db, auth.tenantId, idParse.data);
    const snapshot = resolveInvoiceSnapshotSource(inv, detail);
    if (!snapshot) return c.json({ error: "not_found" }, 404);

    const preflightErrors: EInvoiceIssue[] = [];
    const preflightWarnings: EInvoiceIssue[] = [];

    const sellerAddress = org.senderAddress
      ? parseMultilineAddress(org.senderAddress)
      : null;
    if (!sellerAddress) {
      preflightErrors.push({
        level: "error",
        code: "seller_address_missing",
        message:
          "organization senderAddress is required and must contain at least street + a 'PLZ Ort' line (e.g. '12345 Berlin')",
        path: ["organization", "senderAddress"],
      });
    }

    let buyer: EInvoiceParty | null = null;
    let buyerReference: string | null = null;
    if (!inv.customerId) {
      preflightErrors.push({
        level: "error",
        code: "buyer_customer_missing",
        message: "invoice customerId is required to resolve buyer address for e-invoicing",
        path: ["invoice", "customerId"],
      });
    } else {
      const customerRows = await db
        .select({
          id: customers.id,
          displayName: customers.displayName,
          customerNumber: customers.customerNumber,
          vatId: customers.vatId,
          taxNumber: customers.taxNumber,
        })
        .from(customers)
        .where(and(eq(customers.id, inv.customerId), eq(customers.tenantId, auth.tenantId)))
        .limit(1);
      const customer = customerRows[0];
      if (!customer) {
        preflightErrors.push({
          level: "error",
          code: "buyer_customer_not_found",
          message: "invoice customerId does not exist for this tenant",
          path: ["invoice", "customerId"],
        });
      } else {
        const addrRows = await db
          .select()
          .from(customerAddresses)
          .where(eq(customerAddresses.customerId, customer.id));
        const ranked = [...addrRows].sort((a, b) => {
          const rank = (x: typeof customerAddresses.$inferSelect) => {
            const kindRank =
              x.kind === "billing"
                ? 0
                : x.kind === "shipping"
                  ? 1
                  : x.kind === "site"
                    ? 2
                    : 3;
            return (x.isDefault ? 0 : 10) + kindRank;
          };
          const ra = rank(a);
          const rb = rank(b);
          if (ra !== rb) return ra - rb;
          const da = a.createdAt?.getTime?.() ?? 0;
          const dbt = b.createdAt?.getTime?.() ?? 0;
          if (da !== dbt) return da - dbt;
          return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
        });
        const best = ranked[0] ?? null;
        if (!best) {
          preflightErrors.push({
            level: "error",
            code: "buyer_address_missing",
            message: "customer must have at least one address to generate XRechnung/ZUGFeRD",
            path: ["customer", "addresses"],
          });
        } else {
          buyerReference = customer.customerNumber ?? null;
          const buyerName =
            (best.recipientName?.trim() || customer.displayName?.trim() || snapshot.customerLabel).trim();
          buyer = {
            name: buyerName,
            address: {
              street: best.street,
              addressLine2: best.addressLine2 ?? null,
              postalCode: best.postalCode,
              city: best.city,
              country: best.country,
            },
            vatId: customer.vatId ?? null,
            taxNumber: customer.taxNumber ?? null,
          };
        }
      }
    }

    if (preflightErrors.length > 0 || !sellerAddress || !buyer) {
      const payload = {
        ok: false,
        profile: "xrechnung" as const,
        errors: preflightErrors,
        warnings: preflightWarnings,
      };
      return c.json(
        validateOnly ? payload : { error: "e_invoice_validation_failed", ...payload },
        422,
      );
    }

    const seller: EInvoiceParty = {
      name: org.name,
      address: sellerAddress,
      vatId: org.vatId ?? null,
      taxNumber: org.taxNumber ?? null,
    };

    const validation = validateCiiEInvoiceData({
      profile: "xrechnung",
      invoice: snapshot,
      seller,
      buyer,
      buyerReference,
    });

    if (validateOnly) {
      return c.json({ profile: "xrechnung", ...validation }, validation.ok ? 200 : 422);
    }
    if (!validation.ok) {
      return c.json(
        { error: "e_invoice_validation_failed", profile: "xrechnung", ...validation },
        422,
      );
    }

    const xml = buildCiiEInvoiceXmlV2({
      profile: "xrechnung",
      invoice: snapshot,
      seller,
      buyer,
      buyerReference,
    });
    c.header("Content-Type", "application/xml; charset=utf-8");
    c.header(
      "Content-Disposition",
      `attachment; filename="${snapshot.documentNumber}-xrechnung.xml"`,
    );
    return c.body(xml);
  };
}

export function createSalesInvoiceZugferdGetHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) return c.json({ error: "missing_auth" }, 500);
    const org = c.get("organization");
    if (!org) return c.json({ error: "missing_organization" }, 500);
    const idParse = z.string().uuid().safeParse(c.req.param("id"));
    if (!idParse.success) return c.json({ error: "invalid_id" }, 400);
    const db = getDb();
    if (!db) return c.json({ error: "database_unavailable" }, 503);
    const validateOnly = c.req.query("validate") === "1";
    const inv = await invoiceForTenant(db, auth.tenantId, idParse.data);
    if (!inv) return c.json({ error: "not_found" }, 404);
    if (!inv.isFinalized) return c.json({ error: "finalize_required" }, 409);
    const detail = await buildInvoiceDetailPayload(db, auth.tenantId, idParse.data);
    const snapshot = resolveInvoiceSnapshotSource(inv, detail);
    if (!snapshot) return c.json({ error: "not_found" }, 404);

    const preflightErrors: EInvoiceIssue[] = [];
    const preflightWarnings: EInvoiceIssue[] = [];

    const sellerAddress = org.senderAddress
      ? parseMultilineAddress(org.senderAddress)
      : null;
    if (!sellerAddress) {
      preflightErrors.push({
        level: "error",
        code: "seller_address_missing",
        message:
          "organization senderAddress is required and must contain at least street + a 'PLZ Ort' line (e.g. '12345 Berlin')",
        path: ["organization", "senderAddress"],
      });
    }

    let buyer: EInvoiceParty | null = null;
    let buyerReference: string | null = null;
    if (!inv.customerId) {
      preflightErrors.push({
        level: "error",
        code: "buyer_customer_missing",
        message: "invoice customerId is required to resolve buyer address for e-invoicing",
        path: ["invoice", "customerId"],
      });
    } else {
      const customerRows = await db
        .select({
          id: customers.id,
          displayName: customers.displayName,
          customerNumber: customers.customerNumber,
          vatId: customers.vatId,
          taxNumber: customers.taxNumber,
        })
        .from(customers)
        .where(and(eq(customers.id, inv.customerId), eq(customers.tenantId, auth.tenantId)))
        .limit(1);
      const customer = customerRows[0];
      if (!customer) {
        preflightErrors.push({
          level: "error",
          code: "buyer_customer_not_found",
          message: "invoice customerId does not exist for this tenant",
          path: ["invoice", "customerId"],
        });
      } else {
        const addrRows = await db
          .select()
          .from(customerAddresses)
          .where(eq(customerAddresses.customerId, customer.id));
        const ranked = [...addrRows].sort((a, b) => {
          const rank = (x: typeof customerAddresses.$inferSelect) => {
            const kindRank =
              x.kind === "billing"
                ? 0
                : x.kind === "shipping"
                  ? 1
                  : x.kind === "site"
                    ? 2
                    : 3;
            return (x.isDefault ? 0 : 10) + kindRank;
          };
          const ra = rank(a);
          const rb = rank(b);
          if (ra !== rb) return ra - rb;
          const da = a.createdAt?.getTime?.() ?? 0;
          const dbt = b.createdAt?.getTime?.() ?? 0;
          if (da !== dbt) return da - dbt;
          return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
        });
        const best = ranked[0] ?? null;
        if (!best) {
          preflightErrors.push({
            level: "error",
            code: "buyer_address_missing",
            message: "customer must have at least one address to generate XRechnung/ZUGFeRD",
            path: ["customer", "addresses"],
          });
        } else {
          buyerReference = customer.customerNumber ?? null;
          const buyerName =
            (best.recipientName?.trim() || customer.displayName?.trim() || snapshot.customerLabel).trim();
          buyer = {
            name: buyerName,
            address: {
              street: best.street,
              addressLine2: best.addressLine2 ?? null,
              postalCode: best.postalCode,
              city: best.city,
              country: best.country,
            },
            vatId: customer.vatId ?? null,
            taxNumber: customer.taxNumber ?? null,
          };
        }
      }
    }

    if (preflightErrors.length > 0 || !sellerAddress || !buyer) {
      const payload = {
        ok: false,
        profile: "zugferd" as const,
        errors: preflightErrors,
        warnings: preflightWarnings,
      };
      return c.json(
        validateOnly ? payload : { error: "e_invoice_validation_failed", ...payload },
        422,
      );
    }

    const seller: EInvoiceParty = {
      name: org.name,
      address: sellerAddress,
      vatId: org.vatId ?? null,
      taxNumber: org.taxNumber ?? null,
    };

    const validation = validateCiiEInvoiceData({
      profile: "zugferd",
      invoice: snapshot,
      seller,
      buyer,
      buyerReference,
    });

    if (validateOnly) {
      return c.json({ profile: "zugferd", ...validation }, validation.ok ? 200 : 422);
    }
    if (!validation.ok) {
      return c.json(
        { error: "e_invoice_validation_failed", profile: "zugferd", ...validation },
        422,
      );
    }

    const xml = buildCiiEInvoiceXmlV2({
      profile: "zugferd",
      invoice: snapshot,
      seller,
      buyer,
      buyerReference,
    });
    c.header("Content-Type", "application/xml; charset=utf-8");
    c.header(
      "Content-Disposition",
      `attachment; filename="${snapshot.documentNumber}-zugferd.xml"`,
    );
    return c.body(xml);
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
    if (!canMutateInvoice(row)) {
      return c.json({ error: "finalized_locked" }, 409);
    }
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
    if (!canMutateInvoice(row)) {
      return c.json({ error: "finalized_locked" }, 409);
    }
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
    const parentInvoiceId = input.parentInvoiceId ?? null;
    const creditForInvoiceId = input.creditForInvoiceId ?? null;
    if (input.billingType === "invoice") {
      if (parentInvoiceId) {
        return c.json({ error: "invalid_parent_invoice" }, 400);
      }
      if (creditForInvoiceId) {
        return c.json({ error: "invalid_credit_reference" }, 400);
      }
    } else if (input.billingType === "partial" || input.billingType === "final") {
      if (!parentInvoiceId) {
        return c.json({ error: "invalid_parent_invoice" }, 400);
      }
      if (creditForInvoiceId) {
        return c.json({ error: "invalid_credit_reference" }, 400);
      }
    } else if (input.billingType === "credit_note") {
      if (!creditForInvoiceId) {
        return c.json({ error: "invalid_credit_reference" }, 400);
      }
      if (parentInvoiceId) {
        return c.json({ error: "invalid_parent_invoice" }, 400);
      }
    }
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
    if (parentInvoiceId) {
      const ok = await assertInvoiceForTenant(db, auth.tenantId, parentInvoiceId);
      if (!ok) {
        return c.json({ error: "invalid_parent_invoice" }, 400);
      }
    }
    if (creditForInvoiceId) {
      const ok = await assertInvoiceForTenant(
        db,
        auth.tenantId,
        creditForInvoiceId,
      );
      if (!ok) {
        return c.json({ error: "invalid_credit_reference" }, 400);
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
    const headerDiscountBps = Math.min(
      10_000,
      Math.max(0, input.headerDiscountBps ?? 0),
    );
    const billingCheck = await validateInvoiceBillingReferences(db, auth.tenantId, {
      billingType: input.billingType ?? "invoice",
      parentInvoiceId,
      creditForInvoiceId,
      projectId: input.projectId ?? null,
      customerId: input.customerId ?? null,
    });
    if (!billingCheck.ok) {
      return c.json(
        { error: billingCheck.error },
        billingValidationErrorStatus(billingCheck.error),
      );
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
          billingType: input.billingType ?? "invoice",
          currency: input.currency,
          totalCents: input.totalCents,
          headerDiscountBps,
          quoteId: input.quoteId ?? null,
          parentInvoiceId,
          creditForInvoiceId,
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
    const parentInvoiceId = input.parentInvoiceId ?? null;
    const creditForInvoiceId = input.creditForInvoiceId ?? null;
    if (input.billingType === "invoice") {
      if (parentInvoiceId) {
        return c.json({ error: "invalid_parent_invoice" }, 400);
      }
      if (creditForInvoiceId) {
        return c.json({ error: "invalid_credit_reference" }, 400);
      }
    } else if (input.billingType === "partial" || input.billingType === "final") {
      if (!parentInvoiceId) {
        return c.json({ error: "invalid_parent_invoice" }, 400);
      }
      if (creditForInvoiceId) {
        return c.json({ error: "invalid_credit_reference" }, 400);
      }
    } else if (input.billingType === "credit_note") {
      if (!creditForInvoiceId) {
        return c.json({ error: "invalid_credit_reference" }, 400);
      }
      if (parentInvoiceId) {
        return c.json({ error: "invalid_parent_invoice" }, 400);
      }
    }
    if (parentInvoiceId) {
      const ok = await assertInvoiceForTenant(db, auth.tenantId, parentInvoiceId);
      if (!ok) {
        return c.json({ error: "invalid_parent_invoice" }, 400);
      }
    }
    if (creditForInvoiceId) {
      const ok = await assertInvoiceForTenant(
        db,
        auth.tenantId,
        creditForInvoiceId,
      );
      if (!ok) {
        return c.json({ error: "invalid_credit_reference" }, 400);
      }
    }
    const quoteOk = await assertQuoteForTenant(db, auth.tenantId, quoteId);
    if (!quoteOk) {
      return c.json({ error: "not_found" }, 404);
    }
    const [quoteBilling] = await db
      .select({
        projectId: salesQuotes.projectId,
        customerId: salesQuotes.customerId,
      })
      .from(salesQuotes)
      .where(
        and(eq(salesQuotes.id, quoteId), eq(salesQuotes.tenantId, auth.tenantId)),
      )
      .limit(1);
    const headerDiscountBpsFromQuote = Math.min(
      10_000,
      Math.max(0, input.headerDiscountBps ?? 0),
    );
    const billingCheckFromQuote = await validateInvoiceBillingReferences(
      db,
      auth.tenantId,
      {
        billingType: input.billingType ?? "invoice",
        parentInvoiceId,
        creditForInvoiceId,
        projectId: quoteBilling?.projectId ?? null,
        customerId: quoteBilling?.customerId ?? null,
      },
    );
    if (!billingCheckFromQuote.ok) {
      return c.json(
        { error: billingCheckFromQuote.error },
        billingValidationErrorStatus(billingCheckFromQuote.error),
      );
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
            billingType: input.billingType ?? "invoice",
            currency: quoteRow.currency,
            totalCents: 0,
            headerDiscountBps: headerDiscountBpsFromQuote,
            quoteId,
            parentInvoiceId,
            creditForInvoiceId,
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
              taxRateBps: l.taxRateBps ?? 1900,
              discountBps: l.discountBps ?? 0,
              unitPriceCents: l.unitPriceCents,
              lineTotalCents: l.lineTotalCents,
            })),
          );
        }
        const [agg] = await tx
          .select({ t: sum(salesInvoiceLines.lineTotalCents) })
          .from(salesInvoiceLines)
          .where(eq(salesInvoiceLines.invoiceId, inv.id));
        const lineSum = sumFromAggregate(agg?.t);
        const total = Math.max(
          0,
          Math.round((lineSum * (10_000 - headerDiscountBpsFromQuote)) / 10_000),
        );
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
    const current = await invoiceForTenant(db, auth.tenantId, id);
    if (!current) {
      return c.json({ error: "not_found" }, 404);
    }
    if (!canMutateInvoice(current)) {
      return c.json({ error: "finalized_locked" }, 409);
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
    if (patch.parentInvoiceId !== undefined && patch.parentInvoiceId !== null) {
      if (patch.parentInvoiceId === id) {
        return c.json({ error: "invalid_parent_invoice" }, 400);
      }
      const ok = await assertInvoiceForTenant(
        db,
        auth.tenantId,
        patch.parentInvoiceId,
      );
      if (!ok) {
        return c.json({ error: "invalid_parent_invoice" }, 400);
      }
    }
    if (patch.creditForInvoiceId !== undefined && patch.creditForInvoiceId !== null) {
      if (patch.creditForInvoiceId === id) {
        return c.json({ error: "invalid_credit_reference" }, 400);
      }
      const ok = await assertInvoiceForTenant(
        db,
        auth.tenantId,
        patch.creditForInvoiceId,
      );
      if (!ok) {
        return c.json({ error: "invalid_credit_reference" }, 400);
      }
    }
    if (patch.customerId !== undefined && patch.customerId !== null) {
      const ok = await assertCustomerForTenant(db, auth.tenantId, patch.customerId);
      if (!ok) {
        return c.json({ error: "invalid_customer" }, 400);
      }
    }
    const nextBillingType = patch.billingType ?? current.billingType;
    const nextParent =
      patch.parentInvoiceId !== undefined
        ? patch.parentInvoiceId
        : current.parentInvoiceId;
    const nextCredit =
      patch.creditForInvoiceId !== undefined
        ? patch.creditForInvoiceId
        : current.creditForInvoiceId;
    const nextProject =
      patch.projectId !== undefined ? patch.projectId : current.projectId;
    const nextCustomer =
      patch.customerId !== undefined ? patch.customerId : current.customerId;
    const billingPatchCheck = await validateInvoiceBillingReferences(
      db,
      auth.tenantId,
      {
        invoiceId: id,
        billingType: nextBillingType,
        parentInvoiceId: nextParent,
        creditForInvoiceId: nextCredit,
        projectId: nextProject,
        customerId: nextCustomer,
      },
    );
    if (!billingPatchCheck.ok) {
      return c.json(
        { error: billingPatchCheck.error },
        billingValidationErrorStatus(billingPatchCheck.error),
      );
    }
    const updates: {
      updatedAt: Date;
      documentNumber?: string;
      customerLabel?: string;
      customerId?: string | null;
      status?: string;
      billingType?: "invoice" | "partial" | "final" | "credit_note";
      currency?: string;
      totalCents?: number;
      headerDiscountBps?: number;
      quoteId?: string | null;
      parentInvoiceId?: string | null;
      creditForInvoiceId?: string | null;
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
    if (patch.billingType !== undefined) {
      updates.billingType = patch.billingType;
      if (patch.billingType === "invoice") {
        updates.parentInvoiceId = null;
        updates.creditForInvoiceId = null;
      } else if (patch.billingType === "partial" || patch.billingType === "final") {
        updates.creditForInvoiceId = null;
      } else if (patch.billingType === "credit_note") {
        updates.parentInvoiceId = null;
      }
    }
    if (patch.currency !== undefined) {
      updates.currency = patch.currency;
    }
    if (patch.headerDiscountBps !== undefined) {
      updates.headerDiscountBps = Math.min(10_000, Math.max(0, patch.headerDiscountBps));
    }
    if (patch.totalCents !== undefined && lineCount === 0) {
      updates.totalCents = patch.totalCents;
    }
    if (patch.quoteId !== undefined) {
      updates.quoteId = patch.quoteId;
    }
    if (patch.parentInvoiceId !== undefined) {
      updates.parentInvoiceId = patch.parentInvoiceId;
    }
    if (patch.creditForInvoiceId !== undefined) {
      updates.creditForInvoiceId = patch.creditForInvoiceId;
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

export function createSalesInvoiceBatchPaymentsPostHandler(
  getDb: () => Db | undefined,
) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) return c.json({ error: "missing_auth" }, 500);
    if (!canEditSalesDocuments(auth)) return c.json({ error: "forbidden" }, 403);

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    const parsed = salesCreateBatchInvoicePaymentsSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "validation_error" }, 400);
    }

    const paidAt = new Date(parsed.data.paidAt);
    if (Number.isNaN(paidAt.getTime())) {
      return c.json({ error: "invalid_paid_at" }, 400);
    }

    const invoiceIds = parsed.data.allocations.map((a) => a.invoiceId);
    if (new Set(invoiceIds).size !== invoiceIds.length) {
      return c.json({ error: "duplicate_invoice_id" }, 400);
    }

    const db = getDb();
    if (!db) return c.json({ error: "database_unavailable" }, 503);

    const invoiceRows = await db
      .select({
        id: salesInvoices.id,
        totalCents: salesInvoices.totalCents,
        status: salesInvoices.status,
      })
      .from(salesInvoices)
      .where(
        and(
          eq(salesInvoices.tenantId, auth.tenantId),
          inArray(salesInvoices.id, invoiceIds),
        ),
      );
    if (invoiceRows.length !== invoiceIds.length) {
      return c.json({ error: "not_found" }, 404);
    }

    if (invoiceRows.some((r) => r.status === "cancelled")) {
      return c.json({ error: "invalid_state" }, 409);
    }

    const [payAggRows, invoiceRowsById] = [
      await db
        .select({
          invoiceId: salesInvoicePayments.invoiceId,
          t: sum(salesInvoicePayments.amountCents),
        })
        .from(salesInvoicePayments)
        .where(
          and(
            eq(salesInvoicePayments.tenantId, auth.tenantId),
            inArray(salesInvoicePayments.invoiceId, invoiceIds),
          ),
        )
        .groupBy(salesInvoicePayments.invoiceId),
      new Map(invoiceRows.map((r) => [r.id, r])),
    ];
    const paidSumByInvoiceId = new Map(
      payAggRows.map((r) => [r.invoiceId, sumFromAggregate(r.t)]),
    );

    for (const allocation of parsed.data.allocations) {
      const inv = invoiceRowsById.get(allocation.invoiceId);
      if (!inv) return c.json({ error: "not_found" }, 404);
      const prevSum = paidSumByInvoiceId.get(allocation.invoiceId) ?? 0;
      if (prevSum + allocation.amountCents > inv.totalCents) {
        return c.json({ error: "payment_exceeds_balance" }, 409);
      }
    }

    const defaultNote = parsed.data.note ?? null;
    const created = await db.transaction(async (tx) =>
      tx
        .insert(salesInvoicePayments)
        .values(
          parsed.data.allocations.map((allocation) => ({
            tenantId: auth.tenantId,
            invoiceId: allocation.invoiceId,
            amountCents: allocation.amountCents,
            paidAt,
            note: allocation.note ?? defaultNote,
          })),
        )
        .returning({
          paymentId: salesInvoicePayments.id,
          invoiceId: salesInvoicePayments.invoiceId,
          amountCents: salesInvoicePayments.amountCents,
        }),
    );

    for (const invoiceId of invoiceIds) {
      await syncInvoicePaymentState(db, invoiceId);
    }

    const payload = {
      created,
      invoiceIds,
      totalAmountCents: created.reduce((acc, row) => acc + row.amountCents, 0),
    };
    const safe = salesBatchInvoicePaymentsResponseSchema.safeParse(payload);
    if (!safe.success) {
      return c.json({ error: "response_serialization" }, 500);
    }
    return c.json(safe.data);
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

function mapSalesReminderEmailJobRow(
  row: typeof salesReminderEmailJobs.$inferSelect,
) {
  const mapped = {
    id: row.id,
    tenantId: row.tenantId,
    invoiceId: row.invoiceId,
    reminderId: row.reminderId,
    toEmail: row.toEmail,
    subject: row.subject,
    bodyText: row.bodyText,
    locale: row.locale === "en" ? "en" as const : "de" as const,
    status: row.status as "pending" | "processing" | "sent" | "failed",
    attempts: row.attempts,
    maxAttempts: row.maxAttempts,
    lastError: row.lastError ?? null,
    createdBySub: row.createdBySub ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    sentAt: row.sentAt?.toISOString() ?? null,
  };
  const safe = salesReminderEmailJobRecordSchema.safeParse(mapped);
  if (!safe.success) {
    return null;
  }
  return safe.data;
}

async function claimReminderEmailJobForProcessing(
  db: Db,
  row: typeof salesReminderEmailJobs.$inferSelect,
): Promise<typeof salesReminderEmailJobs.$inferSelect | null> {
  const now = new Date();
  const [updated] = await db
    .update(salesReminderEmailJobs)
    .set({
      status: "processing",
      updatedAt: now,
    })
    .where(
      and(
        eq(salesReminderEmailJobs.id, row.id),
        eq(salesReminderEmailJobs.tenantId, row.tenantId),
        eq(salesReminderEmailJobs.status, "pending"),
      ),
    )
    .returning();
  return updated ?? null;
}

async function markReminderEmailJobAttempt(
  db: Db,
  row: typeof salesReminderEmailJobs.$inferSelect,
  args: { status: "sent" | "failed"; lastError: string | null },
): Promise<typeof salesReminderEmailJobs.$inferSelect | null> {
  const now = new Date();
  const [updated] = await db
    .update(salesReminderEmailJobs)
    .set({
      status: args.status,
      attempts: row.attempts + 1,
      lastError: args.status === "failed" ? (args.lastError ?? "delivery_failed") : null,
      sentAt: args.status === "sent" ? now : null,
      updatedAt: now,
    })
    .where(
      and(
        eq(salesReminderEmailJobs.id, row.id),
        eq(salesReminderEmailJobs.tenantId, row.tenantId),
        eq(salesReminderEmailJobs.status, "processing"),
      ),
    )
    .returning();
  return updated ?? null;
}

async function deliverReminderEmailJob(
  db: Db,
  row: typeof salesReminderEmailJobs.$inferSelect,
): Promise<typeof salesReminderEmailJobs.$inferSelect | null> {
  if (row.attempts + 1 > row.maxAttempts) {
    const now = new Date();
    const [updated] = await db
      .update(salesReminderEmailJobs)
      .set({
        status: "failed",
        attempts: row.attempts,
        lastError: "max_attempts_exceeded",
        updatedAt: now,
      })
      .where(
        and(
          eq(salesReminderEmailJobs.id, row.id),
          eq(salesReminderEmailJobs.tenantId, row.tenantId),
          eq(salesReminderEmailJobs.status, "processing"),
        ),
      )
      .returning();
    return updated ?? null;
  }

  if (!isSmtpConfigured()) {
    return markReminderEmailJobAttempt(db, row, {
      status: "failed",
      lastError: "smtp_not_configured",
    });
  }

  const transport = createSmtpTransport();
  try {
    await transport.sendMail({
      from: smtpFromAddress(),
      to: row.toEmail,
      subject: row.subject,
      text: row.bodyText,
    });
    return markReminderEmailJobAttempt(db, row, { status: "sent", lastError: null });
  } catch (err) {
    const message =
      err instanceof Error ? err.message.slice(0, 8000) : "smtp_send_failed";
    return markReminderEmailJobAttempt(db, row, {
      status: "failed",
      lastError: message,
    });
  }
}

async function processPendingReminderEmailJobs(
  db: Db,
  tenantId: string,
  args?: { limit?: number; jobId?: string },
): Promise<{
  processed: number;
  sent: number;
  failed: number;
  rows: typeof salesReminderEmailJobs.$inferSelect[];
}> {
  const limit = Math.min(100, Math.max(1, args?.limit ?? 20));
  const where: SQL[] = [
    eq(salesReminderEmailJobs.tenantId, tenantId),
    eq(salesReminderEmailJobs.status, "pending"),
  ];
  if (args?.jobId) {
    where.push(eq(salesReminderEmailJobs.id, args.jobId));
  }
  const pending = await db
    .select()
    .from(salesReminderEmailJobs)
    .where(and(...where))
    .orderBy(asc(salesReminderEmailJobs.createdAt))
    .limit(limit);

  const rows: typeof salesReminderEmailJobs.$inferSelect[] = [];
  let sent = 0;
  let failed = 0;
  for (const row of pending) {
    const claimed = await claimReminderEmailJobForProcessing(db, row);
    if (!claimed) continue;
    const updated = await deliverReminderEmailJob(db, claimed);
    if (!updated) continue;
    rows.push(updated);
    if (updated.status === "sent") sent += 1;
    if (updated.status === "failed") failed += 1;
  }
  return {
    processed: rows.length,
    sent,
    failed,
    rows,
  };
}

export async function processReminderEmailOutboxForAllTenants(
  db: Db,
  args?: { tenantLimit?: number; perTenantLimit?: number },
): Promise<{
  tenantCount: number;
  processed: number;
  sent: number;
  failed: number;
  erroredTenants: string[];
}> {
  const tenantLimit = Math.min(500, Math.max(1, args?.tenantLimit ?? 50));
  const perTenantLimit = Math.min(100, Math.max(1, args?.perTenantLimit ?? 20));

  const oldestPending = min(salesReminderEmailJobs.createdAt);
  const tenantRows = await db
    .select({
      tenantId: salesReminderEmailJobs.tenantId,
      oldestPendingCreatedAt: oldestPending,
    })
    .from(salesReminderEmailJobs)
    .where(eq(salesReminderEmailJobs.status, "pending"))
    .groupBy(salesReminderEmailJobs.tenantId)
    .orderBy(asc(oldestPending))
    .limit(tenantLimit);

  let processed = 0;
  let sent = 0;
  let failed = 0;
  const erroredTenants: string[] = [];

  for (const row of tenantRows) {
    try {
      const result = await processPendingReminderEmailJobs(db, row.tenantId, {
        limit: perTenantLimit,
      });
      processed += result.processed;
      sent += result.sent;
      failed += result.failed;
    } catch {
      erroredTenants.push(row.tenantId);
    }
  }

  return {
    tenantCount: tenantRows.length,
    processed,
    sent,
    failed,
    erroredTenants,
  };
}

export function createSalesReminderEmailJobPostHandler(
  getDb: () => Db | undefined,
) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) return c.json({ error: "missing_auth" }, 500);
    if (!canEditSalesDocuments(auth)) return c.json({ error: "forbidden" }, 403);
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

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    const parsed = salesReminderEmailJobCreateSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "validation_error" }, 400);
    }

    const db = getDb();
    if (!db) return c.json({ error: "database_unavailable" }, 503);

    const inv = await invoiceForTenant(db, auth.tenantId, invoiceId);
    if (!inv) return c.json({ error: "not_found" }, 404);

    const [reminderRow] = await db
      .select({ id: salesInvoiceReminders.id })
      .from(salesInvoiceReminders)
      .where(
        and(
          eq(salesInvoiceReminders.id, reminderId),
          eq(salesInvoiceReminders.invoiceId, invoiceId),
          eq(salesInvoiceReminders.tenantId, auth.tenantId),
        ),
      )
      .limit(1);
    if (!reminderRow) {
      return c.json({ error: "not_found" }, 404);
    }

    const now = new Date();
    const [inserted] = await db
      .insert(salesReminderEmailJobs)
      .values({
        tenantId: auth.tenantId,
        invoiceId,
        reminderId,
        toEmail: parsed.data.to,
        subject: parsed.data.subject,
        bodyText: parsed.data.bodyText,
        locale: parsed.data.locale,
        status: "pending",
        attempts: 0,
        maxAttempts: 3,
        createdBySub: auth.sub || null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    const row = inserted;
    if (!row) return c.json({ error: "insert_failed" }, 500);
    const job = mapSalesReminderEmailJobRow(row);
    if (!job) return c.json({ error: "response_serialization" }, 500);
    const payload = salesReminderEmailJobCreateResponseSchema.safeParse({ job });
    if (!payload.success) {
      return c.json({ error: "response_serialization" }, 500);
    }
    return c.json(payload.data, 201);
  };
}

export function createSalesReminderEmailJobPatchHandler(
  getDb: () => Db | undefined,
) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) return c.json({ error: "missing_auth" }, 500);
    if (!canEditSalesDocuments(auth)) return c.json({ error: "forbidden" }, 403);
    const jobIdParse = z.string().uuid().safeParse(c.req.param("jobId"));
    if (!jobIdParse.success) return c.json({ error: "invalid_id" }, 400);
    const jobId = jobIdParse.data;

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    const parsed = salesReminderEmailJobPatchSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "validation_error" }, 400);
    }

    const db = getDb();
    if (!db) return c.json({ error: "database_unavailable" }, 503);

    const [existing] = await db
      .select()
      .from(salesReminderEmailJobs)
      .where(
        and(
          eq(salesReminderEmailJobs.id, jobId),
          eq(salesReminderEmailJobs.tenantId, auth.tenantId),
        ),
      )
      .limit(1);
    if (!existing) return c.json({ error: "not_found" }, 404);
    if (existing.status !== "pending") {
      return c.json({ error: "invalid_state" }, 409);
    }

    const now = new Date();
    const nextAttempts = existing.attempts + 1;
    if (nextAttempts > existing.maxAttempts) {
      return c.json({ error: "max_attempts_exceeded" }, 409);
    }

    const nextStatus = parsed.data.status;
    const [updated] = await db
      .update(salesReminderEmailJobs)
      .set({
        status: nextStatus,
        attempts: nextAttempts,
        lastError:
          nextStatus === "failed"
            ? (parsed.data.lastError ?? "delivery_failed")
            : null,
        sentAt: nextStatus === "sent" ? now : null,
        updatedAt: now,
      })
      .where(
        and(
          eq(salesReminderEmailJobs.id, jobId),
          eq(salesReminderEmailJobs.tenantId, auth.tenantId),
        ),
      )
      .returning();

    const row = updated;
    if (!row) return c.json({ error: "update_failed" }, 500);
    const job = mapSalesReminderEmailJobRow(row);
    if (!job) return c.json({ error: "response_serialization" }, 500);
    return c.json({ job });
  };
}

export function createSalesReminderEmailJobRetryPostHandler(
  getDb: () => Db | undefined,
) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) return c.json({ error: "missing_auth" }, 500);
    if (!canEditSalesDocuments(auth)) return c.json({ error: "forbidden" }, 403);
    const jobIdParse = z.string().uuid().safeParse(c.req.param("jobId"));
    if (!jobIdParse.success) return c.json({ error: "invalid_id" }, 400);
    const db = getDb();
    if (!db) return c.json({ error: "database_unavailable" }, 503);

    const [existing] = await db
      .select()
      .from(salesReminderEmailJobs)
      .where(
        and(
          eq(salesReminderEmailJobs.id, jobIdParse.data),
          eq(salesReminderEmailJobs.tenantId, auth.tenantId),
        ),
      )
      .limit(1);
    if (!existing) return c.json({ error: "not_found" }, 404);
    if (existing.status !== "failed") {
      return c.json({ error: "invalid_state" }, 409);
    }
    if (existing.attempts >= existing.maxAttempts) {
      return c.json({ error: "max_attempts_exceeded" }, 409);
    }

    const [updated] = await db
      .update(salesReminderEmailJobs)
      .set({
        status: "pending",
        updatedAt: new Date(),
        lastError: null,
        sentAt: null,
      })
      .where(
        and(
          eq(salesReminderEmailJobs.id, existing.id),
          eq(salesReminderEmailJobs.tenantId, auth.tenantId),
        ),
      )
      .returning();
    if (!updated) return c.json({ error: "update_failed" }, 500);
    const job = mapSalesReminderEmailJobRow(updated);
    if (!job) return c.json({ error: "response_serialization" }, 500);
    const safe = salesReminderEmailJobRetryResponseSchema.safeParse({ job });
    if (!safe.success) return c.json({ error: "response_serialization" }, 500);
    return c.json(safe.data);
  };
}

export function createSalesReminderEmailJobReplayPostHandler(
  getDb: () => Db | undefined,
) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) return c.json({ error: "missing_auth" }, 500);
    if (!canEditSalesDocuments(auth)) return c.json({ error: "forbidden" }, 403);
    const jobIdParse = z.string().uuid().safeParse(c.req.param("jobId"));
    if (!jobIdParse.success) return c.json({ error: "invalid_id" }, 400);
    const jobId = jobIdParse.data;

    const db = getDb();
    if (!db) return c.json({ error: "database_unavailable" }, 503);

    const [existing] = await db
      .select()
      .from(salesReminderEmailJobs)
      .where(
        and(
          eq(salesReminderEmailJobs.id, jobId),
          eq(salesReminderEmailJobs.tenantId, auth.tenantId),
        ),
      )
      .limit(1);
    if (!existing) return c.json({ error: "not_found" }, 404);
    if (existing.status !== "failed") {
      return c.json({ error: "invalid_state" }, 409);
    }

    const now = new Date();
    const [inserted] = await db
      .insert(salesReminderEmailJobs)
      .values({
        tenantId: auth.tenantId,
        invoiceId: existing.invoiceId,
        reminderId: existing.reminderId,
        toEmail: existing.toEmail,
        subject: existing.subject,
        bodyText: existing.bodyText,
        locale: existing.locale,
        status: "pending",
        attempts: 0,
        maxAttempts: existing.maxAttempts,
        lastError: null,
        createdBySub: auth.sub || null,
        createdAt: now,
        updatedAt: now,
        sentAt: null,
      })
      .returning();

    const row = inserted;
    if (!row) return c.json({ error: "insert_failed" }, 500);
    const job = mapSalesReminderEmailJobRow(row);
    if (!job) return c.json({ error: "response_serialization" }, 500);

    const payload = salesReminderEmailJobReplayResponseSchema.safeParse({
      replayedFromJobId: existing.id,
      job,
    });
    if (!payload.success) {
      return c.json({ error: "response_serialization" }, 500);
    }
    return c.json(payload.data, 201);
  };
}

export function createSalesReminderEmailJobsProcessPostHandler(
  getDb: () => Db | undefined,
) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) return c.json({ error: "missing_auth" }, 500);
    if (!canEditSalesDocuments(auth)) return c.json({ error: "forbidden" }, 403);
    const db = getDb();
    if (!db) return c.json({ error: "database_unavailable" }, 503);

    let body: unknown = {};
    try {
      const text = await c.req.text();
      body = text.trim() === "" ? {} : JSON.parse(text);
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }

    const parsed = salesReminderEmailJobsProcessRequestSchema.safeParse(body);
    if (!parsed.success) return c.json({ error: "validation_error" }, 400);

    const result = await processPendingReminderEmailJobs(db, auth.tenantId, {
      limit: parsed.data.limit,
      jobId: parsed.data.jobId,
    });
    const jobs = result.rows
      .map((row) => mapSalesReminderEmailJobRow(row))
      .filter((row): row is NonNullable<typeof row> => row != null);
    const payload = salesReminderEmailJobsProcessResponseSchema.safeParse({
      processed: result.processed,
      sent: result.sent,
      failed: result.failed,
      jobs,
    });
    if (!payload.success) {
      return c.json({ error: "response_serialization" }, 500);
    }
    return c.json(payload.data);
  };
}

export function createSalesReminderEmailJobsMetricsGetHandler(
  getDb: () => Db | undefined,
) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) return c.json({ error: "missing_auth" }, 500);
    if (!canEditSalesDocuments(auth)) return c.json({ error: "forbidden" }, 403);
    const db = getDb();
    if (!db) return c.json({ error: "database_unavailable" }, 503);

    const rows = await db
      .select({
        status: salesReminderEmailJobs.status,
        total: count(),
      })
      .from(salesReminderEmailJobs)
      .where(eq(salesReminderEmailJobs.tenantId, auth.tenantId))
      .groupBy(salesReminderEmailJobs.status);

    const statusCounts = new Map<string, number>();
    for (const row of rows) {
      statusCounts.set(row.status, Number(row.total ?? 0));
    }

    const pendingCount =
      (statusCounts.get("pending") ?? 0) + (statusCounts.get("processing") ?? 0);
    const sentCount = statusCounts.get("sent") ?? 0;
    const failedCount = statusCounts.get("failed") ?? 0;

    const [oldestPending] = await db
      .select({
        createdAt: min(salesReminderEmailJobs.createdAt),
      })
      .from(salesReminderEmailJobs)
      .where(
        and(
          eq(salesReminderEmailJobs.tenantId, auth.tenantId),
          inArray(salesReminderEmailJobs.status, ["pending", "processing"]),
        ),
      )
      .limit(1);

    const [latestFailed] = await db
      .select({
        updatedAt: salesReminderEmailJobs.updatedAt,
        lastError: salesReminderEmailJobs.lastError,
      })
      .from(salesReminderEmailJobs)
      .where(
        and(
          eq(salesReminderEmailJobs.tenantId, auth.tenantId),
          eq(salesReminderEmailJobs.status, "failed"),
        ),
      )
      .orderBy(desc(salesReminderEmailJobs.updatedAt))
      .limit(1);

    const [latestActivity] = await db
      .select({
        updatedAt: salesReminderEmailJobs.updatedAt,
        status: salesReminderEmailJobs.status,
        attempts: salesReminderEmailJobs.attempts,
      })
      .from(salesReminderEmailJobs)
      .where(eq(salesReminderEmailJobs.tenantId, auth.tenantId))
      .orderBy(desc(salesReminderEmailJobs.updatedAt))
      .limit(1);

    const payload = salesReminderEmailJobsMetricsResponseSchema.safeParse({
      pending: pendingCount,
      sent: sentCount,
      failed: failedCount,
      total: pendingCount + sentCount + failedCount,
      oldestPendingCreatedAt: oldestPending?.createdAt
        ? oldestPending.createdAt.toISOString()
        : null,
      latestFailedAt: latestFailed?.updatedAt
        ? latestFailed.updatedAt.toISOString()
        : null,
      latestFailedError: latestFailed?.lastError ?? null,
      latestActivityAt: latestActivity?.updatedAt
        ? latestActivity.updatedAt.toISOString()
        : null,
      latestActivityStatus: latestActivity?.status ?? null,
      latestActivityAttempts: latestActivity?.attempts ?? null,
    });
    if (!payload.success) {
      return c.json({ error: "response_serialization" }, 500);
    }
    return c.json(payload.data);
  };
}

export function createSalesReminderEmailJobsTenantListGetHandler(
  getDb: () => Db | undefined,
) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) return c.json({ error: "missing_auth" }, 500);
    if (!canEditSalesDocuments(auth)) return c.json({ error: "forbidden" }, 403);

    const db = getDb();
    if (!db) return c.json({ error: "database_unavailable" }, 503);

    const rawLimit = c.req.query("limit");
    const rawOffset = c.req.query("offset");
    const limit = parseListNumber(rawLimit, "limit");
    const offset = parseListNumber(rawOffset, "offset");
    if ((rawLimit && limit === undefined) || (rawOffset && offset === undefined)) {
      return c.json({ error: "validation_error" }, 400);
    }

    const queryParse = salesReminderEmailJobsTenantListQuerySchema.safeParse({
      status: c.req.query("status")?.trim() || undefined,
      limit,
      offset,
    });
    if (!queryParse.success) {
      return c.json({ error: "validation_error" }, 400);
    }
    const query = queryParse.data;

    const where: SQL[] = [eq(salesReminderEmailJobs.tenantId, auth.tenantId)];
    if (query.status) {
      where.push(eq(salesReminderEmailJobs.status, query.status));
    }
    const whereExpr = and(...where)!;

    const [countRow] = await db
      .select({ c: count() })
      .from(salesReminderEmailJobs)
      .where(whereExpr);

    const rows = await db
      .select({
        id: salesReminderEmailJobs.id,
        invoiceId: salesReminderEmailJobs.invoiceId,
        reminderId: salesReminderEmailJobs.reminderId,
        toEmail: salesReminderEmailJobs.toEmail,
        subject: salesReminderEmailJobs.subject,
        locale: salesReminderEmailJobs.locale,
        status: salesReminderEmailJobs.status,
        attempts: salesReminderEmailJobs.attempts,
        maxAttempts: salesReminderEmailJobs.maxAttempts,
        lastError: salesReminderEmailJobs.lastError,
        createdBySub: salesReminderEmailJobs.createdBySub,
        createdAt: salesReminderEmailJobs.createdAt,
        updatedAt: salesReminderEmailJobs.updatedAt,
        sentAt: salesReminderEmailJobs.sentAt,
        invoiceDocumentNumber: salesInvoices.documentNumber,
        invoiceCustomerLabel: salesInvoices.customerLabel,
        invoiceProjectId: salesInvoices.projectId,
        reminderLevel: salesInvoiceReminders.level,
        reminderSentAt: salesInvoiceReminders.sentAt,
      })
      .from(salesReminderEmailJobs)
      .innerJoin(
        salesInvoices,
        and(
          eq(salesInvoices.id, salesReminderEmailJobs.invoiceId),
          eq(salesInvoices.tenantId, auth.tenantId),
        ),
      )
      .innerJoin(
        salesInvoiceReminders,
        and(
          eq(salesInvoiceReminders.id, salesReminderEmailJobs.reminderId),
          eq(salesInvoiceReminders.tenantId, auth.tenantId),
        ),
      )
      .where(whereExpr)
      .orderBy(
        query.status === "pending"
          ? asc(salesReminderEmailJobs.createdAt)
          : desc(salesReminderEmailJobs.updatedAt),
        query.status === "pending"
          ? asc(salesReminderEmailJobs.id)
          : desc(salesReminderEmailJobs.id),
      )
      .limit(query.limit ?? 50)
      .offset(query.offset ?? 0);

    const jobs = rows.map((row) => ({
      id: row.id,
      invoice: {
        id: row.invoiceId,
        documentNumber: row.invoiceDocumentNumber,
        customerLabel: row.invoiceCustomerLabel,
        projectId: row.invoiceProjectId ?? null,
      },
      reminder: {
        id: row.reminderId,
        level: row.reminderLevel,
        sentAt: row.reminderSentAt.toISOString(),
      },
      toEmail: row.toEmail,
      subject: row.subject,
      locale: row.locale === "en" ? ("en" as const) : ("de" as const),
      status: row.status as "pending" | "processing" | "sent" | "failed",
      attempts: row.attempts,
      maxAttempts: row.maxAttempts,
      lastError: row.lastError ?? null,
      createdBySub: row.createdBySub ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      sentAt: row.sentAt?.toISOString() ?? null,
    }));

    const payload = salesReminderEmailJobsTenantListResponseSchema.safeParse({
      jobs,
      total: Number(countRow?.c ?? 0),
    });
    if (!payload.success) {
      return c.json({ error: "response_serialization" }, 500);
    }
    return c.json(payload.data);
  };
}

export function createSalesReminderEmailJobsListHandler(
  getDb: () => Db | undefined,
) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) return c.json({ error: "missing_auth" }, 500);
    if (!canEditSalesDocuments(auth)) return c.json({ error: "forbidden" }, 403);
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
    if (!db) return c.json({ error: "database_unavailable" }, 503);

    const inv = await invoiceForTenant(db, auth.tenantId, invoiceId);
    if (!inv) return c.json({ error: "not_found" }, 404);

    const [reminderRow] = await db
      .select({ id: salesInvoiceReminders.id })
      .from(salesInvoiceReminders)
      .where(
        and(
          eq(salesInvoiceReminders.id, reminderId),
          eq(salesInvoiceReminders.invoiceId, invoiceId),
          eq(salesInvoiceReminders.tenantId, auth.tenantId),
        ),
      )
      .limit(1);
    if (!reminderRow) {
      return c.json({ error: "not_found" }, 404);
    }

    const rows = await db
      .select()
      .from(salesReminderEmailJobs)
      .where(
        and(
          eq(salesReminderEmailJobs.invoiceId, invoiceId),
          eq(salesReminderEmailJobs.reminderId, reminderId),
          eq(salesReminderEmailJobs.tenantId, auth.tenantId),
        ),
      )
      .orderBy(desc(salesReminderEmailJobs.createdAt))
      .limit(100);

    const jobs = rows
      .map((r) => mapSalesReminderEmailJobRow(r))
      .filter((j): j is NonNullable<typeof j> => j != null);
    const payload = salesReminderEmailJobsListResponseSchema.safeParse({ jobs });
    if (!payload.success) {
      return c.json({ error: "response_serialization" }, 500);
    }
    return c.json(payload.data);
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
    if (input.catalogArticleId) {
      const okArt = await assertCatalogArticleForTenant(
        db,
        auth.tenantId,
        input.catalogArticleId,
      );
      if (!okArt) {
        return c.json({ error: "catalog_article_not_found", code: "CATALOG" }, 404);
      }
    }
    const sortIndex = await nextQuoteLineSortIndex(db, quoteId);
    const lineTotalCents = computeLineTotalCents({
      quantity: input.quantity ?? null,
      unitPriceCents: input.unitPriceCents,
      discountBps: input.discountBps ?? 0,
      lineTotalCents: input.lineTotalCents,
    });
    await db.insert(salesQuoteLines).values({
      quoteId,
      catalogArticleId: input.catalogArticleId ?? null,
      sortIndex,
      description: input.description,
      quantity: input.quantity ?? null,
      unit: input.unit ?? null,
      taxRateBps: input.taxRateBps ?? 1900,
      discountBps: input.discountBps ?? 0,
      unitPriceCents: input.unitPriceCents,
      lineTotalCents,
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
      .select({
        id: salesQuoteLines.id,
        quantity: salesQuoteLines.quantity,
        unitPriceCents: salesQuoteLines.unitPriceCents,
        discountBps: salesQuoteLines.discountBps,
        lineTotalCents: salesQuoteLines.lineTotalCents,
      })
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
    const existing = access[0];
    if (!existing) {
      return c.json({ error: "not_found" }, 404);
    }
    const updates: {
      updatedAt: Date;
      sortIndex?: number;
      description?: string;
      quantity?: string | null;
      unit?: string | null;
      taxRateBps?: number;
      discountBps?: number;
      unitPriceCents?: number;
      lineTotalCents?: number;
      catalogArticleId?: string | null;
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
    if (patch.taxRateBps !== undefined) {
      updates.taxRateBps = patch.taxRateBps;
    }
    if (patch.discountBps !== undefined) {
      updates.discountBps = patch.discountBps;
    }
    if (patch.unitPriceCents !== undefined) {
      updates.unitPriceCents = patch.unitPriceCents;
    }
    if (patch.lineTotalCents !== undefined) {
      updates.lineTotalCents = patch.lineTotalCents;
    }
    if (patch.catalogArticleId !== undefined) {
      if (patch.catalogArticleId === null) {
        updates.catalogArticleId = null;
      } else {
        const okArt = await assertCatalogArticleForTenant(
          db,
          auth.tenantId,
          patch.catalogArticleId,
        );
        if (!okArt) {
          return c.json({ error: "catalog_article_not_found", code: "CATALOG" }, 404);
        }
        updates.catalogArticleId = patch.catalogArticleId;
      }
    }
    const nextQuantity = patch.quantity !== undefined ? patch.quantity : existing.quantity;
    const nextUnitPriceCents =
      patch.unitPriceCents !== undefined
        ? patch.unitPriceCents
        : existing.unitPriceCents;
    const nextDiscountBps =
      patch.discountBps !== undefined ? patch.discountBps : existing.discountBps ?? 0;
    const nextLineTotalCents = computeLineTotalCents({
      quantity: nextQuantity,
      unitPriceCents: nextUnitPriceCents,
      discountBps: nextDiscountBps,
      lineTotalCents:
        patch.lineTotalCents !== undefined
          ? patch.lineTotalCents
          : existing.lineTotalCents,
    });
    updates.lineTotalCents = nextLineTotalCents;

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
    const inv = await invoiceForTenant(db, auth.tenantId, invoiceId);
    if (!inv) {
      return c.json({ error: "not_found" }, 404);
    }
    if (!canMutateInvoice(inv)) {
      return c.json({ error: "finalized_locked" }, 409);
    }
    const invOk = await assertInvoiceForTenant(db, auth.tenantId, invoiceId);
    if (!invOk) {
      return c.json({ error: "not_found" }, 404);
    }
    const input = parsed.data;
    if (input.catalogArticleId) {
      const okArt = await assertCatalogArticleForTenant(
        db,
        auth.tenantId,
        input.catalogArticleId,
      );
      if (!okArt) {
        return c.json({ error: "catalog_article_not_found", code: "CATALOG" }, 404);
      }
    }
    const sortIndex = await nextInvoiceLineSortIndex(db, invoiceId);
    const lineTotalCents = computeLineTotalCents({
      quantity: input.quantity ?? null,
      unitPriceCents: input.unitPriceCents,
      discountBps: input.discountBps ?? 0,
      lineTotalCents: input.lineTotalCents,
    });
    await db.insert(salesInvoiceLines).values({
      invoiceId,
      catalogArticleId: input.catalogArticleId ?? null,
      sortIndex,
      description: input.description,
      quantity: input.quantity ?? null,
      unit: input.unit ?? null,
      taxRateBps: input.taxRateBps ?? 1900,
      discountBps: input.discountBps ?? 0,
      unitPriceCents: input.unitPriceCents,
      lineTotalCents,
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
    const inv = await invoiceForTenant(db, auth.tenantId, invoiceId);
    if (!inv) {
      return c.json({ error: "not_found" }, 404);
    }
    if (!canMutateInvoice(inv)) {
      return c.json({ error: "finalized_locked" }, 409);
    }
    const access = await db
      .select({
        id: salesInvoiceLines.id,
        quantity: salesInvoiceLines.quantity,
        unitPriceCents: salesInvoiceLines.unitPriceCents,
        discountBps: salesInvoiceLines.discountBps,
        lineTotalCents: salesInvoiceLines.lineTotalCents,
      })
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
    const existing = access[0];
    if (!existing) {
      return c.json({ error: "not_found" }, 404);
    }
    const updates: {
      updatedAt: Date;
      sortIndex?: number;
      description?: string;
      quantity?: string | null;
      unit?: string | null;
      taxRateBps?: number;
      discountBps?: number;
      unitPriceCents?: number;
      lineTotalCents?: number;
      catalogArticleId?: string | null;
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
    if (patch.taxRateBps !== undefined) {
      updates.taxRateBps = patch.taxRateBps;
    }
    if (patch.discountBps !== undefined) {
      updates.discountBps = patch.discountBps;
    }
    if (patch.unitPriceCents !== undefined) {
      updates.unitPriceCents = patch.unitPriceCents;
    }
    if (patch.lineTotalCents !== undefined) {
      updates.lineTotalCents = patch.lineTotalCents;
    }
    if (patch.catalogArticleId !== undefined) {
      if (patch.catalogArticleId === null) {
        updates.catalogArticleId = null;
      } else {
        const okArt = await assertCatalogArticleForTenant(
          db,
          auth.tenantId,
          patch.catalogArticleId,
        );
        if (!okArt) {
          return c.json({ error: "catalog_article_not_found", code: "CATALOG" }, 404);
        }
        updates.catalogArticleId = patch.catalogArticleId;
      }
    }
    const nextQuantity = patch.quantity !== undefined ? patch.quantity : existing.quantity;
    const nextUnitPriceCents =
      patch.unitPriceCents !== undefined
        ? patch.unitPriceCents
        : existing.unitPriceCents;
    const nextDiscountBps =
      patch.discountBps !== undefined ? patch.discountBps : existing.discountBps ?? 0;
    const nextLineTotalCents = computeLineTotalCents({
      quantity: nextQuantity,
      unitPriceCents: nextUnitPriceCents,
      discountBps: nextDiscountBps,
      lineTotalCents:
        patch.lineTotalCents !== undefined
          ? patch.lineTotalCents
          : existing.lineTotalCents,
    });
    updates.lineTotalCents = nextLineTotalCents;

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
    const inv = await invoiceForTenant(db, auth.tenantId, invoiceId);
    if (!inv) {
      return c.json({ error: "not_found" }, 404);
    }
    if (!canMutateInvoice(inv)) {
      return c.json({ error: "finalized_locked" }, 409);
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
    const inv = await invoiceForTenant(db, auth.tenantId, invoiceId);
    if (!inv) {
      return c.json({ error: "not_found" }, 404);
    }
    if (!canMutateInvoice(inv)) {
      return c.json({ error: "finalized_locked" }, 409);
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
