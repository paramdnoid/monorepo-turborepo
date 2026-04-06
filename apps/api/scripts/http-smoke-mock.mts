/**
 * Smoke-Test gegen echte DB ohne Keycloak: `createApp` mit Mock-JWT.
 *
 * Voraussetzung: Migration (`pnpm --filter @repo/db run db:migrate`). Legt bei Bedarf eine Zeile in
 * `organizations` an (gleiche Logik wie `provisionOrganizationIfAbsent`), damit kein
 * separates `db:seed` nötig ist.
 *
 *   DATABASE_URL in Repo-Root `.env.local` (siehe `/.env.example`)
 *   pnpm --filter api run smoke:http
 *
 * Deckt u. a. ab: `/v1/sync` (Idempotency-Key pro Lauf per `randomUUID()`),
 * Sales, Kunden, **Scheduling mit `projectId`** (inkl. gefilterter Liste + ICS),
 * **Work-Time** (`/v1/work-time/entries`: Liste, Create, gefilterte Liste, Delete),
 * DATEV-Settings und Buchungs-CSV, **Sales-Mahntext-Templates** (`GET`/`PUT /v1/sales/reminder-templates`, `GET …/resolved`).
 */
import { randomUUID } from "node:crypto";
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

const syncIdempotencyKey = randomUUID();
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
        idempotencyKey: syncIdempotencyKey,
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

const rtListRes = await app.request(
  "http://localhost/v1/sales/reminder-templates?locale=de",
  { headers: { Authorization: "Bearer mock" } },
);
const rtListText = await rtListRes.text();
console.log(
  "GET /v1/sales/reminder-templates",
  rtListRes.status,
  rtListText.slice(0, 160),
);
if (!rtListRes.ok) {
  process.exit(1);
}
try {
  const rtListJson = JSON.parse(rtListText) as { templates?: { level: number }[] };
  if (rtListJson.templates?.length !== 10) {
    console.error("Smoke: reminder-templates list expected 10 levels");
    process.exit(1);
  }
} catch (e) {
  console.error("Smoke: reminder-templates list JSON invalid", e);
  process.exit(1);
}

const smokeReminderIntro = `Smoke Mahntext ${Date.now()}`;
const rtPutRes = await app.request("http://localhost/v1/sales/reminder-templates", {
  method: "PUT",
  headers: {
    Authorization: "Bearer mock",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    locale: "de",
    items: [{ level: 1, bodyText: smokeReminderIntro, feeCents: 250 }],
  }),
});
const rtPutText = await rtPutRes.text();
console.log(
  "PUT /v1/sales/reminder-templates",
  rtPutRes.status,
  rtPutText.slice(0, 200),
);
if (!rtPutRes.ok) {
  process.exit(1);
}

const rtResolvedRes = await app.request(
  "http://localhost/v1/sales/reminder-templates/resolved?locale=de&level=1",
  { headers: { Authorization: "Bearer mock" } },
);
const rtResolvedText = await rtResolvedRes.text();
console.log(
  "GET /v1/sales/reminder-templates/resolved",
  rtResolvedRes.status,
  rtResolvedText.slice(0, 200),
);
if (!rtResolvedRes.ok) {
  process.exit(1);
}
try {
  const resolvedJson = JSON.parse(rtResolvedText) as {
    introText?: string;
    feeCents?: number | null;
  };
  if (resolvedJson.introText !== smokeReminderIntro) {
    console.error("Smoke: resolved intro mismatch", resolvedJson.introText);
    process.exit(1);
  }
  if (resolvedJson.feeCents !== 250) {
    console.error("Smoke: resolved feeCents mismatch", resolvedJson.feeCents);
    process.exit(1);
  }
} catch (e) {
  console.error("Smoke: reminder-templates resolved JSON invalid", e);
  process.exit(1);
}

