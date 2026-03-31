import "server-only";

import { authPeerSessions } from "@repo/db";
import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";

import { decodeAccessTokenPayload } from "./decode-access-token";

export async function recordWebLoginForUserSub(userSub: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  const now = new Date();
  await db
    .insert(authPeerSessions)
    .values({ userSub, lastWebLoginAt: now })
    .onConflictDoUpdate({
      target: authPeerSessions.userSub,
      set: { lastWebLoginAt: now },
    });
}

export async function recordAppLoginForUserSub(userSub: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  const now = new Date();
  await db
    .insert(authPeerSessions)
    .values({ userSub, lastAppLoginAt: now })
    .onConflictDoUpdate({
      target: authPeerSessions.userSub,
      set: { lastAppLoginAt: now },
    });
}

async function getPeerRow(userSub: string) {
  const db = getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(authPeerSessions)
    .where(eq(authPeerSessions.userSub, userSub))
    .limit(1);
  return rows[0];
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
