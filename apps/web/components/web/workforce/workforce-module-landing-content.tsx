"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarRange, Loader2, UsersRound } from "lucide-react";
import {
  employeesListResponseSchema,
  schedulingAssignmentsListResponseSchema,
} from "@repo/api-contracts";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/alert";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { Skeleton } from "@repo/ui/skeleton";
import type { ZodType } from "zod";

import { useWebApp } from "@/components/web/shell/web-app-context";
import { parseResponseJson } from "@/lib/parse-response-json";

type WorkforceLandingData = {
  activeEmployees: number;
  onboardingEmployees: number;
  inactiveEmployees: number;
  todaysAssignments: number;
  recentEmployees: Array<{
    id: string;
    displayName: string;
    roleLabel: string | null;
    updatedAt: string;
  }>;
  todaysAssignmentItems: Array<{
    id: string;
    title: string;
    startTime: string;
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

export function WorkforceModuleLandingContent() {
  const { session } = useWebApp();
  const locale = session.locale;
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WorkforceLandingData | null>(null);

  const copy = useMemo(
    () =>
      locale === "en"
        ? {
            title: "Team & planning",
            subtitle:
              "Employees, availability, and assignments in one module entry with operational shortcuts.",
            loadError: "Workforce overview could not be loaded.",
            retry: "Retry",
            refresh: "Refresh",
            readOnlyTitle: "Read-only access",
            readOnlyHint:
              "You can open employees and scheduling, but edit/delete/export/batch actions are disabled for your role.",
            kpiActive: "Employees active",
            kpiOnboarding: "Employees onboarding",
            kpiInactive: "Employees inactive",
            kpiToday: "Assignments today",
            recentTitle: "Recently updated employees",
            recentEmpty: "No employees yet.",
            updatedAt: "Updated",
            todayTitle: "Today",
            todayEmpty: "No assignments planned for today.",
            quickTitle: "Quick links",
            quickSubtitle: "Jump directly to the key workflows in workforce.",
            toEmployees: "Open employees list",
            toScheduling: "Open scheduling",
            toDashboard: "Back to dashboard",
          }
        : {
            title: "Team & Planung",
            subtitle:
              "Mitarbeitende, Verfuegbarkeit und Einsaetze als gemeinsamer Moduleinstieg mit operativen Shortcuts.",
            loadError: "Team-Uebersicht konnte nicht geladen werden.",
            retry: "Erneut laden",
            refresh: "Aktualisieren",
            readOnlyTitle: "Nur Lesemodus",
            readOnlyHint:
              "Du kannst Mitarbeitende und Planung ansehen, aber Bearbeiten/Loeschen/Export/Massenaktionen sind fuer deine Rolle gesperrt.",
            kpiActive: "Mitarbeitende aktiv",
            kpiOnboarding: "Mitarbeitende Onboarding",
            kpiInactive: "Mitarbeitende inaktiv",
            kpiToday: "Einsaetze heute",
            recentTitle: "Zuletzt bearbeitete Mitarbeitende",
            recentEmpty: "Noch keine Mitarbeitenden vorhanden.",
            updatedAt: "Aktualisiert",
            todayTitle: "Heute",
            todayEmpty: "Fuer heute sind keine Einsaetze geplant.",
            quickTitle: "Quick Links",
            quickSubtitle: "Direkt zu den zentralen Workforce-Workflows springen.",
            toEmployees: "Mitarbeiterliste oeffnen",
            toScheduling: "Terminplanung oeffnen",
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
      const today = toIsoDateLocal(new Date());
      const [active, onboarding, inactive, todaysAssignments, recentEmployeesRaw] =
        await Promise.all([
          fetchParsed(
            "/api/web/employees?status=ACTIVE&limit=1&offset=0",
            employeesListResponseSchema,
          ),
          fetchParsed(
            "/api/web/employees?status=ONBOARDING&limit=1&offset=0",
            employeesListResponseSchema,
          ),
          fetchParsed(
            "/api/web/employees?status=INACTIVE&limit=1&offset=0",
            employeesListResponseSchema,
          ),
          fetchParsed(
            `/api/web/scheduling/assignments?date=${encodeURIComponent(today)}`,
            schedulingAssignmentsListResponseSchema,
          ),
          fetchParsed(
            "/api/web/employees?includeArchived=1&limit=200&offset=0",
            employeesListResponseSchema,
          ),
        ]);

      const recentEmployees = recentEmployeesRaw.employees
        .slice()
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 6)
        .map((item) => ({
          id: item.id,
          displayName: item.displayName,
          roleLabel: item.roleLabel,
          updatedAt: item.updatedAt,
        }));

      setData({
        activeEmployees: active.total,
        onboardingEmployees: onboarding.total,
        inactiveEmployees: inactive.total,
        todaysAssignments: todaysAssignments.assignments.length,
        recentEmployees,
        todaysAssignmentItems: todaysAssignments.assignments
          .slice()
          .sort((a, b) => a.startTime.localeCompare(b.startTime))
          .slice(0, 6)
          .map((item) => ({
            id: item.id,
            title: item.title,
            startTime: item.startTime,
          })),
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
    { label: copy.kpiActive, value: data?.activeEmployees ?? 0 },
    { label: copy.kpiOnboarding, value: data?.onboardingEmployees ?? 0 },
    { label: copy.kpiInactive, value: data?.inactiveEmployees ?? 0 },
    { label: copy.kpiToday, value: data?.todaysAssignments ?? 0 },
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
            <Link href="/web/employees/list">{copy.toEmployees}</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/web/scheduling">{copy.toScheduling}</Link>
          </Button>
        </CardContent>
      </Card>

      {!session.permissions.workforce.canEdit ? (
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

      <div className="grid gap-4 xl:grid-cols-3">
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
            ) : data && data.recentEmployees.length > 0 ? (
              <ul className="space-y-2">
                {data.recentEmployees.map((item) => (
                  <li key={item.id} className="rounded-md border bg-muted/20 p-2">
                    <p className="text-sm font-medium">
                      <Link
                        href={`/web/employees/${item.id}`}
                        className="text-primary underline underline-offset-4 hover:text-foreground"
                      >
                        {item.displayName}
                      </Link>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.roleLabel ? `${item.roleLabel} · ` : ""}
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
            <CardTitle className="text-base">{copy.todayTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            {busy && !data ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[90%]" />
                <Skeleton className="h-4 w-[75%]" />
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
              <p className="text-sm text-muted-foreground">{copy.todayEmpty}</p>
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
              <Link href="/web/employees/list">
                <UsersRound className="mr-2 size-4" aria-hidden />
                {copy.toEmployees}
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/web/scheduling">
                <CalendarRange className="mr-2 size-4" aria-hidden />
                {copy.toScheduling}
              </Link>
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
