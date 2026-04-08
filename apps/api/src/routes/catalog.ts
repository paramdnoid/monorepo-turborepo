import { createHash } from "node:crypto";

import {
  type CatalogImportBatchDetail,
  type CatalogImportBatchSummary,
  type CatalogSupplier,
  catalogCreateSupplierSchema,
  catalogPatchImportSchema,
  catalogPatchSupplierSchema,
} from "@repo/api-contracts";
import { z } from "zod";
import { parseBmecatXml } from "@repo/bmecat";
import { parseDatanormBuffer } from "@repo/datanorm";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  or,
  sql,
} from "drizzle-orm";
import type { Context } from "hono";

import {
  catalogArticles,
  catalogImportBatches,
  catalogImportLines,
  catalogPrices,
  catalogSuppliers,
  type Db,
} from "@repo/db";

/**
 * Katalog/uploads: ZIP/Pakete können größer sein als GAEB-LV-XML — dennoch Server-Schutz.
 * Retention: `purgeAfterAt` blendet Datensätze in List/Detail aus; physisches Löschen (Cron) separat.
 */
const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const RETENTION_DAYS = 90;
const LIST_LIMIT = 50;
const DETAIL_LINE_LIMIT = 500;
const ARTICLES_PAGE_DEFAULT = 50;
const ARTICLES_PAGE_MAX = 100;

const UPLOAD_RATE_WINDOW_MS = 60_000;
const UPLOAD_RATE_MAX = 30;
const uploadTimestampsByTenant = new Map<string, number[]>();

function uploadRateAllowed(tenantId: string): boolean {
  const now = Date.now();
  const list = uploadTimestampsByTenant.get(tenantId) ?? [];
  const recent = list.filter((t) => now - t < UPLOAD_RATE_WINDOW_MS);
  if (recent.length >= UPLOAD_RATE_MAX) {
    return false;
  }
  recent.push(now);
  uploadTimestampsByTenant.set(tenantId, recent);
  return true;
}

function logCatalog(
  c: Context,
  msg: string,
  extra: Record<string, unknown> = {},
): void {
  console.log(
    JSON.stringify({
      level: "info",
      service: "zunftgewerk-api",
      module: "catalog",
      requestId: c.get("requestId"),
      msg,
      ...extra,
    }),
  );
}

function sha256Buffer(buf: ArrayBuffer): string {
  return createHash("sha256").update(new Uint8Array(buf)).digest("hex");
}

function purgeDate(): Date {
  return new Date(Date.now() + RETENTION_DAYS * 86_400_000);
}

function isRetentionExpired(purgeAfterAt: Date): boolean {
  return Date.now() > purgeAfterAt.getTime();
}

function redactSupplierMeta(
  meta: Record<string, unknown> | null | undefined,
): Record<string, unknown> | undefined {
  if (!meta || typeof meta !== "object") {
    return undefined;
  }
  const o = { ...meta };
  if ("idsConnectApiKey" in o && o.idsConnectApiKey) {
    o.idsConnectApiKey = "***";
  }
  return o;
}

function mapSupplierRow(
  r: typeof catalogSuppliers.$inferSelect,
): CatalogSupplier {
  const meta =
    r.meta && typeof r.meta === "object"
      ? redactSupplierMeta(r.meta as Record<string, unknown>)
      : undefined;
  return {
    id: r.id,
    name: r.name,
    sourceKind: r.sourceKind,
    createdAt: r.createdAt.toISOString(),
    ...(meta ? { meta } : {}),
  };
}

function mapBatchRow(
  r: typeof catalogImportBatches.$inferSelect,
): CatalogImportBatchSummary {
  return {
    id: r.id,
    supplierId: r.supplierId,
    filename: r.filename,
    sourceFormat: r.sourceFormat,
    status: r.status as "pending_review" | "failed" | "approved",
    fileSha256: r.fileSha256,
    articleCount: r.articleCount,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    approvedAt: r.approvedAt?.toISOString() ?? null,
    purgeAfterAt: r.purgeAfterAt.toISOString(),
    parseErrors: r.parseErrors ?? null,
    warnings: r.warnings ?? null,
  };
}

