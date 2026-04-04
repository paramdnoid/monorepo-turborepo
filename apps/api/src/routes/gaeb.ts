import { createHash } from "node:crypto";

import {
  type GaebLvDocumentDetail,
  type GaebLvDocumentSummary,
  gaebPatchDocumentSchema,
} from "@repo/api-contracts";
import { parseGaebString, serializeDaXml } from "@repo/gaeb";
import { and, asc, desc, eq, gt } from "drizzle-orm";
import type { Context } from "hono";

import { lvDocuments, lvNodes, projects, type Db } from "@repo/db";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const RETENTION_DAYS = 90;
const LIST_LIMIT = 50;
/** Einfaches Fenster pro Mandant (Phase 4 — Schutz vor Upload-Spitzen). */
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

function logGaeb(
  c: Context,
  msg: string,
  extra: Record<string, unknown> = {},
): void {
  console.log(
    JSON.stringify({
      level: "info",
      service: "zunftgewerk-api",
      module: "gaeb",
      requestId: c.get("requestId"),
      msg,
      ...extra,
    }),
  );
}

function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function purgeDate(): Date {
  return new Date(Date.now() + RETENTION_DAYS * 86_400_000);
}

function isRetentionExpired(purgeAfterAt: Date): boolean {
  return Date.now() > purgeAfterAt.getTime();
}

function mapDocRow(r: typeof lvDocuments.$inferSelect): GaebLvDocumentSummary {
  return {
    id: r.id,
    filename: r.filename,
    sourceFormat: r.sourceFormat,
    status: r.status as "pending_review" | "failed" | "approved",
    projectId: r.projectId,
    fileSha256: r.fileSha256,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    approvedAt: r.approvedAt?.toISOString() ?? null,
    purgeAfterAt: r.purgeAfterAt.toISOString(),
    parseErrors: r.parseErrors ?? null,
    warnings: r.warnings ?? null,
  };
}

export function createGaebImportPostHandler(getDb: () => Db | undefined) {
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
      logGaeb(c, "gaeb_upload_rate_limited", { tenantId: auth.tenantId });
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
    const size = file.size;
    if (size > MAX_UPLOAD_BYTES) {
      logGaeb(c, "gaeb_upload_rejected_size", { tenantId: auth.tenantId, size });
      return c.json(
        {
          error: "file_too_large",
          code: "SIZE",
          maxBytes: MAX_UPLOAD_BYTES,
        },
        413,
      );
    }

    const rawText = await file.text();
    const hash = sha256Hex(rawText);
    const parsed = parseGaebString(rawText);
    const hasBlockingErrors = parsed.errors.length > 0;
    const status = hasBlockingErrors ? "failed" : "pending_review";
    const sourceFormat = parsed.format === "da_xml" ? "da_xml" : parsed.format;

    let projectId: string | null = null;
    const projectIdRaw = body["projectId"];
    if (typeof projectIdRaw === "string" && projectIdRaw.trim()) {
      const pr = await db
        .select({ id: projects.id })
        .from(projects)
        .where(
          and(
            eq(projects.id, projectIdRaw),
            eq(projects.tenantId, auth.tenantId),
          ),
        )
        .limit(1);
      if (!pr[0]) {
        return c.json({ error: "project_not_found", code: "PROJECT" }, 404);
      }
      projectId = pr[0].id;
    }

    const outlineSnapshot =
      parsed.nodes
        .map((n) => n.outlineNumber)
        .filter((x): x is string => typeof x === "string" && x.length > 0) ??
      [];

    const [doc] = await db
      .insert(lvDocuments)
      .values({
        tenantId: auth.tenantId,
        projectId,
        filename: file.name || "upload.xml",
        sourceFormat,
        fileSha256: hash,
        status,
        rawText,
        parseErrors: hasBlockingErrors ? parsed.errors : null,
        warnings: parsed.warnings.length ? parsed.warnings : null,
        outlineSnapshot:
          outlineSnapshot.length > 0 ? outlineSnapshot : null,
        purgeAfterAt: purgeDate(),
      })
      .returning({ id: lvDocuments.id });

    if (!doc) {
      return c.json({ error: "insert_failed", code: "INSERT" }, 500);
    }

    if (!hasBlockingErrors && parsed.nodes.length > 0) {
      await db.insert(lvNodes).values(
        parsed.nodes.map((n) => ({
          documentId: doc.id,
          parentId: null,
          sortIndex: n.sortIndex,
          nodeType: n.nodeType,
          outlineNumber: n.outlineNumber,
          shortText: n.shortText,
          longText: n.longText,
          quantity: n.quantity,
          unit: n.unit,
        })),
      );
    }

    logGaeb(c, "gaeb_import_stored", {
      tenantId: auth.tenantId,
      documentId: doc.id,
      status,
      nodeCount: parsed.nodes.length,
    });

    return c.json({ id: doc.id, status }, 201);
  };
}

