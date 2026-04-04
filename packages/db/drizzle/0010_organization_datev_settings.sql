CREATE TABLE "organization_datev_settings" (
	"tenant_id" text PRIMARY KEY NOT NULL,
	"advisor_number" text,
	"client_number" text,
	"default_debtor_account" text,
	"default_revenue_account" text,
	"default_vat_key" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization_datev_settings" ADD CONSTRAINT "organization_datev_settings_tenant_id_organizations_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("tenant_id") ON DELETE cascade ON UPDATE no action;