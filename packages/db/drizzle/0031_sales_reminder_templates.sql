CREATE TABLE "sales_reminder_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"locale" text NOT NULL,
	"level" integer NOT NULL,
	"body_text" text,
	"fee_cents" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_reminder_templates_tenant_locale_level_unique" UNIQUE("tenant_id","locale","level")
);
--> statement-breakpoint
ALTER TABLE "sales_reminder_templates" ADD CONSTRAINT "sales_reminder_templates_tenant_id_organizations_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sales_reminder_templates_tenant_locale_idx" ON "sales_reminder_templates" USING btree ("tenant_id","locale");