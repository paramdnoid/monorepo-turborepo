"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { EmployeeAvailabilityRuleInput, EmployeeGeocodeSource } from "@repo/api-contracts";
import { employeeDetailResponseSchema } from "@repo/api-contracts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/alert-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@repo/ui/accordion";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/card";
import { Checkbox } from "@repo/ui/checkbox";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Separator } from "@repo/ui/separator";
import { Skeleton } from "@repo/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/tabs";
import { Textarea } from "@repo/ui/textarea";

import { CustomerAddressGeocodeControls } from "@/components/web/customers/customer-address-geocode-controls";
import { EmployeesAbsencesCard } from "@/components/web/workforce/employees-absences-card";
import { EmployeesActivityPanel } from "@/components/web/workforce/employees-activity-panel";
import { EmployeesFilesCard } from "@/components/web/workforce/employees-files-card";
import { EmployeesRelationshipsCard } from "@/components/web/workforce/employees-relationships-card";
import { EmployeesSkillsCard } from "@/components/web/workforce/employees-skills-card";
import {
  EMPLOYEE_NOTES_MAX_LENGTH,
  formatEmployeesNotesCharCount,
  getEmployeesCopy,
  readEmployeeValidationIssues,
  summarizeEmployeeValidationIssues,
  weekdayOptions,
} from "@/content/employees-module";
import { normalizeAddressFields } from "@/lib/address-normalization";
import type { Locale } from "@/lib/i18n/locale";
import { parseResponseJson } from "@/lib/parse-response-json";
import { toast } from "sonner";

type AvailabilityRow = {
  clientId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  crossesMidnight: boolean;
  validFrom: string;
  validTo: string;
};

type AvailabilityOverrideRow = {
  clientId: string;
  date: string;
  isUnavailable: boolean;
  startTime: string;
  endTime: string;
  crossesMidnight: boolean;
  note: string;
};

type EmployeeDetailTab = "main" | "availability" | "vacation" | "sick" | "activity";

function parseDetailTab(v: string | null): EmployeeDetailTab {
  if (
    v === "availability" ||
    v === "vacation" ||
    v === "sick" ||
    v === "activity"
  ) {
    return v;
  }
  return "main";
}

function normalizeCountryInput(raw: string): string | null {
  const u = raw.trim().toUpperCase();
  if (u.length === 2 && /^[A-Z]{2}$/.test(u)) {
    return u;
  }
  return null;
}

function normalizeTimeForCompare(t: string): string {
  return t.length >= 8 ? t.slice(0, 5) : t;
}

function timeToMinutes(t: string): number {
  const n = normalizeTimeForCompare(t);
  const parts = n.split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) {
    return NaN;
  }
  return h * 60 + m;
}

function validateAvailabilitySlots(slots: AvailabilityRow[]): {
  timeOrder: boolean;
  overlap: boolean;
} {
  for (const r of slots) {
    const a = timeToMinutes(r.startTime);
    const b = timeToMinutes(r.endTime);
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      return { timeOrder: true, overlap: false };
    }
    if (!r.crossesMidnight && b <= a) {
      return { timeOrder: true, overlap: false };
    }
    if (r.crossesMidnight && b >= a) {
      return { timeOrder: true, overlap: false };
    }
    if (r.validFrom && r.validTo && r.validTo < r.validFrom) {
      return { timeOrder: true, overlap: false };
    }
  }
  const byDay = new Map<string, AvailabilityRow[]>();
  for (const r of slots) {
    const validityKey = `${r.validFrom || "∞"}|${r.validTo || "∞"}`;
    const key = `${r.weekday}|${validityKey}`;
    const list = byDay.get(key) ?? [];
    list.push(r);
    byDay.set(key, list);
  }
  for (const [, daySlots] of byDay) {
    const intervals = daySlots.map((r) => {
      const start = timeToMinutes(r.startTime);
      const endRaw = timeToMinutes(r.endTime);
      const end = r.crossesMidnight ? endRaw + 24 * 60 : endRaw;
      return { start, end };
    });
    const sorted = intervals.sort((x, y) => x.start - y.start);
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]!;
      const cur = sorted[i]!;
      if (cur.start < prev.end) {
        return { timeOrder: false, overlap: true };
      }
    }
  }
  return { timeOrder: false, overlap: false };
}

