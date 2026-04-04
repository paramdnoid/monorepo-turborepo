CREATE TABLE "catalog_articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"supplier_id" uuid NOT NULL,
	"supplier_sku" text NOT NULL,
	"name" text,
	"unit" text,
	"ean" text,
	"last_batch_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_articles_tenant_supplier_sku" UNIQUE("tenant_id","supplier_id","supplier_sku")
);
--> statement-breakpoint
CREATE TABLE "catalog_import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"supplier_id" uuid,
	"filename" text NOT NULL,
	"source_format" text NOT NULL,
	"file_sha256" text NOT NULL,
	"status" text NOT NULL,
	"parse_errors" jsonb,
	"warnings" jsonb,
	"article_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_at" timestamp with time zone,
	"purge_after_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_import_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"sort_index" integer NOT NULL,
	"supplier_sku" text NOT NULL,
	"name" text,
	"unit" text,
	"price" text NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"ean" text,
	"group_key" text
);
--> statement-breakpoint
CREATE TABLE "catalog_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"article_id" uuid NOT NULL,
	"batch_id" uuid NOT NULL,
	"price" text NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"valid_from" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"source_kind" text NOT NULL,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "catalog_articles" ADD CONSTRAINT "catalog_articles_tenant_id_organizations_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_articles" ADD CONSTRAINT "catalog_articles_supplier_id_catalog_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."catalog_suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_articles" ADD CONSTRAINT "catalog_articles_last_batch_id_catalog_import_batches_id_fk" FOREIGN KEY ("last_batch_id") REFERENCES "public"."catalog_import_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_import_batches" ADD CONSTRAINT "catalog_import_batches_tenant_id_organizations_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_import_batches" ADD CONSTRAINT "catalog_import_batches_supplier_id_catalog_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."catalog_suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_import_lines" ADD CONSTRAINT "catalog_import_lines_batch_id_catalog_import_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."catalog_import_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_prices" ADD CONSTRAINT "catalog_prices_article_id_catalog_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."catalog_articles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_prices" ADD CONSTRAINT "catalog_prices_batch_id_catalog_import_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."catalog_import_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_suppliers" ADD CONSTRAINT "catalog_suppliers_tenant_id_organizations_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("tenant_id") ON DELETE cascade ON UPDATE no action;