const rtResetRes = await app.request("http://localhost/v1/sales/reminder-templates", {
  method: "PUT",
  headers: {
    Authorization: "Bearer mock",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    locale: "de",
    items: [{ level: 1, bodyText: "", feeCents: null }],
  }),
});
if (!rtResetRes.ok) {
  const t = await rtResetRes.text();
  console.error("Smoke: reminder-templates reset failed", rtResetRes.status, t);
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

function isoDateLocalToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function randomSchedulingStartTime(): string {
  const h = 6 + Math.floor(Math.random() * 12);
  const m = Math.floor(Math.random() * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const smokeSuffix = Date.now();
const employeesPostRes = await app.request("http://localhost/v1/employees", {
  method: "POST",
  headers: {
    Authorization: "Bearer mock",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    displayName: `Smoke MA ${smokeSuffix}`,
  }),
});
const employeesPostText = await employeesPostRes.text();
console.log(
  "POST /v1/employees",
  employeesPostRes.status,
  employeesPostText.slice(0, 200),
);
if (!employeesPostRes.ok) {
  process.exit(1);
}
let smokeEmployeeId: string;
try {
  const empJson = JSON.parse(employeesPostText) as { employee?: { id?: string } };
  const id = empJson.employee?.id;
  if (!id) {
    throw new Error("missing employee.id");
  }
  smokeEmployeeId = id;
} catch (e) {
  console.error("Smoke: POST /v1/employees response is not valid JSON", e);
  process.exit(1);
}

const projectTitle = `Smoke Projekt Scheduling ${smokeSuffix}`;
const projectsPostRes = await app.request("http://localhost/v1/projects", {
  method: "POST",
  headers: {
    Authorization: "Bearer mock",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ title: projectTitle }),
});
const projectsPostText = await projectsPostRes.text();
console.log(
  "POST /v1/projects",
  projectsPostRes.status,
  projectsPostText.slice(0, 240),
);
if (!projectsPostRes.ok) {
  process.exit(1);
}
let smokeProjectId: string;
try {
  const projJson = JSON.parse(projectsPostText) as { project?: { id?: string } };
  const id = projJson.project?.id;
  if (!id) {
    throw new Error("missing project.id");
  }
  smokeProjectId = id;
} catch (e) {
  console.error("Smoke: POST /v1/projects response is not valid JSON", e);
  process.exit(1);
}

const schedDate = isoDateLocalToday();
const schedStart = randomSchedulingStartTime();
const schedPostRes = await app.request("http://localhost/v1/scheduling/assignments", {
  method: "POST",
  headers: {
    Authorization: "Bearer mock",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    employeeId: smokeEmployeeId,
    date: schedDate,
    startTime: schedStart,
    title: "Smoke Scheduling Einsatz",
    place: null,
    reminderMinutesBefore: null,
    projectId: smokeProjectId,
  }),
});
const schedPostText = await schedPostRes.text();
console.log(
  "POST /v1/scheduling/assignments",
  schedPostRes.status,
  schedPostText.slice(0, 280),
);
if (!schedPostRes.ok) {
  process.exit(1);
}
let smokeAssignmentId: string;
try {
  const schedJson = JSON.parse(schedPostText) as {
    assignment?: { id?: string; projectId?: string | null };
  };
  const aid = schedJson.assignment?.id;
  const pid = schedJson.assignment?.projectId;
  if (!aid || pid !== smokeProjectId) {
    throw new Error(`unexpected assignment: id=${aid} projectId=${pid}`);
  }
  smokeAssignmentId = aid;
} catch (e) {
  console.error("Smoke: scheduling create response invalid", e);
  process.exit(1);
}

const schedListUrl = `http://localhost/v1/scheduling/assignments?${new URLSearchParams({
  projectId: smokeProjectId,
  date: schedDate,
}).toString()}`;
const schedListRes = await app.request(schedListUrl, {
  headers: { Authorization: "Bearer mock" },
});
const schedListText = await schedListRes.text();
console.log("GET /v1/scheduling/assignments (filtered)", schedListRes.status, schedListText.slice(0, 320));
if (!schedListRes.ok) {
  process.exit(1);
}
try {
  const listJson = JSON.parse(schedListText) as {
    assignments?: { id: string; projectId: string | null }[];
  };
  const match = listJson.assignments?.some(
    (a) => a.id === smokeAssignmentId && a.projectId === smokeProjectId,
  );
  if (!match) {
    console.error("Smoke: filtered assignments list missing created row");
    process.exit(1);
  }
} catch (e) {
  console.error("Smoke: scheduling list response invalid", e);
  process.exit(1);
}

