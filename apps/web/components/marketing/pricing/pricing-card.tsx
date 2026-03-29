"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { AnimatedPrice } from "@/components/marketing/pricing/animated-price";
import { FeatureList } from "@/components/marketing/pricing/feature-list";
import {
  type PublicPlan,
  formatPrice,
  savingsPercent,
} from "@/components/marketing/pricing/pricing-types";
import { useAppLocale } from "@/components/locale-provider";
import { Button } from "@repo/ui/button";
import { uiText } from "@/content/ui-text";

export function PricingCard({
  plan,
  yearly,
  previousTierName,
}: {
  plan: PublicPlan;
  yearly: boolean;
  previousTierName?: string;
}) {
  const locale = useAppLocale();
  const isPopular = plan.isPopular;
  const ctaHref = (() => {
    const base = plan.ctaLink ?? "/onboarding";
    const [path, query = ""] = base.split("?");
    const params = new URLSearchParams(query);
    params.set("billing", yearly ? "yearly" : "monthly");
    const queryString = params.toString();
    return queryString ? `${path}?${queryString}` : path;
  })();
  const effectivePrice =
    yearly && plan.priceYearly != null && plan.priceYearly > 0
      ? Math.round(plan.priceYearly / 12)
      : plan.priceMonthly;

  const { display, amount, suffix } = formatPrice(effectivePrice, yearly, locale);
  const monthlyPrice = formatPrice(plan.priceMonthly, false, locale);
  const savings =
    yearly && plan.priceYearly != null && plan.priceYearly > 0
      ? savingsPercent(plan.priceMonthly, plan.priceYearly)
      : 0;

  return (
    <div
      className={`relative flex h-full flex-col rounded-2xl border p-4 transition-[color,background-color,border-color,box-shadow,transform] duration-300 sm:p-5 ${
        isPopular
          ? "premium-panel-strong border-primary/30 hover:-translate-y-1 hover:shadow-xl"
          : "premium-panel border-border/60 hover:-translate-y-1 hover:border-primary/25 hover:shadow-[0_24px_46px_-24px_rgba(2,6,23,0.42)]"
      }`}
    >
      {isPopular && (
        <div className="absolute -top-3 left-4 sm:left-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[10px] font-semibold tracking-[0.12em] uppercase text-white shadow-sm shadow-primary/30 sm:px-3.5">
            {uiText.landingSections.pricing.popularBadge}
          </span>
        </div>
      )}

      <div className={isPopular ? "pt-2" : ""}>
        <h3 className="font-sans text-[1.08rem] font-bold tracking-[0.02em] sm:text-lg">{plan.name}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {plan.description}
        </p>
      </div>

      <div className="mb-5 mt-4 sm:mt-5">
        {amount != null ? (
          <div>
            <AnimatedPrice
              amount={amount}
              yearly={yearly}
              accent={isPopular}
              monthlyAmount={yearly ? monthlyPrice.amount : null}
              locale={locale}
            />
            <span className="mt-1 block text-sm text-muted-foreground">{suffix}</span>
          </div>
        ) : (
          <div>
            <span className="font-sans text-2xl font-bold tracking-tight text-muted-foreground">
              {display}
            </span>
            {plan.trialDays > 0 && (
              <span className="mt-1 block text-sm font-medium text-primary">
                {plan.trialDays} {uiText.landingSections.pricing.trialDaysSuffix}
              </span>
            )}
          </div>
        )}

        {savings > 0 && yearly && (
          <span className="mt-2 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            {savings}% {uiText.landingSections.pricing.savingsSuffix}
          </span>
        )}
      </div>

      <div className="mb-4 h-px bg-border/50 sm:mb-5" />

      <div className="flex-1">
        <FeatureList
          features={plan.features}
          accent={isPopular}
          previousTierName={previousTierName}
        />
      </div>

      <div className="mt-5 sm:mt-6">
        {isPopular ? (
          <Button
            className="h-11 w-full bg-primary text-xs font-semibold uppercase tracking-[0.04em] text-white shadow-sm shadow-primary/25 transition-[color,background-color,box-shadow] hover:bg-primary/90 hover:shadow-md hover:shadow-primary/35 sm:h-10 sm:text-sm sm:tracking-[0.08em]"
            size="lg"
            asChild
          >
            <Link href={ctaHref || "/onboarding"}>
              {plan.ctaText ?? uiText.landingSections.pricing.ctaDefaultPopular}
              <ArrowRight
                className="ml-1.5 h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          </Button>
        ) : (
          <Button
            className="h-11 w-full border-border/70 text-xs font-semibold uppercase tracking-[0.04em] transition-[color,background-color,border-color,box-shadow] hover:border-foreground/20 sm:h-10 sm:text-sm sm:tracking-[0.08em]"
            variant="outline"
            size="lg"
            asChild
          >
            <Link href={ctaHref || "/onboarding"}>{plan.ctaText ?? uiText.landingSections.pricing.ctaDefaultOutline}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
