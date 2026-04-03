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
 * Ohne SMTP: in `development` kann der Link im Server-Log stehen, wenn das Signatur-Secret gesetzt ist.
 * Schlägt still fehl (nur Log), wenn Konfiguration fehlt.
 */
export async function sendSignupVerificationEmail(
  input: SendSignupVerificationEmailInput,
): Promise<boolean> {
  if (!isEmailVerificationSecretConfigured()) {
    console.warn(
      "[sendSignupVerificationEmail] AUTH_EMAIL_VERIFICATION_SECRET oder AUTH_PASSWORD_RESET_SECRET fehlt (min. ein Secret für signierte Links). Siehe /.env.example am Repository-Root",
    );
    return false;
  }

  const token = signEmailVerificationToken(input.keycloakUserId, input.to);
  if (!token) {
    return false;
  }

  const origin = getPublicSiteOrigin();
  const verifyUrl = `${origin}/api/auth/verify-email?token=${encodeURIComponent(token)}`;

  if (!isSmtpConfigured()) {
    if (process.env.NODE_ENV === "development") {
      console.info(
        "[sendSignupVerificationEmail] SMTP nicht gesetzt — Bestätigungslink (nur Dev, Server-Log):\n" +
          verifyUrl,
      );
    } else {
      console.warn(
        "[sendSignupVerificationEmail] SMTP_HOST / SMTP_USER / SMTP_PASS fehlt — keine Mail.",
      );
    }
    return false;
  }

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
