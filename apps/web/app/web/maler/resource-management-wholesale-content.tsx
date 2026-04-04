"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Info,
  Loader2,
  PackageSearch,
  Upload,
} from "lucide-react";

import { getResourceManagementModuleCopy } from "@/content/resource-management-module";
import type {
  CatalogImportBatchDetail,
  CatalogImportBatchSummary,
  CatalogSupplier,
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

export function ResourceManagementWholesaleContent({
  locale,
}: {
  locale: Locale;
}) {
  const t = getResourceManagementModuleCopy(locale);

  const [suppliers, setSuppliers] = useState<CatalogSupplier[]>([]);
  const [batches, setBatches] = useState<CatalogImportBatchSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CatalogImportBatchDetail | null>(null);
  const [supplierName, setSupplierName] = useState("");
  const [sourceKind, setSourceKind] = useState<"datanorm" | "bmecat">(
    "datanorm",
  );
  const [supplierId, setSupplierId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [listBusy, setListBusy] = useState(false);

  const refreshSuppliers = useCallback(async () => {
    try {
      const res = await fetch("/api/web/catalog/suppliers", {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { suppliers?: CatalogSupplier[] };
      setSuppliers(data.suppliers ?? []);
    } catch {
      /* optional */
    }
  }, []);

  const refreshList = useCallback(async () => {
    setListBusy(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/web/catalog/imports", {
        credentials: "include",
      });
      if (res.status === 401) {
        setLoadError(t.sessionRequired);
        setBatches([]);
        return;
      }
      if (!res.ok) {
        setLoadError(t.loadError);
        return;
      }
      const data = (await res.json()) as { batches?: CatalogImportBatchSummary[] };
      setBatches(data.batches ?? []);
    } catch {
      setLoadError(t.loadError);
    } finally {
      setListBusy(false);
    }
  }, [t.loadError, t.sessionRequired]);

  useEffect(() => {
    void refreshSuppliers();
    void refreshList();
  }, [refreshList, refreshSuppliers]);

  const refreshDetail = useCallback(
    async (id: string) => {
      setLoadError(null);
      try {
        const res = await fetch(
          `/api/web/catalog/imports/${encodeURIComponent(id)}`,
          { credentials: "include" },
        );
        if (!res.ok) {
          setDetail(null);
          setLoadError(t.loadError);
          return;
        }
        setDetail((await res.json()) as CatalogImportBatchDetail);
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

  const handleAddSupplier = async () => {
    if (!supplierName.trim()) return;
    setBusy(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/web/catalog/suppliers", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: supplierName.trim(),
          sourceKind,
        }),
      });
      if (res.status === 401) {
        setLoadError(t.sessionRequired);
        return;
      }
      if (!res.ok) {
        setLoadError(t.loadError);
        return;
      }
      const created = (await res.json()) as CatalogSupplier;
      setSupplierName("");
      await refreshSuppliers();
      setSupplierId(created.id);
    } catch {
      setLoadError(t.loadError);
    } finally {
      setBusy(false);
    }
  };

  const handleUpload = async () => {
    if (!file || !supplierId) return;
    setBusy(true);
    setLoadError(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("supplierId", supplierId);
      const res = await fetch("/api/web/catalog/imports", {
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
      if (data.id) setSelectedId(data.id);
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
        `/api/web/catalog/imports/${encodeURIComponent(selectedId)}`,
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

  const statusBadge = (s: CatalogImportBatchSummary["status"]) => {
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

  return (
    <div className="w-full min-w-0 space-y-6">
      <Alert className="border-primary/20 bg-primary/5">
        <PackageSearch className="text-primary" aria-hidden />
        <AlertTitle>{t.benefitTitle}</AlertTitle>
        <AlertDescription className="space-y-2 text-muted-foreground">
          <p>{t.benefitBody}</p>
          <p className="text-sm font-medium text-foreground">{t.scopeTitle}</p>
          <p className="text-xs">{t.scopeBody}</p>
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/80 bg-muted/10 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">{t.datanormTitle}</CardTitle>
            <CardDescription className="text-xs">{t.datanormBody}</CardDescription>
          </CardHeader>
        </Card>
        <Card className="border-border/80 bg-muted/10 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">{t.bmecatTitle}</CardTitle>
            <CardDescription className="text-xs">{t.bmecatBody}</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Alert variant="default" className="border-border">
        <Info aria-hidden />
        <AlertTitle>{t.privacyTitle}</AlertTitle>
        <AlertDescription className="text-sm text-muted-foreground">
          {t.privacyBody}
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
          <CardTitle className="text-base">{t.supplierSectionTitle}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              className="text-xs font-medium text-muted-foreground"
              htmlFor="cat-supplier-name"
            >
              {t.supplierNameLabel}
            </label>
            <input
              id="cat-supplier-name"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {t.sourceKindLabel}
            </span>
            <div className="flex gap-4 pt-2 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="sourceKind"
                  checked={sourceKind === "datanorm"}
                  onChange={() => setSourceKind("datanorm")}
                />
                {t.sourceDatanorm}
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="sourceKind"
                  checked={sourceKind === "bmecat"}
                  onChange={() => setSourceKind("bmecat")}
                />
                {t.sourceBmecat}
              </label>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            type="button"
            variant="secondary"
            disabled={!supplierName.trim() || busy}
            onClick={() => void handleAddSupplier()}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            {t.addSupplier}
          </Button>
        </CardFooter>
      </Card>

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
                htmlFor="cat-supplier-pick"
              >
                {t.supplierSelectLabel}
              </label>
              <select
                id="cat-supplier-pick"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="">{t.supplierPlaceholder}</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.sourceKind})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label
                className="text-xs font-medium text-muted-foreground"
                htmlFor="cat-file"
              >
                {t.fileLabel}
              </label>
              <input
                id="cat-file"
                type="file"
                accept=".zip,.txt,.xml,text/plain,application/zip,application/xml,text/xml"
                className="block w-full text-sm text-muted-foreground file:me-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-3 border-t pt-6">
          <Button
            type="button"
            disabled={!file || !supplierId || busy}
            onClick={() => void handleUpload()}
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            {busy ? t.importing : t.importButton}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">{t.importsTitle}</CardTitle>
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
        </CardHeader>
        <CardContent className="space-y-3">
          {batches.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.importsEmpty}</p>
          ) : (
            <ul className="space-y-2">
              {batches.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    className={`flex w-full flex-col items-start gap-1 rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50 md:flex-row md:items-center md:justify-between ${
                      selectedId === b.id ? "border-primary bg-primary/5" : "border-border"
                    }`}
                    onClick={() => setSelectedId(b.id)}
                  >
                    <span className="font-medium">{b.filename}</span>
                    <span className="flex flex-wrap items-center gap-2">
                      {statusBadge(b.status)}
                      <span className="text-xs text-muted-foreground">
                        {t.articleCount}: {b.articleCount}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {t.formatLabel}: {b.sourceFormat}
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
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t.previewTitle}</CardTitle>
            <CardDescription className="text-xs">
              {t.previewHint}
              {detail.linesTruncated ? ` ${t.lineTruncationNote}` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {detail.parseErrors?.length ? (
              <Alert variant="destructive">
                <AlertTitle>{t.failedBadge}</AlertTitle>
                <AlertDescription>
                  <ul className="list-inside list-disc text-sm">
                    {detail.parseErrors.map((e) => (
                      <li key={`${e.code}-${e.message}`}>
                        {e.code}: {e.message}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : null}
            {detail.warnings?.length ? (
              <Alert>
                <AlertTitle>{locale === "en" ? "Warnings" : "Hinweise"}</AlertTitle>
                <AlertDescription>
                  <ul className="list-inside list-disc text-sm">
                    {detail.warnings.map((w) => (
                      <li key={`${w.code}-${w.message}`}>
                        {w.code}: {w.message}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : null}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.columns.sku}</TableHead>
                  <TableHead>{t.columns.name}</TableHead>
                  <TableHead>{t.columns.unit}</TableHead>
                  <TableHead className="text-end">{t.columns.price}</TableHead>
                  <TableHead>{t.columns.currency}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.lines.map((ln) => (
                  <TableRow key={ln.id}>
                    <TableCell className="font-mono text-xs">{ln.supplierSku}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">
                      {ln.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">{ln.unit ?? "—"}</TableCell>
                    <TableCell className="text-end text-sm">{ln.price}</TableCell>
                    <TableCell className="text-sm">{ln.currency}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {detail.status === "pending_review" ? (
              <div className="rounded-lg border border-dashed p-4">
                <h4 className="mb-1 text-sm font-semibold">{t.approveTitle}</h4>
                <p className="mb-3 text-xs text-muted-foreground">{t.approveBody}</p>
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleApprove()}
                >
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : null}
                  {busy ? t.approving : t.approveButton}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
