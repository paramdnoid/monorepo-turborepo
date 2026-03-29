import type { Metadata } from "next";
import brandLogo from "@repo/brand/logo";
import { geistMono, geistSans } from "@repo/fonts/geist";
import { Providers } from "@repo/ui/providers";

import { DocsShell } from "@/components/docs-shell";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Dokumentation · ZunftGewerk", template: "%s · ZunftGewerk" },
  description:
    "Die All-in-One Software fuer Kaminfeger, Maler und SHK-Betriebe. DSGVO-konform und made in Germany.",
  icons: {
    icon: [{ url: brandLogo.src, type: "image/png", sizes: "512x512" }],
    apple: [{ url: brandLogo.src, type: "image/png", sizes: "180x180" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          <DocsShell>{children}</DocsShell>
        </Providers>
      </body>
    </html>
  );
}
