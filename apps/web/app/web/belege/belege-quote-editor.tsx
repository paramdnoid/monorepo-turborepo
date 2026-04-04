"use client";

import { useEffect, useState } from "react";
import {
  SALES_QUOTE_STATUS_OPTIONS,
  type SalesQuoteStatus,
  salesQuoteDetailResponseSchema,
  salesQuoteDetailSchema,
} from "@repo/api-contracts";
import type { z } from "zod";
import { Alert, AlertDescription } from "@repo/ui/alert";
import { Button } from "@repo/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/dialog";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";

import {
  getBelegeSalesFormCopy,
  getBelegeSalesTableCopy,
} from "@/content/belege-module";
import type { Locale } from "@/lib/i18n/locale";
import { fetchBelegeProjectOptions } from "./belege-sales-lookups";
import {
  dateInputToIsoNoon,
  formatMinorCurrency,
  isoToDateInputValue,
  parseMajorToMinorUnits,
} from "@/lib/money-format";

type QuoteDetail = z.infer<typeof salesQuoteDetailSchema>;

function quoteStatusLabel(locale: Locale, s: SalesQuoteStatus): string {
  if (locale === "en") {
    const m: Record<SalesQuoteStatus, string> = {
      draft: "Draft",
      sent: "Sent",
      accepted: "Accepted",
      rejected: "Rejected",
      expired: "Expired",
    };
    return m[s];
  }
  const m: Record<SalesQuoteStatus, string> = {
    draft: "Entwurf",
    sent: "Versendet",
    accepted: "Angenommen",
    rejected: "Abgelehnt",
    expired: "Abgelaufen",
  };
  return m[s];
}

type BelegeQuoteCreateDialogProps = {
  locale: Locale;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
};

