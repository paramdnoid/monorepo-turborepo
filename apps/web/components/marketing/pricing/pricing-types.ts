export interface PublicPlan {
  tier: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  priceYearly: number | null;
  trialDays: number;
  isPopular: boolean;
  ctaText: string | null;
  ctaLink: string | null;
  features: { label: string }[];
}

import { uiText } from "@/content/ui-text";

export function formatPrice(
  cents: number,
  yearly: boolean,
): { display: string; amount: number | null; suffix: string | null } {
  if (cents === 0) return { display: uiText.landingSections.pricing.freeLabel, amount: null, suffix: null };
  if (cents < 0) return { display: uiText.landingSections.pricing.customLabel, amount: null, suffix: null };

  const amount = Math.round(cents / 100);
  return {
    display: `EUR${amount}`,
    amount,
    suffix: yearly ? uiText.landingSections.pricing.yearlySuffix : uiText.landingSections.pricing.monthlySuffix,
  };
}

export function savingsPercent(monthly: number, yearly: number): number {
  const monthlyTotal = monthly * 12;
  if (monthlyTotal <= 0) return 0;
  return Math.round(((monthlyTotal - yearly) / monthlyTotal) * 100);
}
