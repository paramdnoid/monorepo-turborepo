"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileText, Loader2, ReceiptText } from "lucide-react";
import {
  salesInvoicesListResponseSchema,
  salesQuotesListResponseSchema,
} from "@repo/api-contracts";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/alert";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { Skeleton } from "@repo/ui/skeleton";
import type { ZodType } from "zod";

import { useWebApp } from "@/components/web/shell/web-app-context";
import { parseResponseJson } from "@/lib/parse-response-json";

type SalesLandingData = {
  quoteTotal: number;
  openQuotes: number;
  invoiceTotal: number;
  overdueInvoices: number;
  recentDocs: Array<{
    id: string;
    href: string;
    kind: "quote" | "invoice";
    documentNumber: string;
    customerLabel: string;
    updatedAt: string;
  }>;
};

async function fetchParsed<T>(url: string, schema: ZodType<T>): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  const text = await res.text();
  const json = parseResponseJson(text);
  const parsed = schema.safeParse(json);
  if (!res.ok || !parsed.success) {
    throw new Error("load_failed");
  }
  return parsed.data;
}

export function SalesModuleLandingContent() {
  const { session } = useWebApp();
  const locale = session.locale;
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SalesLandingData | null>(null);

  const copy = useMemo(
    () =>
      locale === "en"
        ? {
            title: "Sales module",
            subtitle:
              "Quotes and invoices as one operational area with short paths to follow-up actions.",
            loadError: "Sales overview could not be loaded.",
            retry: "Retry",
            refresh: "Refresh",
            readOnlyTitle: "Read-only access",
            readOnlyHint:
              "You can open lists and details, but edit/delete/export/batch actions are disabled for your role.",
            kpiOpenQuotes: "Open quotes",
            kpiAllQuotes: "All quotes",
            kpiOverdueInvoices: "Overdue invoices",
            kpiAllInvoices: "All invoices",
            recentTitle: "Recently updated documents",
            recentEmpty: "No documents yet.",
            updatedAt: "Updated",
            kindQuote: "Quote",
            kindInvoice: "Invoice",
            quickTitle: "Quick links",
            quickSubtitle: "Start recurring sales tasks with one click.",
            toQuotes: "Open quotes",
            toInvoices: "Open invoices",
            toOutbox: "Reminder outbox",
            toProjects: "Open projects",
            toDashboard: "Back to dashboard",
          }
        : {
            title: "Sales-Modul",
            subtitle:
              "Angebote und Rechnungen als gemeinsamer Arbeitsbereich mit kurzen Wegen zu Folgeaktionen.",
            loadError: "Sales-Uebersicht konnte nicht geladen werden.",
            retry: "Erneut laden",
            refresh: "Aktualisieren",
            readOnlyTitle: "Nur Lesemodus",
            readOnlyHint:
              "Du kannst Listen und Details oeffnen, aber Bearbeiten/Loeschen/Export/Massenaktionen sind fuer deine Rolle gesperrt.",
            kpiOpenQuotes: "Offene Angebote",
            kpiAllQuotes: "Angebote gesamt",
            kpiOverdueInvoices: "Ueberfaellige Rechnungen",
            kpiAllInvoices: "Rechnungen gesamt",
            recentTitle: "Zuletzt bearbeitete Belege",
            recentEmpty: "Noch keine Belege vorhanden.",
            updatedAt: "Aktualisiert",
            kindQuote: "Angebot",
            kindInvoice: "Rechnung",
            quickTitle: "Quick Links",
            quickSubtitle: "Wiederkehrende Sales-Aufgaben mit einem Klick starten.",
            toQuotes: "Angebote oeffnen",
            toInvoices: "Rechnungen oeffnen",
            toOutbox: "Mahn-Outbox",
            toProjects: "Projekte oeffnen",
            toDashboard: "Zur Uebersicht",
          },
    [locale],
  );

  const dateTimeFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "de-DE", {
        dateStyle: "short",
        timeStyle: "short",
      }),
    [locale],
  );

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const [
        quotesAll,
        quotesDraft,
        quotesSent,
        invoicesAll,
        invoicesOverdue,
        recentQuotes,
        recentInvoices,
      ] = await Promise.all([
        fetchParsed("/api/web/sales/quotes?limit=1&offset=0", salesQuotesListResponseSchema),
        fetchParsed(
          "/api/web/sales/quotes?status=draft&limit=1&offset=0",
          salesQuotesListResponseSchema,
        ),
        fetchParsed(
          "/api/web/sales/quotes?status=sent&limit=1&offset=0",
          salesQuotesListResponseSchema,
        ),
        fetchParsed(
          "/api/web/sales/invoices?limit=1&offset=0",
          salesInvoicesListResponseSchema,
        ),
        fetchParsed(
          "/api/web/sales/invoices?status=overdue&limit=1&offset=0",
          salesInvoicesListResponseSchema,
        ),
        fetchParsed(
          "/api/web/sales/quotes?sortBy=updatedAt&sortDir=desc&limit=5&offset=0",
          salesQuotesListResponseSchema,
        ),
        fetchParsed(
          "/api/web/sales/invoices?sortBy=updatedAt&sortDir=desc&limit=5&offset=0",
          salesInvoicesListResponseSchema,
        ),
      ]);

      const recentDocs = [
        ...recentQuotes.quotes.map((q) => ({
          id: q.id,
          href: `/web/sales/quotes/${q.id}`,
          kind: "quote" as const,
          documentNumber: q.documentNumber,
          customerLabel: q.customerLabel,
          updatedAt: q.updatedAt,
        })),
        ...recentInvoices.invoices.map((i) => ({
          id: i.id,
          href: `/web/sales/invoices/${i.id}`,
          kind: "invoice" as const,
          documentNumber: i.documentNumber,
          customerLabel: i.customerLabel,
          updatedAt: i.updatedAt,
        })),
      ]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 6);

      setData({
        quoteTotal: quotesAll.total,
        openQuotes: quotesDraft.total + quotesSent.total,
        invoiceTotal: invoicesAll.total,
        overdueInvoices: invoicesOverdue.total,
        recentDocs,
      });
    } catch {
      setError(copy.loadError);
      setData(null);
    } finally {
      setBusy(false);
    }
  }, [copy.loadError]);

  useEffect(() => {
    void load();
  }, [load]);

  const kpis = [
    { label: copy.kpiOpenQuotes, value: data?.openQuotes ?? 0 },
    { label: copy.kpiAllQuotes, value: data?.quoteTotal ?? 0 },
    { label: copy.kpiOverdueInvoices, value: data?.overdueInvoices ?? 0 },
    { label: copy.kpiAllInvoices, value: data?.invoiceTotal ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <Card className="border-border/80 bg-muted/15 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">{copy.title}</CardTitle>
          <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={busy}
          >
            {busy ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden /> : null}
            {copy.refresh}
          </Button>
          <Button size="sm" asChild>
            <Link href="/web/sales/quotes">{copy.toQuotes}</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/web/sales/invoices">{copy.toInvoices}</Link>
          </Button>
        </CardContent>
      </Card>

      {!session.permissions.sales.canEdit ? (
        <Alert>
          <AlertTitle>{copy.readOnlyTitle}</AlertTitle>
          <AlertDescription>{copy.readOnlyHint}</AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{error}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
              {copy.retry}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border-border/80 shadow-none">
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              {busy && !data ? (
                <Skeleton className="mt-2 h-8 w-16" />
              ) : (
                <p className="mt-1 text-2xl font-semibold tabular-nums">{kpi.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-border/80 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{copy.recentTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            {busy && !data ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[90%]" />
                <Skeleton className="h-4 w-[75%]" />
              </div>
            ) : data && data.recentDocs.length > 0 ? (
              <ul className="space-y-2">
                {data.recentDocs.map((item) => (
                  <li key={`${item.kind}-${item.id}`} className="rounded-md border bg-muted/20 p-2">
                    <p className="text-sm font-medium">
                      <Link
                        href={item.href}
                        className="text-primary underline underline-offset-4 hover:text-foreground"
                      >
                        {item.kind === "quote" ? copy.kindQuote : copy.kindInvoice} {item.documentNumber}
                      </Link>{" "}
                      · {item.customerLabel}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {copy.updatedAt}: {dateTimeFmt.format(new Date(item.updatedAt))}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{copy.recentEmpty}</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{copy.quickTitle}</CardTitle>
            <p className="text-xs text-muted-foreground">{copy.quickSubtitle}</p>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button variant="outline" asChild>
              <Link href="/web/sales/quotes">
                <FileText className="mr-2 size-4" aria-hidden />
                {copy.toQuotes}
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/web/sales/invoices">
                <ReceiptText className="mr-2 size-4" aria-hidden />
                {copy.toInvoices}
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/web/sales/outbox">{copy.toOutbox}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/web/projects">{copy.toProjects}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/web">{copy.toDashboard}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
