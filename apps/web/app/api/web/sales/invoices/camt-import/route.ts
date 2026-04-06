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

export async function POST(request: Request) {
  const locale = getRequestLocale(request);
  const text = getUiText(locale);

  const session = await validateWebAccessTokenSession();
  if (!session.ok) {
    return NextResponse.json(
      { error: text.api.auth.bffSessionInvalid },
      noStoreInit({ status: 401 }),
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "expected_multipart" },
      noStoreInit({ status: 400 }),
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: text.api.auth.loginAuthServiceUnavailable },
      noStoreInit({ status: 400 }),
    );
  }

  const file = formData.get("file");
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "missing_file" }, noStoreInit({ status: 400 }));
  }

  const out = new FormData();
  out.set("file", file);

  const qs = new URL(request.url).searchParams.toString();
  const url = `${API_BASE}/v1/sales/invoices/camt-import${qs ? `?${qs}` : ""}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.token}` },
      body: out,
      cache: "no-store",
    });
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
