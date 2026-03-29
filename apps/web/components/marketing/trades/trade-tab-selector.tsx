"use client";

import { motion } from "framer-motion";

import { trades } from "@/content/trades";
import { TabsList, TabsTrigger } from "@repo/ui/tabs";
import { uiText } from "@/content/ui-text";

export function TradeTabSelector({
  activeSlug,
}: {
  activeSlug: string;
}) {
  return (
    <TabsList aria-label={uiText.onboarding.tradeSelection.ariaLabel} className="flex w-full">
      {trades.map((trade) => {
        const isActive = activeSlug === trade.slug;
        return (
          <TabsTrigger
            key={trade.slug}
            value={trade.slug}
            aria-label={trade.name}
            className={`flex flex-1 items-center justify-center gap-1.5 transition-[color,background-color,border-color,box-shadow,opacity] duration-300 ${
              isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="trades-tab-bg"
                className="absolute inset-0 rounded-md bg-primary"
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
              />
            )}
            <trade.icon
              className="relative z-10 h-3 w-3"
              strokeWidth={isActive ? 2 : 1.5}
            />
            <span className="relative z-10">{trade.tabLabel}</span>
          </TabsTrigger>
        );
      })}
    </TabsList>
  );
}
