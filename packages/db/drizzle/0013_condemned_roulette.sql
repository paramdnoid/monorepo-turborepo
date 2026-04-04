CREATE TABLE "employee_sick_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"from_date" date NOT NULL,
	"to_date" date NOT NULL,
	"confidential_note" text,
	"certificate_required" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_vacation_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"from_date" date NOT NULL,
	"to_date" date NOT NULL,
	"reason" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"decision_note" text,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "employee_sick_reports" ADD CONSTRAINT "employee_sick_reports_tenant_id_organizations_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_sick_reports" ADD CONSTRAINT "employee_sick_reports_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_vacation_requests" ADD CONSTRAINT "employee_vacation_requests_tenant_id_organizations_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_vacation_requests" ADD CONSTRAINT "employee_vacation_requests_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "employee_sick_reports_employee_id_idx" ON "employee_sick_reports" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "employee_sick_reports_tenant_from_idx" ON "employee_sick_reports" USING btree ("tenant_id","from_date");--> statement-breakpoint
CREATE INDEX "employee_vacation_requests_employee_id_idx" ON "employee_vacation_requests" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "employee_vacation_requests_tenant_status_from_idx" ON "employee_vacation_requests" USING btree ("tenant_id","status","from_date");