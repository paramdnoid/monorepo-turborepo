"use client";

import * as React from "react";
import Link from "next/link";
import { de } from "react-day-picker/locale/de";
import { enUS } from "react-day-picker/locale/en-US";

import {
  schedulingAssignmentCreateResponseSchema,
  schedulingAssignmentsListResponseSchema,
  schedulingDayResponseSchema,
  type SchedulingDependencyWarning,
  type SchedulingDayEmployee,
} from "@repo/api-contracts";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Calendar } from "@repo/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Separator } from "@repo/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import { cn } from "@repo/ui/utils";

import type { Locale } from "@/lib/i18n/locale";
import { parseResponseJson } from "@/lib/parse-response-json";

type SchedulingAssignment = {
  id: string;
  date: string;
  atTime: string;
  title: string;
  place: string;
  employeeId: string;
  reminderMinutesBefore: number | null;
};

function toIsoDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function slotLabel(
  slot: SchedulingDayEmployee["slots"][number],
  locale: Locale,
): string {
  const suffix = slot.crossesMidnight
    ? locale === "en"
      ? " (+1d)"
      : " (+1T)"
    : "";
  return `${slot.startTime} - ${slot.endTime}${suffix}`;
}

export function SchedulingContent({ locale }: { locale: Locale }) {
  const initialMonth = React.useMemo(() => new Date(), []);
  const [month, setMonth] = React.useState(initialMonth);
  const [selected, setSelected] = React.useState<Date | undefined>(
    () => new Date(),
  );
  const [employees, setEmployees] = React.useState<SchedulingDayEmployee[]>([]);
  const [dependencyWarnings, setDependencyWarnings] = React.useState<
    SchedulingDependencyWarning[]
  >([]);
  const [loadBusy, setLoadBusy] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [assignments, setAssignments] = React.useState<SchedulingAssignment[]>(
    [],
  );
  const [assignmentDates, setAssignmentDates] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [assignmentBusy, setAssignmentBusy] = React.useState(false);
  const [assignmentError, setAssignmentError] = React.useState<string | null>(
    null,
  );
  const [draftTime, setDraftTime] = React.useState("08:00");
  const [draftTitle, setDraftTitle] = React.useState("");
  const [draftPlace, setDraftPlace] = React.useState("");
  const [draftEmployeeId, setDraftEmployeeId] = React.useState<string>("");
  const [draftReminderMinutes, setDraftReminderMinutes] = React.useState<
    "none" | "15" | "30" | "60" | "120"
  >("none");

  const rdpLocale = locale === "en" ? enUS : de;
  const selectedDate = selected ? toIsoDateLocal(selected) : null;

  const availableEmployees = React.useMemo(
    () => employees.filter((e) => e.isAvailable),
    [employees],
  );

  const selectedDayAssignments = React.useMemo(
    () => [...assignments].sort((a, b) => a.atTime.localeCompare(b.atTime)),
    [assignments],
  );

  React.useEffect(() => {
    if (!selectedDate) return;
    let cancelled = false;
    setLoadBusy(true);
    setLoadError(null);
    void (async () => {
      try {
        const res = await fetch(
          `/api/web/scheduling/day?date=${encodeURIComponent(selectedDate)}`,
          { credentials: "include" },
        );
        const text = await res.text();
        const json = parseResponseJson(text);
        const parsed = schedulingDayResponseSchema.safeParse(json);
        if (!res.ok || !parsed.success) {
          if (!cancelled) {
            setEmployees([]);
            setDependencyWarnings([]);
            setLoadError(
              locale === "en"
                ? "Could not load scheduling data."
                : "Planungsdaten konnten nicht geladen werden.",
            );
          }
          return;
        }
        if (!cancelled) {
          setEmployees(parsed.data.employees);
          setDependencyWarnings(parsed.data.dependencyWarnings);
        }
      } catch {
        if (!cancelled) {
          setEmployees([]);
          setDependencyWarnings([]);
          setLoadError(
            locale === "en"
              ? "Could not load scheduling data."
              : "Planungsdaten konnten nicht geladen werden.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadBusy(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locale, selectedDate]);

  const loadAssignmentDates = React.useCallback(async () => {
    try {
      const res = await fetch("/api/web/scheduling/assignments", {
        credentials: "include",
      });
      const text = await res.text();
      const json = parseResponseJson(text);
      const parsed = schedulingAssignmentsListResponseSchema.safeParse(json);
      if (!res.ok || !parsed.success) {
        return;
      }
      setAssignmentDates(new Set(parsed.data.assignments.map((a) => a.date)));
    } catch {
      // silently ignore calendar marker loading errors
    }
  }, []);

  const loadDayAssignments = React.useCallback(
    async (date: string) => {
      setAssignmentBusy(true);
      setAssignmentError(null);
      try {
        const res = await fetch(
          `/api/web/scheduling/assignments?date=${encodeURIComponent(date)}`,
          { credentials: "include" },
        );
        const text = await res.text();
        const json = parseResponseJson(text);
        const parsed = schedulingAssignmentsListResponseSchema.safeParse(json);
        if (!res.ok || !parsed.success) {
          setAssignments([]);
          setAssignmentError(
            locale === "en"
              ? "Could not load assignments."
              : "Einsätze konnten nicht geladen werden.",
          );
          return;
        }
        setAssignments(
          parsed.data.assignments.map((a) => ({
            id: a.id,
            date: a.date,
            atTime: a.startTime,
            title: a.title,
            place: a.place ?? "",
            employeeId: a.employeeId,
            reminderMinutesBefore: a.reminderMinutesBefore,
          })),
        );
      } catch {
        setAssignments([]);
        setAssignmentError(
          locale === "en"
            ? "Could not load assignments."
            : "Einsätze konnten nicht geladen werden.",
        );
      } finally {
        setAssignmentBusy(false);
      }
    },
    [locale],
  );

  React.useEffect(() => {
    void loadAssignmentDates();
  }, [loadAssignmentDates]);

  React.useEffect(() => {
    if (!selectedDate) {
      setAssignments([]);
      return;
    }
    void loadDayAssignments(selectedDate);
  }, [loadDayAssignments, selectedDate]);

  React.useEffect(() => {
    const current = draftEmployeeId;
    if (current && availableEmployees.some((e) => e.employeeId === current)) {
      return;
    }
    setDraftEmployeeId(availableEmployees[0]?.employeeId ?? "");
  }, [availableEmployees, draftEmployeeId]);

  const previewNote =
    locale === "en"
      ? "Live team capacity based on employee data, availability, vacation, and sick reports."
      : "Live-Teamkapazität aus Mitarbeitenden, Verfügbarkeit, Urlaub und Krankmeldungen.";

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
        and are marked with availability windows for the selected day.
      </>
    ) : (
      <>
        Einsaetze basieren auf der{" "}
        <Link
          href="/web/employees"
          className="font-medium text-primary underline underline-offset-4 hover:text-foreground"
        >
          Mitarbeiterverwaltung
        </Link>{" "}
        und zeigen Verfuegbarkeitsfenster am gewaehlten Tag.
      </>
    );

  const emptyDay =
    locale === "en"
      ? "No employee capacity on this day."
      : "Keine Teamkapazität an diesem Tag.";

  const listTitle = locale === "en" ? "Day plan" : "Tagesplanung";
  const assignmentTitle = locale === "en" ? "Assignments" : "Einsaetze";
  const assignmentAdd =
    locale === "en" ? "Add assignment" : "Einsatz hinzufügen";
  const unavailableMap: Record<
    NonNullable<SchedulingDayEmployee["unavailableReason"]>,
    string
  > = locale === "en"
    ? { vacation: "Vacation", sick: "Sick", override: "Exception" }
    : { vacation: "Urlaub", sick: "Krank", override: "Ausnahme" };
  const warningKindLabel =
    locale === "en"
      ? {
          MUTUALLY_EXCLUSIVE: "Hard conflict",
          MENTOR_TRAINEE: "Mentor/Trainee",
        }
      : {
          MUTUALLY_EXCLUSIVE: "Harter Konflikt",
          MENTOR_TRAINEE: "Mentor/Trainee",
        };

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

  const hasAssignment = React.useCallback(
    (date: Date) => {
      const iso = toIsoDateLocal(date);
      return assignmentDates.has(iso);
    },
    [assignmentDates],
  );

  async function addAssignment() {
    if (!selectedDate || !draftEmployeeId || !draftTitle.trim()) {
      return;
    }
    setAssignmentError(null);
    try {
      const res = await fetch("/api/web/scheduling/assignments", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: draftEmployeeId,
          date: selectedDate,
          startTime: draftTime,
          title: draftTitle.trim(),
          place: draftPlace.trim() ? draftPlace.trim() : null,
          reminderMinutesBefore:
            draftReminderMinutes === "none"
              ? null
              : Number(draftReminderMinutes),
        }),
      });
      const text = await res.text();
      const json = parseResponseJson(text);
      const parsed = schedulingAssignmentCreateResponseSchema.safeParse(json);
      if (!res.ok || !parsed.success) {
        setAssignmentError(
          locale === "en"
            ? "Could not create assignment."
            : "Einsatz konnte nicht erstellt werden.",
        );
        return;
      }
      setDraftTitle("");
      setDraftPlace("");
      setDraftReminderMinutes("none");
      if (parsed.data.dependencyWarnings.length > 0) {
        setDependencyWarnings(parsed.data.dependencyWarnings);
      }
      await Promise.all([
        loadDayAssignments(selectedDate),
        loadAssignmentDates(),
      ]);
    } catch {
      setAssignmentError(
        locale === "en"
          ? "Could not create assignment."
          : "Einsatz konnte nicht erstellt werden.",
      );
    }
  }

  async function removeAssignment(id: string) {
    if (!selectedDate) {
      return;
    }
    setAssignmentError(null);
    try {
      const res = await fetch(
        `/api/web/scheduling/assignments/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      if (!res.ok) {
        setAssignmentError(
          locale === "en"
            ? "Could not remove assignment."
            : "Einsatz konnte nicht entfernt werden.",
        );
        return;
      }
      await Promise.all([
        loadDayAssignments(selectedDate),
        loadAssignmentDates(),
      ]);
    } catch {
      setAssignmentError(
        locale === "en"
          ? "Could not remove assignment."
          : "Einsatz konnte nicht entfernt werden.",
      );
    }
  }

  return (
    <div className="grid w-full min-w-0 gap-6 lg:grid-cols-[minmax(0,320px)_1fr] lg:items-start">
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
            modifiers={{ hasAssignment }}
            modifiersClassNames={{
              hasAssignment: cn(
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
          {!selected ? null : loadBusy ? (
            <p className="text-sm text-muted-foreground">
              {locale === "en" ? "Loading…" : "Lädt…"}
            </p>
          ) : loadError ? (
            <p className="text-sm text-destructive">{loadError}</p>
          ) : employees.length === 0 ? (
            <p className="text-sm text-muted-foreground">{emptyDay}</p>
          ) : (
            <ul className="space-y-3" aria-label={listTitle}>
              {employees.map((item) => {
                const unavailable =
                  item.unavailableReason !== null
                    ? unavailableMap[item.unavailableReason]
                    : null;
                return (
                  <li key={item.employeeId}>
                    <div className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-medium leading-snug">
                          {item.displayName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.employeeNo ? `${item.employeeNo} · ` : ""}
                          {item.city ?? "—"} · {item.availabilityTimeZone}
                        </p>
                        {item.isAvailable && item.slots.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {item.slots.map((s, idx) => (
                              <Badge
                                key={`${item.employeeId}-${idx}`}
                                variant="outline"
                              >
                                {slotLabel(s, locale)}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                        <Badge
                          variant={item.isAvailable ? "secondary" : "outline"}
                        >
                          {item.isAvailable
                            ? locale === "en"
                              ? "Available"
                              : "Verfügbar"
                            : (unavailable ??
                              (locale === "en"
                                ? "Unavailable"
                                : "Nicht verfügbar"))}
                        </Badge>
                        <Badge variant={item.hasGeo ? "secondary" : "outline"}>
                          {item.hasGeo
                            ? locale === "en"
                              ? "Geo"
                              : "Geo"
                            : locale === "en"
                              ? "No geo"
                              : "Kein Geo"}
                        </Badge>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {dependencyWarnings.length > 0 ? (
            <div className="space-y-2 rounded-md border border-amber-300/40 bg-amber-100/20 p-3">
              <p className="text-xs font-medium">
                {locale === "en"
                  ? "Dependency warnings for this day"
                  : "Abhaengigkeits-Hinweise fuer diesen Tag"}
              </p>
              <ul className="space-y-1">
                {dependencyWarnings.map((w, idx) => (
                  <li
                    key={`${w.kind}-${w.employeeId}-${w.relatedEmployeeId}-${idx}`}
                    className="text-xs text-muted-foreground"
                  >
                    {warningKindLabel[w.kind]}: {w.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <Separator />

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-medium">{assignmentTitle}</h3>
              {selectedDate ? (
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={`/api/web/scheduling/assignments-ics?date=${encodeURIComponent(
                      selectedDate,
                    )}`}
                  >
                    {locale === "en"
                      ? "Export calendar (.ics)"
                      : "Kalender exportieren (.ics)"}
                  </Link>
                </Button>
              ) : null}
            </div>
            {assignmentError ? (
              <p className="text-sm text-destructive">{assignmentError}</p>
            ) : null}
            <div className="grid gap-3 rounded-lg border bg-muted/10 p-3 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="sched-time">
                  {locale === "en" ? "Time" : "Uhrzeit"}
                </Label>
                <Input
                  id="sched-time"
                  type="time"
                  value={draftTime}
                  onChange={(ev) => setDraftTime(ev.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sched-employee">
                  {locale === "en" ? "Employee" : "Mitarbeitende:r"}
                </Label>
                <Select
                  value={draftEmployeeId}
                  onValueChange={setDraftEmployeeId}
                >
                  <SelectTrigger id="sched-employee">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEmployees.map((e) => (
                      <SelectItem key={e.employeeId} value={e.employeeId}>
                        {e.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sched-reminder">
                  {locale === "en" ? "Reminder" : "Erinnerung"}
                </Label>
                <Select
                  value={draftReminderMinutes}
                  onValueChange={(v) =>
                    setDraftReminderMinutes(
                      v as "none" | "15" | "30" | "60" | "120",
                    )
                  }
                >
                  <SelectTrigger id="sched-reminder">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      {locale === "en" ? "None" : "Keine"}
                    </SelectItem>
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="60">60 min</SelectItem>
                    <SelectItem value="120">120 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="sched-title">
                  {locale === "en" ? "Task" : "Einsatz"}
                </Label>
                <Input
                  id="sched-title"
                  value={draftTitle}
                  onChange={(ev) => setDraftTitle(ev.target.value)}
                />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="sched-place">
                  {locale === "en" ? "Place" : "Ort"}
                </Label>
                <Input
                  id="sched-place"
                  value={draftPlace}
                  onChange={(ev) => setDraftPlace(ev.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Button
                  type="button"
                  onClick={() => {
                    void addAssignment();
                  }}
                  disabled={
                    assignmentBusy ||
                    !selectedDate ||
                    !draftEmployeeId ||
                    !draftTitle.trim()
                  }
                >
                  {assignmentBusy
                    ? locale === "en"
                      ? "Saving…"
                      : "Speichert…"
                    : assignmentAdd}
                </Button>
              </div>
            </div>

            {selectedDayAssignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {locale === "en"
                  ? "No assignments for this day."
                  : "Noch keine Einsätze für diesen Tag."}
              </p>
            ) : (
              <ul className="space-y-2">
                {selectedDayAssignments.map((a) => {
                  const employee = employees.find(
                    (e) => e.employeeId === a.employeeId,
                  );
                  return (
                    <li
                      key={a.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/10 px-3 py-2"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-sm font-medium">
                          {a.atTime} · {a.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {employee?.displayName ?? "—"}
                          {a.place ? ` · ${a.place}` : ""}
                          {a.reminderMinutesBefore != null
                            ? locale === "en"
                              ? ` · Reminder ${a.reminderMinutesBefore}m`
                              : ` · Erinnerung ${a.reminderMinutesBefore} Min`
                            : ""}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          void removeAssignment(a.id);
                        }}
                        disabled={assignmentBusy}
                      >
                        {locale === "en" ? "Remove" : "Entfernen"}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <Separator />
          <p className="text-xs text-muted-foreground">{previewNote}</p>
        </CardContent>
      </Card>
    </div>
  );
}
