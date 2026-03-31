import { session } from "electron";

/** Muss mit `apps/web` `AUTH_COOKIE_NAME` übereinstimmen. */
const WEB_ACCESS_COOKIE_NAME = "zgwerk_access_token";

function webAppOrigins(baseUrl: string): string[] {
  let u: URL;
  try {
    u = new URL(baseUrl);
  } catch {
    return [];
  }
  const port = u.port || (u.protocol === "https:" ? "443" : "80");
  const a = `${u.protocol}//${u.hostname}${u.port ? `:${u.port}` : ""}`;
  const out = new Set<string>([a]);
  if (u.hostname === "localhost") {
    out.add(`${u.protocol}//127.0.0.1:${port}`);
  }
  if (u.hostname === "127.0.0.1") {
    out.add(`${u.protocol}//localhost:${port}`);
  }
  return [...out];
}

/**
 * Web-Session-Cookie(s) der Next-App entfernen (nach App-Login).
 */
export function clearWebAppAccessCookies(webBaseUrl: string): void {
  const origins = webAppOrigins(webBaseUrl.trim() || "http://127.0.0.1:3000");
  for (const origin of origins) {
    void session.defaultSession.cookies.remove(origin, WEB_ACCESS_COOKIE_NAME);
  }
}

function normalizedWebBase(): string {
  const raw = process.env.DESKTOP_WEB_BASE_URL?.trim();
  if (raw) {
    return raw.replace(/\/+$/, "");
  }
  return "http://127.0.0.1:3000";
}

/**
 * Server informieren (Peer-Tabelle) und Browser-Cookies der Web-App leeren.
 */
export async function syncPeerAfterAppLogin(accessToken: string): Promise<void> {
  const base = normalizedWebBase();
  clearWebAppAccessCookies(base);

  try {
    const res = await fetch(`${base}/api/auth/peer-session`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ event: "app_login" }),
    });
    if (!res.ok) {
      console.warn("[desktop] peer-session POST", res.status, await res.text());
    }
  } catch (e) {
    console.warn("[desktop] peer-session POST failed", e);
  }
}

export async function pollPeerShouldLogout(
  accessToken: string,
): Promise<boolean> {
  const base = normalizedWebBase();
  try {
    const res = await fetch(`${base}/api/auth/peer-session`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      return false;
    }
    const data = (await res.json()) as { desktopShouldLogout?: boolean };
    return Boolean(data.desktopShouldLogout);
  } catch {
    return false;
  }
}
