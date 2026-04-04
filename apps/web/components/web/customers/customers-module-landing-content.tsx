"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Loader2, MapPin } from "lucide-react";
import {
  customersAddressesListResponseSchema,
  customersListResponseSchema,
} from "@repo/api-contracts";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/alert";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { Skeleton } from "@repo/ui/skeleton";
import type { ZodType } from "zod";

import { useWebApp } from "@/components/web/shell/web-app-context";
import { parseResponseJson } from "@/lib/parse-response-json";

type CustomersLandingData = {
  totalAll: number;
  totalActive: number;
  totalArchived: number;
  addressTotal: number;
  recentCustomers: Array<{
    id: string;
    displayName: string;
    customerNumber: string | null;
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

export function CustomersModuleLandingContent() {
  const { session } = useWebApp();
  const locale = session.locale;
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CustomersLandingData | null>(null);

  const copy = useMemo(
    () =>
      locale === "en"
        ? {
            title: "Customers module",
            subtitle:
              "Customer master data and addresses as the shared foundation for documents and projects.",
            loadError: "Customers overview could not be loaded.",
            retry: "Retry",
            refresh: "Refresh",
            readOnlyTitle: "Read-only access",
            readOnlyHint:
              "You can view customers and addresses, but edit/delete/export/batch actions are disabled for your role.",
            kpiCustomersAll: "Customers total",
            kpiCustomersActive: "Customers active",
            kpiCustomersArchived: "Customers archived",
            kpiAddresses: "Addresses total",
            recentTitle: "Recently updated customers",
            recentEmpty: "No customers yet.",
            updatedAt: "Updated",
            quickTitle: "Quick links",
            quickSubtitle: "Jump directly to the most common master-data tasks.",
            toCustomers: "Open customers list",
            toAddresses: "Open addresses overview",
            toSales: "Open sales",
            toDashboard: "Back to dashboard",
          }
        : {
            title: "Kunden-Modul",
            subtitle:
              "Kundenstamm und Adressen als gemeinsame Basis fuer Belege und Projekte.",
            loadError: "Kunden-Uebersicht konnte nicht geladen werden.",
            retry: "Erneut laden",
            refresh: "Aktualisieren",
            readOnlyTitle: "Nur Lesemodus",
            readOnlyHint:
              "Du kannst Kunden und Adressen ansehen, aber Bearbeiten/Loeschen/Export/Massenaktionen sind fuer deine Rolle gesperrt.",
            kpiCustomersAll: "Kunden gesamt",
            kpiCustomersActive: "Kunden aktiv",
            kpiCustomersArchived: "Kunden archiviert",
            kpiAddresses: "Adressen gesamt",
            recentTitle: "Zuletzt bearbeitete Kunden",
            recentEmpty: "Noch keine Kunden vorhanden.",
            updatedAt: "Aktualisiert",
            quickTitle: "Quick Links",
            quickSubtitle: "Direkt zu den haeufigsten Stammdaten-Aufgaben springen.",
            toCustomers: "Kundenliste oeffnen",
            toAddresses: "Adress-Uebersicht oeffnen",
            toSales: "Sales oeffnen",
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
      const [activeCustomers, allCustomers, addresses, recentCustomersRaw] =
        await Promise.all([
          fetchParsed("/api/web/customers?limit=1&offset=0", customersListResponseSchema),
          fetchParsed(
            "/api/web/customers?includeArchived=1&limit=1&offset=0",
            customersListResponseSchema,
          ),
          fetchParsed(
            "/api/web/customers/addresses?includeArchived=1&limit=1&offset=0",
            customersAddressesListResponseSchema,
          ),
          fetchParsed(
            "/api/web/customers?includeArchived=1&limit=200&offset=0",
            customersListResponseSchema,
          ),
        ]);

      const recentCustomers = recentCustomersRaw.customers
        .slice()
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 6)
        .map((item) => ({
          id: item.id,
          displayName: item.displayName,
          customerNumber: item.customerNumber,
          updatedAt: item.updatedAt,
        }));

      setData({
        totalAll: allCustomers.total,
        totalActive: activeCustomers.total,
        totalArchived: Math.max(0, allCustomers.total - activeCustomers.total),
        addressTotal: addresses.total,
        recentCustomers,
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
    { label: copy.kpiCustomersAll, value: data?.totalAll ?? 0 },
    { label: copy.kpiCustomersActive, value: data?.totalActive ?? 0 },
    { label: copy.kpiCustomersArchived, value: data?.totalArchived ?? 0 },
    { label: copy.kpiAddresses, value: data?.addressTotal ?? 0 },
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
            <Link href="/web/customers/list">{copy.toCustomers}</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/web/customers/addresses">{copy.toAddresses}</Link>
          </Button>
        </CardContent>
      </Card>

      {!session.permissions.customers.canEdit ? (
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
            ) : data && data.recentCustomers.length > 0 ? (
              <ul className="space-y-2">
                {data.recentCustomers.map((item) => (
                  <li key={item.id} className="rounded-md border bg-muted/20 p-2">
                    <p className="text-sm font-medium">
                      <Link
                        href={`/web/customers/${item.id}`}
                        className="text-primary underline underline-offset-4 hover:text-foreground"
                      >
                        {item.displayName}
                      </Link>
                      {item.customerNumber ? ` (${item.customerNumber})` : ""}
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
              <Link href="/web/customers/list">
                <Building2 className="mr-2 size-4" aria-hidden />
                {copy.toCustomers}
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/web/customers/addresses">
                <MapPin className="mr-2 size-4" aria-hidden />
                {copy.toAddresses}
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/web/sales/quotes">{copy.toSales}</Link>
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
