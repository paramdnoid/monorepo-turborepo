import "server-only";

import { existsSync } from "node:fs";

import { getBrandLogoPngPath } from "@repo/brand/logo-path";

import type { Locale } from "@/lib/i18n/locale";
import type { UiText } from "@/content/ui-text";

/** CID für eingebettetes Logo (nodemailer attachment). */
export const EMAIL_VERIFICATION_LOGO_CID = "brand-logo";

/** Wie Onboarding (`AuthPageShell` / `BrandWordmark`): Inter als Webfont-Näherung zu Geist. */
const EMAIL_FONT =
  "'Inter',ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";

/** Entspricht `enterprise-grid` in `app/globals.css` (42px Raster). */
const GRID_PX = 42;

/** Entspricht `max-w-124` / Onboarding `AuthPageShell` mit `hideHero`. */
const SHELL_MAX_PX = 496;

export function resolveBrandLogoPathForMail(): string | null {
  try {
    const p = getBrandLogoPngPath();
    return existsSync(p) ? p : null;
  } catch {
    return null;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Onboarding-Seitenhintergrund: `bg-gradient-to-br` + `enterprise-grid` + Primary-/Foreground-Glows
 * (näherungsweise per E-Mail-tauglichen Layern).
 */
function onboardingPageBackgroundStyle(light: boolean): string {
  const gridLine = light ? "rgba(15,23,42,0.055)" : "rgba(255,255,255,0.07)";
  const base = light ? "#fafafa" : "#18181b";
  return [
    `background-color:${base}`,
    "background-image:" +
      `radial-gradient(ellipse 340px 340px at 10% 6%, rgba(234,88,12,0.13) 0%, transparent 58%),` +
      `radial-gradient(ellipse 320px 320px at 92% 94%, rgba(15,23,42,0.05) 0%, transparent 55%),` +
      `linear-gradient(135deg, ${light ? "#ffffff 0%, #f4f4f5 48%, #fafafa 100%" : "#1c1c1f 0%, #18181b 50%, #1a1a1d 100%"}),` +
      `linear-gradient(to right, ${gridLine} 1px, transparent 1px),` +
      `linear-gradient(to bottom, ${gridLine} 1px, transparent 1px)`,
    `background-size:auto,auto,auto,${GRID_PX}px ${GRID_PX}px,${GRID_PX}px ${GRID_PX}px`,
  ].join(";");
}

export type EmailVerificationHtmlInput = {
  locale: Locale;
  t: UiText["api"]["emailVerification"];
  /** Wie `uiText.branding.tagline` (Handwerk. Digital. / …). */
  brandTagline: string;
  firstName: string;
  verifyUrl: string;
  /** Absoluter Link zur Impressums-Seite (`/legal/imprint`). */
  imprintUrl: string;
  /** Wenn false, wird kein <img> gerendert (z. B. Logo-Datei fehlt). */
  includeLogo: boolean;
  /**
   * Optional: öffentliche Bild-URL statt `cid:` (z. B. lokale Dev-Vorschau im Browser).
   */
  logoSrcOverride?: string;
};

function buildImprintSection(t: UiText["api"]["emailVerification"], imprintUrl: string, fontStack: string): string {
  const safeImprintUrl = escapeHtml(imprintUrl);
  const linesHtml = t.signupHtmlImprintLines
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => escapeHtml(line))
    .join("<br />");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:20px 0 0 0;">
    <tr>
      <td class="email-imprint-top" style="padding:16px 0 0 0;border-top:1px solid rgba(228,228,231,0.75);">
        <p class="email-imprint-title" style="margin:0 0 8px 0;font-family:${fontStack};font-size:11px;font-weight:500;letter-spacing:0.08em;text-transform:uppercase;color:#71717a;">
          ${escapeHtml(t.signupHtmlImprintHeading)}
        </p>
        <p class="email-imprint-lines" style="margin:0 0 10px 0;font-family:${fontStack};font-size:11px;line-height:1.55;color:#71717a;">
          ${linesHtml}
        </p>
        <p style="margin:0;font-family:${fontStack};font-size:11px;">
          <a class="email-imprint-link" href="${safeImprintUrl}" style="color:#ea580c;text-decoration:underline;">${escapeHtml(t.signupHtmlImprintLinkLabel)}</a>
        </p>
      </td>
    </tr>
  </table>`;
}

function buildBrandHeaderBlock(params: {
  includeLogo: boolean;
  logoImgSrc: string | null;
  logoAlt: string;
  brandTagline: string;
}): string {
  const { includeLogo, logoImgSrc, logoAlt, brandTagline } = params;
  const taglineSafe = escapeHtml(brandTagline);
  const f = EMAIL_FONT;

  const wordmarkName = `<span class="email-wordmark-a" style="color:#171717;">Zunft</span><span class="email-wordmark-b" style="color:#525252;">Gewerk</span>`;
  const taglineBlock = `<p class="email-brand-tagline" style="margin:5px 0 0 0;font-family:${f};font-size:7px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:#71717a;line-height:1.35;">
      ${taglineSafe}
    </p>`;

  if (includeLogo && logoImgSrc) {
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 14px 0;">
      <tr>
        <td width="36" valign="middle" style="padding:0 10px 0 0;">
          <img src="${logoImgSrc}" width="30" height="auto" alt="${escapeHtml(logoAlt)}" style="display:block;width:30px;max-width:30px;height:auto;border:0;border-radius:999px;line-height:0;box-shadow:0 1px 2px rgba(15,23,42,0.08);" />
        </td>
        <td valign="middle" align="left" style="padding:0;">
          <p style="margin:0;font-family:${f};font-size:16px;font-weight:700;letter-spacing:-0.02em;line-height:1.15;">
            ${wordmarkName}
          </p>
          ${taglineBlock}
        </td>
      </tr>
    </table>`;
  }

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 14px 0;">
    <tr>
      <td align="left" style="padding:0;">
        <p style="margin:0;font-family:${f};font-size:16px;font-weight:700;letter-spacing:-0.02em;line-height:1.15;">
          ${wordmarkName}
        </p>
        ${taglineBlock}
      </td>
    </tr>
  </table>`;
}

/**
 * Onboarding-Optik: `AuthPageShell` + `premium-panel`, Enterprise-Grid, `auth-form-kicker`, Primary-Button.
 */
export function buildEmailVerificationHtml(input: EmailVerificationHtmlInput): string {
  const { t, firstName, verifyUrl, imprintUrl, includeLogo, logoSrcOverride, brandTagline } = input;
  const name = firstName.trim() || "…";
  const greeting = t.signupHtmlGreeting.replace("{firstName}", name);
  const safeUrl = escapeHtml(verifyUrl);
  const safeGreeting = escapeHtml(greeting);
  const lang = input.locale === "en" ? "en" : "de";

  const logoImgSrc =
    includeLogo && logoSrcOverride?.trim()
      ? escapeHtml(logoSrcOverride.trim())
      : includeLogo
        ? `cid:${EMAIL_VERIFICATION_LOGO_CID}`
        : null;

  const brandBlock = buildBrandHeaderBlock({
    includeLogo,
    logoImgSrc,
    logoAlt: t.signupHtmlLogoAlt,
    brandTagline,
  });

  const f = EMAIL_FONT;
  const imprintBlock = buildImprintSection(t, imprintUrl, f);

  const pageBg = onboardingPageBackgroundStyle(true);

  const shellOuter = `max-width:${SHELL_MAX_PX}px;width:100%;border-radius:24px;border:1px solid rgba(228,228,231,0.55);background-color:rgba(255,255,255,0.92);padding:8px;box-shadow:0 10px 25px -8px rgba(15,23,42,0.12);`;

  const premiumPanel = `border-radius:18px;border:1px solid rgba(228,228,231,0.85);background:linear-gradient(160deg,#fcfcfd 0%,#f4f4f5 100%);padding:14px 16px;box-shadow:0 0 0 1px rgba(255,255,255,0.22) inset,0 24px 56px -30px rgba(2,6,23,0.18);`;

  return `<!DOCTYPE html>
<html lang="${lang}" style="height:100%;">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${escapeHtml(t.signupHtmlHeading)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style type="text/css">
  html, body { height: 100%; }
  @media (prefers-color-scheme: dark) {
    .email-onboarding-bg {
      background-color: #18181b !important;
      background-image:
        radial-gradient(ellipse 340px 340px at 10% 6%, rgba(251,191,36,0.09) 0%, transparent 58%),
        radial-gradient(ellipse 320px 320px at 92% 94%, rgba(255,255,255,0.04) 0%, transparent 55%),
        linear-gradient(135deg, #1c1c1f 0%, #18181b 50%, #1a1a1d 100%),
        linear-gradient(to right, rgba(255,255,255,0.07) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255,255,255,0.07) 1px, transparent 1px) !important;
      background-size: auto, auto, auto, ${GRID_PX}px ${GRID_PX}px, ${GRID_PX}px ${GRID_PX}px !important;
    }
    .email-auth-shell {
      border-color: rgba(63,63,70,0.65) !important;
      background-color: rgba(24,24,27,0.72) !important;
      box-shadow: 0 10px 25px -8px rgba(0,0,0,0.45) !important;
    }
    .email-premium-panel {
      border-color: rgba(63,63,70,0.85) !important;
      background: linear-gradient(160deg, #27272a 0%, #1f1f23 100%) !important;
      box-shadow: 0 0 0 1px rgba(255,255,255,0.06) inset, 0 24px 56px -30px rgba(0,0,0,0.45) !important;
    }
    .email-kicker { color: #d6d3d1 !important; }
    .email-heading { color: #fafafa !important; }
    .email-body, .email-link-fallback { color: #a1a1aa !important; }
    .email-wordmark-a { color: #fafafa !important; }
    .email-wordmark-b { color: #a3a3a3 !important; }
    .email-brand-tagline { color: #a1a1aa !important; }
    .email-kicker-dot { background: rgba(251,191,36,0.45) !important; }
    .email-button a {
      background: #f97316 !important;
      color: #fafafa !important;
    }
    .email-divider { background: rgba(63,63,70,0.75) !important; }
    .email-footer { color: #a1a1aa !important; }
    .email-link-url { color: #fb923c !important; word-break: break-all; }
    .email-imprint-top { border-top-color: rgba(63,63,70,0.75) !important; }
    .email-imprint-title, .email-imprint-lines { color: #a1a1aa !important; }
    .email-imprint-link { color: #fb923c !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;min-height:100vh;-webkit-text-size-adjust:100%;font-family:${f};">
<table role="presentation" class="email-onboarding-bg" width="100%" cellpadding="0" cellspacing="0" style="${pageBg};min-height:100vh;margin:0;padding:0;border-collapse:collapse;">
  <tr>
    <td align="center" style="padding:28px 16px;">
      <table role="presentation" class="email-auth-shell" width="100%" cellpadding="0" cellspacing="0" style="${shellOuter}border-collapse:separate;">
        <tr>
          <td style="padding:0;">
            <table role="presentation" class="email-premium-panel" width="100%" cellpadding="0" cellspacing="0" style="${premiumPanel}border-collapse:separate;">
              <tr>
                <td align="left" style="padding:0;">
                  ${brandBlock}
                  <p class="email-kicker" style="margin:0 0 10px 0;font-family:${f};font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#57534e;">
                    <span style="display:inline-flex;align-items:center;gap:6px;">
                      <span class="email-kicker-dot" style="display:inline-block;width:4px;height:4px;border-radius:999px;background:rgba(234,88,12,0.45);line-height:0;font-size:0;">&#8203;</span>
                      <span>${escapeHtml(t.signupHtmlKicker)}</span>
                    </span>
                  </p>
                  <h1 class="email-heading" style="margin:0 0 8px 0;font-family:${f};font-size:24px;line-height:0.96;font-weight:700;letter-spacing:-0.02em;color:#171717;">
                    ${escapeHtml(t.signupHtmlHeading)}
                  </h1>
                  <p class="email-body" style="margin:0 0 12px 0;font-family:${f};font-size:14px;line-height:1.6;color:#3f3f46;">
                    ${safeGreeting}
                  </p>
                  <p class="email-body" style="margin:0 0 20px 0;font-family:${f};font-size:14px;line-height:1.6;color:#71717a;">
                    ${escapeHtml(t.signupHtmlIntro)}
                  </p>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 18px 0;table-layout:fixed;">
                    <tr>
                      <td align="left" style="padding:0;max-width:100%;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;table-layout:fixed;max-width:100%;">
                          <tr>
                            <td class="email-button" align="center" style="border-radius:8px;background-color:#ea580c;padding:11px 18px;max-width:100%;">
                              <a href="${safeUrl}" target="_self" rel="noopener noreferrer" style="display:block;font-family:${f};font-size:14px;font-weight:600;line-height:1.35;color:#fafafa;text-decoration:none;text-align:center;word-wrap:break-word;overflow-wrap:break-word;">
                                ${escapeHtml(t.signupHtmlButton)}
                              </a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 16px 0;">
                    <tr>
                      <td class="email-divider" style="height:1px;line-height:1px;background:rgba(228,228,231,0.85);font-size:1px;">&#8203;</td>
                    </tr>
                  </table>
                  <p class="email-link-fallback" style="margin:0 0 10px 0;font-family:${f};font-size:12px;line-height:1.55;color:#71717a;">
                    ${escapeHtml(t.signupHtmlLinkFallback)}
                  </p>
                  <p style="margin:0 0 18px 0;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:11px;line-height:1.45;word-break:break-all;">
                    <a class="email-link-url" href="${safeUrl}" target="_self" rel="noopener noreferrer" style="color:#ea580c;text-decoration:underline;">${safeUrl}</a>
                  </p>
                  <p class="email-footer" style="margin:0;font-family:${f};font-size:12px;line-height:1.5;color:#71717a;">
                    ${escapeHtml(t.signupHtmlFooter)}
                  </p>
                  ${imprintBlock}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
