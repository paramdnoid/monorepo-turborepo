"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  employeeRelationshipsListResponseSchema,
  employeesListResponseSchema,
} from "@repo/api-contracts";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/card";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";

import { getEmployeesCopy } from "@/content/employees-module";
import type { Locale } from "@/lib/i18n/locale";
import { parseResponseJson } from "@/lib/parse-response-json";
import { toast } from "sonner";

type RelationshipRow = {
  id: string;
  kind: "MUTUALLY_EXCLUSIVE" | "MENTOR_TRAINEE";
  counterpartEmployeeId: string;
  counterpartDisplayName: string;
  note: string | null;
};

export function EmployeesRelationshipsCard({
  employeeId,
  locale,
  canEdit,
}: {
  employeeId: string;
  locale: Locale;
  canEdit: boolean;
}) {
  const t = useMemo(() => getEmployeesCopy(locale), [locale]);
  const [rows, setRows] = useState<RelationshipRow[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [targetId, setTargetId] = useState("");
  const [kind, setKind] = useState<"MUTUALLY_EXCLUSIVE" | "MENTOR_TRAINEE">(
    "MUTUALLY_EXCLUSIVE",
  );
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [employeesRes, relationshipsRes] = await Promise.all([
        fetch("/api/web/employees?limit=500", { credentials: "include" }),
        fetch(`/api/web/employees/${encodeURIComponent(employeeId)}/relationships`, {
          credentials: "include",
        }),
      ]);
      const [employeesText, relationshipsText] = await Promise.all([
        employeesRes.text(),
        relationshipsRes.text(),
      ]);
      const employeesJson = parseResponseJson(employeesText);
      const relationshipsJson = parseResponseJson(relationshipsText);
      const parsedEmployees = employeesListResponseSchema.safeParse(employeesJson);
      const parsedRelationships =
        employeeRelationshipsListResponseSchema.safeParse(relationshipsJson);
      if (
        !employeesRes.ok ||
        !relationshipsRes.ok ||
        !parsedEmployees.success ||
        !parsedRelationships.success
      ) {
        return;
      }

      setEmployeeOptions(
        parsedEmployees.data.employees
          .map((e) => ({ id: e.id, name: e.displayName }))
          .filter((e) => e.id !== employeeId),
      );
      setRows(
        parsedRelationships.data.relationships.map((r) => ({
          id: r.id,
          kind: r.kind,
          counterpartEmployeeId:
            r.fromEmployeeId === employeeId ? r.toEmployeeId : r.fromEmployeeId,
          counterpartDisplayName: r.counterpartDisplayName ?? "—",
          note: r.note ?? null,
        })),
      );
    } catch {
      // silent
    }
  }, [employeeId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!targetId && employeeOptions.length > 0) {
      setTargetId(employeeOptions[0]!.id);
    }
  }, [employeeOptions, targetId]);

  async function addRelationship() {
    if (!targetId) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/web/employees/${encodeURIComponent(employeeId)}/relationships`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            toEmployeeId: targetId,
            kind,
            note: note.trim() ? note.trim() : null,
          }),
        },
      );
      if (!res.ok) {
        toast.error(t.relationshipSaveError);
        return;
      }
      setNote("");
      await load();
    } catch {
      toast.error(t.relationshipSaveError);
    } finally {
      setBusy(false);
    }
  }

  async function removeRelationship(id: string) {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/web/employees/${encodeURIComponent(employeeId)}/relationships/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      if (!res.ok) {
        toast.error(t.relationshipSaveError);
        return;
      }
      await load();
    } catch {
      toast.error(t.relationshipSaveError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-border/80 bg-muted/15 shadow-none">
      <CardHeader>
        <CardTitle className="text-base">{t.relationshipsCardTitle}</CardTitle>
        <CardDescription className="text-xs">{t.relationshipsCardDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {canEdit ? (
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor={`relationship-kind-${employeeId}`}>{t.relationshipKindLabel}</Label>
              <Select
                value={kind}
                onValueChange={(v) =>
                  setKind(v as "MUTUALLY_EXCLUSIVE" | "MENTOR_TRAINEE")
                }
              >
                <SelectTrigger id={`relationship-kind-${employeeId}`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MUTUALLY_EXCLUSIVE">{t.relationshipKindMutex}</SelectItem>
                  <SelectItem value="MENTOR_TRAINEE">{t.relationshipKindMentor}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`relationship-counterpart-${employeeId}`}>
                {t.relationshipCounterpartLabel}
              </Label>
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger id={`relationship-counterpart-${employeeId}`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {employeeOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="relationship-note">{t.relationshipNoteLabel}</Label>
              <Input
                id="relationship-note"
                value={note}
                onChange={(ev) => setNote(ev.target.value)}
                onKeyDown={(ev) => {
                  if (ev.key !== "Enter") return;
                  ev.preventDefault();
                  void addRelationship();
                }}
              />
            </div>
            <div className="flex justify-end">
              <Button type="button" onClick={() => void addRelationship()} disabled={busy || !targetId}>
                {t.relationshipAdd}
              </Button>
            </div>
          </div>
        ) : null}

        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t.relationshipsEmpty}</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/10 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {r.kind === "MUTUALLY_EXCLUSIVE" ? t.relationshipKindMutex : t.relationshipKindMentor}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.counterpartDisplayName}
                    {r.note ? ` · ${r.note}` : ""}
                  </p>
                </div>
                {canEdit ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void removeRelationship(r.id)}
                    disabled={busy}
                  >
                    {t.relationshipRemove}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
