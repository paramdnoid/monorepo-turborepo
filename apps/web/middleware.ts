import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  AUTH_COOKIE_NAME,
  AUTH_REFRESH_COOKIE_NAME,
} from "@/lib/auth/constants";
import { isJwtAccessExpired } from "@/lib/auth/jwt-access-expiry";
import { requestKeycloakRefreshGrant } from "@/lib/auth/keycloak-password-grant";

const WEB_CLIENT_ID = process.env.AUTH_OIDC_CLIENT_ID ?? "zgwerk-cli";

const LONG_LIVED_SEC = 60 * 60 * 24 * 30;

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  const access = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const refresh = request.cookies.get(AUTH_REFRESH_COOKIE_NAME)?.value;

  if (!isJwtAccessExpired(access)) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  if (!refresh?.trim()) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  const grant = await requestKeycloakRefreshGrant(
    refresh.trim(),
    WEB_CLIENT_ID,
  );
  const secure = process.env.NODE_ENV === "production";

  if (!grant.ok) {
    const res = NextResponse.next({
      request: { headers: requestHeaders },
    });
    res.cookies.delete(AUTH_COOKIE_NAME);
    res.cookies.delete(AUTH_REFRESH_COOKIE_NAME);
    return res;
  }

  const url = request.nextUrl.clone();
  const res = NextResponse.redirect(url);

  res.cookies.set(AUTH_COOKIE_NAME, grant.tokens.access_token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: LONG_LIVED_SEC,
  });

  if (grant.tokens.refresh_token) {
    res.cookies.set(AUTH_REFRESH_COOKIE_NAME, grant.tokens.refresh_token, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: LONG_LIVED_SEC,
    });
  }

  return res;
}

export const config = {
  matcher: ["/web", "/web/:path*"],
};
