import { z } from "zod";

/**
 * Normalisierte DTOs fuer IDS-Connect-Proxy (HTTP-Adapter oder Mock).
 * Outbound-Pfade relativ zur Lieferanten-`idsConnectBaseUrl`:
 *   POST .../zgwerk/ids-connect/v1/search
 *   POST .../zgwerk/ids-connect/v1/carts
 *   PATCH .../zgwerk/ids-connect/v1/carts/:externalCartId
 *   POST .../zgwerk/ids-connect/v1/carts/:externalCartId/submit
 * Echte Haendler-Spezifikation (ITEK IDS Connect) kann in einem separaten Adapter gemappt werden.
 */

export const idsConnectSearchHitSchema = z.object({
  externalId: z.string().min(1),
  sku: z.string(),
  name: z.string().nullable(),
  unit: z.string().nullable(),
  price: z.string(),
  currency: z.string().default("EUR"),
});

export type IdsConnectSearchHit = z.infer<typeof idsConnectSearchHitSchema>;

export const idsConnectSearchRequestSchema = z.object({
  q: z.string().max(500).optional(),
  cursor: z.string().nullable().optional(),
});

export const idsConnectSearchResponseSchema = z.object({
  hits: z.array(idsConnectSearchHitSchema),
  nextCursor: z.string().nullable(),
});

export type IdsConnectSearchResponse = z.infer<
  typeof idsConnectSearchResponseSchema
>;

export const idsConnectCartLineSchema = z.object({
  externalId: z.string().min(1),
  quantity: z.string().min(1).max(40),
});

export const idsConnectCartPatchRequestSchema = z.object({
  lines: z.array(idsConnectCartLineSchema),
});

export type IdsConnectCartPatchRequest = z.infer<
  typeof idsConnectCartPatchRequestSchema
>;

export const idsConnectCartSnapshotSchema = z.object({
  lines: z.array(
    z.object({
      externalId: z.string(),
      sku: z.string(),
      name: z.string().nullable(),
      quantity: z.string(),
      unit: z.string().nullable(),
      unitPrice: z.string(),
      currency: z.string(),
    }),
  ),
});

export const idsConnectCartRowSchema = z.object({
  id: z.string().uuid(),
  supplierId: z.string().uuid(),
  externalCartId: z.string().nullable(),
  status: z.enum(["draft", "submitted", "error"]),
  snapshot: idsConnectCartSnapshotSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type IdsConnectCartRow = z.infer<typeof idsConnectCartRowSchema>;

export const idsConnectCartCreateResponseSchema = z.object({
  cart: idsConnectCartRowSchema,
});

export const idsConnectCartPatchResponseSchema = z.object({
  cart: idsConnectCartRowSchema,
});

export const idsConnectCartSubmitResponseSchema = z.object({
  cart: idsConnectCartRowSchema,
  submit: z.object({
    status: z.string(),
    redirectUrl: z.string().url().nullable().optional(),
    message: z.string().optional(),
  }),
});

export type IdsConnectCartSubmitResponse = z.infer<
  typeof idsConnectCartSubmitResponseSchema
>;
