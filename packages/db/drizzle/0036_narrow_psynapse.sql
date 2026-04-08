ALTER TABLE "customer_addresses" ADD COLUMN "latitude" double precision;--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD COLUMN "longitude" double precision;--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD COLUMN "geocoded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD COLUMN "geocode_source" text;--> statement-breakpoint
ALTER TABLE "scheduling_assignments" ADD COLUMN "planned_duration_minutes" integer DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE "scheduling_assignments" ADD COLUMN "window_start_time" time;--> statement-breakpoint
ALTER TABLE "scheduling_assignments" ADD COLUMN "window_end_time" time;