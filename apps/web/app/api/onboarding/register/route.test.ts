import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createTenantId,
  isOnboardingBrowserRequest,
  resolveStripePriceId,
  signUpPayloadSchema,
  stripeBillingEnabled,
} from "./route";

describe("register route internals", () => {
  describe("isOnboardingBrowserRequest", () => {
    it("accepts same-origin onboarding requests", () => {
      const request = new Request("https://example.com/api/onboarding/register", {
        headers: {
          origin: "https://example.com",
          referer: "https://example.com/onboarding?step=1",
        },
      });

      assert.equal(isOnboardingBrowserRequest(request), true);
    });

    it("rejects missing or cross-origin headers", () => {
      const missingHeadersRequest = new Request("https://example.com/api/onboarding/register");
      assert.equal(isOnboardingBrowserRequest(missingHeadersRequest), false);

      const crossOriginRequest = new Request("https://example.com/api/onboarding/register", {
        headers: {
          origin: "https://evil.example",
          referer: "https://evil.example/onboarding",
        },
      });
      assert.equal(isOnboardingBrowserRequest(crossOriginRequest), false);
    });

    it("rejects same-origin requests outside onboarding path", () => {
      const request = new Request("https://example.com/api/onboarding/register", {
        headers: {
          origin: "https://example.com",
          referer: "https://example.com/legal/privacy",
        },
      });

      assert.equal(isOnboardingBrowserRequest(request), false);
    });
  });

  describe("signUpPayloadSchema", () => {
    it("normalizes and validates valid payloads", () => {
      const result = signUpPayloadSchema.safeParse({
        companyName: "  Example GmbH  ",
        firstName: "  Ada  ",
        lastName: "  Lovelace ",
        tradeSlug: "  kaminfeger ",
        planTier: "starter",
        billingCycle: "monthly",
        email: "  ADA@EXAMPLE.COM ",
        password: "super-secret-password",
      });

      assert.equal(result.success, true);
      if (!result.success) return;

      assert.equal(result.data.companyName, "Example GmbH");
      assert.equal(result.data.firstName, "Ada");
      assert.equal(result.data.lastName, "Lovelace");
      assert.equal(result.data.tradeSlug, "kaminfeger");
      assert.equal(result.data.email, "ada@example.com");
    });

    it("rejects invalid payloads", () => {
      const result = signUpPayloadSchema.safeParse({
        companyName: "",
        firstName: "Ada",
        lastName: "Lovelace",
        tradeSlug: "kaminfeger",
        planTier: "starter",
        billingCycle: "monthly",
        email: "not-an-email",
        password: "short",
      });

      assert.equal(result.success, false);
    });
  });

  describe("createTenantId", () => {
    it("creates sanitized tenant id with expected segments", () => {
      const tenantId = createTenantId("Ärger & Söhne GmbH", "Sanitär-Heizung+Klima");
      const segments = tenantId.split("-");

      assert.equal(segments.length >= 3, true);
      assert.match(tenantId, /^[a-z0-9-]+$/);
      assert.equal(segments.at(-1)?.length, 8);
    });
  });

  describe("stripe billing helpers", () => {
    it("respects FEATURE_STRIPE_BILLING toggle", () => {
      process.env.FEATURE_STRIPE_BILLING = "true";
      assert.equal(stripeBillingEnabled(), true);

      process.env.FEATURE_STRIPE_BILLING = "false";
      assert.equal(stripeBillingEnabled(), false);
    });

    it("maps plan tier and billing cycle to configured price ids", () => {
      process.env.STRIPE_PRICE_STARTER_MONTHLY = "price_starter_monthly";
      process.env.STRIPE_PRICE_STARTER_YEARLY = "price_starter_yearly";
      process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY = "price_pro_monthly";
      process.env.STRIPE_PRICE_PROFESSIONAL_YEARLY = "price_pro_yearly";

      assert.equal(
        resolveStripePriceId("starter", "monthly"),
        "price_starter_monthly",
      );
      assert.equal(
        resolveStripePriceId("starter", "yearly"),
        "price_starter_yearly",
      );
      assert.equal(
        resolveStripePriceId("professional", "monthly"),
        "price_pro_monthly",
      );
      assert.equal(
        resolveStripePriceId("professional", "yearly"),
        "price_pro_yearly",
      );
    });
  });
});
