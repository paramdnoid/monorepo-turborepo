CREATE TABLE "sales_lifecycle_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"actor_sub" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" text NOT NULL,
	"from_status" text,
	"to_status" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sales_lifecycle_events" ADD CONSTRAINT "sales_lifecycle_events_tenant_id_organizations_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("tenant_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "sales_lifecycle_events_tenant_created_idx" ON "sales_lifecycle_events" USING btree ("tenant_id","created_at");
--> statement-breakpoint
CREATE INDEX "sales_lifecycle_events_entity_created_idx" ON "sales_lifecycle_events" USING btree ("entity_type","entity_id","created_at");
