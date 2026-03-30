import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import {
  isOnboardingBrowserRequest,
  resolveSetupIntentPaymentMethodId,
  stripeBillingEnabled,
} from "./route";

describe("complete-billing route internals", () => {
  beforeEach(() => {
    process.env.FEATURE_STRIPE_BILLING = "true";
  });

  describe("isOnboardingBrowserRequest", () => {
    it("accepts same-origin onboarding requests", () => {
      const request = new Request("https://example.com/api/onboarding/complete-billing", {
        headers: {
          origin: "https://example.com",
          referer: "https://example.com/onboarding?step=billing",
        },
      });

      assert.equal(isOnboardingBrowserRequest(request), true);
    });

    it("rejects requests with missing origin or referer", () => {
      const requestWithoutOrigin = new Request(
        "https://example.com/api/onboarding/complete-billing",
        {
          headers: {
            referer: "https://example.com/onboarding",
          },
        },
      );

      const requestWithoutReferer = new Request(
        "https://example.com/api/onboarding/complete-billing",
        {
          headers: {
            origin: "https://example.com",
          },
        },
      );

      assert.equal(isOnboardingBrowserRequest(requestWithoutOrigin), false);
      assert.equal(isOnboardingBrowserRequest(requestWithoutReferer), false);
    });

    it("rejects cross-origin and non-onboarding referer paths", () => {
      const crossOriginRequest = new Request("https://example.com/api/onboarding/complete-billing", {
        headers: {
          origin: "https://evil.example",
          referer: "https://evil.example/onboarding",
        },
      });

      const nonOnboardingRequest = new Request(
        "https://example.com/api/onboarding/complete-billing",
        {
          headers: {
            origin: "https://example.com",
            referer: "https://example.com/dashboard",
          },
        },
      );

      assert.equal(isOnboardingBrowserRequest(crossOriginRequest), false);
      assert.equal(isOnboardingBrowserRequest(nonOnboardingRequest), false);
    });
  });

  describe("stripeBillingEnabled", () => {
    it("returns true only when feature flag is set to true", () => {
      process.env.FEATURE_STRIPE_BILLING = "true";
      assert.equal(stripeBillingEnabled(), true);

      process.env.FEATURE_STRIPE_BILLING = "TRUE";
      assert.equal(stripeBillingEnabled(), true);

      process.env.FEATURE_STRIPE_BILLING = "false";
      assert.equal(stripeBillingEnabled(), false);

      delete process.env.FEATURE_STRIPE_BILLING;
      assert.equal(stripeBillingEnabled(), false);
    });
  });

  describe("resolveSetupIntentPaymentMethodId", () => {
    it("extracts payment method id from string and object values", () => {
      assert.equal(resolveSetupIntentPaymentMethodId("pm_123"), "pm_123");
      assert.equal(resolveSetupIntentPaymentMethodId({ id: "pm_456" }), "pm_456");
    });

    it("returns null for empty payment method values", () => {
      assert.equal(resolveSetupIntentPaymentMethodId(undefined), null);
      assert.equal(resolveSetupIntentPaymentMethodId({}), null);
    });
  });
});
