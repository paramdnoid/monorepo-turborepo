"use client";

import * as React from "react";
import Link from "next/link";
import { de } from "react-day-picker/locale/de";
import { enUS } from "react-day-picker/locale/en-US";

import type { TradeFeatureItem } from "@/content/trades";
import type { Locale } from "@/lib/i18n/locale";
import { TradeFeatureIcon } from "@/components/marketing/trades/trade-feature-icon";
import { Badge } from "@repo/ui/badge";
import { Calendar } from "@repo/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";
import { Separator } from "@repo/ui/separator";
import { cn } from "@repo/ui/utils";

type Appointment = {
  id: string;
  at: Date;
  title: string;
  place: string;
  kind: "site" | "office" | "customer";
};

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Demo-Termine (April 2026) — ersetzt später durch API-Daten. */
const DEMO_APPOINTMENTS: Appointment[] = [
  {
    id: "a1",
    at: new Date(2026, 3, 7, 8, 30),
    title: "Fassade Altbau Musterstr.",
    place: "Berlin-Mitte",
    kind: "site",
  },
  {
    id: "a2",
    at: new Date(2026, 3, 7, 13, 0),
    title: "Abnahme Innenanstrich",
    place: "Kunde: Studio Nord",
    kind: "customer",
  },
  {
    id: "a3",
    at: new Date(2026, 3, 9, 10, 0),
    title: "LV-Check Raumbuch",
    place: "Büro",
    kind: "office",
  },
  {
    id: "a4",
    at: new Date(2026, 3, 14, 7, 45),
    title: "Großprojekt Rollout Tag 1",
    place: "Potsdam",
    kind: "site",
  },
];

function kindBadge(
  kind: Appointment["kind"],
  locale: Locale,
): { label: string; variant: "default" | "secondary" | "outline" } {
  if (locale === "en") {
    if (kind === "site") return { label: "On site", variant: "default" };
    if (kind === "office") return { label: "Office", variant: "secondary" };
    return { label: "Customer", variant: "outline" };
  }
  if (kind === "site") return { label: "Baustelle", variant: "default" };
  if (kind === "office") return { label: "Büro", variant: "secondary" };
  return { label: "Kunde", variant: "outline" };
}

export function SchedulingContent({
  locale,
  feature,
}: {
  locale: Locale;
  feature: TradeFeatureItem;
}) {
  const initialMonth = React.useMemo(() => new Date(2026, 3, 1), []);
  const [month, setMonth] = React.useState(initialMonth);
  const [selected, setSelected] = React.useState<Date | undefined>(
    () => new Date(2026, 3, 7),
  );

  const rdpLocale = locale === "en" ? enUS : de;

  const hasAppointment = React.useCallback((date: Date) => {
    return DEMO_APPOINTMENTS.some((a) => isSameDay(a.at, date));
  }, []);

  const selectedDayItems = React.useMemo(() => {
    if (!selected) return [];
    return DEMO_APPOINTMENTS.filter((a) => isSameDay(a.at, selected)).sort(
      (x, y) => x.at.getTime() - y.at.getTime(),
    );
  }, [selected]);

  const previewNote =
    locale === "en"
      ? "Preview — connect your team calendar and projects here later."
      : "Vorschau — später Kalender, Team und Projekte anbinden.";

  const employeesLinkNote =
    locale === "en" ? (
      <>
        Assignments will use your{" "}
        <Link
          href="/web/employees"
          className="font-medium text-primary underline underline-offset-4 hover:text-foreground"
        >
          employee roster
        </Link>{" "}
        (qualifications, availability, dependencies).
      </>
    ) : (
      <>
        Einsaetze knuepfen spaeter an die{" "}
        <Link
          href="/web/employees"
          className="font-medium text-primary underline underline-offset-4 hover:text-foreground"
        >
          Mitarbeiterverwaltung
        </Link>{" "}
        (Qualifikationen, Verfuegbarkeit, Abhaengigkeiten).
      </>
    );

  const emptyDay =
    locale === "en"
      ? "No appointments on this day."
      : "Keine Termine an diesem Tag.";

  const listTitle = locale === "en" ? "Day" : "Tag";

  const timeFmt = React.useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [locale],
  );

  const dateFmt = React.useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "de-DE", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [locale],
  );

  return (
    <div className="w-full min-w-0 space-y-6">
      <section className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/8 ring-1 ring-primary/10">
            <TradeFeatureIcon name={feature.icon} />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight">
              {feature.label}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {feature.description}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,320px)_1fr] lg:items-start">
          <Card className="overflow-hidden border-border/80 bg-muted/15 shadow-none">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base">
                {locale === "en" ? "Calendar" : "Kalender"}
              </CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                {previewNote}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <Calendar
                mode="single"
                selected={selected}
                onSelect={setSelected}
                month={month}
                onMonthChange={setMonth}
                locale={rdpLocale}
                modifiers={{ hasAppointment }}
                modifiersClassNames={{
                  hasAppointment: cn(
                    "relative",
                    "after:pointer-events-none after:absolute after:bottom-1 after:left-1/2 after:z-10 after:h-1.5 after:w-1.5 after:-translate-x-1/2 after:rounded-full after:bg-primary",
                  ),
                }}
                className="mx-auto w-full max-w-[min(100%,20rem)]"
              />
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-muted/15 shadow-none">
            <CardHeader>
              <CardTitle className="text-base">
                {listTitle}
                {selected ? (
                  <span className="mt-1 block text-sm font-normal text-muted-foreground">
                    {dateFmt.format(selected)}
                  </span>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs leading-relaxed text-muted-foreground">
                {employeesLinkNote}
              </p>
              {!selected ? (
                <p className="text-sm text-muted-foreground">{emptyDay}</p>
              ) : selectedDayItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">{emptyDay}</p>
              ) : (
                <ul className="space-y-3" aria-label={listTitle}>
                  {selectedDayItems.map((item) => {
                    const b = kindBadge(item.kind, locale);
                    return (
                      <li key={item.id}>
                        <div className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 space-y-1">
                            <p className="text-sm font-medium leading-snug">
                              {item.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.place}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                            <span className="text-xs font-medium tabular-nums text-muted-foreground">
                              {timeFmt.format(item.at)}
                            </span>
                            <Badge variant={b.variant}>{b.label}</Badge>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              <Separator />
              <p className="text-xs text-muted-foreground">{previewNote}</p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
