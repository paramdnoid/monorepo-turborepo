CREATE TABLE "sales_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"document_number" text NOT NULL,
	"customer_label" text NOT NULL,
	"status" text NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"total_cents" integer DEFAULT 0 NOT NULL,
	"quote_id" uuid,
	"project_id" uuid,
	"issued_at" timestamp with time zone,
	"due_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_invoices_tenant_document_number" UNIQUE("tenant_id","document_number")
);
--> statement-breakpoint
CREATE TABLE "sales_quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"document_number" text NOT NULL,
	"customer_label" text NOT NULL,
	"status" text NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"total_cents" integer DEFAULT 0 NOT NULL,
	"project_id" uuid,
	"valid_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_quotes_tenant_document_number" UNIQUE("tenant_id","document_number")
);
--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_tenant_id_organizations_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_quote_id_sales_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."sales_quotes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_quotes" ADD CONSTRAINT "sales_quotes_tenant_id_organizations_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_quotes" ADD CONSTRAINT "sales_quotes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;