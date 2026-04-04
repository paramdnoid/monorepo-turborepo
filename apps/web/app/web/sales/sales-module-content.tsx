"use client";

import Link from "next/link";

import {
  getSalesPageTitle,
  getSalesPlaceholderCopy,
} from "@/content/sales-module";
import type { Locale } from "@/lib/i18n/locale";
import { Button } from "@repo/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";

type SalesModuleContentProps = {
  locale: Locale;
};

export function SalesModuleContent({ locale }: SalesModuleContentProps) {
  const title = getSalesPageTitle("overview", locale);
  const { noteTitle, noteBody } = getSalesPlaceholderCopy(locale);

  return (
    <div className="w-full min-w-0 space-y-6">
      <Card className="border bg-card shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold tracking-tight">
            {title}
          </CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            {locale === "en"
              ? "Central place for customer documents — same module for every trade."
              : "Zentrale Stelle fuer Kundenbelege — ein Modul fuer alle Gewerke."}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded-lg border border-dashed bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
            {locale === "en"
              ? "Open quotes or invoices from the sidebar, or jump in below."
              : "Angebote und Rechnungen ueber die Sidebar oeffnen oder direkt hier starten."}
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2 border-t pt-4">
          <Button variant="secondary" size="sm" asChild>
            <Link href="/web/sales/quotes">
              {locale === "en" ? "Quotes" : "Angebote"}
            </Link>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link href="/web/sales/invoices">
              {locale === "en" ? "Invoices" : "Rechnungen"}
            </Link>
          </Button>
        </CardFooter>
      </Card>

      <section className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
        <h3 className="mb-2 text-base font-semibold tracking-tight">
          {noteTitle}
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {noteBody}
        </p>
      </section>
    </div>
  );
}
