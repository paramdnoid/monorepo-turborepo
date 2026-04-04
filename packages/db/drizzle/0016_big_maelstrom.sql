CREATE TABLE "scheduling_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"date" date NOT NULL,
	"start_time" time NOT NULL,
	"title" text NOT NULL,
	"place" text,
	"reminder_minutes_before" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scheduling_assignments" ADD CONSTRAINT "scheduling_assignments_tenant_id_organizations_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduling_assignments" ADD CONSTRAINT "scheduling_assignments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scheduling_assignments_tenant_date_start_idx" ON "scheduling_assignments" USING btree ("tenant_id","date","start_time");--> statement-breakpoint
CREATE INDEX "scheduling_assignments_employee_date_start_idx" ON "scheduling_assignments" USING btree ("employee_id","date","start_time");