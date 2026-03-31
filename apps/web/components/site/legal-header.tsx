"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { BrandLogo } from "@/components/brand-logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@repo/ui/button"
import { uiText } from "@/content/ui-text"
import { cn } from "@repo/ui/utils"

const legalPages = [
  { href: "/legal/imprint", label: uiText.legal.tabs.imprint },
  { href: "/legal/privacy", label: uiText.legal.tabs.privacy },
  { href: "/legal/terms", label: uiText.legal.tabs.terms },
  { href: "/legal/faq", label: uiText.legal.tabs.faq },
] as const

export function LegalHeader() {
  const pathname = usePathname()

  return (
    <header className="executive-nav sticky top-0 z-50 border-b shadow-[0_2px_18px_-10px_rgba(2,6,23,0.45)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center py-3">
          <div className="justify-self-start">
            <BrandLogo />
          </div>

          <nav
            aria-label={uiText.legal.headerNavAriaLabel}
            className="hidden items-center justify-self-center gap-8 sm:flex"
          >
            {legalPages.map((page) => {
              const isActive = pathname === page.href
              return (
                <Link
                  key={page.href}
                  href={page.href}
                  className={cn(
                    "text-sm font-semibold transition-colors",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  {page.label}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-2 justify-self-end">
            <ThemeToggle />
            <Button
              asChild
              size="sm"
              className="border border-primary/80 bg-primary/95 font-semibold tracking-[0.06em] text-primary-foreground uppercase transition-[color,background-color,border-color,box-shadow] hover:bg-primary"
            >
              <Link href="/">{uiText.legal.homeCta}</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