function validateAvailabilityOverrides(overrides: AvailabilityOverrideRow[]): {
  timeOrder: boolean;
  overlap: boolean;
} {
  for (const r of overrides) {
    if (!r.date) {
      return { timeOrder: true, overlap: false };
    }
    if (r.isUnavailable) {
      continue;
    }
    const a = timeToMinutes(r.startTime);
    const b = timeToMinutes(r.endTime);
    if (!Number.isFinite(a) || !Number.isFinite(b)) {
      return { timeOrder: true, overlap: false };
    }
    if (!r.crossesMidnight && b <= a) {
      return { timeOrder: true, overlap: false };
    }
    if (r.crossesMidnight && b >= a) {
      return { timeOrder: true, overlap: false };
    }
  }

  const byDate = new Map<string, AvailabilityOverrideRow[]>();
  for (const r of overrides) {
    if (r.isUnavailable) {
      continue;
    }
    const list = byDate.get(r.date) ?? [];
    list.push(r);
    byDate.set(r.date, list);
  }
  for (const [, rows] of byDate) {
    const intervals = rows.map((r) => {
      const start = timeToMinutes(r.startTime);
      const endRaw = timeToMinutes(r.endTime);
      const end = r.crossesMidnight ? endRaw + 24 * 60 : endRaw;
      return { start, end };
    });
    const sorted = intervals.sort((x, y) => x.start - y.start);
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]!;
      const cur = sorted[i]!;
      if (cur.start < prev.end) {
        return { timeOrder: false, overlap: true };
      }
    }
  }
  return { timeOrder: false, overlap: false };
}

