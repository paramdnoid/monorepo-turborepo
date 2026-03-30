import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getUiText } from "@/content/ui-text";
import { AUTH_COOKIE_NAME } from "@/lib/auth/constants";
import { getRequestLocale } from "@/lib/i18n/request-locale";

export const signUpPayloadSchema = z
  .object({
    companyName: z.string().trim().min(1).max(160),
    firstName: z.string().trim().min(1).max(120),
    lastName: z.string().trim().min(1).max(120),
    tradeSlug: z.string().trim().min(1).max(80),
    planTier: z.enum(["starter", "professional"]),
    billingCycle: z.enum(["monthly", "yearly"]),
    email: z.string().trim().email().max(320),
    password: z.string().min(8).max(128),
  })
  .transform((value) => ({
    companyName: value.companyName.trim(),
    firstName: value.firstName.trim(),
    lastName: value.lastName.trim(),
    tradeSlug: value.tradeSlug.trim(),
    planTier: value.planTier,
    billingCycle: value.billingCycle,
    email: value.email.trim().toLowerCase(),
    password: value.password,
  }));

type SignUpPayload = z.infer<typeof signUpPayloadSchema>;

type TokenResponse = {
  access_token?: string;
  expires_in?: number;
};

type KeycloakRole = {
  id?: string;
  name?: string;
};

type KeycloakUser = {
  id?: string;
  attributes?: {
    tenant_id?: string[];
  };
};

type StripeCustomerResponse = {
  id?: string;
};

type StripeSetupIntentResponse = {
  id?: string;
  client_secret?: string;
};

const OIDC_TOKEN_ENDPOINT =
  process.env.AUTH_OIDC_TOKEN_ENDPOINT ??
  "http://localhost:8081/realms/zgwerk/protocol/openid-connect/token";
const OIDC_CLIENT_ID = process.env.AUTH_OIDC_CLIENT_ID ?? "zgwerk-cli";

const KEYCLOAK_BASE_URL =
  process.env.AUTH_KEYCLOAK_BASE_URL ??
  process.env.KEYCLOAK_BASE_URL ??
  "http://localhost:8081";
const KEYCLOAK_REALM = process.env.AUTH_KEYCLOAK_REALM ?? "zgwerk";

function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, "");
}

export function isOnboardingBrowserRequest(request: Request) {
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

export function createTenantId(companyName: string, tradeSlug: string) {
  const normalizedCompany = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 24);
  const normalizedTrade = tradeSlug
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 16);
  const suffix = crypto.randomUUID().slice(0, 8);
  return [
    normalizedCompany || "tenant",
    normalizedTrade || "trade",
    suffix,
  ].join("-");
}

export function stripeBillingEnabled() {
  return (
    (process.env.FEATURE_STRIPE_BILLING ?? "false").toLowerCase() === "true"
  );
}

export function resolveStripePriceId(
  planTier: SignUpPayload["planTier"],
  billingCycle: SignUpPayload["billingCycle"],
) {
  if (planTier === "starter" && billingCycle === "monthly") {
    return process.env.STRIPE_PRICE_STARTER_MONTHLY ?? null;
  }
  if (planTier === "starter" && billingCycle === "yearly") {
    return process.env.STRIPE_PRICE_STARTER_YEARLY ?? null;
  }
  if (planTier === "professional" && billingCycle === "monthly") {
    return process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY ?? null;
  }
  if (planTier === "professional" && billingCycle === "yearly") {
    return process.env.STRIPE_PRICE_PROFESSIONAL_YEARLY ?? null;
  }
  return null;
}

