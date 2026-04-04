import { z } from "zod";

/** Mandant gemäß GET /v1/me (organization-Block). */
export const meOrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  tradeSlug: z.string(),
  senderAddress: z.string().nullable(),
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
    vatId: z.union([z.string().trim().max(64), z.null()]).optional(),
    taxNumber: z.union([z.string().trim().max(64), z.null()]).optional(),
    clearLogo: z.literal(true).optional(),
  })
  .strict();

export type OrganizationPatchRequest = z.infer<
  typeof organizationPatchRequestSchema
>;

export const organizationPatchResponseSchema = z.object({
  organization: meOrganizationSchema,
});

export type OrganizationPatchResponse = z.infer<
  typeof organizationPatchResponseSchema
>;
