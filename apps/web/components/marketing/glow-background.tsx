import type { ReactNode } from "react";

type GlowVariant = "default" | "subtle" | "centered";

const variantOrbs: Record<GlowVariant, ReactNode> = {
  default: (
    <>
      <div className="animate-glow-pulse absolute -top-40 right-1/4 h-125 w-125 rounded-full bg-primary/7 blur-[100px]" />
      <div className="animate-glow-pulse absolute -bottom-32 left-1/4 h-100 w-100 rounded-full bg-primary/6 blur-[100px] [animation-delay:2s]" />
      <div className="animate-glow-pulse absolute left-1/2 top-1/3 h-75 w-75 -translate-x-1/2 rounded-full bg-primary/4 blur-[80px] [animation-delay:1s]" />
    </>
  ),
  subtle: (
    <>
      <div className="animate-glow-pulse absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-primary/4 blur-[120px]" />
      <div className="animate-glow-pulse absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-amber-500/3 blur-[100px] [animation-delay:2s]" />
    </>
  ),
  centered: (
    <>
      <div className="animate-glow-pulse absolute left-1/4 top-1/2 h-100 w-100 -translate-y-1/2 rounded-full bg-primary/6 blur-[100px]" />
      <div className="animate-glow-pulse absolute right-1/4 top-1/2 h-88 w-88 -translate-y-1/2 rounded-full bg-primary/5 blur-[100px] [animation-delay:2s]" />
    </>
  ),
};

export function GlowBackground({ variant = "default" }: { variant?: GlowVariant }) {
  return <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">{variantOrbs[variant]}</div>;
}
