"use client"

import { useAppLocale } from "@/components/locale-provider"
import { ToggleGroup, ToggleGroupItem } from "@/components/onboarding/onboarding-toggle-group"
import { uiText } from "@/content/ui-text"
import { formatEurInteger } from "@/components/marketing/pricing/pricing-types"
import type { Locale } from "@/lib/i18n/locale"
import { cn } from "@/lib/utils"
import { Check, Sparkles } from "lucide-react"

export const onboardingPlanTiers = ["starter", "professional"] as const
export type OnboardingPlanTier = (typeof onboardingPlanTiers)[number]

export const onboardingBillingCycles = ["monthly", "yearly"] as const
export type OnboardingBillingCycle = (typeof onboardingBillingCycles)[number]

type OnboardingPlanSelectorProps = {
  selectedPlanTier: OnboardingPlanTier
  selectedBillingCycle: OnboardingBillingCycle
  onSelectPlanTier: (tier: OnboardingPlanTier) => void
  onSelectBillingCycle: (cycle: OnboardingBillingCycle) => void
}

const planCosts: Record<OnboardingPlanTier, { monthly: number; yearly: number; trialDays: number }> = {
  starter: {
    monthly: 19900,
    yearly: 214920,
    trialDays: 30,
  },
  professional: {
    monthly: 39900,
    yearly: 430920,
    trialDays: 30,
  },
}

function formatEuroFromCents(cents: number, locale: Locale) {
  return formatEurInteger(Math.round(cents / 100), locale)
}

function calculateSavingsPercent(monthlyCents: number, yearlyCents: number) {
  const yearlyAtMonthlyPrice = monthlyCents * 12
  if (yearlyAtMonthlyPrice <= 0) return 0
  return Math.round(((yearlyAtMonthlyPrice - yearlyCents) / yearlyAtMonthlyPrice) * 100)
}

