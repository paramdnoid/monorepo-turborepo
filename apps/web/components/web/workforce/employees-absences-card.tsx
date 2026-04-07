"use client";

import { useCallback, useEffect, useState } from "react";

import {
  employeeSickListResponseSchema,
  employeeVacationListResponseSchema,
  type EmployeeSickReport,
  type EmployeeVacationRequest,
} from "@repo/api-contracts";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/card";
import { Checkbox } from "@repo/ui/checkbox";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Textarea } from "@repo/ui/textarea";

import { getEmployeesCopy } from "@/content/employees-module";
import type { Locale } from "@/lib/i18n/locale";
import { parseResponseJson } from "@/lib/parse-response-json";
import { toast } from "sonner";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function statusLabel(
  status: EmployeeVacationRequest["status"],
  t: ReturnType<typeof getEmployeesCopy>,
): string {
  if (status === "approved") return t.vacationStatusApproved;
  if (status === "rejected") return t.vacationStatusRejected;
  return t.vacationStatusPending;
}

function statusVariant(
  status: EmployeeVacationRequest["status"],
): "default" | "secondary" | "outline" {
  if (status === "approved") return "secondary";
  if (status === "rejected") return "outline";
  return "default";
}

export function EmployeesAbsencesCard({
  locale,
  employeeId,
  mode = "all",
}: {
  locale: Locale;
  employeeId: string;
  mode?: "all" | "vacation" | "sick";
}) {
  const t = getEmployeesCopy(locale);

  const [vacationRows, setVacationRows] = useState<EmployeeVacationRequest[]>([]);
  const [sickRows, setSickRows] = useState<EmployeeSickReport[]>([]);
  const [vacationLoadError, setVacationLoadError] = useState<string | null>(null);
  const [sickLoadError, setSickLoadError] = useState<string | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [canDecideVacation, setCanDecideVacation] = useState(false);

  const [vacationFrom, setVacationFrom] = useState(todayIso());
  const [vacationTo, setVacationTo] = useState(todayIso());
  const [vacationReason, setVacationReason] = useState("");
  const [vacationBusy, setVacationBusy] = useState(false);
  const [vacationMsg, setVacationMsg] = useState<string | null>(null);
  const [vacationError, setVacationError] = useState<string | null>(null);
  const [decisionBusyId, setDecisionBusyId] = useState<string | null>(null);

  const [sickFrom, setSickFrom] = useState(todayIso());
  const [sickTo, setSickTo] = useState(todayIso());
  const [sickConfidential, setSickConfidential] = useState("");
  const [certificateRequired, setCertificateRequired] = useState(false);
  const [sickBusy, setSickBusy] = useState(false);
  const [sickMsg, setSickMsg] = useState<string | null>(null);
  const [sickError, setSickError] = useState<string | null>(null);
  const [canViewSickConfidential, setCanViewSickConfidential] = useState(false);
  const [canCreateSickConfidential, setCanCreateSickConfidential] = useState(false);

  const loadAbsences = useCallback(async () => {
    setVacationLoadError(null);
    setSickLoadError(null);
    if (mode === "all" || mode === "vacation") {
      try {
        const vacationRes = await fetch(
          `/api/web/employees/${encodeURIComponent(employeeId)}/vacation`,
          { credentials: "include" },
        );
        const vacationText = await vacationRes.text();
        const vacationJson = parseResponseJson(vacationText);
        const vacationParsed =
          employeeVacationListResponseSchema.safeParse(vacationJson);
        if (!vacationRes.ok || !vacationParsed.success) {
          setVacationLoadError(t.vacationListError);
        } else {
          setVacationRows(vacationParsed.data.requests);
          setCanDecideVacation(vacationParsed.data.permissions.canDecide);
        }
      } catch {
        setVacationLoadError(t.vacationListError);
      }
    }

    if (mode === "all" || mode === "sick") {
      try {
        const sickRes = await fetch(
          `/api/web/employees/${encodeURIComponent(employeeId)}/sick`,
          {
            credentials: "include",
          },
        );
        const sickText = await sickRes.text();
        const sickJson = parseResponseJson(sickText);
        const sickParsed = employeeSickListResponseSchema.safeParse(sickJson);
        if (!sickRes.ok || !sickParsed.success) {
          setSickLoadError(t.sickListError);
        } else {
          setSickRows(sickParsed.data.reports);
          setCanViewSickConfidential(sickParsed.data.permissions.canViewConfidential);
          setCanCreateSickConfidential(sickParsed.data.permissions.canCreateConfidential);
        }
      } catch {
        setSickLoadError(t.sickListError);
      }
    }
  }, [employeeId, mode, t.sickListError, t.vacationListError]);

  useEffect(() => {
    void loadAbsences();
  }, [loadAbsences]);

  async function submitVacation(e: React.FormEvent) {
    e.preventDefault();
    setVacationMsg(null);
    setVacationError(null);
    setDecisionError(null);
    setVacationBusy(true);
    try {
      const res = await fetch(`/api/web/employees/${encodeURIComponent(employeeId)}/vacation`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromDate: vacationFrom,
          toDate: vacationTo,
          reason: vacationReason.trim() ? vacationReason.trim() : null,
        }),
      });
      if (!res.ok) {
        const errText = t.vacationSubmitError;
        setVacationError(errText);
        toast.error(errText);
        return;
      }
      setVacationMsg(t.vacationCreated);
      toast.success(t.vacationCreated);
      setVacationReason("");
      await loadAbsences();
    } catch {
      const errText = t.vacationSubmitError;
      setVacationError(errText);
      toast.error(errText);
    } finally {
      setVacationBusy(false);
    }
  }

  async function submitDecision(vacationId: string, status: "approved" | "rejected") {
    setDecisionError(null);
    setDecisionBusyId(vacationId);
    try {
      const res = await fetch(
        `/api/web/employees/${encodeURIComponent(employeeId)}/vacation/${encodeURIComponent(vacationId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, decisionNote: null }),
        },
      );
      if (!res.ok) {
        const errText =
          res.status === 403 ? t.vacationDecisionForbidden : t.vacationDecisionError;
        setDecisionError(errText);
        toast.error(errText);
        return;
      }
      toast.success(
        status === "approved" ? t.toastVacationApproved : t.toastVacationRejected,
      );
      await loadAbsences();
    } catch {
      const errText = t.vacationDecisionError;
      setDecisionError(errText);
      toast.error(errText);
    } finally {
      setDecisionBusyId(null);
    }
  }

  async function submitSick(e: React.FormEvent) {
    e.preventDefault();
    setSickMsg(null);
    setSickError(null);
    setSickBusy(true);
    try {
      const res = await fetch(`/api/web/employees/${encodeURIComponent(employeeId)}/sick`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromDate: sickFrom,
          toDate: sickTo,
          confidentialNote:
            canCreateSickConfidential && sickConfidential.trim()
              ? sickConfidential.trim()
              : null,
          certificateRequired,
        }),
      });
      if (!res.ok) {
        const errText =
          res.status === 403 ? t.sickConfidentialNoPermission : t.sickSubmitError;
        setSickError(errText);
        toast.error(errText);
        return;
      }
      setSickMsg(t.sickCreated);
      toast.success(t.sickCreated);
      setSickConfidential("");
      setCertificateRequired(false);
      await loadAbsences();
    } catch {
      const errText = t.sickSubmitError;
      setSickError(errText);
      toast.error(errText);
    } finally {
      setSickBusy(false);
    }
  }

  return (
    <>
      {mode === "all" || mode === "vacation" ? (
        <Card className="border-border/80 bg-muted/15 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">{t.sectionVacation}</CardTitle>
            <CardDescription className="text-xs">{t.vacationHistoryTitle}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {vacationError ? <p className="text-sm text-destructive">{vacationError}</p> : null}
            {vacationMsg ? <p className="text-sm text-muted-foreground">{vacationMsg}</p> : null}
            {vacationLoadError ? (
              <p className="text-sm text-destructive">{vacationLoadError}</p>
            ) : null}
            {decisionError ? <p className="text-sm text-destructive">{decisionError}</p> : null}
            {!canDecideVacation ? (
              <p className="text-xs text-muted-foreground">{t.vacationDecisionNoPermission}</p>
            ) : null}

            <form onSubmit={(ev) => void submitVacation(ev)} className="grid gap-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor={`vac-from-${employeeId}`}>{t.vacationFrom}</Label>
                  <Input
                    id={`vac-from-${employeeId}`}
                    type="date"
                    value={vacationFrom}
                    onChange={(ev) => setVacationFrom(ev.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`vac-to-${employeeId}`}>{t.vacationTo}</Label>
                  <Input
                    id={`vac-to-${employeeId}`}
                    type="date"
                    value={vacationTo}
                    onChange={(ev) => setVacationTo(ev.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`vac-reason-${employeeId}`}>{t.vacationReason}</Label>
                <Textarea
                  id={`vac-reason-${employeeId}`}
                  value={vacationReason}
                  onChange={(ev) => setVacationReason(ev.target.value)}
                  rows={2}
                />
              </div>
              <div>
                <Button type="submit" disabled={vacationBusy}>
                  {vacationBusy ? t.vacationSubmitting : t.vacationSubmit}
                </Button>
              </div>
            </form>

            {vacationRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.vacationEmpty}</p>
            ) : (
              <ul className="space-y-2">
                {vacationRows.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusVariant(r.status)}>{statusLabel(r.status, t)}</Badge>
                      <span className="text-sm">
                        {r.fromDate} - {r.toDate}
                      </span>
                      {r.reason ? (
                        <span className="text-sm text-muted-foreground">({r.reason})</span>
                      ) : null}
                    </div>
                    {r.status === "pending" && canDecideVacation ? (
                      <div className="mt-2 flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={decisionBusyId === r.id}
                          onClick={() => void submitDecision(r.id, "approved")}
                        >
                          {t.vacationApprove}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={decisionBusyId === r.id}
                          onClick={() => void submitDecision(r.id, "rejected")}
                        >
                          {t.vacationReject}
                        </Button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      {mode === "all" || mode === "sick" ? (
        <Card className="border-border/80 bg-muted/15 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">{t.sectionSick}</CardTitle>
            <CardDescription className="text-xs">{t.sickHistoryTitle}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sickError ? <p className="text-sm text-destructive">{sickError}</p> : null}
            {sickMsg ? <p className="text-sm text-muted-foreground">{sickMsg}</p> : null}
            {sickLoadError ? <p className="text-sm text-destructive">{sickLoadError}</p> : null}

            <form onSubmit={(ev) => void submitSick(ev)} className="grid gap-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor={`sick-from-${employeeId}`}>{t.sickFrom}</Label>
                  <Input
                    id={`sick-from-${employeeId}`}
                    type="date"
                    value={sickFrom}
                    onChange={(ev) => setSickFrom(ev.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor={`sick-to-${employeeId}`}>{t.sickTo}</Label>
                  <Input
                    id={`sick-to-${employeeId}`}
                    type="date"
                    value={sickTo}
                    onChange={(ev) => setSickTo(ev.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`sick-note-${employeeId}`}>{t.sickConfidential}</Label>
                <Textarea
                  id={`sick-note-${employeeId}`}
                  value={sickConfidential}
                  onChange={(ev) => setSickConfidential(ev.target.value)}
                  rows={2}
                  disabled={!canCreateSickConfidential}
                />
                {!canCreateSickConfidential ? (
                  <p className="text-xs text-muted-foreground">
                    {t.sickConfidentialNoPermission}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`sick-cert-${employeeId}`}
                  checked={certificateRequired}
                  onCheckedChange={(v) => setCertificateRequired(v === true)}
                />
                <Label htmlFor={`sick-cert-${employeeId}`} className="font-normal">
                  {t.sickCertificateRequired}
                </Label>
              </div>
              <div>
                <Button type="submit" disabled={sickBusy}>
                  {sickBusy ? t.sickSubmitting : t.sickSubmit}
                </Button>
              </div>
            </form>

            {sickRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.sickEmpty}</p>
            ) : (
              <ul className="space-y-2">
                {sickRows.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2"
                  >
                    <p className="text-sm">
                      {r.fromDate} - {r.toDate}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.sickCertificateRequired}: {r.certificateRequired ? "Ja" : "Nein"}
                    </p>
                    {r.confidentialNote ? (
                      <p className="text-xs text-muted-foreground">{r.confidentialNote}</p>
                    ) : r.confidentialNoteRedacted && !canViewSickConfidential ? (
                      <p className="text-xs text-muted-foreground">{t.sickConfidentialRedacted}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
