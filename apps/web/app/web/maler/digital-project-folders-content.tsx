"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  FileText,
  FolderOpen,
  ImageIcon,
  Loader2,
  Trash2,
  Download,
  Upload,
} from "lucide-react";

import { getProjectFoldersModuleCopy } from "@/content/project-folders-module";
import type {
  GaebLvDocumentSummary,
  ProjectAssetKind,
  ProjectAssetSummary,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/tabs";

type ProjectRow = { id: string; title: string };

const DOC_KINDS: ProjectAssetKind[] = ["plan", "document", "other"];

function formatBytes(n: number, locale: Locale): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024)
    return `${(n / 1024).toLocaleString(locale === "en" ? "en-GB" : "de-DE", { maximumFractionDigits: 1 })} KB`;
  return `${(n / (1024 * 1024)).toLocaleString(locale === "en" ? "en-GB" : "de-DE", { maximumFractionDigits: 1 })} MB`;
}

function kindLabel(
  kind: ProjectAssetKind,
  locale: Locale,
): string {
  const t = getProjectFoldersModuleCopy(locale);
  const hit = t.kinds.find((k) => k.value === kind);
  if (hit) return hit.label;
  return kind === "photo"
    ? locale === "en"
      ? "Photo"
      : "Foto"
    : kind;
}

