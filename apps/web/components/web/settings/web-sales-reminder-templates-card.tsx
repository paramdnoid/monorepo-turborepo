"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  SALES_REMINDER_TEMPLATE_LEVEL_MAX,
  salesReminderTemplatesListResponseSchema,
  type SalesReminderTemplateLocale,
} from "@repo/api-contracts";
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
import { Textarea } from "@repo/ui/textarea";

import { getSalesReminderTemplatesSettingsCopy } from "@/content/sales-reminder-templates-settings";
import { useWebApp } from "@/components/web/shell/web-app-context";

type RowState = {
  level: number;
  bodyText: string;
  feeEuros: string;
};

function initialRows(): RowState[] {
  return Array.from({ length: SALES_REMINDER_TEMPLATE_LEVEL_MAX }, (_, i) => ({
    level: i + 1,
    bodyText: "",
    feeEuros: "",
  }));
}

function parseEurosToCents(raw: string): number | "invalid" | null {
  const t = raw.trim().replace(",", ".");
  if (t === "") {
    return null;
  }
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) {
    return "invalid";
  }
  return Math.round(n * 100);
}

export function WebSalesReminderTemplatesCard() {
  const { session } = useWebApp();
  const copy = getSalesReminderTemplatesSettingsCopy(session.locale);

  const [templateLocale, setTemplateLocale] =
    useState<SalesReminderTemplateLocale>(
      session.locale === "en" ? "en" : "de",
    );
  const [rows, setRows] = useState<RowState[]>(initialRows);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    setLoadError(null);
    setLoaded(false);
    try {
      const res = await fetch(
        `/api/web/sales/reminder-templates?locale=${encodeURIComponent(templateLocale)}`,
        { cache: "no-store" },
      );
      const json: unknown = await res.json();
      if (!res.ok) {
        setLoadError(copy.loadFailed);
        setLoaded(true);
        return;
      }
      const parsed = salesReminderTemplatesListResponseSchema.safeParse(json);
      if (!parsed.success) {
        setLoadError(copy.loadFailed);
        setLoaded(true);
        return;
      }
      setRows(
        parsed.data.templates.map((t) => ({
          level: t.level,
          bodyText: t.bodyText ?? "",
          feeEuros:
            t.feeCents != null && t.feeCents > 0
              ? (t.feeCents / 100).toFixed(2)
              : "",
        })),
      );
      setLoaded(true);
    } catch {
      setLoadError(copy.loadFailed);
      setLoaded(true);
    }
  }, [copy.loadFailed, templateLocale]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function handleSave() {
    startTransition(() => {
      void (async () => {
        const items: Array<{
          level: number;
          bodyText: string;
          feeCents: number | null;
        }> = [];
        for (const r of rows) {
          const cents = parseEurosToCents(r.feeEuros);
          if (cents === "invalid") {
            toast.error(copy.saveFailed);
            return;
          }
          items.push({
            level: r.level,
            bodyText: r.bodyText,
            feeCents: cents,
          });
        }
        try {
          const res = await fetch("/api/web/sales/reminder-templates", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ locale: templateLocale, items }),
          });
          const json: unknown = await res.json();
          if (!res.ok) {
            toast.error(copy.saveFailed);
            return;
          }
          const parsed = salesReminderTemplatesListResponseSchema.safeParse(json);
          if (!parsed.success) {
            toast.error(copy.saveFailed);
            return;
          }
          setRows(
            parsed.data.templates.map((t) => ({
              level: t.level,
              bodyText: t.bodyText ?? "",
              feeEuros:
                t.feeCents != null && t.feeCents > 0
                  ? (t.feeCents / 100).toFixed(2)
                  : "",
            })),
          );
          toast.success(copy.saved);
        } catch {
          toast.error(copy.saveFailed);
        }
      })();
    });
  }

  if (!loaded) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{copy.cardTitle}</CardTitle>
          <CardDescription>{copy.cardDescription}</CardDescription>
        </CardHeader>
        <CardContent
          className="flex items-center gap-2 text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
          {copy.loading}
        </CardContent>
      </Card>
    );
  }

  if (loadError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{copy.cardTitle}</CardTitle>
          <CardDescription>{copy.cardDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive" role="alert">
            {loadError}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            onClick={() => void refresh()}
          >
            {copy.retry}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.cardTitle}</CardTitle>
        <CardDescription>{copy.cardDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label={
            session.locale === "en"
              ? "Template language"
              : "Vorlagen-Sprache"
          }
        >
          <Button
            type="button"
            size="sm"
            variant={templateLocale === "de" ? "default" : "outline"}
            onClick={() => setTemplateLocale("de")}
          >
            {copy.localeDe}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={templateLocale === "en" ? "default" : "outline"}
            onClick={() => setTemplateLocale("en")}
          >
            {copy.localeEn}
          </Button>
        </div>

        <FieldGroup className="gap-6">
          {rows.map((r) => (
            <Field key={r.level} className="rounded-lg border bg-muted/20 p-4">
              <FieldLabel className="text-base">
                {copy.levelLabel(r.level)}
              </FieldLabel>
              <FieldContent className="mt-3 space-y-3">
                <Textarea
                  value={r.bodyText}
                  onChange={(e) => {
                    const v = e.target.value;
                    setRows((prev) =>
                      prev.map((row) =>
                        row.level === r.level ? { ...row, bodyText: v } : row,
                      ),
                    );
                  }}
                  rows={4}
                  placeholder={copy.bodyHint}
                  className="min-h-[5rem] resize-y"
                />
                <Field className="gap-1.5">
                  <FieldLabel htmlFor={`reminder-fee-${r.level}`}>
                    {copy.feeLabel}
                  </FieldLabel>
                  <Input
                    id={`reminder-fee-${r.level}`}
                    inputMode="decimal"
                    value={r.feeEuros}
                    onChange={(e) => {
                      const v = e.target.value;
                      setRows((prev) =>
                        prev.map((row) =>
                          row.level === r.level ? { ...row, feeEuros: v } : row,
                        ),
                      );
                    }}
                    placeholder="0,00"
                    className="max-w-xs"
                  />
                  <FieldDescription>{copy.feeHint}</FieldDescription>
                </Field>
              </FieldContent>
            </Field>
          ))}
        </FieldGroup>
      </CardContent>
      <CardFooter className="justify-end border-t bg-muted/30">
        <Button type="button" onClick={handleSave} disabled={pending}>
          {pending ? (
            <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
          ) : null}
          {copy.save}
        </Button>
      </CardFooter>
    </Card>
  );
}
