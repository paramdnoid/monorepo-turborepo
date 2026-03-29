"use client"

import { Globe } from "lucide-react"

import { Button } from "@repo/ui/button"
import { LOCALE_COOKIE_NAME, type Locale, normalizeLocale } from "@/lib/i18n/locale"

const LOCALE_LABELS: Record<Locale, string> = {
  de: "DE",
  en: "EN",
}

export function LanguageSwitcher() {
  const currentLocale = normalizeLocale(
    typeof document === "undefined" ? null : document.documentElement.lang
  ) ?? "de"
  const nextLocale: Locale = currentLocale === "de" ? "en" : "de"
  const switchLabel =
    currentLocale === "en"
      ? `Switch language to ${LOCALE_LABELS[nextLocale]}`
      : `Sprache wechseln zu ${LOCALE_LABELS[nextLocale]}`

  const handleSwitch = () => {
    document.cookie = `${LOCALE_COOKIE_NAME}=${nextLocale}; path=/; max-age=31536000; samesite=lax`
    window.location.reload()
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 px-2.5 text-[11px] font-semibold tracking-[0.08em] uppercase"
      onClick={handleSwitch}
      aria-label={switchLabel}
      title={switchLabel}
    >
      <Globe className="mr-1.5 size-3.5" aria-hidden />
      {LOCALE_LABELS[currentLocale]}
    </Button>
  )
}
