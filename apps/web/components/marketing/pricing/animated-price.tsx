"use client";

import { useAnimatedNumber } from "@/hooks/use-animated-number";

export function AnimatedPrice({
  amount,
  yearly,
  accent,
  monthlyAmount,
}: {
  amount: number;
  yearly: boolean;
  accent: boolean;
  monthlyAmount: number | null;
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
        <span className="text-base font-medium text-muted-foreground line-through decoration-muted-foreground/50">
          EUR{monthlyAmount}
        </span>
      )}
      <span
        className={`font-sans text-3xl font-extrabold tracking-tight sm:text-4xl ${
          accent ? "text-primary" : "text-foreground"
        }`}
      >
        EUR{shown}
      </span>
    </div>
  );
}
