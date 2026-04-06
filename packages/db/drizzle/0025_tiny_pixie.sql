ALTER TABLE "customers" ADD COLUMN "payment_terms_days" integer;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "cash_discount_percent_bps" integer;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "cash_discount_days" integer;