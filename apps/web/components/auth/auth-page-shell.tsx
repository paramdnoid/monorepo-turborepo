import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { BrandWordmark, BRAND_LOGO_INTRINSIC } from "@/components/brand-logo";
import { uiText } from "@/content/ui-text";

type AuthPageShellProps = {
  children: ReactNode;
  badgeIcon?: LucideIcon;
  badgeLabel?: string;
  heading?: string;
  subtitle?: string;
  hideHero?: boolean;
};

export function AuthPageShell({
  children,
  badgeIcon: BadgeIcon,
  badgeLabel,
  heading,
  subtitle,
  hideHero = false,
}: AuthPageShellProps) {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden bg-gradient-to-br from-background via-muted/30 to-background px-5 py-10 sm:px-8 sm:py-14">
      <div aria-hidden className="enterprise-grid pointer-events-none absolute inset-0 opacity-[0.22]" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-[10%] h-72 w-72 rounded-full bg-primary/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-[4%] -bottom-24 h-72 w-72 rounded-full bg-foreground/5 blur-3xl"
      />

      <main className="relative z-10 mx-auto w-full max-w-6xl">
        <div
          className={`grid items-center gap-8 ${hideHero ? "" : "lg:grid-cols-[1.05fr_0.95fr] lg:gap-14"}`}
        >
          {!hideHero && (
            <header className="max-w-xl text-center lg:text-left">
              <Link
                href="/"
                className="mx-auto mb-6 inline-flex items-center gap-3 lg:mx-0"
                aria-label={uiText.auth.brandHomeLabel}
              >
                <Image
                  src="/logo.png"
                  alt=""
                  width={BRAND_LOGO_INTRINSIC.width}
                  height={BRAND_LOGO_INTRINSIC.height}
                  priority
                  className="h-11 w-auto max-w-[52px] rounded-full object-contain shadow-sm sm:h-12 sm:max-w-[56px]"
                />
                <BrandWordmark
                  nameClassName="text-[2.05rem] sm:text-[2.35rem]"
                  taglineClassName="text-[10px] tracking-[0.2em]"
                />
              </Link>

              {BadgeIcon && badgeLabel && (
                <span className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[0.65rem] font-semibold tracking-[0.13em] text-foreground uppercase backdrop-blur-sm lg:mx-0">
                  <BadgeIcon className="h-3.5 w-3.5" />
                  {badgeLabel}
                </span>
              )}

              {heading && (
                <h1 className="font-sans text-3xl leading-[0.92] font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                  {heading}
                </h1>
              )}
              {subtitle && (
                <p className="mx-auto mt-4 max-w-[42ch] text-sm leading-relaxed text-muted-foreground sm:text-base lg:mx-0">
                  {subtitle}
                </p>
              )}
              {(heading || subtitle) && (
                <ul className="mt-7 space-y-2 text-sm text-foreground/85">
                  <li className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1.5 shadow-sm backdrop-blur-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {uiText.auth.securityHintDsgvo}
                  </li>
                  <li className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1.5 shadow-sm backdrop-blur-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {uiText.auth.securityHint2fa}
                  </li>
                </ul>
              )}
            </header>
          )}

          <div
            className={`mx-auto w-full rounded-3xl border border-border/50 bg-background/45 p-2 shadow-lg shadow-foreground/10 backdrop-blur-sm ${hideHero ? "max-w-124" : "max-w-116"}`}
          >
            {children}
          </div>
        </div>
      </main>
    </section>
  );
}
