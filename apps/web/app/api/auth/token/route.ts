import { NextResponse } from "next/server";
import { z } from "zod";

import { getUiText } from "@/content/ui-text";
import { rateLimitTokenExchange } from "@/lib/auth/login-rate-limit";
import { takeNativeLoginOtc } from "@/lib/auth/native-login-otc";
import { verifyPkceS256 } from "@/lib/auth/pkce";
import { getRequestLocale } from "@/lib/i18n/request-locale";

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

const tokenSchema = z
  .object({
    grant_type: z.string(),
    client_id: z.string().min(1).max(120),
    code: z.string().min(1).max(500),
    redirect_uri: z.string().min(1).max(2000),
    code_verifier: z.string().min(1).max(500),
  })
  .refine((d) => d.grant_type === "authorization_code", {
    message: "grant_type",
  });

async function parseBody(
  request: Request,
): Promise<Record<string, string> | null> {
  const ct = request.headers.get("content-type") ?? "";
  if (ct.includes("application/x-www-form-urlencoded")) {
    const raw = await request.text();
    const params = new URLSearchParams(raw);
    const out: Record<string, string> = {};
    params.forEach((v, k) => {
      out[k] = v;
    });
    return out;
  }
  if (ct.includes("application/json")) {
    const json = (await request.json()) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(json)) {
      if (typeof v === "string") {
        out[k] = v;
      }
    }
    return out;
  }
  return null;
}

export async function POST(request: Request) {
  const locale = getRequestLocale(request);
  const text = getUiText(locale);
  const ip = clientIp(request);
  const rl = rateLimitTokenExchange(ip);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", error_description: text.api.auth.loginRateLimited },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      },
    );
  }

  const raw = await parseBody(request);
  if (!raw) {
    return NextResponse.json(
      { error: "invalid_request", error_description: text.api.auth.invalidBody },
      { status: 400 },
    );
  }

  const parsed = tokenSchema.safeParse({
    grant_type: raw.grant_type,
    client_id: raw.client_id,
    code: raw.code,
    redirect_uri: raw.redirect_uri,
    code_verifier: raw.code_verifier,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", error_description: text.api.auth.invalidBody },
      { status: 400 },
    );
  }

  const payload = await takeNativeLoginOtc(parsed.data.code);
  if (!payload) {
    return NextResponse.json(
      { error: "invalid_grant", error_description: text.api.auth.tokenOtcInvalid },
      { status: 400 },
    );
  }

  if (payload.redirectUri !== parsed.data.redirect_uri) {
    return NextResponse.json(
      {
        error: "invalid_grant",
        error_description: text.api.auth.tokenRedirectMismatch,
      },
      { status: 400 },
    );
  }

  if (!verifyPkceS256(parsed.data.code_verifier, payload.codeChallenge)) {
    return NextResponse.json(
      { error: "invalid_grant", error_description: text.api.auth.tokenPkceInvalid },
      { status: 400 },
    );
  }

  const body: Record<string, unknown> = {
    access_token: payload.accessToken,
    expires_in: payload.expiresIn,
    token_type: "Bearer",
  };
  if (payload.refreshToken) {
    body.refresh_token = payload.refreshToken;
  }

  return NextResponse.json(body);
}