export function createGaebListHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }
    const projectIdRaw = c.req.query("projectId");
    const conditions = [
      eq(lvDocuments.tenantId, auth.tenantId),
      gt(lvDocuments.purgeAfterAt, new Date()),
    ];

    if (typeof projectIdRaw === "string" && projectIdRaw.trim()) {
      const pid = projectIdRaw.trim();
      const pr = await db
        .select({ id: projects.id })
        .from(projects)
        .where(and(eq(projects.id, pid), eq(projects.tenantId, auth.tenantId)))
        .limit(1);
      if (!pr[0]) {
        return c.json({ documents: [] });
      }
      conditions.push(eq(lvDocuments.projectId, pid));
    }

    const rows = await db
      .select()
      .from(lvDocuments)
      .where(and(...conditions))
      .orderBy(desc(lvDocuments.createdAt))
      .limit(LIST_LIMIT);
    return c.json({ documents: rows.map(mapDocRow) });
  };
}

export function createGaebDetailHandler(getDb: () => Db | undefined) {
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
      .from(lvDocuments)
      .where(
        and(eq(lvDocuments.id, id), eq(lvDocuments.tenantId, auth.tenantId)),
      )
      .limit(1);
    const doc = rows[0];
    if (!doc) {
      return c.json({ error: "not_found" }, 404);
    }
    if (isRetentionExpired(doc.purgeAfterAt)) {
      logGaeb(c, "gaeb_gone_retention", { documentId: id });
      return c.json({ error: "expired_retention", code: "RETENTION" }, 410);
    }
    const nodes = await db
      .select()
      .from(lvNodes)
      .where(eq(lvNodes.documentId, id))
      .orderBy(asc(lvNodes.sortIndex));

    const liveKeys = [
      ...new Set(
        nodes
          .map((n) => n.outlineNumber)
          .filter((x): x is string => Boolean(x?.trim())),
      ),
    ].sort();
    const snap = doc.outlineSnapshot ?? [];
    const snapSet = new Set(snap);
    const liveSet = new Set(liveKeys);
    const diff = {
      missing: snap.filter((k) => !liveSet.has(k)),
      added: liveKeys.filter((k) => !snapSet.has(k)),
    };

    const detail: GaebLvDocumentDetail = {
      ...mapDocRow(doc),
      nodes: nodes.map((n) => ({
        id: n.id,
        parentId: n.parentId,
        sortIndex: n.sortIndex,
        nodeType: n.nodeType as "section" | "item",
        outlineNumber: n.outlineNumber,
        shortText: n.shortText,
        longText: n.longText,
        quantity: n.quantity,
        unit: n.unit,
      })),
      outlineSnapshot: doc.outlineSnapshot ?? null,
      diff,
    };
    return c.json(detail);
  };
}

export function createGaebPatchHandler(getDb: () => Db | undefined) {
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
    const parsed = gaebPatchDocumentSchema.safeParse(json);
    if (!parsed.success) {
      return c.json({ error: "invalid_body" }, 400);
    }

    const rows = await db
      .select()
      .from(lvDocuments)
      .where(
        and(eq(lvDocuments.id, id), eq(lvDocuments.tenantId, auth.tenantId)),
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

    await db
      .update(lvDocuments)
      .set({
        status: "approved",
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(lvDocuments.id, id));

    logGaeb(c, "gaeb_document_approved", {
      tenantId: auth.tenantId,
      documentId: id,
    });

    return c.json({ ok: true });
  };
}

export function createGaebExportGetHandler(getDb: () => Db | undefined) {
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
      .from(lvDocuments)
      .where(
        and(eq(lvDocuments.id, id), eq(lvDocuments.tenantId, auth.tenantId)),
      )
      .limit(1);
    const doc = rows[0];
    if (!doc) {
      return c.json({ error: "not_found" }, 404);
    }
    if (isRetentionExpired(doc.purgeAfterAt)) {
      return c.json({ error: "expired_retention", code: "RETENTION" }, 410);
    }
    if (doc.status !== "approved") {
      return c.json({ error: "not_approved", code: "APPROVAL" }, 409);
    }
    const nodes = await db
      .select()
      .from(lvNodes)
      .where(eq(lvNodes.documentId, id))
      .orderBy(asc(lvNodes.sortIndex));

    const normalized = nodes.map((n) => ({
      sortIndex: n.sortIndex,
      nodeType: n.nodeType as "section" | "item",
      outlineNumber: n.outlineNumber,
      shortText: n.shortText,
      longText: n.longText,
      quantity: n.quantity,
      unit: n.unit,
    }));

    const xml = serializeDaXml(normalized);
    logGaeb(c, "gaeb_export", { tenantId: auth.tenantId, documentId: id });

    const safeName = doc.filename.replace(/[^\w.-]+/g, "_") || "lv.xml";
    c.header("Content-Type", "application/xml; charset=utf-8");
    c.header(
      "Content-Disposition",
      `attachment; filename="export-${safeName}"`,
    );
    return c.body(xml);
  };
}
