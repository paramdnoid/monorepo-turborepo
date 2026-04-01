import { randomBytes } from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getUiText } from "@/content/ui-text";
import {
  AUTH_COOKIE_NAME,
  LOGIN_CSRF_COOKIE_NAME,
} from "@/lib/auth/constants";
import { decodeAccessTokenPayload } from "@/lib/auth/decode-access-token";
import { requestKeycloakPasswordGrant } from "@/lib/auth/keycloak-password-grant";
import { recordWebLoginForUserSub } from "@/lib/auth/peer-session-db";
import { rateLimitLogin } from "@/lib/auth/login-rate-limit";
import { isAllowedNativeRedirectUri } from "@/lib/auth/native-redirect-allowlist";
import { saveNativeLoginOtc } from "@/lib/auth/native-login-otc";
import { getRequestLocale } from "@/lib/i18n/request-locale";
import { resolveLoginRedirect } from "@/lib/auth/resolve-post-login-next-path";

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

function loginGrantErrorResponse(
  grant: { ok: false; status: number; bodyText: string },
  text: ReturnType<typeof getUiText>,
) {
  if (grant.status >= 500) {
    return NextResponse.json(
      { error: text.api.auth.loginAuthServiceUnavailable },
      { status: 503 },
    );
  }
  return NextResponse.json(
    { error: text.api.auth.invalidCredentials },
    { status: 401 },
  );
}

const loginSchema = z.object({
  username: z.string().min(1).max(320),
  password: z.string().min(1).max(128),
  csrf: z.string().min(16).max(200),
  next: z.string().max(2000).optional(),
  native: z
    .object({
      redirect_uri: z.string().min(1).max(2000),
      state: z.string().min(1).max(500),
      code_challenge: z.string().min(1).max(200),
      client_id: z.string().min(1).max(120).optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  const locale = getRequestLocale(request);
  const text = getUiText(locale);
  const ip = clientIp(request);
  const rl = rateLimitLogin(ip);
  if (!rl.ok) {
    return NextResponse.json(
      { error: text.api.auth.loginRateLimited },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: text.api.auth.invalidBody },
      { status: 400 },
    );
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: text.api.auth.invalidBody },
      { status: 400 },
    );
  }

  const { username, password, next, native } = parsed.data;
  const cookieStore = await cookies();

  if (native && !isAllowedNativeRedirectUri(native.redirect_uri)) {
    return NextResponse.json(
      { error: text.api.auth.loginRedirectInvalid },
      { status: 400 },
    );
  }

  /**
   * Desktop/Electron: `BrowserWindow` liefert das CSRF-Cookie oft nicht mit (Session/Partition).
   * Native-Flow ist ohnehin durch PKCE + Einmalcode + Allowlist gebunden — CSRF entfällt dort.
   */
  const nativeDesktopFlow =
    native != null &&
    isAllowedNativeRedirectUri(native.redirect_uri) &&
    native.state.length > 0 &&
    native.code_challenge.length > 0;

  if (!nativeDesktopFlow) {
    const csrfCookie = cookieStore.get(LOGIN_CSRF_COOKIE_NAME)?.value;
    if (!csrfCookie || csrfCookie !== parsed.data.csrf) {
      return NextResponse.json(
        { error: text.api.auth.loginCsrfInvalid },
        { status: 403 },
      );
    }
  }
  const webClientId = process.env.AUTH_OIDC_CLIENT_ID ?? "zgwerk-cli";
  const nativeClientId =
    process.env.AUTH_NATIVE_OIDC_CLIENT_ID ?? "zgwerk-desktop";

  if (nativeDesktopFlow && native) {
    const clientId = native.client_id?.trim() || nativeClientId;
    const grant = await requestKeycloakPasswordGrant({
      username,
      password,
      clientId,
    });
    if (!grant.ok) {
      return loginGrantErrorResponse(grant, text);
    }
    const otc = randomBytes(32).toString("base64url");
    try {
      await saveNativeLoginOtc(otc, {
        codeChallenge: native.code_challenge,
        redirectUri: native.redirect_uri,
        accessToken: grant.tokens.access_token,
        refreshToken: grant.tokens.refresh_token ?? null,
        expiresIn: grant.tokens.expires_in ?? 900,
      });
    } catch (err) {
      console.error("[auth/login] saveNativeLoginOtc failed:", err);
      return NextResponse.json(
        { error: text.api.auth.loginAuthServiceUnavailable },
        { status: 503 },
      );
    }
    const redirectUrl = new URL(native.redirect_uri);
    redirectUrl.searchParams.set("code", otc);
    redirectUrl.searchParams.set("state", native.state);
    return NextResponse.json({
      ok: true as const,
      redirectUrl: redirectUrl.toString(),
    });
  }

  const grant = await requestKeycloakPasswordGrant({
    username,
    password,
    clientId: webClientId,
  });
  if (!grant.ok) {
    return loginGrantErrorResponse(grant, text);
  }

  const nextPath = resolveLoginRedirect(next);
  cookieStore.set(AUTH_COOKIE_NAME, grant.tokens.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.max(60, grant.tokens.expires_in ?? 900),
  });

  const sub = decodeAccessTokenPayload(grant.tokens.access_token)?.sub;
  if (sub) {
    try {
      await recordWebLoginForUserSub(sub);
    } catch (err) {
      console.error("[auth/login] recordWebLoginForUserSub failed:", err);
    }
  }

  return NextResponse.json({ ok: true as const, next: nextPath });
}
