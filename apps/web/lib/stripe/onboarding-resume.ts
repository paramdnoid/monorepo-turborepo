import "server-only";

import { eq, organizations } from "@repo/db";

import { getDb } from "@/lib/db";

/** Stripe Customer mit normalisierten Metadata-Strings. */
export type ResumeStripeCustomer = {
  id: string;
  metadata: Record<string, string>;
};

export type PlanTier = "starter" | "professional";
export type BillingCycle = "monthly" | "yearly";

export type ResolvedResumeBilling = {
  resolvedTenantId: string;
  planTier: PlanTier;
  billingCycle: BillingCycle;
  tradeSlug: string;
};

function normalizeMetadata(
  m?: Record<string, string | undefined> | null,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!m) return out;
  for (const [k, v] of Object.entries(m)) {
    if (v !== undefined && v !== null) out[k] = String(v);
  }
  return out;
}

async function logStripeFailure(
  operation: string,
  response: Response,
): Promise<void> {
  const body = await response.text().catch(() => "");
  console.error(`[stripe] ${operation} failed`, {
    status: response.status,
    requestId: response.headers.get("request-id"),
    body: body.slice(0, 800),
  });
}

async function retrieveStripeCustomer(
  stripeSecretKey: string,
  customerId: string,
): Promise<ResumeStripeCustomer | null> {
  const r = await fetch(
    `https://api.stripe.com/v1/customers/${encodeURIComponent(customerId)}`,
    {
      headers: { Authorization: `Bearer ${stripeSecretKey}` },
      cache: "no-store",
    },
  );
  if (!r.ok) {
    await logStripeFailure("customers.retrieve", r);
    return null;
  }
  const j = (await r.json()) as { id?: string; metadata?: Record<string, string> };
  if (!j.id) return null;
  return { id: j.id, metadata: normalizeMetadata(j.metadata) };
}

function metadataLooksCompleteForBilling(m: Record<string, string>): boolean {
  return Boolean(
    m.tenant_id?.trim() &&
      (m.plan_tier === "starter" || m.plan_tier === "professional") &&
      (m.billing_cycle === "monthly" || m.billing_cycle === "yearly") &&
      m.trade_slug?.trim(),
  );
}

/**
 * Stripe Customer Search: `metadata['tenant_id']` entspricht `organizations.tenant_id` / JWT.
 */
export async function searchStripeCustomerByTenantId(
  stripeSecretKey: string,
  tenantId: string,
): Promise<ResumeStripeCustomer | null> {
  const searchUrl = new URL("https://api.stripe.com/v1/customers/search");
  const escaped = tenantId.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  searchUrl.searchParams.set("query", `metadata['tenant_id']:'${escaped}'`);
  const r = await fetch(searchUrl.toString(), {
    headers: { Authorization: `Bearer ${stripeSecretKey}` },
    cache: "no-store",
  });
  if (!r.ok) {
    await logStripeFailure("customers/search", r);
    return null;
  }
  const j = (await r.json()) as {
    data?: Array<{ id?: string; metadata?: Record<string, string> }>;
  };
  const first = j.data?.[0];
  if (!first?.id) return null;
  return { id: first.id, metadata: normalizeMetadata(first.metadata) };
}

async function listStripeCustomersByEmail(
  stripeSecretKey: string,
  email: string,
): Promise<ResumeStripeCustomer[]> {
  const listUrl = new URL("https://api.stripe.com/v1/customers");
  listUrl.searchParams.set("email", email);
  listUrl.searchParams.set("limit", "20");
  const r = await fetch(listUrl.toString(), {
    headers: { Authorization: `Bearer ${stripeSecretKey}` },
    cache: "no-store",
  });
  if (!r.ok) {
    await logStripeFailure("customers.list", r);
    return [];
  }
  const j = (await r.json()) as {
    data?: Array<{ id?: string; metadata?: Record<string, string> }>;
  };
  return (j.data ?? [])
    .filter((c): c is { id: string; metadata?: Record<string, string> } =>
      Boolean(c.id),
    )
    .map((c) => ({ id: c.id, metadata: normalizeMetadata(c.metadata) }));
}

function isOnboardingStripeCustomer(metadata: Record<string, string>): boolean {
  return metadataLooksCompleteForBilling(metadata);
}

function tenantIdsLooselyEqual(
  stripeTenant: string | undefined,
  jwtTenant: string | undefined,
): boolean {
  const a = stripeTenant?.trim().toLowerCase();
  const b = jwtTenant?.trim().toLowerCase();
  return Boolean(a && b && a === b);
}

/**
 * Gleiche E-Mail kann mehrere Stripe-Customers haben — bevorzugt Match auf `tenant_id`,
 * sonst vollständige Onboarding-Metadata, sonst einziger Treffer (typisch: genau ein Customer).
 */
function pickCustomerFromEmailList(
  customers: ResumeStripeCustomer[],
  jwtTenantId: string | null,
): ResumeStripeCustomer | null {
  if (customers.length === 0) return null;

  if (jwtTenantId?.trim()) {
    const byTenant = customers.find((c) =>
      tenantIdsLooselyEqual(c.metadata.tenant_id, jwtTenantId),
    );
    if (byTenant) return byTenant;
  }

  const onboarding = customers.find((c) =>
    isOnboardingStripeCustomer(c.metadata),
  );
  if (onboarding) return onboarding;

  if (customers.length === 1) {
    return customers[0] ?? null;
  }

  return customers[0] ?? null;
}

