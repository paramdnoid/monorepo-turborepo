import { readFile } from "node:fs/promises";

import { and, asc, count, desc, eq, max, sum } from "drizzle-orm";
import type { Context } from "hono";
import { z } from "zod";

import {
  salesCreateInvoiceLineSchema,
  salesCreateInvoiceSchema,
  salesCreateQuoteLineSchema,
  salesCreateQuoteSchema,
  salesPatchInvoiceLineSchema,
  salesPatchInvoiceSchema,
  salesPatchQuoteLineSchema,
  salesPatchQuoteSchema,
  salesReorderDocumentLinesSchema,
} from "@repo/api-contracts";

import {
  customers,
  projects,
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
    const rows = await db
      .select()
      .from(salesQuotes)
      .where(eq(salesQuotes.tenantId, auth.tenantId))
      .orderBy(desc(salesQuotes.createdAt))
      .limit(200);
    return c.json({
      quotes: rows.map(mapQuoteRow),
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
    const rows = await db
      .select()
      .from(salesInvoices)
      .where(eq(salesInvoices.tenantId, auth.tenantId))
      .orderBy(desc(salesInvoices.createdAt))
      .limit(200);
    return c.json({
      invoices: rows.map(mapInvoiceRow),
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
    const updates: {
      updatedAt: Date;
      documentNumber?: string;
      customerLabel?: string;
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

export function createSalesInvoicePatchHandler(getDb: () => Db | undefined) {
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
    const updates: {
      updatedAt: Date;
      documentNumber?: string;
      customerLabel?: string;
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
