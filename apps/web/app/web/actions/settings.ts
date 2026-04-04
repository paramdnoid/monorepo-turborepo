"use server";

import {
  type NotificationPreferences,
  type NotificationPreferencesPut,
  notificationPreferencesPutSchema,
  notificationPreferencesResponseSchema,
} from "@repo/api-contracts";

import { validateWebAccessTokenSession } from "@/lib/auth/validate-web-session";

export type UpdateNotificationPreferencesResult =
  | { ok: true; preferences: NotificationPreferences }
  | { ok: false; error: string };

export type NotificationPreferencesInput = NotificationPreferencesPut;

const API_BASE =
  process.env.NEXT_PUBLIC_WEB_API_BASE_URL ?? "http://127.0.0.1:4000";

/**
 * Persistente Benachrichtigungseinstellungen (API/DB).
 */
export async function updateNotificationPreferences(
  raw: unknown,
): Promise<UpdateNotificationPreferencesResult> {
  const parsed = notificationPreferencesPutSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Ungültige Eingabe." };
  }

  const session = await validateWebAccessTokenSession();
  if (!session.ok) {
    return { ok: false, error: "Sitzung ist abgelaufen. Bitte neu anmelden." };
  }

  try {
    const res = await fetch(`${API_BASE}/v1/settings/notifications`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${session.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsed.data),
      cache: "no-store",
    });
    const bodyText = await res.text();
    let json: unknown = null;
    try {
      json = JSON.parse(bodyText);
    } catch {
      /* ignore */
    }
    if (!res.ok) {
      return {
        ok: false,
        error:
          typeof json === "object" &&
          json !== null &&
          "error" in json &&
          typeof (json as { error?: unknown }).error === "string"
            ? (json as { error: string }).error
            : "Speichern fehlgeschlagen.",
      };
    }
    const out = notificationPreferencesResponseSchema.safeParse(json);
    if (!out.success) {
      return { ok: false, error: "Ungültige Antwort vom Server." };
    }
    return { ok: true, preferences: out.data.preferences };
  } catch {
    return { ok: false, error: "Server ist nicht erreichbar." };
  }
}