export function DigitalProjectFoldersContent({ locale }: { locale: Locale }) {
  const t = useMemo(() => getProjectFoldersModuleCopy(locale), [locale]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [projectId, setProjectId] = useState<string>("");
  const [tab, setTab] = useState<string>("documents");
  const [assets, setAssets] = useState<ProjectAssetSummary[]>([]);
  const [gaebDocs, setGaebDocs] = useState<GaebLvDocumentSummary[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [listBusy, setListBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [docKind, setDocKind] = useState<ProjectAssetKind>("document");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const refreshProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/web/projects", { credentials: "include" });
      if (!res.ok) return;
      const data = (await res.json()) as { projects?: ProjectRow[] };
      setProjects(data.projects ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  const refreshAssets = useCallback(async () => {
    if (!projectId) {
      setAssets([]);
      return;
    }
    setListBusy(true);
    setLoadError(null);
    try {
      const res = await fetch(
        `/api/web/projects/${encodeURIComponent(projectId)}/assets`,
        { credentials: "include" },
      );
      if (res.status === 401) {
        setLoadError(t.sessionRequired);
        setAssets([]);
        return;
      }
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as {
          hint?: string;
          error?: string;
        } | null;
        if (res.status === 503 && j?.error?.includes("storage")) {
          setLoadError(t.storageUnavailable);
        } else {
          setLoadError(t.loadError);
        }
        setAssets([]);
        return;
      }
      const data = (await res.json()) as { assets?: ProjectAssetSummary[] };
      setAssets(data.assets ?? []);
    } catch {
      setLoadError(t.loadError);
      setAssets([]);
    } finally {
      setListBusy(false);
    }
  }, [projectId, t.loadError, t.sessionRequired, t.storageUnavailable]);

  const refreshGaeb = useCallback(async () => {
    if (!projectId) {
      setGaebDocs([]);
      return;
    }
    try {
      const res = await fetch(
        `/api/web/gaeb/imports?projectId=${encodeURIComponent(projectId)}`,
        { credentials: "include" },
      );
      if (!res.ok) {
        setGaebDocs([]);
        return;
      }
      const data = (await res.json()) as {
        documents?: GaebLvDocumentSummary[];
      };
      setGaebDocs(data.documents ?? []);
    } catch {
      setGaebDocs([]);
    }
  }, [projectId]);

  useEffect(() => {
    void refreshProjects();
  }, [refreshProjects]);

  useEffect(() => {
    void refreshAssets();
    void refreshGaeb();
  }, [refreshAssets, refreshGaeb]);

  const filteredAssets = useMemo(() => {
    if (tab === "photos") {
      return assets.filter((a) => a.kind === "photo");
    }
    return assets.filter((a) => DOC_KINDS.includes(a.kind));
  }, [assets, tab]);

  const handleUpload = async (kind: ProjectAssetKind, file: File | null) => {
    if (!projectId || !file) return;
    setUploadBusy(true);
    setLoadError(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("kind", kind);
      const res = await fetch(
        `/api/web/projects/${encodeURIComponent(projectId)}/assets`,
        { method: "POST", body: fd, credentials: "include" },
      );
      if (res.status === 401) {
        setLoadError(t.sessionRequired);
        return;
      }
      if (!res.ok) {
        setLoadError(t.loadError);
        return;
      }
      setDocFile(null);
      setPhotoFile(null);
      await refreshAssets();
    } catch {
      setLoadError(t.loadError);
    } finally {
      setUploadBusy(false);
    }
  };

  const handleDownload = async (a: ProjectAssetSummary) => {
    if (!projectId) return;
    try {
      const res = await fetch(
        `/api/web/projects/${encodeURIComponent(projectId)}/assets/${encodeURIComponent(a.id)}`,
        { credentials: "include" },
      );
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const el = document.createElement("a");
      el.href = url;
      el.download = a.filename;
      el.click();
      URL.revokeObjectURL(url);
    } catch {
      setLoadError(t.loadError);
    }
  };

  const handleDelete = async (assetId: string) => {
    if (!projectId) return;
    setDeleteId(assetId);
    setLoadError(null);
    try {
      const res = await fetch(
        `/api/web/projects/${encodeURIComponent(projectId)}/assets/${encodeURIComponent(assetId)}`,
        { method: "DELETE", credentials: "include" },
      );
      if (!res.ok) {
        setLoadError(t.loadError);
        return;
      }
      await refreshAssets();
    } catch {
      setLoadError(t.loadError);
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="w-full min-w-0 space-y-6">
      <Alert className="border-primary/20 bg-primary/5">
        <FolderOpen className="text-primary" aria-hidden />
        <AlertTitle>{t.introTitle}</AlertTitle>
        <AlertDescription className="text-sm text-muted-foreground">
          {t.introBody}
        </AlertDescription>
      </Alert>

      {loadError ? (
        <Alert variant="destructive">
          <AlertTitle>{locale === "en" ? "Error" : "Fehler"}</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t.projectLabel}</CardTitle>
          <CardDescription className="text-xs">
            {t.projectPlaceholder}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <select
            id="pf-project"
            className="flex h-10 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">{t.projectPlaceholder}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList variant="line">
          <TabsTrigger value="documents" className="gap-1.5">
            <FileText className="size-3.5" aria-hidden />
            {t.tabDocuments}
          </TabsTrigger>
          <TabsTrigger value="photos" className="gap-1.5">
            <ImageIcon className="size-3.5" aria-hidden />
            {t.tabPhotos}
          </TabsTrigger>
          <TabsTrigger value="gaeb" className="gap-1.5">
            <FileText className="size-3.5" aria-hidden />
            {t.tabGaeb}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="mt-6 space-y-6">
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
                  <label
                    className="text-xs font-medium text-muted-foreground"
                    htmlFor="pf-doc-file"
                  >
                    {t.fileLabel}
                  </label>
                  <input
                    id="pf-doc-file"
                    type="file"
                    accept=".pdf,application/pdf,image/jpeg,image/png,image/webp"
                    disabled={!projectId || uploadBusy}
                    className="block w-full text-sm text-muted-foreground file:me-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground"
                    onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    className="text-xs font-medium text-muted-foreground"
                    htmlFor="pf-doc-kind"
                  >
                    {t.kindLabel}
                  </label>
                  <select
                    id="pf-doc-kind"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={docKind}
                    onChange={(e) =>
                      setDocKind(e.target.value as ProjectAssetKind)
                    }
                  >
                    {t.kinds.map((k) => (
                      <option key={k.value} value={k.value}>
                        {k.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-wrap gap-3 border-t pt-6">
              <Button
                type="button"
                disabled={!projectId || !docFile || uploadBusy}
                onClick={() => void handleUpload(docKind, docFile)}
              >
                {uploadBusy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Upload className="size-4" aria-hidden />
                )}
                {uploadBusy ? t.uploading : t.uploadButton}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={listBusy || !projectId}
                onClick={() => void refreshAssets()}
              >
                {listBusy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : null}
                {t.refresh}
              </Button>
            </CardFooter>
          </Card>

          <AssetTableSection
            locale={locale}
            t={t}
            rows={filteredAssets}
            onDownload={handleDownload}
            onDelete={handleDelete}
            deleteId={deleteId}
          />
        </TabsContent>

        <TabsContent value="photos" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Upload className="size-4" aria-hidden />
                {t.uploadTitle}
              </CardTitle>
              <CardDescription className="text-xs">{t.uploadHint}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="pf-photo-file"
                >
                  {t.fileLabel}
                </label>
                <input
                  id="pf-photo-file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={!projectId || uploadBusy}
                  className="block w-full max-w-md text-sm text-muted-foreground file:me-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-wrap gap-3 border-t pt-6">
              <Button
                type="button"
                disabled={!projectId || !photoFile || uploadBusy}
                onClick={() => void handleUpload("photo", photoFile)}
              >
                {uploadBusy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Upload className="size-4" aria-hidden />
                )}
                {uploadBusy ? t.uploading : t.uploadButton}
              </Button>
            </CardFooter>
          </Card>

          {filteredAssets.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.assetsEmpty}</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAssets.map((a) => (
                <li
                  key={a.id}
                  className="overflow-hidden rounded-lg border border-border bg-card"
                >
                  <div className="aspect-video bg-muted/50">
                    {projectId ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/web/projects/${encodeURIComponent(projectId)}/assets/${encodeURIComponent(a.id)}`}
                        alt=""
                        className="size-full object-contain"
                      />
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t p-2">
                    <span className="truncate text-xs font-medium">
                      {a.filename}
                    </span>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={t.download}
                        onClick={() => void handleDownload(a)}
                      >
                        <Download className="size-4" aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={t.delete}
                        disabled={deleteId === a.id}
                        onClick={() => void handleDelete(a.id)}
                      >
                        {deleteId === a.id ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden />
                        ) : (
                          <Trash2 className="size-4" aria-hidden />
                        )}
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="gaeb" className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">{t.gaebTitle}</h3>
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href="/web/maler/gaeb-support" className="gap-1.5">
                <ExternalLink className="size-3.5" aria-hidden />
                {t.gaebOpenModule}
              </Link>
            </Button>
          </div>
          {!projectId ? (
            <p className="text-sm text-muted-foreground">{t.projectPlaceholder}</p>
          ) : gaebDocs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.gaebEmpty}</p>
          ) : (
            <ul className="space-y-2">
              {gaebDocs.map((d) => (
                <li
                  key={d.id}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
                >
                  <span className="font-medium">{d.filename}</span>
                  <span className="ms-2 text-xs text-muted-foreground tabular-nums">
                    {new Date(d.createdAt).toLocaleString(
                      locale === "en" ? "en-GB" : "de-DE",
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AssetTableSection({
  locale,
  t,
  rows,
  onDownload,
  onDelete,
  deleteId,
}: {
  locale: Locale;
  t: ReturnType<typeof getProjectFoldersModuleCopy>;
  rows: ProjectAssetSummary[];
  onDownload: (a: ProjectAssetSummary) => void;
  onDelete: (id: string) => void;
  deleteId: string | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t.assetsTitle}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.assetsEmpty}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.columns.name}</TableHead>
                <TableHead className="w-[140px]">{t.columns.kind}</TableHead>
                <TableHead className="w-[100px]">{t.columns.size}</TableHead>
                <TableHead className="w-[160px]">{t.columns.date}</TableHead>
                <TableHead className="w-[120px] text-end">
                  {t.columns.actions}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.filename}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {kindLabel(a.kind, locale)}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {formatBytes(a.byteSize, locale)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground tabular-nums">
                    {new Date(a.createdAt).toLocaleString(
                      locale === "en" ? "en-GB" : "de-DE",
                    )}
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={t.download}
                        onClick={() => onDownload(a)}
                      >
                        <Download className="size-4" aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={t.delete}
                        disabled={deleteId === a.id}
                        onClick={() => onDelete(a.id)}
                      >
                        {deleteId === a.id ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden />
                        ) : (
                          <Trash2 className="size-4" aria-hidden />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
