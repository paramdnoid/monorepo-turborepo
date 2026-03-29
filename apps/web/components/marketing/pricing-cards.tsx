"use client";

import { useState } from "react";

import { StaggerChildren, StaggerItem } from "@/components/marketing/fade-in";
import { BillingToggle } from "@/components/marketing/pricing/billing-toggle";
import { PricingCard } from "@/components/marketing/pricing/pricing-card";
import {
  type PublicPlan,
  savingsPercent,
} from "@/components/marketing/pricing/pricing-types";

export type { PublicPlan } from "@/components/marketing/pricing/pricing-types";

export function PricingCards({
  plans,
  hasYearlyOption,
}: {
  plans: PublicPlan[];
  hasYearlyOption: boolean;
}) {
  const [yearly, setYearly] = useState(false);

  const maxSavings = plans.reduce((max, p) => {
    if (p.priceYearly != null && p.priceYearly > 0 && p.priceMonthly > 0) {
      return Math.max(max, savingsPercent(p.priceMonthly, p.priceYearly));
    }
    return max;
  }, 0);

  return (
    <>
      {hasYearlyOption && (
        <BillingToggle
          yearly={yearly}
          onToggle={() => setYearly((y) => !y)}
          maxSavings={maxSavings}
        />
      )}

      <StaggerChildren
        className="mx-auto grid max-w-7xl items-stretch gap-4 sm:gap-5 md:grid-cols-2"
        staggerDelay={0.1}
      >
        {plans.map((plan, i) => (
          <StaggerItem key={plan.tier}>
            <PricingCard
              plan={plan}
              yearly={yearly}
              previousTierName={i > 0 ? plans[i - 1]!.name : undefined}
            />
          </StaggerItem>
        ))}
      </StaggerChildren>
    </>
  );
}