const icsUrl = `http://localhost/v1/scheduling/assignments.ics?${new URLSearchParams({
  projectId: smokeProjectId,
  date: schedDate,
}).toString()}`;
const icsRes = await app.request(icsUrl, { headers: { Authorization: "Bearer mock" } });
const icsText = await icsRes.text();
console.log(
  "GET /v1/scheduling/assignments.ics (filtered)",
  icsRes.status,
  icsText.slice(0, 200).replace(/\r?\n/g, "\\n"),
);
if (!icsRes.ok || !icsText.includes("BEGIN:VEVENT")) {
  process.exit(1);
}
if (!icsText.includes(`Project: ${projectTitle}`)) {
  console.error("Smoke: ICS DESCRIPTION missing project title");
  process.exit(1);
}

const wtListBefore = await app.request(
  `http://localhost/v1/work-time/entries?from=${encodeURIComponent(schedDate)}&to=${encodeURIComponent(schedDate)}`,
  { headers: { Authorization: "Bearer mock" } },
);
const wtListBeforeText = await wtListBefore.text();
console.log(
  "GET /v1/work-time/entries",
  wtListBefore.status,
  wtListBeforeText.slice(0, 200),
);
if (!wtListBefore.ok) {
  process.exit(1);
}

const wtPostRes = await app.request("http://localhost/v1/work-time/entries", {
  method: "POST",
  headers: {
    Authorization: "Bearer mock",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    employeeId: smokeEmployeeId,
    workDate: schedDate,
    durationMinutes: 90,
    projectId: smokeProjectId,
    notes: "Smoke work time",
  }),
});
const wtPostText = await wtPostRes.text();
console.log(
  "POST /v1/work-time/entries",
  wtPostRes.status,
  wtPostText.slice(0, 240),
);
if (!wtPostRes.ok) {
  process.exit(1);
}
let smokeWtId: string;
try {
  const wtJson = JSON.parse(wtPostText) as { entry?: { id?: string; durationMinutes?: number } };
  const eid = wtJson.entry?.id;
  if (!eid || wtJson.entry?.durationMinutes !== 90) {
    throw new Error("unexpected work time entry");
  }
  smokeWtId = eid;
} catch (e) {
  console.error("Smoke: work-time create response invalid", e);
  process.exit(1);
}

const wtListAfter = await app.request(
  `http://localhost/v1/work-time/entries?from=${encodeURIComponent(schedDate)}&to=${encodeURIComponent(schedDate)}&projectId=${encodeURIComponent(smokeProjectId)}`,
  { headers: { Authorization: "Bearer mock" } },
);
const wtListAfterText = await wtListAfter.text();
console.log(
  "GET /v1/work-time/entries (project filter)",
  wtListAfter.status,
  wtListAfterText.slice(0, 280),
);
if (!wtListAfter.ok) {
  process.exit(1);
}
try {
  const wtListJson = JSON.parse(wtListAfterText) as {
    entries?: { id: string }[];
  };
  if (!wtListJson.entries?.some((e) => e.id === smokeWtId)) {
    console.error("Smoke: work-time list missing created entry");
    process.exit(1);
  }
} catch (e) {
  console.error("Smoke: work-time list JSON invalid", e);
  process.exit(1);
}

const wtDeleteRes = await app.request(
  `http://localhost/v1/work-time/entries/${encodeURIComponent(smokeWtId)}`,
  {
    method: "DELETE",
    headers: { Authorization: "Bearer mock" },
  },
);
console.log("DELETE /v1/work-time/entries/:id", wtDeleteRes.status);
if (!wtDeleteRes.ok && wtDeleteRes.status !== 204) {
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
