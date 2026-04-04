"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  employeeActivityListResponseSchema,
  type EmployeeActivityEvent,
} from "@repo/api-contracts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/card";
import { Skeleton } from "@repo/ui/skeleton";

import { getEmployeesCopy } from "@/content/employees-module";
import type { Locale } from "@/lib/i18n/locale";
import { parseResponseJson } from "@/lib/parse-response-json";

function fieldLabels(locale: Locale): Record<string, string> {
  if (locale === "en") {
    return {
      employeeNo: "Employee no.",
      firstName: "First name",
      lastName: "Last name",
      email: "Email",
      phone: "Phone",
      status: "Status",
      employmentType: "Employment type",
      availabilityTimeZone: "Time zone",
      displayName: "Display name",
      roleLabel: "Role",
      notes: "Notes",
      privateAddressLabel: "Address label",
      privateAddressLine2: "Address line 2",
      privateRecipientName: "Recipient",
      privateStreet: "Street",
      privatePostalCode: "Postal code",
      privateCity: "City",
      privateCountry: "Country",
      coordinates: "Coordinates",
      geocodeSource: "Geocoding source",
      archived: "Archive",
      availability: "Weekly availability",
      availabilityOverrides: "Availability exceptions",
    };
  }
  return {
    employeeNo: "Personalnr.",
    firstName: "Vorname",
    lastName: "Nachname",
    email: "E-Mail",
    phone: "Telefon",
    status: "Status",
    employmentType: "Beschaeftigung",
    availabilityTimeZone: "Zeitzone",
    displayName: "Anzeigename",
    roleLabel: "Rolle",
    notes: "Notizen",
    privateAddressLabel: "Adressbezeichnung",
    privateAddressLine2: "Adresszusatz",
    privateRecipientName: "Empfaenger",
    privateStreet: "Strasse",
    privatePostalCode: "PLZ",
    privateCity: "Ort",
    privateCountry: "Land",
    coordinates: "Koordinaten",
    geocodeSource: "Geocoding-Quelle",
    archived: "Archiv",
    availability: "Woechentliche Verfuegbarkeit",
    availabilityOverrides: "Verfuegbarkeitsausnahmen",
  };
}

function formatActor(sub: string): string {
  const s = sub.trim();
  if (!s) {
    return "—";
  }
  if (s.length <= 14) {
    return s;
  }
  return `…${s.slice(-12)}`;
}

function formatWhen(iso: string, locale: Locale): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function vacationStatusLabel(status: string, locale: Locale): string {
  if (status === "approved") {
    return locale === "en" ? "Approved" : "Genehmigt";
  }
  if (status === "rejected") {
    return locale === "en" ? "Rejected" : "Abgelehnt";
  }
  return status;
}

function actionHeading(ev: EmployeeActivityEvent, locale: Locale) {
  const t = getEmployeesCopy(locale);
  switch (ev.action) {
    case "employee_created":
      return t.activityActionEmployeeCreated;
    case "employee_updated":
      return t.activityActionEmployeeUpdated;
    case "employee_deleted":
      return t.activityActionEmployeeDeleted;
    case "employee_skills_updated":
      return t.activityActionEmployeeSkillsUpdated;
    case "employee_relationship_upserted":
      return t.activityActionEmployeeRelationshipUpserted;
    case "employee_relationship_deleted":
      return t.activityActionEmployeeRelationshipDeleted;
    case "employee_profile_image_updated":
      return t.activityActionEmployeeProfileImageUpdated;
    case "employee_profile_image_deleted":
      return t.activityActionEmployeeProfileImageDeleted;
    case "employee_attachment_uploaded":
      return t.activityActionEmployeeAttachmentUploaded;
    case "employee_attachment_deleted":
      return t.activityActionEmployeeAttachmentDeleted;
    case "vacation_requested":
      return t.activityActionVacationRequested;
    case "vacation_decided":
      return t.activityActionVacationDecided;
    case "sick_report_created":
      return t.activityActionSickReportCreated;
    default:
      return ev.action;
  }
}