async function loadOrganizationTradeSlug(tenantId: string): Promise<string | null> {
  const db = getDb();
  if (!db) return null;
  const rows = await db
    .select({ tradeSlug: organizations.tradeSlug })
    .from(organizations)
    .where(eq(organizations.tenantId, tenantId))
    .limit(1);
  return rows[0]?.tradeSlug?.trim() ?? null;
}

/**
 * 1) Search nach `tenant_id` (JWT), ggf. Retrieve für kanonische Metadata.
 * 2) Sonst Liste nach E-Mail + Auswahl passend zu `tenant_id` / Onboarding-Metadata.
 */
export async function resolveStripeCustomerForResume(
  stripeSecretKey: string,
  email: string,
  jwtTenantId: string | null,
): Promise<ResumeStripeCustomer | null> {
  if (jwtTenantId) {
    const bySearch = await searchStripeCustomerByTenantId(
      stripeSecretKey,
      jwtTenantId,
    );
    if (bySearch) {
      if (metadataLooksCompleteForBilling(bySearch.metadata)) {
        return bySearch;
      }
      const full = await retrieveStripeCustomer(stripeSecretKey, bySearch.id);
      return full ?? bySearch;
    }
  }

  const list = await listStripeCustomersByEmail(stripeSecretKey, email);
  const picked = pickCustomerFromEmailList(list, jwtTenantId);
  if (!picked) return null;

  if (metadataLooksCompleteForBilling(picked.metadata)) {
    return picked;
  }
  const full = await retrieveStripeCustomer(stripeSecretKey, picked.id);
  return full ?? picked;
}

/**
 * Billing-Felder aus Stripe-Metadata; optional `trade_slug` / `tenant_id` aus `organizations` ergänzen
 * (gleiche `tenant_id` wie in der DB).
 */
export async function resolveResumeBillingFields(
  customer: ResumeStripeCustomer,
  jwtTenantId: string | null,
): Promise<ResolvedResumeBilling | null> {
  const m = { ...customer.metadata };

  let resolvedTenantId = m.tenant_id?.trim() ?? "";
  if (!resolvedTenantId && jwtTenantId) {
    const orgTrade = await loadOrganizationTradeSlug(jwtTenantId);
    if (orgTrade) {
      resolvedTenantId = jwtTenantId;
      if (!m.trade_slug?.trim()) {
        m.trade_slug = orgTrade;
      }
    }
  }

  if (!resolvedTenantId) {
    return null;
  }

  if (
    jwtTenantId?.trim() &&
    m.tenant_id?.trim() &&
    jwtTenantId.trim() !== m.tenant_id.trim()
  ) {
    console.warn("[onboarding-resume] tenant_id: JWT und Stripe-Metadata unterscheiden sich", {
      jwt: jwtTenantId,
      stripe: m.tenant_id,
    });
  }

  if (!m.trade_slug?.trim()) {
    const fromOrg = await loadOrganizationTradeSlug(resolvedTenantId);
    if (fromOrg) {
      m.trade_slug = fromOrg;
    }
  }

  const planTier = m.plan_tier;
  const billingCycle = m.billing_cycle;
  const tradeSlug = m.trade_slug?.trim() ?? "";

  if (
    (planTier !== "starter" && planTier !== "professional") ||
    (billingCycle !== "monthly" && billingCycle !== "yearly") ||
    !tradeSlug
  ) {
    return null;
  }

  return {
    resolvedTenantId,
    planTier,
    billingCycle,
    tradeSlug,
  };
}

/**
 * Neues SetupIntent für Resume-Flow; Idempotency verhindert Dubletten bei Doppelklick/Retry.
 */
export async function createResumeSetupIntent(
  stripeSecretKey: string,
  input: {
    customerId: string;
    resolvedTenantId: string;
    tradeSlug: string;
    planTier: PlanTier;
    billingCycle: BillingCycle;
    priceId: string;
  },
): Promise<{ client_secret: string } | null> {
  const body = new URLSearchParams();
  body.set("customer", input.customerId);
  body.set("payment_method_types[0]", "card");
  body.set("usage", "off_session");
  body.set("metadata[tenant_id]", input.resolvedTenantId);
  body.set("metadata[trade_slug]", input.tradeSlug);
  body.set("metadata[plan_tier]", input.planTier);
  body.set("metadata[billing_cycle]", input.billingCycle);
  body.set("metadata[price_id]", input.priceId);

  const idempotencyKey = `resume-si-${input.customerId}-${input.priceId}`.slice(
    0,
    255,
  );

  const r = await fetch("https://api.stripe.com/v1/setup_intents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": idempotencyKey,
    },
    body: body.toString(),
    cache: "no-store",
  });

  if (!r.ok) {
    await logStripeFailure("setup_intents.create (resume)", r);
    return null;
  }
  const j = (await r.json()) as { client_secret?: string };
  if (!j.client_secret) return null;
  return { client_secret: j.client_secret };
}
