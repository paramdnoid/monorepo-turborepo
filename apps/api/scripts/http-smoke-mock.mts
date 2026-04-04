/**
 * Smoke-Test gegen echte DB ohne Keycloak: `createApp` mit Mock-JWT.
 *
 * Voraussetzung: Migration (`drizzle-kit migrate`). Legt bei Bedarf eine Zeile in
 * `organizations` an (gleiche Logik wie `provisionOrganizationIfAbsent`), damit kein
 * separates `db:seed` nötig ist.
 *
 *   DATABASE_URL in Repo-Root `.env.local` (siehe `/.env.example`)
 *   pnpm --filter api run smoke:http
 */
import { config } from "dotenv";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { count, eq } from "drizzle-orm";

import {
  provisionOrganizationIfAbsent,
  salesInvoices,
  salesQuoteLines,
  salesQuotes,
} from "@repo/db";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = resolve(__dirname, "../../..");
config({ path: join(repoRoot, ".env") });
config({ path: join(repoRoot, ".env.local"), override: true });

const tenantId = process.env.SEED_TENANT_ID?.trim() || "local-dev-tenant";
const orgName = process.env.SEED_ORG_NAME?.trim() || "Local Dev GmbH";
const tradeSlug = process.env.SEED_TRADE_SLUG?.trim() || "maler";

const { createApp } = await import("../src/app.js");
const { getOptionalDb } = await import("../src/db.js");

const db = getOptionalDb();
if (!db) {
  console.error("DATABASE_URL fehlt (Smoke braucht echte DB).");
  process.exit(1);
}

const prov = await provisionOrganizationIfAbsent(db, {
  tenantId,
  name: orgName,
  tradeSlug,
});
console.log("Smoke: Mandant", prov, tenantId);

const app = createApp({
  verifyAccessToken: async () => ({ sub: "smoke-user", tenantId }),
  getDb: getOptionalDb,
});

const meRes = await app.request("http://localhost/v1/me", {
  headers: { Authorization: "Bearer mock" },
});
const meText = await meRes.text();
console.log("GET /v1/me", meRes.status, meText);

const syncRes = await app.request("http://localhost/v1/sync", {
  method: "POST",
  headers: {
    Authorization: "Bearer mock",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    deviceId: "550e8400-e29b-41d4-a716-446655440000",
    mutations: [
      {
        idempotencyKey: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
        entityType: "project",
        operation: "create",
        payload: { title: "Smoke-Projekt" },
      },
    ],
  }),
});
const syncText = await syncRes.text();
console.log("POST /v1/sync", syncRes.status, syncText);

if (!meRes.ok || !syncRes.ok) {
  process.exit(1);
}

const [quoteCountRow] = await db
  .select({ n: count() })
  .from(salesQuotes)
  .where(eq(salesQuotes.tenantId, tenantId));
const quoteCount = Number(quoteCountRow?.n ?? 0);
if (quoteCount === 0) {
  const inserted = await db
    .insert(salesQuotes)
    .values({
      tenantId,
      documentNumber: "AG-SMOKE-0001",
      customerLabel: "Smoke Kunde AG",
      status: "sent",
      totalCents: 99_99,
      validUntil: new Date(Date.now() + 30 * 86_400_000),
    })
    .returning({ id: salesQuotes.id });
  const qid = inserted[0]?.id;
  if (qid) {
    await db.insert(salesQuoteLines).values({
      quoteId: qid,
      sortIndex: 0,
      description: "Smoke-Position",
      quantity: "1",
      unit: "Stk",
      unitPriceCents: 99_99,
      lineTotalCents: 99_99,
    });
    await db.insert(salesInvoices).values({
      tenantId,
      documentNumber: "RE-SMOKE-0001",
      customerLabel: "Smoke Kunde AG",
      status: "sent",
      totalCents: 99_99,
      quoteId: qid,
      issuedAt: new Date(),
      dueAt: new Date(Date.now() + 14 * 86_400_000),
    });
  }
  console.log("Smoke: Demo-Belege angelegt (sales_quotes / sales_invoices)");
}

const quotesListRes = await app.request("http://localhost/v1/sales/quotes", {
  headers: { Authorization: "Bearer mock" },
});
const quotesListText = await quotesListRes.text();
console.log("GET /v1/sales/quotes", quotesListRes.status, quotesListText);

if (!quotesListRes.ok) {
  process.exit(1);
}

