CREATE TABLE "sales_invoice_reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"invoice_id" uuid NOT NULL,
	"level" integer NOT NULL,
	"sent_at" timestamp with time zone NOT NULL,
	"channel" text DEFAULT 'manual' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sales_invoice_reminders" ADD CONSTRAINT "sales_invoice_reminders_tenant_id_organizations_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoice_reminders" ADD CONSTRAINT "sales_invoice_reminders_invoice_id_sales_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."sales_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sales_invoice_reminders_invoice_idx" ON "sales_invoice_reminders" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "sales_invoice_reminders_tenant_sent_at_idx" ON "sales_invoice_reminders" USING btree ("tenant_id","sent_at");