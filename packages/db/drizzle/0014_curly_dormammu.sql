ALTER TABLE "employees" ADD COLUMN "employee_no" text;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "first_name" text;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "last_name" text;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "email" text;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "status" text DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "employment_type" text DEFAULT 'FULL_TIME' NOT NULL;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_tenant_employee_no" UNIQUE("tenant_id","employee_no");