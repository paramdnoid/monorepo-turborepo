import "server-only";

/** Gleiche Logik wie zuvor in `send-signup-verification-email` — Basis für absolute Links (Verify, Impressum). */
export function getPublicSiteOrigin(): string {
  const raw =
    process.env.MAIL_BRAND_ORIGIN?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}
