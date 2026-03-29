"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { useEffect, useState } from "react";

import { BrandLogo } from "@/components/brand-logo";
import { FaqDialog } from "@/components/marketing/faq-dialog";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SectionContainer } from "@/components/marketing/section-container";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@repo/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@repo/ui/sheet";
import { uiText } from "@/content/ui-text";
import { useAnchorScroll } from "@/hooks/use-anchor-scroll";
import { useHeaderScroll } from "@/hooks/use-header-scroll";

const navLinks = uiText.landing.header.navLinks;
type LandingAnchorHref = (typeof navLinks)[number]["href"];

function getAnchorOffset(href: string, isDesktop: boolean) {
  return href === "#pricing" ? (isDesktop ? 64 : 60) : (isDesktop ? 92 : 80);
}

export function SiteHeader() {
  const scrolled = useHeaderScroll();
  const { handleNavLinkClick } = useAnchorScroll(getAnchorOffset);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [activeHref, setActiveHref] = useState<LandingAnchorHref>(() => navLinks[0]?.href ?? "#trades");

  useEffect(() => {
    const anchorHrefs = navLinks
      .map((link) => link.href)
      .filter((href) => href.startsWith("#")) as LandingAnchorHref[];

    const resolveActiveSection = () => {
      if (anchorHrefs.length === 0) return;
      const currentHash = window.location.hash;
      const matchedHashLink = navLinks.find((link) => link.href === currentHash);
      if (matchedHashLink) {
        setActiveHref(matchedHashLink.href);
        return;
      }

      const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
      const viewportOffset = isDesktop ? 110 : 84;
      let nextActive: LandingAnchorHref = navLinks[0]?.href ?? "#trades";

      for (const href of anchorHrefs) {
        const section = document.querySelector<HTMLElement>(href);
        if (!section) continue;
        const sectionTop = section.getBoundingClientRect().top + window.scrollY - viewportOffset;
        if (window.scrollY >= sectionTop - 6) {
          nextActive = href;
        }
      }

      setActiveHref(nextActive);
    };

    const onScroll = () => resolveActiveSection();
    const onHashChange = () => resolveActiveSection();

    resolveActiveSection();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("hashchange", onHashChange);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  return (
    <header className={`fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,backdrop-filter] ${scrolled ? "bg-background/86 border-border/70 backdrop-blur-xl" : "border-transparent bg-transparent"}`}>
      <SectionContainer className="py-2.5">
        <div className="flex items-center justify-between lg:grid lg:grid-cols-[1fr_auto_1fr]">
          <div className="justify-self-start">
            <BrandLogo />
          </div>

          <nav className="hidden items-center gap-7 lg:flex lg:justify-self-center" aria-label={uiText.landing.header.navigationSheetLabel}>
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(event) => {
                  handleNavLinkClick(event, link.href);
                  setActiveHref(link.href);
                }}
                className={`text-[11px] font-semibold uppercase tracking-[0.11em] transition-colors ${
                  activeHref === link.href ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </a>
            ))}
            <FaqDialog>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto px-0 text-[11px] font-semibold uppercase tracking-[0.11em] text-muted-foreground hover:bg-transparent hover:text-foreground"
              >
                {uiText.landing.header.faqLabel}
              </Button>
            </FaqDialog>
          </nav>

          <div className="hidden items-center gap-2 lg:flex lg:justify-self-end">
            <LanguageSwitcher />
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm" className="h-8 px-2.5 text-[11px] font-semibold tracking-[0.08em] uppercase">
              <Link href="/onboarding">{uiText.landing.header.signInDesktop}</Link>
            </Button>
            <Button asChild size="sm" className="h-8 rounded-md bg-primary px-3.5 text-[11px] font-semibold tracking-[0.08em] uppercase hover:bg-primary/90">
              <Link href="/onboarding">{uiText.landing.header.startTrialDesktop}</Link>
            </Button>
          </div>

          <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label={uiText.landing.header.openMenuLabel}>
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[92vw] border-l border-primary/20 bg-background/78 px-5 py-5 shadow-lg shadow-foreground/10 backdrop-blur-2xl sm:max-w-[390px]"
              aria-label={uiText.landing.header.navigationSheetLabel}
            >
              <SheetHeader className="gap-2 p-0 pr-10">
                <SheetTitle className="font-sans text-xl tracking-tight text-foreground">
                  {uiText.landing.header.navigationSheetTitle}
                </SheetTitle>
                <p className="text-xs text-foreground/70">
                  {uiText.landing.header.navigationSheetDescription}
                </p>
              </SheetHeader>

              <div
                className="my-1 h-px bg-linear-to-r from-transparent via-primary/45 to-transparent"
                aria-hidden
              />

              <nav
                className="flex flex-col gap-2"
                aria-label={uiText.landing.header.mobileNavigationLabel}
              >
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={(event) => {
                      handleNavLinkClick(event, link.href);
                      setActiveHref(link.href);
                      setIsMobileNavOpen(false);
                    }}
                    className={`rounded-lg border px-3 py-3 text-sm font-semibold uppercase tracking-[0.08em] shadow-sm transition-colors ${
                      activeHref === link.href
                        ? "border-primary/55 bg-primary/10 text-foreground"
                        : "border-border/75 bg-background/75 text-foreground/95 hover:border-primary/45 hover:bg-background/95 hover:text-foreground"
                    }`}
                    aria-current={activeHref === link.href ? "true" : undefined}
                  >
                    {link.label}
                  </a>
                ))}
                <FaqDialog>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-10 justify-start rounded-lg border border-border/75 bg-background/75 px-3 text-sm font-semibold uppercase tracking-[0.08em] text-foreground/95 shadow-sm hover:border-primary/45 hover:bg-background/95"
                  >
                    {uiText.landing.header.faqLabel}
                  </Button>
                </FaqDialog>
              </nav>

              <div className="mt-auto grid gap-2 pt-2">
                <div className="flex items-center justify-end">
                  <LanguageSwitcher />
                  <ThemeToggle />
                </div>
                <Button asChild variant="outline" className="h-10 border-border/80 bg-background/80">
                  <Link href="/onboarding" onClick={() => setIsMobileNavOpen(false)}>
                    {uiText.landing.header.signInMobile}
                  </Link>
                </Button>
                <Button
                  asChild
                  className="h-10 bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90"
                >
                  <Link href="/onboarding" onClick={() => setIsMobileNavOpen(false)}>
                    {uiText.landing.header.startTrialMobile}
                  </Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </SectionContainer>
    </header>
  );
}
