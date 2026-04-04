CREATE TABLE "employee_activity_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"employee_id" uuid,
	"actor_sub" text NOT NULL,
	"action" text NOT NULL,
	"detail" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "employee_activity_events" ADD CONSTRAINT "employee_activity_events_tenant_id_organizations_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_activity_events" ADD CONSTRAINT "employee_activity_events_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "employee_activity_events_employee_created_idx" ON "employee_activity_events" USING btree ("employee_id","created_at");--> statement-breakpoint
CREATE INDEX "employee_activity_events_tenant_created_idx" ON "employee_activity_events" USING btree ("tenant_id","created_at");