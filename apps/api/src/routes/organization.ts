import { Readable } from "node:stream";

import { organizationPatchRequestSchema } from "@repo/api-contracts";
import { eq } from "drizzle-orm";
import type { Context, Handler } from "hono";

import { organizations, type Db } from "@repo/db";

import { resolveProjectAssetsRoot } from "../env.js";
import {
  createAssetReadStream,
  removeAssetFile,
  writeAssetFile,
} from "../project-assets-storage.js";

type OrganizationRow = typeof organizations.$inferSelect;

const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const LOGO_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function safePathSegment(s: string): string {
  const cleaned = s.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
  return cleaned.length > 0 ? cleaned : "x";
}

function extForLogoContentType(ct: string): string {
  if (ct === "image/jpeg") return ".jpg";
  if (ct === "image/png") return ".png";
  if (ct === "image/webp") return ".webp";
  return "";
}

export function mapOrgToMeOrganization(org: OrganizationRow) {
  return {
    id: org.id,
    name: org.name,
    tradeSlug: org.tradeSlug,
    senderAddress: org.senderAddress ?? null,
    vatId: org.vatId ?? null,
    taxNumber: org.taxNumber ?? null,
    hasLogo: Boolean(org.logoStorageRelativePath),
  };
}

export function createOrganizationPatchHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    const orgCtx = c.get("organization");
    if (!orgCtx) {
      return c.json({ error: "missing_organization" }, 500);
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
    const parsed = organizationPatchRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "validation_error" }, 400);
    }
    const patch = parsed.data;

    const root = resolveProjectAssetsRoot();
    const updates: Partial<{
      name: string;
      senderAddress: string | null;
      vatId: string | null;
      taxNumber: string | null;
      logoStorageRelativePath: string | null;
      logoContentType: string | null;
    }> = {};

    if (patch.name !== undefined) updates.name = patch.name;
    if (patch.senderAddress !== undefined) {
      updates.senderAddress = patch.senderAddress;
    }
    if (patch.vatId !== undefined) updates.vatId = patch.vatId;
    if (patch.taxNumber !== undefined) updates.taxNumber = patch.taxNumber;

    if (patch.clearLogo === true) {
      if (orgCtx.logoStorageRelativePath && root) {
        try {
          await removeAssetFile(root, orgCtx.logoStorageRelativePath);
        } catch {
          /* ignore */
        }
      }
      updates.logoStorageRelativePath = null;
      updates.logoContentType = null;
    }

    if (Object.keys(updates).length === 0) {
      return c.json({ organization: mapOrgToMeOrganization(orgCtx) });
    }

    const [updated] = await db
      .update(organizations)
      .set(updates)
      .where(eq(organizations.tenantId, auth.tenantId))
      .returning();

    if (!updated) {
      return c.json({ error: "update_failed" }, 500);
    }

    c.set("organization", updated);
    return c.json({ organization: mapOrgToMeOrganization(updated) });
  };
}

export function createOrganizationLogoPostHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    const orgCtx = c.get("organization");
    if (!orgCtx) {
      return c.json({ error: "missing_organization" }, 500);
    }
    const db = getDb();
    if (!db) {
      return c.json({ error: "database_unavailable" }, 503);
    }
    const root = resolveProjectAssetsRoot();
    if (!root) {
      return c.json(
        {
          error: "project_assets_storage_unconfigured",
          code: "STORAGE",
        },
        503,
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await c.req.parseBody({ all: false });
    } catch {
      return c.json({ error: "invalid_multipart" }, 400);
    }

    const file = body["file"];
    if (!(file instanceof File)) {
      return c.json({ error: "missing_file" }, 400);
    }

    if (file.size > LOGO_MAX_BYTES) {
      return c.json({ error: "file_too_large", maxBytes: LOGO_MAX_BYTES }, 413);
    }

    const contentType = (file.type || "application/octet-stream").toLowerCase();
    if (!LOGO_CONTENT_TYPES.has(contentType)) {
      return c.json(
        { error: "unsupported_media_type", allowed: [...LOGO_CONTENT_TYPES] },
        415,
      );
    }

    const ext = extForLogoContentType(contentType);
    if (!ext) {
      return c.json({ error: "unsupported_media_type" }, 415);
    }

    const storageRelativePath = [
      safePathSegment(auth.tenantId),
      "org",
      `letterhead-logo${ext}`,
    ].join("/");

    const buffer = Buffer.from(await file.arrayBuffer());

    if (
      orgCtx.logoStorageRelativePath &&
      orgCtx.logoStorageRelativePath !== storageRelativePath
    ) {
      try {
        await removeAssetFile(root, orgCtx.logoStorageRelativePath);
      } catch {
        /* ignore */
      }
    }

    try {
      await writeAssetFile(root, storageRelativePath, buffer);
    } catch {
      return c.json({ error: "storage_write_failed" }, 500);
    }

    const [updated] = await db
      .update(organizations)
      .set({
        logoStorageRelativePath: storageRelativePath,
        logoContentType: contentType,
      })
      .where(eq(organizations.tenantId, auth.tenantId))
      .returning();

    if (!updated) {
      try {
        await removeAssetFile(root, storageRelativePath);
      } catch {
        /* ignore */
      }
      return c.json({ error: "update_failed" }, 500);
    }

    c.set("organization", updated);
    return c.json({ organization: mapOrgToMeOrganization(updated) }, 201);
  };
}

export function createOrganizationLogoGetHandler(): Handler {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) {
      return c.json({ error: "missing_auth" }, 500);
    }
    const org = c.get("organization");
    if (!org) {
      return c.json({ error: "missing_organization" }, 500);
    }
    if (!org.logoStorageRelativePath || !org.logoContentType) {
      return c.body(null, 404);
    }
    const root = resolveProjectAssetsRoot();
    if (!root) {
      return c.json({ error: "project_assets_storage_unconfigured" }, 503);
    }
    try {
      const stream = createAssetReadStream(root, org.logoStorageRelativePath);
      const web = Readable.toWeb(stream) as ReadableStream;
      return new Response(web, {
        headers: {
          "Content-Type": org.logoContentType,
          "Cache-Control": "private, no-store",
        },
      });
    } catch {
      return c.json({ error: "storage_read_failed" }, 500);
    }
  };
}