export function OnboardingPlanSelector({
  selectedPlanTier,
  selectedBillingCycle,
  onSelectPlanTier,
  onSelectBillingCycle,
}: OnboardingPlanSelectorProps) {
  const locale = useAppLocale()
  const selectedPlanCosts = planCosts[selectedPlanTier]
  const monthlyDisplay = formatEuroFromCents(selectedPlanCosts.monthly, locale)
  const yearlyDisplay = formatEuroFromCents(selectedPlanCosts.yearly, locale)
  const monthlyEquivalentForYearly = formatEuroFromCents(Math.round(selectedPlanCosts.yearly / 12), locale)
  const yearlyAtMonthlyPriceDisplay = formatEuroFromCents(selectedPlanCosts.monthly * 12, locale)
  const yearlySavingsPercent = calculateSavingsPercent(
    selectedPlanCosts.monthly,
    selectedPlanCosts.yearly,
  )

  return (
    <section className="space-y-3">
      <header className="space-y-1">
        <h2 className="font-sans text-lg font-semibold tracking-tight text-foreground">
          {uiText.onboarding.planSelection.heading}
        </h2>
        <p className="text-xs text-muted-foreground sm:text-sm">
          {uiText.onboarding.planSelection.description}
        </p>
      </header>

      <div className="space-y-2">
        <p className="auth-label text-foreground">
          {uiText.onboarding.planSelection.planLabel}
        </p>
        <div
          role="radiogroup"
          aria-label={uiText.onboarding.planSelection.planAriaLabel}
          className="grid gap-1.5 sm:grid-cols-2"
        >
          {onboardingPlanTiers.map((tier) => {
            const isSelected = selectedPlanTier === tier
            const costs = planCosts[tier]
            const savingsPercent = calculateSavingsPercent(costs.monthly, costs.yearly)
            const monthlyPrice = formatEuroFromCents(costs.monthly, locale)
            const yearlyPrice = formatEuroFromCents(costs.yearly, locale)

            return (
              <button
                key={tier}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={
                  tier === "starter"
                    ? uiText.onboarding.planSelection.starterLabel
                    : uiText.onboarding.planSelection.professionalLabel
                }
                onClick={() => onSelectPlanTier(tier)}
                className={cn(
                  "rounded-lg border px-2.5 py-2 text-left transition-[color,background-color,border-color,box-shadow]",
                  "focus-visible:ring-ring/40 focus-visible:outline-none focus-visible:ring-2",
                  isSelected
                    ? "border-primary/45 bg-primary/8 shadow-lg shadow-primary/20"
                    : "border-border/70 bg-muted/35 hover:border-primary/35 hover:bg-muted/55",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-foreground sm:text-sm">
                      {tier === "starter"
                        ? uiText.onboarding.planSelection.starterLabel
                        : uiText.onboarding.planSelection.professionalLabel}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {monthlyPrice} {uiText.onboarding.planSelection.perMonthLabel}
                    </p>
                  </div>
                  {isSelected ? (
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-3.5 w-3.5" aria-hidden />
                    </span>
                  ) : null}
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground sm:text-[11px]">
                  <span className="rounded-full border border-border/70 bg-background/70 px-2 py-0.5">
                    {yearlyPrice} {uiText.onboarding.planSelection.perYearTotalLabel}
                  </span>
                  {savingsPercent > 0 ? (
                    <span className="rounded-full border border-emerald-200/80 bg-emerald-50 px-2 py-0.5 text-emerald-700">
                      {savingsPercent}% {uiText.onboarding.planSelection.savingsBadgeSuffix}
                    </span>
                  ) : null}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="auth-label text-foreground">
          {uiText.onboarding.planSelection.billingLabel}
        </p>
        <ToggleGroup
          type="single"
          value={selectedBillingCycle}
          onValueChange={(nextValue: string) => {
            if (nextValue === "monthly" || nextValue === "yearly") {
              onSelectBillingCycle(nextValue)
            }
          }}
          variant="premium"
          aria-label={uiText.onboarding.planSelection.billingAriaLabel}
          className="grid h-10 w-full grid-cols-2 items-stretch gap-1 overflow-hidden rounded-lg border border-input bg-muted/70 p-1"
        >
          <ToggleGroupItem
            value="monthly"
            activeStyle="primary"
            aria-label={uiText.onboarding.planSelection.monthlyLabel}
            className="h-full! min-h-0 w-full justify-center rounded-md px-2.5 text-xs font-semibold text-foreground/75 transition-colors hover:text-foreground sm:text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:ring-1 data-[state=on]:ring-inset data-[state=on]:ring-background/80"
          >
            {uiText.onboarding.planSelection.monthlyLabel}
          </ToggleGroupItem>
          <ToggleGroupItem
            value="yearly"
            activeStyle="primary"
            aria-label={uiText.onboarding.planSelection.yearlyLabel}
            className="h-full! min-h-0 w-full justify-center rounded-md px-2.5 text-xs font-semibold text-foreground/75 transition-colors hover:text-foreground sm:text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:ring-1 data-[state=on]:ring-inset data-[state=on]:ring-background/80"
          >
            {uiText.onboarding.planSelection.yearlyLabel}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="rounded-lg border border-border/70 bg-muted/25 p-2.5">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="auth-label text-foreground">
            {uiText.onboarding.planSelection.costOverviewLabel}
          </p>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {selectedPlanTier === "starter"
              ? uiText.onboarding.planSelection.starterLabel
              : uiText.onboarding.planSelection.professionalLabel}
          </span>
        </div>

        <div className="space-y-1">
          <p className="font-sans text-xl font-semibold tracking-tight text-foreground">
            {selectedBillingCycle === "yearly" ? monthlyEquivalentForYearly : monthlyDisplay}
            <span className="ml-1 text-sm font-medium text-muted-foreground">
              {selectedBillingCycle === "yearly"
                ? uiText.onboarding.planSelection.perMonthYearlyLabel
                : uiText.onboarding.planSelection.perMonthLabel}
            </span>
          </p>
          <p className="text-xs text-muted-foreground sm:text-sm">
            {selectedBillingCycle === "yearly"
              ? `${uiText.onboarding.planSelection.yearlyTotalLabel}: ${yearlyDisplay}`
              : `${uiText.onboarding.planSelection.yearlyIfMonthlyLabel}: ${yearlyAtMonthlyPriceDisplay}`}
          </p>
          {selectedBillingCycle === "yearly" && yearlySavingsPercent > 0 ? (
            <p className="text-xs font-medium text-emerald-700 sm:text-sm">
              {uiText.onboarding.planSelection.savingsPrefix} {yearlySavingsPercent}%
            </p>
          ) : null}
          <p className="pt-0.5 text-[11px] text-muted-foreground">
            {selectedPlanCosts.trialDays} {uiText.onboarding.planSelection.trialHint}
          </p>
        </div>
      </div>
    </section>
  )
}
