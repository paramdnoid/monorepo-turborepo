import {
  type NotificationPreferencesPut,
  notificationPreferencesPutSchema,
  notificationPreferencesResponseSchema,
} from "@repo/api-contracts";

import type { Locale } from "@/lib/i18n/locale";
import { parseResponseJson } from "@/lib/parse-response-json";

export type NotificationPreferencesState = {
  productUpdates: boolean;
  securityAlerts: boolean;
  updatedAt: string;
};

export type NotificationPreferencesResult =
  | { ok: true; preferences: NotificationPreferencesState }
  | { ok: false; error: string };

function fallbackLoadError(locale: Locale): string {
  return locale === "en"
    ? "Notification settings could not be loaded."
    : "Benachrichtigungseinstellungen konnten nicht geladen werden.";
}

function fallbackSaveError(locale: Locale): string {
  return locale === "en"
    ? "Saving failed."
    : "Speichern fehlgeschlagen.";
}

function invalidInputError(locale: Locale): string {
  return locale === "en"
    ? "Invalid input. Please check your entries."
    : "Ungueltige Eingaben. Bitte pruefe deine Angaben.";
}

export function extractSettingsErrorMessage(
  json: unknown,
  fallback: string,
): string {
  if (typeof json !== "object" || json === null) {
    return fallback;
  }
  const rec = json as Record<string, unknown>;
  const detail = typeof rec.detail === "string" ? rec.detail : null;
  const hint = typeof rec.hint === "string" ? rec.hint : null;
  const error = typeof rec.error === "string" ? rec.error : null;
  if (detail && hint) return `${detail} ${hint}`;
  if (detail) return detail;
  if (error) return error;
  return fallback;
}

export async function loadNotificationPreferences(
  locale: Locale,
): Promise<NotificationPreferencesResult> {
  try {
    const res = await fetch("/api/web/settings/notifications", {
      cache: "no-store",
    });
    const json = parseResponseJson(await res.text());
    if (!res.ok) {
      return {
        ok: false,
        error: extractSettingsErrorMessage(json, fallbackLoadError(locale)),
      };
    }
    const parsed = notificationPreferencesResponseSchema.safeParse(json);
    if (!parsed.success) {
      return { ok: false, error: fallbackLoadError(locale) };
    }
    return { ok: true, preferences: parsed.data.preferences };
  } catch {
    return { ok: false, error: fallbackLoadError(locale) };
  }
}

export async function saveNotificationPreferences(
  locale: Locale,
  input: NotificationPreferencesPut,
): Promise<NotificationPreferencesResult> {
  const validated = notificationPreferencesPutSchema.safeParse(input);
  if (!validated.success) {
    return { ok: false, error: invalidInputError(locale) };
  }

  try {
    const res = await fetch("/api/web/settings/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validated.data),
    });
    const json = parseResponseJson(await res.text());
    if (!res.ok) {
      return {
        ok: false,
        error: extractSettingsErrorMessage(json, fallbackSaveError(locale)),
      };
    }
    const parsed = notificationPreferencesResponseSchema.safeParse(json);
    if (!parsed.success) {
      return { ok: false, error: fallbackSaveError(locale) };
    }
    return { ok: true, preferences: parsed.data.preferences };
  } catch {
    return { ok: false, error: fallbackSaveError(locale) };
  }
}
