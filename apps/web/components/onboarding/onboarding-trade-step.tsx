"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { ArrowLeft } from "lucide-react"

import { Button } from "@repo/ui/button"
import { AuthPageShell } from "@/components/auth/auth-page-shell"
import {
  type OnboardingAccountValues,
  OnboardingCredentialsFields,
  OnboardingProfileFields,
} from "@/components/onboarding/onboarding-account-fields"
import { uiText } from "@/content/ui-text"
import { OnboardingStepActions } from "@/components/onboarding/onboarding-step-actions"
import {
  type OnboardingBillingCycle,
  OnboardingPlanSelector,
  type OnboardingPlanTier,
} from "@/components/onboarding/onboarding-plan-selector"
import { OnboardingEmbeddedCheckout } from "@/components/onboarding/onboarding-embedded-checkout"
import { OnboardingTradeSelector } from "@/components/onboarding/onboarding-trade-selector"
import { BrandWordmark, BRAND_LOGO_INTRINSIC } from "@/components/brand-logo"

type OnboardingTradeStepProps = {
  initialFirstName?: string
  initialLastName?: string
  initialEmail?: string
  initialEmailVerified?: boolean
}

type OnboardingStep = 1 | 2 | 3 | 4 | 5

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidPlanTier(value: string | null): value is OnboardingPlanTier {
  return value === "starter" || value === "professional"
}

function normalizePlanTier(value: string | null): OnboardingPlanTier {
  return value === "professional" ? "professional" : "starter"
}

function normalizeBillingCycle(value: string | null): OnboardingBillingCycle {
  return value === "yearly" ? "yearly" : "monthly"
}

function parseInitialStep(params: URLSearchParams, planSkipped: boolean): OnboardingStep {
  const raw = params.get("step")
  if (!raw) return planSkipped ? 2 : 1
  const n = Number.parseInt(raw, 10)
  if (Number.isNaN(n) || n < 1 || n > 5) return planSkipped ? 2 : 1
  if (n === 1 && planSkipped) return 2
  const emailVerifyOk = params.get("emailVerify") === "ok"
  if (n === 4 && emailVerifyOk) return 4
  if (n === 4 || n === 5) return planSkipped ? 2 : 1
  return n as OnboardingStep
}

