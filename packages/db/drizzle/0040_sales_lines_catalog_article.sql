ALTER TABLE "sales_quote_lines" ADD COLUMN "catalog_article_id" uuid;
ALTER TABLE "sales_invoice_lines" ADD COLUMN "catalog_article_id" uuid;

ALTER TABLE "sales_quote_lines" ADD CONSTRAINT "sales_quote_lines_catalog_article_id_catalog_articles_id_fk" FOREIGN KEY ("catalog_article_id") REFERENCES "public"."catalog_articles"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "sales_invoice_lines" ADD CONSTRAINT "sales_invoice_lines_catalog_article_id_catalog_articles_id_fk" FOREIGN KEY ("catalog_article_id") REFERENCES "public"."catalog_articles"("id") ON DELETE set null ON UPDATE no action;

CREATE INDEX "sales_quote_lines_catalog_article_id_idx" ON "sales_quote_lines" USING btree ("catalog_article_id");
CREATE INDEX "sales_invoice_lines_catalog_article_id_idx" ON "sales_invoice_lines" USING btree ("catalog_article_id");
