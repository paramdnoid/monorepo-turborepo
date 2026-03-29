"use client"

import { ToggleGroup, ToggleGroupItem } from "@/components/onboarding/onboarding-toggle-group"
import { trades } from "@/content/trades"
import { uiText } from "@/content/ui-text"

type OnboardingTradeSelectorProps = {
  selectedTradeSlug: string
  onSelectTrade: (slug: string) => void
}

export function OnboardingTradeSelector({
  selectedTradeSlug,
  onSelectTrade,
}: OnboardingTradeSelectorProps) {
  return (
    <section className="space-y-3">
      <header className="space-y-1">
        <h2 className="font-sans text-lg font-semibold tracking-tight text-foreground">
          {uiText.onboarding.tradeSelection.heading}
        </h2>
        <p className="text-sm text-muted-foreground">
          {uiText.onboarding.tradeSelection.description}
        </p>
      </header>

      <ToggleGroup
        type="single"
        value={selectedTradeSlug}
        onValueChange={(nextValue: string) => {
          if (nextValue) onSelectTrade(nextValue)
        }}
        variant="premium"
        aria-label={uiText.onboarding.tradeSelection.ariaLabel}
        className="grid h-14 w-full grid-cols-3 items-stretch gap-1 overflow-hidden rounded-lg border border-input bg-muted/70 p-1"
      >
        {trades.map((trade) => (
          <ToggleGroupItem
            key={trade.slug}
            value={trade.slug}
            activeStyle="primary"
            aria-label={trade.name}
            className="h-full! min-h-0 w-full justify-center rounded-md px-3 text-sm font-semibold text-foreground/75 transition-colors hover:text-foreground data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:ring-1 data-[state=on]:ring-inset data-[state=on]:ring-background/80"
          >
            <trade.icon className="h-4 w-4 shrink-0" />
            <span>{trade.tabLabel}</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </section>
  )
}