function formatGeocodedAt(iso: string | null, locale: Locale, noneLabel: string): string {
  if (!iso) {
    return noneLabel;
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return noneLabel;
  }
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function detailLoadingSkeleton(): ReactNode {
  return (
    <div className="space-y-6" aria-hidden>
      <Skeleton className="h-8 w-40" />
      {[0, 1, 2].map((k) => (
        <Card key={k} className="border-border/80 bg-muted/15 shadow-none">
          <CardHeader>
            <Skeleton className="h-5 w-48" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-10 w-full max-w-xl" />
            <Skeleton className="h-10 w-full max-w-xl" />
            <Skeleton className="h-20 w-full max-w-xl" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function EmployeesDetailContent({
  locale,
  employeeId,
}: {
  locale: Locale;
  employeeId: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = getEmployeesCopy(locale);
  const formId = useId();
  const weekdays = useMemo(() => weekdayOptions(locale), [locale]);
  const [activeTab, setActiveTab] = useState<EmployeeDetailTab>(() =>
    parseDetailTab(searchParams.get("tab")),
  );

  const [loadBusy, setLoadBusy] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [employeeNo, setEmployeeNo] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "ONBOARDING" | "INACTIVE">("ACTIVE");
  const [employmentType, setEmploymentType] = useState<
    "FULL_TIME" | "PART_TIME" | "CONTRACTOR" | "APPRENTICE"
  >("FULL_TIME");
  const [roleLabel, setRoleLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [privateLabel, setPrivateLabel] = useState("");
  const [privateLine2, setPrivateLine2] = useState("");
  const [privateLine2Expanded, setPrivateLine2Expanded] = useState(false);
  const [privateRecipient, setPrivateRecipient] = useState("");
  const [privateStreet, setPrivateStreet] = useState("");
  const [privatePostal, setPrivatePostal] = useState("");
  const [privateCity, setPrivateCity] = useState("");
  const [privateCountry, setPrivateCountry] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [geocodeSource, setGeocodeSource] = useState<EmployeeGeocodeSource | null>(null);
  const [geocodedAtIso, setGeocodedAtIso] = useState<string | null>(null);
  const [archived, setArchived] = useState(false);
  const [availabilityTimeZone, setAvailabilityTimeZone] = useState("Europe/Berlin");
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityRow[]>([]);
  const [availabilityOverrides, setAvailabilityOverrides] = useState<
    AvailabilityOverrideRow[]
  >([]);
  const [detailEtag, setDetailEtag] = useState<string | null>(null);
  const [canEditEmployee, setCanEditEmployee] = useState(true);
  const [canDeleteEmployee, setCanDeleteEmployee] = useState(false);

  const [saveBusy, setSaveBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const geocodeQuery = useMemo(() => {
    const parts = [
      privateStreet.trim(),
      privatePostal.trim(),
      privateCity.trim(),
      privateCountry.trim(),
    ].filter(Boolean);
    return parts.join(", ");
  }, [privateStreet, privatePostal, privateCity, privateCountry]);

  const geocodedAtLabel = useMemo(
    () => formatGeocodedAt(geocodedAtIso, locale, t.geocodedAtNone),
    [geocodedAtIso, locale, t.geocodedAtNone],
  );

  useEffect(() => {
    const next = parseDetailTab(searchParams.get("tab"));
    setActiveTab((prev) => (prev === next ? prev : next));
  }, [searchParams]);

  const handleTabChange = useCallback(
    (nextRaw: string) => {
      const next = parseDetailTab(nextRaw);
      setActiveTab(next);
      const params = new URLSearchParams(searchParams.toString());
      if (next === "main") {
        params.delete("tab");
      } else {
        params.set("tab", next);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const applyLoaded = useCallback(
    (json: unknown) => {
      const parsed = employeeDetailResponseSchema.safeParse(json);
      if (!parsed.success) {
        setLoadError(t.detailLoadError);
        return;
      }
      const e = parsed.data.employee;
      setDisplayName(e.displayName);
      setEmployeeNo(e.employeeNo ?? "");
      setFirstName(e.firstName ?? "");
      setLastName(e.lastName ?? "");
      setEmail(e.email ?? "");
      setPhone(e.phone ?? "");
      setStatus(e.status);
      setEmploymentType(e.employmentType);
      setRoleLabel(e.roleLabel ?? "");
      setNotes(e.notes ?? "");
      setPrivateLabel((e.privateAddressLabel ?? "").trim() || t.defaultAddressLabel);
      const loadedPrivateLine2 = e.privateAddressLine2 ?? "";
      setPrivateLine2(loadedPrivateLine2);
      setPrivateLine2Expanded(loadedPrivateLine2.trim().length > 0);
      const normalizedAddress = normalizeAddressFields(
        e.privateRecipientName ?? "",
        e.privateStreet ?? "",
      );
      setPrivateRecipient(normalizedAddress.recipientName || e.displayName);
      setPrivateStreet(normalizedAddress.street);
      setPrivatePostal(e.privatePostalCode ?? "");
      setPrivateCity(e.privateCity ?? "");
      setPrivateCountry(e.privateCountry ?? "");
      setLatitude(e.latitude != null ? String(e.latitude) : "");
      setLongitude(e.longitude != null ? String(e.longitude) : "");
      setGeocodeSource(e.geocodeSource);
      setGeocodedAtIso(e.geocodedAt);
      setArchived(Boolean(e.archivedAt));
      setAvailabilityTimeZone(e.availabilityTimeZone || "Europe/Berlin");
      setAvailability(
        e.availability.map((r) => ({
          clientId: r.id,
          weekday: r.weekday,
          startTime: r.startTime.length === 8 ? r.startTime.slice(0, 5) : r.startTime,
          endTime: r.endTime.length === 8 ? r.endTime.slice(0, 5) : r.endTime,
          crossesMidnight: r.crossesMidnight,
          validFrom: r.validFrom ?? "",
          validTo: r.validTo ?? "",
        })),
      );
      setAvailabilityOverrides(
        e.availabilityOverrides.map((o) => ({
          clientId: o.id,
          date: o.date,
          isUnavailable: o.isUnavailable,
          startTime: o.startTime ? (o.startTime.length === 8 ? o.startTime.slice(0, 5) : o.startTime) : "08:00",
          endTime: o.endTime ? (o.endTime.length === 8 ? o.endTime.slice(0, 5) : o.endTime) : "17:00",
          crossesMidnight: o.crossesMidnight,
          note: o.note ?? "",
        })),
      );
      setCanEditEmployee(parsed.data.permissions.canEdit);
      setCanDeleteEmployee(parsed.data.permissions.canDelete);
      setLoadError(null);
    },
    [t.defaultAddressLabel, t.detailLoadError],
  );

  const load = useCallback(async () => {
    setLoadBusy(true);
    setLoadError(null);
    setNotFound(false);
    try {
      const res = await fetch(`/api/web/employees/${encodeURIComponent(employeeId)}`, {
        credentials: "include",
      });
      const text = await res.text();
      const json = parseResponseJson(text);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) {
        setLoadError(t.detailLoadError);
        return;
      }
      setDetailEtag(res.headers.get("etag"));
      applyLoaded(json);
    } catch {
      setLoadError(t.detailLoadError);
    } finally {
      setLoadBusy(false);
    }
  }, [employeeId, t.detailLoadError, applyLoaded]);

  useEffect(() => {
    void load();
  }, [load]);

  function addSlot() {
    setAvailability((prev) => [
      ...prev,
      {
        clientId: crypto.randomUUID(),
        weekday: 1,
        startTime: "08:00",
        endTime: "17:00",
        crossesMidnight: false,
        validFrom: "",
        validTo: "",
      },
    ]);
  }

  function removeSlot(clientId: string) {
    setAvailability((prev) => prev.filter((r) => r.clientId !== clientId));
  }

  function patchSlot(clientId: string, patch: Partial<AvailabilityRow>) {
    setAvailability((prev) =>
      prev.map((r) => (r.clientId === clientId ? { ...r, ...patch } : r)),
    );
  }

  function addOverride() {
    setAvailabilityOverrides((prev) => [
      ...prev,
      {
        clientId: crypto.randomUUID(),
        date: new Date().toISOString().slice(0, 10),
        isUnavailable: false,
        startTime: "08:00",
        endTime: "17:00",
        crossesMidnight: false,
        note: "",
      },
    ]);
  }

  function removeOverride(clientId: string) {
    setAvailabilityOverrides((prev) => prev.filter((r) => r.clientId !== clientId));
  }

  function patchOverride(clientId: string, patch: Partial<AvailabilityOverrideRow>) {
    setAvailabilityOverrides((prev) =>
      prev.map((r) => (r.clientId === clientId ? { ...r, ...patch } : r)),
    );
  }

  function parseCoord(raw: string): number | null {
    const tRaw = raw.trim().replace(",", ".");
    if (tRaw === "") {
      return null;
    }
    const n = Number(tRaw);
    return Number.isFinite(n) ? n : null;
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canEditEmployee) {
      toast.error(t.saveForbidden);
      return;
    }

    const latN = parseCoord(latitude);
    const lngN = parseCoord(longitude);
    if ((latN === null) !== (lngN === null)) {
      toast.error(t.coordinatesBothOrNeitherError);
      return;
    }

    const slotCheck = validateAvailabilitySlots(availability);
    if (slotCheck.timeOrder) {
      toast.error(t.availabilityTimeOrderError);
      return;
    }
    if (slotCheck.overlap) {
      toast.error(t.availabilityOverlapError);
      return;
    }
    const overrideCheck = validateAvailabilityOverrides(availabilityOverrides);
    if (overrideCheck.timeOrder) {
      toast.error(t.availabilityTimeOrderError);
      return;
    }
    if (overrideCheck.overlap) {
      toast.error(t.availabilityOverrideOverlapError);
      return;
    }

    const availabilityPayload: EmployeeAvailabilityRuleInput[] = availability.map(
      (r, idx) => ({
        weekday: r.weekday,
        startTime:
          r.startTime.length === 5 ? `${r.startTime}:00` : r.startTime,
        endTime: r.endTime.length === 5 ? `${r.endTime}:00` : r.endTime,
        crossesMidnight: r.crossesMidnight,
        validFrom: r.validFrom.trim() ? r.validFrom.trim() : null,
        validTo: r.validTo.trim() ? r.validTo.trim() : null,
        sortIndex: idx,
      }),
    );

    const body: Record<string, unknown> = {
      employeeNo: employeeNo.trim() ? employeeNo.trim() : null,
      firstName: firstName.trim() ? firstName.trim() : null,
      lastName: lastName.trim() ? lastName.trim() : null,
      email: email.trim() ? email.trim() : null,
      phone: phone.trim() ? phone.trim() : null,
      status,
      employmentType,
      availabilityTimeZone: availabilityTimeZone.trim()
        ? availabilityTimeZone.trim()
        : "Europe/Berlin",
      displayName: displayName.trim(),
      roleLabel: roleLabel.trim() ? roleLabel.trim() : null,
      notes: notes.trim() ? notes.trim() : null,
      privateAddressLabel: privateLabel.trim() ? privateLabel.trim() : null,
      privateAddressLine2: privateLine2.trim() ? privateLine2.trim() : null,
      privateRecipientName: privateRecipient.trim() ? privateRecipient.trim() : null,
      privateStreet: privateStreet.trim() ? privateStreet.trim() : null,
      privatePostalCode: privatePostal.trim() ? privatePostal.trim() : null,
      privateCity: privateCity.trim() ? privateCity.trim() : null,
      privateCountry: normalizeCountryInput(privateCountry),
      latitude: latN,
      longitude: lngN,
      geocodeSource:
        latN !== null && lngN !== null ? geocodeSource ?? "manual" : null,
      archived,
      availability: availabilityPayload,
      availabilityOverrides: availabilityOverrides.map((o, idx) => ({
        date: o.date,
        isUnavailable: o.isUnavailable,
        startTime: o.isUnavailable
          ? null
          : o.startTime.length === 5
            ? `${o.startTime}:00`
            : o.startTime,
        endTime: o.isUnavailable
          ? null
          : o.endTime.length === 5
            ? `${o.endTime}:00`
            : o.endTime,
        crossesMidnight: o.isUnavailable ? false : o.crossesMidnight,
        sortIndex: idx,
        note: o.note.trim() ? o.note.trim() : null,
      })),
    };

    setSaveBusy(true);
    try {
      const res = await fetch(`/api/web/employees/${encodeURIComponent(employeeId)}`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(detailEtag ? { "If-Match": detailEtag } : {}),
        },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      const json = parseResponseJson(text);
      if (!res.ok) {
        const err =
          typeof json === "object" && json !== null && "error" in json
            ? (json as { error?: string }).error
            : undefined;
        if (res.status === 403 || err === "forbidden") {
          toast.error(t.saveForbidden);
        } else if (err === "employee_no_taken") {
          toast.error(t.employeeNoTaken);
        } else if (
          res.status === 409 ||
          res.status === 428 ||
          err === "concurrent_update" ||
          err === "missing_if_match"
        ) {
          toast.error(t.saveConflict);
          await load();
        } else if (err === "validation_error") {
          const issues = readEmployeeValidationIssues(json);
          toast.error(
            issues
              ? summarizeEmployeeValidationIssues(issues, t, locale)
              : `${t.saveError} ${t.validationErrorHint}`,
          );
        } else {
          toast.error(t.saveError);
        }
        return;
      }
      setDetailEtag(res.headers.get("etag"));
      applyLoaded(json);
      toast.success(t.saved);
    } catch {
      toast.error(t.saveError);
    } finally {
      setSaveBusy(false);
    }
  }

  async function handleDelete() {
    if (!canDeleteEmployee) {
      setDeleteError(t.deleteForbidden);
      return;
    }
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/web/employees/${encodeURIComponent(employeeId)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const errText = res.status === 403 ? t.deleteForbidden : t.deleteError;
        setDeleteError(errText);
        toast.error(errText);
        return;
      }
      router.push("/web/employees/list?deleted=1");
    } catch {
      const errText = t.deleteError;
      setDeleteError(errText);
      toast.error(errText);
    } finally {
      setDeleteBusy(false);
      setDeleteDialogOpen(false);
    }
  }

  if (loadBusy) {
    return (
      <div className="space-y-2">
        <p className="sr-only" role="status">
          {t.detailLoadingAria}
        </p>
        {detailLoadingSkeleton()}
      </div>
    );
  }
  if (notFound) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t.detailNotFound}</p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/web/employees/list">{t.backToList}</Link>
        </Button>
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">{loadError}</p>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
          {t.actionRetry}
        </Button>
      </div>
    );
  }

  return (
    <>
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.archiveDialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.archiveDialogDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.archiveDialogCancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setArchived(true);
                setArchiveDialogOpen(false);
              }}
            >
              {t.archiveDialogConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.deleteDialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.deleteDialogDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBusy}>{t.deleteDialogCancel}</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteBusy}
              variant="destructive"
              onClick={() => {
                void handleDelete();
              }}
            >
              {deleteBusy ? t.deleting : t.deleteDialogConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <form id={formId} onSubmit={(ev) => void handleSave(ev)} className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
            <Link href="/web/employees/list">{t.backToList}</Link>
          </Button>
        </div>

        {!canEditEmployee ? (
          <p className="text-xs text-muted-foreground">{t.permissionReadOnly}</p>
        ) : null}

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList variant="line" aria-label={t.profileNavAriaLabel}>
            <TabsTrigger value="main">{t.sectionMain}</TabsTrigger>
            <TabsTrigger value="availability">{t.sectionAvailability}</TabsTrigger>
            <TabsTrigger value="vacation">{t.sectionVacation}</TabsTrigger>
            <TabsTrigger value="sick">{t.sectionSick}</TabsTrigger>
            <TabsTrigger value="activity">{t.sectionActivity}</TabsTrigger>
          </TabsList>
        </Tabs>

        {activeTab === "main" ? (
          <>
            <fieldset disabled={!canEditEmployee} className="space-y-6">
              <Card className="border-border/80 bg-muted/15 shadow-none">
                <CardHeader>
                  <CardTitle className="text-base">{t.sectionMain}</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:max-w-xl">
                  <div className="grid gap-2">
                    <Label htmlFor={`${formId}-name`}>{t.fieldDisplayName}</Label>
                    <Input
                      id={`${formId}-name`}
                      value={displayName}
                      onChange={(ev) => setDisplayName(ev.target.value)}
                      required
                      autoComplete="name"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor={`${formId}-eno`}>{t.fieldEmployeeNo}</Label>
                      <Input
                        id={`${formId}-eno`}
                        value={employeeNo}
                        onChange={(ev) => setEmployeeNo(ev.target.value)}
                        autoComplete="off"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`${formId}-st`}>{t.fieldStatus}</Label>
                      <Select
                        value={status}
                        onValueChange={(v) =>
                          setStatus(v as "ACTIVE" | "ONBOARDING" | "INACTIVE")
                        }
                      >
                        <SelectTrigger id={`${formId}-st`} className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ACTIVE">{t.statusActive}</SelectItem>
                          <SelectItem value="ONBOARDING">{t.statusOnboarding}</SelectItem>
                          <SelectItem value="INACTIVE">{t.statusInactive}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor={`${formId}-fn`}>{t.fieldFirstName}</Label>
                      <Input
                        id={`${formId}-fn`}
                        value={firstName}
                        onChange={(ev) => setFirstName(ev.target.value)}
                        autoComplete="given-name"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`${formId}-ln`}>{t.fieldLastName}</Label>
                      <Input
                        id={`${formId}-ln`}
                        value={lastName}
                        onChange={(ev) => setLastName(ev.target.value)}
                        autoComplete="family-name"
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor={`${formId}-em`}>{t.fieldEmail}</Label>
                      <Input
                        id={`${formId}-em`}
                        value={email}
                        onChange={(ev) => setEmail(ev.target.value)}
                        type="email"
                        autoComplete="email"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`${formId}-ph`}>{t.fieldPhone}</Label>
                      <Input
                        id={`${formId}-ph`}
                        value={phone}
                        onChange={(ev) => setPhone(ev.target.value)}
                        autoComplete="tel"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`${formId}-et`}>{t.fieldEmploymentType}</Label>
                    <Select
                      value={employmentType}
                      onValueChange={(v) =>
                        setEmploymentType(
                          v as
                            | "FULL_TIME"
                            | "PART_TIME"
                            | "CONTRACTOR"
                            | "APPRENTICE",
                        )
                      }
                    >
                      <SelectTrigger id={`${formId}-et`} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FULL_TIME">{t.employmentFullTime}</SelectItem>
                        <SelectItem value="PART_TIME">{t.employmentPartTime}</SelectItem>
                        <SelectItem value="CONTRACTOR">{t.employmentContractor}</SelectItem>
                        <SelectItem value="APPRENTICE">{t.employmentApprentice}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`${formId}-role`}>{t.fieldRole}</Label>
                    <Input
                      id={`${formId}-role`}
                      value={roleLabel}
                      onChange={(ev) => setRoleLabel(ev.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`${formId}-notes`}>{t.fieldNotes}</Label>
                    <Textarea
                      id={`${formId}-notes`}
                      value={notes}
                      onChange={(ev) => setNotes(ev.target.value)}
                      maxLength={EMPLOYEE_NOTES_MAX_LENGTH}
                      rows={4}
                      className="min-h-20 resize-y"
                    />
                    <p className="text-xs text-muted-foreground">
                      {formatEmployeesNotesCharCount(
                        locale,
                        notes.length,
                        EMPLOYEE_NOTES_MAX_LENGTH,
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`${formId}-arch`}
                      checked={archived}
                      onCheckedChange={(v) => {
                        if (v === true) {
                          setArchiveDialogOpen(true);
                        } else {
                          setArchived(false);
                        }
                      }}
                    />
                    <Label htmlFor={`${formId}-arch`} className="font-normal">
                      {t.archiveLabel}
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">{t.archivedHint}</p>
                </CardContent>
              </Card>

              <Card className="border-border/80 bg-muted/15 shadow-none">
                <CardHeader>
                  <CardTitle className="text-base">{t.sectionPrivateAddress}</CardTitle>
                  <CardDescription className="text-xs">{t.privacyHint}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-1 rounded-md border border-border/50 bg-muted/20 px-3 py-2 text-xs sm:max-w-xl">
                    <span className="font-medium text-muted-foreground">
                      {t.fieldGeocodedAt}
                    </span>
                    <span className="text-foreground">{geocodedAtLabel}</span>
                  </div>
                  <CustomerAddressGeocodeControls
                    locale={locale}
                    defaultQuery={geocodeQuery}
                    onApply={(s) => {
                      const normalizedAddress = normalizeAddressFields(
                        s.recipientName,
                        s.street,
                      );
                      setPrivateStreet(normalizedAddress.street);
                      setPrivatePostal(s.postalCode);
                      setPrivateCity(s.city);
                      setPrivateCountry(s.country);
                      if (s.addressLine2?.trim() && privateLine2.trim() === "") {
                        setPrivateLine2(s.addressLine2.trim());
                        setPrivateLine2Expanded(true);
                      }
                      if (s.latitude != null && s.longitude != null) {
                        setLatitude(String(s.latitude));
                        setLongitude(String(s.longitude));
                        setGeocodeSource("ors");
                      }
                    }}
                  />
                  <Separator />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor={`${formId}-pal`}>{t.fieldAddressLabel}</Label>
                      <Input
                        id={`${formId}-pal`}
                        value={privateLabel}
                        onChange={(ev) => setPrivateLabel(ev.target.value)}
                      />
                    </div>
                    <div className="grid gap-2 sm:col-span-2">
                      <Label htmlFor={`${formId}-prec`}>{t.fieldRecipient}</Label>
                      <Input
                        id={`${formId}-prec`}
                        value={privateRecipient}
                        onChange={(ev) => setPrivateRecipient(ev.target.value)}
                      />
                    </div>
                    <div className="grid gap-2 sm:col-span-2">
                      <Label htmlFor={`${formId}-pst`}>{t.fieldStreet}</Label>
                      <Input
                        id={`${formId}-pst`}
                        value={privateStreet}
                        onChange={(ev) => setPrivateStreet(ev.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Accordion
                        type="single"
                        collapsible
                        value={privateLine2Expanded ? "address-line-2" : undefined}
                        onValueChange={(value) =>
                          setPrivateLine2Expanded(value === "address-line-2")
                        }
                        className="w-full rounded-lg border border-border/60 bg-muted/10 px-3"
                      >
                        <AccordionItem value="address-line-2" className="border-none">
                          <AccordionTrigger className="py-2.5 text-sm font-medium hover:no-underline">
                            {privateLine2Expanded ? t.addressLine2Hide : t.addressLine2Show}
                          </AccordionTrigger>
                          <AccordionContent className="pb-0">
                            <div className="grid gap-2 pb-3">
                              <Label htmlFor={`${formId}-pa2`} className="sr-only">
                                {t.fieldAddressLine2}
                              </Label>
                              <Input
                                id={`${formId}-pa2`}
                                value={privateLine2}
                                onChange={(ev) => setPrivateLine2(ev.target.value)}
                                placeholder={t.addressLine2Placeholder}
                              />
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`${formId}-pplz`}>{t.fieldPostal}</Label>
                      <Input
                        id={`${formId}-pplz`}
                        value={privatePostal}
                        onChange={(ev) => setPrivatePostal(ev.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`${formId}-pct`}>{t.fieldCity}</Label>
                      <Input
                        id={`${formId}-pct`}
                        value={privateCity}
                        onChange={(ev) => setPrivateCity(ev.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`${formId}-pcc`}>{t.fieldCountry}</Label>
                      <Input
                        id={`${formId}-pcc`}
                        value={privateCountry}
                        onChange={(ev) => setPrivateCountry(ev.target.value)}
                        maxLength={2}
                        className="uppercase"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`${formId}-lat`}>{t.fieldLatitude}</Label>
                      <Input
                        id={`${formId}-lat`}
                        value={latitude}
                        onChange={(ev) => {
                          setLatitude(ev.target.value);
                          setGeocodeSource("manual");
                        }}
                        inputMode="decimal"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`${formId}-lng`}>{t.fieldLongitude}</Label>
                      <Input
                        id={`${formId}-lng`}
                        value={longitude}
                        onChange={(ev) => {
                          setLongitude(ev.target.value);
                          setGeocodeSource("manual");
                        }}
                        inputMode="decimal"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </fieldset>

            <EmployeesSkillsCard
              employeeId={employeeId}
              locale={locale}
              canEdit={canEditEmployee}
            />

            <EmployeesRelationshipsCard
              employeeId={employeeId}
              locale={locale}
              canEdit={canEditEmployee}
            />

            <EmployeesFilesCard
              employeeId={employeeId}
              locale={locale}
              canEdit={canEditEmployee}
            />

            {canDeleteEmployee ? (
              <Card className="border-destructive/20 bg-destructive/5 shadow-none">
              <CardHeader>
                <CardTitle className="text-base">{t.deleteSectionTitle}</CardTitle>
                <CardDescription className="text-xs">{t.deleteSectionDescription}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {deleteError ? (
                  <p className="text-sm text-destructive" role="alert">
                    {deleteError}
                  </p>
                ) : null}
                <Button
                  type="button"
                  variant="destructive"
                  disabled={deleteBusy}
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  {deleteBusy ? t.deleting : t.deleteButton}
                </Button>
              </CardContent>
              </Card>
            ) : null}
          </>
        ) : null}

        {activeTab === "availability" ? (
          <fieldset disabled={!canEditEmployee}>
            <Card className="border-border/80 bg-muted/15 shadow-none">
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">{t.sectionAvailability}</CardTitle>
                <Button type="button" variant="secondary" size="sm" onClick={addSlot}>
                  {t.addSlot}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
              <div className="grid gap-2 sm:max-w-sm">
                <Label htmlFor={`${formId}-tz`}>{t.fieldAvailabilityTimeZone}</Label>
                <Input
                  id={`${formId}-tz`}
                  value={availabilityTimeZone}
                  onChange={(ev) => setAvailabilityTimeZone(ev.target.value)}
                  placeholder="Europe/Berlin"
                  autoComplete="off"
                />
              </div>
              {availability.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t.availabilityEmpty}</p>
              ) : (
                <ul className="space-y-3">
                  {availability.map((r) => (
                    <li
                      key={r.clientId}
                      className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/10 p-3 sm:flex-row sm:flex-wrap sm:items-end"
                    >
                      <div className="grid gap-2 sm:w-40">
                        <Label>{t.weekdayLabel}</Label>
                        <Select
                          value={String(r.weekday)}
                          onValueChange={(v) =>
                            patchSlot(r.clientId, { weekday: Number(v) })
                          }
                        >
                          <SelectTrigger className="w-full" aria-label={t.weekdayLabel}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {weekdays.map((w) => (
                              <SelectItem key={w.value} value={w.value}>
                                {w.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={`${formId}-st-${r.clientId}`}>{t.startTime}</Label>
                        <Input
                          id={`${formId}-st-${r.clientId}`}
                          type="time"
                          value={r.startTime}
                          onChange={(ev) =>
                            patchSlot(r.clientId, { startTime: ev.target.value })
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={`${formId}-en-${r.clientId}`}>{t.endTime}</Label>
                        <Input
                          id={`${formId}-en-${r.clientId}`}
                          type="time"
                          value={r.endTime}
                          onChange={(ev) =>
                            patchSlot(r.clientId, { endTime: ev.target.value })
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={`${formId}-vf-${r.clientId}`}>{t.fieldValidFrom}</Label>
                        <Input
                          id={`${formId}-vf-${r.clientId}`}
                          type="date"
                          value={r.validFrom}
                          onChange={(ev) =>
                            patchSlot(r.clientId, { validFrom: ev.target.value })
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor={`${formId}-vt-${r.clientId}`}>{t.fieldValidTo}</Label>
                        <Input
                          id={`${formId}-vt-${r.clientId}`}
                          type="date"
                          value={r.validTo}
                          onChange={(ev) =>
                            patchSlot(r.clientId, { validTo: ev.target.value })
                          }
                        />
                      </div>
                      <div className="flex items-center gap-2 sm:mr-auto">
                        <Checkbox
                          id={`${formId}-cm-${r.clientId}`}
                          checked={r.crossesMidnight}
                          onCheckedChange={(v) =>
                            patchSlot(r.clientId, { crossesMidnight: v === true })
                          }
                        />
                        <Label
                          htmlFor={`${formId}-cm-${r.clientId}`}
                          className="text-xs font-normal"
                        >
                          {t.crossesMidnightLabel}
                        </Label>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive sm:ml-auto"
                        onClick={() => removeSlot(r.clientId)}
                      >
                        {t.removeSlot}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}

              <Separator />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-sm font-medium">{t.sectionAvailabilityOverrides}</h3>
                <Button type="button" variant="secondary" size="sm" onClick={addOverride}>
                  {t.addOverride}
                </Button>
              </div>
              {availabilityOverrides.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t.availabilityOverridesEmpty}</p>
              ) : (
                <ul className="space-y-3">
                  {availabilityOverrides.map((o) => (
                    <li
                      key={o.clientId}
                      className="space-y-3 rounded-lg border border-border/60 bg-muted/10 p-3"
                    >
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="grid gap-2">
                          <Label htmlFor={`${formId}-od-${o.clientId}`}>{t.overrideDate}</Label>
                          <Input
                            id={`${formId}-od-${o.clientId}`}
                            type="date"
                            value={o.date}
                            onChange={(ev) =>
                              patchOverride(o.clientId, { date: ev.target.value })
                            }
                            required
                          />
                        </div>
                        <div className="flex items-end">
                          <div className="flex items-center gap-2 pb-2">
                            <Checkbox
                              id={`${formId}-ou-${o.clientId}`}
                              checked={o.isUnavailable}
                              onCheckedChange={(v) =>
                                patchOverride(o.clientId, { isUnavailable: v === true })
                              }
                            />
                            <Label
                              htmlFor={`${formId}-ou-${o.clientId}`}
                              className="font-normal"
                            >
                              {t.overrideUnavailable}
                            </Label>
                          </div>
                        </div>
                        {!o.isUnavailable ? (
                          <>
                            <div className="grid gap-2">
                              <Label htmlFor={`${formId}-os-${o.clientId}`}>{t.startTime}</Label>
                              <Input
                                id={`${formId}-os-${o.clientId}`}
                                type="time"
                                value={o.startTime}
                                onChange={(ev) =>
                                  patchOverride(o.clientId, {
                                    startTime: ev.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor={`${formId}-oe-${o.clientId}`}>{t.endTime}</Label>
                              <Input
                                id={`${formId}-oe-${o.clientId}`}
                                type="time"
                                value={o.endTime}
                                onChange={(ev) =>
                                  patchOverride(o.clientId, { endTime: ev.target.value })
                                }
                              />
                            </div>
                          </>
                        ) : null}
                      </div>
                      {!o.isUnavailable ? (
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`${formId}-ocm-${o.clientId}`}
                            checked={o.crossesMidnight}
                            onCheckedChange={(v) =>
                              patchOverride(o.clientId, {
                                crossesMidnight: v === true,
                              })
                            }
                          />
                          <Label htmlFor={`${formId}-ocm-${o.clientId}`} className="font-normal">
                            {t.crossesMidnightLabel}
                          </Label>
                        </div>
                      ) : null}
                      <div className="grid gap-2">
                        <Label htmlFor={`${formId}-on-${o.clientId}`}>{t.overrideNote}</Label>
                        <Input
                          id={`${formId}-on-${o.clientId}`}
                          value={o.note}
                          onChange={(ev) =>
                            patchOverride(o.clientId, { note: ev.target.value })
                          }
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => removeOverride(o.clientId)}
                        >
                          {t.removeSlot}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
            </Card>
          </fieldset>
        ) : null}

        {activeTab === "vacation" ? (
          <EmployeesAbsencesCard locale={locale} employeeId={employeeId} mode="vacation" />
        ) : null}
        {activeTab === "sick" ? (
          <EmployeesAbsencesCard locale={locale} employeeId={employeeId} mode="sick" />
        ) : null}
        {activeTab === "activity" ? (
          <EmployeesActivityPanel locale={locale} employeeId={employeeId} />
        ) : null}

        {activeTab === "main" || activeTab === "availability" ? (
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="submit" disabled={saveBusy || !canEditEmployee}>
              {saveBusy ? t.saving : t.save}
            </Button>
          </div>
        ) : null}
      </form>
    </>
  );
}
