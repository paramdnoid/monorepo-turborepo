import { randomBytes } from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getUiText } from "@/content/ui-text";
import { LOGIN_CSRF_COOKIE_NAME } from "@/lib/auth/constants";
import { clearWebAccessTokenCookie } from "@/lib/auth/clear-web-access-cookie";
import { decodeAccessTokenPayload } from "@/lib/auth/decode-access-token";
import { isAllowedNativeRedirectUri } from "@/lib/auth/native-redirect-allowlist";
import { saveNativeLoginOtc } from "@/lib/auth/native-login-otc";
import { rateLimitLogin } from "@/lib/auth/login-rate-limit";
import { validateWebAccessTokenSession } from "@/lib/auth/validate-web-session";
import { getRequestLocale } from "@/lib/i18n/request-locale";

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

const bodySchema = z.object({
  csrf: z.string().min(16).max(200),
  native: z.object({
    redirect_uri: z.string().min(1).max(2000),
    state: z.string().min(1).max(500),
    code_challenge: z.string().min(1).max(200),
    client_id: z.string().min(1).max(120).optional(),
  }),
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
        headers: {
          "Retry-After": String(rl.retryAfterSec),
          "Cache-Control": "private, no-store",
        },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: text.api.auth.invalidBody },
      { status: 400, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: text.api.auth.invalidBody },
      { status: 400, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const { native } = parsed.data;
  const cookieStore = await cookies();

  if (!isAllowedNativeRedirectUri(native.redirect_uri)) {
    return NextResponse.json(
      { error: text.api.auth.loginRedirectInvalid },
      { status: 400, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  /**
   * Wie bei POST /api/auth/login: Desktop-WebView liefert oft kein Login-CSRF-Cookie;
   * PKCE + Allowlist + gültige Web-Session reichen für diesen Endpunkt.
   */
  const nativeDesktopFlow =
    isAllowedNativeRedirectUri(native.redirect_uri) &&
    native.state.length > 0 &&
    native.code_challenge.length > 0;

  if (!nativeDesktopFlow) {
    const csrfCookie = cookieStore.get(LOGIN_CSRF_COOKIE_NAME)?.value;
    if (!csrfCookie || csrfCookie !== parsed.data.csrf) {
      return NextResponse.json(
        { error: text.api.auth.loginCsrfInvalid },
        { status: 403, headers: { "Cache-Control": "private, no-store" } },
      );
    }
  }

  const session = await validateWebAccessTokenSession();
  if (!session.ok) {
    if (session.reason === "superseded_by_app") {
      await clearWebAccessTokenCookie();
    }
    return NextResponse.json(
      { error: text.api.auth.bffSessionInvalid },
      { status: 401, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const payload = decodeAccessTokenPayload(session.token);
  const expSec = payload?.exp;
  const expiresIn =
    typeof expSec === "number"
      ? Math.max(60, expSec - Math.floor(Date.now() / 1000))
      : 900;

  const otc = randomBytes(32).toString("base64url");
  try {
    await saveNativeLoginOtc(otc, {
      codeChallenge: native.code_challenge,
      redirectUri: native.redirect_uri,
      accessToken: session.token,
      refreshToken: null,
      expiresIn,
    });
  } catch (err) {
    console.error("[auth/native-handoff-from-web-session] saveNativeLoginOtc failed:", err);
    return NextResponse.json(
      { error: text.api.auth.loginAuthServiceUnavailable },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const redirectUrl = new URL(native.redirect_uri);
  redirectUrl.searchParams.set("code", otc);
  redirectUrl.searchParams.set("state", native.state);

  const res = NextResponse.json({
    ok: true as const,
    redirectUrl: redirectUrl.toString(),
  });
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}
