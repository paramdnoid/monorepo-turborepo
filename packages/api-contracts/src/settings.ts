import { z } from "zod";

/** GET /v1/settings/notifications — Antwort. */
export const notificationPreferencesSchema = z.object({
  productUpdates: z.boolean(),
  securityAlerts: z.boolean(),
  updatedAt: z.string(),
});

export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;

export const notificationPreferencesResponseSchema = z.object({
  preferences: notificationPreferencesSchema,
});

export type NotificationPreferencesResponse = z.infer<
  typeof notificationPreferencesResponseSchema
>;

/** PUT /v1/settings/notifications — Request. */
export const notificationPreferencesPutSchema = z
  .object({
    productUpdates: z.boolean(),
    securityAlerts: z.boolean(),
  })
  .strict();

export type NotificationPreferencesPut = z.infer<
  typeof notificationPreferencesPutSchema
>;

export const colorSystemSchema = z.enum(["ral", "ncs"]);

export type ColorSystem = z.infer<typeof colorSystemSchema>;

export const colorPaletteScopeSchema = z.enum(["user", "team"]);

export type ColorPaletteScope = z.infer<typeof colorPaletteScopeSchema>;

export const colorRefSchema = z
  .object({
    system: colorSystemSchema,
    id: z.string().trim().min(1).max(80),
  })
  .strict();

export type ColorRef = z.infer<typeof colorRefSchema>;

function uniqueColorRefs(refs: ColorRef[]): boolean {
  const seen = new Set<string>();
  for (const ref of refs) {
    const key = `${ref.system}:${ref.id}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
  }
  return true;
}

export const colorPaletteSchema = z.object({
  scope: colorPaletteScopeSchema,
  favorites: z.array(colorRefSchema).max(400),
  recent: z.array(colorRefSchema).max(40),
  updatedAt: z.string(),
  updatedBySub: z.string().nullable(),
});

export type ColorPalette = z.infer<typeof colorPaletteSchema>;

export const colorPreferencesResponseSchema = z.object({
  palette: colorPaletteSchema,
  permissions: z.object({
    canEditTeamPalette: z.boolean(),
  }),
});

export type ColorPreferencesResponse = z.infer<
  typeof colorPreferencesResponseSchema
>;

export const colorPreferencesPutSchema = z
  .object({
    scope: colorPaletteScopeSchema,
    favorites: z.array(colorRefSchema).max(400),
    recent: z.array(colorRefSchema).max(40),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (!uniqueColorRefs(v.favorites)) {
      ctx.addIssue({
        code: "custom",
        message: "favorite_duplicate",
        path: ["favorites"],
      });
    }
    if (!uniqueColorRefs(v.recent)) {
      ctx.addIssue({
        code: "custom",
        message: "recent_duplicate",
        path: ["recent"],
      });
    }
  });

export type ColorPreferencesPut = z.infer<typeof colorPreferencesPutSchema>;

