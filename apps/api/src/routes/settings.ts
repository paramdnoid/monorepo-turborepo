import { and, eq } from "drizzle-orm";
import type { Context } from "hono";

import {
  colorPreferencesPutSchema,
  colorPreferencesResponseSchema,
  colorRefSchema,
  notificationPreferencesPutSchema,
  notificationPreferencesResponseSchema,
} from "@repo/api-contracts";
import {
  type Db,
  teamColorPalettes,
  userColorPreferences,
  userNotificationPreferences,
} from "@repo/db";

import { canEditTeamPalette } from "../auth/permissions.js";

function rowToPreferencesPayload(
  row: typeof userNotificationPreferences.$inferSelect,
) {
  return {
    productUpdates: Boolean(row.productUpdates),
    securityAlerts: Boolean(row.securityAlerts),
    updatedAt: row.updatedAt.toISOString(),
  };
}

type ColorScope = "user" | "team";

type StoredColorRef = {
  system: "ral" | "ncs";
  id: string;
};

function parseColorScope(raw: string | undefined): ColorScope {
  return raw === "team" ? "team" : "user";
}

function normalizeColorRefs(raw: unknown, max: number): StoredColorRef[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: StoredColorRef[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const parsed = colorRefSchema.safeParse(item);
    if (!parsed.success) {
      continue;
    }
    const key = `${parsed.data.system}:${parsed.data.id}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(parsed.data);
    if (out.length >= max) {
      break;
    }
  }
  return out;
}

async function getOrCreateNotificationPreferences(
  db: Db,
  tenantId: string,
  userSub: string,
): Promise<typeof userNotificationPreferences.$inferSelect> {
  const rows = await db
    .select()
    .from(userNotificationPreferences)
    .where(
      and(
        eq(userNotificationPreferences.tenantId, tenantId),
        eq(userNotificationPreferences.userSub, userSub),
      ),
    )
    .limit(1);
  const existing = rows[0];
  if (existing) return existing;

  const inserted = await db
    .insert(userNotificationPreferences)
    .values({ tenantId, userSub })
    .returning();
  const row = inserted[0];
  if (!row) {
    throw new Error("notification_preferences_insert_failed");
  }
  return row;
}

export function createNotificationPreferencesGetHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) return c.json({ error: "missing_auth" }, 500);
    const userSub = auth.sub?.trim() ?? "";
    if (!userSub) return c.json({ error: "missing_sub" }, 500);

    const db = getDb();
    if (!db) return c.json({ error: "database_unavailable" }, 503);

    try {
      const row = await getOrCreateNotificationPreferences(db, auth.tenantId, userSub);
      const body = notificationPreferencesResponseSchema.parse({
        preferences: rowToPreferencesPayload(row),
      });
      c.header("Cache-Control", "private, no-store");
      return c.json(body);
    } catch {
      return c.json({ error: "load_failed" }, 500);
    }
  };
}

export function createNotificationPreferencesPutHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) return c.json({ error: "missing_auth" }, 500);
    const userSub = auth.sub?.trim() ?? "";
    if (!userSub) return c.json({ error: "missing_sub" }, 500);

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }
    const parsed = notificationPreferencesPutSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "validation_error" }, 400);
    }

    const db = getDb();
    if (!db) return c.json({ error: "database_unavailable" }, 503);

    const now = new Date();
    const [upserted] = await db
      .insert(userNotificationPreferences)
      .values({
        tenantId: auth.tenantId,
        userSub,
        productUpdates: parsed.data.productUpdates,
        securityAlerts: parsed.data.securityAlerts,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          userNotificationPreferences.tenantId,
          userNotificationPreferences.userSub,
        ],
        set: {
          productUpdates: parsed.data.productUpdates,
          securityAlerts: parsed.data.securityAlerts,
          updatedAt: now,
        },
      })
      .returning();

    if (!upserted) return c.json({ error: "update_failed" }, 500);

    const out = notificationPreferencesResponseSchema.safeParse({
      preferences: rowToPreferencesPayload(upserted),
    });
    if (!out.success) return c.json({ error: "serialize_error" }, 500);

    c.header("Cache-Control", "private, no-store");
    return c.json(out.data);
  };
}

async function getOrCreateUserColorPreferences(
  db: Db,
  tenantId: string,
  userSub: string,
): Promise<typeof userColorPreferences.$inferSelect> {
  const rows = await db
    .select()
    .from(userColorPreferences)
    .where(
      and(
        eq(userColorPreferences.tenantId, tenantId),
        eq(userColorPreferences.userSub, userSub),
      ),
    )
    .limit(1);
  const existing = rows[0];
  if (existing) return existing;

  const inserted = await db
    .insert(userColorPreferences)
    .values({ tenantId, userSub, favorites: [], recent: [] })
    .returning();
  const row = inserted[0];
  if (!row) {
    throw new Error("user_color_preferences_insert_failed");
  }
  return row;
}

async function getOrCreateTeamColorPalette(
  db: Db,
  tenantId: string,
): Promise<typeof teamColorPalettes.$inferSelect> {
  const rows = await db
    .select()
    .from(teamColorPalettes)
    .where(eq(teamColorPalettes.tenantId, tenantId))
    .limit(1);
  const existing = rows[0];
  if (existing) return existing;

  const inserted = await db
    .insert(teamColorPalettes)
    .values({ tenantId, favorites: [], recent: [] })
    .returning();
  const row = inserted[0];
  if (!row) {
    throw new Error("team_color_palette_insert_failed");
  }
  return row;
}

export function createColorPreferencesGetHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) return c.json({ error: "missing_auth" }, 500);
    const userSub = auth.sub?.trim() ?? "";
    if (!userSub) return c.json({ error: "missing_sub" }, 500);

    const db = getDb();
    if (!db) return c.json({ error: "database_unavailable" }, 503);

    const scope = parseColorScope(c.req.query("scope")?.trim());
    const canEditTeam = canEditTeamPalette(auth);

    try {
      if (scope === "team") {
        const row = await getOrCreateTeamColorPalette(db, auth.tenantId);
        const out = colorPreferencesResponseSchema.safeParse({
          palette: {
            scope,
            favorites: normalizeColorRefs(row.favorites, 400),
            recent: normalizeColorRefs(row.recent, 40),
            updatedAt: row.updatedAt.toISOString(),
            updatedBySub: row.updatedBySub ?? null,
          },
          permissions: {
            canEditTeamPalette: canEditTeam,
          },
        });
        if (!out.success) return c.json({ error: "serialize_error" }, 500);
        c.header("Cache-Control", "private, no-store");
        return c.json(out.data);
      }

      const row = await getOrCreateUserColorPreferences(db, auth.tenantId, userSub);
      const out = colorPreferencesResponseSchema.safeParse({
        palette: {
          scope,
          favorites: normalizeColorRefs(row.favorites, 400),
          recent: normalizeColorRefs(row.recent, 40),
          updatedAt: row.updatedAt.toISOString(),
          updatedBySub: userSub,
        },
        permissions: {
          canEditTeamPalette: canEditTeam,
        },
      });
      if (!out.success) return c.json({ error: "serialize_error" }, 500);
      c.header("Cache-Control", "private, no-store");
      return c.json(out.data);
    } catch {
      return c.json({ error: "load_failed" }, 500);
    }
  };
}

export function createColorPreferencesPutHandler(getDb: () => Db | undefined) {
  return async (c: Context) => {
    const auth = c.get("auth");
    if (!auth) return c.json({ error: "missing_auth" }, 500);
    const userSub = auth.sub?.trim() ?? "";
    if (!userSub) return c.json({ error: "missing_sub" }, 500);

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "invalid_json" }, 400);
    }

    const parsed = colorPreferencesPutSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "validation_error", issues: parsed.error.issues }, 400);
    }

    const db = getDb();
    if (!db) return c.json({ error: "database_unavailable" }, 503);

    const canEditTeam = canEditTeamPalette(auth);
    if (parsed.data.scope === "team" && !canEditTeam) {
      return c.json({ error: "forbidden" }, 403);
    }

    const now = new Date();
    const favorites = normalizeColorRefs(parsed.data.favorites, 400);
    const recent = normalizeColorRefs(parsed.data.recent, 40);

    if (parsed.data.scope === "team") {
      const [upserted] = await db
        .insert(teamColorPalettes)
        .values({
          tenantId: auth.tenantId,
          favorites,
          recent,
          updatedBySub: userSub,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: teamColorPalettes.tenantId,
          set: { favorites, recent, updatedBySub: userSub, updatedAt: now },
        })
        .returning();
      if (!upserted) return c.json({ error: "update_failed" }, 500);

      const out = colorPreferencesResponseSchema.safeParse({
        palette: {
          scope: "team",
          favorites: normalizeColorRefs(upserted.favorites, 400),
          recent: normalizeColorRefs(upserted.recent, 40),
          updatedAt: upserted.updatedAt.toISOString(),
          updatedBySub: upserted.updatedBySub ?? null,
        },
        permissions: {
          canEditTeamPalette: canEditTeam,
        },
      });
      if (!out.success) return c.json({ error: "serialize_error" }, 500);
      c.header("Cache-Control", "private, no-store");
      return c.json(out.data);
    }

    const [upserted] = await db
      .insert(userColorPreferences)
      .values({
        tenantId: auth.tenantId,
        userSub,
        favorites,
        recent,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [userColorPreferences.tenantId, userColorPreferences.userSub],
        set: { favorites, recent, updatedAt: now },
      })
      .returning();
    if (!upserted) return c.json({ error: "update_failed" }, 500);

    const out = colorPreferencesResponseSchema.safeParse({
      palette: {
        scope: "user",
        favorites: normalizeColorRefs(upserted.favorites, 400),
        recent: normalizeColorRefs(upserted.recent, 40),
        updatedAt: upserted.updatedAt.toISOString(),
        updatedBySub: userSub,
      },
      permissions: {
        canEditTeamPalette: canEditTeam,
      },
    });
    if (!out.success) return c.json({ error: "serialize_error" }, 500);

    c.header("Cache-Control", "private, no-store");
    return c.json(out.data);
  };
}

