"use client";

import * as React from "react";

import {
  employeesListResponseSchema,
  projectsListResponseSchema,
  workTimeEntriesListResponseSchema,
  workTimeEntryMutationResponseSchema,
  type WorkTimeEntry,
} from "@repo/api-contracts";
import { Button } from "@repo/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/table";

import type { Locale } from "@/lib/i18n/locale";
import { parseResponseJson } from "@/lib/parse-response-json";

const PROJECT_NONE = "__none__";

function isoDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthRange(): { from: string; to: string } {
  const now = new Date();
  const to = isoDateLocal(now);
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const from = isoDateLocal(start);
  return { from, to };
}

function formatDuration(locale: Locale, minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (locale === "en") {
    return `${h}h ${m}m`;
  }
  return `${h} Std. ${m} Min.`;
}

export function WorkTimeContent({ locale }: { locale: Locale }) {
  const initialRange = React.useMemo(() => monthRange(), []);
  const [from, setFrom] = React.useState(initialRange.from);
  const [to, setTo] = React.useState(initialRange.to);
  const [entries, setEntries] = React.useState<WorkTimeEntry[]>([]);
  const [loadBusy, setLoadBusy] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [employees, setEmployees] = React.useState<
    { id: string; displayName: string }[]
  >([]);
  const [projects, setProjects] = React.useState<
    { id: string; title: string }[]
  >([]);

  const [draftEmployeeId, setDraftEmployeeId] = React.useState("");
  const [draftDate, setDraftDate] = React.useState(isoDateLocal(new Date()));
  const [draftDurationHours, setDraftDurationHours] = React.useState("8");
  const [draftDurationMinutes, setDraftDurationMinutes] = React.useState("0");
  const [draftProjectId, setDraftProjectId] = React.useState(PROJECT_NONE);
  const [draftNotes, setDraftNotes] = React.useState("");
  const [saveBusy, setSaveBusy] = React.useState(false);

  const [editEntry, setEditEntry] = React.useState<WorkTimeEntry | null>(null);
  const [editBusy, setEditBusy] = React.useState(false);
  const [editProjectId, setEditProjectId] = React.useState(PROJECT_NONE);
  const [editNotes, setEditNotes] = React.useState("");
  const [editHours, setEditHours] = React.useState("0");
  const [editMins, setEditMins] = React.useState("0");

  const projectTitleById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const p of projects) {
      m.set(p.id, p.title);
    }
    return m;
  }, [projects]);

  const employeeNameById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const e of employees) {
      m.set(e.id, e.displayName);
    }
    return m;
  }, [employees]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [empRes, projRes] = await Promise.all([
          fetch("/api/web/employees?limit=200", { credentials: "include" }),
          fetch("/api/web/projects?limit=200", { credentials: "include" }),
        ]);
        const empText = await empRes.text();
        const projText = await projRes.text();
        const empParsed = employeesListResponseSchema.safeParse(
          parseResponseJson(empText),
        );
        const projParsed = projectsListResponseSchema.safeParse(
          parseResponseJson(projText),
        );
        if (!cancelled && empRes.ok && empParsed.success) {
          setEmployees(
            empParsed.data.employees.map((e) => ({
              id: e.id,
              displayName: e.displayName,
            })),
          );
          const first = empParsed.data.employees[0]?.id ?? "";
          setDraftEmployeeId((prev) => prev || first);
        }
        if (!cancelled && projRes.ok && projParsed.success) {
          setProjects(
            projParsed.data.projects.map((p) => ({ id: p.id, title: p.title })),
          );
        }
      } catch {
        // optional
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadEntries = React.useCallback(async () => {
    setLoadBusy(true);
    setLoadError(null);
    try {
      const qs = new URLSearchParams({ from, to }).toString();
      const res = await fetch(`/api/web/work-time/entries?${qs}`, {
        credentials: "include",
      });
      const text = await res.text();
      const json = parseResponseJson(text);
      const parsed = workTimeEntriesListResponseSchema.safeParse(json);
      if (!res.ok || !parsed.success) {
        setEntries([]);
        setLoadError(
          locale === "en"
            ? "Could not load time entries."
            : "Zeiten konnten nicht geladen werden.",
        );
        return;
      }
      setEntries(parsed.data.entries);
    } catch {
      setEntries([]);
      setLoadError(
        locale === "en"
          ? "Could not load time entries."
          : "Zeiten konnten nicht geladen werden.",
      );
    } finally {
      setLoadBusy(false);
    }
  }, [from, to, locale]);

  React.useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  React.useEffect(() => {
    if (!editEntry) {
      return;
    }
    setEditProjectId(editEntry.projectId ?? PROJECT_NONE);
    setEditNotes(editEntry.notes ?? "");
    setEditHours(String(Math.floor(editEntry.durationMinutes / 60)));
    setEditMins(String(editEntry.durationMinutes % 60));
  }, [editEntry]);

  const labels = React.useMemo(
    () =>
      locale === "en"
        ? {
            range: "Date range",
            from: "From",
            to: "To",
            reload: "Reload",
            add: "Add entry",
            employee: "Employee",
            date: "Date",
            duration: "Duration",
            hours: "Hours",
            minutes: "Minutes",
            project: "Project (optional)",
            noProject: "No project",
            notes: "Notes (optional)",
            list: "Entries",
            empty: "No entries in this range.",
            projectCol: "Project",
            actions: "Actions",
            edit: "Edit",
            remove: "Remove",
            save: "Save",
            cancel: "Cancel",
            editTitle: "Edit entry",
          }
        : {
            range: "Zeitraum",
            from: "Von",
            to: "Bis",
            reload: "Aktualisieren",
            add: "Eintrag hinzufuegen",
            employee: "Mitarbeitende:r",
            date: "Datum",
            duration: "Dauer",
            hours: "Stunden",
            minutes: "Minuten",
            project: "Projekt (optional)",
            noProject: "Kein Projekt",
            notes: "Notiz (optional)",
            list: "Buchungen",
            empty: "Keine Eintraege in diesem Zeitraum.",
            projectCol: "Projekt",
            actions: "Aktionen",
            edit: "Bearbeiten",
            remove: "Loeschen",
            save: "Speichern",
            cancel: "Abbrechen",
            editTitle: "Eintrag bearbeiten",
          },
    [locale],
  );

  async function submitCreate() {
    const h = Number(draftDurationHours);
    const min = Number(draftDurationMinutes);
    if (!draftEmployeeId || !draftDate || !Number.isFinite(h) || !Number.isFinite(min)) {
      return;
    }
    const durationMinutes = h * 60 + min;
    if (durationMinutes < 1 || durationMinutes > 24 * 60) {
      return;
    }
    setSaveBusy(true);
    try {
      const res = await fetch("/api/web/work-time/entries", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: draftEmployeeId,
          workDate: draftDate,
          durationMinutes,
          projectId: draftProjectId === PROJECT_NONE ? null : draftProjectId,
          notes: draftNotes.trim() ? draftNotes.trim() : null,
        }),
      });
      const text = await res.text();
      const json = parseResponseJson(text);
      const parsed = workTimeEntryMutationResponseSchema.safeParse(json);
      if (!res.ok || !parsed.success) {
        return;
      }
      setDraftNotes("");
      await loadEntries();
    } finally {
      setSaveBusy(false);
    }
  }

  function openEdit(entry: WorkTimeEntry) {
    setEditEntry(entry);
  }

  async function saveEdit() {
    if (!editEntry) return;
    const h = Number(editHours);
    const min = Number(editMins);
    if (!Number.isFinite(h) || !Number.isFinite(min)) {
      return;
    }
    const durationMinutes = h * 60 + min;
    if (durationMinutes < 1 || durationMinutes > 24 * 60) {
      return;
    }
    setEditBusy(true);
    try {
      const res = await fetch(
        `/api/web/work-time/entries/${encodeURIComponent(editEntry.id)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            durationMinutes,
            projectId:
              editProjectId === PROJECT_NONE ? null : editProjectId,
            notes: editNotes.trim() ? editNotes.trim() : null,
          }),
        },
      );
      const text = await res.text();
      const json = parseResponseJson(text);
      const parsed = workTimeEntryMutationResponseSchema.safeParse(json);
      if (!res.ok || !parsed.success) {
        return;
      }
      setEditEntry(null);
      await loadEntries();
    } finally {
      setEditBusy(false);
    }
  }

  async function removeEntry(id: string) {
    const msg =
      locale === "en"
        ? "Delete this time entry?"
        : "Diesen Zeiteintrag loeschen?";
    if (!window.confirm(msg)) {
      return;
    }
    try {
      const res = await fetch(`/api/web/work-time/entries/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok && res.status !== 204) {
        return;
      }
      await loadEntries();
    } catch {
      // ignore
    }
  }

  const sortedEntries = React.useMemo(
    () =>
      [...entries].sort((a, b) => {
        const d = a.workDate.localeCompare(b.workDate);
        if (d !== 0) return d;
        return a.createdAt.localeCompare(b.createdAt);
      }),
    [entries],
  );

  return (
    <div className="space-y-6">
      <Card className="border-border/80 bg-muted/15 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">{labels.range}</CardTitle>
          <CardDescription className="text-xs">
            {locale === "en"
              ? "Filter entries by work date."
              : "Einträge nach Arbeitsdatum filtern."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="grid gap-2">
            <Label htmlFor="wt-from">{labels.from}</Label>
            <Input
              id="wt-from"
              type="date"
              value={from}
              onChange={(ev) => setFrom(ev.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="wt-to">{labels.to}</Label>
            <Input
              id="wt-to"
              type="date"
              value={to}
              onChange={(ev) => setTo(ev.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => void loadEntries()}
            disabled={loadBusy}
          >
            {labels.reload}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-muted/15 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">{labels.add}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="wt-emp">{labels.employee}</Label>
            <Select value={draftEmployeeId} onValueChange={setDraftEmployeeId}>
              <SelectTrigger id="wt-emp">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="wt-d">{labels.date}</Label>
            <Input
              id="wt-d"
              type="date"
              value={draftDate}
              onChange={(ev) => setDraftDate(ev.target.value)}
            />
          </div>
          <div className="grid gap-2 sm:col-span-2 lg:col-span-1">
            <span className="text-sm font-medium leading-none">{labels.duration}</span>
            <div className="flex flex-wrap gap-2">
              <div className="grid gap-1">
                <Label htmlFor="wt-h" className="text-xs font-normal">
                  {labels.hours}
                </Label>
                <Input
                  id="wt-h"
                  type="number"
                  min={0}
                  max={24}
                  value={draftDurationHours}
                  onChange={(ev) => setDraftDurationHours(ev.target.value)}
                  className="w-24"
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="wt-m" className="text-xs font-normal">
                  {labels.minutes}
                </Label>
                <Input
                  id="wt-m"
                  type="number"
                  min={0}
                  max={59}
                  value={draftDurationMinutes}
                  onChange={(ev) => setDraftDurationMinutes(ev.target.value)}
                  className="w-24"
                />
              </div>
            </div>
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="wt-proj">{labels.project}</Label>
            <Select value={draftProjectId} onValueChange={setDraftProjectId}>
              <SelectTrigger id="wt-proj">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PROJECT_NONE}>{labels.noProject}</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="wt-notes">{labels.notes}</Label>
            <Input
              id="wt-notes"
              value={draftNotes}
              onChange={(ev) => setDraftNotes(ev.target.value)}
            />
          </div>
          <div className="flex items-end md:col-span-2 lg:col-span-3">
            <Button
              type="button"
              onClick={() => void submitCreate()}
              disabled={
                saveBusy ||
                !draftEmployeeId ||
                !(() => {
                  const h = Number(draftDurationHours);
                  const m = Number(draftDurationMinutes);
                  const dm = h * 60 + m;
                  return Number.isFinite(dm) && dm >= 1 && dm <= 24 * 60;
                })()
              }
            >
              {saveBusy
                ? locale === "en"
                  ? "Saving…"
                  : "Speichert…"
                : labels.save}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 bg-muted/15 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">{labels.list}</CardTitle>
        </CardHeader>
        <CardContent>
          {loadError ? (
            <p className="text-sm text-destructive">{loadError}</p>
          ) : null}
          {loadBusy ? (
            <p className="text-sm text-muted-foreground">
              {locale === "en" ? "Loading…" : "Lädt…"}
            </p>
          ) : sortedEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">{labels.empty}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{labels.date}</TableHead>
                  <TableHead>{labels.employee}</TableHead>
                  <TableHead>{labels.duration}</TableHead>
                  <TableHead>{labels.projectCol}</TableHead>
                  <TableHead>{labels.notes}</TableHead>
                  <TableHead className="text-right">{labels.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedEntries.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="tabular-nums">{row.workDate}</TableCell>
                    <TableCell>
                      {employeeNameById.get(row.employeeId) ?? row.employeeId}
                    </TableCell>
                    <TableCell>
                      {formatDuration(locale, row.durationMinutes)}
                    </TableCell>
                    <TableCell className="max-w-48 truncate">
                      {row.projectId
                        ? (projectTitleById.get(row.projectId) ?? row.projectId)
                        : "—"}
                    </TableCell>
                    <TableCell className="max-w-56 truncate text-muted-foreground">
                      {row.notes ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(row)}
                      >
                        {labels.edit}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => void removeEntry(row.id)}
                      >
                        {labels.remove}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={editEntry !== null}
        onOpenChange={(open) => {
          if (!open && !editBusy) {
            setEditEntry(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{labels.editTitle}</DialogTitle>
          </DialogHeader>
          {editEntry ? (
            <div className="grid gap-3">
              <p className="text-sm text-muted-foreground tabular-nums">
                {editEntry.workDate} ·{" "}
                {employeeNameById.get(editEntry.employeeId) ?? editEntry.employeeId}
              </p>
              <div className="flex flex-wrap gap-2">
                <div className="grid gap-1">
                  <Label htmlFor="wt-edit-hours" className="text-xs">
                    {labels.hours}
                  </Label>
                  <Input
                    id="wt-edit-hours"
                    type="number"
                    min={0}
                    max={24}
                    value={editHours}
                    onChange={(ev) => setEditHours(ev.target.value)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="wt-edit-mins" className="text-xs">
                    {labels.minutes}
                  </Label>
                  <Input
                    id="wt-edit-mins"
                    type="number"
                    min={0}
                    max={59}
                    value={editMins}
                    onChange={(ev) => setEditMins(ev.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>{labels.project}</Label>
                <Select value={editProjectId} onValueChange={setEditProjectId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PROJECT_NONE}>{labels.noProject}</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="wt-edit-notes">{labels.notes}</Label>
                <Input
                  id="wt-edit-notes"
                  value={editNotes}
                  onChange={(ev) => setEditNotes(ev.target.value)}
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditEntry(null)}
              disabled={editBusy}
            >
              {labels.cancel}
            </Button>
            <Button
              type="button"
              onClick={() => void saveEdit()}
              disabled={editBusy || !editEntry}
            >
              {editBusy
                ? locale === "en"
                  ? "Saving…"
                  : "Speichert…"
                : labels.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
