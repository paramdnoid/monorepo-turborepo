import { ToggleGroup, ToggleGroupItem } from "@/components/onboarding/onboarding-toggle-group";
import { uiText } from "@/content/ui-text";

export function BillingToggle({
  yearly,
  onToggle,
  maxSavings,
}: {
  yearly: boolean;
  onToggle: () => void;
  maxSavings: number;
}) {
  const value = yearly ? "yearly" : "monthly";

  return (
    <div className="mx-auto mb-6 flex items-center justify-center px-2 sm:mb-8">
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(next: string) => {
          if (next && next !== value) onToggle();
        }}
        variant="premium"
        aria-label={uiText.landingSections.pricing.billingAriaLabel}
        className="inline-flex max-w-full flex-wrap items-center justify-center gap-1 rounded-lg border border-border/70 bg-background/85 p-0.5 shadow-sm"
      >
        <ToggleGroupItem
          value="monthly"
          size="md"
          activeStyle="primary"
          className="h-8 rounded-md px-3 text-sm font-semibold tracking-tight transition-[color,background-color,box-shadow] sm:px-4 data-[state=off]:bg-transparent data-[state=off]:text-foreground/65 data-[state=off]:hover:text-foreground data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-[0_6px_16px_-10px_rgba(241,122,36,0.9)]"
        >
          {uiText.landingSections.pricing.billingMonthly}
        </ToggleGroupItem>
        <ToggleGroupItem
          value="yearly"
          size="md"
          activeStyle="primary"
          className="flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-semibold tracking-tight transition-[color,background-color,box-shadow] sm:px-4 data-[state=off]:bg-transparent data-[state=off]:text-foreground/65 data-[state=off]:hover:text-foreground data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-[0_6px_16px_-10px_rgba(241,122,36,0.9)]"
        >
          {uiText.landingSections.pricing.billingYearly}
          {maxSavings > 0 ? (
            <span className="inline-flex items-center rounded-sm bg-emerald-500 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white ring-1 ring-emerald-600/30 group-data-[state=on]/toggle:bg-primary-foreground/18 group-data-[state=on]/toggle:text-primary-foreground group-data-[state=on]/toggle:ring-primary-foreground/30">
              -{maxSavings}%
            </span>
          ) : null}
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
