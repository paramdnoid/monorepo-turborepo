import { z } from "zod";

export const projectAssetKindSchema = z.enum([
  "plan",
  "photo",
  "document",
  "other",
]);

export type ProjectAssetKind = z.infer<typeof projectAssetKindSchema>;

export const projectAssetSummarySchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  kind: projectAssetKindSchema,
  filename: z.string(),
  contentType: z.string(),
  byteSize: z.number().int(),
  sha256: z.string().nullable(),
  createdAt: z.string(),
});

export type ProjectAssetSummary = z.infer<typeof projectAssetSummarySchema>;

export const projectAssetsListResponseSchema = z.object({
  assets: z.array(projectAssetSummarySchema),
});

export const projectAssetUploadResponseSchema = z.object({
  id: z.string().uuid(),
  kind: projectAssetKindSchema,
  filename: z.string(),
  byteSize: z.number().int(),
  contentType: z.string(),
  createdAt: z.string(),
});

export type ProjectAssetUploadResponse = z.infer<
  typeof projectAssetUploadResponseSchema
>;