export function createCatalogSuppliersListHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth", code: "AUTH" }, 500);
    }
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable", code: "DB" }, 503);
    }
    const rows = await db
      .select()
      .from(catalogSuppliers)
      .where(eq(catalogSuppliers.tenantId, auth.tenantId))
      .orderBy(desc(catalogSuppliers.createdAt))
      .limit(LIST_LIMIT);
    return c.json({ suppliers: rows.map(mapSupplierRow) });
  };
}

export function createCatalogSupplierPostHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth", code: "AUTH" }, 500);
    }
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable", code: "DB" }, 503);
    }
    let json: unknown;
    try {
      json = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json", code: "JSON" }, 400);
    }
    const parsed = catalogCreateSupplierSchema.safeParse(json);
    if (!parsed.success) {
      return c.json({ error: "invalid_body", code: "VALIDATION" }, 400);
    }
    const meta =
      parsed.data.sourceKind === "ids_connect"
        ? {
            idsConnectMode: parsed.data.meta.idsConnectMode,
            idsConnectBaseUrl: parsed.data.meta.idsConnectBaseUrl,
            ...(parsed.data.meta.idsConnectApiKey
              ? { idsConnectApiKey: parsed.data.meta.idsConnectApiKey }
              : {}),
          }
        : undefined;

    const [row] = await db
      .insert(catalogSuppliers)
      .values({
        tenantId: auth.tenantId,
        name: parsed.data.name.trim(),
        sourceKind: parsed.data.sourceKind,
        ...(meta ? { meta } : {}),
      })
      .returning();
    if (!row) {
      return c.json({ error: "insert_failed", code: "INSERT" }, 500);
    }
    logCatalog(c, "catalog_supplier_created", {
      tenantId: auth.tenantId,
      supplierId: row.id,
    });
    return c.json(mapSupplierRow(row), 201);
  };
}

export function createCatalogSupplierPatchHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth", code: "AUTH" }, 500);
    }
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable", code: "DB" }, 503);
    }
    const id = c.req.param("id");
    if (!id) {
      return c.json({ error: "missing_id", code: "PARAM" }, 400);
    }
    let json: unknown;
    try {
      json = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json", code: "JSON" }, 400);
    }
    const parsed = catalogPatchSupplierSchema.safeParse(json);
    if (!parsed.success) {
      return c.json({ error: "invalid_body", code: "VALIDATION" }, 400);
    }
    const rows = await db
      .select()
      .from(catalogSuppliers)
      .where(
        and(
          eq(catalogSuppliers.id, id),
          eq(catalogSuppliers.tenantId, auth.tenantId),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) {
      return c.json({ error: "supplier_not_found", code: "SUPPLIER" }, 404);
    }
    if (row.sourceKind !== "ids_connect") {
      return c.json(
        { error: "supplier_not_ids_connect", code: "VALIDATION" },
        400,
      );
    }
    const existingMeta =
      row.meta && typeof row.meta === "object"
        ? (row.meta as Record<string, unknown>)
        : {};
    const patch = parsed.data;
    const nextName = patch.name?.trim() ?? row.name;
    let nextMeta = existingMeta;
    if (patch.meta) {
      const p = patch.meta;
      const newKey =
        p.idsConnectApiKey && p.idsConnectApiKey !== "***"
          ? p.idsConnectApiKey
          : (existingMeta.idsConnectApiKey as string | undefined);
      nextMeta = {
        idsConnectMode: p.idsConnectMode,
        idsConnectBaseUrl: p.idsConnectBaseUrl,
        ...(typeof newKey === "string" && newKey
          ? { idsConnectApiKey: newKey }
          : {}),
      };
    }
    const [updated] = await db
      .update(catalogSuppliers)
      .set({
        name: nextName,
        meta: nextMeta,
      })
      .where(eq(catalogSuppliers.id, id))
      .returning();
    if (!updated) {
      return c.json({ error: "update_failed", code: "UPDATE" }, 500);
    }
    return c.json(mapSupplierRow(updated));
  };
}

