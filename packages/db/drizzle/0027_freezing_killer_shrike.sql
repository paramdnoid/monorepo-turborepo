CREATE TABLE "work_time_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"work_date" date NOT NULL,
	"duration_minutes" integer NOT NULL,
	"project_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "work_time_entries" ADD CONSTRAINT "work_time_entries_tenant_id_organizations_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_time_entries" ADD CONSTRAINT "work_time_entries_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_time_entries" ADD CONSTRAINT "work_time_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "work_time_entries_tenant_work_date_idx" ON "work_time_entries" USING btree ("tenant_id","work_date");--> statement-breakpoint
CREATE INDEX "work_time_entries_tenant_employee_idx" ON "work_time_entries" USING btree ("tenant_id","employee_id");--> statement-breakpoint
CREATE INDEX "work_time_entries_tenant_project_idx" ON "work_time_entries" USING btree ("tenant_id","project_id");