import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getUiText } from "@/content/ui-text";
import {
  AUTH_COOKIE_NAME,
  AUTH_REFRESH_COOKIE_NAME,
  LOGIN_CSRF_COOKIE_NAME,
} from "@/lib/auth/constants";
import { getRequestLocale } from "@/lib/i18n/request-locale";

const bodySchema = z.object({
  csrf: z.string().min(16).max(200),
});

export async function POST(request: Request) {
  const locale = getRequestLocale(request);
  const text = getUiText(locale);
  const cookieStore = await cookies();

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

  const csrfCookie = cookieStore.get(LOGIN_CSRF_COOKIE_NAME)?.value;
  if (!csrfCookie || csrfCookie !== parsed.data.csrf) {
    return NextResponse.json(
      { error: text.api.auth.loginCsrfInvalid },
      { status: 403, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  cookieStore.delete(AUTH_COOKIE_NAME);
  cookieStore.delete(AUTH_REFRESH_COOKIE_NAME);

  const res = NextResponse.json({ ok: true as const });
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}
