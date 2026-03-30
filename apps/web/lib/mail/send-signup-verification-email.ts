import "server-only";

import type { Locale } from "@/lib/i18n/locale";
import { getUiText } from "@/content/ui-text";

import { createSmtpTransport, isSmtpConfigured } from "./smtp-transport";
import { isEmailVerificationSecretConfigured, signEmailVerificationToken } from "./verification-token";

function publicSiteOrigin(): string {
  const raw =
    process.env.MAIL_BRAND_ORIGIN?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export type SendSignupVerificationEmailInput = {
  locale: Locale;
  to: string;
  firstName: string;
  keycloakUserId: string;
};

/**
 * Sendet nach neuer Registrierung eine Bestätigungsmail (SMTP aus ENV).
 * Schlägt still fehl (nur Log), wenn SMTP oder Signatur-Secret fehlen.
 */
export async function sendSignupVerificationEmail(
  input: SendSignupVerificationEmailInput,
): Promise<boolean> {
  if (!isSmtpConfigured() || !isEmailVerificationSecretConfigured()) {
    console.warn(
      "[sendSignupVerificationEmail] SMTP oder AUTH_EMAIL_VERIFICATION_SECRET / AUTH_PASSWORD_RESET_SECRET fehlt — keine Mail.",
    );
    return false;
  }

  const token = signEmailVerificationToken(input.keycloakUserId, input.to);
  if (!token) {
    return false;
  }

  const verifyUrl = `${publicSiteOrigin()}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  const t = getUiText(input.locale);
  const subject = t.api.emailVerification.signupSubject;
  const body = t.api.emailVerification.signupBody
    .replace("{firstName}", input.firstName.trim() || "…")
    .replace("{link}", verifyUrl);

  const from =
    process.env.MAIL_FROM?.trim() || process.env.SMTP_USER?.trim() || "noreply@localhost";
  const fromName = process.env.EMAIL_FROM_NAME?.trim();

  try {
    const transport = createSmtpTransport();
    await transport.sendMail({
      from: fromName ? `"${fromName}" <${from}>` : from,
      to: input.to,
      subject,
      text: body,
    });
    return true;
  } catch (error) {
    console.error("[sendSignupVerificationEmail]", error);
    return false;
  }
}
