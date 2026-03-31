import "server-only";

import { nativeLoginOtc } from "@repo/db";
import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";

export type NativeLoginOtcPayload = {
  codeChallenge: string;
  redirectUri: string;
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
};

const memoryStore = new Map<
  string,
  { payload: NativeLoginOtcPayload; expiresAtMs: number }
>();

const OTC_TTL_MS = 5 * 60_000;

function pruneMemory() {
  const now = Date.now();
  for (const [k, v] of memoryStore) {
    if (v.expiresAtMs <= now) {
      memoryStore.delete(k);
    }
  }
}

export async function saveNativeLoginOtc(
  code: string,
  payload: NativeLoginOtcPayload,
): Promise<void> {
  const expiresAt = new Date(Date.now() + OTC_TTL_MS);
  const db = getDb();
  if (db) {
    await db.insert(nativeLoginOtc).values({
      code,
      payload,
      expiresAt,
    });
    return;
  }
  pruneMemory();
  memoryStore.set(code, {
    payload,
    expiresAtMs: expiresAt.getTime(),
  });
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      "[auth] native_login_otc: DATABASE_URL fehlt — OTC nur im Speicher (nicht fuer mehrere Instanzen).",
    );
  }
}

export async function takeNativeLoginOtc(
  code: string,
): Promise<NativeLoginOtcPayload | null> {
  const db = getDb();
  if (db) {
    const rows = await db
      .select()
      .from(nativeLoginOtc)
      .where(eq(nativeLoginOtc.code, code))
      .limit(1);
    const row = rows[0];
    if (!row) {
      return null;
    }
    await db.delete(nativeLoginOtc).where(eq(nativeLoginOtc.code, code));
    if (row.expiresAt.getTime() <= Date.now()) {
      return null;
    }
    return row.payload;
  }

  pruneMemory();
  const entry = memoryStore.get(code);
  memoryStore.delete(code);
  if (!entry || entry.expiresAtMs <= Date.now()) {
    return null;
  }
  return entry.payload;
}
