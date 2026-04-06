import { z } from "zod";

export const salesReminderTemplateLocaleSchema = z.enum(["de", "en"]);
export type SalesReminderTemplateLocale = z.infer<
  typeof salesReminderTemplateLocaleSchema
>;

export const SALES_REMINDER_TEMPLATE_LEVEL_MIN = 1;
export const SALES_REMINDER_TEMPLATE_LEVEL_MAX = 10;

export const salesReminderTemplateLevelSchema = z
  .number()
  .int()
  .min(SALES_REMINDER_TEMPLATE_LEVEL_MIN)
  .max(SALES_REMINDER_TEMPLATE_LEVEL_MAX);

export const salesReminderTemplateRowSchema = z.object({
  level: salesReminderTemplateLevelSchema,
  bodyText: z.string().nullable(),
  feeCents: z.number().int().min(0).max(99_999_999).nullable(),
  updatedAt: z.string().nullable(),
});

export const salesReminderTemplatesListResponseSchema = z.object({
  templates: z.array(salesReminderTemplateRowSchema),
});

export const salesReminderTemplatesPutItemSchema = z.object({
  level: salesReminderTemplateLevelSchema,
  /** Leer oder nur Leerzeichen wird wie „Standardtext“ behandelt. */
  bodyText: z.string().max(8000),
  /** `null`: keine Gebuehrzeile im PDF/Druck. */
  feeCents: z.number().int().min(0).max(99_999_999).nullable(),
});

export const salesReminderTemplatesPutBodySchema = z.object({
  locale: salesReminderTemplateLocaleSchema,
  items: z
    .array(salesReminderTemplatesPutItemSchema)
    .min(1)
    .max(SALES_REMINDER_TEMPLATE_LEVEL_MAX),
});

export const salesReminderTemplatesResolvedResponseSchema = z.object({
  introText: z.string(),
  feeCents: z.number().int().nullable(),
});
