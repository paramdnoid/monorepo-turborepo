import "server-only";

import { authPeerSessions, eq } from "@repo/db";

import { getDb } from "@/lib/db";

import { decodeAccessTokenPayload } from "./decode-access-token";

/** Postgres: undefined_table — Migration noch nicht angewendet. */
const PG_UNDEFINED_TABLE = "42P01";

function pgErrorCode(err: unknown): string | undefined {
  let cur: unknown = err;
  for (let i = 0; i < 6 && cur != null; i++) {
    if (typeof cur === "object" && "code" in cur) {
      const c = (cur as { code?: unknown }).code;
      if (typeof c === "string") return c;
    }
    cur =
      typeof cur === "object" && cur !== null && "cause" in cur
        ? (cur as { cause: unknown }).cause
        : undefined;
  }
  return undefined;
}

let warnedMissingAuthPeerSessionsTable = false;

function warnMissingPeerSessionsTableOnce(): void {
  if (warnedMissingAuthPeerSessionsTable) return;
  warnedMissingAuthPeerSessionsTable = true;
  console.warn(
    '[web/db] Tabelle "auth_peer_sessions" fehlt — Migration anwenden: pnpm --filter @repo/db exec drizzle-kit migrate (DATABASE_URL wie in Repo-Root .env.local)',
  );
}

export async function recordWebLoginForUserSub(userSub: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  const now = new Date();
  try {
    await db
      .insert(authPeerSessions)
      .values({ userSub, lastWebLoginAt: now })
      .onConflictDoUpdate({
        target: authPeerSessions.userSub,
        set: { lastWebLoginAt: now },
      });
  } catch (err) {
    if (pgErrorCode(err) === PG_UNDEFINED_TABLE) {
      warnMissingPeerSessionsTableOnce();
      return;
    }
    throw err;
  }
}

export async function recordAppLoginForUserSub(userSub: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  const now = new Date();
  try {
    await db
      .insert(authPeerSessions)
      .values({ userSub, lastAppLoginAt: now })
      .onConflictDoUpdate({
        target: authPeerSessions.userSub,
        set: { lastAppLoginAt: now },
      });
  } catch (err) {
    if (pgErrorCode(err) === PG_UNDEFINED_TABLE) {
      warnMissingPeerSessionsTableOnce();
      return;
    }
    throw err;
  }
}

async function getPeerRow(userSub: string) {
  const db = getDb();
  if (!db) return undefined;
  try {
    const rows = await db
      .select()
      .from(authPeerSessions)
      .where(eq(authPeerSessions.userSub, userSub))
      .limit(1);
    return rows[0];
  } catch (err) {
    if (pgErrorCode(err) === PG_UNDEFINED_TABLE) {
      warnMissingPeerSessionsTableOnce();
      return undefined;
    }
    throw err;
  }
}

/** App hat sich nach Ausstellung dieses Web-Cookies angemeldet → Web-Cookie ungültig. */
export async function isWebAccessTokenSupersededByAppLogin(
  accessToken: string,
): Promise<boolean> {
  const payload = decodeAccessTokenPayload(accessToken);
  if (!payload?.sub || typeof payload.iat !== "number") {
    return false;
  }
  const row = await getPeerRow(payload.sub);
  if (!row?.lastAppLoginAt) {
    return false;
  }
  return row.lastAppLoginAt.getTime() > payload.iat * 1000;
}

/** Web hat sich nach Ausstellung dieses Desktop-Tokens angemeldet → Desktop-Session beenden. */
export async function isDesktopAccessTokenSupersededByWebLogin(
  accessToken: string,
): Promise<boolean> {
  const payload = decodeAccessTokenPayload(accessToken);
  if (!payload?.sub || typeof payload.iat !== "number") {
    return false;
  }
  const row = await getPeerRow(payload.sub);
  if (!row?.lastWebLoginAt) {
    return false;
  }
  return row.lastWebLoginAt.getTime() > payload.iat * 1000;
}
