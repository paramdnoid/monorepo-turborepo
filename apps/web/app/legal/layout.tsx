import { LegalHeader } from "@/components/site/legal-header";
import { LegalTableOfContents } from "@/components/site/legal-toc";
import { SiteFooter } from "@/components/marketing/site-footer";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <LegalHeader />

      <main
        id="main-content"
        className="mx-auto max-w-7xl px-6 py-10 sm:py-14 lg:px-8"
      >
        <div className="grid grid-cols-1 gap-12 xl:grid-cols-[1fr_200px]">
          <div className="legal-article-wrapper min-w-0" data-legal-article="">
            {children}
          </div>
          <LegalTableOfContents />
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
