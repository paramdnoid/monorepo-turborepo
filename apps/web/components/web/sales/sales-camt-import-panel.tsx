"use client";

import { useState } from "react";
import Link from "next/link";
import {
  salesCamtImportResponseSchema,
  type SalesCamtImportResponse,
} from "@repo/api-contracts";

import { getSalesOpenInvoicesCopy } from "@/content/sales-module";
import type { Locale } from "@/lib/i18n/locale";
import { formatMinorCurrency } from "@/lib/money-format";
import { parseResponseJson } from "@/lib/parse-response-json";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/alert";
import { Button } from "@repo/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";
import { Input } from "@repo/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/table";

type SalesCamtImportPanelProps = {
  locale: Locale;
};

export function SalesCamtImportPanel({ locale }: SalesCamtImportPanelProps) {
  const oc = getSalesOpenInvoicesCopy(locale);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SalesCamtImportResponse | null>(null);

  const runImport = async (file: File | null) => {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/web/sales/invoices/camt-import", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
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
        setError(`${oc.camtImportError} (${code})`);
        return;
      }
      const parsed = salesCamtImportResponseSchema.safeParse(json);
      if (!parsed.success) {
        setError(oc.camtImportError);
        return;
      }
      setResult(parsed.data);
    } catch {
      setError(oc.camtImportError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{oc.camtImportTitle}</CardTitle>
        <CardDescription>{oc.camtImportHint}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="file"
            accept=".xml,text/xml,application/xml"
            disabled={busy}
            className="max-w-sm"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              void runImport(f);
              e.target.value = "";
            }}
          />
          <span className="text-xs text-muted-foreground">
            {busy ? oc.camtImportBusy : oc.camtImportRun}
          </span>
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>{oc.camtImportError}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {result && result.parseWarnings.length > 0 ? (
          <Alert>
            <AlertTitle>{oc.camtImportWarnings}</AlertTitle>
            <AlertDescription>
              {result.parseWarnings.join(" · ")}
            </AlertDescription>
          </Alert>
        ) : null}

        {result && result.entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">{oc.camtImportNoRows}</p>
        ) : null}

        {result && result.entries.length > 0 ? (
          <div className="overflow-x-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead className="text-right">{oc.camtImportColAmount}</TableHead>
                  <TableHead>{oc.camtImportColDate}</TableHead>
                  <TableHead className="max-w-[14rem]">
                    {oc.camtImportColRemittance}
                  </TableHead>
                  <TableHead>{oc.camtImportColSuggestion}</TableHead>
                  <TableHead>{oc.camtImportColConfidence}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.entries.map((row) => {
                  const top = row.matches[0];
                  const suggestion =
                    row.skipped || !top
                      ? oc.camtImportSkipped
                      : `${top.documentNumber} · ${formatMinorCurrency(
                          top.balanceCents,
                          top.currency,
                          locale,
                        )}`;
                  return (
                    <TableRow key={row.lineIndex}>
                      <TableCell className="tabular-nums">{row.lineIndex}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMinorCurrency(
                          row.amountCents,
                          row.currency,
                          locale,
                        )}
                      </TableCell>
                      <TableCell>{row.bookingDate ?? "—"}</TableCell>
                      <TableCell className="max-w-[14rem] truncate text-xs">
                        {row.remittanceInfo || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.skipped ? (
                          <span className="text-muted-foreground">
                            {row.skipReason === "not_credit"
                              ? "DBIT / —"
                              : oc.camtImportSkipped}
                          </span>
                        ) : top ? (
                          <Button variant="link" size="sm" className="h-auto p-0" asChild>
                            <Link
                              href={`/web/sales/invoices/${encodeURIComponent(top.invoiceId)}`}
                            >
                              {suggestion}
                            </Link>
                          </Button>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {row.skipped || !top ? (
                          "—"
                        ) : (
                          <span>
                            {top.confidence} ({top.score})
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
