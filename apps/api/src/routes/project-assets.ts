import { createHash, randomUUID } from "node:crypto";
import { Readable } from "node:stream";

import {
  type ProjectAssetKind,
  type ProjectAssetSummary,
  projectAssetKindSchema,
} from "@repo/api-contracts";
import { and, desc, eq } from "drizzle-orm";
import type { Context, Handler } from "hono";

import { projectAssets, projects, type Db } from "@repo/db";

import { loadEnv, resolveProjectAssetsRoot } from "../env.js";
import {
  createAssetReadStream,
  removeAssetFile,
  writeAssetFile,
} from "../project-assets-storage.js";

const LIST_LIMIT = 200;
const DEFAULT_MAX_MB = 25;

const ALLOWED_CONTENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const ASSET_RATE_WINDOW_MS = 60_000;
const ASSET_RATE_MAX = 60;
const uploadTimestampsByTenant = new Map<string, number[]>();

function assetUploadRateAllowed(tenantId: string): boolean {
  const now = Date.now();
  const list = uploadTimestampsByTenant.get(tenantId) ?? [];
  const recent = list.filter((t) => now - t < ASSET_RATE_WINDOW_MS);
  if (recent.length >= ASSET_RATE_MAX) {
    return false;
  }
  recent.push(now);
  uploadTimestampsByTenant.set(tenantId, recent);
  return true;
}

function maxUploadBytes(): number {
  const env = loadEnv();
  const raw = env.PROJECT_ASSETS_MAX_MB?.trim();
  const mb = raw ? Number.parseInt(raw, 10) : DEFAULT_MAX_MB;
  if (!Number.isFinite(mb) || mb < 1 || mb > 512) {
    return DEFAULT_MAX_MB * 1024 * 1024;
  }
  return mb * 1024 * 1024;
}

function sanitizeDisplayFilename(name: string): string {
  const base = name.replace(/\\/g, "/").split("/").pop() ?? "upload";
  const trimmed = base.trim().slice(0, 255);
  return trimmed.length > 0 ? trimmed : "upload";
}

function mapRow(r: typeof projectAssets.$inferSelect): ProjectAssetSummary {
  return {
    id: r.id,
    projectId: r.projectId,
    kind: r.kind as ProjectAssetKind,
    filename: r.filename,
    contentType: r.contentType,
    byteSize: r.byteSize,
    sha256: r.sha256 ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

async function ensureProjectForTenant(
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

function safePathSegment(s: string): string {
  const cleaned = s.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
  return cleaned.length > 0 ? cleaned : "x";
}

function storageRelativePathFor(
  tenantId: string,
  projectId: string,
  assetId: string,
): string {
  return [
    safePathSegment(tenantId),
    safePathSegment(projectId),
    safePathSegment(assetId),
  ].join("/");
}

function logAssets(
  c: Context,
  msg: string,
  extra: Record<string, unknown> = {},
): void {
  console.log(
    JSON.stringify({
      level: "info",
      service: "zunftgewerk-api",
      module: "project_assets",
      requestId: c.get("requestId"),
      msg,
      ...extra,
    }),
  );
}

export function createProjectAssetsListHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth", code: "AUTH" }, 500);
    }
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable", code: "DB" }, 503);
    }
    const projectId = c.req.param("projectId");
    if (!projectId) {
      return c.json({ error: "missing_project_id", code: "INPUT" }, 400);
    }
    const ok = await ensureProjectForTenant(db, auth.tenantId, projectId);
    if (!ok) {
      return c.json({ error: "project_not_found", code: "PROJECT" }, 404);
    }
    const rows = await db
      .select()
      .from(projectAssets)
      .where(
        and(
          eq(projectAssets.tenantId, auth.tenantId),
          eq(projectAssets.projectId, projectId),
        ),
      )
      .orderBy(desc(projectAssets.createdAt))
      .limit(LIST_LIMIT);
    return c.json({ assets: rows.map(mapRow) });
  };
}

