import { NextResponse } from "next/server";

import {
  getKeycloakAdminToken,
  getKeycloakUserEmail,
  setKeycloakUserEmailVerified,
} from "@/lib/auth/keycloak-admin";
import { verifyEmailVerificationToken } from "@/lib/mail/verification-token";

function baseOrigin(): string {
  const raw =
    process.env.MAIL_BRAND_ORIGIN?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

function redirectWithStatus(status: "ok" | "invalid" | "config"): NextResponse {
  const u = new URL("/", baseOrigin());
  u.searchParams.set("emailVerify", status);
  return NextResponse.redirect(u);
}

/**
 * Einmal-Link aus der Registrierungsmail: setzt in Keycloak `emailVerified: true`.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return redirectWithStatus("invalid");
  }

  const payload = verifyEmailVerificationToken(token);
  if (!payload) {
    return redirectWithStatus("invalid");
  }

  const adminToken = await getKeycloakAdminToken();
  if (!adminToken) {
    return redirectWithStatus("config");
  }

  const keycloakEmail = await getKeycloakUserEmail(adminToken, payload.sub);
  if (!keycloakEmail || keycloakEmail !== payload.email.toLowerCase()) {
    return redirectWithStatus("invalid");
  }

  const updated = await setKeycloakUserEmailVerified(adminToken, payload.sub, true);
  if (!updated) {
    return redirectWithStatus("invalid");
  }

  return redirectWithStatus("ok");
}
