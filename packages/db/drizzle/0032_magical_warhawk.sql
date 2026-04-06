CREATE TABLE "sales_camt_import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"filename" text,
	"file_sha256" text NOT NULL,
	"parse_warnings" jsonb,
	"entry_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_camt_import_batches_tenant_hash_unique" UNIQUE("tenant_id","file_sha256")
);
--> statement-breakpoint
CREATE TABLE "sales_camt_import_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"line_index" integer NOT NULL,
	"cdt_dbt_ind" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text NOT NULL,
	"booking_date" date,
	"paid_at" timestamp with time zone,
	"remittance_info" text NOT NULL,
	"debtor_name" text NOT NULL,
	"skipped" boolean DEFAULT false NOT NULL,
	"skip_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_camt_import_lines_batch_line_unique" UNIQUE("batch_id","line_index")
);
--> statement-breakpoint
ALTER TABLE "sales_camt_import_batches" ADD CONSTRAINT "sales_camt_import_batches_tenant_id_organizations_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_camt_import_lines" ADD CONSTRAINT "sales_camt_import_lines_batch_id_sales_camt_import_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."sales_camt_import_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sales_camt_import_batches_tenant_created_idx" ON "sales_camt_import_batches" USING btree ("tenant_id","created_at");--> statement-breakpoint
CREATE INDEX "sales_camt_import_lines_batch_idx" ON "sales_camt_import_lines" USING btree ("batch_id");