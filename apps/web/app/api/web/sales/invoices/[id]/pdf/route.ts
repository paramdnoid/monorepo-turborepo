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

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const locale = getRequestLocale(req);
  const text = getUiText(locale);
  const lang = locale === "en" ? "en" : "de";

  const session = await validateWebAccessTokenSession();
  if (!session.ok) {
    return NextResponse.json(
      { error: text.api.auth.bffSessionInvalid },
      noStoreInit({ status: 401 }),
    );
  }

  try {
    const res = await fetch(
      `${API_BASE}/v1/sales/invoices/${encodeURIComponent(id)}/pdf?lang=${lang}`,
      {
        headers: { Authorization: `Bearer ${session.token}` },
        cache: "no-store",
      },
    );

    if (res.status === 404) {
      return NextResponse.json({ error: "not_found" }, noStoreInit({ status: 404 }));
    }

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: errText || "upstream_error" },
        noStoreInit({ status: res.status >= 500 ? 503 : res.status }),
      );
    }

    const buf = await res.arrayBuffer();
    const contentDisposition = res.headers.get("content-disposition");
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        ...(contentDisposition
          ? { "Content-Disposition": contentDisposition }
          : {}),
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
