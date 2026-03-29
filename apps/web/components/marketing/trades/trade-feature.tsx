"use client";

import { type TradeFeatureItem } from "@/content/trades";

import { TradeFeatureIcon } from "@/components/marketing/trades/trade-feature-icon";

export function TradeFeature({ feature }: { feature: TradeFeatureItem }) {
  return (
    <div className="group flex items-start gap-3 rounded-xl p-3.5 transition-[color,background-color,border-color,box-shadow,opacity] duration-200 hover:bg-primary/4 sm:gap-4 sm:p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/8 ring-1 ring-primary/10 transition-colors duration-200 group-hover:bg-primary/12 group-hover:ring-primary/20">
        <TradeFeatureIcon name={feature.icon} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-tight text-foreground">
          {feature.label}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground sm:text-[13px]">
          {feature.description}
        </p>
      </div>
    </div>
  );
}
