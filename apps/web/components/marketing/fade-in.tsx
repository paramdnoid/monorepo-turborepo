"use client";

import { motion, useInView, useReducedMotion, type Variant } from "framer-motion";
import { memo, useRef } from "react";

import { EASE_SMOOTH } from "@/lib/constants";

type Direction = "up" | "down" | "left" | "right" | "none";

const directionVariants: Record<Direction, { hidden: Variant; visible: Variant }> = {
  up: { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0 } },
  down: { hidden: { opacity: 0, y: -30 }, visible: { opacity: 1, y: 0 } },
  left: { hidden: { opacity: 0, x: 40 }, visible: { opacity: 1, x: 0 } },
  right: { hidden: { opacity: 0, x: -40 }, visible: { opacity: 1, x: 0 } },
  none: { hidden: { opacity: 0 }, visible: { opacity: 1 } },
};

export const FadeIn = memo(function FadeIn({
  children,
  className,
  direction = "up",
  delay = 0,
  duration = 0.6,
  once = true,
  amount = 0.15,
}: {
  children: React.ReactNode;
  className?: string;
  direction?: Direction;
  delay?: number;
  duration?: number;
  once?: boolean;
  amount?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, amount });
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion === true) return <div className={className}>{children}</div>;

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={directionVariants[direction]}
      transition={{ duration, delay, ease: EASE_SMOOTH }}
      className={className}
    >
      {children}
    </motion.div>
  );
});

export const StaggerChildren = memo(function StaggerChildren({
  children,
  className,
  staggerDelay = 0.08,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  delay?: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  if (prefersReducedMotion === true) return <div className={className}>{children}</div>;
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.1 }}
      variants={{ hidden: {}, visible: { transition: { staggerChildren: staggerDelay, delayChildren: delay } } }}
      className={className}
    >
      {children}
    </motion.div>
  );
});

export const StaggerItem = memo(function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  const prefersReducedMotion = useReducedMotion();
  if (prefersReducedMotion === true) return <div className={className}>{children}</div>;
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } }}
      transition={{ duration: 0.5, ease: EASE_SMOOTH }}
      className={className}
    >
      {children}
    </motion.div>
  );
});