export function OnboardingTradeStep({
  initialFirstName = "",
  initialLastName = "",
  initialEmail = "",
  initialEmailVerified = false,
}: OnboardingTradeStepProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPlanStepSkipped] = useState(() => isValidPlanTier(searchParams.get("plan")))
  const wasCheckoutCancelled = searchParams.get("payment") === "cancelled"
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(() =>
    parseInitialStep(searchParams, isValidPlanTier(searchParams.get("plan"))),
  )
  const [selectedTradeSlug, setSelectedTradeSlug] = useState("")
  const [selectedPlanTier, setSelectedPlanTier] = useState<OnboardingPlanTier>(() =>
    normalizePlanTier(searchParams.get("plan")),
  )
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<OnboardingBillingCycle>(() =>
    normalizeBillingCycle(searchParams.get("billing")),
  )
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [checkoutClientSecret, setCheckoutClientSecret] = useState<string | null>(null)
  const [verificationEmailSent, setVerificationEmailSent] = useState(false)
  const [emailVerified, setEmailVerified] = useState(initialEmailVerified)
  const [isResumingSetupIntent, setIsResumingSetupIntent] = useState(false)
  const [resumeBillingDisabled, setResumeBillingDisabled] = useState(false)
  const [resumeSetupError, setResumeSetupError] = useState<string | null>(null)
  const [accountValues, setAccountValues] = useState<OnboardingAccountValues>({
    companyName: "",
    firstName: initialFirstName,
    lastName: initialLastName,
    email: initialEmail,
    password: "",
    confirmPassword: "",
  })

  useEffect(() => {
    if (initialEmailVerified) {
      setEmailVerified(true)
    }
  }, [initialEmailVerified])

  useEffect(() => {
    if (searchParams.get("emailVerify") !== "ok") return
    setEmailVerified(true)
    setVerificationEmailSent(true)
  }, [searchParams])

  useEffect(() => {
    if (searchParams.get("emailVerify") !== "ok") return

    let cancelled = false
    setIsResumingSetupIntent(true)
    setResumeSetupError(null)
    setResumeBillingDisabled(false)

    async function run() {
      try {
        const response = await fetch("/api/onboarding/resume-setup-intent", {
          method: "POST",
          credentials: "include",
        })
        const data = (await response.json().catch(() => null)) as
          | {
              billingDisabled?: boolean
              setupIntentClientSecret?: string
              error?: string
            }
          | null

        if (cancelled) return

        const next = new URLSearchParams(searchParams.toString())
        next.delete("emailVerify")
        router.replace(`/onboarding?${next.toString()}`, { scroll: false })

        if (data?.billingDisabled) {
          setResumeBillingDisabled(true)
          return
        }
        if (!response.ok || !data?.setupIntentClientSecret) {
          setResumeSetupError(data?.error ?? uiText.onboarding.actions.submitError)
          return
        }
        setCheckoutClientSecret(data.setupIntentClientSecret)
      } finally {
        setIsResumingSetupIntent(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [searchParams, router])

  useEffect(() => {
    if (searchParams.get("step") === String(currentStep)) return
    const next = new URLSearchParams(searchParams.toString())
    next.set("step", String(currentStep))
    router.replace(`/onboarding?${next.toString()}`, { scroll: false })
  }, [currentStep, router, searchParams])

  useEffect(() => {
    if (currentStep !== 4 || !verificationEmailSent || emailVerified) return

    let cancelled = false
    async function poll() {
      try {
        const response = await fetch("/api/auth/email-verification-status")
        if (!response.ok || cancelled) return
        const data = (await response.json()) as { emailVerified?: boolean }
        if (data.emailVerified) {
          setEmailVerified(true)
        }
      } catch {
        /* ignore */
      }
    }

    void poll()
    const id = window.setInterval(poll, 4000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [currentStep, verificationEmailSent, emailVerified])

  const normalized = {
    companyName: accountValues.companyName.trim(),
    firstName: accountValues.firstName.trim(),
    lastName: accountValues.lastName.trim(),
    email: accountValues.email.trim(),
    password: accountValues.password,
    confirmPassword: accountValues.confirmPassword,
  }

  const shouldWarnBeforeUnload = useMemo(() => {
    if (currentStep === 1) return false
    return (
      currentStep === 4 ||
      currentStep === 5 ||
      normalized.companyName.length > 0 ||
      normalized.firstName.length > 0 ||
      normalized.lastName.length > 0 ||
      selectedTradeSlug.length > 0 ||
      normalized.email.length > 0 ||
      normalized.password.length > 0 ||
      normalized.confirmPassword.length > 0
    )
  }, [
    currentStep,
    selectedTradeSlug,
    normalized.companyName,
    normalized.firstName,
    normalized.lastName,
    normalized.email,
    normalized.password,
    normalized.confirmPassword,
  ])

  useEffect(() => {
    if (!shouldWarnBeforeUnload) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [shouldWarnBeforeUnload])

  const isStepOneValid =
    normalized.companyName.length > 0 &&
    normalized.firstName.length > 0 &&
    normalized.lastName.length > 0 &&
    selectedTradeSlug.length > 0

  const isStepTwoValid =
    emailPattern.test(normalized.email) &&
    normalized.password.length >= 8 &&
    normalized.confirmPassword.length >= 8 &&
    normalized.password === normalized.confirmPassword

  const totalSteps = isPlanStepSkipped ? 4 : 5
  const visibleStepNumber = isPlanStepSkipped ? currentStep - 1 : currentStep
  const canGoBack = currentStep > (isPlanStepSkipped ? 2 : 1)
  const isFinalStep = currentStep === 3

  const canProceed =
    currentStep === 1 ? true : currentStep === 2 ? isStepOneValid : currentStep === 3 ? isStepTwoValid : false

  const canContinueToCheckout = !verificationEmailSent || emailVerified

  const currentStepTitle =
    currentStep === 1
      ? uiText.onboarding.steps.planTitle
      : currentStep === 2
        ? uiText.onboarding.steps.profileAndTradeTitle
        : currentStep === 3
          ? uiText.onboarding.steps.credentialsTitle
          : currentStep === 4
            ? uiText.onboarding.steps.verifyEmailTitle
            : uiText.onboarding.steps.checkoutTitle

  const baseStatusMessage =
    currentStep === 1
      ? uiText.onboarding.actions.planReadyHint
      : currentStep === 2
        ? (isStepOneValid
          ? uiText.onboarding.actions.profileReadyHint
          : uiText.onboarding.actions.profileRequiredHint)
        : currentStep === 3
          ? (isStepTwoValid
            ? uiText.onboarding.actions.credentialsReadyHint
            : uiText.onboarding.actions.credentialsRequiredHint)
          : currentStep === 4
            ? (canContinueToCheckout
              ? uiText.onboarding.actions.verifyReadyHint
              : uiText.onboarding.actions.verifyPendingHint)
            : uiText.onboarding.actions.checkoutReadyHint
  const statusMessage = submitError
    ? submitError
    : isSubmitting
      ? uiText.onboarding.actions.authRedirectHint
      : wasCheckoutCancelled
        ? uiText.onboarding.actions.checkoutCancelledHint
        : baseStatusMessage

  function syncOnboardingQuery(planTier: OnboardingPlanTier, billingCycle: OnboardingBillingCycle) {
    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.set("plan", planTier)
    nextParams.set("billing", billingCycle)
    nextParams.set("step", String(currentStep))
    router.replace(`/onboarding?${nextParams.toString()}`)
  }

  function handleAccountChange(field: keyof OnboardingAccountValues, value: string) {
    setSubmitError(null)
    setAccountValues((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function handleNextStep() {
    if (currentStep === 1) {
      setSubmitError(null)
      setCurrentStep(2)
      return
    }
    if (currentStep === 2 && !isStepOneValid) return
    setSubmitError(null)
    setCurrentStep(3)
  }

  function handlePreviousStep() {
    if (!canGoBack) return
    setSubmitError(null)
    if (currentStep === 3) {
      setCheckoutClientSecret(null)
      setCurrentStep(2)
      return
    }
    if (currentStep === 5) {
      if (verificationEmailSent) {
        setCurrentStep(4)
      } else {
        setCheckoutClientSecret(null)
        setCurrentStep(3)
      }
      return
    }
    if (currentStep === 4) {
      setCheckoutClientSecret(null)
      setCurrentStep(3)
      return
    }
    if (currentStep === 2 && !isPlanStepSkipped) {
      setCurrentStep(1)
    }
  }

  async function handleFinishStep() {
    if (!isStepTwoValid || isSubmitting) return

    setSubmitError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/onboarding/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyName: normalized.companyName,
          firstName: normalized.firstName,
          lastName: normalized.lastName,
          tradeSlug: selectedTradeSlug,
          planTier: selectedPlanTier,
          billingCycle: selectedBillingCycle,
          email: normalized.email.toLowerCase(),
          password: normalized.password,
        }),
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string; code?: string }
          | null
        if (payload?.code === "EMAIL_ALREADY_EXISTS") {
          setSubmitError(uiText.onboarding.actions.duplicateEmailError)
          return
        }
        setSubmitError(payload?.error ?? uiText.onboarding.actions.submitError)
        return
      }

      const payload = (await response.json().catch(() => null)) as
        | {
            setupIntentClientSecret?: string
            verificationEmailSent?: boolean
          }
        | null
      if (payload?.verificationEmailSent) {
        setVerificationEmailSent(true)
      }
      if (payload?.setupIntentClientSecret) {
        setCheckoutClientSecret(payload.setupIntentClientSecret)
        if (payload?.verificationEmailSent) {
          setCurrentStep(4)
        } else {
          setCurrentStep(5)
        }
        return
      }

      router.push("/")
      router.refresh()
    } catch {
      setSubmitError(uiText.onboarding.actions.submitError)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthPageShell hideHero>
      <section className="premium-panel animate-panel-enter rounded-[1.15rem] p-3.5 backdrop-blur-sm sm:p-4">
        <div className="relative z-2 space-y-3">
          <div className="space-y-2.5 pb-0.5">
            <Link
              href="/"
              className="flex w-fit items-center gap-1.5"
              aria-label={uiText.auth.brandHomeLabel}
            >
              <Image
                src="/logo.png"
                alt=""
                width={BRAND_LOGO_INTRINSIC.width}
                height={BRAND_LOGO_INTRINSIC.height}
                priority
                className="h-7 w-auto max-w-[30px] rounded-full object-contain shadow-sm"
              />
              <BrandWordmark
                nameClassName="text-[1rem]"
                taglineClassName="text-[7px] tracking-[0.16em]"
              />
            </Link>

            <span className="auth-form-kicker mt-1 inline-flex">
              <span className="auth-form-kicker-dot" />
              {uiText.onboarding.badge}
            </span>

            <h1 className="font-sans text-2xl leading-[0.96] font-bold tracking-tight text-foreground sm:text-3xl">
              {uiText.onboarding.heading}
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {uiText.onboarding.description}
            </p>
            <p className="auth-label text-muted-foreground">
              {uiText.onboarding.steps.label} {visibleStepNumber} {uiText.onboarding.steps.of}{" "}
              {totalSteps} - {currentStepTitle}
            </p>
          </div>

          <div className="space-y-4">
            {currentStep === 1 ? (
              <OnboardingPlanSelector
                selectedPlanTier={selectedPlanTier}
                selectedBillingCycle={selectedBillingCycle}
                onSelectPlanTier={(planTier) => {
                  setSubmitError(null)
                  setSelectedPlanTier(planTier)
                  syncOnboardingQuery(planTier, selectedBillingCycle)
                }}
                onSelectBillingCycle={(billingCycle) => {
                  setSubmitError(null)
                  setSelectedBillingCycle(billingCycle)
                  syncOnboardingQuery(selectedPlanTier, billingCycle)
                }}
              />
            ) : currentStep === 2 ? (
              <>
                <OnboardingProfileFields
                  values={accountValues}
                  onChange={handleAccountChange}
                />
                <OnboardingTradeSelector
                  selectedTradeSlug={selectedTradeSlug}
                  onSelectTrade={(tradeSlug) => {
                    setSubmitError(null)
                    setSelectedTradeSlug(tradeSlug)
                  }}
                />
              </>
            ) : currentStep === 3 ? (
              <OnboardingCredentialsFields
                values={accountValues}
                onChange={handleAccountChange}
              />
            ) : currentStep === 4 ? (
              <div className="space-y-4">
                {verificationEmailSent ? (
                  <p
                    className="text-muted-foreground border-border/60 rounded-lg border border-dashed px-3 py-2 text-sm leading-relaxed"
                    role="status"
                  >
                    {uiText.onboarding.actions.verificationEmailHint}
                  </p>
                ) : null}
                {isResumingSetupIntent ? (
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {uiText.onboarding.actions.preparingCheckout}
                  </p>
                ) : null}
                {resumeSetupError ? (
                  <p className="text-destructive text-sm leading-relaxed" role="alert">
                    {resumeSetupError}
                  </p>
                ) : null}
                {!isResumingSetupIntent ? (
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {canContinueToCheckout
                      ? uiText.onboarding.actions.verifyReadyHint
                      : verificationEmailSent
                        ? uiText.onboarding.actions.verifyPendingHint
                        : uiText.onboarding.actions.verifyReadyHint}
                  </p>
                ) : null}
                <div className="my-1.5" aria-hidden>
                  <span className="block h-px w-full bg-border/75" />
                </div>
                <div className="flex w-full min-w-0 flex-col-reverse gap-2 sm:flex-row sm:items-stretch">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-auto min-h-9 w-full min-w-0 shrink gap-2 whitespace-normal py-2 text-center leading-snug sm:flex-1"
                    onClick={() => {
                      setSubmitError(null)
                      setCheckoutClientSecret(null)
                      setResumeBillingDisabled(false)
                      setResumeSetupError(null)
                      setCurrentStep(3)
                    }}
                  >
                    <ArrowLeft className="h-4 w-4 shrink-0 self-center" aria-hidden />
                    <span className="min-w-0 text-balance">
                      {uiText.onboarding.checkout.backToCredentials}
                    </span>
                  </Button>
                  <Button
                    type="button"
                    className="h-auto min-h-9 w-full min-w-0 shrink gap-2 whitespace-normal py-2 text-center leading-snug sm:flex-1"
                    disabled={
                      !canContinueToCheckout ||
                      isResumingSetupIntent ||
                      (!checkoutClientSecret && !resumeBillingDisabled) ||
                      Boolean(resumeSetupError)
                    }
                    onClick={() => {
                      setSubmitError(null)
                      if (resumeBillingDisabled) {
                        router.push("/?onboarding=completed")
                        router.refresh()
                        return
                      }
                      setCurrentStep(5)
                    }}
                  >
                    <span className="min-w-0 text-balance">
                      {resumeBillingDisabled
                        ? uiText.onboarding.actions.cancel
                        : uiText.onboarding.actions.continueToCheckout}
                    </span>
                  </Button>
                </div>
              </div>
            ) : currentStep === 5 && checkoutClientSecret ? (
              <OnboardingEmbeddedCheckout
                clientSecret={checkoutClientSecret}
                backButtonLabel={
                  verificationEmailSent
                    ? uiText.onboarding.checkout.backToVerify
                    : uiText.onboarding.checkout.backToCredentials
                }
                onBack={() => {
                  setSubmitError(null)
                  if (verificationEmailSent) {
                    setCurrentStep(4)
                  } else {
                    setCheckoutClientSecret(null)
                    setCurrentStep(3)
                  }
                }}
                onConfirm={async (setupIntentId) => {
                  const response = await fetch("/api/onboarding/complete-billing", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      setupIntentId,
                    }),
                  })

                  if (!response.ok) {
                    const payload = (await response.json().catch(() => null)) as
                      | { error?: string }
                      | null
                    throw new Error(payload?.error ?? uiText.onboarding.actions.submitError)
                  }

                  router.push("/?onboarding=completed")
                  router.refresh()
                }}
              />
            ) : null}
          </div>

          {currentStep !== 4 && currentStep !== 5 ? (
            <>
              <div className="my-1.5" aria-hidden>
                <span className="block h-px w-full bg-border/75" />
              </div>

              <OnboardingStepActions
                canGoBack={canGoBack}
                isFinalStep={isFinalStep}
                canProceed={canProceed}
                isSubmitting={isSubmitting}
                statusMessage={statusMessage}
                hasStatusError={Boolean(submitError)}
                finishLabel={uiText.onboarding.actions.startCheckout}
                finishingLabel={uiText.onboarding.actions.preparingCheckout}
                onNextStep={handleNextStep}
                onPreviousStep={handlePreviousStep}
                onFinishStep={handleFinishStep}
              />
            </>
          ) : null}
        </div>
      </section>
    </AuthPageShell>
  )
}