export function createProjectAssetPostHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth", code: "AUTH" }, 500);
    }
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable", code: "DB" }, 503);
    }
    const root = resolveProjectAssetsRoot();
    if (!root) {
      return c.json(
        {
          error: "project_assets_storage_unconfigured",
          code: "STORAGE",
          hint: "Set PROJECT_ASSETS_DIR (production) or run in development for default .local/project-assets",
        },
        503,
      );
    }

    const projectId = c.req.param("projectId");
    if (!projectId) {
      return c.json({ error: "missing_project_id", code: "INPUT" }, 400);
    }
    const okProject = await ensureProjectForTenant(
      db,
      auth.tenantId,
      projectId,
    );
    if (!okProject) {
      return c.json({ error: "project_not_found", code: "PROJECT" }, 404);
    }

    if (!assetUploadRateAllowed(auth.tenantId)) {
      logAssets(c, "project_asset_upload_rate_limited", {
        tenantId: auth.tenantId,
      });
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

    const kindRaw = body["kind"];
    const kindParsed = projectAssetKindSchema.safeParse(
      typeof kindRaw === "string" ? kindRaw : "document",
    );
    if (!kindParsed.success) {
      return c.json({ error: "invalid_kind", code: "INPUT" }, 400);
    }
    const kind = kindParsed.data;

    const maxBytes = maxUploadBytes();
    if (file.size > maxBytes) {
      return c.json(
        {
          error: "file_too_large",
          code: "SIZE",
          maxBytes,
        },
        413,
      );
    }

    const contentType = (file.type || "application/octet-stream").toLowerCase();
    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      return c.json(
        {
          error: "unsupported_media_type",
          code: "MIME",
          allowed: [...ALLOWED_CONTENT_TYPES],
        },
        415,
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const sha256 = createHash("sha256").update(buffer).digest("hex");
    const assetId = randomUUID();
    const storageRelativePath = storageRelativePathFor(
      auth.tenantId,
      projectId,
      assetId,
    );

    try {
      await writeAssetFile(root, storageRelativePath, buffer);
    } catch (e) {
      logAssets(c, "project_asset_write_failed", {
        tenantId: auth.tenantId,
        err: e instanceof Error ? e.message : String(e),
      });
      return c.json({ error: "storage_write_failed", code: "STORAGE" }, 500);
    }

    const displayName = sanitizeDisplayFilename(file.name);

    const [row] = await db
      .insert(projectAssets)
      .values({
        id: assetId,
        tenantId: auth.tenantId,
        projectId,
        kind,
        filename: displayName,
        contentType,
        byteSize: buffer.length,
        storageRelativePath,
        sha256,
      })
      .returning();

    if (!row) {
      try {
        await removeAssetFile(root, storageRelativePath);
      } catch {
        /* ignore */
      }
      return c.json({ error: "insert_failed", code: "INSERT" }, 500);
    }

    logAssets(c, "project_asset_stored", {
      tenantId: auth.tenantId,
      projectId,
      assetId: row.id,
      byteSize: row.byteSize,
    });

    return c.json(
      {
        id: row.id,
        kind: row.kind as ProjectAssetKind,
        filename: row.filename,
        byteSize: row.byteSize,
        contentType: row.contentType,
        createdAt: row.createdAt.toISOString(),
      },
      201,
    );
  };
}

export function createProjectAssetDownloadHandler(
  getDb: () => Db | undefined,
): Handler {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth", code: "AUTH" }, 500);
    }
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable", code: "DB" }, 503);
    }
    const root = resolveProjectAssetsRoot();
    if (!root) {
      return c.json({ error: "project_assets_storage_unconfigured", code: "STORAGE" }, 503);
    }

    const projectId = c.req.param("projectId");
    const assetId = c.req.param("assetId");
    if (!projectId || !assetId) {
      return c.json({ error: "missing_param", code: "INPUT" }, 400);
    }

    const okProject = await ensureProjectForTenant(
      db,
      auth.tenantId,
      projectId,
    );
    if (!okProject) {
      return c.json({ error: "project_not_found", code: "PROJECT" }, 404);
    }

    const rows = await db
      .select()
      .from(projectAssets)
      .where(
        and(
          eq(projectAssets.id, assetId),
          eq(projectAssets.tenantId, auth.tenantId),
          eq(projectAssets.projectId, projectId),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) {
      return c.json({ error: "not_found", code: "NOT_FOUND" }, 404);
    }

    try {
      const stream = createAssetReadStream(root, row.storageRelativePath);
      const web = Readable.toWeb(stream) as ReadableStream;
      const encoded = encodeURIComponent(row.filename);
      return new Response(web, {
        headers: {
          "Content-Type": row.contentType,
          "Content-Length": String(row.byteSize),
          "Content-Disposition": `attachment; filename*=UTF-8''${encoded}`,
        },
      });
    } catch (e) {
      logAssets(c, "project_asset_read_failed", {
        assetId,
        err: e instanceof Error ? e.message : String(e),
      });
      return c.json({ error: "storage_read_failed", code: "STORAGE" }, 500);
    }
  };
}

export function createProjectAssetDeleteHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth", code: "AUTH" }, 500);
    }
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable", code: "DB" }, 503);
    }
    const root = resolveProjectAssetsRoot();
    if (!root) {
      return c.json({ error: "project_assets_storage_unconfigured", code: "STORAGE" }, 503);
    }

    const projectId = c.req.param("projectId");
    const assetId = c.req.param("assetId");
    if (!projectId || !assetId) {
      return c.json({ error: "missing_param", code: "INPUT" }, 400);
    }

    const okProject = await ensureProjectForTenant(
      db,
      auth.tenantId,
      projectId,
    );
    if (!okProject) {
      return c.json({ error: "project_not_found", code: "PROJECT" }, 404);
    }

    const rows = await db
      .select()
      .from(projectAssets)
      .where(
        and(
          eq(projectAssets.id, assetId),
          eq(projectAssets.tenantId, auth.tenantId),
          eq(projectAssets.projectId, projectId),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) {
      return c.json({ error: "not_found", code: "NOT_FOUND" }, 404);
    }

    const relPath = row.storageRelativePath;
    await db
      .delete(projectAssets)
      .where(
        and(
          eq(projectAssets.id, assetId),
          eq(projectAssets.tenantId, auth.tenantId),
        ),
      );

    try {
      await removeAssetFile(root, relPath);
    } catch (e) {
      logAssets(c, "project_asset_delete_file_failed", {
        assetId,
        err: e instanceof Error ? e.message : String(e),
      });
    }

    return c.body(null, 204);
  };
}
