import { z } from "zod";

export const gaebParseIssueSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export type GaebParseIssue = z.infer<typeof gaebParseIssueSchema>;

export const gaebLvNodeSchema = z.object({
  id: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  sortIndex: z.number().int(),
  nodeType: z.enum(["section", "item"]),
  outlineNumber: z.string().nullable(),
  shortText: z.string().nullable(),
  longText: z.string().nullable(),
  quantity: z.string().nullable(),
  unit: z.string().nullable(),
});

export type GaebLvNode = z.infer<typeof gaebLvNodeSchema>;

export const gaebLvDocumentSummarySchema = z.object({
  id: z.string().uuid(),
  filename: z.string(),
  sourceFormat: z.string(),
  status: z.enum(["pending_review", "failed", "approved"]),
  projectId: z.string().uuid().nullable(),
  fileSha256: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  approvedAt: z.string().nullable(),
  purgeAfterAt: z.string(),
  parseErrors: z.array(gaebParseIssueSchema).nullable(),
  warnings: z.array(gaebParseIssueSchema).nullable(),
});

export type GaebLvDocumentSummary = z.infer<typeof gaebLvDocumentSummarySchema>;

export const gaebLvDocumentDetailSchema = gaebLvDocumentSummarySchema.extend({
  nodes: z.array(gaebLvNodeSchema),
  outlineSnapshot: z.array(z.string()).nullable(),
  diff: z
    .object({
      added: z.array(z.string()),
      missing: z.array(z.string()),
    })
    .optional(),
});

export type GaebLvDocumentDetail = z.infer<typeof gaebLvDocumentDetailSchema>;

export const gaebImportsListResponseSchema = z.object({
  documents: z.array(gaebLvDocumentSummarySchema),
});

export const gaebPatchDocumentSchema = z.object({
  status: z.literal("approved"),
});

export const projectListResponseSchema = z.object({
  projects: z.array(
    z.object({
      id: z.string().uuid(),
      title: z.string(),
      createdAt: z.string(),
    }),
  ),
});
