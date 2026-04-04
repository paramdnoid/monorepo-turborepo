import { z } from "zod";

export const catalogParseIssueSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export type CatalogParseIssue = z.infer<typeof catalogParseIssueSchema>;

export const catalogSupplierSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  sourceKind: z.string(),
  createdAt: z.string(),
});

export type CatalogSupplier = z.infer<typeof catalogSupplierSchema>;

export const catalogSuppliersListResponseSchema = z.object({
  suppliers: z.array(catalogSupplierSchema),
});

export const catalogCreateSupplierSchema = z.object({
  name: z.string().min(1).max(200),
  sourceKind: z.enum(["datanorm", "bmecat"]),
});

export type CatalogCreateSupplierInput = z.infer<
  typeof catalogCreateSupplierSchema
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
