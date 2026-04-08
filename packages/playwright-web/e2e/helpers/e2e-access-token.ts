import { Buffer } from "node:buffer";

/** Cookie-Name wie in `apps/web/lib/auth/constants.ts` (`zgwerk_access_token`). */
export const E2E_ACCESS_TOKEN_COOKIE_NAME = "zgwerk_access_token";

/** Wie `LOCALE_COOKIE_NAME` in `apps/web/lib/i18n/locale.ts` — fest `de` für stabile Produktstrings in E2E. */
export const E2E_LOCALE_COOKIE_NAME = "locale-preference";

function b64url(obj: object): string {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

/**
 * Minimal-JWT für Playwright: Web-Layout prüft nur Vorhandensein und `exp` (keine Signatur).
 * BFF ruft die API mit `Authorization: Bearer` — für echte API-Calls siehe Integrationstests / Smoke.
 */
export function buildPlaywrightWebAccessToken(): string {
  const header = b64url({ alg: "none", typ: "JWT" });
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
  const payload = b64url({
    sub: "playwright-e2e-user",
    email: "e2e@example.com",
    tenant_id: "local-dev-tenant",
    trade_slug: "maler",
    realm_access: { roles: ["OWNER"] },
    exp,
  });
  return `${header}.${payload}.e2e`;
}