async function createStripeBillingSetup(
  payload: SignUpPayload,
  tenantId: string,
) {
  if (!stripeBillingEnabled()) {
    return { type: "disabled" as const };
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return { type: "error" as const };
  }

  const priceId = resolveStripePriceId(payload.planTier, payload.billingCycle);
  if (!priceId) {
    return { type: "error" as const };
  }

  try {
    const customerPayload = new URLSearchParams();
    customerPayload.set("email", payload.email);
    customerPayload.set(
      "name",
      `${payload.firstName} ${payload.lastName}`.trim(),
    );
    customerPayload.set("metadata[tenant_id]", tenantId);
    customerPayload.set("metadata[trade_slug]", payload.tradeSlug);
    customerPayload.set("metadata[plan_tier]", payload.planTier);
    customerPayload.set("metadata[billing_cycle]", payload.billingCycle);

    const customerResponse = await fetch(
      "https://api.stripe.com/v1/customers",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: customerPayload.toString(),
        cache: "no-store",
      },
    );

    if (!customerResponse.ok) {
      return { type: "error" as const };
    }

    const customer = (await customerResponse.json()) as StripeCustomerResponse;
    if (!customer.id) {
      return { type: "error" as const };
    }

    const setupIntentPayload = new URLSearchParams();
    setupIntentPayload.set("customer", customer.id);
    setupIntentPayload.set("payment_method_types[0]", "card");
    setupIntentPayload.set("usage", "off_session");
    setupIntentPayload.set("metadata[tenant_id]", tenantId);
    setupIntentPayload.set("metadata[trade_slug]", payload.tradeSlug);
    setupIntentPayload.set("metadata[plan_tier]", payload.planTier);
    setupIntentPayload.set("metadata[billing_cycle]", payload.billingCycle);
    setupIntentPayload.set("metadata[price_id]", priceId);

    const setupIntentResponse = await fetch(
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

    if (!setupIntentResponse.ok) {
      return { type: "error" as const };
    }

    const setupIntent =
      (await setupIntentResponse.json()) as StripeSetupIntentResponse;
    if (!setupIntent.client_secret || !setupIntent.id) {
      return { type: "error" as const };
    }

    return {
      type: "ok" as const,
      setupIntentId: setupIntent.id,
      setupIntentClientSecret: setupIntent.client_secret,
    };
  } catch (error) {
    console.error("[createStripeBillingSetup]", error);
    return { type: "error" as const };
  }
}

async function requestAccessToken(params: URLSearchParams) {
  return fetch(OIDC_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
    cache: "no-store",
  });
}

function extractCreatedUserId(location: string | null) {
  if (!location) return null;
  const segments = location.split("/");
  return segments.at(-1) || null;
}

async function createKeycloakUser(
  adminToken: string,
  payload: SignUpPayload,
  tenantId: string,
) {
  const usersEndpoint = `${normalizeBaseUrl(KEYCLOAK_BASE_URL)}/admin/realms/${encodeURIComponent(KEYCLOAK_REALM)}/users`;

  const response = await fetch(usersEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: payload.email,
      email: payload.email,
      enabled: true,
      emailVerified: false,
      firstName: payload.firstName,
      lastName: payload.lastName,
      attributes: {
        tenant_id: [tenantId],
        company_name: [payload.companyName],
        trade_slug: [payload.tradeSlug],
      },
      credentials: [
        {
          type: "password",
          value: payload.password,
          temporary: false,
        },
      ],
    }),
    cache: "no-store",
  });

  if (response.status === 409) {
    return { type: "duplicate" as const };
  }

  if (!response.ok) {
    return { type: "error" as const };
  }

  const userId = extractCreatedUserId(response.headers.get("location"));
  if (!userId) {
    return { type: "error" as const };
  }

  return {
    type: "ok" as const,
    userId,
  };
}

