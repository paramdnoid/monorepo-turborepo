import { NextResponse } from "next/server";

import { getUiText } from "@/content/ui-text";
import { clearWebAccessTokenCookie } from "@/lib/auth/clear-web-access-cookie";
import { validateWebAccessTokenSession } from "@/lib/auth/validate-web-session";
import { getRequestLocale } from "@/lib/i18n/request-locale";

const API_BASE =
  process.env.NEXT_PUBLIC_WEB_API_BASE_URL ?? "http://127.0.0.1:4000";

const UPSTREAM_TIMEOUT_MS = 10_000;

function withNoStore(init?: ResponseInit): ResponseInit {
  return {
    ...init,
    headers: {
      ...init?.headers,
      "Cache-Control": "private, no-store",
    },
  };
}

function jsonNoStore(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, withNoStore(init));
}

export async function GET(request: Request) {
  const locale = getRequestLocale(request);
  const text = getUiText(locale);

  const session = await validateWebAccessTokenSession();
  if (!session.ok) {
    if (session.reason === "superseded_by_app") {
      await clearWebAccessTokenCookie();
    }
    return jsonNoStore(
      { error: text.api.auth.bffSessionInvalid },
      { status: 401 },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/v1/me`, {
      headers: { Authorization: `Bearer ${session.token}` },
      signal: controller.signal,
    });
    const bodyText = await res.text();

    if (!res.ok) {
      if (res.status >= 500) {
        return jsonNoStore(
          { error: text.api.auth.loginAuthServiceUnavailable },
          { status: 503 },
        );
      }
      // Eigene API (401/403 z. B. TENANT_NOT_PROVISIONED): Body unverfälscht durchreichen —
      // das ist keine „ungültige Web-Session“, sondern Token/Claim/Mandant-Status.
      return new NextResponse(bodyText, {
        status: res.status,
        headers: {
          "Content-Type": res.headers.get("content-type") ?? "application/json",
          "Cache-Control": "private, no-store",
        },
      });
    }

    return new NextResponse(bodyText, {
      status: 200,
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "application/json",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return jsonNoStore(
      { error: text.api.auth.loginAuthServiceUnavailable },
      { status: 503 },
    );
  } finally {
    clearTimeout(timeout);
  }
}
