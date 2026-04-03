import { NextResponse } from "next/server";

import {
  getKeycloakAdminToken,
  getKeycloakUserEmailVerified,
} from "@/lib/auth/keycloak-admin";
import { decodeAccessTokenPayload } from "@/lib/auth/decode-access-token";
import { getServerAccessToken } from "@/lib/auth/server-token";
import { getAuthSessionEmailVerified } from "@/lib/auth/session-user";

/**
 * E-Mail-Verifizierung für das Onboarding-Polling: bevorzugt **Keycloak-Live-Status** (Admin-API),
 * damit ein Tab mit altem JWT trotzdem „bestätigt“ sieht, wenn der Link in einem **anderen**
 * Browser/Fenster geöffnet wurde. Fallback: Claim `email_verified` im Access-Token.
 */
export async function GET() {
  const token = await getServerAccessToken();
  const sub = token ? decodeAccessTokenPayload(token)?.sub : undefined;

  if (sub) {
    const adminToken = await getKeycloakAdminToken();
    if (adminToken) {
      const fromRealm = await getKeycloakUserEmailVerified(adminToken, sub);
      if (fromRealm !== null) {
        return NextResponse.json({ emailVerified: fromRealm });
      }
    }
  }

  const emailVerified = await getAuthSessionEmailVerified();
  return NextResponse.json({ emailVerified });
}
