import { NextResponse } from "next/server";

import { getUiText } from "@/content/ui-text";
import { validateWebAccessTokenSession } from "@/lib/auth/validate-web-session";
import { getRequestLocale } from "@/lib/i18n/request-locale";

const API_BASE =
  process.env.NEXT_PUBLIC_WEB_API_BASE_URL ?? "http://127.0.0.1:4000";

function noStoreInit(init?: ResponseInit): ResponseInit {
  return {
    ...init,
    headers: {
      ...init?.headers,
      "Cache-Control": "private, no-store",
    },
  };
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ cartId: string }> },
) {
  const locale = getRequestLocale(request);
  const text = getUiText(locale);
  const { cartId } = await ctx.params;

  const session = await validateWebAccessTokenSession();
  if (!session.ok) {
    return NextResponse.json(
      { error: text.api.auth.bffSessionInvalid },
      noStoreInit({ status: 401 }),
    );
  }

  try {
    const res = await fetch(
      `${API_BASE}/v1/ids-connect/carts/${encodeURIComponent(cartId)}/submit`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.token}`,
          "Content-Type": "application/json",
        },
        body: "{}",
        cache: "no-store",
      },
    );
    const bodyText = await res.text();
    return new NextResponse(bodyText, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "application/json",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: text.api.auth.loginAuthServiceUnavailable },
      noStoreInit({ status: 503 }),
    );
  }
}
