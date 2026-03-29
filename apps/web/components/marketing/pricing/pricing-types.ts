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

import type { Locale } from "@/lib/i18n/locale";
import { uiText } from "@/content/ui-text";

const intlLocale: Record<Locale, string> = { de: "de-DE", en: "en-GB" };

export function formatEurInteger(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale[locale], {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPrice(
  cents: number,
  yearly: boolean,
  locale: Locale,
): { display: string; amount: number | null; suffix: string | null } {
  if (cents === 0) return { display: uiText.landingSections.pricing.freeLabel, amount: null, suffix: null };
  if (cents < 0) return { display: uiText.landingSections.pricing.customLabel, amount: null, suffix: null };

  const amount = Math.round(cents / 100);
  return {
    display: formatEurInteger(amount, locale),
    amount,
    suffix: yearly ? uiText.landingSections.pricing.yearlySuffix : uiText.landingSections.pricing.monthlySuffix,
  };
}

export function savingsPercent(monthly: number, yearly: number): number {
  const monthlyTotal = monthly * 12;
  if (monthlyTotal <= 0) return 0;
  return Math.round(((monthlyTotal - yearly) / monthlyTotal) * 100);
}
