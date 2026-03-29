"use client";

import brandLogo from "@repo/brand/logo";
import { Separator } from "@repo/ui/separator";
import Image from "next/image";

import { getMarketingSiteUrl } from "@/lib/site-url";
import { getUiText } from "@web/content/ui-text";
import type { Locale } from "@web/lib/i18n/locale";

type DocsMarketingFooterProps = {
  locale?: Locale;
};

/**
 * Entspricht `apps/web/components/marketing/site-footer.tsx`: volle Viewport-Breite,
 * Inhalt in `max-w-7xl` wie auf der Landingpage.
 */
export function DocsMarketingFooter({ locale = "de" }: DocsMarketingFooterProps) {
  const ui = getUiText(locale);
  const f = ui.landing.footer;
  const branding = ui.branding;
  const siteUrl = getMarketingSiteUrl();
  const year = new Date().getFullYear();

  const baseUrl = siteUrl.replace(/\/$/, "");
  const productLinks = f.productLinks.map((link) => ({
    ...link,
    href: link.href.startsWith("#") ? `${baseUrl}${link.href}` : link.href,
  }));

  return (
    <footer
      id="kontakt"
      className="relative mt-auto w-full bg-muted/30"
      aria-label={f.ariaLabel}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-border/40 to-transparent"
      />
      <div className="mx-auto max-w-7xl px-4 pb-8 pt-12 sm:px-6 md:pt-16 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <a
              href={siteUrl}
              className="group flex min-w-0 items-center gap-2.5"
              aria-label={branding.homeAriaLabel}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                src={brandLogo}
                alt=""
                role="presentation"
                width={40}
                height={48}
                className="h-8 w-auto max-w-[36px] shrink-0 object-contain sm:h-9 sm:max-w-[40px]"
              />
              {/* Schriftgrößen wie `DocsSiteHeader` (ZunftGewerk + Unterzeile) */}
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="font-sans text-base font-bold tracking-tight text-foreground sm:text-[1.15rem]">
                  Zunft<span className="text-foreground/75">Gewerk</span>
                </span>
                <span className="mt-0.5 text-[10px] font-medium text-muted-foreground sm:text-[11px]">
                  Kontakt und Rechtliches
                </span>
              </span>
            </a>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">{f.brandDescription}</p>
          </div>

          <nav aria-label={f.productNavAriaLabel} className="lg:text-right">
            <h3 className="mb-4 text-sm font-semibold">{f.productHeading}</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="transition-colors hover:text-foreground"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <a href="#faq" className="transition-colors hover:text-foreground">
                  {f.faqLabel}
                </a>
              </li>
            </ul>
          </nav>

          <nav aria-label={f.supportNavAriaLabel} className="lg:text-right">
            <h3 className="mb-4 text-sm font-semibold">{f.supportHeading}</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {f.supportLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="transition-colors hover:text-foreground">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label={f.legalNavAriaLabel} className="lg:text-right">
            <h3 className="mb-4 text-sm font-semibold">{f.legalHeading}</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {f.legalLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={`${siteUrl}${link.href}`}
                    className="transition-colors hover:text-foreground"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <Separator className="my-8 opacity-50" />

        <div className="flex flex-col items-center justify-between gap-6 text-center text-xs text-muted-foreground sm:flex-row sm:text-left">
          <p>
            &copy; {year} {f.copyrightSuffix}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-muted-foreground/70">
            <span className="flex items-center gap-1.5">{f.builtWithLabel}</span>
            <span className="flex items-center gap-1">
              <span aria-label={f.swissFlagLabel} role="img">
                &#x1F1E8;&#x1F1ED;
              </span>
              {f.swissPartner}
            </span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1">
              <span aria-label={f.germanFlagLabel} role="img">
                &#x1F1E9;&#x1F1EA;
              </span>
              {f.germanPartner}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
