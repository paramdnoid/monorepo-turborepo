import { z } from "zod";

const optionalTrimmedOrNull = (max: number) =>
  z.union([z.string().trim().max(max), z.null()]).optional();

/** GET /v1/datev/settings — Antwort. */
export const datevSettingsSchema = z.object({
  advisorNumber: z.string().nullable(),
  clientNumber: z.string().nullable(),
  defaultDebtorAccount: z.string().nullable(),
  defaultRevenueAccount: z.string().nullable(),
  defaultVatKey: z.string().nullable(),
  updatedAt: z.string(),
});

export type DatevSettings = z.infer<typeof datevSettingsSchema>;

export const datevSettingsResponseSchema = z.object({
  settings: datevSettingsSchema,
});

export type DatevSettingsResponse = z.infer<typeof datevSettingsResponseSchema>;

/** PATCH /v1/datev/settings */
export const datevSettingsPatchSchema = z
  .object({
    advisorNumber: optionalTrimmedOrNull(32),
    clientNumber: optionalTrimmedOrNull(32),
    defaultDebtorAccount: optionalTrimmedOrNull(16),
    defaultRevenueAccount: optionalTrimmedOrNull(16),
    defaultVatKey: optionalTrimmedOrNull(16),
  })
  .strict();

export type DatevSettingsPatch = z.infer<typeof datevSettingsPatchSchema>;

const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

/** Query GET /v1/datev/export/bookings.csv */
export const datevExportBookingsQuerySchema = z.object({
  from: isoDate,
  to: isoDate,
});

export type DatevExportBookingsQuery = z.infer<
  typeof datevExportBookingsQuerySchema
>;
