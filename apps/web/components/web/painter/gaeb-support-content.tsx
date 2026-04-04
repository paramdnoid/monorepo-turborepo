"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  Info,
  Loader2,
  Upload,
} from "lucide-react";

import { getGaebModuleCopy } from "@/content/gaeb-module";
import type {
  GaebLvDocumentDetail,
  GaebLvDocumentSummary,
} from "@repo/api-contracts";
import type { Locale } from "@/lib/i18n/locale";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/table";

type ProjectRow = { id: string; title: string };

export function GaebSupportContent({ locale }: { locale: Locale }) {
  const t = getGaebModuleCopy(locale);

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [documents, setDocuments] = useState<GaebLvDocumentSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<GaebLvDocumentDetail | null>(null);
  const [projectId, setProjectId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [listBusy, setListBusy] = useState(false);

  const refreshList = useCallback(async () => {
    setListBusy(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/web/gaeb/imports", {
        credentials: "include",
      });
      if (res.status === 401) {
        setLoadError(t.sessionRequired);
        setDocuments([]);
        return;
      }
      if (!res.ok) {
        setLoadError(t.loadError);
        return;
      }
      const data = (await res.json()) as { documents?: GaebLvDocumentSummary[] };
      setDocuments(data.documents ?? []);
    } catch {
      setLoadError(t.loadError);
    } finally {
      setListBusy(false);
    }
  }, [t.loadError, t.sessionRequired]);

  const refreshProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/web/projects?includeArchived=1&limit=200", {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { projects?: ProjectRow[] };
      setProjects(data.projects ?? []);
    } catch {
      /* optional */
    }
  }, []);

  useEffect(() => {
    void refreshList();
    void refreshProjects();
  }, [refreshList, refreshProjects]);

  const refreshDetail = useCallback(
    async (id: string) => {
      setLoadError(null);
      try {
        const res = await fetch(`/api/web/gaeb/imports/${encodeURIComponent(id)}`, {
          credentials: "include",
        });
        if (!res.ok) {
          setDetail(null);
          setLoadError(t.loadError);
          return;
        }
        setDetail((await res.json()) as GaebLvDocumentDetail);
      } catch {
        setDetail(null);
        setLoadError(t.loadError);
      }
    },
    [t.loadError],
  );

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    void refreshDetail(selectedId);
  }, [selectedId, refreshDetail]);

  const handleUpload = async () => {
    if (!file) return;
    setBusy(true);
    setLoadError(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      if (projectId) fd.set("projectId", projectId);
      const res = await fetch("/api/web/gaeb/imports", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (res.status === 401) {
        setLoadError(t.sessionRequired);
        return;
      }
      if (!res.ok) {
        setLoadError(t.loadError);
        return;
      }
      const data = (await res.json()) as { id?: string };
      setFile(null);
      await refreshList();
      if (data.id) {
        setSelectedId(data.id);
      }
    } catch {
      setLoadError(t.loadError);
    } finally {
      setBusy(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedId) return;
    setBusy(true);
    setLoadError(null);
    try {
      const res = await fetch(
        `/api/web/gaeb/imports/${encodeURIComponent(selectedId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "approved" }),
        },
      );
      if (!res.ok) {
        setLoadError(t.loadError);
        return;
      }
      await refreshList();
      await refreshDetail(selectedId);
    } catch {
      setLoadError(t.loadError);
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async () => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/web/gaeb/imports/${encodeURIComponent(selectedId)}/export`,
        { credentials: "include" },
      );
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gaeb-export-${selectedId.slice(0, 8)}.xml`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  };

  const statusBadge = (s: GaebLvDocumentSummary["status"]) => {
    if (s === "approved")
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="size-3" aria-hidden />
          {t.approvedBadge}
        </span>
      );
    if (s === "failed")
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">
          <AlertCircle className="size-3" aria-hidden />
          {t.failedBadge}
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        <Clock className="size-3" aria-hidden />
        {t.pendingBadge}
      </span>
    );
  };

  const itemsOnly = detail?.nodes.filter((n) => n.nodeType === "item") ?? [];

  return (
    <div className="w-full min-w-0 space-y-6">
      <Alert className="border-primary/20 bg-primary/5">
        <Info className="text-primary" aria-hidden />
        <AlertTitle>{t.benefitTitle}</AlertTitle>
        <AlertDescription className="space-y-2 text-muted-foreground">
          <p>{t.benefitBody}</p>
          <p className="text-xs">{t.supportedSubsetNote}</p>
        </AlertDescription>
      </Alert>

      <Card className="border-border/80 bg-muted/15 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">{t.formatMatrixTitle}</CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            {t.formatMatrixIntro}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">
                  {locale === "en" ? "Format" : "Format"}
                </TableHead>
                <TableHead>{locale === "en" ? "Import" : "Import"}</TableHead>
                <TableHead>{locale === "en" ? "Export" : "Export"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {t.formats.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs">{row.id}</TableCell>
                  <TableCell className="text-sm">{row.import}</TableCell>
                  <TableCell className="text-sm">{row.export}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Alert variant="default" className="border-amber-500/25 bg-amber-500/5">
        <AlertCircle className="text-amber-600" aria-hidden />
        <AlertTitle>{t.privacyTitle}</AlertTitle>
        <AlertDescription className="text-sm text-muted-foreground">
          {t.privacyBody}
        </AlertDescription>
      </Alert>

      <Alert variant="default" className="border-border">
        <Info aria-hidden />
        <AlertTitle>{t.legalTitle}</AlertTitle>
        <AlertDescription className="text-sm text-muted-foreground">
          {t.legalBody}
        </AlertDescription>
      </Alert>

      <p className="text-xs text-muted-foreground">{t.retentionNote}</p>

      {loadError ? (
        <Alert variant="destructive">
          <AlertTitle>{locale === "en" ? "Error" : "Fehler"}</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="size-4" aria-hidden />
            {t.uploadTitle}
          </CardTitle>
          <CardDescription className="text-xs">{t.uploadHint}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="gaeb-file">
                GAEB / XML
              </label>
              <input
                id="gaeb-file"
                type="file"
                accept=".xml,text/xml,application/xml"
                className="block w-full text-sm text-muted-foreground file:me-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="gaeb-project">
                {t.projectLabel}
              </label>
              <select
                id="gaeb-project"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                <option value="">{t.projectOptional}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
              <Button type="button" variant="link" size="sm" className="h-auto px-0" asChild>
                <Link href="/web/projects">
                  {locale === "en" ? "Open project management" : "Projektverwaltung öffnen"}
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap items-center gap-3 border-t pt-6">
          <Button
            type="button"
            disabled={!file || busy}
            onClick={() => void handleUpload()}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <FileSpreadsheet className="size-4" aria-hidden />
            )}
            {busy ? t.importing : t.importButton}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={listBusy}
            onClick={() => void refreshList()}
          >
            {listBusy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            {t.refresh}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t.importsTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.importsEmpty}</p>
          ) : (
            <ul className="space-y-2">
              {documents.map((d) => (
                <li key={d.id}>
                  <button
                    type="button"
                    className={`flex w-full flex-col items-start gap-1 rounded-lg border px-3 py-2 text-left text-sm transition-colors sm:flex-row sm:items-center sm:justify-between ${
                      selectedId === d.id
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:bg-muted/40"
                    }`}
                    onClick={() => setSelectedId(d.id)}
                  >
                    <span className="font-medium">{d.filename}</span>
                    <span className="flex items-center gap-2">
                      {statusBadge(d.status)}
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {new Date(d.createdAt).toLocaleString(locale === "en" ? "en-GB" : "de-DE")}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {detail ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.reimportDiffTitle}</CardTitle>
              <CardDescription className="text-xs">{t.reimportDiffBody}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {detail.diff &&
              (detail.diff.added.length > 0 || detail.diff.missing.length > 0) ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      {t.diffAdded}
                    </p>
                    <ul className="list-inside list-disc text-muted-foreground">
                      {detail.diff.added.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      {t.diffMissing}
                    </p>
                    <ul className="list-inside list-disc text-muted-foreground">
                      {detail.diff.missing.map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  {locale === "en"
                    ? "No outline differences between snapshot and stored rows."
                    : "Keine Abweichungen zwischen Snapshot und gespeicherten Zeilen."}
                </p>
              )}
              {detail.warnings && detail.warnings.length > 0 ? (
                <Alert>
                  <AlertTitle>
                    {locale === "en" ? "Parser warnings" : "Parser-Warnungen"}
                  </AlertTitle>
                  <AlertDescription>
                    <ul className="mt-2 list-inside list-disc text-sm">
                      {detail.warnings.map((w) => (
                        <li key={`${w.code}-${w.message.slice(0, 40)}`}>
                          {w.message}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              ) : null}
              {detail.parseErrors && detail.parseErrors.length > 0 ? (
                <Alert variant="destructive">
                  <AlertTitle>
                    {locale === "en" ? "Parse errors" : "Parse-Fehler"}
                  </AlertTitle>
                  <AlertDescription>
                    <ul className="mt-2 list-inside list-disc text-sm">
                      {detail.parseErrors.map((w) => (
                        <li key={`${w.code}-${w.message.slice(0, 40)}`}>
                          {w.message}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.approveTitle}</CardTitle>
              <CardDescription className="text-xs">{t.approveBody}</CardDescription>
            </CardHeader>
            <CardFooter className="flex flex-wrap gap-3 border-t pt-6">
              <Button
                type="button"
                disabled={
                  busy || detail.status !== "pending_review"
                }
                onClick={() => void handleApprove()}
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                {busy ? t.approving : t.approveButton}
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t.exportTitle}</CardTitle>
              <CardDescription className="text-xs">{t.exportHint}</CardDescription>
            </CardHeader>
            <CardFooter className="border-t pt-6">
              <Button
                type="button"
                variant="secondary"
                disabled={busy || detail.status !== "approved"}
                onClick={() => void handleExport()}
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Download className="size-4" aria-hidden />
                )}
                {busy ? t.exporting : t.exportButton}
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {locale === "en" ? "Line items" : "Positionen"}
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {itemsOnly.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.noNodes}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.columns.outline}</TableHead>
                      <TableHead>{t.columns.text}</TableHead>
                      <TableHead>{t.columns.qty}</TableHead>
                      <TableHead>{t.columns.unit}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemsOnly.map((n) => (
                      <TableRow key={n.id}>
                        <TableCell className="font-mono text-xs tabular-nums">
                          {n.outlineNumber ?? "—"}
                        </TableCell>
                        <TableCell className="max-w-[320px] truncate text-sm">
                          {n.shortText}
                        </TableCell>
                        <TableCell className="text-sm tabular-nums">
                          {n.quantity ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm">{n.unit ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/legal/faq"
          className="font-medium text-primary underline underline-offset-4 hover:text-foreground"
        >
          {t.faqLabel}
        </Link>
      </p>
    </div>
  );
}
