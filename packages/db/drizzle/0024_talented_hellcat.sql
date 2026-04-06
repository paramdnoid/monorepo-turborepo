ALTER TABLE "projects" ADD COLUMN "customer_id" uuid;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "site_address_id" uuid;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_site_address_id_customer_addresses_id_fk" FOREIGN KEY ("site_address_id") REFERENCES "public"."customer_addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "projects_tenant_customer_idx" ON "projects" USING btree ("tenant_id","customer_id");--> statement-breakpoint
CREATE INDEX "projects_site_address_idx" ON "projects" USING btree ("site_address_id");