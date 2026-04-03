"use server";

import { z } from "zod";

export type UpdateNotificationPreferencesResult =
  | { ok: true }
  | { ok: false; error: string };

const notificationPreferencesSchema = z.object({
  productUpdates: z.boolean(),
  securityAlerts: z.boolean(),
});

export type NotificationPreferencesInput = z.infer<
  typeof notificationPreferencesSchema
>;

/**
 * Platzhalter für persistente Benachrichtigungseinstellungen (API/DB).
 * Validiert die Payload; Persistenz folgt.
 */
export async function updateNotificationPreferences(
  raw: unknown,
): Promise<UpdateNotificationPreferencesResult> {
  const parsed = notificationPreferencesSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Ungültige Eingabe." };
  }

  void parsed.data;
  // TODO: Nutzerpräferenzen speichern (z. B. Postgres über @repo/db).
  return { ok: true };
}
