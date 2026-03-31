import { BrowserWindow } from "electron";
import { createHash, randomBytes } from "node:crypto";
import http from "node:http";

import type { OidcResolvedConfig } from "./oidc-config.js";

export type TokenBundle = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
};

function base64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/u, "");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;");
}

function normalizeRedirectPath(pathname: string): string {
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

export async function exchangeAuthorizationCode(
  config: OidcResolvedConfig,
  code: string,
  redirectUri: string,
  codeVerifier: string,
): Promise<TokenBundle> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.clientId,
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  });
  const res = await fetch(config.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`token_exchange_failed: ${String(res.status)} ${text}`);
  }
  return res.json() as Promise<TokenBundle>;
}

export async function refreshAccessToken(
  config: OidcResolvedConfig,
  refreshToken: string,
): Promise<TokenBundle> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: config.clientId,
    refresh_token: refreshToken,
  });
  const endpoint = config.refreshTokenEndpoint ?? config.tokenEndpoint;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`token_refresh_failed: ${String(res.status)} ${text}`);
  }
  return res.json() as Promise<TokenBundle>;
}

/**
 * Ports zum Binden: optional DESKTOP_OAUTH_REDIRECT_PORT, dann 47823–47833, zuletzt 0 (OS wählt frei).
 * Keycloak „Valid redirect URIs“ muss `http://127.0.0.1:*` o. ä. erlauben (siehe keycloak-bootstrap).
 */
function candidateListenPorts(): number[] {
  const fromEnv = Number(process.env.DESKTOP_OAUTH_REDIRECT_PORT);
  const list: number[] = [];
  if (Number.isFinite(fromEnv) && fromEnv > 0 && fromEnv < 65536) {
    list.push(fromEnv);
  }
  for (let p = 47823; p <= 47833; p += 1) {
    if (!list.includes(p)) {
      list.push(p);
    }
  }
  if (!list.includes(0)) {
    list.push(0);
  }
  return list;
}

async function listenOAuthServer(
  handler: http.RequestListener,
): Promise<http.Server> {
  const ports = candidateListenPorts();
  let lastErr: Error | undefined;
  for (const port of ports) {
    const server = http.createServer(handler);
    try {
      await new Promise<void>((resolve, reject) => {
        const onErr = (e: Error) => {
          reject(e);
        };
        server.once("error", onErr);
        server.listen(port, "127.0.0.1", () => {
          server.removeListener("error", onErr);
          resolve();
        });
      });
      return server;
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
      const code = (e as NodeJS.ErrnoException)?.code;
      server.close();
      if (code === "EADDRINUSE") {
        continue;
      }
      throw lastErr;
    }
  }
  throw new Error(
    lastErr?.message ??
      "Kein freier Port für OAuth-Callback (EADDRINUSE überall).",
  );
}

export async function runAuthorizationCodeFlow(
  config: OidcResolvedConfig,
): Promise<TokenBundle> {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(
    createHash("sha256").update(verifier).digest(),
  );
  const state = base64url(randomBytes(16));
  const redirectPath = normalizeRedirectPath(config.redirectPath);

  return new Promise((resolve, reject) => {
    let settled = false;
    let win: BrowserWindow | null = null;
    let server: http.Server | null = null;
    /** Gültiger ?code=-Callback — Fenster darf schließen, Token-Tausch läuft noch async. */
    let oauthCallbackAccepted = false;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };

    const handler: http.RequestListener = (req, res) => {
      if (!server) {
        res.writeHead(500);
        res.end();
        return;
      }
      const addr = server.address();
      const port =
        addr && typeof addr !== "string" ? addr.port : 0;
      const redirectUri = `http://127.0.0.1:${String(port)}${redirectPath}`;

      if (!req.url) {
        res.writeHead(400);
        res.end();
        return;
      }
      const url = new URL(req.url, `http://127.0.0.1:${String(port)}`);
      if (url.pathname !== redirectPath) {
        res.writeHead(404);
        res.end();
        return;
      }

      const code = url.searchParams.get("code");
      const err = url.searchParams.get("error");
      const errorDescription = url.searchParams.get("error_description");
      const returnedState = url.searchParams.get("state");

      if (err) {
        const msg = errorDescription
          ? `${err}: ${errorDescription}`
          : err;
        res.writeHead(400, { "Content-Type": "text/html; charset=utf-8" });
        res.end(
          `<!doctype html><html><body><p>Anmeldung fehlgeschlagen: ${escapeHtml(msg)}</p><script>window.close()</script></body></html>`,
        );
        server.close();
        finish(() => {
          reject(new Error(msg));
        });
        win?.destroy();
        return;
      }

      if (!code || returnedState !== state) {
        res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Ungültiger OAuth-Callback.");
        server.close();
        finish(() => {
          reject(new Error("invalid_oauth_callback"));
        });
        win?.destroy();
        return;
      }

      oauthCallbackAccepted = true;

      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(
        "<!doctype html><html><body><p>Anmeldung OK, Token wird geholt …</p></body></html>",
      );
      server.close();

      exchangeAuthorizationCode(config, code, redirectUri, verifier)
        .then((bundle) => {
          finish(() => {
            resolve(bundle);
          });
          win?.destroy();
        })
        .catch((e: unknown) => {
          finish(() => {
            reject(e instanceof Error ? e : new Error(String(e)));
          });
          win?.destroy();
        });
    };

    void (async () => {
      try {
        server = await listenOAuthServer(handler);
        const addr = server.address();
        const port =
          addr && typeof addr !== "string" ? addr.port : 0;
        const redirectUri = `http://127.0.0.1:${String(port)}${redirectPath}`;

        const params = new URLSearchParams({
          client_id: config.clientId,
          redirect_uri: redirectUri,
          response_type: "code",
          scope: "openid profile email offline_access",
          state,
          code_challenge: challenge,
          code_challenge_method: "S256",
        });
        const authUrl = `${config.authorizationEndpoint}?${params.toString()}`;

        win = new BrowserWindow({
          width: 520,
          height: 720,
          show: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
          },
        });
        win.on("closed", () => {
          win = null;
          try {
            server?.close();
          } catch {
            /* noop */
          }
          if (oauthCallbackAccepted) {
            return;
          }
          finish(() => {
            reject(new Error("login_cancelled"));
          });
        });
        void win.loadURL(authUrl);
      } catch (e) {
        finish(() => {
          reject(
            e instanceof Error
              ? e
              : new Error(
                  `OAuth-Redirect-Server: ${String(e)}`,
                ),
          );
        });
      }
    })();
  });
}
