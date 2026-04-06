"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  FolderOpen,
  Loader2,
  ReceiptText,
  Upload,
} from "lucide-react";
import {
  customerDetailResponseSchema,
  employeesListResponseSchema,
  gaebImportsListResponseSchema,
  projectAssetKindSchema,
  projectAssetUploadResponseSchema,
  projectAssetsListResponseSchema,
  projectResponseSchema,
  salesInvoiceDetailResponseSchema,
  salesOpenInvoicesListResponseSchema,
  salesInvoicesListResponseSchema,
  salesQuotesListResponseSchema,
  schedulingAssignmentsListResponseSchema,
  workTimeEntriesListResponseSchema,
  type GaebLvDocumentSummary,
  type Project,
  type ProjectAssetKind,
  type ProjectAssetSummary,
  type SalesInvoiceListItem,
  type SalesQuoteListItem,
} from "@repo/api-contracts";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/alert";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Skeleton } from "@repo/ui/skeleton";
import type { ZodType } from "zod";

import type { Locale } from "@/lib/i18n/locale";
import { formatMinorCurrency } from "@/lib/money-format";
import { parseResponseJson } from "@/lib/parse-response-json";

type HubData = {
  project: Project;
  siteAddressLabel: string | null;
  quotes: SalesQuoteListItem[];
  invoices: SalesInvoiceListItem[];
  assets: ProjectAssetSummary[];
  gaebDocuments: GaebLvDocumentSummary[];
};

async function fetchParsed<T>(url: string, schema: ZodType<T>): Promise<T> {
  const res = await fetch(url, { credentials: "include", cache: "no-store" });
  const text = await res.text();
  const json = parseResponseJson(text);
  const parsed = schema.safeParse(json);
  if (!res.ok || !parsed.success) {
    throw new Error("load_failed");
  }
  return parsed.data;
}

function formatSiteAddressLabel(a: {
  label: string | null;
  recipientName: string;
  street: string;
  postalCode: string;
  city: string;
}): string {
  const label = a.label?.trim();
  const head = label && label.length > 0 ? label : a.recipientName.trim();
  return `${head} · ${a.street.trim()}, ${a.postalCode.trim()} ${a.city.trim()}`;
}

function formatProjectStatus(locale: Locale, status: string): string {
  if (locale === "en") {
    if (status === "planned") return "Planned";
    if (status === "active") return "Active";
    if (status === "on-hold") return "On hold";
    if (status === "completed") return "Completed";
    return status;
  }
  if (status === "planned") return "Geplant";
  if (status === "active") return "Aktiv";
  if (status === "on-hold") return "Pausiert";
  if (status === "completed") return "Abgeschlossen";
  return status;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"] as const;
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  const digits = i === 0 ? 0 : i === 1 ? 0 : 1;
  return `${v.toFixed(digits)} ${units[i]}`;
}

function isoDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDuration(locale: Locale, minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (locale === "en") {
    return `${h}h ${m}m`;
  }
  return `${h} Std. ${m} Min.`;
}

function formatYmd(locale: Locale, ymd: string): string {
  const parts = ymd.split("-");
  if (parts.length !== 3) return ymd;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return ymd;
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const tag = locale === "en" ? "en-GB" : "de-DE";
  return new Intl.DateTimeFormat(tag, { dateStyle: "medium" }).format(dt);
}

