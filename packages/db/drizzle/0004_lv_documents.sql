CREATE TABLE "lv_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"project_id" uuid,
	"filename" text NOT NULL,
	"source_format" text NOT NULL,
	"file_sha256" text NOT NULL,
	"status" text NOT NULL,
	"raw_text" text NOT NULL,
	"parse_errors" jsonb,
	"warnings" jsonb,
	"outline_snapshot" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_at" timestamp with time zone,
	"purge_after_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lv_nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"parent_id" uuid,
	"sort_index" integer NOT NULL,
	"node_type" text NOT NULL,
	"outline_number" text,
	"short_text" text,
	"long_text" text,
	"quantity" text,
	"unit" text
);
--> statement-breakpoint
ALTER TABLE "lv_documents" ADD CONSTRAINT "lv_documents_tenant_id_organizations_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lv_documents" ADD CONSTRAINT "lv_documents_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lv_nodes" ADD CONSTRAINT "lv_nodes_document_id_lv_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."lv_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lv_nodes" ADD CONSTRAINT "lv_nodes_parent_id_lv_nodes_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."lv_nodes"("id") ON DELETE cascade ON UPDATE no action;