ALTER TABLE "scheduling_assignments" ADD COLUMN "place_street" text;--> statement-breakpoint
ALTER TABLE "scheduling_assignments" ADD COLUMN "place_house_number" text;--> statement-breakpoint
ALTER TABLE "scheduling_assignments" ADD COLUMN "place_postal_code" text;--> statement-breakpoint
ALTER TABLE "scheduling_assignments" ADD COLUMN "place_city" text;--> statement-breakpoint
ALTER TABLE "scheduling_assignments" ADD COLUMN "place_country" text;--> statement-breakpoint
ALTER TABLE "scheduling_assignments" ADD COLUMN "place_latitude" double precision;--> statement-breakpoint
ALTER TABLE "scheduling_assignments" ADD COLUMN "place_longitude" double precision;