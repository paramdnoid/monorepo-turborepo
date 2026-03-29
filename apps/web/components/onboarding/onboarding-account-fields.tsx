"use client"

import { Input } from "@repo/ui/input"
import { Label } from "@repo/ui/label"
import { uiText } from "@/content/ui-text"

export type OnboardingAccountValues = {
  companyName: string
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
}

type OnboardingAccountFieldsProps = {
  values: OnboardingAccountValues
  onChange: (field: keyof OnboardingAccountValues, value: string) => void
}

export function OnboardingProfileFields({
  values,
  onChange,
}: OnboardingAccountFieldsProps) {
  return (
    <section className="space-y-3">
      <header className="space-y-1">
        <h2 className="font-sans text-lg font-semibold tracking-tight text-foreground">
          {uiText.onboarding.account.profileHeading}
        </h2>
        <p className="text-sm text-muted-foreground">
          {uiText.onboarding.account.profileDescription}
        </p>
      </header>

      <div className="space-y-2">
        <div className="space-y-2">
          <Label htmlFor="onboarding-company-name" className="auth-label block text-foreground">
            {uiText.onboarding.account.companyNameLabel}
          </Label>
          <Input
            id="onboarding-company-name"
            name="companyName"
            autoComplete="organization"
            required
            value={values.companyName}
            onChange={(event) => onChange("companyName", event.target.value)}
            placeholder={uiText.onboarding.account.companyNamePlaceholder}
            className="h-10"
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="onboarding-first-name" className="auth-label block text-foreground">
            {uiText.onboarding.account.firstNameLabel}
          </Label>
          <Input
            id="onboarding-first-name"
            name="firstName"
            autoComplete="given-name"
            required
            value={values.firstName}
            onChange={(event) => onChange("firstName", event.target.value)}
            placeholder={uiText.onboarding.account.firstNamePlaceholder}
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="onboarding-last-name" className="auth-label block text-foreground">
            {uiText.onboarding.account.lastNameLabel}
          </Label>
          <Input
            id="onboarding-last-name"
            name="lastName"
            autoComplete="family-name"
            required
            value={values.lastName}
            onChange={(event) => onChange("lastName", event.target.value)}
            placeholder={uiText.onboarding.account.lastNamePlaceholder}
            className="h-10"
          />
        </div>
      </div>
    </section>
  )
}

export function OnboardingCredentialsFields({
  values,
  onChange,
}: OnboardingAccountFieldsProps) {
  const hasPasswordMismatch =
    values.confirmPassword.length > 0 && values.password !== values.confirmPassword

  return (
    <section className="space-y-3">
      <header className="space-y-1">
        <h2 className="font-sans text-lg font-semibold tracking-tight text-foreground">
          {uiText.onboarding.account.credentialsHeading}
        </h2>
        <p className="text-sm text-muted-foreground">
          {uiText.onboarding.account.credentialsDescription}
        </p>
      </header>

      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="onboarding-email" className="auth-label block text-foreground">
            {uiText.onboarding.account.emailLabel}
          </Label>
          <Input
            id="onboarding-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={values.email}
            onChange={(event) => onChange("email", event.target.value)}
            placeholder={uiText.onboarding.account.emailPlaceholder}
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="onboarding-password" className="auth-label block text-foreground">
            {uiText.onboarding.account.passwordLabel}
          </Label>
          <Input
            id="onboarding-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={values.password}
            onChange={(event) => onChange("password", event.target.value)}
            placeholder={uiText.onboarding.account.passwordPlaceholder}
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="onboarding-confirm-password" className="auth-label block text-foreground">
            {uiText.onboarding.account.confirmPasswordLabel}
          </Label>
          <Input
            id="onboarding-confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            aria-invalid={hasPasswordMismatch}
            value={values.confirmPassword}
            onChange={(event) => onChange("confirmPassword", event.target.value)}
            placeholder={uiText.onboarding.account.confirmPasswordPlaceholder}
            className="h-10"
          />
          {hasPasswordMismatch && (
            <p className="text-xs text-destructive">
              {uiText.onboarding.account.confirmPasswordMismatch}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
