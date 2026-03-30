import { NextResponse } from "next/server";

import { getUiText } from "@/content/ui-text";
import { getAuthSessionStripeResumeContext } from "@/lib/auth/session-user";
import { getRequestLocale } from "@/lib/i18n/request-locale";

import {
  isOnboardingBrowserRequest,
  resolveStripePriceId,
  stripeBillingEnabled,
} from "../register/route";

type StripeCustomer = {
  id?: string;
  metadata?: Record<string, string>;
};

type StripeCustomerList = {
  data?: StripeCustomer[];
};

type StripeSetupIntentResponse = {
  id?: string;
  client_secret?: string;
};

/**
 * Nach E-Mail-Bestätigung (neuer Tab / Reload): SetupIntent anhand Stripe-Customer
 * (E-Mail + tenant_id in Metadata) und JWT wiederherstellen.
 */
export async function POST(request: Request) {
  const text = getUiText(getRequestLocale(request));
  if (!isOnboardingBrowserRequest(request)) {
    return NextResponse.json(
      { error: text.api.onboarding.completionRestricted },
      { status: 403 },
    );
  }

  if (!stripeBillingEnabled()) {
    return NextResponse.json({ billingDisabled: true as const });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return NextResponse.json(
      { error: text.api.onboarding.stripeConfigInvalid },
      { status: 503 },
    );
  }

  const { email, tenantId } = await getAuthSessionStripeResumeContext();
  if (!email) {
    return NextResponse.json(
      { error: text.api.onboarding.sessionMissing },
      { status: 401 },
    );
  }

  let listResponse: Response;
  try {
    const listUrl = new URL("https://api.stripe.com/v1/customers");
    listUrl.searchParams.set("email", email);
    listUrl.searchParams.set("limit", "20");
    listResponse = await fetch(listUrl.toString(), {
      headers: { Authorization: `Bearer ${stripeSecretKey}` },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: text.api.onboarding.registrationFailed },
      { status: 502 },
    );
  }

  if (!listResponse.ok) {
    return NextResponse.json(
      { error: text.api.onboarding.setupIntentLoadFailed },
      { status: 502 },
    );
  }

  const listJson = (await listResponse.json()) as StripeCustomerList;
  const customers = listJson.data ?? [];

  /** Token hat oft kein tenant_id-Claim; dann per E-Mail den Onboarding-Customer treffen. */
  function isOnboardingStripeCustomer(c: StripeCustomer): boolean {
    const m = c.metadata ?? {};
    return Boolean(
      m.tenant_id?.trim() &&
        (m.plan_tier === "starter" || m.plan_tier === "professional") &&
        (m.billing_cycle === "monthly" || m.billing_cycle === "yearly") &&
        m.trade_slug?.trim(),
    );
  }

  const customer = tenantId
    ? customers.find((c) => c.metadata?.tenant_id === tenantId)
    : customers.find(isOnboardingStripeCustomer) ?? customers[0];

  if (!customer?.id) {
    return NextResponse.json(
      { error: text.api.onboarding.setupIntentLoadFailed },
      { status: 404 },
    );
  }

  const resolvedTenantId = customer.metadata?.tenant_id?.trim();
  if (!resolvedTenantId) {
    return NextResponse.json(
      { error: text.api.onboarding.invalidBillingData },
      { status: 422 },
    );
  }

  const metadata = customer.metadata ?? {};
  const planTier = metadata.plan_tier;
  const billingCycle = metadata.billing_cycle;
  const tradeSlug = metadata.trade_slug;

  if (
    (planTier !== "starter" && planTier !== "professional") ||
    (billingCycle !== "monthly" && billingCycle !== "yearly") ||
    !tradeSlug?.trim()
  ) {
    return NextResponse.json(
      { error: text.api.onboarding.invalidBillingData },
      { status: 422 },
    );
  }

  const priceId = resolveStripePriceId(planTier, billingCycle);
  if (!priceId) {
    return NextResponse.json(
      { error: text.api.onboarding.stripeConfigInvalid },
      { status: 503 },
    );
  }

  const setupIntentPayload = new URLSearchParams();
  setupIntentPayload.set("customer", customer.id);
  setupIntentPayload.set("payment_method_types[0]", "card");
  setupIntentPayload.set("usage", "off_session");
  setupIntentPayload.set("metadata[tenant_id]", resolvedTenantId);
  setupIntentPayload.set("metadata[trade_slug]", tradeSlug.trim());
  setupIntentPayload.set("metadata[plan_tier]", planTier);
  setupIntentPayload.set("metadata[billing_cycle]", billingCycle);
  setupIntentPayload.set("metadata[price_id]", priceId);

  let setupIntentResponse: Response;
  try {
    setupIntentResponse = await fetch(
      "https://api.stripe.com/v1/setup_intents",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: setupIntentPayload.toString(),
        cache: "no-store",
      },
    );
  } catch {
    return NextResponse.json(
      { error: text.api.onboarding.setupIntentLoadFailed },
      { status: 502 },
    );
  }

  if (!setupIntentResponse.ok) {
    return NextResponse.json(
      { error: text.api.onboarding.setupIntentLoadFailed },
      { status: 502 },
    );
  }

  const setupIntent =
    (await setupIntentResponse.json()) as StripeSetupIntentResponse;
  if (!setupIntent.client_secret) {
    return NextResponse.json(
      { error: text.api.onboarding.setupIntentLoadFailed },
      { status: 502 },
    );
  }

  return NextResponse.json({
    setupIntentClientSecret: setupIntent.client_secret,
  });
}