async function findKeycloakUserByEmail(adminToken: string, email: string) {
  const usersEndpoint = new URL(
    `${normalizeBaseUrl(KEYCLOAK_BASE_URL)}/admin/realms/${encodeURIComponent(KEYCLOAK_REALM)}/users`,
  );
  usersEndpoint.searchParams.set("email", email);
  usersEndpoint.searchParams.set("exact", "true");

  const response = await fetch(usersEndpoint.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const users = (await response.json()) as KeycloakUser[];
  const matchingUser = users.find((user) => user.id) ?? null;
  if (!matchingUser?.id) {
    return null;
  }

  return {
    userId: matchingUser.id,
    tenantId: matchingUser.attributes?.tenant_id?.[0] ?? null,
  };
}

async function assignApiUserRole(adminToken: string, userId: string) {
  const roleEndpoint = `${normalizeBaseUrl(KEYCLOAK_BASE_URL)}/admin/realms/${encodeURIComponent(KEYCLOAK_REALM)}/roles/API_USER`;
  const roleResponse = await fetch(roleEndpoint, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!roleResponse.ok) return false;

  const role = (await roleResponse.json()) as KeycloakRole;
  if (!role.name) return false;

  const mappingEndpoint = `${normalizeBaseUrl(KEYCLOAK_BASE_URL)}/admin/realms/${encodeURIComponent(KEYCLOAK_REALM)}/users/${encodeURIComponent(userId)}/role-mappings/realm`;
  const assignResponse = await fetch(mappingEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      {
        id: role.id,
        name: role.name,
      },
    ]),
    cache: "no-store",
  });

  return assignResponse.ok;
}

async function deleteKeycloakUser(adminToken: string, userId: string) {
  const deleteEndpoint = `${normalizeBaseUrl(KEYCLOAK_BASE_URL)}/admin/realms/${encodeURIComponent(KEYCLOAK_REALM)}/users/${encodeURIComponent(userId)}`;
  await fetch(deleteEndpoint, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
    cache: "no-store",
  });
}

async function issueUserSession(email: string, password: string) {
  const tokenResponse = await requestAccessToken(
    new URLSearchParams({
      grant_type: "password",
      client_id: OIDC_CLIENT_ID,
      username: email,
      password,
    }),
  );

  if (!tokenResponse.ok) {
    return null;
  }

  const tokenJson = (await tokenResponse.json()) as TokenResponse;
  if (!tokenJson.access_token) {
    return null;
  }

  return {
    accessToken: tokenJson.access_token,
    expiresIn: tokenJson.expires_in ?? 900,
  };
}

