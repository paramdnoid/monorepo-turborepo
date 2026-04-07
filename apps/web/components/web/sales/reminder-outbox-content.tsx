"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import {
  salesReminderEmailJobsMetricsResponseSchema,
  salesReminderEmailJobsProcessResponseSchema,
  salesReminderEmailJobsTenantListResponseSchema,
  salesReminderEmailJobReplayResponseSchema,
} from "@repo/api-contracts";
import type { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/alert";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/table";
import { toast } from "sonner";

import { useWebApp } from "@/components/web/shell/web-app-context";
import type { Locale } from "@/lib/i18n/locale";
import { parseResponseJson } from "@/lib/parse-response-json";

async function fetchParsed<T>(url: string, schema: z.ZodType<T>): Promise<T> {
  const res = await fetch(url, { credentials: "include", cache: "no-store" });
  const text = await res.text();
  const json = parseResponseJson(text);
  const parsed = schema.safeParse(json);
  if (!res.ok || !parsed.success) {
    throw new Error("load_failed");
  }
  return parsed.data;
}

function toAgeMinutes(iso: string | null): number | null {
  if (!iso) return null;
  const ts = Date.parse(iso);
  if (!Number.isFinite(ts)) return null;
  const ageMs = Date.now() - ts;
  if (!Number.isFinite(ageMs) || ageMs < 0) return 0;
  return Math.floor(ageMs / 60_000);
}

function formatAgeLabel(minutes: number, locale: Locale): string {
  if (minutes < 60) {
    return locale === "en" ? `${minutes} min` : `${minutes} Min`;
  }
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  return locale === "en"
    ? `${hours}h ${restMinutes}m`
    : `${hours} Std ${restMinutes} Min`;
}

function jobStatusLabel(
  status: "pending" | "processing" | "sent" | "failed" | null,
  locale: Locale,
): string {
  if (!status) return "—";
  if (locale === "en") {
    if (status === "pending") return "Pending";
    if (status === "processing") return "Processing";
    if (status === "sent") return "Sent";
    return "Failed";
  }
  if (status === "pending") return "Pending";
  if (status === "processing") return "In Verarbeitung";
  if (status === "sent") return "Versendet";
  return "Fehlgeschlagen";
}

function jobStatusBadgeVariant(
  status: "pending" | "processing" | "sent" | "failed" | null,
): "outline" | "default" | "destructive" {
  if (status === "failed") return "destructive";
  if (status === "sent") return "default";
  return "outline";
}

type View = "failed" | "pending";

export function SalesReminderOutboxContent() {
  const { session } = useWebApp();
  const locale = session.locale;
  const canEdit = session.permissions.sales.canEdit;

  const copy = useMemo(
    () =>
      locale === "en"
        ? {
            title: "Reminder email outbox",
            subtitle: "Monitor failed/pending jobs and trigger retries.",
            refresh: "Refresh",
            process: "Process pending now",
            processing: "Processing…",
            retry: "Retry",
            retrying: "Retrying…",
            replay: "Replay",
            replaying: "Replaying…",
            processOne: "Process",
            viewFailed: "Failed",
            viewPending: "Pending",
            noAccessTitle: "Read-only access",
            noAccessHint:
              "Your role cannot process or retry jobs. Ask an admin for access.",
            loadFailed: "Outbox data could not be loaded.",
            tableInvoice: "Invoice",
            tableReminder: "Reminder",
            tableRecipient: "Recipient",
            tableStatus: "Status",
            tableAttempts: "Attempts",
            tableLastError: "Last error",
            tableUpdated: "Updated",
            tableActions: "Actions",
            emptyFailed: "No failed jobs.",
            emptyPending: "No pending jobs.",
            attentionTitle: "Outbox needs attention",
            attentionFailed: (n: number) => `${n} failed jobs detected.`,
            attentionOldest: (age: string) => `Oldest pending job: ${age}.`,
          }
        : {
            title: "Mahn-Outbox (E-Mail)",
            subtitle:
              "Status- und Ops-Sicht fuer Failed/Pending inkl. Retry und Queue-Verarbeitung.",
            refresh: "Aktualisieren",
            process: "Pending verarbeiten",
            processing: "Verarbeite…",
            retry: "Erneut senden",
            retrying: "Retry…",
            replay: "Neu einreihen",
            replaying: "Einreihen…",
            processOne: "Verarbeiten",
            viewFailed: "Fehlgeschlagen",
            viewPending: "Pending",
            noAccessTitle: "Nur Lesemodus",
            noAccessHint:
              "Deine Rolle darf Jobs nicht verarbeiten oder erneut senden. Bitte Admin-Rolle nutzen.",
            loadFailed: "Outbox-Daten konnten nicht geladen werden.",
            tableInvoice: "Rechnung",
            tableReminder: "Mahnung",
            tableRecipient: "Empfaenger",
            tableStatus: "Status",
            tableAttempts: "Versuche",
            tableLastError: "Letzter Fehler",
            tableUpdated: "Aktualisiert",
            tableActions: "Aktionen",
            emptyFailed: "Keine fehlgeschlagenen Jobs.",
            emptyPending: "Keine pending Jobs.",
            attentionTitle: "Mahn-Outbox braucht Aufmerksamkeit",
            attentionFailed: (n: number) => `${n} fehlgeschlagene Jobs erkannt.`,
            attentionOldest: (age: string) => `Aeltester Pending-Job: ${age}.`,
          },
    [locale],
  );

  const [view, setView] = useState<View>("failed");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<z.infer<
    typeof salesReminderEmailJobsMetricsResponseSchema
  > | null>(null);
  const [rows, setRows] = useState<
    z.infer<typeof salesReminderEmailJobsTenantListResponseSchema>["jobs"]
  >([]);
  const [total, setTotal] = useState(0);
  const [processBusy, setProcessBusy] = useState(false);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);

  const dateTimeFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "de-DE", {
        dateStyle: "short",
        timeStyle: "short",
      }),
    [locale],
  );

  const reloadMetrics = useCallback(async () => {
    const data = await fetchParsed(
      "/api/web/sales/reminder-email-jobs/metrics",
      salesReminderEmailJobsMetricsResponseSchema,
    );
    setMetrics(data);
    return data;
  }, []);

  const reloadRows = useCallback(
    async (status: View) => {
      const data = await fetchParsed(
        `/api/web/sales/reminder-email-jobs?status=${encodeURIComponent(status)}&limit=50&offset=0`,
        salesReminderEmailJobsTenantListResponseSchema,
      );
      setRows(data.jobs);
      setTotal(data.total);
    },
    [],
  );

  const reload = useCallback(
    async (nextView?: View) => {
      setLoading(true);
      setError(null);
      try {
        const m = await reloadMetrics();
        const chosen: View =
          nextView ??
          (m.failed > 0 ? "failed" : m.pending > 0 ? "pending" : "failed");
        setView(chosen);
        await reloadRows(chosen);
      } catch {
        setError(copy.loadFailed);
        setMetrics(null);
        setRows([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [copy.loadFailed, reloadMetrics, reloadRows],
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  const switchView = useCallback(
    async (next: View) => {
      setView(next);
      setLoading(true);
      setError(null);
      try {
        await reloadRows(next);
      } catch {
        setError(copy.loadFailed);
        setRows([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [copy.loadFailed, reloadRows],
  );

  const runProcessPending = async () => {
    if (!canEdit || processBusy) return;
    setProcessBusy(true);
    try {
      const res = await fetch("/api/web/sales/reminder-email-jobs/process", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 50 }),
      });
      const text = await res.text();
      const json = parseResponseJson(text);
      const parsed = salesReminderEmailJobsProcessResponseSchema.safeParse(json);
      if (!res.ok || !parsed.success) throw new Error("process_failed");
      toast.success(
        locale === "en"
          ? `Processed ${parsed.data.processed} (sent ${parsed.data.sent}, failed ${parsed.data.failed}).`
          : `Verarbeitet ${parsed.data.processed} (versendet ${parsed.data.sent}, fehlgeschlagen ${parsed.data.failed}).`,
      );
      await reload(view);
    } catch {
      toast.error(locale === "en" ? "Processing failed." : "Verarbeitung fehlgeschlagen.");
    } finally {
      setProcessBusy(false);
    }
  };

  const runRetry = async (jobId: string) => {
    if (!canEdit || rowBusyId) return;
    setRowBusyId(jobId);
    try {
      const retryRes = await fetch(
        `/api/web/sales/reminder-email-jobs/${encodeURIComponent(jobId)}/retry`,
        { method: "POST", credentials: "include" },
      );
      if (!retryRes.ok) throw new Error("retry_failed");
      await fetch("/api/web/sales/reminder-email-jobs/process", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      toast.success(locale === "en" ? "Retry queued." : "Retry eingeplant.");
      await reload(view);
    } catch {
      toast.error(locale === "en" ? "Retry failed." : "Retry fehlgeschlagen.");
    } finally {
      setRowBusyId(null);
    }
  };

  const runReplay = async (jobId: string) => {
    if (!canEdit || rowBusyId) return;
    setRowBusyId(jobId);
    try {
      const replayRes = await fetch(
        `/api/web/sales/reminder-email-jobs/${encodeURIComponent(jobId)}/replay`,
        { method: "POST", credentials: "include" },
      );
      const replayText = await replayRes.text();
      const replayJson = parseResponseJson(replayText);
      const replayParsed = salesReminderEmailJobReplayResponseSchema.safeParse(replayJson);
      if (!replayRes.ok || !replayParsed.success) {
        throw new Error("replay_failed");
      }

      const newJobId = replayParsed.data.job.id;
      await fetch("/api/web/sales/reminder-email-jobs/process", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: newJobId }),
      });

      toast.success(locale === "en" ? "Replay queued." : "Replay eingeplant.");
      await reload(view);
    } catch {
      toast.error(locale === "en" ? "Replay failed." : "Replay fehlgeschlagen.");
    } finally {
      setRowBusyId(null);
    }
  };

  const runProcessOne = async (jobId: string) => {
    if (!canEdit || rowBusyId) return;
    setRowBusyId(jobId);
    try {
      const res = await fetch("/api/web/sales/reminder-email-jobs/process", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      if (!res.ok) throw new Error("process_failed");
      toast.success(locale === "en" ? "Job processed." : "Job verarbeitet.");
      await reload(view);
    } catch {
      toast.error(locale === "en" ? "Processing failed." : "Verarbeitung fehlgeschlagen.");
    } finally {
      setRowBusyId(null);
    }
  };

  const oldestPendingMinutes = toAgeMinutes(metrics?.oldestPendingCreatedAt ?? null);
  const showAttention =
    (metrics?.failed ?? 0) > 0 ||
    (oldestPendingMinutes !== null && oldestPendingMinutes >= 30);

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
            onClick={() => void reload(view)}
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden /> : null}
            {copy.refresh}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => void runProcessPending()}
            disabled={!canEdit || processBusy}
          >
            {processBusy ? (
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
            ) : null}
            {processBusy ? copy.processing : copy.process}
          </Button>
        </CardContent>
      </Card>

      {!canEdit ? (
        <Alert>
          <AlertTitle>{copy.noAccessTitle}</AlertTitle>
          <AlertDescription>{copy.noAccessHint}</AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>{copy.loadFailed}</AlertTitle>
        </Alert>
      ) : null}

      {metrics ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border-border/80 shadow-none">
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{metrics.pending}</p>
            </CardContent>
          </Card>
          <Card className="border-border/80 shadow-none">
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground">Failed</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{metrics.failed}</p>
            </CardContent>
          </Card>
          <Card className="border-border/80 shadow-none">
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground">Sent</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{metrics.sent}</p>
            </CardContent>
          </Card>
          <Card className="border-border/80 shadow-none">
            <CardContent className="py-4">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{metrics.total}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {metrics && showAttention ? (
        <Alert variant="destructive">
          <AlertTitle>{copy.attentionTitle}</AlertTitle>
          <AlertDescription>
            {(metrics.failed ?? 0) > 0 ? (
              <span className="block">{copy.attentionFailed(metrics.failed)}</span>
            ) : null}
            {oldestPendingMinutes !== null && oldestPendingMinutes >= 30 ? (
              <span className="block">
                {copy.attentionOldest(formatAgeLabel(oldestPendingMinutes, locale))}
              </span>
            ) : null}
            {metrics.latestFailedError ? (
              <span className="mt-1 block text-xs text-muted-foreground">
                {metrics.latestFailedError}
              </span>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={view === "failed" ? "default" : "outline"}
          onClick={() => void switchView("failed")}
          disabled={loading}
        >
          {copy.viewFailed}
          {metrics ? (
            <Badge variant="outline" className="ml-2">
              {metrics.failed}
            </Badge>
          ) : null}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={view === "pending" ? "default" : "outline"}
          onClick={() => void switchView("pending")}
          disabled={loading}
        >
          {copy.viewPending}
          {metrics ? (
            <Badge variant="outline" className="ml-2">
              {metrics.pending}
            </Badge>
          ) : null}
        </Button>
        <span className="text-xs text-muted-foreground">
          {total > 0 ? `${total}` : ""}
        </span>
      </div>

      <Card className="border-border/80 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {view === "failed" ? copy.viewFailed : copy.viewPending}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {view === "failed" ? copy.emptyFailed : copy.emptyPending}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{copy.tableInvoice}</TableHead>
                    <TableHead>{copy.tableReminder}</TableHead>
                    <TableHead>{copy.tableRecipient}</TableHead>
                    <TableHead>{copy.tableStatus}</TableHead>
                    <TableHead>{copy.tableAttempts}</TableHead>
                    <TableHead>{copy.tableLastError}</TableHead>
                    <TableHead>{copy.tableUpdated}</TableHead>
                    <TableHead className="text-right">{copy.tableActions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((job) => {
                    const retryDisabled = job.attempts >= job.maxAttempts;
                    const updatedLabel = dateTimeFmt.format(new Date(job.updatedAt));
                    return (
                      <TableRow key={job.id}>
                        <TableCell className="whitespace-nowrap">
                          <Link
                            href={`/web/sales/invoices/${encodeURIComponent(job.invoice.id)}#invoice-reminders`}
                            className="text-primary underline underline-offset-4 hover:text-foreground"
                          >
                            {job.invoice.documentNumber}
                          </Link>
                          <div className="text-xs text-muted-foreground">
                            {job.invoice.customerLabel}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className="font-medium tabular-nums">
                            {job.reminder.level}
                          </span>
                          <div className="text-xs text-muted-foreground">
                            {dateTimeFmt.format(new Date(job.reminder.sentAt))}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {job.toEmail}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge
                            variant={jobStatusBadgeVariant(job.status)}
                            className="h-5 px-2 text-[11px]"
                          >
                            {jobStatusLabel(job.status, locale)}
                          </Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums">
                          {job.attempts}/{job.maxAttempts}
                        </TableCell>
                        <TableCell className="min-w-[16rem] max-w-[28rem]">
                          <span className="block truncate text-xs text-muted-foreground">
                            {job.lastError ?? "—"}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {updatedLabel}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          <div className="inline-flex items-center gap-2">
                            {job.status === "failed" ? (
                              retryDisabled ? (
                                <Button
                                  type="button"
                                  size="xs"
                                  variant="outline"
                                  disabled={!canEdit || rowBusyId === job.id}
                                  onClick={() => void runReplay(job.id)}
                                >
                                  {rowBusyId === job.id ? copy.replaying : copy.replay}
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  size="xs"
                                  variant="outline"
                                  disabled={!canEdit || rowBusyId === job.id}
                                  onClick={() => void runRetry(job.id)}
                                >
                                  {rowBusyId === job.id ? copy.retrying : copy.retry}
                                </Button>
                              )
                            ) : (
                              <Button
                                type="button"
                                size="xs"
                                variant="outline"
                                disabled={!canEdit || rowBusyId === job.id}
                                onClick={() => void runProcessOne(job.id)}
                              >
                                {rowBusyId === job.id ? copy.processing : copy.processOne}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

