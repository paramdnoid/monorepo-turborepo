"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";
import { FileOutput, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { TradeFeatureItem } from "@/content/trades";
import type { Locale } from "@/lib/i18n/locale";
import { TradeFeatureIcon } from "@/components/marketing/trades/trade-feature-icon";
import { datevSettingsResponseSchema } from "@repo/api-contracts";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/alert";
import { Button } from "@repo/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@repo/ui/field";
import { Input } from "@repo/ui/input";

function defaultRangeIso(): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const from = first.toISOString().slice(0, 10);
  return { from, to };
}

export function DatevInterfaceContent({
  locale,
  feature,
}: {
  locale: Locale;
  feature: TradeFeatureItem;
}) {
  const isEn = locale === "en";

  const benefit = isEn
    ? "Export booking data for outgoing invoices as a semicolon CSV aligned with common DATEV booking imports. Validate the column layout with your tax advisor before production use."
    : "Ausgangsrechnungen als Semikolon-CSV exportieren, orientiert an gaengigen DATEV-Buchungsimporten. Spaltenlayout vor Produktivnutzung mit dem Steuerberater pruefen.";

  const disclaimer = isEn
    ? "No tax or legal advice. Agreement on chart of accounts, tax keys, and file format with your advisor is required."
    : "Keine Steuer- oder Rechtsberatung. Kontenrahmen, Steuerschluessel und Dateiformat sind mit dem Berater abzustimmen.";

  const formatHint = isEn
    ? "One booking line per invoice (debit debtor account, credit revenue account). Only invoices with status sent, paid, or overdue in the selected period are included."
    : "Eine Buchungszeile pro Rechnung (Soll Debitor, Haben Erlös). Es werden nur Rechnungen mit Status versendet, bezahlt oder überfällig im Zeitraum exportiert.";

  const copy = {
    loadFailed: isEn ? "Could not load DATEV settings." : "DATEV-Einstellungen konnten nicht geladen werden.",
    saveFailed: isEn ? "Save failed." : "Speichern fehlgeschlagen.",
    saved: isEn ? "Settings saved." : "Einstellungen gespeichert.",
    exportFailed: isEn ? "Export failed." : "Export fehlgeschlagen.",
    exportNeedAccounts: isEn
      ? "Set debtor and revenue accounts below, then save."
      : "Bitte Debitoren- und Erlöskonto unten eintragen und speichern.",
    exportInvalidRange: isEn ? "Check the date range (from ≤ to)." : "Zeitraum pruefen (von ≤ bis).",
    exportSuccess: isEn ? "Download started." : "Download gestartet.",
    advisor: isEn ? "Advisor no. (Berater-Nr.)" : "Berater-Nr.",
    client: isEn ? "Client no. (Mandanten-Nr.)" : "Mandanten-Nr.",
    debtor: isEn ? "Debtor account (Soll)" : "Debitorenkonto (Soll)",
    revenue: isEn ? "Revenue account (Haben)" : "Erlöskonto (Haben)",
    vatKey: isEn ? "Tax key (BU-Schlüssel)" : "BU-/Steuerschlüssel",
    vatHint: isEn
      ? "Optional; leave empty if your advisor maps tax separately."
      : "Optional; leer lassen, wenn der Berater die Umsatzsteuer separat abbildet.",
    from: isEn ? "From" : "Von",
    to: isEn ? "To" : "Bis",
    save: isEn ? "Save settings" : "Einstellungen speichern",
    exportLabel: isEn ? "Download CSV (bookings)" : "CSV Buchungen herunterladen",
    paramsTitle: isEn ? "DATEV export parameters" : "DATEV-Exportparameter",
    periodTitle: isEn ? "Posting period" : "Buchungszeitraum",
    faqLabel: isEn ? "FAQ: interfaces & exports" : "FAQ: Schnittstellen & Exporte",
  };

  const range = defaultRangeIso();
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [advisorNumber, setAdvisorNumber] = useState("");
  const [clientNumber, setClientNumber] = useState("");
  const [defaultDebtorAccount, setDefaultDebtorAccount] = useState("");
  const [defaultRevenueAccount, setDefaultRevenueAccount] = useState("");
  const [defaultVatKey, setDefaultVatKey] = useState("");
  const [dateFrom, setDateFrom] = useState(range.from);
  const [dateTo, setDateTo] = useState(range.to);
  const [pending, startTransition] = useTransition();
  const [exportBusy, setExportBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/web/datev/settings", { cache: "no-store" });
      const json: unknown = await res.json();
      if (!res.ok) {
        setLoadError(
          typeof json === "object" && json !== null && "error" in json
            ? String((json as { error?: unknown }).error)
            : copy.loadFailed,
        );
        setLoaded(true);
        return;
      }
      const parsed = datevSettingsResponseSchema.safeParse(json);
      if (!parsed.success) {
        setLoadError(copy.loadFailed);
        setLoaded(true);
        return;
      }
      const s = parsed.data.settings;
      setAdvisorNumber(s.advisorNumber ?? "");
      setClientNumber(s.clientNumber ?? "");
      setDefaultDebtorAccount(s.defaultDebtorAccount ?? "");
      setDefaultRevenueAccount(s.defaultRevenueAccount ?? "");
      setDefaultVatKey(s.defaultVatKey ?? "");
      setLoaded(true);
    } catch {
      setLoadError(copy.loadFailed);
      setLoaded(true);
    }
  }, [copy.loadFailed]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function handleSave() {
    startTransition(() => {
      void (async () => {
        const patch = {
          advisorNumber: advisorNumber.trim() === "" ? null : advisorNumber.trim(),
          clientNumber: clientNumber.trim() === "" ? null : clientNumber.trim(),
          defaultDebtorAccount:
            defaultDebtorAccount.trim() === "" ? null : defaultDebtorAccount.trim(),
          defaultRevenueAccount:
            defaultRevenueAccount.trim() === "" ? null : defaultRevenueAccount.trim(),
          defaultVatKey: defaultVatKey.trim() === "" ? null : defaultVatKey.trim(),
        };
        try {
          const res = await fetch("/api/web/datev/settings", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
          });
          if (!res.ok) {
            toast.error(copy.saveFailed);
            return;
          }
          toast.success(copy.saved);
          await refresh();
        } catch {
          toast.error(copy.saveFailed);
        }
      })();
    });
  }

  async function handleExport() {
    if (dateFrom > dateTo) {
      toast.error(copy.exportInvalidRange);
      return;
    }
    setExportBusy(true);
    try {
      const qs = new URLSearchParams({ from: dateFrom, to: dateTo });
      const res = await fetch(`/api/web/datev/export/bookings?${qs.toString()}`, {
        cache: "no-store",
      });
      if (res.status === 409) {
        toast.error(copy.exportNeedAccounts);
        setExportBusy(false);
        return;
      }
      if (!res.ok) {
        toast.error(copy.exportFailed);
        setExportBusy(false);
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get("content-disposition");
      let filename = `datev-buchungen-${dateFrom}-${dateTo}.csv`;
      const m = /filename="([^"]+)"/.exec(cd ?? "");
      if (m?.[1]) {
        filename = m[1];
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(copy.exportSuccess);
    } catch {
      toast.error(copy.exportFailed);
    } finally {
      setExportBusy(false);
    }
  }

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

      <Alert className="border-primary/20 bg-primary/5">
        <Info className="text-primary" aria-hidden="true" />
        <AlertTitle>{isEn ? "What this does" : "Funktion"}</AlertTitle>
        <AlertDescription className="space-y-2 text-muted-foreground">
          <p>{benefit}</p>
          <p className="text-xs">{formatHint}</p>
          <p className="text-xs text-muted-foreground/90">{disclaimer}</p>
        </AlertDescription>
      </Alert>

      <Card className="border-border/80 bg-muted/15 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">{copy.paramsTitle}</CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            {isEn
              ? "Advisor and client numbers are stored for your records; the CSV lists booking lines only."
              : "Berater- und Mandanten-Nummer werden fuer Sie gespeichert; die CSV enthaelt die Buchungszeilen."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!loaded && !loadError ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              {isEn ? "Loading…" : "Laden…"}
            </div>
          ) : null}
          {loadError ? (
            <p className="text-sm text-destructive">{loadError}</p>
          ) : null}
          <FieldGroup className="gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="datev-advisor">{copy.advisor}</FieldLabel>
                <FieldContent>
                  <Input
                    id="datev-advisor"
                    value={advisorNumber}
                    onChange={(e) => setAdvisorNumber(e.target.value)}
                    autoComplete="off"
                    className="font-mono text-xs tabular-nums"
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="datev-client">{copy.client}</FieldLabel>
                <FieldContent>
                  <Input
                    id="datev-client"
                    value={clientNumber}
                    onChange={(e) => setClientNumber(e.target.value)}
                    autoComplete="off"
                    className="font-mono text-xs tabular-nums"
                  />
                </FieldContent>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="datev-debtor">{copy.debtor}</FieldLabel>
                <FieldContent>
                  <Input
                    id="datev-debtor"
                    value={defaultDebtorAccount}
                    onChange={(e) => setDefaultDebtorAccount(e.target.value)}
                    autoComplete="off"
                    className="font-mono text-xs tabular-nums"
                    placeholder="1200"
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="datev-revenue">{copy.revenue}</FieldLabel>
                <FieldContent>
                  <Input
                    id="datev-revenue"
                    value={defaultRevenueAccount}
                    onChange={(e) => setDefaultRevenueAccount(e.target.value)}
                    autoComplete="off"
                    className="font-mono text-xs tabular-nums"
                    placeholder="8400"
                  />
                </FieldContent>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="datev-vat">{copy.vatKey}</FieldLabel>
              <FieldContent>
                <Input
                  id="datev-vat"
                  value={defaultVatKey}
                  onChange={(e) => setDefaultVatKey(e.target.value)}
                  autoComplete="off"
                  className="font-mono text-xs tabular-nums"
                  placeholder={isEn ? "e.g. 9" : "z. B. 9"}
                />
              </FieldContent>
              <FieldDescription>{copy.vatHint}</FieldDescription>
            </Field>
          </FieldGroup>

          <div className="space-y-3 border-t pt-6">
            <h3 className="text-sm font-medium">{copy.periodTitle}</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="datev-from">{copy.from}</FieldLabel>
                <FieldContent>
                  <Input
                    id="datev-from"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="font-mono text-xs"
                  />
                </FieldContent>
              </Field>
              <Field>
                <FieldLabel htmlFor="datev-to">{copy.to}</FieldLabel>
                <FieldContent>
                  <Input
                    id="datev-to"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="font-mono text-xs"
                  />
                </FieldContent>
              </Field>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-3 border-t pt-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="secondary"
              disabled={!loaded || Boolean(loadError) || pending}
              onClick={() => handleSave()}
              className="inline-flex w-full items-center gap-2 sm:w-auto"
            >
              {pending ? (
                <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
              ) : null}
              {copy.save}
            </Button>
            <Button
              type="button"
              disabled={!loaded || Boolean(loadError) || exportBusy}
              onClick={() => void handleExport()}
              className="inline-flex w-full items-center gap-2 sm:w-auto"
            >
              {exportBusy ? (
                <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
              ) : (
                <FileOutput className="size-4 shrink-0" aria-hidden="true" />
              )}
              {copy.exportLabel}
            </Button>
          </div>
          <p className="text-center text-xs text-muted-foreground sm:text-right">
            UTF-8 CSV · {isEn ? "semicolon-separated" : "Semikolon-getrennt"}
          </p>
        </CardFooter>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/legal/faq"
          className="font-medium text-primary underline underline-offset-4 hover:text-foreground"
        >
          {copy.faqLabel}
        </Link>
      </p>
    </div>
  );
}
