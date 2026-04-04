CREATE TABLE "employee_availability_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"weekday" integer NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"sort_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"display_name" text NOT NULL,
	"role_label" text,
	"notes" text,
	"private_address_label" text,
	"private_address_line2" text,
	"private_recipient_name" text,
	"private_street" text,
	"private_postal_code" text,
	"private_city" text,
	"private_country" text,
	"latitude" double precision,
	"longitude" double precision,
	"geocoded_at" timestamp with time zone,
	"geocode_source" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "employee_availability_rules" ADD CONSTRAINT "employee_availability_rules_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_tenant_id_organizations_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "employee_availability_rules_employee_id_idx" ON "employee_availability_rules" USING btree ("employee_id");