export function BelegeQuoteCreateDialog({
  locale,
  open,
  onOpenChange,
  onCreated,
}: BelegeQuoteCreateDialogProps) {
  const fc = getBelegeSalesFormCopy(locale);
  const tc = getBelegeSalesTableCopy(locale);
  const [documentNumber, setDocumentNumber] = useState("");
  const [customerLabel, setCustomerLabel] = useState("");
  const [status, setStatus] = useState<SalesQuoteStatus>("draft");
  const [totalStr, setTotalStr] = useState("");
  const [validUntilYmd, setValidUntilYmd] = useState("");
  const [projectId, setProjectId] = useState("");
  const [projectOptions, setProjectOptions] = useState<
    { id: string; title: string }[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDocumentNumber("");
      setCustomerLabel("");
      setStatus("draft");
      setTotalStr("");
      setValidUntilYmd("");
      setProjectId("");
      setError(null);
      void fetchBelegeProjectOptions().then(setProjectOptions);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const totalCents = parseMajorToMinorUnits(totalStr, locale);
    if (totalCents === null) {
      setError(fc.validationAmount);
      return;
    }
    if (!documentNumber.trim() || !customerLabel.trim()) {
      setError(fc.saveFailed);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/web/sales/quotes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentNumber: documentNumber.trim(),
          customerLabel: customerLabel.trim(),
          status,
          currency: "EUR",
          totalCents,
          validUntil: dateInputToIsoNoon(validUntilYmd),
          projectId: projectId === "" ? null : projectId,
        }),
      });
      if (res.status === 409) {
        setError(fc.conflictNumber);
        return;
      }
      if (!res.ok) {
        setError(fc.saveFailed);
        return;
      }
      onCreated();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{fc.newQuote}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <div className="grid gap-2">
              <Label htmlFor="q-doc">{fc.docNumber}</Label>
              <Input
                id="q-doc"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                autoComplete="off"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="q-cust">{fc.customer}</Label>
              <Input
                id="q-cust"
                value={customerLabel}
                onChange={(e) => setCustomerLabel(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>{tc.status}</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as SalesQuoteStatus)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SALES_QUOTE_STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {quoteStatusLabel(locale, s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="q-total">{fc.total}</Label>
              <Input
                id="q-total"
                placeholder={fc.totalPlaceholder}
                value={totalStr}
                onChange={(e) => setTotalStr(e.target.value)}
                inputMode="decimal"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="q-valid">{fc.validUntil}</Label>
              <Input
                id="q-valid"
                type="date"
                value={validUntilYmd}
                onChange={(e) => setValidUntilYmd(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>{fc.linkProject}</Label>
              <Select
                value={projectId === "" ? "__none__" : projectId}
                onValueChange={(v) =>
                  setProjectId(v === "__none__" ? "" : v)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={fc.noneProject} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{fc.noneProject}</SelectItem>
                  {projectOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              {fc.cancel}
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? fc.saving : fc.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type BelegeQuoteEditFormProps = {
  locale: Locale;
  quote: QuoteDetail;
  onSaved: (next: QuoteDetail) => void;
  onCancel: () => void;
};

export function BelegeQuoteEditForm({
  locale,
  quote,
  onSaved,
  onCancel,
}: BelegeQuoteEditFormProps) {
  const fc = getBelegeSalesFormCopy(locale);
  const tc = getBelegeSalesTableCopy(locale);
  const [documentNumber, setDocumentNumber] = useState(quote.documentNumber);
  const [customerLabel, setCustomerLabel] = useState(quote.customerLabel);
  const [status, setStatus] = useState<SalesQuoteStatus>(
    quote.status as SalesQuoteStatus,
  );
  const [totalStr, setTotalStr] = useState(() =>
    (quote.totalCents / 100).toLocaleString(
      locale === "en" ? "en-US" : "de-DE",
      { minimumFractionDigits: 2, maximumFractionDigits: 2 },
    ),
  );
  const [validUntilYmd, setValidUntilYmd] = useState(
    isoToDateInputValue(quote.validUntil),
  );
  const [projectId, setProjectId] = useState<string>(quote.projectId ?? "");
  const [projectOptions, setProjectOptions] = useState<
    { id: string; title: string }[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchBelegeProjectOptions().then(setProjectOptions);
  }, []);

  useEffect(() => {
    setDocumentNumber(quote.documentNumber);
    setCustomerLabel(quote.customerLabel);
    setStatus(quote.status as SalesQuoteStatus);
    setTotalStr(
      (quote.totalCents / 100).toLocaleString(locale === "en" ? "en-US" : "de-DE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    );
    setValidUntilYmd(isoToDateInputValue(quote.validUntil));
    setProjectId(quote.projectId ?? "");
  }, [quote, locale]);

  const hasLines = quote.lines.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    let totalCents: number | null = null;
    if (!hasLines) {
      totalCents = parseMajorToMinorUnits(totalStr, locale);
      if (totalCents === null) {
        setError(fc.validationAmount);
        return;
      }
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/web/sales/quotes/${quote.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentNumber: documentNumber.trim(),
          customerLabel: customerLabel.trim(),
          status,
          currency: quote.currency,
          ...(hasLines ? {} : { totalCents }),
          validUntil: dateInputToIsoNoon(validUntilYmd),
          projectId: projectId === "" ? null : projectId,
        }),
      });
      if (res.status === 409) {
        setError(fc.conflictNumber);
        return;
      }
      if (!res.ok) {
        setError(fc.saveFailed);
        return;
      }
      const json: unknown = await res.json();
      const parsed = salesQuoteDetailResponseSchema.safeParse(json);
      if (!parsed.success) {
        setError(fc.saveFailed);
        return;
      }
      onSaved(parsed.data.quote);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="grid gap-2">
        <Label htmlFor="qe-doc">{fc.docNumber}</Label>
        <Input
          id="qe-doc"
          value={documentNumber}
          onChange={(e) => setDocumentNumber(e.target.value)}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="qe-cust">{fc.customer}</Label>
        <Input
          id="qe-cust"
          value={customerLabel}
          onChange={(e) => setCustomerLabel(e.target.value)}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label>{tc.status}</Label>
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as SalesQuoteStatus)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SALES_QUOTE_STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {quoteStatusLabel(locale, s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={hasLines ? "qe-total-display" : "qe-total"}>
          {hasLines ? fc.totalFromLines : fc.total}
        </Label>
        {hasLines ? (
          <p
            id="qe-total-display"
            className="rounded-md border border-input bg-muted/30 px-3 py-2 text-sm tabular-nums"
          >
            {formatMinorCurrency(quote.totalCents, quote.currency, locale)}
          </p>
        ) : (
          <Input
            id="qe-total"
            placeholder={fc.totalPlaceholder}
            value={totalStr}
            onChange={(e) => setTotalStr(e.target.value)}
            inputMode="decimal"
          />
        )}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="qe-valid">{fc.validUntil}</Label>
        <Input
          id="qe-valid"
          type="date"
          value={validUntilYmd}
          onChange={(e) => setValidUntilYmd(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label>{fc.linkProject}</Label>
        <Select
          value={projectId === "" ? "__none__" : projectId}
          onValueChange={(v) => setProjectId(v === "__none__" ? "" : v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={fc.noneProject} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">{fc.noneProject}</SelectItem>
            {projectOptions.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
          {fc.cancel}
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? fc.saving : fc.save}
        </Button>
      </div>
    </form>
  );
}
