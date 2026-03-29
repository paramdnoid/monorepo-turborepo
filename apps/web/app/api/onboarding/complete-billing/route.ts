import { NextResponse } from "next/server";
import { z } from "zod";

import { getUiText } from "@/content/ui-text";
import { getServerAccessToken } from "@/lib/auth/server-token";
import { getRequestLocale } from "@/lib/i18n/request-locale";

const completeBillingSchema = z.object({
  setupIntentId: z.string().trim().min(1),
});

type StripeSetupIntentDetails = {
  id?: string;
  status?: string;
  customer?: string;
  payment_method?: string | { id?: string };
  metadata?: Record<string, string>;
};

type StripeSubscriptionsListResponse = {
  data?: Array<{
    id?: string;
    status?: string;
  }>;
};

function isOnboardingBrowserRequest(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  if (!origin || !referer) return false;

  let refererUrl: URL;
  try {
    refererUrl = new URL(referer);
  } catch {
    return false;
  }

  if (origin !== requestUrl.origin) return false;
  if (refererUrl.origin !== requestUrl.origin) return false;
  return refererUrl.pathname.startsWith("/onboarding");
}

function stripeBillingEnabled() {
  return (process.env.FEATURE_STRIPE_BILLING ?? "false").toLowerCase() === "true";
}

function resolveSetupIntentPaymentMethodId(paymentMethod: StripeSetupIntentDetails["payment_method"]) {
  if (!paymentMethod) return null;
  if (typeof paymentMethod === "string") return paymentMethod;
  return paymentMethod.id ?? null;
}

export async function POST(request: Request) {
  const text = getUiText(getRequestLocale(request));
  if (!isOnboardingBrowserRequest(request)) {
    return NextResponse.json(
      { error: text.api.onboarding.completionRestricted },
      { status: 403 },
    );
  }

  if (!stripeBillingEnabled()) {
    return NextResponse.json({ ok: true });
  }

  const accessToken = await getServerAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: text.api.onboarding.sessionMissing }, { status: 401 });
  }

  let rawPayload: unknown;
  try {
    rawPayload = await request.json();
  } catch {
    return NextResponse.json({ error: text.api.auth.invalidBody }, { status: 400 });
  }

  const parsedPayload = completeBillingSchema.safeParse(rawPayload);
  if (!parsedPayload.success) {
    return NextResponse.json({ error: text.api.onboarding.invalidBillingData }, { status: 400 });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return NextResponse.json({ error: text.api.onboarding.stripeConfigInvalid }, { status: 503 });
  }

  let setupIntentResponse: Response;
  try {
    setupIntentResponse = await fetch(
      `https://api.stripe.com/v1/setup_intents/${encodeURIComponent(parsedPayload.data.setupIntentId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
        },
        cache: "no-store",
      },
    );
  } catch (error) {
    console.error("complete-billing: setup intent request failed", error);
    return NextResponse.json({ error: text.api.onboarding.setupIntentLoadFailed }, { status: 502 });
  }

  if (!setupIntentResponse.ok) {
    const responseBody = await setupIntentResponse.text().catch(() => "");
    console.error("complete-billing: setup intent rejected", {
      status: setupIntentResponse.status,
      requestId: setupIntentResponse.headers.get("request-id"),
      responseBody,
    });
    return NextResponse.json({ error: text.api.onboarding.setupIntentLoadFailed }, { status: 502 });
  }

  const setupIntent = (await setupIntentResponse.json()) as StripeSetupIntentDetails;
  if (setupIntent.status !== "succeeded") {
    return NextResponse.json(
      { error: text.api.onboarding.paymentMethodNotConfirmed },
      { status: 409 },
    );
  }

  const customerId = setupIntent.customer;
  const paymentMethodId = resolveSetupIntentPaymentMethodId(setupIntent.payment_method);
  const metadata = setupIntent.metadata ?? {};
  const priceId = metadata.price_id;

  if (!customerId || !paymentMethodId || !priceId) {
    return NextResponse.json({ error: text.api.onboarding.stripeDataIncomplete }, { status: 422 });
  }

  let subscriptionsResponse: Response;
  try {
    subscriptionsResponse = await fetch(
      `https://api.stripe.com/v1/subscriptions?customer=${encodeURIComponent(customerId)}&status=all&limit=20`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
        },
        cache: "no-store",
      },
    );
  } catch (error) {
    console.error("complete-billing: subscriptions request failed", error);
    return NextResponse.json(
      { error: text.api.onboarding.subscriptionsCheckFailed },
      { status: 502 },
    );
  }

  if (!subscriptionsResponse.ok) {
    const responseBody = await subscriptionsResponse.text().catch(() => "");
    console.error("complete-billing: subscriptions request rejected", {
      status: subscriptionsResponse.status,
      requestId: subscriptionsResponse.headers.get("request-id"),
      responseBody,
    });
    return NextResponse.json({ error: text.api.onboarding.subscriptionsCheckFailed }, { status: 502 });
  }

  const subscriptionsPayload = (await subscriptionsResponse.json()) as StripeSubscriptionsListResponse;
  const hasExistingSubscription = Boolean(
    subscriptionsPayload.data?.some((subscription) =>
      ["active", "trialing", "past_due", "unpaid", "incomplete"].includes(
        subscription.status ?? "",
      ),
    ),
  );
  if (hasExistingSubscription) {
    return NextResponse.json({ ok: true });
  }

  const createSubscriptionPayload = new URLSearchParams();
  createSubscriptionPayload.set("customer", customerId);
  createSubscriptionPayload.set("items[0][price]", priceId);
  createSubscriptionPayload.set("default_payment_method", paymentMethodId);
  createSubscriptionPayload.set("trial_period_days", "30");
  createSubscriptionPayload.set("metadata[tenant_id]", metadata.tenant_id ?? "");
  createSubscriptionPayload.set("metadata[trade_slug]", metadata.trade_slug ?? "");
  createSubscriptionPayload.set("metadata[plan_tier]", metadata.plan_tier ?? "");
  createSubscriptionPayload.set("metadata[billing_cycle]", metadata.billing_cycle ?? "");

  let createSubscriptionResponse: Response;
  try {
    createSubscriptionResponse = await fetch("https://api.stripe.com/v1/subscriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: createSubscriptionPayload.toString(),
      cache: "no-store",
    });
  } catch (error) {
    console.error("complete-billing: create subscription request failed", error);
    return NextResponse.json({ error: text.api.onboarding.subscriptionCreateFailed }, { status: 502 });
  }

  if (!createSubscriptionResponse.ok) {
    const responseBody = await createSubscriptionResponse.text().catch(() => "");
    console.error("complete-billing: create subscription rejected", {
      status: createSubscriptionResponse.status,
      requestId: createSubscriptionResponse.headers.get("request-id"),
      responseBody,
    });
    return NextResponse.json({ error: text.api.onboarding.subscriptionCreateFailed }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
