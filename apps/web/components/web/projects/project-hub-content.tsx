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
  projectHubResponseSchema,
  projectAssetKindSchema,
  projectAssetUploadResponseSchema,
  type Project,
  type ProjectAssetKind,
} from "@repo/api-contracts";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/alert";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/card";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Skeleton } from "@repo/ui/skeleton";

import type { Locale } from "@/lib/i18n/locale";
import { formatMinorCurrency } from "@/lib/money-format";
import { parseResponseJson } from "@/lib/parse-response-json";

type HubData = {
  project: Project;
  siteAddressLabel: string | null;
  quotes: {
    id: string;
    documentNumber: string;
    status: string;
    currency: string;
    totalCents: number;
    updatedAt: string;
  }[];
  invoices: {
    id: string;
    documentNumber: string;
    status: string;
    billingType: "invoice" | "partial" | "final" | "credit_note";
    currency: string;
    totalCents: number;
    dueAt: string | null;
    updatedAt: string;
  }[];
  assets: {
    id: string;
    filename: string;
    kind: ProjectAssetKind;
    byteSize: number;
    createdAt: string;
  }[];
  gaebDocuments: {
    id: string;
    filename: string;
    status: "pending_review" | "failed" | "approved";
    updatedAt: string;
  }[];
  schedulingWeek: { id: string; date: string; startTime: string; title: string }[];
  workTimeSummary: {
    totalMinutes: number;
    entries: {
      id: string;
      workDate: string;
      durationMinutes: number;
      employeeName: string | null;
      notes: string | null;
    }[];
  };
  openItems: {
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
  };
  pipeline: {
    quotes: {
      draft: number;
      sent: number;
      accepted: number;
      rejected: number;
      expired: number;
    };
    invoices: {
      draft: number;
      sent: number;
      overdue: number;
      paid: number;
    };
    progress: {
      quotesSentOrLaterPercent: number;
      quotesAcceptedPercent: number;
      quotesAcceptedFromSentPercent: number;
      invoicesIssuedPercent: number;
      invoicesPaidFromIssuedPercent: number;
      invoicesOverdueFromIssuedPercent: number;
    };
  };
  kpis: {
    quoteCount: number;
    quoteVolumeCents: number;
    acceptedQuoteCount: number;
    quoteAcceptanceRatePercent: number;
    invoiceCount: number;
    invoiceVolumeCents: number;
    paidInvoiceCount: number;
    paidInvoiceRatePercent: number;
    openBalanceCents: number;
    overdueOpenCount: number;
    next7AssignmentsCount: number;
    workTimeMinutesMonthToDate: number;
  };
  segments: {
    last30Days: {
      quoteCount: number;
      quoteVolumeCents: number;
      acceptedQuoteCount: number;
      quoteAcceptanceRatePercent: number;
      invoiceCount: number;
      invoiceVolumeCents: number;
      paidInvoiceCount: number;
      paidInvoiceRatePercent: number;
      paymentReceivedCents: number;
    };
    previous30Days: {
      quoteCount: number;
      quoteVolumeCents: number;
      acceptedQuoteCount: number;
      quoteAcceptanceRatePercent: number;
      invoiceCount: number;
      invoiceVolumeCents: number;
      paidInvoiceCount: number;
      paidInvoiceRatePercent: number;
      paymentReceivedCents: number;
    };
    trends: {
      quoteCountDeltaPercent: number | null;
      quoteVolumeDeltaPercent: number | null;
      quoteAcceptanceRateDeltaPercent: number | null;
      invoiceCountDeltaPercent: number | null;
      invoiceVolumeDeltaPercent: number | null;
      paymentReceivedDeltaPercent: number | null;
      paidInvoiceRateDeltaPercent: number | null;
    };
  };
};

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

function formatDuration(locale: Locale, minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (locale === "en") {
    return `${h}h ${m}m`;
  }
  return `${h} Std. ${m} Min.`;
}

