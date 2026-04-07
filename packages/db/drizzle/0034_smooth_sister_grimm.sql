ALTER TABLE "sales_invoice_lines" ADD COLUMN "tax_rate_bps" integer DEFAULT 1900 NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_invoice_lines" ADD COLUMN "discount_bps" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "billing_type" text DEFAULT 'invoice' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "parent_invoice_id" uuid;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "credit_for_invoice_id" uuid;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "is_finalized" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "finalized_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "snapshot_hash" text;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "snapshot_json" jsonb;--> statement-breakpoint
ALTER TABLE "sales_quote_lines" ADD COLUMN "tax_rate_bps" integer DEFAULT 1900 NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_quote_lines" ADD COLUMN "discount_bps" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_parent_invoice_id_sales_invoices_id_fk" FOREIGN KEY ("parent_invoice_id") REFERENCES "public"."sales_invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_credit_for_invoice_id_sales_invoices_id_fk" FOREIGN KEY ("credit_for_invoice_id") REFERENCES "public"."sales_invoices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sales_invoices_tenant_parent_idx" ON "sales_invoices" USING btree ("tenant_id","parent_invoice_id");--> statement-breakpoint
CREATE INDEX "sales_invoices_tenant_credit_for_idx" ON "sales_invoices" USING btree ("tenant_id","credit_for_invoice_id");