type QuotesListJson = { quotes: { id: string }[] };
let quotesPayload: QuotesListJson;
try {
  quotesPayload = JSON.parse(quotesListText) as QuotesListJson;
} catch {
  console.error("Smoke: GET /v1/sales/quotes response is not JSON");
  process.exit(1);
}
const smokeQuoteId = quotesPayload.quotes[0]?.id;
if (smokeQuoteId) {
  const quoteDetailRes = await app.request(
    `http://localhost/v1/sales/quotes/${encodeURIComponent(smokeQuoteId)}`,
    { headers: { Authorization: "Bearer mock" } },
  );
  const quoteDetailText = await quoteDetailRes.text();
  if (!quoteDetailRes.ok) {
    console.error(
      "GET /v1/sales/quotes/:id",
      quoteDetailRes.status,
      quoteDetailText.slice(0, 200),
    );
    process.exit(1);
  }
  let quoteLines = 0;
  try {
    const qd = JSON.parse(quoteDetailText) as { quote?: { lines?: unknown[] } };
    quoteLines = qd.quote?.lines?.length ?? 0;
  } catch {
    console.error("Smoke: quote detail is not JSON");
    process.exit(1);
  }
  const fromQuoteRes = await app.request(
    `http://localhost/v1/sales/quotes/${encodeURIComponent(smokeQuoteId)}/invoices`,
    {
      method: "POST",
      headers: {
        Authorization: "Bearer mock",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        documentNumber: `RE-SMOKE-FROMQ-${Date.now()}`,
      }),
    },
  );
  const fromQuoteText = await fromQuoteRes.text();
  console.log(
    "POST /v1/sales/quotes/:id/invoices",
    fromQuoteRes.status,
    fromQuoteText.slice(0, 240),
  );
  if (!fromQuoteRes.ok) {
    process.exit(1);
  }
  let invLines = -1;
  try {
    const inv = JSON.parse(fromQuoteText) as { invoice?: { lines?: unknown[] } };
    invLines = inv.invoice?.lines?.length ?? 0;
  } catch {
    console.error("Smoke: invoice-from-quote response is not JSON");
    process.exit(1);
  }
  if (invLines !== quoteLines) {
    console.error("Smoke: invoice line count !== quote line count", {
      quoteLines,
      invLines,
    });
    process.exit(1);
  }
}

const customersListRes = await app.request("http://localhost/v1/customers", {
  headers: { Authorization: "Bearer mock" },
});
const customersListText = await customersListRes.text();
console.log("GET /v1/customers", customersListRes.status, customersListText);
if (!customersListRes.ok) {
  process.exit(1);
}

const customersPostRes = await app.request("http://localhost/v1/customers", {
  method: "POST",
  headers: {
    Authorization: "Bearer mock",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    displayName: "Smoke Stammdaten AG",
    customerNumber: `K-SMOKE-${Date.now()}`,
    defaultAddress: {
      kind: "billing",
      recipientName: "Smoke Stammdaten AG",
      street: "Testweg 2",
      postalCode: "10115",
      city: "Berlin",
      country: "DE",
      isDefault: true,
    },
  }),
});
const customersPostText = await customersPostRes.text();
console.log("POST /v1/customers", customersPostRes.status, customersPostText.slice(0, 200));
if (!customersPostRes.ok) {
  process.exit(1);
}

const datevSettingsGet = await app.request("http://localhost/v1/datev/settings", {
  headers: { Authorization: "Bearer mock" },
});
const datevSettingsGetText = await datevSettingsGet.text();
console.log("GET /v1/datev/settings", datevSettingsGet.status, datevSettingsGetText);
if (!datevSettingsGet.ok) {
  process.exit(1);
}

const datevSettingsPatch = await app.request("http://localhost/v1/datev/settings", {
  method: "PATCH",
  headers: {
    Authorization: "Bearer mock",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    advisorNumber: "12345",
    clientNumber: "67890",
    defaultDebtorAccount: "1200",
    defaultRevenueAccount: "8400",
    defaultVatKey: "9",
  }),
});
const datevSettingsPatchText = await datevSettingsPatch.text();
console.log("PATCH /v1/datev/settings", datevSettingsPatch.status, datevSettingsPatchText);
if (!datevSettingsPatch.ok) {
  process.exit(1);
}

const datevExport = await app.request(
  "http://localhost/v1/datev/export/bookings.csv?from=2020-01-01&to=2030-12-31",
  { headers: { Authorization: "Bearer mock" } },
);
const datevExportCsv = await datevExport.text();
console.log(
  "GET /v1/datev/export/bookings.csv",
  datevExport.status,
  datevExportCsv.slice(0, 120).replace(/\r?\n/g, "\\n"),
);
if (!datevExport.ok || !datevExportCsv.includes("Umsatz")) {
  process.exit(1);
}
