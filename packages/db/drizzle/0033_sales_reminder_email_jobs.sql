CREATE TABLE "sales_reminder_email_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"invoice_id" uuid NOT NULL,
	"reminder_id" uuid NOT NULL,
	"to_email" text NOT NULL,
	"subject" text NOT NULL,
	"body_text" text NOT NULL,
	"locale" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"last_error" text,
	"created_by_sub" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "sales_reminder_email_jobs" ADD CONSTRAINT "sales_reminder_email_jobs_tenant_id_organizations_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_reminder_email_jobs" ADD CONSTRAINT "sales_reminder_email_jobs_invoice_id_sales_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."sales_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_reminder_email_jobs" ADD CONSTRAINT "sales_reminder_email_jobs_reminder_id_sales_invoice_reminders_id_fk" FOREIGN KEY ("reminder_id") REFERENCES "public"."sales_invoice_reminders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sales_reminder_email_jobs_tenant_created_idx" ON "sales_reminder_email_jobs" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "sales_reminder_email_jobs_invoice_reminder_idx" ON "sales_reminder_email_jobs" USING btree ("invoice_id","reminder_id");