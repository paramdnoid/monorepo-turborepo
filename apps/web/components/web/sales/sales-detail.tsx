"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import {
  salesCamtMatchResponseSchema,
  customerDetailResponseSchema,
  salesInvoiceDetailResponseSchema,
  salesReminderEmailSpikeResponseSchema,
  salesQuoteDetailResponseSchema,
} from "@repo/api-contracts";
import type { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/alert";
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
import { Button } from "@repo/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";

import {
  getSalesPrintCopy,
  getSalesFormCopy,
  getSalesInvoicePaymentsCopy,
  getSalesInvoiceRemindersCopy,
  getSalesLifecycleCopy,
  getSalesTableCopy,
} from "@/content/sales-module";
import type { Locale } from "@/lib/i18n/locale";
import {
  dateInputToIsoNoon,
  formatMinorCurrency,
  parseMajorToMinorUnits,
} from "@/lib/money-format";
import { parseResponseJson } from "@/lib/parse-response-json";
import { toast } from "sonner";

import {
  SalesInvoiceCreateDialog,
  SalesInvoiceEditForm,
} from "./sales-invoice-editor";
import { SalesQuoteEditForm } from "./sales-quote-editor";
import {
  buildProjectTitleMap,
  buildQuoteLinkLabelMap,
} from "./sales-lookups";
import { SalesLinesSection } from "./sales-lines";

type SalesDetailProps = {
  locale: Locale;
  mode: "quotes" | "invoices";
  documentId: string;
};

type LifecycleAction =
  | "archive-quote"
  | "unarchive-quote"
  | "cancel-invoice"
  | "delete-quote"
  | "delete-invoice";

function formatDate(iso: string | null, locale: Locale): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const tag = locale === "en" ? "en-GB" : "de-DE";
  return new Intl.DateTimeFormat(tag, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

function suggestedReminderLevelFromOverdue(params: {
  dueAtIso: string | null;
  reminderLevel1DaysAfterDue: number | null;
  reminderLevel2DaysAfterDue: number | null;
  reminderLevel3DaysAfterDue: number | null;
}): number {
  const { dueAtIso, reminderLevel1DaysAfterDue, reminderLevel2DaysAfterDue, reminderLevel3DaysAfterDue } =
    params;

  if (!dueAtIso) return 1;
  const due = new Date(dueAtIso);
  if (Number.isNaN(due.getTime())) return 1;
  const daysOverdue = Math.floor((Date.now() - due.getTime()) / 86_400_000);
  if (daysOverdue < 0) return 1;

  if (reminderLevel3DaysAfterDue != null && daysOverdue >= reminderLevel3DaysAfterDue)
    return 3;
  if (reminderLevel2DaysAfterDue != null && daysOverdue >= reminderLevel2DaysAfterDue)
    return 2;
  if (reminderLevel1DaysAfterDue != null && daysOverdue >= reminderLevel1DaysAfterDue)
    return 1;
  return 1;
}

function DetailLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-1 sm:grid-cols-[minmax(0,12rem)_1fr] sm:gap-4">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  );
}

export function SalesDetail({
  locale,
  mode,
  documentId,
}: SalesDetailProps) {
  const router = useRouter();
  const copy = getSalesTableCopy(locale);
  const formCopy = getSalesFormCopy(locale);
  const printCopy = getSalesPrintCopy(locale);
  const lifecycleCopy = getSalesLifecycleCopy(locale);
  const paymentCopy = getSalesInvoicePaymentsCopy(locale);
  const reminderCopy = getSalesInvoiceRemindersCopy(locale);
  const listHref =
    mode === "quotes" ? "/web/sales/quotes" : "/web/sales/invoices";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);

  type QuoteDetailPayload = z.infer<typeof salesQuoteDetailResponseSchema>;
  type InvoiceDetailPayload = z.infer<typeof salesInvoiceDetailResponseSchema>;
  type CustomerDetailPayload = z.infer<typeof customerDetailResponseSchema>;

  type DetailState =
    | { mode: "quotes"; data: QuoteDetailPayload }
    | { mode: "invoices"; data: InvoiceDetailPayload };

  const [detail, setDetail] = useState<DetailState | null>(null);
  const [customerDetail, setCustomerDetail] = useState<
    CustomerDetailPayload["customer"] | null
  >(null);
  const [projectTitles, setProjectTitles] = useState<Map<string, string>>(
    () => new Map(),
  );
  const [quoteLabels, setQuoteLabels] = useState<Map<string, string>>(
    () => new Map(),
  );
  const [invoiceFromQuoteOpen, setInvoiceFromQuoteOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<LifecycleAction | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDateYmd, setPaymentDateYmd] = useState(todayYmd);
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentCamtBusy, setPaymentCamtBusy] = useState(false);
  const [confirmDeletePaymentId, setConfirmDeletePaymentId] = useState<
    string | null
  >(null);
  const [paymentDeleteBusy, setPaymentDeleteBusy] = useState(false);
  const [reminderLevel, setReminderLevel] = useState(1);
  const [reminderDateYmd, setReminderDateYmd] = useState(todayYmd);
  const [reminderNote, setReminderNote] = useState("");
  const [reminderBusy, setReminderBusy] = useState(false);
  const [reminderLevelTouched, setReminderLevelTouched] = useState(false);
  const [reminderEmailBusyId, setReminderEmailBusyId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (mode !== "invoices") return;
    if (!detail || detail.mode !== "invoices") return;
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#invoice-reminders") return;
    const t = window.setTimeout(() => {
      document.getElementById("invoice-reminders")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
    return () => window.clearTimeout(t);
  }, [mode, detail]);

  const fetchDocument = async (
    path: string,
    init?: RequestInit,
  ): Promise<unknown | null> => {
    const res = await fetch(path, { ...init, credentials: "include" });
    if (res.status === 204) return { ok: true };
    const text = await res.text();
    const json = parseResponseJson(text);
    if (!res.ok) {
      const code =
        json &&
        typeof json === "object" &&
        "error" in json &&
        typeof (json as { error: unknown }).error === "string"
          ? (json as { error: string }).error
          : "unknown";
      throw new Error(code);
    }
    return json;
  };

  const paymentDeleteErrorText = (errCode: string): string => {
    if (errCode === "invalid_state") return lifecycleCopy.actionFailed;
    if (errCode === "not_found") return copy.notFound;
    if (errCode === "forbidden") return lifecycleCopy.actionFailed;
    return paymentCopy.paymentDeleteFailed;
  };

  const reminderErrorText = (errCode: string): string => {
    if (errCode === "invalid_state") return lifecycleCopy.actionFailed;
    if (errCode === "not_found") return copy.notFound;
    if (errCode === "forbidden") return lifecycleCopy.actionFailed;
    return reminderCopy.createFailed;
  };

  const lifecycleErrorText = (errCode: string): string => {
    if (errCode === "invalid_state") return lifecycleCopy.actionFailed;
    if (errCode === "quote_has_invoices") return lifecycleCopy.confirmDescDeleteQuote;
    if (errCode === "cannot_cancel_paid") return lifecycleCopy.confirmDescCancelInvoice;
    if (errCode === "cannot_cancel_with_payments")
      return lifecycleCopy.cannotCancelWithPayments;
    if (errCode === "not_found") return copy.notFound;
    return lifecycleCopy.actionFailed;
  };

  const recordInvoicePayment = async () => {
    if (paymentBusy) return;
    if (!detail || detail.mode !== "invoices") return;
    const inv = detail.data.invoice;
    const cents = parseMajorToMinorUnits(paymentAmount, locale);
    if (cents === null || cents < 1) {
      toast.error(formCopy.validationAmount);
      return;
    }
    const paidAtIso = dateInputToIsoNoon(paymentDateYmd);
    if (!paidAtIso) {
      toast.error(formCopy.validationAmount);
      return;
    }
    setPaymentBusy(true);
    try {
      const json = await fetchDocument(
        `/api/web/sales/invoices/${encodeURIComponent(inv.id)}/payments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amountCents: cents,
            paidAt: paidAtIso,
            note: paymentNote.trim() === "" ? null : paymentNote.trim(),
          }),
        },
      );
      const parsed = salesInvoiceDetailResponseSchema.safeParse(json);
      if (!parsed.success) throw new Error("invalid_payload");
      setDetail({ mode: "invoices", data: parsed.data });
      setPaymentAmount("");
      setPaymentNote("");
      setPaymentDateYmd(todayYmd());
      toast.success(lifecycleCopy.actionDone);
    } catch (err) {
      const code = err instanceof Error ? err.message : "unknown";
      if (code === "payment_exceeds_balance") {
        toast.error(paymentCopy.exceedsBalance);
      } else {
        toast.error(paymentCopy.paymentFailed);
      }
    } finally {
      setPaymentBusy(false);
    }
  };

  const runCamtAssignPayment = async () => {
    if (paymentCamtBusy) return;
    if (!detail || detail.mode !== "invoices") return;
    const inv = detail.data.invoice;

    const amountRaw = window.prompt(paymentCopy.camtPromptAmount, "");
    if (!amountRaw || amountRaw.trim() === "") return;
    const cents = parseMajorToMinorUnits(amountRaw, locale);
    if (cents === null || cents < 1) {
      toast.error(formCopy.validationAmount);
      return;
    }

    const dateRaw = window.prompt(paymentCopy.camtPromptDate, todayYmd());
    if (!dateRaw || dateRaw.trim() === "") return;
    const paidAtIso = dateInputToIsoNoon(dateRaw.trim());
    if (!paidAtIso) {
      toast.error(paymentCopy.paymentFailed);
      return;
    }

    const remittanceInfo =
      window.prompt(paymentCopy.camtPromptRemittance, "")?.trim() ?? "";

    setPaymentCamtBusy(true);
    try {
      const matchRes = await fetch(`/api/web/sales/invoices/camt-match`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountCents: cents,
          paidAt: paidAtIso,
          remittanceInfo: remittanceInfo || undefined,
          candidateLimit: 3,
        }),
      });
      const matchText = await matchRes.text();
      const matchJson = parseResponseJson(matchText);
      if (!matchRes.ok) throw new Error("match_failed");
      const matchParsed = salesCamtMatchResponseSchema.safeParse(matchJson);
      if (!matchParsed.success) throw new Error("invalid_payload");
      const suggestion = matchParsed.data.matches[0];
      if (!suggestion || !matchParsed.data.suggestedInvoiceId) {
        toast.error(paymentCopy.camtNoMatch);
        return;
      }
      if (suggestion.invoiceId !== inv.id) {
        toast.error(`${paymentCopy.camtTopMatchOther} ${suggestion.documentNumber}`);
        return;
      }
      const ok = window.confirm(
        `${paymentCopy.camtConfirmBook}\n\n${suggestion.documentNumber} · ${suggestion.customerLabel}`,
      );
      if (!ok) return;

      const noteValue =
        remittanceInfo.length > 0
          ? `CAMT: ${remittanceInfo}`
          : `CAMT-Match (${suggestion.documentNumber})`;
      const json = await fetchDocument(
        `/api/web/sales/invoices/${encodeURIComponent(inv.id)}/payments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amountCents: cents,
            paidAt: paidAtIso,
            note: noteValue,
          }),
        },
      );
      const parsed = salesInvoiceDetailResponseSchema.safeParse(json);
      if (!parsed.success) throw new Error("invalid_payload");
      setDetail({ mode: "invoices", data: parsed.data });
      toast.success(paymentCopy.camtBooked);
    } catch {
      toast.error(paymentCopy.camtFailed);
    } finally {
      setPaymentCamtBusy(false);
    }
  };

  const runDeleteInvoicePayment = async () => {
    if (paymentDeleteBusy || !confirmDeletePaymentId) return;
    if (!detail || detail.mode !== "invoices") return;
    const inv = detail.data.invoice;
    const paymentId = confirmDeletePaymentId;
    setPaymentDeleteBusy(true);
    try {
      const json = await fetchDocument(
        `/api/web/sales/invoices/${encodeURIComponent(inv.id)}/payments/${encodeURIComponent(paymentId)}`,
        { method: "DELETE" },
      );
      const parsed = salesInvoiceDetailResponseSchema.safeParse(json);
      if (!parsed.success) throw new Error("invalid_payload");
      setDetail({ mode: "invoices", data: parsed.data });
      toast.success(lifecycleCopy.actionDone);
    } catch (err) {
      const code = err instanceof Error ? err.message : "unknown";
      toast.error(paymentDeleteErrorText(code));
    } finally {
      setPaymentDeleteBusy(false);
      setConfirmDeletePaymentId(null);
    }
  };

  const recordInvoiceReminder = async () => {
    if (reminderBusy) return;
    if (!detail || detail.mode !== "invoices") return;
    const inv = detail.data.invoice;

    if (!Number.isInteger(reminderLevel) || reminderLevel < 1 || reminderLevel > 10) {
      toast.error(reminderCopy.validationLevel);
      return;
    }

    const sentAtIso = dateInputToIsoNoon(reminderDateYmd);
    if (!sentAtIso) {
      toast.error(reminderCopy.validationSentAt);
      return;
    }

    setReminderBusy(true);
    try {
      const json = await fetchDocument(
        `/api/web/sales/invoices/${encodeURIComponent(inv.id)}/reminders`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            level: reminderLevel,
            sentAt: sentAtIso,
            note: reminderNote.trim() === "" ? null : reminderNote.trim(),
          }),
        },
      );
      const parsed = salesInvoiceDetailResponseSchema.safeParse(json);
      if (!parsed.success) throw new Error("invalid_payload");
      setDetail({ mode: "invoices", data: parsed.data });
      const maxLevel = parsed.data.invoice.reminders.reduce(
        (m, r) => Math.max(m, r.level),
        0,
      );
      setReminderLevel(maxLevel > 0 ? Math.min(10, maxLevel + 1) : 1);
      setReminderLevelTouched(false);
      setReminderNote("");
      setReminderDateYmd(todayYmd());
      toast.success(lifecycleCopy.actionDone);
    } catch (err) {
      const code = err instanceof Error ? err.message : "unknown";
      toast.error(reminderErrorText(code));
    } finally {
      setReminderBusy(false);
    }
  };

  const runReminderEmailSpike = async (reminderId: string) => {
    if (!detail || detail.mode !== "invoices") return;
    if (reminderEmailBusyId) return;

    const to = window.prompt(
      locale === "en"
        ? "Recipient email address for reminder spike:"
        : "Empfaenger-E-Mail fuer den Mahn-Spike:",
      "",
    );
    if (!to || to.trim() === "") return;

    const inv = detail.data.invoice;
    setReminderEmailBusyId(reminderId);
    try {
      const dryRunRes = await fetch(
        `/api/web/sales/invoices/${encodeURIComponent(inv.id)}/reminders/${encodeURIComponent(reminderId)}/email-spike`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: to.trim(),
            locale: locale === "en" ? "en" : "de",
            dryRun: true,
          }),
        },
      );
      const dryRunText = await dryRunRes.text();
      const dryRunJson = parseResponseJson(dryRunText);
      if (!dryRunRes.ok) {
        throw new Error("dry_run_failed");
      }
      const dryRunParsed = salesReminderEmailSpikeResponseSchema.safeParse(dryRunJson);
      if (!dryRunParsed.success) {
        throw new Error("invalid_payload");
      }

      const preview = dryRunParsed.data;
      const wantsSend = window.confirm(
        locale === "en"
          ? `Preview created.\n\nSubject: ${preview.subject}\n\nSend this email now?`
          : `Vorschau erstellt.\n\nBetreff: ${preview.subject}\n\nDiese E-Mail jetzt senden?`,
      );

      if (!wantsSend) {
        toast.success(
          locale === "en"
            ? "Email preview generated (not sent)."
            : "E-Mail-Vorschau erstellt (nicht gesendet).",
        );
        return;
      }

      const sendRes = await fetch(
        `/api/web/sales/invoices/${encodeURIComponent(inv.id)}/reminders/${encodeURIComponent(reminderId)}/email-spike`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: to.trim(),
            locale: locale === "en" ? "en" : "de",
            dryRun: false,
          }),
        },
      );
      const sendText = await sendRes.text();
      const sendJson = parseResponseJson(sendText);
      if (!sendRes.ok) {
        throw new Error("send_failed");
      }
      const sendParsed = salesReminderEmailSpikeResponseSchema.safeParse(sendJson);
      if (!sendParsed.success) {
        throw new Error("invalid_payload");
      }
      if (!sendParsed.data.delivered) {
        toast.error(
          locale === "en"
            ? "SMTP not configured; email was not sent."
            : "SMTP nicht konfiguriert; E-Mail wurde nicht gesendet.",
        );
        return;
      }
      toast.success(
        locale === "en"
          ? "Reminder email sent (spike)."
          : "Mahn-E-Mail gesendet (Spike).",
      );
    } catch {
      toast.error(
        locale === "en"
          ? "Email spike failed."
          : "E-Mail-Spike fehlgeschlagen.",
      );
    } finally {
      setReminderEmailBusyId(null);
    }
  };

  const runLifecycleAction = async (action: LifecycleAction) => {
    if (actionBusy) return;
    setActionBusy(true);
    try {
      if (action === "archive-quote") {
        const json = await fetchDocument(
          `/api/web/sales/quotes/${encodeURIComponent(documentId)}/archive`,
          { method: "POST" },
        );
        const parsed = salesQuoteDetailResponseSchema.safeParse(json);
        if (!parsed.success) throw new Error("invalid_payload");
        setDetail({ mode: "quotes", data: parsed.data });
        setEditing(false);
        toast.success(lifecycleCopy.actionDone);
        return;
      }
      if (action === "unarchive-quote") {
        const json = await fetchDocument(
          `/api/web/sales/quotes/${encodeURIComponent(documentId)}/unarchive`,
          { method: "POST" },
        );
        const parsed = salesQuoteDetailResponseSchema.safeParse(json);
        if (!parsed.success) throw new Error("invalid_payload");
        setDetail({ mode: "quotes", data: parsed.data });
        setEditing(false);
        toast.success(lifecycleCopy.actionDone);
        return;
      }
      if (action === "cancel-invoice") {
        const json = await fetchDocument(
          `/api/web/sales/invoices/${encodeURIComponent(documentId)}/cancel`,
          { method: "POST" },
        );
        const parsed = salesInvoiceDetailResponseSchema.safeParse(json);
        if (!parsed.success) throw new Error("invalid_payload");
        setDetail({ mode: "invoices", data: parsed.data });
        setEditing(false);
        toast.success(lifecycleCopy.actionDone);
        return;
      }
      if (action === "delete-quote") {
        await fetchDocument(`/api/web/sales/quotes/${encodeURIComponent(documentId)}`, {
          method: "DELETE",
        });
        toast.success(lifecycleCopy.deletedRedirectHint);
        router.push(listHref);
        return;
      }
      await fetchDocument(`/api/web/sales/invoices/${encodeURIComponent(documentId)}`, {
        method: "DELETE",
      });
      toast.success(lifecycleCopy.deletedRedirectHint);
      router.push(listHref);
    } catch (err) {
      const code = err instanceof Error ? err.message : "unknown";
      toast.error(lifecycleErrorText(code));
    } finally {
      setActionBusy(false);
      setConfirmAction(null);
    }
  };

  const confirmTitle =
    confirmAction === "archive-quote"
      ? lifecycleCopy.confirmTitleArchiveQuote
      : confirmAction === "unarchive-quote"
        ? lifecycleCopy.confirmTitleUnarchiveQuote
        : confirmAction === "cancel-invoice"
          ? lifecycleCopy.confirmTitleCancelInvoice
          : confirmAction === "delete-quote"
            ? lifecycleCopy.confirmTitleDeleteQuote
            : lifecycleCopy.confirmTitleDeleteInvoice;

  const confirmDescription =
    confirmAction === "archive-quote"
      ? lifecycleCopy.confirmDescArchiveQuote
      : confirmAction === "unarchive-quote"
        ? lifecycleCopy.confirmDescUnarchiveQuote
        : confirmAction === "cancel-invoice"
          ? lifecycleCopy.confirmDescCancelInvoice
          : confirmAction === "delete-quote"
            ? lifecycleCopy.confirmDescDeleteQuote
            : lifecycleCopy.confirmDescDeleteInvoice;

  const invoiceForPrefill = detail?.mode === "invoices" ? detail.data.invoice : null;
  const invId = invoiceForPrefill?.id ?? null;
  const invCustomerId = invoiceForPrefill?.customerId ?? null;
  const invDueAt = invoiceForPrefill?.dueAt ?? null;
  const invReminderCount = invoiceForPrefill?.reminders.length ?? 0;
  const invReminderMaxLevel =
    invoiceForPrefill?.reminders.reduce((m, r) => Math.max(m, r.level), 0) ?? 0;
  const customerReminderLevel1DaysAfterDue =
    customerDetail?.reminderLevel1DaysAfterDue ?? null;
  const customerReminderLevel2DaysAfterDue =
    customerDetail?.reminderLevel2DaysAfterDue ?? null;
  const customerReminderLevel3DaysAfterDue =
    customerDetail?.reminderLevel3DaysAfterDue ?? null;

  useEffect(() => {
    if (!invCustomerId) {
      setCustomerDetail(null);
      return;
    }
    if (customerDetail?.id === invCustomerId) {
      return;
    }
    setCustomerDetail(null);
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/web/customers/${encodeURIComponent(invCustomerId)}`,
          { credentials: "include" },
        );
        const text = await res.text();
        if (cancelled) return;
        if (!res.ok) return;
        const json = parseResponseJson(text);
        if (json === null) return;
        const parsed = customerDetailResponseSchema.safeParse(json);
        if (!parsed.success) return;
        setCustomerDetail(parsed.data.customer);
      } catch {
        // ignore (keep defaults null)
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerDetail?.id, invCustomerId]);

  useEffect(() => {
    if (mode !== "invoices") return;
    setReminderLevelTouched(false);
    setReminderNote("");
    setReminderDateYmd(todayYmd());
  }, [documentId, mode]);

  useEffect(() => {
    if (reminderLevelTouched) return;
    if (!invId) return;
    const nextLevel =
      invReminderMaxLevel > 0
        ? Math.min(10, invReminderMaxLevel + 1)
        : suggestedReminderLevelFromOverdue({
            dueAtIso: invDueAt,
            reminderLevel1DaysAfterDue: customerReminderLevel1DaysAfterDue,
            reminderLevel2DaysAfterDue: customerReminderLevel2DaysAfterDue,
            reminderLevel3DaysAfterDue: customerReminderLevel3DaysAfterDue,
          });
    setReminderLevel(nextLevel);
  }, [
    customerDetail?.id,
    customerReminderLevel1DaysAfterDue,
    customerReminderLevel2DaysAfterDue,
    customerReminderLevel3DaysAfterDue,
    invId,
    invDueAt,
    invReminderCount,
    invReminderMaxLevel,
    reminderLevelTouched,
  ]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [pm, qm] = await Promise.all([
        buildProjectTitleMap(),
        buildQuoteLinkLabelMap(),
      ]);
      if (!cancelled) {
        setProjectTitles(pm);
        setQuoteLabels(qm);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [documentId, mode]);

  useEffect(() => {
    let cancelled = false;
    const path =
      mode === "quotes"
        ? `/api/web/sales/quotes/${encodeURIComponent(documentId)}`
        : `/api/web/sales/invoices/${encodeURIComponent(documentId)}`;

    void (async () => {
      setLoading(true);
      setError(null);
      setNotFound(false);
      setDetail(null);
      try {
        const res = await fetch(path, { credentials: "include" });
        const text = await res.text();
        if (cancelled) return;
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) {
          setError(copy.loadError);
          return;
        }
        const json: unknown = JSON.parse(text);
        if (mode === "quotes") {
          const parsed = salesQuoteDetailResponseSchema.safeParse(json);
          if (!parsed.success) {
            setError(copy.loadError);
            return;
          }
          setDetail({ mode: "quotes", data: parsed.data });
          return;
        }
        const parsed = salesInvoiceDetailResponseSchema.safeParse(json);
        if (!parsed.success) {
          setError(copy.loadError);
          return;
        }
        setDetail({ mode: "invoices", data: parsed.data });
      } catch {
        if (!cancelled) setError(copy.loadError);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mode, documentId, copy.loadError]);

  useEffect(() => {
    setEditing(false);
  }, [documentId, mode]);

  useEffect(() => {
    setPaymentAmount("");
    setPaymentNote("");
    setPaymentDateYmd(todayYmd());
  }, [documentId]);

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground">
        {locale === "en" ? "Loading…" : "Laden …"}
      </p>
    );
  }

  if (notFound) {
    return (
      <Alert variant="destructive">
        <AlertTitle>{copy.notFound}</AlertTitle>
        <AlertDescription>
          <Button variant="outline" size="sm" className="mt-2" asChild>
            <Link href={listHref}>{copy.backToList}</Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (error || !detail) {
    return (
      <Alert variant="destructive">
        <AlertTitle>{copy.loadError}</AlertTitle>
        <AlertDescription>{error ?? ""}</AlertDescription>
      </Alert>
    );
  }

  if (detail.mode === "quotes") {
    const q = detail.data.quote;
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={listHref}>{copy.backToList}</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/web/sales/quotes/${encodeURIComponent(q.id)}/print`}>
              {copy.previewPrint}
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={`/api/web/sales/quotes/${encodeURIComponent(q.id)}/pdf`}>
              {printCopy.downloadPdf}
            </a>
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => setInvoiceFromQuoteOpen(true)}
          >
            {formCopy.createInvoiceFromQuote}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setEditing((e) => !e)}
          >
            {editing ? formCopy.cancel : formCopy.edit}
          </Button>
          {q.status === "expired" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmAction("unarchive-quote")}
            >
              {lifecycleCopy.unarchiveQuote}
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmAction("archive-quote")}
            >
              {lifecycleCopy.archiveQuote}
            </Button>
          )}
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setConfirmAction("delete-quote")}
          >
            {lifecycleCopy.deleteQuote}
          </Button>
        </div>
        <SalesInvoiceCreateDialog
          locale={locale}
          open={invoiceFromQuoteOpen}
          onOpenChange={setInvoiceFromQuoteOpen}
          onCreated={() => {}}
          presetQuoteId={q.id}
          lockQuoteSelection
          onCreatedInvoiceId={(invoiceId) => {
            router.push(`/web/sales/invoices/${encodeURIComponent(invoiceId)}`);
          }}
        />
        {editing ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{formCopy.edit}</CardTitle>
              <CardDescription>{q.documentNumber}</CardDescription>
            </CardHeader>
            <CardContent>
              <SalesQuoteEditForm
                locale={locale}
                quote={q}
                onSaved={(next) => {
                  setDetail({ mode: "quotes", data: { quote: next } });
                  setEditing(false);
                }}
                onCancel={() => setEditing(false)}
              />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{q.documentNumber}</CardTitle>
              <CardDescription>{q.customerLabel}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <dl className="space-y-3">
                <DetailLine label={copy.status} value={q.status} />
                <DetailLine
                  label={copy.total}
                  value={formatMinorCurrency(q.totalCents, q.currency, locale)}
                />
                <DetailLine
                  label={copy.validUntil}
                  value={formatDate(q.validUntil, locale)}
                />
                <DetailLine
                  label={copy.date}
                  value={formatDate(q.updatedAt, locale)}
                />
                <DetailLine
                  label={copy.project}
                  value={
                    q.projectId
                      ? (projectTitles.get(q.projectId) ?? q.projectId)
                      : "—"
                  }
                />
              </dl>
            </CardContent>
          </Card>
        )}
        <SalesLinesSection
          locale={locale}
          mode="quotes"
          documentId={q.id}
          lines={q.lines}
          onDocumentUpdated={(next) =>
            setDetail(
              "quote" in next
                ? { mode: "quotes", data: next }
                : { mode: "invoices", data: next },
            )
          }
        />
        <AlertDialog
          open={confirmAction !== null}
          onOpenChange={(open) => {
            if (!open && !actionBusy) setConfirmAction(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
              <AlertDialogDescription>{confirmDescription}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={actionBusy}>
                {lifecycleCopy.confirmCancel}
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={actionBusy || confirmAction === null}
                onClick={(event) => {
                  event.preventDefault();
                  if (confirmAction) {
                    void runLifecycleAction(confirmAction);
                  }
                }}
              >
                {actionBusy ? (locale === "en" ? "Working…" : "Bitte warten …") : lifecycleCopy.confirmAction}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  const inv = detail.data.invoice;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={listHref}>{copy.backToList}</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/web/sales/invoices/${encodeURIComponent(inv.id)}/print`}>
            {copy.previewPrint}
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href={`/api/web/sales/invoices/${encodeURIComponent(inv.id)}/pdf`}>
            {printCopy.downloadPdf}
          </a>
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setEditing((e) => !e)}
        >
          {editing ? formCopy.cancel : formCopy.edit}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={actionBusy || inv.payments.length > 0}
          onClick={() => setConfirmAction("cancel-invoice")}
        >
          {lifecycleCopy.cancelInvoice}
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => setConfirmAction("delete-invoice")}
        >
          {lifecycleCopy.deleteInvoice}
        </Button>
      </div>
      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{formCopy.edit}</CardTitle>
            <CardDescription>{inv.documentNumber}</CardDescription>
          </CardHeader>
          <CardContent>
            <SalesInvoiceEditForm
              locale={locale}
              invoice={inv}
              onSaved={(next) => {
                setDetail({ mode: "invoices", data: { invoice: next } });
                setEditing(false);
              }}
              onCancel={() => setEditing(false)}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{inv.documentNumber}</CardTitle>
            <CardDescription>{inv.customerLabel}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <dl className="space-y-3">
              <DetailLine label={copy.status} value={inv.status} />
              <DetailLine
                label={copy.total}
                value={formatMinorCurrency(
                  inv.totalCents,
                  inv.currency,
                  locale,
                )}
              />
              <DetailLine
                label={copy.issued}
                value={formatDate(inv.issuedAt, locale)}
              />
              <DetailLine
                label={copy.dueDate}
                value={formatDate(inv.dueAt, locale)}
              />
              <DetailLine
                label={copy.paidAt}
                value={formatDate(inv.paidAt, locale)}
              />
              <DetailLine
                label={copy.quoteRef}
                value={
                  inv.quoteId
                    ? (quoteLabels.get(inv.quoteId) ?? inv.quoteId)
                    : "—"
                }
              />
              <DetailLine
                label={copy.project}
                value={
                  inv.projectId
                    ? (projectTitles.get(inv.projectId) ?? inv.projectId)
                    : "—"
                }
              />
              <DetailLine
                label={copy.date}
                value={formatDate(inv.updatedAt, locale)}
              />
            </dl>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{paymentCopy.heading}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="space-y-3">
            <DetailLine
              label={paymentCopy.paidTotal}
              value={formatMinorCurrency(
                inv.paidTotalCents,
                inv.currency,
                locale,
              )}
            />
            <DetailLine
              label={paymentCopy.balance}
              value={formatMinorCurrency(inv.balanceCents, inv.currency, locale)}
            />
          </dl>
          {inv.payments.length === 0 &&
          inv.status === "paid" &&
          inv.paidAt ? (
            <p className="text-xs text-muted-foreground">
              {paymentCopy.legacyPaidHint}
            </p>
          ) : null}
          {inv.payments.length > 0 ? (
            <ul className="space-y-2 border-t border-border pt-3">
              {inv.payments.map((p) => (
                <li key={p.id}>
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1 text-sm">
                      <span className="font-medium">
                        {formatMinorCurrency(p.amountCents, inv.currency, locale)}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {formatDate(p.paidAt, locale)}
                      </span>
                      {p.note ? (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {p.note}
                        </span>
                      ) : null}
                    </div>
                    {inv.status !== "cancelled" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        aria-label={paymentCopy.deletePayment}
                        disabled={paymentBusy || paymentDeleteBusy}
                        onClick={() => setConfirmDeletePaymentId(p.id)}
                      >
                        <Trash2 />
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{paymentCopy.empty}</p>
          )}
          {!editing && inv.status !== "cancelled" && inv.balanceCents > 0 ? (
            <div className="space-y-3 border-t border-border pt-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="sales-inv-pay-amount">{paymentCopy.amount}</Label>
                  <Input
                    id="sales-inv-pay-amount"
                    inputMode="decimal"
                    autoComplete="off"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    disabled={paymentBusy}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sales-inv-pay-date">{paymentCopy.paidAt}</Label>
                  <Input
                    id="sales-inv-pay-date"
                    type="date"
                    value={paymentDateYmd}
                    onChange={(e) => setPaymentDateYmd(e.target.value)}
                    disabled={paymentBusy}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="sales-inv-pay-note">{paymentCopy.note}</Label>
                <Input
                  id="sales-inv-pay-note"
                  value={paymentNote}
                  placeholder={paymentCopy.notePlaceholder}
                  autoComplete="off"
                  onChange={(e) => setPaymentNote(e.target.value)}
                  disabled={paymentBusy}
                />
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => void recordInvoicePayment()}
                disabled={paymentBusy || paymentCamtBusy}
              >
                {paymentBusy ? paymentCopy.submitting : paymentCopy.submit}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void runCamtAssignPayment()}
                disabled={paymentBusy || paymentCamtBusy}
              >
                {paymentCamtBusy
                  ? locale === "en"
                    ? "Matching…"
                    : "Zuordnung …"
                  : paymentCopy.camtAssign}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
      <Card id="invoice-reminders">
        <CardHeader>
          <CardTitle className="text-base">{reminderCopy.heading}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {inv.reminders.length > 0 ? (
            <ul className="space-y-2 border-t border-border pt-3">
              {inv.reminders.map((r) => (
                <li key={r.id}>
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1 text-sm">
                      <span className="font-medium">
                        {reminderCopy.level} {r.level}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {formatDate(r.sentAt, locale)}
                      </span>
                      {r.note ? (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {r.note}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        disabled={reminderEmailBusyId === r.id}
                        onClick={() => void runReminderEmailSpike(r.id)}
                      >
                        {reminderEmailBusyId === r.id
                          ? locale === "en"
                            ? "Sending…"
                            : "Sende …"
                          : "E-Mail Spike"}
                      </Button>
                      <Button variant="outline" size="xs" asChild>
                        <Link
                          href={`/web/sales/invoices/${encodeURIComponent(inv.id)}/reminders/${encodeURIComponent(r.id)}/print`}
                        >
                          {locale === "en" ? "Print" : "Druck"}
                        </Link>
                      </Button>
                      <Button variant="outline" size="xs" asChild>
                        <a
                          href={`/api/web/sales/invoices/${encodeURIComponent(inv.id)}/reminders/${encodeURIComponent(r.id)}/pdf`}
                        >
                          {printCopy.downloadPdf}
                        </a>
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">{reminderCopy.empty}</p>
          )}
          {!editing &&
          inv.status !== "cancelled" &&
          inv.status !== "draft" &&
          inv.balanceCents > 0 ? (
            <div className="space-y-3 border-t border-border pt-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="sales-inv-rem-level">{reminderCopy.level}</Label>
                  <Input
                    id="sales-inv-rem-level"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={10}
                    step={1}
                    value={String(reminderLevel)}
                    onChange={(e) => {
                      const n = e.target.valueAsNumber;
                      setReminderLevel(Number.isFinite(n) ? n : 1);
                      setReminderLevelTouched(true);
                    }}
                    disabled={reminderBusy}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sales-inv-rem-date">{reminderCopy.sentAt}</Label>
                  <Input
                    id="sales-inv-rem-date"
                    type="date"
                    value={reminderDateYmd}
                    onChange={(e) => setReminderDateYmd(e.target.value)}
                    disabled={reminderBusy}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="sales-inv-rem-note">{reminderCopy.note}</Label>
                <Input
                  id="sales-inv-rem-note"
                  value={reminderNote}
                  placeholder={reminderCopy.notePlaceholder}
                  autoComplete="off"
                  onChange={(e) => setReminderNote(e.target.value)}
                  disabled={reminderBusy}
                />
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => void recordInvoiceReminder()}
                disabled={reminderBusy}
              >
                {reminderBusy ? reminderCopy.submitting : reminderCopy.submit}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
      <SalesLinesSection
        locale={locale}
        mode="invoices"
        documentId={inv.id}
        lines={inv.lines}
        onDocumentUpdated={(next) =>
          setDetail(
            "quote" in next
              ? { mode: "quotes", data: next }
              : { mode: "invoices", data: next },
          )
        }
      />
      <AlertDialog
        open={confirmDeletePaymentId !== null}
        onOpenChange={(open) => {
          if (!open && !paymentDeleteBusy) setConfirmDeletePaymentId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {paymentCopy.confirmDeletePaymentTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {paymentCopy.confirmDeletePaymentDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={paymentDeleteBusy}>
              {lifecycleCopy.confirmCancel}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={paymentDeleteBusy || confirmDeletePaymentId === null}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void runDeleteInvoicePayment();
              }}
            >
              {paymentDeleteBusy
                ? locale === "en"
                  ? "Working…"
                  : "Bitte warten …"
                : paymentCopy.deletePayment}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open && !actionBusy) setConfirmAction(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionBusy}>
              {lifecycleCopy.confirmCancel}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={actionBusy || confirmAction === null}
              onClick={(event) => {
                event.preventDefault();
                if (confirmAction) {
                  void runLifecycleAction(confirmAction);
                }
              }}
            >
              {actionBusy ? (locale === "en" ? "Working…" : "Bitte warten …") : lifecycleCopy.confirmAction}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
