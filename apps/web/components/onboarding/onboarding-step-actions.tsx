import Link from "next/link"
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react"

import { Button } from "@repo/ui/button"
import { uiText } from "@/content/ui-text"

type OnboardingStepActionsProps = {
  canGoBack: boolean
  isFinalStep: boolean
  canProceed: boolean
  isSubmitting: boolean
  statusMessage: string
  hasStatusError: boolean
  finishLabel?: string
  finishingLabel?: string
  onNextStep: () => void
  onPreviousStep: () => void
  onFinishStep: () => void
}

export function OnboardingStepActions({
  canGoBack,
  isFinalStep,
  canProceed,
  isSubmitting,
  statusMessage,
  hasStatusError,
  finishLabel = uiText.onboarding.actions.finish,
  finishingLabel = uiText.onboarding.actions.finishing,
  onNextStep,
  onPreviousStep,
  onFinishStep,
}: OnboardingStepActionsProps) {
  return (
    <div className="space-y-2.5">
      <div className="flex h-16 items-center justify-center">
        <p
          role="status"
          aria-live="polite"
          className={`text-center text-xs sm:text-sm ${hasStatusError ? "text-destructive" : "text-muted-foreground"}`}
        >
          {statusMessage}
        </p>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
        {canGoBack ? (
          <Button
            type="button"
            onClick={onPreviousStep}
            variant="outline"
            className="h-9 gap-2 sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {uiText.onboarding.actions.back}
          </Button>
        ) : (
          <Button asChild variant="outline" className="h-9 sm:w-auto">
            <Link href="/">{uiText.onboarding.actions.cancel}</Link>
          </Button>
        )}

        {!isFinalStep ? (
          <Button
            type="button"
            onClick={onNextStep}
            disabled={!canProceed}
            
            className="h-9 w-full gap-2 sm:flex-1"
          >
            {uiText.onboarding.actions.continue}
            <ArrowRight className="ml-1" aria-hidden />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onFinishStep}
            disabled={!canProceed || isSubmitting}
            
            className="h-9 w-full gap-2 sm:flex-1"
            aria-busy={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="ml-1 h-4 w-4 animate-spin" aria-hidden />
                {finishingLabel}
              </>
            ) : (
              <>
                {finishLabel}
                <Check className="ml-1 h-4 w-4" aria-hidden />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
