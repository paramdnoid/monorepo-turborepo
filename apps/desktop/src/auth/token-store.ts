import { safeStorage } from "electron";
import { promises as fs } from "node:fs";
import path from "node:path";

import type { JwtPayload } from "./jwt-decode.js";
import { decodeJwtPayload } from "./jwt-decode.js";

export type PersistedAuth = {
  v: 1;
  /** Base64 — verschlüsselt mit safeStorage, falls verfügbar */
  refreshEnc: string | null;
  accessToken: string;
  accessExpiresAt: number;
};

function getRefreshTokenPath(userDataPath: string): string {
  return path.join(userDataPath, "oidc-auth.json");
}

function encryptRefresh(refreshToken: string): string | null {
  if (!safeStorage.isEncryptionAvailable()) {
    return Buffer.from(refreshToken, "utf-8").toString("base64");
  }
  return safeStorage.encryptString(refreshToken).toString("base64");
}

function decryptRefresh(stored: string | null): string | null {
  if (!stored) return null;
  const buf = Buffer.from(stored, "base64");
  if (!safeStorage.isEncryptionAvailable()) {
    return buf.toString("utf-8");
  }
  return safeStorage.decryptString(buf);
}

export function getRefreshTokenFromPersisted(
  data: PersistedAuth,
): string | null {
  return decryptRefresh(data.refreshEnc);
}

export async function loadPersistedAuth(
  userDataPath: string,
): Promise<PersistedAuth | null> {
  const file = getRefreshTokenPath(userDataPath);
  try {
    const raw = await fs.readFile(file, "utf-8");
    const parsed = JSON.parse(raw) as PersistedAuth;
    if (parsed.v !== 1 || typeof parsed.accessToken !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function savePersistedAuth(
  userDataPath: string,
  data: {
    accessToken: string;
    accessExpiresAt: number;
    refreshToken?: string | null;
  },
): Promise<void> {
  const file = getRefreshTokenPath(userDataPath);
  const refreshEnc =
    data.refreshToken != null && data.refreshToken !== ""
      ? encryptRefresh(data.refreshToken)
      : null;
  const payload: PersistedAuth = {
    v: 1,
    refreshEnc,
    accessToken: data.accessToken,
    accessExpiresAt: data.accessExpiresAt,
  };
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(payload), { mode: 0o600 });
}

export async function clearPersistedAuth(userDataPath: string): Promise<void> {
  const file = getRefreshTokenPath(userDataPath);
  try {
    await fs.unlink(file);
  } catch {
    /* noop */
  }
}

export function mapUserFromAccessToken(accessToken: string): {
  sub: string;
  name: string | null;
  email: string | null;
} {
  const claims = decodeJwtPayload(accessToken) as JwtPayload | null;
  const sub =
    typeof claims?.sub === "string" && claims.sub.trim()
      ? claims.sub.trim()
      : "unknown";
  const name =
    typeof claims?.name === "string" && claims.name.trim()
      ? claims.name.trim()
      : null;
  const email =
    typeof claims?.email === "string" && claims.email.trim()
      ? claims.email.trim()
      : typeof claims?.preferred_username === "string" &&
          claims.preferred_username.includes("@")
        ? claims.preferred_username.trim()
        : null;
  return { sub, name, email };
}
