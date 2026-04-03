import { NextResponse } from "next/server";

import { getUiText } from "@/content/ui-text";
import { getAuthSessionStripeResumeContext } from "@/lib/auth/session-user";
import { isOnboardingBrowserRequest } from "@/lib/onboarding/is-onboarding-browser-request";
import { getRequestLocale } from "@/lib/i18n/request-locale";
import {
  createResumeSetupIntent,
  resolveResumeBillingFields,
  resolveStripeCustomerForResume,
} from "@/lib/stripe/onboarding-resume";

import { resolveStripePriceId, stripeBillingEnabled } from "../register/route";

/**
 * Nach E-Mail-Bestätigung: neues SetupIntent — Customer per `tenant_id`-Search,
 * E-Mail-Liste oder `organizations`-Fallback; Idempotency auf Stripe-Seite.
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

  let customer;
  try {
    customer = await resolveStripeCustomerForResume(
      stripeSecretKey,
      email,
      tenantId,
    );
  } catch (error) {
    console.error("[resume-setup-intent] resolveStripeCustomerForResume", error);
    return NextResponse.json(
      { error: text.api.onboarding.registrationFailed },
      { status: 502 },
    );
  }

  if (!customer?.id) {
    return NextResponse.json(
      {
        error: text.api.onboarding.stripeCustomerNotFoundForResume,
        code: "STRIPE_CUSTOMER_NOT_FOUND" as const,
      },
      { status: 422 },
    );
  }

  const billing = await resolveResumeBillingFields(customer, tenantId);
  if (!billing) {
    return NextResponse.json(
      { error: text.api.onboarding.invalidBillingData },
      { status: 422 },
    );
  }

  const priceId = resolveStripePriceId(billing.planTier, billing.billingCycle);
  if (!priceId) {
    return NextResponse.json(
      { error: text.api.onboarding.stripeConfigInvalid },
      { status: 503 },
    );
  }

  const setupIntent = await createResumeSetupIntent(stripeSecretKey, {
    customerId: customer.id,
    resolvedTenantId: billing.resolvedTenantId,
    tradeSlug: billing.tradeSlug,
    planTier: billing.planTier,
    billingCycle: billing.billingCycle,
    priceId,
  });

  if (!setupIntent?.client_secret) {
    return NextResponse.json(
      { error: text.api.onboarding.setupIntentLoadFailed },
      { status: 502 },
    );
  }

  return NextResponse.json({
    setupIntentClientSecret: setupIntent.client_secret,
  });
}
