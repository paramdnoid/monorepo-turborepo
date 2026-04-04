CREATE TABLE "employee_availability_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"date" date NOT NULL,
	"is_unavailable" boolean DEFAULT false NOT NULL,
	"start_time" time,
	"end_time" time,
	"crosses_midnight" boolean DEFAULT false NOT NULL,
	"sort_index" integer DEFAULT 0 NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "employee_availability_rules" ADD COLUMN "crosses_midnight" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "employee_availability_rules" ADD COLUMN "valid_from" date;--> statement-breakpoint
ALTER TABLE "employee_availability_rules" ADD COLUMN "valid_to" date;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "availability_time_zone" text DEFAULT 'Europe/Berlin' NOT NULL;--> statement-breakpoint
ALTER TABLE "employee_availability_overrides" ADD CONSTRAINT "employee_availability_overrides_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "employee_availability_overrides_employee_id_idx" ON "employee_availability_overrides" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "employee_availability_overrides_employee_date_idx" ON "employee_availability_overrides" USING btree ("employee_id","date","sort_index");