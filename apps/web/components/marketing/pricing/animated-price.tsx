"use client";

import { useAnimatedNumber } from "@/hooks/use-animated-number";
import type { Locale } from "@/lib/i18n/locale";

import { formatEurInteger } from "@/components/marketing/pricing/pricing-types";

export function AnimatedPrice({
  amount,
  yearly,
  accent,
  monthlyAmount,
  locale,
}: {
  amount: number;
  yearly: boolean;
  accent: boolean;
  monthlyAmount: number | null;
  locale: Locale;
}) {
  const shown = useAnimatedNumber(amount, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.5,
  });

  const showStrikethrough = yearly && monthlyAmount != null && monthlyAmount !== amount;

  return (
    <div className="flex items-baseline gap-2">
      {showStrikethrough && (
        <span className="text-base font-medium text-muted-foreground tabular-nums line-through decoration-muted-foreground/50">
          {formatEurInteger(monthlyAmount, locale)}
        </span>
      )}
      <span
        className={`font-sans text-3xl font-extrabold tracking-tight tabular-nums sm:text-4xl ${
          accent ? "text-primary" : "text-foreground"
        }`}
      >
        {formatEurInteger(shown, locale)}
      </span>
    </div>
  );
}