function formatPercent(locale: Locale, value: number): string {
  const tag = locale === "en" ? "en-GB" : "de-DE";
  return `${value.toLocaleString(tag, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}%`;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function formatDeltaPercent(locale: Locale, value: number | null): string {
  if (value == null || !Number.isFinite(value)) {
    return locale === "en" ? "n/a" : "k. A.";
  }
  const tag = locale === "en" ? "en-GB" : "de-DE";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toLocaleString(tag, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}%`;
}

function deltaToneClass(value: number | null): string {
  if (value == null || !Number.isFinite(value) || value === 0) return "text-muted-foreground";
  return value > 0 ? "text-emerald-600" : "text-rose-600";
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
            kpiTitle: "Pipeline and KPIs",
            kpiSummaryHint:
              "Cash position first, then volumes, pipeline status, and recent trends.",
            kpiSectionOverview: "Key figures",
            kpiSectionRates: "Conversion",
            kpiSectionOperations: "Operations",
            pipelineTitle: "Mini pipeline",
            pipelineProgressBlock: "Progress",
            pipelineStatusBlock: "Status counts",
            pipelineQuotes: "Quotes",
            pipelineInvoices: "Invoices",
            pipelineDraft: "Draft",
            pipelineSent: "Sent",
            pipelineAccepted: "Accepted",
            pipelineRejected: "Rejected",
            pipelineExpired: "Expired",
            pipelineOverdue: "Overdue",
            pipelinePaid: "Paid",
            pipelineProgressSent: "Sent or later",
            pipelineProgressAcceptedTotal: "Accepted (total)",
            pipelineProgressAcceptedAfterSent: "Accepted after sent",
            pipelineProgressIssued: "Issued (not draft)",
            pipelineProgressPaidAfterIssued: "Paid after issued",
            pipelineProgressOverdueAfterIssued: "Overdue after issued",
            kpiQuotes: "Quotes",
            kpiInvoices: "Invoices",
            kpiQuoteAcceptance: "Quote acceptance",
            kpiInvoicePaidRate: "Paid invoices",
            kpiOpenBalance: "Open balance",
            kpiOverdue: "Overdue open items",
            kpiAssignments: "Assignments (7 days)",
            kpiWorkTime: "Work time (month to date)",
            segmentTitle: "30-day segments and trends",
            segmentLast30: "Last 30 days",
            segmentPrevious30: "Previous 30 days",
            segmentPaymentReceived: "Payments received",
            segmentTrendTitle: "Trend vs previous 30 days",
            trendQuoteCount: "Quotes",
            trendQuoteVolume: "Quote volume",
            trendQuoteAcceptance: "Quote acceptance",
            trendInvoiceCount: "Invoices",
            trendInvoiceVolume: "Invoice volume",
            trendPaidInvoiceRate: "Paid invoice rate",
            trendPaymentReceived: "Payments received",
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
            kpiTitle: "Pipeline und KPIs",
            kpiSummaryHint:
              "Zuerst Liquiditaet, dann Volumina, Pipeline-Status und juengste Trends.",
            kpiSectionOverview: "Kernzahlen",
            kpiSectionRates: "Quoten",
            kpiSectionOperations: "Betrieb",
            pipelineTitle: "Mini-Pipeline",
            pipelineProgressBlock: "Fortschritt",
            pipelineStatusBlock: "Stufenzaehler",
            pipelineQuotes: "Angebote",
            pipelineInvoices: "Rechnungen",
            pipelineDraft: "Entwurf",
            pipelineSent: "Versendet",
            pipelineAccepted: "Angenommen",
            pipelineRejected: "Abgelehnt",
            pipelineExpired: "Abgelaufen",
            pipelineOverdue: "Ueberfaellig",
            pipelinePaid: "Bezahlt",
            pipelineProgressSent: "Versendet oder weiter",
            pipelineProgressAcceptedTotal: "Angenommen (gesamt)",
            pipelineProgressAcceptedAfterSent: "Angenommen nach Versand",
            pipelineProgressIssued: "In Rechnung gestellt (ohne Entwurf)",
            pipelineProgressPaidAfterIssued: "Bezahlt nach Versand",
            pipelineProgressOverdueAfterIssued: "Ueberfaellig nach Versand",
            kpiQuotes: "Angebote",
            kpiInvoices: "Rechnungen",
            kpiQuoteAcceptance: "Angebotsquote",
            kpiInvoicePaidRate: "Bezahlt-Quote",
            kpiOpenBalance: "Offener Saldo",
            kpiOverdue: "Ueberfaellige OP",
            kpiAssignments: "Einsaetze (7 Tage)",
            kpiWorkTime: "Zeiten (Monat bis heute)",
            segmentTitle: "30-Tage-Segmente und Trends",
            segmentLast30: "Letzte 30 Tage",
            segmentPrevious30: "Vorherige 30 Tage",
            segmentPaymentReceived: "Zahlungseingaenge",
            segmentTrendTitle: "Trend vs. vorherige 30 Tage",
            trendQuoteCount: "Angebote",
            trendQuoteVolume: "Angebotsvolumen",
            trendQuoteAcceptance: "Angebotsquote",
            trendInvoiceCount: "Rechnungen",
            trendInvoiceVolume: "Rechnungsvolumen",
            trendPaidInvoiceRate: "Bezahlt-Quote",
            trendPaymentReceived: "Zahlungseingaenge",
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

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    setNotFound(false);
    setData(null);
    try {
      const res = await fetch(`/api/web/projects/${encodeURIComponent(projectId)}/hub`, {
        credentials: "include",
        cache: "no-store",
      });
      const text = await res.text();
      const json = parseResponseJson(text);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      const hubParsed = projectHubResponseSchema.safeParse(json);
      if (!res.ok || !hubParsed.success) {
        throw new Error("load_failed");
      }
      const hub = hubParsed.data;

      setData({
        project: hub.project,
        siteAddressLabel: hub.siteAddressLabel,
        quotes: hub.quotes,
        invoices: hub.invoices,
        assets: hub.assets,
        gaebDocuments: hub.gaebDocuments,
        schedulingWeek: hub.schedulingWeek,
        workTimeSummary: hub.workTime,
        openItems: hub.receivables,
        pipeline: hub.pipeline,
        kpis: hub.kpis,
        segments: hub.segments,
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

          <Card className="border-border/80 bg-muted/15 shadow-none">
            <CardHeader className="space-y-1 pb-2 sm:pb-3">
              <CardTitle className="text-base">{copy.kpiTitle}</CardTitle>
              <CardDescription className="text-xs leading-relaxed sm:text-sm">
                {copy.kpiSummaryHint}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-sm">
              <section className="space-y-2" aria-labelledby="hub-kpi-overview-heading">
                <h2
                  id="hub-kpi-overview-heading"
                  className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {copy.kpiSectionOverview}
                </h2>
                <div
                  className="flex max-sm:snap-x max-sm:snap-mandatory gap-3 max-sm:overflow-x-auto max-sm:pb-1 max-sm:-mx-1 max-sm:px-1 sm:grid sm:grid-cols-3"
                  role="list"
                >
                  <div
                    role="listitem"
                    className="min-w-[min(100%,17.5rem)] max-sm:snap-center max-sm:shrink-0 sm:min-w-0 rounded-md border border-border/80 bg-background/50 p-3 shadow-sm"
                  >
                    <div className="text-xs text-muted-foreground">{copy.kpiOpenBalance}</div>
                    <div className="text-base font-semibold tabular-nums tracking-tight sm:text-lg">
                      {formatMinorCurrency(data.kpis.openBalanceCents, "EUR", locale)}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {copy.kpiOverdue}:{" "}
                      <span className="tabular-nums text-foreground">
                        {data.kpis.overdueOpenCount}
                      </span>
                    </div>
                  </div>
                  <div
                    role="listitem"
                    className="min-w-[min(100%,17.5rem)] max-sm:snap-center max-sm:shrink-0 sm:min-w-0 rounded-md border bg-background/40 p-3"
                  >
                    <div className="text-xs text-muted-foreground">{copy.kpiQuotes}</div>
                    <div className="font-medium tabular-nums">
                      {data.kpis.quoteCount} ·{" "}
                      {formatMinorCurrency(data.kpis.quoteVolumeCents, "EUR", locale)}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {copy.pipelineAccepted}: {data.kpis.acceptedQuoteCount}
                    </div>
                  </div>
                  <div
                    role="listitem"
                    className="min-w-[min(100%,17.5rem)] max-sm:snap-center max-sm:shrink-0 sm:min-w-0 rounded-md border bg-background/40 p-3"
                  >
                    <div className="text-xs text-muted-foreground">{copy.kpiInvoices}</div>
                    <div className="font-medium tabular-nums">
                      {data.kpis.invoiceCount} ·{" "}
                      {formatMinorCurrency(data.kpis.invoiceVolumeCents, "EUR", locale)}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {copy.pipelinePaid}: {data.kpis.paidInvoiceCount}
                    </div>
                  </div>
                </div>
              </section>

              <div className="h-px bg-border/60" aria-hidden />

              <section className="space-y-2" aria-labelledby="hub-kpi-rates-heading">
                <h2
                  id="hub-kpi-rates-heading"
                  className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {copy.kpiSectionRates}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border bg-background/40 p-3">
                    <div className="text-xs text-muted-foreground">{copy.kpiQuoteAcceptance}</div>
                    <div className="text-base font-semibold tabular-nums sm:text-lg">
                      {formatPercent(locale, data.kpis.quoteAcceptanceRatePercent)}
                    </div>
                  </div>
                  <div className="rounded-md border bg-background/40 p-3">
                    <div className="text-xs text-muted-foreground">{copy.kpiInvoicePaidRate}</div>
                    <div className="text-base font-semibold tabular-nums sm:text-lg">
                      {formatPercent(locale, data.kpis.paidInvoiceRatePercent)}
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-2" aria-labelledby="hub-kpi-ops-heading">
                <h2
                  id="hub-kpi-ops-heading"
                  className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {copy.kpiSectionOperations}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border bg-background/40 p-3">
                    <div className="text-xs text-muted-foreground">{copy.kpiAssignments}</div>
                    <div className="font-medium tabular-nums">{data.kpis.next7AssignmentsCount}</div>
                  </div>
                  <div className="rounded-md border bg-background/40 p-3">
                    <div className="text-xs text-muted-foreground">{copy.kpiWorkTime}</div>
                    <div className="font-medium tabular-nums">
                      {formatDuration(locale, data.kpis.workTimeMinutesMonthToDate)}
                    </div>
                  </div>
                </div>
              </section>

              <div className="h-px bg-border/60" aria-hidden />

              <section className="space-y-3 rounded-md border bg-background/40 p-3 sm:p-4">
                <h2 className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                  {copy.pipelineTitle}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border border-border/70 bg-background/60 p-2.5 sm:p-3">
                    <div className="mb-2 text-xs font-medium text-foreground">
                      {copy.pipelineQuotes}
                    </div>
                    <div className="space-y-2">
                      <div>
                        <div className="mb-1 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                          {copy.pipelineProgressBlock}
                        </div>
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="text-muted-foreground">
                                {copy.pipelineProgressSent}
                              </span>
                              <span className="tabular-nums">
                                {formatPercent(
                                  locale,
                                  data.pipeline.progress.quotesSentOrLaterPercent,
                                )}
                              </span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded bg-muted">
                              <div
                                className="h-full bg-primary"
                                style={{
                                  width: `${clampPercent(data.pipeline.progress.quotesSentOrLaterPercent)}%`,
                                }}
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="text-muted-foreground">
                                {copy.pipelineProgressAcceptedTotal}
                              </span>
                              <span className="tabular-nums">
                                {formatPercent(
                                  locale,
                                  data.pipeline.progress.quotesAcceptedPercent,
                                )}
                              </span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded bg-muted">
                              <div
                                className="h-full bg-primary/80"
                                style={{
                                  width: `${clampPercent(data.pipeline.progress.quotesAcceptedPercent)}%`,
                                }}
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="text-muted-foreground">
                                {copy.pipelineProgressAcceptedAfterSent}
                              </span>
                              <span className="tabular-nums">
                                {formatPercent(
                                  locale,
                                  data.pipeline.progress.quotesAcceptedFromSentPercent,
                                )}
                              </span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded bg-muted">
                              <div
                                className="h-full bg-primary/70"
                                style={{
                                  width: `${clampPercent(data.pipeline.progress.quotesAcceptedFromSentPercent)}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                          {copy.pipelineStatusBlock}
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                          <span>{copy.pipelineDraft}</span>
                          <span className="text-right tabular-nums">
                            {data.pipeline.quotes.draft}
                          </span>
                          <span>{copy.pipelineSent}</span>
                          <span className="text-right tabular-nums">
                            {data.pipeline.quotes.sent}
                          </span>
                          <span>{copy.pipelineAccepted}</span>
                          <span className="text-right tabular-nums">
                            {data.pipeline.quotes.accepted}
                          </span>
                          <span>{copy.pipelineRejected}</span>
                          <span className="text-right tabular-nums">
                            {data.pipeline.quotes.rejected}
                          </span>
                          <span>{copy.pipelineExpired}</span>
                          <span className="text-right tabular-nums">
                            {data.pipeline.quotes.expired}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-md border border-border/70 bg-background/60 p-2.5 sm:p-3">
                    <div className="mb-2 text-xs font-medium text-foreground">
                      {copy.pipelineInvoices}
                    </div>
                    <div className="space-y-2">
                      <div>
                        <div className="mb-1 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                          {copy.pipelineProgressBlock}
                        </div>
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="text-muted-foreground">
                                {copy.pipelineProgressIssued}
                              </span>
                              <span className="tabular-nums">
                                {formatPercent(locale, data.pipeline.progress.invoicesIssuedPercent)}
                              </span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded bg-muted">
                              <div
                                className="h-full bg-primary"
                                style={{
                                  width: `${clampPercent(data.pipeline.progress.invoicesIssuedPercent)}%`,
                                }}
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="text-muted-foreground">
                                {copy.pipelineProgressPaidAfterIssued}
                              </span>
                              <span className="tabular-nums">
                                {formatPercent(
                                  locale,
                                  data.pipeline.progress.invoicesPaidFromIssuedPercent,
                                )}
                              </span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded bg-muted">
                              <div
                                className="h-full bg-primary/80"
                                style={{
                                  width: `${clampPercent(data.pipeline.progress.invoicesPaidFromIssuedPercent)}%`,
                                }}
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="text-muted-foreground">
                                {copy.pipelineProgressOverdueAfterIssued}
                              </span>
                              <span className="tabular-nums">
                                {formatPercent(
                                  locale,
                                  data.pipeline.progress.invoicesOverdueFromIssuedPercent,
                                )}
                              </span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded bg-muted">
                              <div
                                className="h-full bg-primary/70"
                                style={{
                                  width: `${clampPercent(data.pipeline.progress.invoicesOverdueFromIssuedPercent)}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                          {copy.pipelineStatusBlock}
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                          <span>{copy.pipelineDraft}</span>
                          <span className="text-right tabular-nums">
                            {data.pipeline.invoices.draft}
                          </span>
                          <span>{copy.pipelineSent}</span>
                          <span className="text-right tabular-nums">
                            {data.pipeline.invoices.sent}
                          </span>
                          <span>{copy.pipelineOverdue}</span>
                          <span className="text-right tabular-nums">
                            {data.pipeline.invoices.overdue}
                          </span>
                          <span>{copy.pipelinePaid}</span>
                          <span className="text-right tabular-nums">
                            {data.pipeline.invoices.paid}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-3 rounded-md border bg-background/40 p-3 sm:p-4">
                <h2 className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                  {copy.segmentTitle}
                </h2>
                <div className="flex max-sm:snap-x max-sm:snap-mandatory gap-3 max-sm:overflow-x-auto max-sm:pb-1 max-sm:-mx-1 max-sm:px-1 sm:grid sm:grid-cols-2">
                  <div className="min-w-[min(100%,18rem)] max-sm:snap-center max-sm:shrink-0 sm:min-w-0 rounded-md border border-border/70 bg-background/60 p-2.5 sm:p-3">
                    <div className="mb-2 text-xs font-medium text-muted-foreground">
                      {copy.segmentLast30}
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex flex-col gap-0.5 min-[380px]:flex-row min-[380px]:items-center min-[380px]:justify-between min-[380px]:gap-2">
                        <span className="shrink-0 text-muted-foreground">{copy.kpiQuotes}</span>
                        <span className="min-w-0 wrap-break-word text-right tabular-nums">
                          {data.segments.last30Days.quoteCount} ·{" "}
                          {formatMinorCurrency(
                            data.segments.last30Days.quoteVolumeCents,
                            "EUR",
                            locale,
                          )}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5 min-[380px]:flex-row min-[380px]:items-center min-[380px]:justify-between min-[380px]:gap-2">
                        <span className="shrink-0 text-muted-foreground">
                          {copy.kpiQuoteAcceptance}
                        </span>
                        <span className="tabular-nums">
                          {formatPercent(
                            locale,
                            data.segments.last30Days.quoteAcceptanceRatePercent,
                          )}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5 min-[380px]:flex-row min-[380px]:items-center min-[380px]:justify-between min-[380px]:gap-2">
                        <span className="shrink-0 text-muted-foreground">{copy.kpiInvoices}</span>
                        <span className="min-w-0 wrap-break-word text-right tabular-nums">
                          {data.segments.last30Days.invoiceCount} ·{" "}
                          {formatMinorCurrency(
                            data.segments.last30Days.invoiceVolumeCents,
                            "EUR",
                            locale,
                          )}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5 min-[380px]:flex-row min-[380px]:items-center min-[380px]:justify-between min-[380px]:gap-2">
                        <span className="shrink-0 text-muted-foreground">
                          {copy.kpiInvoicePaidRate}
                        </span>
                        <span className="min-w-0 text-right tabular-nums">
                          {data.segments.last30Days.paidInvoiceCount} ·{" "}
                          {formatPercent(locale, data.segments.last30Days.paidInvoiceRatePercent)}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5 min-[380px]:flex-row min-[380px]:items-center min-[380px]:justify-between min-[380px]:gap-2">
                        <span className="shrink-0 text-muted-foreground">
                          {copy.segmentPaymentReceived}
                        </span>
                        <span className="min-w-0 wrap-break-word text-right tabular-nums">
                          {formatMinorCurrency(
                            data.segments.last30Days.paymentReceivedCents,
                            "EUR",
                            locale,
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="min-w-[min(100%,18rem)] max-sm:snap-center max-sm:shrink-0 sm:min-w-0 rounded-md border border-border/70 bg-background/60 p-2.5 sm:p-3">
                    <div className="mb-2 text-xs font-medium text-muted-foreground">
                      {copy.segmentPrevious30}
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex flex-col gap-0.5 min-[380px]:flex-row min-[380px]:items-center min-[380px]:justify-between min-[380px]:gap-2">
                        <span className="shrink-0 text-muted-foreground">{copy.kpiQuotes}</span>
                        <span className="min-w-0 wrap-break-word text-right tabular-nums">
                          {data.segments.previous30Days.quoteCount} ·{" "}
                          {formatMinorCurrency(
                            data.segments.previous30Days.quoteVolumeCents,
                            "EUR",
                            locale,
                          )}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5 min-[380px]:flex-row min-[380px]:items-center min-[380px]:justify-between min-[380px]:gap-2">
                        <span className="shrink-0 text-muted-foreground">
                          {copy.kpiQuoteAcceptance}
                        </span>
                        <span className="tabular-nums">
                          {formatPercent(
                            locale,
                            data.segments.previous30Days.quoteAcceptanceRatePercent,
                          )}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5 min-[380px]:flex-row min-[380px]:items-center min-[380px]:justify-between min-[380px]:gap-2">
                        <span className="shrink-0 text-muted-foreground">{copy.kpiInvoices}</span>
                        <span className="min-w-0 wrap-break-word text-right tabular-nums">
                          {data.segments.previous30Days.invoiceCount} ·{" "}
                          {formatMinorCurrency(
                            data.segments.previous30Days.invoiceVolumeCents,
                            "EUR",
                            locale,
                          )}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5 min-[380px]:flex-row min-[380px]:items-center min-[380px]:justify-between min-[380px]:gap-2">
                        <span className="shrink-0 text-muted-foreground">
                          {copy.kpiInvoicePaidRate}
                        </span>
                        <span className="min-w-0 text-right tabular-nums">
                          {data.segments.previous30Days.paidInvoiceCount} ·{" "}
                          {formatPercent(
                            locale,
                            data.segments.previous30Days.paidInvoiceRatePercent,
                          )}
                        </span>
                      </div>
                      <div className="flex flex-col gap-0.5 min-[380px]:flex-row min-[380px]:items-center min-[380px]:justify-between min-[380px]:gap-2">
                        <span className="shrink-0 text-muted-foreground">
                          {copy.segmentPaymentReceived}
                        </span>
                        <span className="min-w-0 wrap-break-word text-right tabular-nums">
                          {formatMinorCurrency(
                            data.segments.previous30Days.paymentReceivedCents,
                            "EUR",
                            locale,
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 border-t border-border/50 pt-3">
                  <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                    {copy.segmentTrendTitle}
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-3">
                    <div className="rounded-md border border-dashed border-border/60 bg-muted/20 p-2 sm:p-2.5">
                      <div className="text-[10px] text-muted-foreground sm:text-[11px]">
                        {copy.trendQuoteCount}
                      </div>
                      <div
                        className={`text-xs font-medium tabular-nums sm:text-sm ${deltaToneClass(data.segments.trends.quoteCountDeltaPercent)}`}
                      >
                        {formatDeltaPercent(locale, data.segments.trends.quoteCountDeltaPercent)}
                      </div>
                    </div>
                    <div className="rounded-md border border-dashed border-border/60 bg-muted/20 p-2 sm:p-2.5">
                      <div className="text-[10px] text-muted-foreground sm:text-[11px]">
                        {copy.trendQuoteVolume}
                      </div>
                      <div
                        className={`text-xs font-medium tabular-nums sm:text-sm ${deltaToneClass(data.segments.trends.quoteVolumeDeltaPercent)}`}
                      >
                        {formatDeltaPercent(locale, data.segments.trends.quoteVolumeDeltaPercent)}
                      </div>
                    </div>
                    <div className="rounded-md border border-dashed border-border/60 bg-muted/20 p-2 sm:p-2.5">
                      <div className="text-[10px] text-muted-foreground sm:text-[11px]">
                        {copy.trendQuoteAcceptance}
                      </div>
                      <div
                        className={`text-xs font-medium tabular-nums sm:text-sm ${deltaToneClass(data.segments.trends.quoteAcceptanceRateDeltaPercent)}`}
                      >
                        {formatDeltaPercent(
                          locale,
                          data.segments.trends.quoteAcceptanceRateDeltaPercent,
                        )}
                      </div>
                    </div>
                    <div className="rounded-md border border-dashed border-border/60 bg-muted/20 p-2 sm:p-2.5">
                      <div className="text-[10px] text-muted-foreground sm:text-[11px]">
                        {copy.trendInvoiceCount}
                      </div>
                      <div
                        className={`text-xs font-medium tabular-nums sm:text-sm ${deltaToneClass(data.segments.trends.invoiceCountDeltaPercent)}`}
                      >
                        {formatDeltaPercent(locale, data.segments.trends.invoiceCountDeltaPercent)}
                      </div>
                    </div>
                    <div className="rounded-md border border-dashed border-border/60 bg-muted/20 p-2 sm:p-2.5">
                      <div className="text-[10px] text-muted-foreground sm:text-[11px]">
                        {copy.trendInvoiceVolume}
                      </div>
                      <div
                        className={`text-xs font-medium tabular-nums sm:text-sm ${deltaToneClass(data.segments.trends.invoiceVolumeDeltaPercent)}`}
                      >
                        {formatDeltaPercent(
                          locale,
                          data.segments.trends.invoiceVolumeDeltaPercent,
                        )}
                      </div>
                    </div>
                    <div className="rounded-md border border-dashed border-border/60 bg-muted/20 p-2 sm:p-2.5">
                      <div className="text-[10px] text-muted-foreground sm:text-[11px]">
                        {copy.trendPaidInvoiceRate}
                      </div>
                      <div
                        className={`text-xs font-medium tabular-nums sm:text-sm ${deltaToneClass(data.segments.trends.paidInvoiceRateDeltaPercent)}`}
                      >
                        {formatDeltaPercent(
                          locale,
                          data.segments.trends.paidInvoiceRateDeltaPercent,
                        )}
                      </div>
                    </div>
                    <div className="rounded-md border border-dashed border-border/60 bg-muted/20 p-2 sm:p-2.5">
                      <div className="text-[10px] text-muted-foreground sm:text-[11px]">
                        {copy.trendPaymentReceived}
                      </div>
                      <div
                        className={`text-xs font-medium tabular-nums sm:text-sm ${deltaToneClass(data.segments.trends.paymentReceivedDeltaPercent)}`}
                      >
                        {formatDeltaPercent(
                          locale,
                          data.segments.trends.paymentReceivedDeltaPercent,
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </CardContent>
          </Card>

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
                {data.schedulingWeek.length === 0 ? (
                  <p className="text-muted-foreground">{copy.noSchedulingWeek}</p>
                ) : (
                  <ul className="space-y-1">
                    {data.schedulingWeek.map((a) => (
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
                {data.workTimeSummary.totalMinutes <= 0 ? (
                  <p className="text-muted-foreground">{copy.workTimeEmpty}</p>
                ) : (
                  <>
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="text-xs text-muted-foreground">
                        {locale === "en" ? "Total" : "Summe"}
                      </div>
                      <div className="font-medium tabular-nums text-foreground">
                        {formatDuration(locale, data.workTimeSummary.totalMinutes)}
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {data.workTimeSummary.entries.map((e) => (
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
                {data.openItems.total === 0 ? (
                  <p className="text-muted-foreground">{copy.receivablesEmpty}</p>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      {data.openItems.total}{" "}
                      {locale === "en" ? "open items" : "offene Posten"}
                    </p>
                    <ul className="space-y-2">
                      {data.openItems.invoices.map((i) => (
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

