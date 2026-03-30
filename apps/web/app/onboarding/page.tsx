import type { Metadata } from "next"
import { Suspense } from "react"

import { OnboardingTradeStep } from "@/components/onboarding/onboarding-trade-step"
import { getUiText } from "@/content/ui-text"
import { getAuthSessionEmailVerified, getAuthSessionUser } from "@/lib/auth/session-user"
import { getServerLocale } from "@/lib/i18n/server-locale"

export async function generateMetadata(): Promise<Metadata> {
  const uiText = getUiText(await getServerLocale())
  return {
    title: uiText.onboarding.metaTitle,
    description: uiText.onboarding.metaDescription,
  }
}

function splitName(name: string) {
  const trimmed = name.trim()
  if (!trimmed) {
    return { firstName: "", lastName: "" }
  }

  const segments = trimmed.split(/\s+/)
  if (segments.length === 1) {
    return { firstName: segments[0], lastName: "" }
  }

  return {
    firstName: segments[0],
    lastName: segments.slice(1).join(" "),
  }
}

function normalizeNamePrefill(name: string) {
  const trimmed = name.trim()
  if (!trimmed || trimmed === "Angemeldet") {
    return { firstName: "", lastName: "" }
  }

  return splitName(trimmed)
}

function normalizeEmailPrefill(email: string) {
  const trimmed = email.trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : ""
}

export default async function OnboardingPage() {
  const user = await getAuthSessionUser()
  const initialEmailVerified = await getAuthSessionEmailVerified()
  const { firstName, lastName } = normalizeNamePrefill(user.name)

  return (
    <Suspense fallback={null}>
      <OnboardingTradeStep
        initialFirstName={firstName}
        initialLastName={lastName}
        initialEmail={normalizeEmailPrefill(user.email)}
        initialEmailVerified={initialEmailVerified}
      />
    </Suspense>
  )
}
