import brandLogo from "@repo/brand/logo";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getUiText } from "@/content/ui-text";
import { buildEmailVerificationHtml } from "@/lib/mail/email-verification-html";
import { getPublicSiteOrigin } from "@/lib/mail/public-site-origin";
import { DEFAULT_LOCALE, normalizeLocale, type Locale } from "@/lib/i18n/locale";

export const metadata: Metadata = {
  title: "E-Mail-Vorschau (Dev)",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams?: Promise<{ locale?: string }>;
};

export default async function EmailVerificationPreviewPage({ searchParams }: PageProps) {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  const resolved = searchParams ? await searchParams : {};
  const locale = (normalizeLocale(resolved.locale) ?? DEFAULT_LOCALE) satisfies Locale;

  const t = getUiText(locale);
  const origin = getPublicSiteOrigin();
  const html = buildEmailVerificationHtml({
    locale,
    t: t.api.emailVerification,
    brandTagline: t.branding.tagline,
    firstName: "Andre",
    verifyUrl:
      "http://localhost:3000/api/auth/verify-email?token=preview-demo-token-only-for-layout",
    imprintUrl: `${origin}/legal/imprint`,
    includeLogo: true,
    logoSrcOverride: brandLogo.src,
  });

  return (
    <div className="flex h-svh min-h-0 flex-col overflow-hidden bg-background">
      <header className="shrink-0 border-b border-border bg-background px-4 py-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">E-Mail-Vorschau (nur Entwicklung)</p>
        <p className="mt-1">
          Sprache:{" "}
          <Link
            href="/dev/email-verification-preview?locale=de"
            className="text-primary underline underline-offset-2"
          >
            DE
          </Link>
          {" · "}
          <Link
            href="/dev/email-verification-preview?locale=en"
            className="text-primary underline underline-offset-2"
          >
            EN
          </Link>
        </p>
        <p className="mt-1 text-xs">
          Hell/Dunkel folgt deinem System-Theme (<code className="rounded bg-muted px-1">prefers-color-scheme</code>
          ).
        </p>
      </header>
      {/* Kein sandbox — sonst meckern Erweiterungen bei injizierten Skripten (srcdoc). */}
      <iframe
        title="HTML der Bestätigungs-E-Mail"
        srcDoc={html}
        className="min-h-0 w-full flex-1 border-0 bg-white dark:bg-zinc-900"
      />
    </div>
  );
}
