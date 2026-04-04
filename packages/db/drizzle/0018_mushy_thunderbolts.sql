CREATE TABLE "employee_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"employee_id" uuid NOT NULL,
	"kind" text DEFAULT 'document' NOT NULL,
	"filename" text NOT NULL,
	"content_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"storage_relative_path" text NOT NULL,
	"sha256" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employee_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"from_employee_id" uuid NOT NULL,
	"to_employee_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employee_relationships_tenant_edge_kind" UNIQUE("tenant_id","from_employee_id","to_employee_id","kind")
);
--> statement-breakpoint
CREATE TABLE "employee_skill_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employee_skill_links_employee_skill" UNIQUE("employee_id","skill_id")
);
--> statement-breakpoint
CREATE TABLE "employee_skills_catalog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"name" text NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employee_skills_catalog_tenant_name" UNIQUE("tenant_id","name")
);
--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "profile_image_storage_relative_path" text;--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "profile_image_content_type" text;--> statement-breakpoint
ALTER TABLE "employee_attachments" ADD CONSTRAINT "employee_attachments_tenant_id_organizations_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_attachments" ADD CONSTRAINT "employee_attachments_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_relationships" ADD CONSTRAINT "employee_relationships_tenant_id_organizations_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_relationships" ADD CONSTRAINT "employee_relationships_from_employee_id_employees_id_fk" FOREIGN KEY ("from_employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_relationships" ADD CONSTRAINT "employee_relationships_to_employee_id_employees_id_fk" FOREIGN KEY ("to_employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_skill_links" ADD CONSTRAINT "employee_skill_links_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_skill_links" ADD CONSTRAINT "employee_skill_links_skill_id_employee_skills_catalog_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."employee_skills_catalog"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_skills_catalog" ADD CONSTRAINT "employee_skills_catalog_tenant_id_organizations_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("tenant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "employee_attachments_employee_created_idx" ON "employee_attachments" USING btree ("employee_id","created_at");--> statement-breakpoint
CREATE INDEX "employee_attachments_tenant_employee_idx" ON "employee_attachments" USING btree ("tenant_id","employee_id");--> statement-breakpoint
CREATE INDEX "employee_relationships_from_employee_idx" ON "employee_relationships" USING btree ("from_employee_id");--> statement-breakpoint
CREATE INDEX "employee_relationships_to_employee_idx" ON "employee_relationships" USING btree ("to_employee_id");--> statement-breakpoint
CREATE INDEX "employee_relationships_tenant_kind_idx" ON "employee_relationships" USING btree ("tenant_id","kind");--> statement-breakpoint
CREATE INDEX "employee_skill_links_employee_id_idx" ON "employee_skill_links" USING btree ("employee_id");--> statement-breakpoint
CREATE INDEX "employee_skill_links_skill_id_idx" ON "employee_skill_links" USING btree ("skill_id");--> statement-breakpoint
CREATE INDEX "employee_skills_catalog_tenant_archived_idx" ON "employee_skills_catalog" USING btree ("tenant_id","archived_at");