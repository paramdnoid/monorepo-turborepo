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
import { parseMultilineAddress } from "../sales-e-invoice.js";

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

function composeSenderAddress(data: {
  senderStreet: string | null;
  senderHouseNumber: string | null;
  senderPostalCode: string | null;
  senderCity: string | null;
  senderCountry: string | null;
}): string | null {
  const street = (data.senderStreet ?? "").trim();
  const houseNumber = (data.senderHouseNumber ?? "").trim();
  const postalCode = (data.senderPostalCode ?? "").trim();
  const city = (data.senderCity ?? "").trim();
  const country = (data.senderCountry ?? "").trim();

  if (!street || !postalCode || !city) return null;

  const line1 = [street, houseNumber].filter(Boolean).join(" ").trim();
  const line2 = `${postalCode} ${city}`.trim();
  const lines = [line1, line2];
  if (country) lines.push(country);
  return lines.filter(Boolean).join("\n");
}

export function mapOrgToMeOrganization(org: OrganizationRow) {
  const senderStreet = org.senderStreet ?? null;
  const senderHouseNumber = org.senderHouseNumber ?? null;
  const senderPostalCode = org.senderPostalCode ?? null;
  const senderCity = org.senderCity ?? null;
  const senderCountry = org.senderCountry ?? null;
  const senderLatitude = org.senderLatitude ?? null;
  const senderLongitude = org.senderLongitude ?? null;

  const hasStructured =
    Boolean(senderStreet) ||
    Boolean(senderHouseNumber) ||
    Boolean(senderPostalCode) ||
    Boolean(senderCity) ||
    Boolean(senderCountry);

  const fallbackStructured = !hasStructured && org.senderAddress
    ? parseMultilineAddress(org.senderAddress)
    : null;

  const effectiveSenderStreet = senderStreet ?? fallbackStructured?.street ?? null;
  const effectiveSenderPostalCode =
    senderPostalCode ?? fallbackStructured?.postalCode ?? null;
  const effectiveSenderCity = senderCity ?? fallbackStructured?.city ?? null;
  const effectiveSenderCountry =
    senderCountry ?? fallbackStructured?.country ?? null;

  const derivedSenderAddress =
    org.senderAddress ??
    composeSenderAddress({
      senderStreet: effectiveSenderStreet,
      senderHouseNumber,
      senderPostalCode: effectiveSenderPostalCode,
      senderCity: effectiveSenderCity,
      senderCountry: effectiveSenderCountry,
    });

  return {
    id: org.id,
    name: org.name,
    tradeSlug: org.tradeSlug,
    senderAddress: derivedSenderAddress ?? null,
    senderStreet: effectiveSenderStreet,
    senderHouseNumber,
    senderPostalCode: effectiveSenderPostalCode,
    senderCity: effectiveSenderCity,
    senderCountry: effectiveSenderCountry,
    senderLatitude,
    senderLongitude,
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
      senderStreet: string | null;
      senderHouseNumber: string | null;
      senderPostalCode: string | null;
      senderCity: string | null;
      senderCountry: string | null;
      senderLatitude: number | null;
      senderLongitude: number | null;
      vatId: string | null;
      taxNumber: string | null;
      logoStorageRelativePath: string | null;
      logoContentType: string | null;
    }> = {};

    if (patch.name !== undefined) updates.name = patch.name;
    let nextSenderStreet = orgCtx.senderStreet ?? null;
    let nextSenderHouseNumber = orgCtx.senderHouseNumber ?? null;
    let nextSenderPostalCode = orgCtx.senderPostalCode ?? null;
    let nextSenderCity = orgCtx.senderCity ?? null;
    let nextSenderCountry = orgCtx.senderCountry ?? null;

    const patchTouchesStructuredAddressFields =
      patch.senderStreet !== undefined ||
      patch.senderHouseNumber !== undefined ||
      patch.senderPostalCode !== undefined ||
      patch.senderCity !== undefined ||
      patch.senderCountry !== undefined;

    const structuredAddressInUse =
      Boolean(nextSenderStreet) ||
      Boolean(nextSenderHouseNumber) ||
      Boolean(nextSenderPostalCode) ||
      Boolean(nextSenderCity) ||
      Boolean(nextSenderCountry);

    if (patch.senderStreet !== undefined) {
      nextSenderStreet = patch.senderStreet;
      updates.senderStreet = patch.senderStreet;
    }
    if (patch.senderHouseNumber !== undefined) {
      nextSenderHouseNumber = patch.senderHouseNumber;
      updates.senderHouseNumber = patch.senderHouseNumber;
    }
    if (patch.senderPostalCode !== undefined) {
      nextSenderPostalCode = patch.senderPostalCode;
      updates.senderPostalCode = patch.senderPostalCode;
    }
    if (patch.senderCity !== undefined) {
      nextSenderCity = patch.senderCity;
      updates.senderCity = patch.senderCity;
    }
    if (patch.senderCountry !== undefined) {
      nextSenderCountry = patch.senderCountry;
      updates.senderCountry = patch.senderCountry;
    }
    if (patch.senderLatitude !== undefined) {
      updates.senderLatitude = patch.senderLatitude;
    }
    if (patch.senderLongitude !== undefined) {
      updates.senderLongitude = patch.senderLongitude;
    }

    const legacyOnlyPatch =
      patch.senderAddress !== undefined &&
      !patchTouchesStructuredAddressFields &&
      patch.senderLatitude === undefined &&
      patch.senderLongitude === undefined &&
      !structuredAddressInUse;

    if (legacyOnlyPatch) {
      const legacySenderAddress = patch.senderAddress;
      if (legacySenderAddress === undefined) {
        updates.senderAddress = null;
      } else if (legacySenderAddress === null) {
        updates.senderAddress = null;
        updates.senderStreet = null;
        updates.senderHouseNumber = null;
        updates.senderPostalCode = null;
        updates.senderCity = null;
        updates.senderCountry = null;
        updates.senderLatitude = null;
        updates.senderLongitude = null;
      } else {
        updates.senderAddress = legacySenderAddress;
        const parsedLegacy = parseMultilineAddress(legacySenderAddress);
        if (parsedLegacy) {
          updates.senderStreet = parsedLegacy.street;
          updates.senderHouseNumber = null;
          updates.senderPostalCode = parsedLegacy.postalCode;
          updates.senderCity = parsedLegacy.city;
          updates.senderCountry = parsedLegacy.country;
        }
      }
    } else if (patchTouchesStructuredAddressFields || structuredAddressInUse) {
      const composed = composeSenderAddress({
        senderStreet: nextSenderStreet,
        senderHouseNumber: nextSenderHouseNumber,
        senderPostalCode: nextSenderPostalCode,
        senderCity: nextSenderCity,
        senderCountry: nextSenderCountry,
      });
      if (composed !== null || patchTouchesStructuredAddressFields) {
        updates.senderAddress = composed;
      }
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
