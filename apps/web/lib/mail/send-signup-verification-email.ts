import "server-only";

import type { Locale } from "@/lib/i18n/locale";
import { getUiText } from "@/content/ui-text";

import {
  buildEmailVerificationHtml,
  EMAIL_VERIFICATION_LOGO_CID,
  resolveBrandLogoPathForMail,
} from "./email-verification-html";
import { getPublicSiteOrigin } from "./public-site-origin";
import { createSmtpTransport, isSmtpConfigured } from "./smtp-transport";
import { isEmailVerificationSecretConfigured, signEmailVerificationToken } from "./verification-token";

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

  const origin = getPublicSiteOrigin();
  const verifyUrl = `${origin}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  const imprintUrl = `${origin}/legal/imprint`;
  const t = getUiText(input.locale);
  const ev = t.api.emailVerification;
  const subject = ev.signupSubject;
  const firstName = input.firstName.trim() || "…";
  const bodyPlain =
    ev.signupBody.replace("{firstName}", firstName).replace("{link}", verifyUrl) +
    "\n\n---\n" +
    ev.signupHtmlImprintHeading +
    "\n" +
    ev.signupHtmlImprintLines +
    "\n" +
    imprintUrl;

  const logoPath = resolveBrandLogoPathForMail();
  const html = buildEmailVerificationHtml({
    locale: input.locale,
    t: ev,
    brandTagline: t.branding.tagline,
    firstName: input.firstName,
    verifyUrl,
    imprintUrl,
    includeLogo: Boolean(logoPath),
  });

  const from =
    process.env.MAIL_FROM?.trim() || process.env.SMTP_USER?.trim() || "noreply@localhost";
  const fromName = process.env.EMAIL_FROM_NAME?.trim();

  try {
    const transport = createSmtpTransport();
    await transport.sendMail({
      from: fromName ? `"${fromName}" <${from}>` : from,
      to: input.to,
      subject,
      text: bodyPlain,
      html,
      attachments: logoPath
        ? [
            {
              filename: "logo.png",
              path: logoPath,
              cid: EMAIL_VERIFICATION_LOGO_CID,
            },
          ]
        : undefined,
    });
    return true;
  } catch (error) {
    console.error("[sendSignupVerificationEmail]", error);
    return false;
  }
}
