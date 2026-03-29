import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { FaqDialog } from "@/components/marketing/faq-dialog";
import { SectionContainer } from "@/components/marketing/section-container";
import { Button } from "@repo/ui/button";
import { Separator } from "@repo/ui/separator";
import { uiText } from "@/content/ui-text";

const productLinks = uiText.landing.footer.productLinks;
const supportLinks = uiText.landing.footer.supportLinks;
const legalLinks = uiText.landing.footer.legalLinks;

export function SiteFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-muted/30" aria-label={uiText.landing.footer.ariaLabel}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-border/40 to-transparent"
      />
      <SectionContainer className="pb-8 pt-12 md:pt-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <BrandLogo />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              {uiText.landing.footer.brandDescription}
            </p>
          </div>
          <nav aria-label={uiText.landing.footer.productNavAriaLabel} className="lg:text-right">
            <h3 className="mb-4 text-sm font-semibold">{uiText.landing.footer.productHeading}</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="transition-colors hover:text-foreground">
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <FaqDialog>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto px-0 text-sm font-normal text-muted-foreground hover:bg-transparent hover:text-foreground"
                  >
                    {uiText.landing.footer.faqLabel}
                  </Button>
                </FaqDialog>
              </li>
            </ul>
          </nav>
          <nav aria-label={uiText.landing.footer.supportNavAriaLabel} className="lg:text-right">
            <h3 className="mb-4 text-sm font-semibold">{uiText.landing.footer.supportHeading}</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {supportLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="transition-colors hover:text-foreground">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label={uiText.landing.footer.legalNavAriaLabel} className="lg:text-right">
            <h3 className="mb-4 text-sm font-semibold">{uiText.landing.footer.legalHeading}</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <Separator className="my-8 opacity-50" />

        <div className="flex flex-col items-center justify-between gap-6 text-center text-xs text-muted-foreground sm:flex-row sm:text-left">
          <p>
            &copy; {currentYear} {uiText.landing.footer.copyrightSuffix}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-muted-foreground/70">
            <span className="flex items-center gap-1.5">{uiText.landing.footer.builtWithLabel}</span>
            <span className="flex items-center gap-1">
              <span aria-label={uiText.landing.footer.swissFlagLabel} role="img">
                &#x1F1E8;&#x1F1ED;
              </span>
              {uiText.landing.footer.swissPartner}
            </span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1">
              <span aria-label={uiText.landing.footer.germanFlagLabel} role="img">
                &#x1F1E9;&#x1F1EA;
              </span>
              {uiText.landing.footer.germanPartner}
            </span>
          </div>
        </div>
      </SectionContainer>
    </footer>
  );
}
