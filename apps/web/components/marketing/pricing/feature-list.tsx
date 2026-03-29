"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { Check, Minus } from "lucide-react";
import { useRef } from "react";
import { uiText } from "@/content/ui-text";

export function FeatureList({
  features,
  accent,
  previousTierName,
}: {
  features: { label: string }[];
  accent: boolean;
  previousTierName?: string;
}) {
  const ref = useRef<HTMLUListElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const prefersReduced = useReducedMotion();

  return (
    <ul ref={ref} className="space-y-2.5">
      {previousTierName && (
        <li className="flex items-center gap-2.5 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Minus className="h-3 w-3 shrink-0" strokeWidth={2} />
          {uiText.landingSections.pricing.featureListFromPrefix} {previousTierName}
        </li>
      )}
      {features.map((feature, index) => {
        const item = (
          <>
            <div
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                accent ? "bg-primary text-white" : "bg-muted text-muted-foreground"
              }`}
            >
              <Check className="h-2.5 w-2.5" strokeWidth={3} />
            </div>
            <span className="text-sm leading-relaxed text-foreground/80">
              {feature.label}
            </span>
          </>
        );

        if (prefersReduced === true) {
          return (
            <li key={feature.label} className="flex items-start gap-2.5">
              {item}
            </li>
          );
        }

        return (
          <motion.li
            key={feature.label}
            className="flex items-start gap-2.5"
            initial={{ opacity: 0, x: -8 }}
            animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -8 }}
            transition={{ delay: index * 0.04, duration: 0.3 }}
          >
            {item}
          </motion.li>
        );
      })}
    </ul>
  );
}
