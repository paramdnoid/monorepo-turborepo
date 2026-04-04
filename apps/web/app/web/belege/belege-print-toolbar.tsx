"use client";

import Link from "next/link";

import { getBelegePrintCopy } from "@/content/belege-module";
import type { Locale } from "@/lib/i18n/locale";
import { Button } from "@repo/ui/button";

type BelegePrintToolbarProps = {
  locale: Locale;
  backHref: string;
  pdfHref: string;
};

export function BelegePrintToolbar({
  locale,
  backHref,
  pdfHref,
}: BelegePrintToolbarProps) {
  const copy = getBelegePrintCopy(locale);

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/95 pb-4 print:hidden">
      <Button variant="outline" size="sm" asChild>
        <Link href={backHref}>{copy.backToDocument}</Link>
      </Button>
      <div className="flex flex-wrap items-center gap-2">
        <p className="hidden text-xs text-muted-foreground sm:block">{copy.printHint}</p>
        <Button variant="outline" size="sm" asChild>
          <a href={pdfHref}>{copy.downloadPdf}</a>
        </Button>
        <Button type="button" size="sm" onClick={() => window.print()}>
          {copy.printAction}
        </Button>
      </div>
    </div>
  );
}
