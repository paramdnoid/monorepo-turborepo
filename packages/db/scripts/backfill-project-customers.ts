/**
 * Backfill `projects.customer_id` via sicherem Label-Match (tenant + trim + case-insensitive).
 *
 * Standard ist Dry-Run (keine DB-Updates).
 * Anwenden explizit mit: `--apply`
 * Optional eingrenzen auf Mandant: `--tenant=<tenant_id>`
 */
import { and, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";

import { loadApiEnv } from "../load-api-env.js";
import { createDb, createPool, customers, projects } from "../src/index.js";

type ProjectCandidate = {
  id: string;
  tenantId: string;
  customerLabel: string;
};

type CustomerLookup = {
  id: string;
  tenantId: string;
  displayName: string;
};

type UniqueMatch = {
  project: ProjectCandidate;
  customer: CustomerLookup;
};

type AmbiguousMatch = {
  project: ProjectCandidate;
  customerIds: string[];
};

function normalizeLabel(value: string): string {
  return value.trim().toLocaleLowerCase("en-US");
}

function parseCliArgs(argv: string[]): { apply: boolean; tenantId: string | null } {
  const apply = argv.includes("--apply");
  const tenantArg = argv.find((arg) => arg.startsWith("--tenant="));
  const tenantId = tenantArg?.slice("--tenant=".length).trim() ?? "";
  return { apply, tenantId: tenantId.length > 0 ? tenantId : null };
}

loadApiEnv();

const { apply, tenantId } = parseCliArgs(process.argv.slice(2));
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("Fehler: DATABASE_URL ist nicht gesetzt.");
  process.exit(1);
}

const pool = createPool(databaseUrl);
const db = createDb(pool);

async function runBackfill(): Promise<void> {
  const projectConditions = [
    isNull(projects.customerId),
    isNotNull(projects.customerLabel),
    sql`btrim(${projects.customerLabel}) <> ''`,
  ];
  if (tenantId) {
    projectConditions.push(eq(projects.tenantId, tenantId));
  }

  const projectRows = await db
    .select({
      id: projects.id,
      tenantId: projects.tenantId,
      customerLabel: projects.customerLabel,
    })
    .from(projects)
    .where(and(...projectConditions));

  const candidates: ProjectCandidate[] = projectRows
    .filter((row): row is ProjectCandidate => typeof row.customerLabel === "string")
    .map((row) => ({
      id: row.id,
      tenantId: row.tenantId,
      customerLabel: row.customerLabel.trim(),
    }))
    .filter((row) => row.customerLabel.length > 0);

  if (candidates.length === 0) {
    console.log("Keine Backfill-Kandidaten gefunden.");
    return;
  }

  const tenantIds = [...new Set(candidates.map((row) => row.tenantId))];
  const customerRows = await db
    .select({
      id: customers.id,
      tenantId: customers.tenantId,
      displayName: customers.displayName,
    })
    .from(customers)
    .where(inArray(customers.tenantId, tenantIds));

  const byTenantAndLabel = new Map<string, Map<string, CustomerLookup[]>>();
  for (const row of customerRows) {
    const tenantMap = byTenantAndLabel.get(row.tenantId) ?? new Map<string, CustomerLookup[]>();
    const normalized = normalizeLabel(row.displayName);
    const list = tenantMap.get(normalized) ?? [];
    list.push({
      id: row.id,
      tenantId: row.tenantId,
      displayName: row.displayName,
    });
    tenantMap.set(normalized, list);
    byTenantAndLabel.set(row.tenantId, tenantMap);
  }

  const uniqueMatches: UniqueMatch[] = [];
  const ambiguousMatches: AmbiguousMatch[] = [];
  let noMatchCount = 0;

  for (const project of candidates) {
    const normalized = normalizeLabel(project.customerLabel);
    const tenantMap = byTenantAndLabel.get(project.tenantId);
    const matches = tenantMap?.get(normalized) ?? [];
    if (matches.length === 1) {
      uniqueMatches.push({ project, customer: matches[0]! });
      continue;
    }
    if (matches.length > 1) {
      ambiguousMatches.push({
        project,
        customerIds: matches.map((m) => m.id),
      });
      continue;
    }
    noMatchCount += 1;
  }

  console.log(`Backfill-Kandidaten: ${candidates.length}`);
  console.log(`Eindeutige Matches: ${uniqueMatches.length}`);
  console.log(`Mehrdeutige Matches: ${ambiguousMatches.length}`);
  console.log(`Ohne Match: ${noMatchCount}`);
  if (tenantId) {
    console.log(`Mandanten-Filter: ${tenantId}`);
  }

  if (ambiguousMatches.length > 0) {
    console.log("Mehrdeutige Projekte (erste 20):");
    for (const item of ambiguousMatches.slice(0, 20)) {
      console.log(
        `- project=${item.project.id} tenant=${item.project.tenantId} label="${item.project.customerLabel}" matches=${item.customerIds.length}`,
      );
    }
  }

  if (!apply) {
    console.log("Dry-Run beendet. Keine Daten wurden geschrieben.");
    return;
  }

  let applied = 0;
  for (const match of uniqueMatches) {
    const updated = await db
      .update(projects)
      .set({
        customerId: match.customer.id,
        customerLabel: match.customer.displayName,
        updatedAt: new Date(),
      })
      .where(and(eq(projects.id, match.project.id), isNull(projects.customerId)))
      .returning({ id: projects.id });
    if (updated[0]) {
      applied += 1;
    }
  }

  console.log(`Backfill angewendet: ${applied} Projekte aktualisiert.`);
}

try {
  await runBackfill();
} finally {
  await pool.end();
}
