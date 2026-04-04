"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookUser,
  CalendarRange,
  FileText,
  Loader2,
  Receipt,
  ReceiptText,
} from "lucide-react";
import {
  customersListResponseSchema,
  salesInvoicesListResponseSchema,
  salesQuotesListResponseSchema,
  schedulingAssignmentsListResponseSchema,
} from "@repo/api-contracts";
import { Alert, AlertDescription } from "@repo/ui/alert";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { Skeleton } from "@repo/ui/skeleton";
import type { ZodType } from "zod";

import { useWebApp } from "@/components/web/shell/web-app-context";
import { parseResponseJson } from "@/lib/parse-response-json";

type DashboardData = {
  openQuotes: number;
  overdueInvoices: number;
  todaysAssignments: number;
  customersTotal: number;
  overdueInvoiceItems: Array<{
    id: string;
    documentNumber: string;
    customerLabel: string;
    dueAt: string | null;
  }>;
  followUpQuoteItems: Array<{
    id: string;
    documentNumber: string;
    customerLabel: string;
    updatedAt: string;
  }>;
  todaysAssignmentItems: Array<{
    id: string;
    startTime: string;
    title: string;
  }>;
};

function toIsoDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

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

export function WebOverviewContent() {
  const { session } = useWebApp();
  const locale = session.locale;
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<Date | null>(null);

  const copy = useMemo(
    () =>
      locale === "en"
        ? {
            title: "Operations dashboard",
            subtitle:
              "Today's workload, open sales actions, and fast entry points for daily work.",
            loadError: "Dashboard data could not be loaded.",
            retry: "Retry",
            refresh: "Refresh",
            loadedAtPrefix: "Last updated:",
            kpiOpenQuotes: "Open quotes",
            kpiOverdueInvoices: "Overdue invoices",
            kpiTodaysAssignments: "Today's assignments",
            kpiCustomers: "Customers",
            urgentTitle: "Urgent",
            urgentSubtitle: "Overdue invoices that should be handled first.",
            urgentEmpty: "No overdue invoices. Great.",
            followUpTitle: "Quote follow-up",
            followUpSubtitle: "Recently updated sent quotes for active follow-up.",
            followUpEmpty: "No quotes currently marked as sent.",
            dayPlanTitle: "Today",
            dayPlanSubtitle: "Assignments planned for today.",
            dayPlanEmpty: "No assignments planned for today yet.",
            dueLabel: "Due",
            updatedLabel: "Updated",
            quickActionsTitle: "Quick actions",
            quickActionsSubtitle:
              "Start the most common operational actions with one click.",
            quickQuote: "Create or update quote",
            quickInvoice: "Create or update invoice",
            quickCustomer: "Add or edit customer",
            quickScheduling: "Plan assignments",
            quickActionLocked: "Requires edit permission",
          }
        : {
            title: "Operatives Dashboard",
            subtitle:
              "Tageslast, offene Vertriebsaufgaben und schnelle Einstiege fuer den Arbeitsalltag.",
            loadError: "Dashboard-Daten konnten nicht geladen werden.",
            retry: "Erneut laden",
            refresh: "Aktualisieren",
            loadedAtPrefix: "Zuletzt aktualisiert:",
            kpiOpenQuotes: "Offene Angebote",
            kpiOverdueInvoices: "Ueberfaellige Rechnungen",
            kpiTodaysAssignments: "Heutige Einsaetze",
            kpiCustomers: "Kunden gesamt",
            urgentTitle: "Dringend",
            urgentSubtitle:
              "Ueberfaellige Rechnungen, die zuerst bearbeitet werden sollten.",
            urgentEmpty: "Keine ueberfaelligen Rechnungen.",
            followUpTitle: "Angebots-Nachverfolgung",
            followUpSubtitle:
              "Zuletzt aktualisierte versendete Angebote fuer aktives Follow-up.",
            followUpEmpty: "Aktuell keine versendeten Angebote.",
            dayPlanTitle: "Heute",
            dayPlanSubtitle: "Fuer heute eingeplante Einsaetze.",
            dayPlanEmpty: "Fuer heute sind noch keine Einsaetze geplant.",
            dueLabel: "Faellig",
            updatedLabel: "Aktualisiert",
            quickActionsTitle: "Quick Actions",
            quickActionsSubtitle:
              "Die haeufigsten operativen Aktionen mit einem Klick starten.",
            quickQuote: "Angebot anlegen oder bearbeiten",
            quickInvoice: "Rechnung anlegen oder bearbeiten",
            quickCustomer: "Kunde anlegen oder pflegen",
            quickScheduling: "Einsaetze planen",
            quickActionLocked: "Edit-Recht erforderlich",
          },
    [locale],
  );

  const dateTimeFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "de-DE", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );
  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "de-DE", {
        dateStyle: "medium",
      }),
    [locale],
  );

  const loadDashboard = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const today = toIsoDateLocal(new Date());
      const [
        quotesDraft,
        quotesSent,
        invoicesOverdue,
        overdueInvoiceList,
        followUpQuotes,
        todaysAssignments,
        customers,
      ] = await Promise.all([
        fetchParsed(
          "/api/web/sales/quotes?status=draft&limit=1&offset=0",
          salesQuotesListResponseSchema,
        ),
        fetchParsed(
          "/api/web/sales/quotes?status=sent&limit=1&offset=0",
          salesQuotesListResponseSchema,
        ),
        fetchParsed(
          "/api/web/sales/invoices?status=overdue&limit=1&offset=0",
          salesInvoicesListResponseSchema,
        ),
        fetchParsed(
          "/api/web/sales/invoices?status=overdue&sortBy=dueAt&sortDir=asc&limit=5&offset=0",
          salesInvoicesListResponseSchema,
        ),
        fetchParsed(
          "/api/web/sales/quotes?status=sent&sortBy=updatedAt&sortDir=desc&limit=5&offset=0",
          salesQuotesListResponseSchema,
        ),
        fetchParsed(
          `/api/web/scheduling/assignments?date=${encodeURIComponent(today)}`,
          schedulingAssignmentsListResponseSchema,
        ),
        fetchParsed(
          "/api/web/customers?limit=1&offset=0",
          customersListResponseSchema,
        ),
      ]);

      setData({
        openQuotes: quotesDraft.total + quotesSent.total,
        overdueInvoices: invoicesOverdue.total,
        todaysAssignments: todaysAssignments.assignments.length,
        customersTotal: customers.total,
        overdueInvoiceItems: overdueInvoiceList.invoices.map((i) => ({
          id: i.id,
          documentNumber: i.documentNumber,
          customerLabel: i.customerLabel,
          dueAt: i.dueAt,
        })),
        followUpQuoteItems: followUpQuotes.quotes.map((q) => ({
          id: q.id,
          documentNumber: q.documentNumber,
          customerLabel: q.customerLabel,
          updatedAt: q.updatedAt,
        })),
        todaysAssignmentItems: todaysAssignments.assignments
          .slice()
          .sort((a, b) => a.startTime.localeCompare(b.startTime))
          .slice(0, 5)
          .map((a) => ({
            id: a.id,
            startTime: a.startTime,
            title: a.title,
          })),
      });
      setLastLoadedAt(new Date());
    } catch {
      setError(copy.loadError);
      setData(null);
    } finally {
      setBusy(false);
    }
  }, [copy.loadError]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const kpis = [
    { label: copy.kpiOpenQuotes, value: data?.openQuotes ?? 0, icon: FileText },
    {
      label: copy.kpiOverdueInvoices,
      value: data?.overdueInvoices ?? 0,
      icon: ReceiptText,
    },
    {
      label: copy.kpiTodaysAssignments,
      value: data?.todaysAssignments ?? 0,
      icon: CalendarRange,
    },
    { label: copy.kpiCustomers, value: data?.customersTotal ?? 0, icon: BookUser },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{copy.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{copy.subtitle}</p>
            {lastLoadedAt ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {copy.loadedAtPrefix} {dateTimeFmt.format(lastLoadedAt)}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadDashboard()}
            disabled={busy}
          >
            {busy ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden /> : null}
            {copy.refresh}
          </Button>
        </div>
      </section>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{error}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void loadDashboard()}
              disabled={busy}
            >
              {copy.retry}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border-border/80 shadow-none">
            <CardContent className="flex items-center justify-between gap-3 py-4">
              <div>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                {busy && !data ? (
                  <Skeleton className="mt-2 h-8 w-16" />
                ) : (
                  <p className="mt-1 text-2xl font-semibold tabular-nums">{kpi.value}</p>
                )}
              </div>
              <div className="rounded-md bg-primary/10 p-2 text-primary">
                <kpi.icon className="size-5" aria-hidden />
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="border-border/80 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{copy.urgentTitle}</CardTitle>
            <p className="text-xs text-muted-foreground">{copy.urgentSubtitle}</p>
          </CardHeader>
          <CardContent>
            {busy && !data ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[90%]" />
                <Skeleton className="h-4 w-[75%]" />
              </div>
            ) : data && data.overdueInvoiceItems.length > 0 ? (
              <ul className="space-y-2">
                {data.overdueInvoiceItems.map((item) => (
                  <li key={item.id} className="rounded-md border bg-muted/20 p-2">
                    <p className="text-sm font-medium">
                      {item.documentNumber} · {item.customerLabel}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {copy.dueLabel}:{" "}
                      {item.dueAt ? dateFmt.format(new Date(item.dueAt)) : "—"}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{copy.urgentEmpty}</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{copy.followUpTitle}</CardTitle>
            <p className="text-xs text-muted-foreground">{copy.followUpSubtitle}</p>
          </CardHeader>
          <CardContent>
            {busy && !data ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[92%]" />
                <Skeleton className="h-4 w-[82%]" />
              </div>
            ) : data && data.followUpQuoteItems.length > 0 ? (
              <ul className="space-y-2">
                {data.followUpQuoteItems.map((item) => (
                  <li key={item.id} className="rounded-md border bg-muted/20 p-2">
                    <p className="text-sm font-medium">
                      {item.documentNumber} · {item.customerLabel}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {copy.updatedLabel}: {dateTimeFmt.format(new Date(item.updatedAt))}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{copy.followUpEmpty}</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{copy.dayPlanTitle}</CardTitle>
            <p className="text-xs text-muted-foreground">{copy.dayPlanSubtitle}</p>
          </CardHeader>
          <CardContent>
            {busy && !data ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[86%]" />
                <Skeleton className="h-4 w-[70%]" />
              </div>
            ) : data && data.todaysAssignmentItems.length > 0 ? (
              <ul className="space-y-2">
                {data.todaysAssignmentItems.map((item) => (
                  <li key={item.id} className="rounded-md border bg-muted/20 p-2">
                    <p className="text-sm font-medium">
                      {item.startTime} · {item.title}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{copy.dayPlanEmpty}</p>
            )}
          </CardContent>
        </Card>
      </section>

      <Card className="border-border/80 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{copy.quickActionsTitle}</CardTitle>
          <p className="text-xs text-muted-foreground">{copy.quickActionsSubtitle}</p>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {session.permissions.sales.canEdit ? (
            <Button variant="outline" asChild>
              <Link href="/web/sales/quotes">
                <FileText className="mr-2 size-4" aria-hidden />
                {copy.quickQuote}
              </Link>
            </Button>
          ) : (
            <Button variant="outline" disabled title={copy.quickActionLocked}>
              <FileText className="mr-2 size-4" aria-hidden />
              {copy.quickQuote}
            </Button>
          )}
          {session.permissions.sales.canEdit ? (
            <Button variant="outline" asChild>
              <Link href="/web/sales/invoices">
                <Receipt className="mr-2 size-4" aria-hidden />
                {copy.quickInvoice}
              </Link>
            </Button>
          ) : (
            <Button variant="outline" disabled title={copy.quickActionLocked}>
              <Receipt className="mr-2 size-4" aria-hidden />
              {copy.quickInvoice}
            </Button>
          )}
          {session.permissions.customers.canEdit ? (
            <Button variant="outline" asChild>
              <Link href="/web/customers/list">
                <BookUser className="mr-2 size-4" aria-hidden />
                {copy.quickCustomer}
              </Link>
            </Button>
          ) : (
            <Button variant="outline" disabled title={copy.quickActionLocked}>
              <BookUser className="mr-2 size-4" aria-hidden />
              {copy.quickCustomer}
            </Button>
          )}
          {session.permissions.workforce.canEdit ? (
            <Button variant="outline" asChild>
              <Link href="/web/scheduling">
                <CalendarRange className="mr-2 size-4" aria-hidden />
                {copy.quickScheduling}
              </Link>
            </Button>
          ) : (
            <Button variant="outline" disabled title={copy.quickActionLocked}>
              <CalendarRange className="mr-2 size-4" aria-hidden />
              {copy.quickScheduling}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