export async function POST(request: Request) {
  const text = getUiText(getRequestLocale(request));
  if (!isOnboardingBrowserRequest(request)) {
    return NextResponse.json(
      { error: text.api.onboarding.registrationRestricted },
      { status: 403 },
    );
  }

  let rawPayload: unknown;
  try {
    rawPayload = await request.json();
  } catch {
    return NextResponse.json(
      { error: text.api.auth.invalidBody },
      { status: 400 },
    );
  }

  const parsedPayload = signUpPayloadSchema.safeParse(rawPayload);
  if (!parsedPayload.success) {
    return NextResponse.json(
      { error: text.api.onboarding.invalidRegistrationData },
      { status: 400 },
    );
  }

  let adminToken: string | null = null;
  let userIdToRollback: string | null = null;
  let keycloakUserIdForEmailVerification: string | null = null;

  try {
    const { getKeycloakAdminToken } = await import("@/lib/auth/keycloak-admin");
    adminToken = await getKeycloakAdminToken();
    if (!adminToken) {
      return NextResponse.json(
        { error: text.api.onboarding.registrationUnavailable },
        { status: 503 },
      );
    }

    const tenantId = createTenantId(
      parsedPayload.data.companyName,
      parsedPayload.data.tradeSlug,
    );
    const createdUser = await createKeycloakUser(
      adminToken,
      parsedPayload.data,
      tenantId,
    );

    let tenantIdForCheckout = tenantId;
    let userSession = null as Awaited<ReturnType<typeof issueUserSession>>;

    if (createdUser.type === "ok") {
      userIdToRollback = createdUser.userId;
      keycloakUserIdForEmailVerification = createdUser.userId;

      const roleAssigned = await assignApiUserRole(
        adminToken,
        createdUser.userId,
      );
      if (!roleAssigned) {
        await deleteKeycloakUser(adminToken, createdUser.userId);
        return NextResponse.json(
          { error: text.api.onboarding.registrationFailed },
          { status: 502 },
        );
      }
    } else if (createdUser.type === "duplicate") {
      const existingUser = await findKeycloakUserByEmail(
        adminToken,
        parsedPayload.data.email,
      );
      userSession = await issueUserSession(
        parsedPayload.data.email,
        parsedPayload.data.password,
      );

      if (!existingUser || !userSession) {
        return NextResponse.json(
          {
            error: text.api.onboarding.emailAlreadyExists,
            code: "EMAIL_ALREADY_EXISTS",
          },
          { status: 409 },
        );
      }

      tenantIdForCheckout = existingUser.tenantId ?? tenantIdForCheckout;
    } else {
      return NextResponse.json(
        { error: text.api.onboarding.registrationFailed },
        { status: 502 },
      );
    }

    const { tryProvisionOrganizationAfterSignup } =
      await import("@/lib/provision-organization");
    const provision = await tryProvisionOrganizationAfterSignup({
      tenantId: tenantIdForCheckout,
      companyName: parsedPayload.data.companyName,
      tradeSlug: parsedPayload.data.tradeSlug,
    });
    if (!provision.ok) {
      if (userIdToRollback) {
        await deleteKeycloakUser(adminToken, userIdToRollback);
      }
      return NextResponse.json(
        { error: text.api.onboarding.registrationFailed, code: provision.code },
        { status: 502 },
      );
    }

    userSession =
      userSession ??
      (await issueUserSession(
        parsedPayload.data.email,
        parsedPayload.data.password,
      ));
    if (!userSession) {
      if (userIdToRollback) {
        await deleteKeycloakUser(adminToken, userIdToRollback);
      }
      return NextResponse.json(
        { error: text.api.onboarding.registrationAutoSigninFailed },
        { status: 502 },
      );
    }

    const stripeBillingSetup = await createStripeBillingSetup(
      parsedPayload.data,
      tenantIdForCheckout,
    );
    if (stripeBillingSetup.type === "error") {
      if (userIdToRollback) {
        await deleteKeycloakUser(adminToken, userIdToRollback);
      }
      return NextResponse.json(
        { error: text.api.onboarding.registrationFailed },
        { status: 502 },
      );
    }

    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE_NAME, userSession.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.max(60, userSession.expiresIn),
    });

    let verificationEmailSent = false;
    if (keycloakUserIdForEmailVerification) {
      const { sendSignupVerificationEmail } =
        await import("@/lib/mail/send-signup-verification-email");
      verificationEmailSent = await sendSignupVerificationEmail({
        locale: getRequestLocale(request),
        to: parsedPayload.data.email,
        firstName: parsedPayload.data.firstName,
        keycloakUserId: keycloakUserIdForEmailVerification,
      });
    }

    return NextResponse.json({
      ok: true,
      verificationEmailSent,
      setupIntentClientSecret:
        stripeBillingSetup.type === "ok"
          ? stripeBillingSetup.setupIntentClientSecret
          : undefined,
      setupIntentId:
        stripeBillingSetup.type === "ok"
          ? stripeBillingSetup.setupIntentId
          : undefined,
    });
  } catch (error) {
    console.error("[api/onboarding/register]", error);
    if (userIdToRollback && adminToken) {
      try {
        await deleteKeycloakUser(adminToken, userIdToRollback);
      } catch (rollbackError) {
        console.error("[api/onboarding/register] rollback failed", rollbackError);
      }
    }
    return NextResponse.json(
      {
        error: text.api.onboarding.registrationFailed,
        code: "UNEXPECTED",
      },
      { status: 502 },
    );
  }
}
