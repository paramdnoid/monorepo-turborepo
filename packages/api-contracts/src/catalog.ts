import { z } from "zod";

export const catalogParseIssueSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export type CatalogParseIssue = z.infer<typeof catalogParseIssueSchema>;

/** Meta fuer `sourceKind: ids_connect` (API-Key wird in Responses redacted). */
export const catalogIdsConnectMetaSchema = z
  .object({
    idsConnectMode: z.enum(["mock", "http"]),
    idsConnectBaseUrl: z.string().url().optional(),
    idsConnectApiKey: z.string().max(4000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.idsConnectMode === "http" && !data.idsConnectBaseUrl?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "idsConnectBaseUrl is required when idsConnectMode is http",
        path: ["idsConnectBaseUrl"],
      });
    }
  });

export type CatalogIdsConnectMeta = z.infer<typeof catalogIdsConnectMetaSchema>;

export const catalogSupplierSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  sourceKind: z.string(),
  createdAt: z.string(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export type CatalogSupplier = z.infer<typeof catalogSupplierSchema>;

export const catalogSuppliersListResponseSchema = z.object({
  suppliers: z.array(catalogSupplierSchema),
});

export const catalogCreateSupplierSchema = z.discriminatedUnion("sourceKind", [
  z.object({
    name: z.string().min(1).max(200),
    sourceKind: z.literal("datanorm"),
  }),
  z.object({
    name: z.string().min(1).max(200),
    sourceKind: z.literal("bmecat"),
  }),
  z.object({
    name: z.string().min(1).max(200),
    sourceKind: z.literal("ids_connect"),
    meta: catalogIdsConnectMetaSchema,
  }),
]);

export type CatalogCreateSupplierInput = z.infer<
  typeof catalogCreateSupplierSchema
>;

export const catalogPatchSupplierSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  meta: catalogIdsConnectMetaSchema.optional(),
});

export type CatalogPatchSupplierInput = z.infer<
  typeof catalogPatchSupplierSchema
>;

export const catalogImportLineSchema = z.object({
  id: z.string().uuid(),
  sortIndex: z.number().int(),
  supplierSku: z.string(),
  name: z.string().nullable(),
  unit: z.string().nullable(),
  price: z.string(),
  currency: z.string(),
  ean: z.string().nullable(),
  groupKey: z.string().nullable(),
});

export type CatalogImportLine = z.infer<typeof catalogImportLineSchema>;

export const catalogImportBatchSummarySchema = z.object({
  id: z.string().uuid(),
  supplierId: z.string().uuid().nullable(),
  filename: z.string(),
  sourceFormat: z.string(),
  status: z.enum(["pending_review", "failed", "approved"]),
  fileSha256: z.string(),
  articleCount: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
  approvedAt: z.string().nullable(),
  purgeAfterAt: z.string(),
  parseErrors: z.array(catalogParseIssueSchema).nullable(),
  warnings: z.array(catalogParseIssueSchema).nullable(),
});

export type CatalogImportBatchSummary = z.infer<
  typeof catalogImportBatchSummarySchema
>;

export const catalogImportBatchDetailSchema = catalogImportBatchSummarySchema.extend({
  lines: z.array(catalogImportLineSchema),
  lineTotal: z.number().int(),
  linesTruncated: z.boolean(),
});

export type CatalogImportBatchDetail = z.infer<
  typeof catalogImportBatchDetailSchema
>;

export const catalogImportsListResponseSchema = z.object({
  batches: z.array(catalogImportBatchSummarySchema),
});

export const catalogPatchImportSchema = z.object({
  status: z.literal("approved"),
});

export type CatalogPatchImportInput = z.infer<typeof catalogPatchImportSchema>;

export const catalogArticleListItemSchema = z.object({
  id: z.string().uuid(),
  supplierId: z.string().uuid(),
  supplierName: z.string(),
  supplierSku: z.string(),
  name: z.string().nullable(),
  unit: z.string().nullable(),
  ean: z.string().nullable(),
  price: z.string().nullable(),
  currency: z.string(),
  updatedAt: z.string(),
});

export type CatalogArticleListItem = z.infer<typeof catalogArticleListItemSchema>;

export const catalogArticlesListResponseSchema = z.object({
  articles: z.array(catalogArticleListItemSchema),
  nextCursor: z.string().uuid().nullable(),
});

export type CatalogArticlesListResponse = z.infer<
  typeof catalogArticlesListResponseSchema
>;