export function createCatalogImportPostHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth", code: "AUTH" }, 500);
    }
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable", code: "DB" }, 503);
    }

    if (!uploadRateAllowed(auth.tenantId)) {
      logCatalog(c, "catalog_upload_rate_limited", { tenantId: auth.tenantId });
      return c.json(
        { error: "rate_limited", code: "RATE_LIMIT", retryAfterSec: 60 },
        429,
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await c.req.parseBody({ all: false });
    } catch {
      return c.json({ error: "invalid_multipart", code: "MULTIPART" }, 400);
    }

    const file = body["file"];
    if (!(file instanceof File)) {
      return c.json({ error: "missing_file", code: "FILE" }, 400);
    }
    const supplierIdRaw = body["supplierId"];
    if (typeof supplierIdRaw !== "string" || !supplierIdRaw.trim()) {
      return c.json({ error: "missing_supplier_id", code: "SUPPLIER" }, 400);
    }

    const supRows = await db
      .select()
      .from(catalogSuppliers)
      .where(
        and(
          eq(catalogSuppliers.id, supplierIdRaw.trim()),
          eq(catalogSuppliers.tenantId, auth.tenantId),
        ),
      )
      .limit(1);
    const supplier = supRows[0];
    if (!supplier) {
      return c.json({ error: "supplier_not_found", code: "SUPPLIER" }, 404);
    }
    if (supplier.sourceKind === "ids_connect") {
      return c.json(
        {
          error: "supplier_ids_connect_no_file_upload",
          code: "VALIDATION",
        },
        400,
      );
    }

    const buf = await file.arrayBuffer();
    const size = buf.byteLength;
    if (size > MAX_UPLOAD_BYTES) {
      logCatalog(c, "catalog_upload_rejected_size", {
        tenantId: auth.tenantId,
        size,
      });
      return c.json(
        {
          error: "file_too_large",
          code: "SIZE",
          maxBytes: MAX_UPLOAD_BYTES,
        },
        413,
      );
    }

    const hash = sha256Buffer(buf);
    const u8 = new Uint8Array(buf);

    let parsed: {
      articles: Array<{
        supplierSku: string;
        name: string | null;
        unit: string | null;
        price: string;
        currency: string;
        ean: string | null;
        groupKey: string | null;
      }>;
      errors: { code: string; message: string }[];
      warnings: { code: string; message: string }[];
    };

    if (supplier.sourceKind === "bmecat") {
      const text = new TextDecoder("utf-8", { fatal: false }).decode(u8);
      const bm = parseBmecatXml(text);
      parsed = bm;
    } else {
      parsed = parseDatanormBuffer(u8);
    }

    const hasBlockingErrors = parsed.errors.length > 0;
    const status = hasBlockingErrors ? "failed" : "pending_review";
    const filename = file.name || "upload";

    const [batch] = await db
      .insert(catalogImportBatches)
      .values({
        tenantId: auth.tenantId,
        supplierId: supplier.id,
        filename,
        sourceFormat: supplier.sourceKind,
        fileSha256: hash,
        status,
        parseErrors: hasBlockingErrors ? parsed.errors : null,
        warnings: parsed.warnings.length ? parsed.warnings : null,
        articleCount: parsed.articles.length,
        purgeAfterAt: purgeDate(),
      })
      .returning({ id: catalogImportBatches.id });

    if (!batch) {
      return c.json({ error: "insert_failed", code: "INSERT" }, 500);
    }

    if (!hasBlockingErrors && parsed.articles.length > 0) {
      await db.insert(catalogImportLines).values(
        parsed.articles.map((a, sortIndex) => ({
          batchId: batch.id,
          sortIndex,
          supplierSku: a.supplierSku,
          name: a.name,
          unit: a.unit,
          price: a.price,
          currency: a.currency,
          ean: a.ean,
          groupKey: a.groupKey,
        })),
      );
    }

    logCatalog(c, "catalog_import_stored", {
      tenantId: auth.tenantId,
      batchId: batch.id,
      status,
      articleCount: parsed.articles.length,
    });

    return c.json({ id: batch.id, status }, 201);
  };
}

export function createCatalogImportsListHandler(getDb: () => Db | undefined) {
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
      .from(catalogImportBatches)
      .where(
        and(
          eq(catalogImportBatches.tenantId, auth.tenantId),
          gt(catalogImportBatches.purgeAfterAt, new Date()),
        ),
      )
      .orderBy(desc(catalogImportBatches.createdAt))
      .limit(LIST_LIMIT);
    return c.json({ batches: rows.map(mapBatchRow) });
  };
}

