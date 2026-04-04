CREATE TABLE "user_color_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"user_sub" text NOT NULL,
	"favorites" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recent" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_color_preferences_tenant_user" UNIQUE("tenant_id","user_sub")
);
--> statement-breakpoint
CREATE TABLE "team_color_palettes" (
	"tenant_id" text PRIMARY KEY NOT NULL,
	"favorites" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recent" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_by_sub" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_color_preferences" ADD CONSTRAINT "user_color_preferences_tenant_id_organizations_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("tenant_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "team_color_palettes" ADD CONSTRAINT "team_color_palettes_tenant_id_organizations_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."organizations"("tenant_id") ON DELETE cascade ON UPDATE no action;
