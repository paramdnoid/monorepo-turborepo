import type { DesktopAuthState, DesktopAuthUser } from "@repo/electron";
import { IPC_CHANNELS } from "@repo/electron";
import { app, ipcMain } from "electron";

import { decodeJwtPayload } from "./jwt-decode.js";
import { getOidcConfig } from "./oidc-config.js";
import {
  refreshAccessToken,
  runAuthorizationCodeFlow,
  type TokenBundle,
} from "./oauth-login.js";
import {
  clearPersistedAuth,
  getRefreshTokenFromPersisted,
  loadPersistedAuth,
  mapUserFromAccessToken,
  savePersistedAuth,
} from "./token-store.js";

type MemoryAuth = {
  accessToken: string;
  refreshToken: string | null;
  accessExpiresAt: number;
};

let memory: MemoryAuth | null = null;
let diskLoaded = false;

function accessExpiresAtFromBundle(
  accessToken: string,
  bundle: TokenBundle,
): number {
  const jwt = decodeJwtPayload(accessToken);
  if (jwt?.exp != null) {
    return jwt.exp * 1000;
  }
  if (bundle.expires_in != null) {
    return Date.now() + bundle.expires_in * 1000;
  }
  return Date.now() + 300_000;
}

async function ensureDiskLoaded(): Promise<void> {
  if (diskLoaded) return;
  diskLoaded = true;
  const persisted = await loadPersistedAuth(app.getPath("userData"));
  if (!persisted) {
    return;
  }
  memory = {
    accessToken: persisted.accessToken,
    refreshToken: getRefreshTokenFromPersisted(persisted),
    accessExpiresAt: persisted.accessExpiresAt,
  };
}

async function persistCurrent(): Promise<void> {
  if (!memory) {
    await clearPersistedAuth(app.getPath("userData"));
    return;
  }
  await savePersistedAuth(app.getPath("userData"), {
    accessToken: memory.accessToken,
    accessExpiresAt: memory.accessExpiresAt,
    refreshToken: memory.refreshToken,
  });
}

async function refreshIfNeeded(): Promise<void> {
  await ensureDiskLoaded();
  if (!memory) return;
  const config = getOidcConfig();
  if (!config) return;
  const skew = 30_000;
  if (Date.now() < memory.accessExpiresAt - skew) {
    return;
  }
  if (!memory.refreshToken) {
    memory = null;
    await persistCurrent();
    return;
  }
  try {
    const bundle = await refreshAccessToken(config, memory.refreshToken);
    const at = bundle.access_token;
    memory = {
      accessToken: at,
      refreshToken: bundle.refresh_token ?? memory.refreshToken,
      accessExpiresAt: accessExpiresAtFromBundle(at, bundle),
    };
    await persistCurrent();
  } catch {
    memory = null;
    await persistCurrent();
  }
}

export async function getAuthState(): Promise<DesktopAuthState> {
  await refreshIfNeeded();
  if (!memory?.accessToken) {
    return { status: "signed_out" };
  }
  const user = mapUserFromAccessToken(memory.accessToken);
  const du: DesktopAuthUser = {
    sub: user.sub,
    name: user.name,
    email: user.email,
  };
  return {
    status: "signed_in",
    user: du,
    accessTokenExpiresAt: memory.accessExpiresAt,
  };
}

export async function login(): Promise<DesktopAuthState> {
  const config = getOidcConfig();
  if (!config) {
    throw new Error(
      "OIDC nicht konfiguriert: DESKTOP_OIDC_ISSUER oder DESKTOP_AUTH_KEYCLOAK_BASE_URL setzen.",
    );
  }
  const bundle = await runAuthorizationCodeFlow(config);
  const at = bundle.access_token;
  memory = {
    accessToken: at,
    refreshToken: bundle.refresh_token ?? null,
    accessExpiresAt: accessExpiresAtFromBundle(at, bundle),
  };
  await persistCurrent();
  return getAuthState();
}

export async function logout(): Promise<void> {
  memory = null;
  await clearPersistedAuth(app.getPath("userData"));
}

export async function getAccessToken(): Promise<string | null> {
  await refreshIfNeeded();
  return memory?.accessToken ?? null;
}

export function registerAuthIpc(): void {
  ipcMain.handle(IPC_CHANNELS.authGetState, () => getAuthState());
  ipcMain.handle(IPC_CHANNELS.authLogin, () => login());
  ipcMain.handle(IPC_CHANNELS.authLogout, () => logout());
  ipcMain.handle(IPC_CHANNELS.authGetAccessToken, () => getAccessToken());
}
