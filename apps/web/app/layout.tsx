import type { Metadata, Viewport } from "next";
import { geistMono, geistSans } from "@repo/fonts/geist";
import { Providers } from "@repo/ui/providers";

import { LocaleProvider } from "@/components/locale-provider";
import { getServerLocale } from "@/lib/i18n/server-locale";

import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  // Ermöglicht env(safe-area-inset-*) unter iOS/WKWebView (z. B. Dynamic Island), sonst oft 0.
  viewportFit: "cover",
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return {
    title: {
      default:
        locale === "en"
          ? "ZgWerk - Software for trades businesses"
          : "ZgWerk - Software fuer Handwerksbetriebe",
      template: "%s | ZgWerk",
    },
    description:
      locale === "en"
        ? "The all-in-one software for chimney sweeps, painters, and HVAC businesses."
        : "Die All-in-One Handwerkersoftware fuer Kaminfeger, Maler und SHK-Betriebe.",
    // Favicons: `app/favicon.ico`, `app/icon.png`, `app/apple-icon.png` (generiert aus @repo/brand/logo.png)
    other: {
      "content-language": locale,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getServerLocale();

  return (
    <html lang={locale} suppressHydrationWarning data-scroll-behavior="smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-svh flex flex-col font-sans antialiased`}
        suppressHydrationWarning
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-[calc(1rem+env(safe-area-inset-top))] focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-md"
        >
          {locale === "en" ? "Skip to main content" : "Zum Hauptinhalt springen"}
        </a>
        <LocaleProvider locale={locale}>
          <Providers>{children}</Providers>
        </LocaleProvider>
      </body>
    </html>
  );
}
