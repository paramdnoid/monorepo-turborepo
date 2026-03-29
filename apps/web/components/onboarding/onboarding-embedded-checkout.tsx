"use client"

import { useMemo, useState } from "react"

import {
  CardCvcElement,
  CardExpiryElement,
  CardNumberElement,
  Elements,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js"
import {
  loadStripe,
  type StripeElementsOptions,
  type StripeElementStyle,
} from "@stripe/stripe-js"
import { ArrowLeft, Check, Loader2 } from "lucide-react"

import { Button } from "@repo/ui/button"
import { Input } from "@repo/ui/input"
import { Label } from "@repo/ui/label"
import { uiText } from "@/content/ui-text"
import { cn } from "@/lib/utils"

type OnboardingEmbeddedCheckoutProps = {
  clientSecret: string
  onBack: () => void
  onConfirm: (setupIntentId: string) => Promise<void>
}

type CheckoutPaymentMethod = "card" | "sepa_debit"

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null

function OnboardingPaymentForm({
  clientSecret,
  onBack,
  onConfirm,
}: OnboardingEmbeddedCheckoutProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [cardholderName, setCardholderName] = useState("")
  const [countryCode, setCountryCode] = useState("CH")
  const [focusedField, setFocusedField] = useState<"cardNumber" | "expiry" | "cvc" | null>(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<CheckoutPaymentMethod>("card")

  const elementStyle: StripeElementStyle = {
    base: {
      color: "#111827",
      fontFamily:
        "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
      fontSize: "14px",
      textAlign: "left",
      "::placeholder": {
        color: "#9ca3af",
      },
    },
    invalid: {
      color: "#dc2626",
      iconColor: "#dc2626",
    },
  }

  async function handleSubmit() {
    if (!stripe || !elements || isSubmitting) return

    if (selectedPaymentMethod !== "card") {
      setErrorMessage(uiText.onboarding.checkout.paymentMethodUnavailable)
      return
    }

    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const cardNumberElement = elements.getElement(CardNumberElement)
      if (!cardNumberElement) {
        setErrorMessage(uiText.onboarding.actions.submitError)
        return
      }

      const result = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardNumberElement,
          billing_details: {
            name: cardholderName.trim() || undefined,
            address: {
              country: countryCode || undefined,
            },
          },
        },
      })

      if (result.error) {
        setErrorMessage(result.error.message ?? uiText.onboarding.actions.submitError)
        return
      }

      const setupIntentId = result.setupIntent?.id
      if (!setupIntentId) {
        setErrorMessage(uiText.onboarding.actions.submitError)
        return
      }

      await onConfirm(setupIntentId)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : uiText.onboarding.actions.submitError)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handlePaymentElementChange() {
    setErrorMessage(null)
  }

  const visibleError = errorMessage
  const hostedFieldBaseClass =
    "min-h-10 rounded-lg border border-input bg-background px-2.5 pt-2.5 pb-0 text-base transition-colors md:text-sm"

  return (
    <section className="space-y-3">
      <header className="space-y-1">
        <h2 className="font-sans text-lg font-semibold tracking-tight text-foreground">
          {uiText.onboarding.checkout.heading}
        </h2>
        <p className="text-sm text-muted-foreground">
          {uiText.onboarding.checkout.description}
        </p>
      </header>

      <div className="space-y-3">
        <div className="space-y-2">
          <p className="auth-label block text-foreground">{uiText.onboarding.checkout.paymentMethodLabel}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null)
                setSelectedPaymentMethod("card")
              }}
              className={cn(
                "h-11 rounded-lg border px-3 text-left text-sm font-medium transition-colors",
                selectedPaymentMethod === "card"
                  ? "border-primary bg-primary/8 text-foreground ring-1 ring-inset ring-primary/30"
                  : "border-input bg-background text-foreground hover:border-primary/35",
              )}
              aria-pressed={selectedPaymentMethod === "card"}
            >
              {uiText.onboarding.checkout.cardMethodLabel}
            </button>
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null)
                setSelectedPaymentMethod("sepa_debit")
              }}
              className={cn(
                "h-11 rounded-lg border px-3 text-left text-sm font-medium transition-colors",
                selectedPaymentMethod === "sepa_debit"
                  ? "border-primary bg-primary/8 text-foreground ring-1 ring-inset ring-primary/30"
                  : "border-input bg-background text-muted-foreground hover:border-primary/25",
              )}
              aria-pressed={selectedPaymentMethod === "sepa_debit"}
            >
              <span>{uiText.onboarding.checkout.directDebitMethodLabel}</span>
              <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {uiText.onboarding.checkout.directDebitComingSoon}
              </span>
            </button>
          </div>
        </div>

        {selectedPaymentMethod === "card" ? (
          <>
            <p className="auth-label block text-foreground">{uiText.onboarding.checkout.paymentDataLabel}</p>
            <div className="space-y-2">
              <div className="space-y-2">
                <Label htmlFor="onboarding-checkout-cardholder" className="auth-label block text-foreground">
                  {uiText.onboarding.checkout.cardholderNameLabel}
                </Label>
                <Input
                  id="onboarding-checkout-cardholder"
                  name="cc-name"
                  value={cardholderName}
                  onChange={(event) => setCardholderName(event.target.value)}
                  placeholder={uiText.onboarding.checkout.cardholderNamePlaceholder}
                  className="h-10"
                  autoComplete="cc-name"
                  spellCheck={false}
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="space-y-2 sm:min-w-0 sm:flex-[2.8]">
                  <p id="onboarding-checkout-card-number-label" className="auth-label block text-foreground">
                    {uiText.onboarding.checkout.cardNumberLabel}
                  </p>
                  <div
                    role="group"
                    aria-labelledby="onboarding-checkout-card-number-label"
                    className={cn(
                      hostedFieldBaseClass,
                      focusedField === "cardNumber" ? "border-ring ring-3 ring-ring/50" : null,
                      visibleError ? "border-destructive ring-3 ring-destructive/20" : null,
                    )}
                  >
                    <CardNumberElement
                      options={{
                        style: elementStyle,
                        showIcon: true,
                        placeholder: "1234 1234 1234 1234",
                      }}
                      onChange={handlePaymentElementChange}
                      onFocus={() => setFocusedField("cardNumber")}
                      onBlur={() => setFocusedField(null)}
                    />
                  </div>
                </div>

                <div className="space-y-2 sm:min-w-0 sm:flex-1">
                  <p id="onboarding-checkout-expiry-label" className="auth-label block text-foreground">
                    {uiText.onboarding.checkout.expiryLabel}
                  </p>
                  <div
                    role="group"
                    aria-labelledby="onboarding-checkout-expiry-label"
                    className={cn(
                      hostedFieldBaseClass,
                      focusedField === "expiry" ? "border-ring ring-3 ring-ring/50" : null,
                      visibleError ? "border-destructive ring-3 ring-destructive/20" : null,
                    )}
                  >
                    <CardExpiryElement
                      options={{
                        style: elementStyle,
                        placeholder: "MM/JJ",
                      }}
                      onChange={handlePaymentElementChange}
                      onFocus={() => setFocusedField("expiry")}
                      onBlur={() => setFocusedField(null)}
                    />
                  </div>
                </div>

                <div className="space-y-2 sm:min-w-0 sm:flex-1">
                  <p id="onboarding-checkout-cvc-label" className="auth-label block text-foreground">
                    {uiText.onboarding.checkout.cvcLabel}
                  </p>
                  <div
                    role="group"
                    aria-labelledby="onboarding-checkout-cvc-label"
                    className={cn(
                      hostedFieldBaseClass,
                      focusedField === "cvc" ? "border-ring ring-3 ring-ring/50" : null,
                      visibleError ? "border-destructive ring-3 ring-destructive/20" : null,
                    )}
                  >
                    <CardCvcElement
                      options={{
                        style: elementStyle,
                        placeholder: uiText.onboarding.checkout.cvcPlaceholder,
                      }}
                      onChange={handlePaymentElementChange}
                      onFocus={() => setFocusedField("cvc")}
                      onBlur={() => setFocusedField(null)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="onboarding-checkout-country" className="auth-label block text-foreground">
                  {uiText.onboarding.checkout.countryLabel}
                </Label>
                <select
                  id="onboarding-checkout-country"
                  name="country"
                  autoComplete="country"
                  value={countryCode}
                  onChange={(event) => setCountryCode(event.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-background px-2.5 py-1 text-base text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
                >
                  <option value="CH">{uiText.onboarding.countryNames.CH}</option>
                  <option value="DE">{uiText.onboarding.countryNames.DE}</option>
                  <option value="AT">{uiText.onboarding.countryNames.AT}</option>
                </select>
              </div>

              <div className={cn("rounded-lg border border-input bg-background px-2.5 py-2")}>
                <p className="text-sm text-muted-foreground">{uiText.onboarding.checkout.termsHint}</p>
              </div>
              <p className="text-xs text-muted-foreground">{uiText.onboarding.checkout.secureHint}</p>
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-input bg-muted/25 px-3 py-2 text-sm text-muted-foreground">
            {uiText.onboarding.checkout.directDebitComingSoon}
          </div>
        )}
      </div>

      {visibleError ? <p className="text-xs text-destructive sm:text-sm">{visibleError}</p> : null}

      <div className="my-1.5" aria-hidden>
        <span className="block h-px w-full bg-border/75" />
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
        <Button type="button" variant="outline" className="h-9 gap-2 sm:w-auto" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          {uiText.onboarding.checkout.backToCredentials}
        </Button>
        <Button
          type="button"
          
          className="h-9 w-full gap-2 sm:flex-1"
          onClick={handleSubmit}
          disabled={!stripe || !elements || isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="ml-1 h-4 w-4 animate-spin" />
              {uiText.onboarding.checkout.confirmingPayment}
            </>
          ) : (
            <>
              {uiText.onboarding.checkout.confirmPayment}
              <Check className="ml-1 h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </section>
  )
}

export function OnboardingEmbeddedCheckout({
  clientSecret,
  onBack,
  onConfirm,
}: OnboardingEmbeddedCheckoutProps) {
  const options: StripeElementsOptions = useMemo(
    () => ({
      clientSecret,
    }),
    [clientSecret],
  )

  if (!stripePromise) {
    return (
      <section className="space-y-3">
        <header className="space-y-1">
          <h2 className="font-sans text-lg font-semibold tracking-tight text-foreground">
            {uiText.onboarding.checkout.heading}
          </h2>
          <p className="text-xs text-muted-foreground sm:text-sm">
            {uiText.onboarding.checkout.missingPublishableKey}
          </p>
        </header>
        <Button type="button" variant="outline" className="h-9" onClick={onBack}>
          {uiText.onboarding.checkout.backToCredentials}
        </Button>
      </section>
    )
  }

  return (
    <Elements stripe={stripePromise} options={options}>
      <OnboardingPaymentForm clientSecret={clientSecret} onBack={onBack} onConfirm={onConfirm} />
    </Elements>
  )
}
