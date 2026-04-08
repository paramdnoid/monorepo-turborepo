CREATE TABLE "ids_connect_carts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "organizations"("tenant_id") ON DELETE CASCADE,
  "supplier_id" uuid NOT NULL REFERENCES "catalog_suppliers"("id") ON DELETE CASCADE,
  "external_cart_id" text,
  "status" text NOT NULL DEFAULT 'draft',
  "snapshot" jsonb NOT NULL DEFAULT '{"lines":[]}'::jsonb,
  "purge_after_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "ids_connect_carts_tenant_id_idx" ON "ids_connect_carts" ("tenant_id");
CREATE INDEX "ids_connect_carts_supplier_id_idx" ON "ids_connect_carts" ("supplier_id");
CREATE INDEX "ids_connect_carts_purge_after_at_idx" ON "ids_connect_carts" ("purge_after_at");