export function createCatalogImportDetailHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }
    const id = c.req.param("id");
    if (!id) {
      return c.json({ error: "missing_id" }, 400);
    }
    const rows = await db
      .select()
      .from(catalogImportBatches)
      .where(
        and(
          eq(catalogImportBatches.id, id),
          eq(catalogImportBatches.tenantId, auth.tenantId),
        ),
      )
      .limit(1);
    const doc = rows[0];
    if (!doc) {
      return c.json({ error: "not_found" }, 404);
    }
    if (isRetentionExpired(doc.purgeAfterAt)) {
      return c.json({ error: "expired_retention", code: "RETENTION" }, 410);
    }

    const [cnt] = await db
      .select({ n: count() })
      .from(catalogImportLines)
      .where(eq(catalogImportLines.batchId, id));
    const lineTotal = Number(cnt?.n ?? 0);

    const lineRows = await db
      .select()
      .from(catalogImportLines)
      .where(eq(catalogImportLines.batchId, id))
      .orderBy(asc(catalogImportLines.sortIndex))
      .limit(DETAIL_LINE_LIMIT);

    const detail: CatalogImportBatchDetail = {
      ...mapBatchRow(doc),
      lines: lineRows.map((ln) => ({
        id: ln.id,
        sortIndex: ln.sortIndex,
        supplierSku: ln.supplierSku,
        name: ln.name,
        unit: ln.unit,
        price: ln.price,
        currency: ln.currency,
        ean: ln.ean,
        groupKey: ln.groupKey,
      })),
      lineTotal,
      linesTruncated: lineTotal > DETAIL_LINE_LIMIT,
    };
    return c.json(detail);
  };
}

export function createCatalogImportPatchHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }
    const id = c.req.param("id");
    if (!id) {
      return c.json({ error: "missing_id" }, 400);
    }
    let json: unknown;
    try {
      json = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    const parsed = catalogPatchImportSchema.safeParse(json);
    if (!parsed.success) {
      return c.json({ error: "invalid_body" }, 400);
    }

    const rows = await db
      .select()
      .from(catalogImportBatches)
      .where(
        and(
          eq(catalogImportBatches.id, id),
          eq(catalogImportBatches.tenantId, auth.tenantId),
        ),
      )
      .limit(1);
    const doc = rows[0];
    if (!doc) {
      return c.json({ error: "not_found" }, 404);
    }
    if (isRetentionExpired(doc.purgeAfterAt)) {
      return c.json({ error: "expired_retention", code: "RETENTION" }, 410);
    }
    if (doc.status === "failed") {
      return c.json({ error: "cannot_approve_failed", code: "FAILED" }, 409);
    }
    if (doc.status === "approved") {
      return c.json({ ok: true });
    }
    if (!doc.supplierId) {
      return c.json({ error: "batch_without_supplier", code: "SUPPLIER" }, 409);
    }

    const lines = await db
      .select()
      .from(catalogImportLines)
      .where(eq(catalogImportLines.batchId, id))
      .orderBy(asc(catalogImportLines.sortIndex));

    if (lines.length === 0) {
      return c.json({ error: "no_lines_to_promote", code: "EMPTY" }, 409);
    }

    await db.transaction(async (tx) => {
      const supplierId = doc.supplierId;
      if (!supplierId) return;

      for (const ln of lines) {
        const existing = await tx
          .select({ id: catalogArticles.id })
          .from(catalogArticles)
          .where(
            and(
              eq(catalogArticles.tenantId, auth.tenantId),
              eq(catalogArticles.supplierId, supplierId),
              eq(catalogArticles.supplierSku, ln.supplierSku),
            ),
          )
          .limit(1);

        let articleId: string;
        if (existing[0]) {
          articleId = existing[0].id;
          await tx
            .update(catalogArticles)
            .set({
              name: ln.name,
              unit: ln.unit,
              ean: ln.ean,
              lastBatchId: id,
              updatedAt: new Date(),
            })
            .where(eq(catalogArticles.id, articleId));
        } else {
          const [ins] = await tx
            .insert(catalogArticles)
            .values({
              tenantId: auth.tenantId,
              supplierId,
              supplierSku: ln.supplierSku,
              name: ln.name,
              unit: ln.unit,
              ean: ln.ean,
              lastBatchId: id,
            })
            .returning({ id: catalogArticles.id });
          if (!ins) {
            throw new Error("catalog_article_insert_failed");
          }
          articleId = ins.id;
        }

        await tx.insert(catalogPrices).values({
          articleId,
          batchId: id,
          price: ln.price,
          currency: ln.currency,
        });
      }

      await tx
        .update(catalogImportBatches)
        .set({
          status: "approved",
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(catalogImportBatches.id, id));
    });

    logCatalog(c, "catalog_batch_approved", {
      tenantId: auth.tenantId,
      batchId: id,
      lineCount: lines.length,
    });

    return c.json({ ok: true });
  };
}