function detailLines(
  ev: EmployeeActivityEvent,
  locale: Locale,
): { key: string; text: string }[] {
  const t = getEmployeesCopy(locale);
  const labels = fieldLabels(locale);
  const d = ev.detail;
  if (!d || typeof d !== "object") {
    return [];
  }

  const out: { key: string; text: string }[] = [];

  if (ev.action === "employee_created" && typeof d.displayName === "string") {
    out.push({ key: "name", text: d.displayName });
  }
  if (ev.action === "employee_deleted" && typeof d.displayName === "string") {
    out.push({ key: "name", text: d.displayName });
  }

  if (ev.action === "employee_updated") {
    const raw = d.changedKeys;
    if (Array.isArray(raw)) {
      const keys = raw.filter((x): x is string => typeof x === "string");
      if (keys.length > 0) {
        const pretty = keys.map((k) => labels[k] ?? k).join(", ");
        out.push({
          key: "changed",
          text: t.activityChangedFields.replace("{fields}", pretty),
        });
      }
    }
  }

  if (ev.action === "vacation_requested") {
    const from = typeof d.fromDate === "string" ? d.fromDate : "";
    const to = typeof d.toDate === "string" ? d.toDate : "";
    if (from && to) {
      out.push({
        key: "range",
        text: t.activityVacationRange.replace("{from}", from).replace("{to}", to),
      });
    }
  }

  if (ev.action === "vacation_decided" && typeof d.status === "string") {
    out.push({
      key: "dec",
      text: t.activityDecisionStatus.replace(
        "{status}",
        vacationStatusLabel(d.status, locale),
      ),
    });
  }

  if (ev.action === "sick_report_created") {
    const from = typeof d.fromDate === "string" ? d.fromDate : "";
    const to = typeof d.toDate === "string" ? d.toDate : "";
    if (from && to) {
      out.push({
        key: "range",
        text: t.activityVacationRange.replace("{from}", from).replace("{to}", to),
      });
    }
    if (typeof d.certificateRequired === "boolean") {
      const yes = locale === "en" ? "Yes" : "Ja";
      const no = locale === "en" ? "No" : "Nein";
      out.push({
        key: "cert",
        text: t.activitySickCertificate.replace(
          "{value}",
          d.certificateRequired ? yes : no,
        ),
      });
    }
    if (typeof d.confidentialNoteAttached === "boolean") {
      const yes = locale === "en" ? "Yes" : "Ja";
      const no = locale === "en" ? "No" : "Nein";
      out.push({
        key: "conf",
        text: t.activitySickConfidentialFlag.replace(
          "{value}",
          d.confidentialNoteAttached ? yes : no,
        ),
      });
    }
  }

  return out;
}

export function EmployeesActivityPanel({
  locale,
  employeeId,
}: {
  locale: Locale;
  employeeId: string;
}) {
  const t = getEmployeesCopy(locale);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<EmployeeActivityEvent[]>([]);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/web/employees/${encodeURIComponent(employeeId)}/activity?limit=80`,
        { credentials: "include" },
      );
      const text = await res.text();
      const json = parseResponseJson(text);
      const parsed = employeeActivityListResponseSchema.safeParse(json);
      if (!res.ok || !parsed.success) {
        setError(t.activityLoadError);
        setRows([]);
        return;
      }
      setRows(parsed.data.events);
    } catch {
      setError(t.activityLoadError);
      setRows([]);
    } finally {
      setBusy(false);
    }
  }, [employeeId, t.activityLoadError]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = useMemo(() => rows, [rows]);

  return (
    <Card className="border-border/80 bg-muted/15 shadow-none">
      <CardHeader>
        <CardTitle className="text-base">{t.sectionActivity}</CardTitle>
        <CardDescription className="text-xs">{t.activityIntro}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {busy ? (
          <div className="space-y-2" aria-hidden>
            <Skeleton className="h-4 w-full max-w-md" />
            <Skeleton className="h-4 w-full max-w-lg" />
            <Skeleton className="h-4 w-2/3 max-w-sm" />
          </div>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {!busy && !error && items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.activityEmpty}</p>
        ) : null}
        {!busy && items.length > 0 ? (
          <ul className="space-y-3">
            {items.map((ev) => {
              const lines = detailLines(ev, locale);
              return (
                <li
                  key={ev.id}
                  className="rounded-md border border-border/60 bg-background/60 px-3 py-2"
                >
                  <p className="text-sm font-medium">{actionHeading(ev, locale)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatWhen(ev.createdAt, locale)} · {formatActor(ev.actorSub)}
                  </p>
                  {lines.length > 0 ? (
                    <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                      {lines.map((line) => (
                        <li key={`${ev.id}-${line.key}`}>{line.text}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
