ALTER TABLE "organizations" ADD COLUMN "sender_street" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "sender_house_number" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "sender_postal_code" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "sender_city" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "sender_country" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "sender_latitude" double precision;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "sender_longitude" double precision;