"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { de } from "react-day-picker/locale/de";
import { enUS } from "react-day-picker/locale/en-US";

import {
  projectHubResponseSchema,
  projectsListResponseSchema,
  schedulingAssignmentCreateResponseSchema,
  schedulingAddressesGeoResponseSchema,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/dialog";
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
import { useWebApp } from "@/components/web/shell/web-app-context";
import {
  WebPlaceLookupFields,
  type WebPlaceLookupFieldsCopy,
  type WebPlaceLookupValue,
} from "@/components/web/settings/web-place-lookup-fields";

const SchedulingMapPanel = dynamic(
  () => import("./scheduling-map-panel").then((m) => m.SchedulingMapPanel),
  { ssr: false },
);

const PROJECT_SELECT_NONE = "__none__" as const;

const SCHED_EMPTY_PLACE: WebPlaceLookupValue = {
  street: "",
  houseNumber: "",
  postalCode: "",
  city: "",
  country: "DE",
  latitude: null,
  longitude: null,
};

function trimToNull(s: string, max: number): string | null {
  const t = s.trim();
  return t ? t.slice(0, max) : null;
}

function buildSchedulingPlacePayload(v: WebPlaceLookupValue) {
  return {
    place: null as string | null,
    placeStreet: trimToNull(v.street, 500),
    placeHouseNumber: trimToNull(v.houseNumber, 80),
    placePostalCode: trimToNull(v.postalCode, 40),
    placeCity: trimToNull(v.city, 200),
    placeCountry: trimToNull(v.country, 200),
    placeLatitude: v.latitude,
    placeLongitude: v.longitude,
  };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function parseIsoDateLocal(value: string | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isInteger(y) || !Number.isInteger(mo) || !Number.isInteger(d)) {
    return null;
  }
  const dt = new Date(y, mo - 1, d);
  if (Number.isNaN(dt.getTime())) return null;
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) {
    return null;
  }
  return dt;
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function getMonthGridRange(month: Date, weekStartsOn: number): { from: Date; to: Date } {
  const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const lastOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const weekEndsOn = (weekStartsOn + 6) % 7;

  const from = new Date(firstOfMonth);
  while (from.getDay() !== weekStartsOn) {
    from.setDate(from.getDate() - 1);
  }
  const to = new Date(lastOfMonth);
  while (to.getDay() !== weekEndsOn) {
    to.setDate(to.getDate() + 1);
  }
  return { from, to };
}

function splitRangeMaxDaysInclusive(from: Date, to: Date, maxDays: number): Array<[Date, Date]> {
  const out: Array<[Date, Date]> = [];
  let cursor = new Date(from);
  while (cursor <= to) {
    const segmentTo = addDays(cursor, maxDays - 1);
    out.push([new Date(cursor), segmentTo < to ? segmentTo : new Date(to)]);
    cursor = addDays(segmentTo, 1);
  }
  return out;
}

type SchedulingAssignment = {
  id: string;
  date: string;
  atTime: string;
  title: string;
  place: string;
  employeeId: string;
  projectId: string | null;
  addressId: string | null;
  placeStreet: string | null;
  placeHouseNumber: string | null;
  placePostalCode: string | null;
  placeCity: string | null;
  placeCountry: string | null;
  placeLatitude: number | null;
  placeLongitude: number | null;
  reminderMinutesBefore: number | null;
};

type AssignmentEditFieldErrors = Partial<
  Record<
    | "date"
    | "startTime"
    | "employeeId"
    | "title"
    | "place"
    | "reminderMinutesBefore"
    | "projectId",
    string
  >
>;

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

function normalizeTimeForInput(value: string): string {
  return value.length >= 5 ? value.slice(0, 5) : value;
}

function readPatchFieldErrors(
  json: unknown,
  locale: Locale,
): AssignmentEditFieldErrors {
  if (
    typeof json !== "object" ||
    json === null ||
    !("issues" in json) ||
    !Array.isArray(json.issues)
  ) {
    return {};
  }
  const out: AssignmentEditFieldErrors = {};
  for (const rawIssue of json.issues) {
    if (typeof rawIssue !== "object" || rawIssue === null) {
      continue;
    }
    const issue = rawIssue as { path?: unknown };
    if (!Array.isArray(issue.path) || issue.path.length === 0) {
      continue;
    }
    const key = issue.path[0];
    if (typeof key !== "string") {
      continue;
    }
    if (key === "date") {
      out.date = locale === "en" ? "Enter a valid date." : "Bitte ein gueltiges Datum angeben.";
    } else if (key === "startTime") {
      out.startTime =
        locale === "en" ? "Enter a valid time." : "Bitte eine gueltige Uhrzeit angeben.";
    } else if (key === "employeeId") {
      out.employeeId =
        locale === "en" ? "Choose an employee." : "Bitte Mitarbeitende auswaehlen.";
    } else if (key === "title") {
      out.title = locale === "en" ? "Task is required." : "Einsatzbezeichnung ist erforderlich.";
    } else if (key === "place") {
      out.place =
        locale === "en"
          ? "Place is too long."
          : "Ort ist zu lang.";
    } else if (key === "reminderMinutesBefore") {
      out.reminderMinutesBefore =
        locale === "en"
          ? "Reminder value is invalid."
          : "Erinnerungswert ist ungueltig.";
    } else if (key === "projectId") {
      out.projectId =
        locale === "en"
          ? "Choose a valid project or clear the field."
          : "Bitte ein gueltiges Projekt waehlen oder leer lassen.";
    }
  }
  return out;
}

export function SchedulingContent({
  locale,
  initialProjectId,
  initialDate,
}: {
  locale: Locale;
  initialProjectId?: string;
  initialDate?: string;
}) {
  const { session } = useWebApp();
  const canEdit = session.permissions.workforce.canEdit;
  const initialSelected = React.useMemo(() => {
    return parseIsoDateLocal(initialDate) ?? new Date();
  }, [initialDate]);
  const initialMonth = React.useMemo(() => {
    return new Date(initialSelected.getFullYear(), initialSelected.getMonth(), 1);
  }, [initialSelected]);
  const [month, setMonth] = React.useState(initialMonth);
  const [selected, setSelected] = React.useState<Date | undefined>(() => initialSelected);
  const [employees, setEmployees] = React.useState<SchedulingDayEmployee[]>([]);
  const [dependencyWarnings, setDependencyWarnings] = React.useState<
    SchedulingDependencyWarning[]
  >([]);
  const [loadBusy, setLoadBusy] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [assignments, setAssignments] = React.useState<SchedulingAssignment[]>(
    [],
  );
  const [addressGeoBusy, setAddressGeoBusy] = React.useState(false);
  const [addressGeoById, setAddressGeoById] = React.useState<
    Record<
      string,
      { label: string; latitude: number | null; longitude: number | null } | undefined
    >
  >({});
  const addressGeoRequestIdRef = React.useRef(0);
  const [assignmentDates, setAssignmentDates] = React.useState<Set<string>>(
    () => new Set(),
  );
  const [assignmentBusy, setAssignmentBusy] = React.useState(false);
  const [assignmentError, setAssignmentError] = React.useState<string | null>(
    null,
  );
  const [draftTime, setDraftTime] = React.useState("08:00");
  const [draftTitle, setDraftTitle] = React.useState("");
  const [draftPlaceValue, setDraftPlaceValue] = React.useState<WebPlaceLookupValue>(
    () => ({ ...SCHED_EMPTY_PLACE }),
  );
  const [draftEmployeeId, setDraftEmployeeId] = React.useState<string>("");
  const [draftReminderMinutes, setDraftReminderMinutes] = React.useState<
    "none" | "15" | "30" | "60" | "120"
  >("none");
  const [editAssignmentId, setEditAssignmentId] = React.useState<string | null>(
    null,
  );
  const [editDate, setEditDate] = React.useState("");
  const [editTime, setEditTime] = React.useState("08:00");
  const [editTitle, setEditTitle] = React.useState("");
  const [editPlaceValue, setEditPlaceValue] = React.useState<WebPlaceLookupValue>(
    () => ({ ...SCHED_EMPTY_PLACE }),
  );
  const [editEmployeeId, setEditEmployeeId] = React.useState("");
  const [editReminderMinutes, setEditReminderMinutes] = React.useState<
    "none" | "15" | "30" | "60" | "120"
  >("none");
  const [editFieldErrors, setEditFieldErrors] =
    React.useState<AssignmentEditFieldErrors>({});

  const [projectOptions, setProjectOptions] = React.useState<
    { id: string; title: string; siteAddressId: string | null }[]
  >([]);
  const [draftProjectId, setDraftProjectId] = React.useState<string>(
    PROJECT_SELECT_NONE,
  );
  const [draftAddressId, setDraftAddressId] = React.useState<string | null>(null);
  const [editProjectId, setEditProjectId] = React.useState<string>(
    PROJECT_SELECT_NONE,
  );
  const [editAddressId, setEditAddressId] = React.useState<string | null>(null);
  const [activeProjectId, setActiveProjectId] = React.useState<string>(
    PROJECT_SELECT_NONE,
  );
  const projectPrefillDoneRef = React.useRef(false);
  const lastSyncedEditProjectIdRef = React.useRef<string | null>(null);

  const schedulingPlaceCopy: WebPlaceLookupFieldsCopy = React.useMemo(
    () =>
      locale === "en"
        ? {
            placeholder: "Search address…",
            locateTitle: "Use GPS location",
            notConfiguredHint:
              "Address lookup is not configured. You can fill in the fields manually.",
            autoFilledHint:
              "Filled automatically — please verify and adjust if needed.",
            locateUnsupported: "Your browser does not support geolocation.",
            locateDenied:
              "Location access was denied. Please allow location access in your browser settings.",
            locateUnavailable:
              "Location unavailable. Location services might be disabled.",
            locateTimeout: "Location lookup timed out. Please try again.",
            locateFailed: "Could not determine location.",
            streetLabel: "Street",
            houseNumberLabel: "House no.",
            postalCodeLabel: "Postal code",
            cityLabel: "City",
            countryLabel: "Country",
            coordinatesLabel: "Coordinates",
          }
        : {
            placeholder: "Adresse suchen…",
            locateTitle: "GPS-Standort ermitteln",
            notConfiguredHint:
              "Adresssuche ist nicht konfiguriert. Felder koennen manuell befuellt werden.",
            autoFilledHint:
              "Automatisch ermittelt – bitte pruefen und ggf. korrigieren.",
            locateUnsupported: "Ihr Browser unterstuetzt keine GPS-Ortung.",
            locateDenied:
              "GPS-Zugriff wurde verweigert. Bitte aktivieren Sie die Standortfreigabe in Ihren Browser-Einstellungen.",
            locateUnavailable:
              "Position nicht verfuegbar. Standortdienste sind moeglicherweise deaktiviert.",
            locateTimeout:
              "Zeitueberschreitung bei der Standortermittlung. Bitte versuchen Sie es erneut.",
            locateFailed: "Standort konnte nicht ermittelt werden.",
            streetLabel: "Strasse",
            houseNumberLabel: "Hausnummer",
            postalCodeLabel: "PLZ",
            cityLabel: "Stadt",
            countryLabel: "Land",
            coordinatesLabel: "Koordinaten",
          },
    [locale],
  );

  const rdpLocale = locale === "en" ? enUS : de;
  const selectedDate = selected ? toIsoDateLocal(selected) : null;

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/web/projects?limit=200", {
          credentials: "include",
        });
        const text = await res.text();
        const json = parseResponseJson(text);
        const parsed = projectsListResponseSchema.safeParse(json);
        if (!res.ok || !parsed.success || cancelled) {
          return;
        }
        setProjectOptions(
          parsed.data.projects.map((p) => ({
            id: p.id,
            title: p.title,
            siteAddressId: p.siteAddressId,
          })),
        );
      } catch {
        // Projects list is optional; scheduling still works without it.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (projectPrefillDoneRef.current) {
      return;
    }
    if (!initialProjectId || !isUuid(initialProjectId)) {
      return;
    }
    if (
      projectOptions.length > 0 &&
      projectOptions.some((p) => p.id === initialProjectId)
    ) {
      setDraftProjectId(initialProjectId);
      setActiveProjectId(initialProjectId);
      projectPrefillDoneRef.current = true;
    }
  }, [initialProjectId, projectOptions]);

  const projectTitleById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const p of projectOptions) {
      m.set(p.id, p.title);
    }
    return m;
  }, [projectOptions]);

  const projectSiteAddressLabelCacheRef = React.useRef(
    new Map<string, string | null>(),
  );

  const loadProjectSiteAddressLabel = React.useCallback(
    async (projectId: string): Promise<string | null> => {
      const cached = projectSiteAddressLabelCacheRef.current.get(projectId);
      if (cached !== undefined) {
        return cached;
      }
      try {
        const res = await fetch(
          `/api/web/projects/${encodeURIComponent(projectId)}/hub`,
          { credentials: "include" },
        );
        const text = await res.text();
        const json = parseResponseJson(text);
        const parsed = projectHubResponseSchema.safeParse(json);
        if (!res.ok || !parsed.success) {
          projectSiteAddressLabelCacheRef.current.set(projectId, null);
          return null;
        }
        const label = parsed.data.siteAddressLabel ?? null;
        projectSiteAddressLabelCacheRef.current.set(projectId, label);
        return label;
      } catch {
        projectSiteAddressLabelCacheRef.current.set(projectId, null);
        return null;
      }
    },
    [],
  );

  React.useEffect(() => {
    if (draftProjectId === PROJECT_SELECT_NONE) {
      setDraftAddressId(null);
      return;
    }
    const project = projectOptions.find((p) => p.id === draftProjectId) ?? null;
    const siteAddressId = project?.siteAddressId ?? null;
    setDraftAddressId(siteAddressId);
    if (!siteAddressId) return;

    let cancelled = false;
    void (async () => {
      const label = await loadProjectSiteAddressLabel(draftProjectId);
      if (cancelled || !label) return;
      const oneLine = label.replace(/\s*\n\s*/g, ", ").trim();
      const trimmed = oneLine.length > 200 ? `${oneLine.slice(0, 197)}…` : oneLine;
      setDraftPlaceValue((prev) => {
        const hasUserContent =
          prev.street.trim() !== "" ||
          prev.postalCode.trim() !== "" ||
          prev.city.trim() !== "" ||
          prev.latitude != null;
        if (hasUserContent) return prev;
        return { ...prev, street: trimmed };
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [draftProjectId, loadProjectSiteAddressLabel, projectOptions]);

  React.useEffect(() => {
    if (!editAssignmentId) return;
    if (editProjectId === PROJECT_SELECT_NONE) {
      if (lastSyncedEditProjectIdRef.current !== PROJECT_SELECT_NONE) {
        lastSyncedEditProjectIdRef.current = PROJECT_SELECT_NONE;
        setEditAddressId(null);
      }
      return;
    }
    if (editProjectId === lastSyncedEditProjectIdRef.current) {
      return;
    }
    lastSyncedEditProjectIdRef.current = editProjectId;
    const project = projectOptions.find((p) => p.id === editProjectId) ?? null;
    if (!project) return;
    const siteAddressId = project?.siteAddressId ?? null;
    setEditAddressId(siteAddressId);
    if (!siteAddressId) return;

    let cancelled = false;
    void (async () => {
      const label = await loadProjectSiteAddressLabel(editProjectId);
      if (cancelled || !label) return;
      const oneLine = label.replace(/\s*\n\s*/g, ", ").trim();
      const trimmed = oneLine.length > 200 ? `${oneLine.slice(0, 197)}…` : oneLine;
      setEditPlaceValue((prev) => {
        const hasUserContent =
          prev.street.trim() !== "" ||
          prev.postalCode.trim() !== "" ||
          prev.city.trim() !== "" ||
          prev.latitude != null;
        if (hasUserContent) return prev;
        return { ...prev, street: trimmed };
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [editAssignmentId, editProjectId, loadProjectSiteAddressLabel, projectOptions]);

  const editProjectSelectItems = React.useMemo(() => {
    const items = projectOptions.map((p) => ({ ...p }));
    if (
      editProjectId !== PROJECT_SELECT_NONE &&
      !items.some((p) => p.id === editProjectId)
    ) {
      items.push({
        id: editProjectId,
        title:
          locale === "en"
            ? "Linked project (not in current list)"
            : "Verknuepftes Projekt (nicht in Liste)",
        siteAddressId: null,
      });
    }
    return items;
  }, [projectOptions, editProjectId, locale]);

  const activeProjectSelectItems = React.useMemo(() => {
    const items = projectOptions.map((p) => ({ ...p }));
    if (
      activeProjectId !== PROJECT_SELECT_NONE &&
      !items.some((p) => p.id === activeProjectId)
    ) {
      items.push({
        id: activeProjectId,
        title:
          locale === "en"
            ? "Filter project (not in current list)"
            : "Filter-Projekt (nicht in Liste)",
        siteAddressId: null,
      });
    }
    return items;
  }, [projectOptions, activeProjectId, locale]);

  const availableEmployees = React.useMemo(
    () => employees.filter((e) => e.isAvailable),
    [employees],
  );

  const selectedDayAssignments = React.useMemo(
    () => [...assignments].sort((a, b) => a.atTime.localeCompare(b.atTime)),
    [assignments],
  );
  const allAssignableEmployees = employees;
  const projectFilterId =
    activeProjectId === PROJECT_SELECT_NONE ? null : activeProjectId;

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
    const weekStartsOn = locale === "en" ? 0 : 1;
    const { from, to } = getMonthGridRange(month, weekStartsOn);
    const segments = splitRangeMaxDaysInclusive(from, to, 31);
    const nextDates = new Set<string>();
    try {
      for (const [segFrom, segTo] of segments) {
        const qs = new URLSearchParams({
          dateFrom: toIsoDateLocal(segFrom),
          dateTo: toIsoDateLocal(segTo),
        });
        if (projectFilterId) {
          qs.set("projectId", projectFilterId);
        }
        const res = await fetch(`/api/web/scheduling/assignments?${qs.toString()}`, {
          credentials: "include",
        });
        const text = await res.text();
        const json = parseResponseJson(text);
        const parsed = schedulingAssignmentsListResponseSchema.safeParse(json);
        if (!res.ok || !parsed.success) {
          continue;
        }
        for (const a of parsed.data.assignments) {
          nextDates.add(a.date);
        }
      }
      setAssignmentDates(nextDates);
    } catch {
      // silently ignore calendar marker loading errors
    }
  }, [locale, month, projectFilterId]);

  const loadAddressGeo = React.useCallback(async (addressIds: string[]) => {
    const ids = [...new Set(addressIds.filter(isUuid))].slice(0, 200);
    const requestId = (addressGeoRequestIdRef.current += 1);
    if (ids.length === 0) {
      setAddressGeoById({});
      setAddressGeoBusy(false);
      return;
    }
    setAddressGeoBusy(true);
    try {
      const qs = new URLSearchParams({ ids: ids.join(",") });
      const res = await fetch(`/api/web/scheduling/addresses?${qs.toString()}`, {
        credentials: "include",
      });
      const text = await res.text();
      const json = parseResponseJson(text);
      const parsed = schedulingAddressesGeoResponseSchema.safeParse(json);
      if (requestId !== addressGeoRequestIdRef.current) {
        return;
      }
      if (!res.ok || !parsed.success) {
        setAddressGeoById({});
        return;
      }
      const next: Record<
        string,
        { label: string; latitude: number | null; longitude: number | null }
      > = {};
      for (const a of parsed.data.addresses) {
        next[a.id] = {
          label: a.label,
          latitude: a.latitude,
          longitude: a.longitude,
        };
      }
      setAddressGeoById(next);
    } catch {
      if (requestId !== addressGeoRequestIdRef.current) {
        return;
      }
      setAddressGeoById({});
    } finally {
      if (requestId === addressGeoRequestIdRef.current) {
        setAddressGeoBusy(false);
      }
    }
  }, []);

  const loadDayAssignments = React.useCallback(
    async (date: string) => {
      setAssignmentBusy(true);
      setAssignmentError(null);
      try {
        const qs = new URLSearchParams({ date });
        if (projectFilterId) {
          qs.set("projectId", projectFilterId);
        }
        const res = await fetch(`/api/web/scheduling/assignments?${qs.toString()}`, {
          credentials: "include",
        });
        const text = await res.text();
        const json = parseResponseJson(text);
        const parsed = schedulingAssignmentsListResponseSchema.safeParse(json);
        if (!res.ok || !parsed.success) {
          setAssignments([]);
          void loadAddressGeo([]);
          setAssignmentError(
            locale === "en"
              ? "Could not load assignments."
              : "Einsätze konnten nicht geladen werden.",
          );
          return;
        }
        const mapped = parsed.data.assignments.map((a) => ({
            id: a.id,
            date: a.date,
            atTime: a.startTime,
            title: a.title,
            place: a.place ?? "",
            employeeId: a.employeeId,
            projectId: a.projectId,
            addressId: a.addressId,
            placeStreet: a.placeStreet ?? null,
            placeHouseNumber: a.placeHouseNumber ?? null,
            placePostalCode: a.placePostalCode ?? null,
            placeCity: a.placeCity ?? null,
            placeCountry: a.placeCountry ?? null,
            placeLatitude: a.placeLatitude ?? null,
            placeLongitude: a.placeLongitude ?? null,
            reminderMinutesBefore: a.reminderMinutesBefore,
          }));
        setAssignments(mapped);
        void loadAddressGeo(
          parsed.data.assignments
            .map((a) => a.addressId)
            .filter((id): id is string => typeof id === "string"),
        );
      } catch {
        setAssignments([]);
        void loadAddressGeo([]);
        setAssignmentError(
          locale === "en"
            ? "Could not load assignments."
            : "Einsätze konnten nicht geladen werden.",
        );
      } finally {
        setAssignmentBusy(false);
      }
    },
    [locale, loadAddressGeo, projectFilterId],
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

  const reloadAfterReorder = React.useCallback(async () => {
    if (!selectedDate) return;
    await Promise.all([loadDayAssignments(selectedDate), loadAssignmentDates()]);
  }, [loadAssignmentDates, loadDayAssignments, selectedDate]);

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
  const projectLabel =
    locale === "en" ? "Project (optional)" : "Projekt (optional)";
  const projectNoneLabel = locale === "en" ? "No project" : "Kein Projekt";
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
    if (!canEdit) {
      setAssignmentError(
        locale === "en"
          ? "You do not have permission for this action."
          : "Keine Berechtigung fuer diese Aktion.",
      );
      return;
    }
    if (assignmentBusy || !selectedDate || !draftEmployeeId || !draftTitle.trim()) {
      return;
    }
    setAssignmentBusy(true);
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
          ...buildSchedulingPlacePayload(draftPlaceValue),
          reminderMinutesBefore:
            draftReminderMinutes === "none"
              ? null
              : Number(draftReminderMinutes),
          projectId:
            draftProjectId === PROJECT_SELECT_NONE ? null : draftProjectId,
          addressId: draftAddressId,
        }),
      });
      const text = await res.text();
      const json = parseResponseJson(text);
      const parsed = schedulingAssignmentCreateResponseSchema.safeParse(json);
      if (!res.ok || !parsed.success) {
        const apiError =
          typeof json === "object" && json !== null && "error" in json
            ? (json as { error?: string }).error
            : undefined;
        if (res.status === 404 && apiError === "project_not_found") {
          setAssignmentError(
            locale === "en"
              ? "Project not found or not accessible."
              : "Projekt nicht gefunden oder kein Zugriff.",
          );
          return;
        }
        if (res.status === 404 && apiError === "address_not_found") {
          setAssignmentError(
            locale === "en"
              ? "Site address not found or not accessible."
              : "Baustellenadresse nicht gefunden oder kein Zugriff.",
          );
          return;
        }
        if (res.status === 403 && apiError === "forbidden") {
          setAssignmentError(
            locale === "en"
              ? "You do not have permission for this action."
              : "Keine Berechtigung fuer diese Aktion.",
          );
          return;
        }
        if (res.status === 404 && apiError === "employee_not_found") {
          setAssignmentError(
            locale === "en"
              ? "Employee not found or archived."
              : "Mitarbeitende nicht gefunden oder archiviert.",
          );
          return;
        }
        if (res.status === 409 && apiError === "employee_slot_conflict") {
          setAssignmentError(
            locale === "en"
              ? "Conflict: employee already has an assignment in this slot."
              : "Konflikt: Mitarbeitende sind in diesem Zeitslot bereits eingeplant.",
          );
          return;
        }
        if (res.status === 409 && apiError === "mutually_exclusive_conflict") {
          setAssignmentError(
            locale === "en"
              ? "Conflict: mutually exclusive team members are already assigned at this time."
              : "Konflikt: Gegenseitig ausgeschlossene Teammitglieder sind zu dieser Zeit bereits eingeplant.",
          );
          return;
        }
        if (res.status === 400 && apiError === "validation_error") {
          setAssignmentError(
            locale === "en"
              ? "Please check the required fields."
              : "Bitte die Pflichtfelder prüfen.",
          );
          return;
        }
        setAssignmentError(
          locale === "en"
            ? "Could not create assignment."
            : "Einsatz konnte nicht erstellt werden.",
        );
        return;
      }
      setDraftTitle("");
      setDraftReminderMinutes("none");
      if (draftProjectId === PROJECT_SELECT_NONE) {
        setDraftPlaceValue({ ...SCHED_EMPTY_PLACE });
        setDraftAddressId(null);
      }
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
    } finally {
      setAssignmentBusy(false);
    }
  }

  function startEditAssignment(assignment: SchedulingAssignment) {
    lastSyncedEditProjectIdRef.current =
      assignment.projectId ?? PROJECT_SELECT_NONE;
    setEditAssignmentId(assignment.id);
    setEditDate(assignment.date);
    setEditTime(normalizeTimeForInput(assignment.atTime));
    setEditTitle(assignment.title);
    const hasStructuredPlace =
      (assignment.placeStreet ?? "").trim() !== "" ||
      (assignment.placeHouseNumber ?? "").trim() !== "" ||
      (assignment.placePostalCode ?? "").trim() !== "" ||
      (assignment.placeCity ?? "").trim() !== "" ||
      assignment.placeLatitude != null ||
      assignment.placeLongitude != null;
    const legacyPlaceLine =
      !hasStructuredPlace && assignment.place.trim() !== ""
        ? assignment.place.trim()
        : "";
    setEditPlaceValue({
      street: (assignment.placeStreet ?? "").trim() || legacyPlaceLine,
      houseNumber: assignment.placeHouseNumber ?? "",
      postalCode: assignment.placePostalCode ?? "",
      city: assignment.placeCity ?? "",
      country: (assignment.placeCountry ?? "DE").toUpperCase().slice(0, 2),
      latitude: assignment.placeLatitude,
      longitude: assignment.placeLongitude,
    });
    setEditEmployeeId(assignment.employeeId);
    setEditProjectId(assignment.projectId ?? PROJECT_SELECT_NONE);
    setEditAddressId(assignment.addressId);
    const reminder = assignment.reminderMinutesBefore;
    setEditReminderMinutes(
      reminder === 15
        ? "15"
        : reminder === 30
          ? "30"
          : reminder === 60
            ? "60"
            : reminder === 120
              ? "120"
              : "none",
    );
    setEditFieldErrors({});
    setAssignmentError(null);
  }

  function onEditOpenChange(open: boolean) {
    if (open || assignmentBusy) {
      return;
    }
    setEditAssignmentId(null);
    setEditAddressId(null);
    setEditPlaceValue({ ...SCHED_EMPTY_PLACE });
    lastSyncedEditProjectIdRef.current = null;
    setEditFieldErrors({});
  }

  async function saveAssignmentEdit() {
    if (!canEdit) {
      setAssignmentError(
        locale === "en"
          ? "You do not have permission for this action."
          : "Keine Berechtigung fuer diese Aktion.",
      );
      return;
    }
    if (!editAssignmentId) {
      return;
    }
    const nextErrors: AssignmentEditFieldErrors = {};
    if (!editDate) {
      nextErrors.date =
        locale === "en" ? "Enter a valid date." : "Bitte ein gueltiges Datum angeben.";
    }
    if (!editTime) {
      nextErrors.startTime =
        locale === "en" ? "Enter a valid time." : "Bitte eine gueltige Uhrzeit angeben.";
    }
    if (!editEmployeeId) {
      nextErrors.employeeId =
        locale === "en" ? "Choose an employee." : "Bitte Mitarbeitende auswaehlen.";
    }
    if (!editTitle.trim()) {
      nextErrors.title =
        locale === "en" ? "Task is required." : "Einsatzbezeichnung ist erforderlich.";
    }
    if (Object.keys(nextErrors).length > 0) {
      setEditFieldErrors(nextErrors);
      return;
    }

    setAssignmentBusy(true);
    setAssignmentError(null);
    setEditFieldErrors({});
    try {
      const res = await fetch(
        `/api/web/scheduling/assignments/${encodeURIComponent(editAssignmentId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeId: editEmployeeId,
            date: editDate,
            startTime: editTime,
            title: editTitle.trim(),
            ...buildSchedulingPlacePayload(editPlaceValue),
            reminderMinutesBefore:
              editReminderMinutes === "none" ? null : Number(editReminderMinutes),
            projectId:
              editProjectId === PROJECT_SELECT_NONE ? null : editProjectId,
            addressId: editAddressId,
          }),
        },
      );
      const text = await res.text();
      const json = parseResponseJson(text);
      const parsed = schedulingAssignmentCreateResponseSchema.safeParse(json);
      if (!res.ok || !parsed.success) {
        const apiError =
          typeof json === "object" && json !== null && "error" in json
            ? (json as { error?: string }).error
            : undefined;
        if (apiError === "validation_error") {
          const fieldErrors = readPatchFieldErrors(json, locale);
          if (Object.keys(fieldErrors).length > 0) {
            setEditFieldErrors(fieldErrors);
          }
          setAssignmentError(
            locale === "en"
              ? "Please fix the highlighted fields."
              : "Bitte die markierten Felder korrigieren.",
          );
          return;
        }
        if (res.status === 403 && apiError === "forbidden") {
          setAssignmentError(
            locale === "en"
              ? "You do not have permission for this action."
              : "Keine Berechtigung fuer diese Aktion.",
          );
          return;
        }
        if (res.status === 404 && apiError === "project_not_found") {
          setAssignmentError(
            locale === "en"
              ? "Project not found or not accessible."
              : "Projekt nicht gefunden oder kein Zugriff.",
          );
          return;
        }
        if (res.status === 404 && apiError === "address_not_found") {
          setAssignmentError(
            locale === "en"
              ? "Site address not found or not accessible."
              : "Baustellenadresse nicht gefunden oder kein Zugriff.",
          );
          return;
        }
        if (res.status === 409 && apiError === "mutually_exclusive_conflict") {
          setAssignmentError(
            locale === "en"
              ? "Conflict: mutually exclusive team members are already assigned at this time."
              : "Konflikt: Gegenseitig ausgeschlossene Teammitglieder sind zu dieser Zeit bereits eingeplant.",
          );
          return;
        }
        if (res.status === 409 && apiError === "employee_slot_conflict") {
          setAssignmentError(
            locale === "en"
              ? "Conflict: employee already has an assignment in this slot."
              : "Konflikt: Mitarbeitende sind in diesem Zeitslot bereits eingeplant.",
          );
          return;
        }
        setAssignmentError(
          locale === "en"
            ? "Could not update assignment."
            : "Einsatz konnte nicht aktualisiert werden.",
        );
        return;
      }
      if (parsed.data.dependencyWarnings.length > 0) {
        setDependencyWarnings(parsed.data.dependencyWarnings);
      }
      setEditAssignmentId(null);
      await Promise.all([loadDayAssignments(selectedDate ?? editDate), loadAssignmentDates()]);
    } catch {
      setAssignmentError(
        locale === "en"
          ? "Could not update assignment."
          : "Einsatz konnte nicht aktualisiert werden.",
      );
    } finally {
      setAssignmentBusy(false);
    }
  }

  async function removeAssignment(id: string) {
    if (!canEdit) {
      setAssignmentError(
        locale === "en"
          ? "You do not have permission for this action."
          : "Keine Berechtigung fuer diese Aktion.",
      );
      return;
    }
    if (assignmentBusy || !selectedDate) {
      return;
    }
    setAssignmentBusy(true);
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
        if (res.status === 403) {
          setAssignmentError(
            locale === "en"
              ? "You do not have permission for this action."
              : "Keine Berechtigung fuer diese Aktion.",
          );
          return;
        }
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
    } finally {
      setAssignmentBusy(false);
    }
  }

  return (
    <div className="grid w-full min-w-0 gap-4 lg:grid-cols-[minmax(0,320px)_1fr] lg:items-start">
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
            className="w-full"
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
                    <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/10 p-3 sm:flex-row sm:items-start sm:justify-between">
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
              <div className="flex flex-wrap items-center gap-2">
                <Select value={activeProjectId} onValueChange={setActiveProjectId}>
                  <SelectTrigger className="h-8 w-[220px]">
                    <SelectValue
                      placeholder={
                        locale === "en" ? "All projects" : "Alle Projekte"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PROJECT_SELECT_NONE}>
                      {locale === "en" ? "All projects" : "Alle Projekte"}
                    </SelectItem>
                    {activeProjectSelectItems.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedDate && canEdit ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={`/api/web/scheduling/assignments-ics?${new URLSearchParams(
                        {
                          ...(selectedDate ? { date: selectedDate } : {}),
                          ...(projectFilterId ? { projectId: projectFilterId } : {}),
                        },
                      ).toString()}`}
                    >
                      {locale === "en"
                        ? "Export calendar (.ics)"
                        : "Kalender exportieren (.ics)"}
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
            {!canEdit ? (
              <p className="text-xs text-muted-foreground">
                {locale === "en"
                  ? "Read-only mode: creating, editing, and removing assignments is disabled."
                  : "Nur Lesemodus: Einsaetze koennen nicht angelegt, bearbeitet oder entfernt werden."}
              </p>
            ) : null}
            {assignmentError ? (
              <p className="text-sm text-destructive">{assignmentError}</p>
            ) : null}
            <div className="grid gap-3 rounded-lg border border-border/60 bg-muted/10 p-3 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="sched-time">
                  {locale === "en" ? "Time" : "Uhrzeit"}
                </Label>
                <Input
                  id="sched-time"
                  type="time"
                  value={draftTime}
                  onChange={(ev) => setDraftTime(ev.target.value)}
                  disabled={assignmentBusy || !canEdit}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sched-employee">
                  {locale === "en" ? "Employee" : "Mitarbeitende:r"}
                </Label>
                <Select
                  value={draftEmployeeId}
                  onValueChange={setDraftEmployeeId}
                  disabled={assignmentBusy || !canEdit}
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
                  disabled={assignmentBusy || !canEdit}
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
                  onKeyDown={(ev) => {
                    if (ev.key !== "Enter") return;
                    ev.preventDefault();
                    void addAssignment();
                  }}
                  disabled={assignmentBusy || !canEdit}
                />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label id="sched-place-label">
                  {locale === "en" ? "Place" : "Ort"}
                </Label>
                <WebPlaceLookupFields
                  idPrefix="sched-draft-place"
                  copy={schedulingPlaceCopy}
                  value={draftPlaceValue}
                  onChange={(next) => {
                    setDraftPlaceValue(next);
                    if (next.latitude != null && next.longitude != null) {
                      setDraftAddressId(null);
                    }
                  }}
                  className={assignmentBusy || !canEdit ? "pointer-events-none opacity-60" : undefined}
                />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="sched-project">{projectLabel}</Label>
                <Select
                  value={draftProjectId}
                  onValueChange={setDraftProjectId}
                  disabled={assignmentBusy || !canEdit}
                >
                  <SelectTrigger id="sched-project">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PROJECT_SELECT_NONE}>
                      {projectNoneLabel}
                    </SelectItem>
                    {projectOptions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    !draftTitle.trim() ||
                    !canEdit
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

            {selectedDate && selectedDayAssignments.length > 0 ? (
              <SchedulingMapPanel
                locale={locale}
                date={selectedDate}
                employees={employees.map((e) => ({
                  employeeId: e.employeeId,
                  displayName: e.displayName,
                }))}
                assignments={selectedDayAssignments.map((a) => ({
                  id: a.id,
                  atTime: a.atTime,
                  title: a.title,
                  place: a.place,
                  employeeId: a.employeeId,
                  addressId: a.addressId,
                  placeLatitude: a.placeLatitude,
                  placeLongitude: a.placeLongitude,
                }))}
                addressGeoById={addressGeoById}
                busy={addressGeoBusy}
                canEdit={canEdit}
                onReordered={reloadAfterReorder}
              />
            ) : null}

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
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/10 px-3 py-2"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-sm font-medium">
                          {a.atTime} · {a.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {employee?.displayName ?? "—"}
                          {a.projectId
                            ? ` · ${projectTitleById.get(a.projectId) ?? a.projectId}`
                            : ""}
                          {a.place ? ` · ${a.place}` : ""}
                          {a.reminderMinutesBefore != null
                            ? locale === "en"
                              ? ` · Reminder ${a.reminderMinutesBefore}m`
                              : ` · Erinnerung ${a.reminderMinutesBefore} Min`
                            : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditAssignment(a)}
                          disabled={assignmentBusy || !canEdit}
                        >
                          {locale === "en" ? "Edit" : "Bearbeiten"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            void removeAssignment(a.id);
                          }}
                          disabled={assignmentBusy || !canEdit}
                        >
                          {locale === "en" ? "Remove" : "Entfernen"}
                        </Button>
                      </div>
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
      <Dialog open={editAssignmentId !== null} onOpenChange={onEditOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {locale === "en" ? "Edit assignment" : "Einsatz bearbeiten"}
            </DialogTitle>
            <DialogDescription>
              {locale === "en"
                ? "Update time, employee, and reminder without deleting the assignment."
                : "Zeit, Mitarbeitende und Erinnerung ohne Loeschen des Einsatzes anpassen."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="sched-edit-date">
                  {locale === "en" ? "Date" : "Datum"}
                </Label>
                <Input
                  id="sched-edit-date"
                  type="date"
                  value={editDate}
                  onChange={(ev) => setEditDate(ev.target.value)}
                  disabled={assignmentBusy}
                />
                {editFieldErrors.date ? (
                  <p className="text-xs text-destructive">{editFieldErrors.date}</p>
                ) : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sched-edit-time">
                  {locale === "en" ? "Time" : "Uhrzeit"}
                </Label>
                <Input
                  id="sched-edit-time"
                  type="time"
                  value={editTime}
                  onChange={(ev) => setEditTime(ev.target.value)}
                  disabled={assignmentBusy}
                />
                {editFieldErrors.startTime ? (
                  <p className="text-xs text-destructive">{editFieldErrors.startTime}</p>
                ) : null}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sched-edit-employee">
                {locale === "en" ? "Employee" : "Mitarbeitende:r"}
              </Label>
              <Select
                value={editEmployeeId}
                onValueChange={setEditEmployeeId}
                disabled={assignmentBusy}
              >
                <SelectTrigger id="sched-edit-employee">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allAssignableEmployees.map((e) => (
                    <SelectItem key={e.employeeId} value={e.employeeId}>
                      {e.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editFieldErrors.employeeId ? (
                <p className="text-xs text-destructive">{editFieldErrors.employeeId}</p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sched-edit-reminder">
                {locale === "en" ? "Reminder" : "Erinnerung"}
              </Label>
              <Select
                value={editReminderMinutes}
                onValueChange={(v) =>
                  setEditReminderMinutes(v as "none" | "15" | "30" | "60" | "120")
                }
                disabled={assignmentBusy}
              >
                <SelectTrigger id="sched-edit-reminder">
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
              {editFieldErrors.reminderMinutesBefore ? (
                <p className="text-xs text-destructive">
                  {editFieldErrors.reminderMinutesBefore}
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sched-edit-title">
                {locale === "en" ? "Task" : "Einsatz"}
              </Label>
              <Input
                id="sched-edit-title"
                value={editTitle}
                onChange={(ev) => setEditTitle(ev.target.value)}
                disabled={assignmentBusy}
              />
              {editFieldErrors.title ? (
                <p className="text-xs text-destructive">{editFieldErrors.title}</p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sched-edit-place-street">
                {locale === "en" ? "Place" : "Ort"}
              </Label>
              <WebPlaceLookupFields
                idPrefix="sched-edit-place"
                copy={schedulingPlaceCopy}
                value={editPlaceValue}
                onChange={(next) => {
                  setEditPlaceValue(next);
                  if (next.latitude != null && next.longitude != null) {
                    setEditAddressId(null);
                  }
                }}
                className={assignmentBusy ? "pointer-events-none opacity-60" : undefined}
              />
              {editFieldErrors.place ? (
                <p className="text-xs text-destructive">{editFieldErrors.place}</p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sched-edit-project">{projectLabel}</Label>
              <Select
                value={editProjectId}
                onValueChange={setEditProjectId}
                disabled={assignmentBusy}
              >
                <SelectTrigger id="sched-edit-project">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PROJECT_SELECT_NONE}>
                    {projectNoneLabel}
                  </SelectItem>
                  {editProjectSelectItems.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editFieldErrors.projectId ? (
                <p className="text-xs text-destructive">{editFieldErrors.projectId}</p>
              ) : null}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onEditOpenChange(false)}
              disabled={assignmentBusy}
            >
              {locale === "en" ? "Cancel" : "Abbrechen"}
            </Button>
            <Button
              onClick={() => {
                void saveAssignmentEdit();
              }}
              disabled={assignmentBusy}
            >
              {assignmentBusy
                ? locale === "en"
                  ? "Saving…"
                  : "Speichert…"
                : locale === "en"
                  ? "Save changes"
                  : "Aenderungen speichern"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