export function createCatalogArticlesListHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth", code: "AUTH" }, 500);
    }
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable", code: "DB" }, 503);
    }

    const supplierIdRaw = c.req.query("supplierId")?.trim();
    const qRaw = c.req.query("q")?.trim();
    const cursorRaw = c.req.query("cursor")?.trim();
    const limitRaw = c.req.query("limit")?.trim();

    let limit = ARTICLES_PAGE_DEFAULT;
    if (limitRaw) {
      const n = Number.parseInt(limitRaw, 10);
      if (Number.isFinite(n)) {
        limit = Math.min(ARTICLES_PAGE_MAX, Math.max(1, n));
      }
    }

    const conditions = [eq(catalogArticles.tenantId, auth.tenantId)];

    if (supplierIdRaw) {
      const sid = z.string().uuid().safeParse(supplierIdRaw);
      if (!sid.success) {
        return c.json({ error: "invalid_supplier_id", code: "VALIDATION" }, 400);
      }
      conditions.push(eq(catalogArticles.supplierId, sid.data));
    }

    if (cursorRaw) {
      const cur = z.string().uuid().safeParse(cursorRaw);
      if (!cur.success) {
        return c.json({ error: "invalid_cursor", code: "VALIDATION" }, 400);
      }
      conditions.push(gt(catalogArticles.id, cur.data));
    }

    if (qRaw) {
      const pattern = `%${qRaw}%`;
      conditions.push(
        or(
          ilike(catalogArticles.supplierSku, pattern),
          sql`coalesce(${catalogArticles.name}, '') ilike ${pattern}`,
        )!,
      );
    }

    const whereExpr = and(...conditions)!;

    const rows = await db
      .select({
        article: catalogArticles,
        supplierName: catalogSuppliers.name,
      })
      .from(catalogArticles)
      .innerJoin(
        catalogSuppliers,
        eq(catalogArticles.supplierId, catalogSuppliers.id),
      )
      .where(whereExpr)
      .orderBy(asc(catalogArticles.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const ids = pageRows.map((r) => r.article.id);

    const priceMap = new Map<string, { price: string; currency: string }>();
    if (ids.length > 0) {
      const priceRows = await db
        .select()
        .from(catalogPrices)
        .where(inArray(catalogPrices.articleId, ids))
        .orderBy(desc(catalogPrices.createdAt));
      for (const pr of priceRows) {
        if (!priceMap.has(pr.articleId)) {
          priceMap.set(pr.articleId, {
            price: pr.price,
            currency: pr.currency,
          });
        }
      }
    }

    const articles = pageRows.map(({ article, supplierName }) => {
      const p = priceMap.get(article.id);
      return {
        id: article.id,
        supplierId: article.supplierId,
        supplierName,
        supplierSku: article.supplierSku,
        name: article.name ?? null,
        unit: article.unit ?? null,
        ean: article.ean ?? null,
        price: p?.price ?? null,
        currency: p?.currency ?? "EUR",
        updatedAt: article.updatedAt.toISOString(),
      };
    });

    const last = articles[articles.length - 1];
    const nextCursor = hasMore && last ? last.id : null;

    return c.json({ articles, nextCursor });
  };
}
