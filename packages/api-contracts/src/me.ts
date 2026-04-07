import { z } from "zod";

/** Mandant gemäß GET /v1/me (organization-Block). */
export const meOrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  tradeSlug: z.string(),
  senderAddress: z.string().nullable(),
  senderStreet: z.string().nullable(),
  senderHouseNumber: z.string().nullable(),
  senderPostalCode: z.string().nullable(),
  senderCity: z.string().nullable(),
  /** ISO 3166-1 alpha-2 */
  senderCountry: z.string().nullable(),
  senderLatitude: z.number().finite().nullable(),
  senderLongitude: z.number().finite().nullable(),
  vatId: z.string().nullable(),
  taxNumber: z.string().nullable(),
  hasLogo: z.boolean(),
});

export type MeOrganization = z.infer<typeof meOrganizationSchema>;

export const meResponseSchema = z.object({
  sub: z.string(),
  tenantId: z.string(),
  organization: meOrganizationSchema,
});

export type MeResponse = z.infer<typeof meResponseSchema>;

/** PATCH /v1/organization — fehlende Felder = keine Änderung; `null` leert Textfelder. */
export const organizationPatchRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    senderAddress: z.union([z.string().trim().max(4000), z.null()]).optional(),
    senderStreet: z.union([z.string().trim().min(1).max(300), z.null()]).optional(),
    senderHouseNumber: z
      .union([z.string().trim().min(1).max(40), z.null()])
      .optional(),
    senderPostalCode: z
      .union([z.string().trim().min(1).max(32), z.null()])
      .optional(),
    senderCity: z.union([z.string().trim().min(1).max(120), z.null()]).optional(),
    senderCountry: z
      .union([
        z
          .string()
          .trim()
          .length(2)
          .regex(/^[A-Z]{2}$/),
        z.null(),
      ])
      .optional(),
    senderLatitude: z.union([z.number().finite(), z.null()]).optional(),
    senderLongitude: z.union([z.number().finite(), z.null()]).optional(),
    vatId: z.union([z.string().trim().max(64), z.null()]).optional(),
    taxNumber: z.union([z.string().trim().max(64), z.null()]).optional(),
    clearLogo: z.literal(true).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const hasLat = data.senderLatitude !== undefined;
    const hasLng = data.senderLongitude !== undefined;
    if (hasLat !== hasLng) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "latitude_and_longitude_together",
        path: hasLat ? ["senderLongitude"] : ["senderLatitude"],
      });
      return;
    }
    if (data.senderLatitude !== undefined && data.senderLatitude !== null) {
      if (data.senderLatitude < -90 || data.senderLatitude > 90) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "latitude_range",
          path: ["senderLatitude"],
        });
      }
    }
    if (data.senderLongitude !== undefined && data.senderLongitude !== null) {
      if (data.senderLongitude < -180 || data.senderLongitude > 180) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "longitude_range",
          path: ["senderLongitude"],
        });
      }
    }
  });

export type OrganizationPatchRequest = z.infer<
  typeof organizationPatchRequestSchema
>;

export const organizationPatchResponseSchema = z.object({
  organization: meOrganizationSchema,
});

export type OrganizationPatchResponse = z.infer<
  typeof organizationPatchResponseSchema
>;