function addDaysIsoLocal(ymd: string, days: number): string {
  const parts = ymd.split("-");
  if (parts.length !== 3) return ymd;
  const y = Number(parts[0]);
  const mo = Number(parts[1]);
  const d = Number(parts[2]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return ymd;
  const dt = new Date(y, mo - 1, d);
  dt.setDate(dt.getDate() + days);
  return isoDateLocal(dt);
}

export function ProjectHubContent({
  locale,
  projectId,
}: {
  locale: Locale;
  projectId: string;
}) {
  const copy = useMemo(
    () =>
      locale === "en"
        ? {
            back: "Projects",
            title: "Project hub",
            loadError: "Project hub could not be loaded.",
            retry: "Retry",
            notFoundTitle: "Project not found",
            notFoundHint: "The project does not exist or you do not have access.",
            masterData: "Master data",
            documents: "Documents",
            quotes: "Quotes",
            invoices: "Invoices",
            files: "Files",
            gaeb: "GAEB / LV",
            openSales: "Open sales module",
            openFolders: "Open project folders",
            openGaeb: "Open GAEB support",
            projectNumber: "Project no.",
            status: "Status",
            customer: "Customer",
            siteAddress: "Site address",
            period: "Period",
            updatedAt: "Updated",
            none: "—",
            uploadTitle: "Upload file",
            uploadKind: "Kind",
            uploadFile: "File",
            uploadAction: "Upload",
            uploadBusy: "Uploading…",
            uploadError: "File could not be uploaded.",
            noQuotes: "No quotes linked to this project yet.",
            noInvoices: "No invoices linked to this project yet.",
            noAssets: "No files stored for this project yet.",
            noGaeb: "No GAEB imports linked to this project yet.",
            scheduling: "Scheduling",
            schedulingHint:
              "Team assignments in the calendar for the next 7 days linked to this project.",
            schedulingOpen: "Open scheduling",
            noSchedulingWeek:
              "No assignments linked to this project in the next 7 days.",
            receivablesRemindersLine: (count: number, level: number) =>
              `${count} reminder${count === 1 ? "" : "s"} · level ${level}`,
            receivablesReminderPrint: "Print",
            receivablesReminderPdf: "PDF",
            workTime: "Time tracking",
            workTimeHint: "Month to date (this project).",
            workTimeOpen: "Open time tracking",
            workTimeLoadError: "Work time could not be loaded.",
            workTimeEmpty: "No entries linked to this project this month.",
            receivables: "Receivables",
            receivablesHint: "Open items (positive balance) linked to this project.",
            receivablesOpen: "Open open items",
            receivablesLoadError: "Open items could not be loaded.",
            receivablesEmpty: "No open items linked to this project.",
          }
        : {
            back: "Projekte",
            title: "Projekt-Hub",
            loadError: "Projekt-Hub konnte nicht geladen werden.",
            retry: "Erneut laden",
            notFoundTitle: "Projekt nicht gefunden",
            notFoundHint:
              "Das Projekt existiert nicht oder du hast keinen Zugriff darauf.",
            masterData: "Stammdaten",
            documents: "Belege",
            quotes: "Angebote",
            invoices: "Rechnungen",
            files: "Dateien",
            gaeb: "GAEB / LV",
            openSales: "Zum Sales-Modul",
            openFolders: "Zur Projektmappe",
            openGaeb: "Zum GAEB-Modul",
            projectNumber: "Projektnummer",
            status: "Status",
            customer: "Kunde",
            siteAddress: "Baustelle",
            period: "Zeitraum",
            updatedAt: "Aktualisiert",
            none: "—",
            uploadTitle: "Datei hochladen",
            uploadKind: "Typ",
            uploadFile: "Datei",
            uploadAction: "Hochladen",
            uploadBusy: "Upload läuft…",
            uploadError: "Datei konnte nicht hochgeladen werden.",
            noQuotes: "Noch keine Angebote mit diesem Projekt verknuepft.",
            noInvoices: "Noch keine Rechnungen mit diesem Projekt verknuepft.",
            noAssets: "Noch keine Dateien zu diesem Projekt abgelegt.",
            noGaeb: "Noch keine GAEB-Imports mit diesem Projekt verknuepft.",
            scheduling: "Terminplanung",
            schedulingHint:
              "Team-Einsaetze im Kalender fuer die naechsten 7 Tage mit diesem Projekt.",
            schedulingOpen: "Zur Terminplanung",
            noSchedulingWeek:
              "Keine Einsaetze mit diesem Projekt in den naechsten 7 Tagen.",
            receivablesRemindersLine: (count: number, level: number) =>
              `${count} ${count === 1 ? "Mahnung" : "Mahnungen"} · Stufe ${level}`,
            receivablesReminderPrint: "Druck",
            receivablesReminderPdf: "PDF",
            workTime: "Zeiterfassung",
            workTimeHint: "Monat bis heute (dieses Projekt).",
            workTimeOpen: "Zur Zeiterfassung",
            workTimeLoadError: "Zeiten konnten nicht geladen werden.",
            workTimeEmpty: "Keine Zeiten zu diesem Projekt im aktuellen Monat.",
            receivables: "Forderungen",
            receivablesHint: "Offene Posten (Saldo > 0) zu diesem Projekt.",
            receivablesOpen: "Zu den offenen Posten",
            receivablesLoadError: "Offene Posten konnten nicht geladen werden.",
            receivablesEmpty: "Keine offenen Posten zu diesem Projekt.",
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

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "de-DE", {
        dateStyle: "medium",
      }),
    [locale],
  );

  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [data, setData] = useState<HubData | null>(null);

  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadKind, setUploadKind] = useState<ProjectAssetKind>("document");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const [schedulingWeek, setSchedulingWeek] = useState<
    { id: string; date: string; startTime: string; title: string }[] | null
  >(null);
  const [schedulingBusy, setSchedulingBusy] = useState(false);

  const [workTimeSummary, setWorkTimeSummary] = useState<{
    totalMinutes: number;
    entries: {
      id: string;
      workDate: string;
      durationMinutes: number;
      employeeName: string | null;
      notes: string | null;
    }[];
  } | null>(null);
  const [workTimeBusy, setWorkTimeBusy] = useState(false);
  const [workTimeError, setWorkTimeError] = useState(false);

  const [openItems, setOpenItems] = useState<{
    total: number;
    invoices: {
      id: string;
      documentNumber: string;
      customerLabel: string;
      dueAt: string | null;
      currency: string;
      balanceCents: number;
      reminderCount: number;
      maxReminderLevel: number | null;
      latestReminderId: string | null;
    }[];
  } | null>(null);
  const [openItemsBusy, setOpenItemsBusy] = useState(false);
  const [openItemsError, setOpenItemsError] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    setNotFound(false);
    setData(null);
    try {
      const res = await fetch(`/api/web/projects/${encodeURIComponent(projectId)}`, {
        credentials: "include",
        cache: "no-store",
      });
      const text = await res.text();
      const json = parseResponseJson(text);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      const projectParsed = projectResponseSchema.safeParse(json);
      if (!res.ok || !projectParsed.success) {
        throw new Error("load_failed");
      }
      const project = projectParsed.data.project;

      const [quotesRes, invoicesRes, assetsRes, gaebRes] = await Promise.all([
        fetchParsed(
          `/api/web/sales/quotes?sortBy=updatedAt&sortDir=desc&limit=8&offset=0&projectId=${encodeURIComponent(projectId)}`,
          salesQuotesListResponseSchema,
        ),
        fetchParsed(
          `/api/web/sales/invoices?sortBy=updatedAt&sortDir=desc&limit=8&offset=0&projectId=${encodeURIComponent(projectId)}`,
          salesInvoicesListResponseSchema,
        ),
        fetchParsed(
          `/api/web/projects/${encodeURIComponent(projectId)}/assets`,
          projectAssetsListResponseSchema,
        ),
        fetchParsed(
          `/api/web/gaeb/imports?projectId=${encodeURIComponent(projectId)}`,
          gaebImportsListResponseSchema,
        ),
      ]);

      let siteAddressLabel: string | null = null;
      if (project.customerId && project.siteAddressId) {
        try {
          const customerRes = await fetchParsed(
            `/api/web/customers/${encodeURIComponent(project.customerId)}`,
            customerDetailResponseSchema,
          );
          const match = customerRes.customer.addresses.find(
            (a) => a.id === project.siteAddressId,
          );
          if (match) {
            siteAddressLabel = formatSiteAddressLabel(match);
          }
        } catch {
          siteAddressLabel = null;
        }
      }

      setData({
        project,
        siteAddressLabel,
        quotes: quotesRes.quotes,
        invoices: invoicesRes.invoices,
        assets: assetsRes.assets,
        gaebDocuments: gaebRes.documents,
      });
    } catch {
      setError(copy.loadError);
    } finally {
      setBusy(false);
    }
  }, [copy.loadError, projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!data) {
      setSchedulingWeek(null);
      setSchedulingBusy(false);
      return;
    }
    setSchedulingWeek(null);
    let cancelled = false;
    setSchedulingBusy(true);
    const todayIso = isoDateLocal(new Date());
    const endIso = addDaysIsoLocal(todayIso, 6);
    void (async () => {
      try {
        const qs = new URLSearchParams({
          projectId,
          dateFrom: todayIso,
          dateTo: endIso,
        }).toString();
        const res = await fetch(`/api/web/scheduling/assignments?${qs}`, {
          credentials: "include",
          cache: "no-store",
        });
        const text = await res.text();
        const json = parseResponseJson(text);
        const parsed = schedulingAssignmentsListResponseSchema.safeParse(json);
        if (!res.ok || !parsed.success || cancelled) {
          if (!cancelled) {
            setSchedulingWeek([]);
          }
          return;
        }
        if (!cancelled) {
          setSchedulingWeek(
            parsed.data.assignments.map((a) => ({
              id: a.id,
              date: a.date,
              startTime: a.startTime,
              title: a.title,
            })),
          );
        }
      } catch {
        if (!cancelled) {
          setSchedulingWeek([]);
        }
      } finally {
        if (!cancelled) {
          setSchedulingBusy(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [data, projectId]);

  useEffect(() => {
    if (!data) {
      setWorkTimeSummary(null);
      setWorkTimeError(false);
      setWorkTimeBusy(false);
      return;
    }
    setWorkTimeSummary(null);
    setWorkTimeError(false);
    let cancelled = false;
    setWorkTimeBusy(true);
    const now = new Date();
    const from = isoDateLocal(new Date(now.getFullYear(), now.getMonth(), 1));
    const to = isoDateLocal(now);
    void (async () => {
      try {
        const qs = new URLSearchParams({ from, to, projectId }).toString();
        const res = await fetch(`/api/web/work-time/entries?${qs}`, {
          credentials: "include",
          cache: "no-store",
        });
        const text = await res.text();
        const json = parseResponseJson(text);
        const parsed = workTimeEntriesListResponseSchema.safeParse(json);
        if (!res.ok || !parsed.success || cancelled) {
          if (!cancelled) setWorkTimeError(true);
          return;
        }

        const entries = parsed.data.entries;
        const totalMinutes = entries.reduce(
          (sum, e) => sum + (Number.isFinite(e.durationMinutes) ? e.durationMinutes : 0),
          0,
        );

        const employeeNameById = new Map<string, string>();
        if (entries.length > 0) {
          try {
            const empRes = await fetch("/api/web/employees?limit=200", {
              credentials: "include",
              cache: "no-store",
            });
            const empText = await empRes.text();
            const empJson = parseResponseJson(empText);
            const empParsed = employeesListResponseSchema.safeParse(empJson);
            if (empRes.ok && empParsed.success) {
              for (const e of empParsed.data.employees) {
                employeeNameById.set(e.id, e.displayName);
              }
            }
          } catch {
            // optional
          }
        }

        const lastEntries = [...entries]
          .sort((a, b) => {
            const cmpDate = a.workDate.localeCompare(b.workDate);
            if (cmpDate !== 0) return cmpDate;
            return a.createdAt.localeCompare(b.createdAt);
          })
          .slice(-5)
          .reverse()
          .map((e) => ({
            id: e.id,
            workDate: e.workDate,
            durationMinutes: e.durationMinutes,
            employeeName: employeeNameById.get(e.employeeId) ?? null,
            notes: e.notes,
          }));

        if (!cancelled) {
          setWorkTimeSummary({ totalMinutes, entries: lastEntries });
        }
      } catch {
        if (!cancelled) setWorkTimeError(true);
      } finally {
        if (!cancelled) setWorkTimeBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [data, projectId]);

  useEffect(() => {
    if (!data) {
      setOpenItems(null);
      setOpenItemsError(false);
      setOpenItemsBusy(false);
      return;
    }
    setOpenItems(null);
    setOpenItemsError(false);
    let cancelled = false;
    setOpenItemsBusy(true);
    void (async () => {
      try {
        const qs = new URLSearchParams({
          projectId,
          sortBy: "dueAt",
          sortDir: "asc",
          limit: "5",
          offset: "0",
        }).toString();
        const res = await fetch(`/api/web/sales/invoices/open-items?${qs}`, {
          credentials: "include",
          cache: "no-store",
        });
        const text = await res.text();
        const json = parseResponseJson(text);
        const parsed = salesOpenInvoicesListResponseSchema.safeParse(json);
        if (!res.ok || !parsed.success || cancelled) {
          if (!cancelled) setOpenItemsError(true);
          return;
        }
        const baseRows = parsed.data.invoices.map((i) => ({
          id: i.id,
          documentNumber: i.documentNumber,
          customerLabel: i.customerLabel,
          dueAt: i.dueAt,
          currency: i.currency,
          balanceCents: i.balanceCents,
          reminderCount: 0,
          maxReminderLevel: null as number | null,
          latestReminderId: null as string | null,
        }));
        const enriched = await Promise.all(
          baseRows.map(async (row) => {
            try {
              const dRes = await fetch(
                `/api/web/sales/invoices/${encodeURIComponent(row.id)}`,
                { credentials: "include", cache: "no-store" },
              );
              const dText = await dRes.text();
              const dJson = parseResponseJson(dText);
              const dParsed = salesInvoiceDetailResponseSchema.safeParse(dJson);
              if (!dRes.ok || !dParsed.success) return row;
              const rem = dParsed.data.invoice.reminders;
              if (rem.length === 0) return row;
              const maxLevel = Math.max(...rem.map((r) => r.level));
              const latest = [...rem].sort(
                (a, b) =>
                  new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
              )[0];
              return {
                ...row,
                reminderCount: rem.length,
                maxReminderLevel: maxLevel,
                latestReminderId: latest?.id ?? null,
              };
            } catch {
              return row;
            }
          }),
        );
        if (!cancelled) {
          setOpenItems({ total: parsed.data.total, invoices: enriched });
        }
      } catch {
        if (!cancelled) setOpenItemsError(true);
      } finally {
        if (!cancelled) setOpenItemsBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [data, projectId]);

  const upload = useCallback(async () => {
    setUploadError(null);
    if (!uploadFile) return;
    setUploadBusy(true);
    try {
      const formData = new FormData();
      formData.set("file", uploadFile);
      formData.set("kind", uploadKind);
      const res = await fetch(`/api/web/projects/${encodeURIComponent(projectId)}/assets`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const text = await res.text();
      const json = parseResponseJson(text);
      const parsed = projectAssetUploadResponseSchema.safeParse(json);
      if (!res.ok || !parsed.success) {
        throw new Error("upload_failed");
      }
      setUploadFile(null);
      await load();
    } catch {
      setUploadError(copy.uploadError);
    } finally {
      setUploadBusy(false);
    }
  }, [copy.uploadError, load, projectId, uploadFile, uploadKind]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href="/web/projects">
            <ArrowLeft className="mr-2 size-4" aria-hidden />
            {copy.back}
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/web/sales">
              <ReceiptText className="mr-2 size-4" aria-hidden />
              {copy.openSales}
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/web/painter/digital-project-folders">
              <FolderOpen className="mr-2 size-4" aria-hidden />
              {copy.openFolders}
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/web/painter/gaeb-support">
              <FileText className="mr-2 size-4" aria-hidden />
              {copy.openGaeb}
            </Link>
          </Button>
        </div>
      </div>

      {error ? (
        <Alert>
          <AlertTitle>{copy.title}</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{error}</span>
            <Button type="button" variant="outline" onClick={() => void load()} disabled={busy}>
              {busy ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden /> : null}
              {copy.retry}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {notFound ? (
        <Alert>
          <AlertTitle>{copy.notFoundTitle}</AlertTitle>
          <AlertDescription>{copy.notFoundHint}</AlertDescription>
        </Alert>
      ) : null}

      {busy ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-56" />
          <div className="grid gap-3 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Card key={i} className="border-border/80 bg-muted/15 shadow-none">
                <CardHeader>
                  <Skeleton className="h-5 w-40" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-[90%]" />
                  <Skeleton className="h-4 w-[70%]" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : data ? (
        <div className="space-y-4">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">{data.project.title}</h1>
            <p className="text-sm text-muted-foreground">
              {copy.title} · {projectId}
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <Card className="border-border/80 bg-muted/15 shadow-none">
              <CardHeader>
                <CardTitle className="text-base">{copy.masterData}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-[140px_1fr] gap-2">
                  <div className="text-muted-foreground">{copy.projectNumber}</div>
                  <div>{data.project.projectNumber ?? copy.none}</div>
                  <div className="text-muted-foreground">{copy.status}</div>
                  <div>{formatProjectStatus(locale, data.project.status)}</div>
                  <div className="text-muted-foreground">{copy.customer}</div>
                  <div>{data.project.customerLabel ?? copy.none}</div>
                  <div className="text-muted-foreground">{copy.siteAddress}</div>
                  <div>{data.siteAddressLabel ?? copy.none}</div>
                  <div className="text-muted-foreground">{copy.period}</div>
                  <div>
                    {data.project.startDate ?? copy.none} {"→"}{" "}
                    {data.project.endDate ?? copy.none}
                  </div>
                  <div className="text-muted-foreground">{copy.updatedAt}</div>
                  <div className="tabular-nums">
                    {dateTimeFmt.format(new Date(data.project.updatedAt))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-muted/15 shadow-none">
              <CardHeader>
                <CardTitle className="text-base">{copy.quotes}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {data.quotes.length === 0 ? (
                  <p className="text-muted-foreground">{copy.noQuotes}</p>
                ) : (
                  <ul className="space-y-2">
                    {data.quotes.map((q) => (
                      <li key={q.id} className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={`/web/sales/quotes/${q.id}`}
                            className="rounded-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            {q.documentNumber}
                          </Link>
                          <div className="text-xs text-muted-foreground">
                            {q.status} · {dateTimeFmt.format(new Date(q.updatedAt))}
                          </div>
                        </div>
                        <div className="shrink-0 tabular-nums text-right text-xs text-muted-foreground">
                          {formatMinorCurrency(q.totalCents, q.currency, locale)}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="pt-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/web/sales/quotes">{copy.quotes}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-muted/15 shadow-none">
              <CardHeader>
                <CardTitle className="text-base">{copy.invoices}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {data.invoices.length === 0 ? (
                  <p className="text-muted-foreground">{copy.noInvoices}</p>
                ) : (
                  <ul className="space-y-2">
                    {data.invoices.map((i) => (
                      <li key={i.id} className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={`/web/sales/invoices/${i.id}`}
                            className="rounded-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            {i.documentNumber}
                          </Link>
                          <div className="text-xs text-muted-foreground">
                            {i.status} · {dateTimeFmt.format(new Date(i.updatedAt))}
                          </div>
                        </div>
                        <div className="shrink-0 tabular-nums text-right text-xs text-muted-foreground">
                          {formatMinorCurrency(i.totalCents, i.currency, locale)}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="pt-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/web/sales/invoices">{copy.invoices}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <Card className="border-border/80 bg-muted/15 shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="size-4" aria-hidden />
                  {copy.scheduling}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-xs text-muted-foreground">{copy.schedulingHint}</p>
                {schedulingBusy || schedulingWeek === null ? (
                  <p className="text-muted-foreground">
                    {locale === "en" ? "Loading…" : "Lädt…"}
                  </p>
                ) : schedulingWeek.length === 0 ? (
                  <p className="text-muted-foreground">{copy.noSchedulingWeek}</p>
                ) : (
                  <ul className="space-y-1">
                    {schedulingWeek.map((a) => (
                      <li key={a.id} className="text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {formatYmd(locale, a.date)}
                        </span>
                        {" · "}
                        <span className="font-medium text-foreground tabular-nums">
                          {a.startTime}
                        </span>
                        {" · "}
                        {a.title}
                      </li>
                    ))}
                  </ul>
                )}
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={`/web/scheduling?project=${encodeURIComponent(projectId)}`}
                  >
                    {copy.schedulingOpen}
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-muted/15 shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="size-4" aria-hidden />
                  {copy.workTime}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-xs text-muted-foreground">{copy.workTimeHint}</p>
                {workTimeBusy ? (
                  <p className="text-muted-foreground">
                    {locale === "en" ? "Loading…" : "Lädt…"}
                  </p>
                ) : workTimeError ? (
                  <p className="text-muted-foreground">{copy.workTimeLoadError}</p>
                ) : !workTimeSummary ? (
                  <p className="text-muted-foreground">
                    {locale === "en" ? "Loading…" : "Lädt…"}
                  </p>
                ) : workTimeSummary.totalMinutes <= 0 ? (
                  <p className="text-muted-foreground">{copy.workTimeEmpty}</p>
                ) : (
                  <>
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="text-xs text-muted-foreground">
                        {locale === "en" ? "Total" : "Summe"}
                      </div>
                      <div className="font-medium tabular-nums text-foreground">
                        {formatDuration(locale, workTimeSummary.totalMinutes)}
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {workTimeSummary.entries.map((e) => (
                        <li
                          key={e.id}
                          className="flex items-start justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium text-foreground tabular-nums">
                                {formatYmd(locale, e.workDate)}
                              </span>
                              {e.employeeName ? ` · ${e.employeeName}` : null}
                            </div>
                            {e.notes ? (
                              <div className="truncate text-xs text-muted-foreground">
                                {e.notes}
                              </div>
                            ) : null}
                          </div>
                          <div className="shrink-0 tabular-nums text-right text-xs text-muted-foreground">
                            {formatDuration(locale, e.durationMinutes)}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <Button variant="outline" size="sm" asChild>
                  <Link href="/web/work-time">{copy.workTimeOpen}</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-muted/15 shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ReceiptText className="size-4" aria-hidden />
                  {copy.receivables}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-xs text-muted-foreground">{copy.receivablesHint}</p>
                {openItemsBusy ? (
                  <p className="text-muted-foreground">
                    {locale === "en" ? "Loading…" : "Lädt…"}
                  </p>
                ) : openItemsError ? (
                  <p className="text-muted-foreground">{copy.receivablesLoadError}</p>
                ) : !openItems ? (
                  <p className="text-muted-foreground">
                    {locale === "en" ? "Loading…" : "Lädt…"}
                  </p>
                ) : openItems.total === 0 ? (
                  <p className="text-muted-foreground">{copy.receivablesEmpty}</p>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      {openItems.total}{" "}
                      {locale === "en" ? "open items" : "offene Posten"}
                    </p>
                    <ul className="space-y-2">
                      {openItems.invoices.map((i) => (
                        <li key={i.id} className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Link
                              href={`/web/sales/invoices/${i.id}#invoice-reminders`}
                              className="rounded-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                              {i.documentNumber}
                            </Link>
                            <div className="text-xs text-muted-foreground">
                              {i.dueAt ? dateFmt.format(new Date(i.dueAt)) : copy.none}
                              {" · "}
                              {i.customerLabel}
                            </div>
                            {i.reminderCount > 0 &&
                            i.maxReminderLevel != null &&
                            i.latestReminderId ? (
                              <>
                                <div className="text-xs text-muted-foreground">
                                  {copy.receivablesRemindersLine(
                                    i.reminderCount,
                                    i.maxReminderLevel,
                                  )}
                                </div>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  <Button variant="outline" size="xs" asChild>
                                    <Link
                                      href={`/web/sales/invoices/${encodeURIComponent(i.id)}/reminders/${encodeURIComponent(i.latestReminderId)}/print`}
                                    >
                                      {copy.receivablesReminderPrint}
                                    </Link>
                                  </Button>
                                  <Button variant="outline" size="xs" asChild>
                                    <a
                                      href={`/api/web/sales/invoices/${encodeURIComponent(i.id)}/reminders/${encodeURIComponent(i.latestReminderId)}/pdf`}
                                    >
                                      {copy.receivablesReminderPdf}
                                    </a>
                                  </Button>
                                </div>
                              </>
                            ) : null}
                          </div>
                          <div className="shrink-0 tabular-nums text-right text-xs text-muted-foreground">
                            {formatMinorCurrency(i.balanceCents, i.currency, locale)}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={`/web/sales/invoices/open?projectId=${encodeURIComponent(projectId)}`}
                  >
                    {copy.receivablesOpen}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <Card className="border-border/80 bg-muted/15 shadow-none">
              <CardHeader>
                <CardTitle className="text-base">{copy.files}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {data.assets.length === 0 ? (
                  <p className="text-muted-foreground">{copy.noAssets}</p>
                ) : (
                  <ul className="space-y-2">
                    {data.assets.map((a) => (
                      <li key={a.id} className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <a
                            href={`/api/web/projects/${encodeURIComponent(projectId)}/assets/${encodeURIComponent(a.id)}`}
                            className="rounded-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            {a.filename}
                          </a>
                          <div className="text-xs text-muted-foreground">
                            {a.kind} · {formatBytes(a.byteSize)} ·{" "}
                            {dateTimeFmt.format(new Date(a.createdAt))}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="rounded-md border bg-background p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-medium">{copy.uploadTitle}</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void load()}
                      disabled={busy || uploadBusy}
                    >
                      {busy ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden /> : null}
                      {copy.retry}
                    </Button>
                  </div>

                  {uploadError ? (
                    <Alert className="mb-3">
                      <AlertTitle>{copy.files}</AlertTitle>
                      <AlertDescription>{uploadError}</AlertDescription>
                    </Alert>
                  ) : null}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="project-hub-upload-kind">{copy.uploadKind}</Label>
                      <select
                        id="project-hub-upload-kind"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={uploadKind}
                        onChange={(e) => {
                          const parsed = projectAssetKindSchema.safeParse(e.target.value);
                          if (parsed.success) {
                            setUploadKind(parsed.data);
                          }
                        }}
                        disabled={uploadBusy}
                      >
                        {projectAssetKindSchema.options.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="project-hub-upload-file">{copy.uploadFile}</Label>
                      <Input
                        id="project-hub-upload-file"
                        type="file"
                        onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                        disabled={uploadBusy}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-end">
                    <Button
                      type="button"
                      onClick={() => void upload()}
                      disabled={!uploadFile || uploadBusy}
                    >
                      {uploadBusy ? (
                        <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                      ) : (
                        <Upload className="mr-2 size-4" aria-hidden />
                      )}
                      {uploadBusy ? copy.uploadBusy : copy.uploadAction}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-muted/15 shadow-none">
              <CardHeader>
                <CardTitle className="text-base">{copy.gaeb}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {data.gaebDocuments.length === 0 ? (
                  <p className="text-muted-foreground">{copy.noGaeb}</p>
                ) : (
                  <ul className="space-y-2">
                    {data.gaebDocuments.slice(0, 8).map((d) => (
                      <li key={d.id} className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link
                            href={`/web/painter/gaeb-support`}
                            className="rounded-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          >
                            {d.filename}
                          </Link>
                          <div className="text-xs text-muted-foreground">
                            {d.status} · {dateTimeFmt.format(new Date(d.updatedAt))}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="pt-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/web/painter/gaeb-support">{copy.openGaeb}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}

