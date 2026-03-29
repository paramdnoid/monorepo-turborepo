"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";

import { TradeFeature } from "@/components/marketing/trades/trade-feature";
import { TradeTabSelector } from "@/components/marketing/trades/trade-tab-selector";
import { Tabs, TabsContent } from "@repo/ui/tabs";
import { Button } from "@repo/ui/button";
import { type Trade } from "@/content/trades";
import { uiText } from "@/content/ui-text";
import { useAnchorScroll } from "@/hooks/use-anchor-scroll";
import { EASE_SMOOTH } from "@/lib/constants";

export function TradeContent({
  trade,
  activeSlug,
  onSelect,
}: {
  trade: Trade;
  activeSlug: string;
  onSelect: (slug: string) => void;
}) {
  const prefersReduced = useReducedMotion();
  const { handleNavLinkClick } = useAnchorScroll((href, isDesktop) =>
    href === "#pricing" ? (isDesktop ? 64 : 60) : (isDesktop ? 92 : 80)
  );

  const text = uiText.landingSections.trades;

  return (
    <Tabs value={activeSlug} onValueChange={onSelect}>
      <div className="grid grid-cols-1 items-start gap-9 lg:grid-cols-[340px_1fr] lg:gap-0">
        <div className="flex flex-col gap-5 lg:sticky lg:top-24 lg:pr-8">
          <TradeTabSelector activeSlug={activeSlug} />

          <TabsContent value={trade.slug}>
            <AnimatePresence mode="wait">
              <motion.div
                key={trade.slug}
                initial={prefersReduced ? false : { opacity: 0, x: -10 }}
                animate={prefersReduced ? {} : { opacity: 1, x: 0 }}
                exit={prefersReduced ? {} : { opacity: 0, x: 10 }}
                transition={{ duration: 0.25, ease: EASE_SMOOTH }}
                className="flex flex-col gap-5"
              >
                <div>
                  {trade.highlight && (
                    <span className="mb-2 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary ring-1 ring-primary/20 ring-inset">
                      {trade.highlight}
                    </span>
                  )}
                  <p className="text-[13px] leading-relaxed text-muted-foreground">
                    {trade.description}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                  {trade.stats.map((stat) => (
                    <div key={stat.label} className="text-center">
                      <p className="font-sans text-lg font-bold text-primary">
                        {stat.value}
                      </p>
                      <p className="text-xs leading-tight text-muted-foreground">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground">
                    {text.coreFeaturesLabel}
                  </p>
                  <ul className="space-y-1.5">
                    {trade.coreFeatures.map((feature) => (
                      <li
                        key={feature.label}
                        className="flex items-center gap-2 text-xs text-muted-foreground"
                      >
                        <Check
                          className="h-3 w-3 shrink-0 text-primary"
                          strokeWidth={2.5}
                          aria-hidden="true"
                        />
                        {feature.label}
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  
                  size="sm"
                  className="h-11 gap-2 shadow-md shadow-primary/25"
                  asChild
                >
                  <a
                    href="#pricing"
                    onClick={(event) => handleNavLinkClick(event, "#pricing")}
                  >
                    {text.cta}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                </Button>
              </motion.div>
            </AnimatePresence>
          </TabsContent>
        </div>

        <div className="lg:border-l lg:border-border/40 lg:pl-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={trade.slug}
              initial={prefersReduced ? false : { opacity: 0, y: 12 }}
              animate={prefersReduced ? {} : { opacity: 1, y: 0 }}
              exit={prefersReduced ? {} : { opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: EASE_SMOOTH }}
            >
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground sm:mb-4">
                {text.specificLabel}
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {trade.tradeFeatures.map((feature, index) => (
                  <motion.div
                    key={feature.label}
                    initial={prefersReduced ? false : { opacity: 0, y: 8 }}
                    animate={prefersReduced ? {} : { opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.25,
                      delay: prefersReduced ? 0 : index * 0.05,
                      ease: EASE_SMOOTH,
                    }}
                  >
                    <TradeFeature feature={feature} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </Tabs>
  );
}
