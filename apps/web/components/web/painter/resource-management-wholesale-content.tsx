"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Info,
  Loader2,
  PackageSearch,
  ShoppingCart,
  Upload,
} from "lucide-react";

import { getResourceManagementModuleCopy } from "@/content/resource-management-module";
import type {
  CatalogArticleListItem,
  CatalogImportBatchDetail,
  CatalogImportBatchSummary,
  CatalogSupplier,
  IdsConnectCartRow,
  IdsConnectSearchHit,
} from "@repo/api-contracts";
import type { Locale } from "@/lib/i18n/locale";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/alert";
import { Button } from "@repo/ui/button";
import { Input } from "@repo/ui/input";
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
  const [sourceKind, setSourceKind] = useState<
    "datanorm" | "bmecat" | "ids_connect"
  >("datanorm");
  const [idsConnectMode, setIdsConnectMode] = useState<"mock" | "http">("mock");
  const [idsBaseUrl, setIdsBaseUrl] = useState("");
  const [idsApiKey, setIdsApiKey] = useState("");
  const [supplierId, setSupplierId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [listBusy, setListBusy] = useState(false);
  const [stockArticles, setStockArticles] = useState<CatalogArticleListItem[]>(
    [],
  );
  const [stockCursor, setStockCursor] = useState<string | null>(null);
  const [stockSupplierFilter, setStockSupplierFilter] = useState("");
  const [stockQ, setStockQ] = useState("");
  const [stockBusy, setStockBusy] = useState(false);
  const [idsLiveSupplierId, setIdsLiveSupplierId] = useState("");
  const [idsSearchQ, setIdsSearchQ] = useState("");
  const [idsHits, setIdsHits] = useState<IdsConnectSearchHit[]>([]);
  const [idsCart, setIdsCart] = useState<IdsConnectCartRow | null>(null);
  const [idsBusy, setIdsBusy] = useState(false);
  const [idsErr, setIdsErr] = useState<string | null>(null);
  const sourceKindGroupId = useId();
  const stockSectionHeadingRef = useRef<HTMLHeadingElement | null>(null);

  const fileUploadSuppliers = suppliers.filter(
    (s) => s.sourceKind === "datanorm" || s.sourceKind === "bmecat",
  );
  const idsSuppliers = suppliers.filter((s) => s.sourceKind === "ids_connect");

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

  const loadStockFirst = useCallback(async () => {
    setStockBusy(true);
    setStockCursor(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", "50");
      if (stockSupplierFilter) params.set("supplierId", stockSupplierFilter);
      if (stockQ.trim()) params.set("q", stockQ.trim());
      const res = await fetch(`/api/web/catalog/articles?${params}`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        articles?: CatalogArticleListItem[];
        nextCursor?: string | null;
      };
      setStockArticles(data.articles ?? []);
      setStockCursor(data.nextCursor ?? null);
    } catch {
      /* optional */
    } finally {
      setStockBusy(false);
    }
  }, [stockSupplierFilter, stockQ]);

  const loadStockMore = useCallback(async () => {
    if (!stockCursor || stockBusy) return;
    setStockBusy(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "50");
      if (stockSupplierFilter) params.set("supplierId", stockSupplierFilter);
      if (stockQ.trim()) params.set("q", stockQ.trim());
      params.set("cursor", stockCursor);
      const res = await fetch(`/api/web/catalog/articles?${params}`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        articles?: CatalogArticleListItem[];
        nextCursor?: string | null;
      };
      setStockArticles((prev) => [...prev, ...(data.articles ?? [])]);
      setStockCursor(data.nextCursor ?? null);
    } catch {
      /* optional */
    } finally {
      setStockBusy(false);
    }
  }, [stockCursor, stockSupplierFilter, stockQ, stockBusy]);

  const loadStockFirstRef = useRef(loadStockFirst);
  loadStockFirstRef.current = loadStockFirst;

  useEffect(() => {
    void refreshSuppliers();
    void refreshList();
  }, [refreshList, refreshSuppliers]);

  useEffect(() => {
    void loadStockFirstRef.current();
  }, [stockSupplierFilter]);

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
    if (sourceKind === "ids_connect" && idsConnectMode === "http" && !idsBaseUrl.trim()) {
      setLoadError(t.loadError);
      return;
    }
    setBusy(true);
    setLoadError(null);
    try {
      const body =
        sourceKind === "ids_connect"
          ? {
              name: supplierName.trim(),
              sourceKind: "ids_connect" as const,
              meta: {
                idsConnectMode: idsConnectMode,
                ...(idsConnectMode === "http"
                  ? {
                      idsConnectBaseUrl: idsBaseUrl.trim(),
                      ...(idsApiKey.trim()
                        ? { idsConnectApiKey: idsApiKey.trim() }
                        : {}),
                    }
                  : {}),
              },
            }
          : {
              name: supplierName.trim(),
              sourceKind,
            };
      const res = await fetch("/api/web/catalog/suppliers", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
      setIdsBaseUrl("");
      setIdsApiKey("");
      await refreshSuppliers();
      if (created.sourceKind === "datanorm" || created.sourceKind === "bmecat") {
        setSupplierId(created.id);
      }
      if (created.sourceKind === "ids_connect") {
        setIdsLiveSupplierId(created.id);
      }
    } catch {
      setLoadError(t.loadError);
    } finally {
      setBusy(false);
    }
  };

  function mergeQtyLine(a: string, b: string): string {
    const ax = Number.parseFloat(a.replace(",", ".")) || 0;
    const bx = Number.parseFloat(b.replace(",", ".")) || 0;
    const s = ax + bx;
    if (!Number.isFinite(s)) return b;
    return s % 1 === 0 ? String(s) : s.toFixed(2).replace(/\.?0+$/, "");
  }

  const handleIdsSearch = async () => {
    if (!idsLiveSupplierId) return;
    setIdsBusy(true);
    setIdsErr(null);
    try {
      const res = await fetch(
        `/api/web/ids-connect/suppliers/${encodeURIComponent(idsLiveSupplierId)}/search`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: idsSearchQ, cursor: null }),
        },
      );
      if (!res.ok) {
        setIdsErr(t.loadError);
        setIdsHits([]);
        return;
      }
      const data = (await res.json()) as { hits?: IdsConnectSearchHit[] };
      setIdsHits(data.hits ?? []);
    } catch {
      setIdsErr(t.loadError);
    } finally {
      setIdsBusy(false);
    }
  };

  const handleIdsNewCart = async () => {
    if (!idsLiveSupplierId) return;
    setIdsBusy(true);
    setIdsErr(null);
    try {
      const res = await fetch(
        `/api/web/ids-connect/suppliers/${encodeURIComponent(idsLiveSupplierId)}/carts`,
        {
          method: "POST",
          credentials: "include",
        },
      );
      if (!res.ok) {
        setIdsErr(t.loadError);
        return;
      }
      const data = (await res.json()) as { cart?: IdsConnectCartRow };
      if (data.cart) setIdsCart(data.cart);
    } catch {
      setIdsErr(t.loadError);
    } finally {
      setIdsBusy(false);
    }
  };

  const handleIdsAddHit = async (hit: IdsConnectSearchHit) => {
    if (!idsCart) {
      setIdsErr(
        locale === "en" ? "Create a cart first." : "Zuerst einen Warenkorb anlegen.",
      );
      return;
    }
    setIdsBusy(true);
    setIdsErr(null);
    try {
      const qtyById = new Map<string, string>();
      for (const ln of idsCart.snapshot.lines) {
        qtyById.set(ln.externalId, ln.quantity);
      }
      const cur = qtyById.get(hit.externalId) ?? "0";
      qtyById.set(hit.externalId, mergeQtyLine(cur, "1"));
      const lines = Array.from(qtyById.entries()).map(([externalId, quantity]) => ({
        externalId,
        quantity,
      }));
      const res = await fetch(
        `/api/web/ids-connect/carts/${encodeURIComponent(idsCart.id)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lines }),
        },
      );
      if (!res.ok) {
        setIdsErr(t.loadError);
        return;
      }
      const data = (await res.json()) as { cart?: IdsConnectCartRow };
      if (data.cart) setIdsCart(data.cart);
    } catch {
      setIdsErr(t.loadError);
    } finally {
      setIdsBusy(false);
    }
  };

  const handleIdsSubmit = async () => {
    if (!idsCart) return;
    setIdsBusy(true);
    setIdsErr(null);
    try {
      const res = await fetch(
        `/api/web/ids-connect/carts/${encodeURIComponent(idsCart.id)}/submit`,
        { method: "POST", credentials: "include" },
      );
      if (!res.ok) {
        setIdsErr(t.loadError);
        return;
      }
      const data = (await res.json()) as { cart?: IdsConnectCartRow };
      if (data.cart) setIdsCart(data.cart);
    } catch {
      setIdsErr(t.loadError);
    } finally {
      setIdsBusy(false);
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
      void loadStockFirstRef.current();
      requestAnimationFrame(() => {
        stockSectionHeadingRef.current?.focus();
      });
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
        <Alert variant="destructive" role="status" aria-live="polite">
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
          <fieldset className="space-y-1.5 border-0 p-0 sm:col-span-2">
            <legend
              id={sourceKindGroupId}
              className="text-xs font-medium text-muted-foreground"
            >
              {t.sourceKindLabel}
            </legend>
            <div
              className="flex flex-wrap gap-x-4 gap-y-2 pt-2 text-sm"
              role="radiogroup"
              aria-labelledby={sourceKindGroupId}
            >
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="sourceKind"
                  checked={sourceKind === "datanorm"}
                  onChange={() => setSourceKind("datanorm")}
                />
                {t.sourceDatanorm}
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="sourceKind"
                  checked={sourceKind === "bmecat"}
                  onChange={() => setSourceKind("bmecat")}
                />
                {t.sourceBmecat}
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="sourceKind"
                  checked={sourceKind === "ids_connect"}
                  onChange={() => setSourceKind("ids_connect")}
                />
                {t.sourceIdsConnect}
              </label>
            </div>
          </fieldset>
          {sourceKind === "ids_connect" ? (
            <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="ids-mode"
                >
                  {t.idsConnectModeLabel}
                </label>
                <select
                  id="ids-mode"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={idsConnectMode}
                  onChange={(e) =>
                    setIdsConnectMode(e.target.value === "http" ? "http" : "mock")
                  }
                >
                  <option value="mock">{t.idsConnectModeMock}</option>
                  <option value="http">{t.idsConnectModeHttp}</option>
                </select>
              </div>
              {idsConnectMode === "http" ? (
                <>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label
                      className="text-xs font-medium text-muted-foreground"
                      htmlFor="ids-base-url"
                    >
                      {t.idsConnectBaseUrlLabel}
                    </label>
                    <input
                      id="ids-base-url"
                      value={idsBaseUrl}
                      onChange={(e) => setIdsBaseUrl(e.target.value)}
                      placeholder="https://adapter.example.com"
                      autoComplete="off"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label
                      className="text-xs font-medium text-muted-foreground"
                      htmlFor="ids-api-key"
                    >
                      {t.idsConnectApiKeyLabel}
                    </label>
                    <input
                      id="ids-api-key"
                      type="password"
                      value={idsApiKey}
                      onChange={(e) => setIdsApiKey(e.target.value)}
                      autoComplete="off"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button
            type="button"
            variant="secondary"
            disabled={
              !supplierName.trim() ||
              busy ||
              (sourceKind === "ids_connect" &&
                idsConnectMode === "http" &&
                !idsBaseUrl.trim())
            }
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
                {fileUploadSuppliers.map((s) => (
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
                disabled={fileUploadSuppliers.length === 0}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-3 border-t pt-6">
          <Button
            type="button"
            disabled={
              !file || !supplierId || busy || fileUploadSuppliers.length === 0
            }
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
                    aria-pressed={selectedId === b.id}
                    className={`flex w-full flex-col items-start gap-1 rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:flex-row md:items-center md:justify-between ${
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

      <Card>
        <CardHeader>
          <h3
            ref={stockSectionHeadingRef}
            tabIndex={-1}
            className="text-base font-semibold leading-none tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {t.stockTitle}
          </h3>
          <CardDescription className="text-xs">{t.stockHint}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              void loadStockFirst();
            }}
          >
            <div className="grid min-w-48 flex-1 gap-1.5">
              <label
                className="text-xs font-medium text-muted-foreground"
                htmlFor="stock-supplier-filter"
              >
                {t.stockFilterSupplier}
              </label>
              <select
                id="stock-supplier-filter"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={stockSupplierFilter}
                onChange={(e) => setStockSupplierFilter(e.target.value)}
              >
                <option value="">{t.supplierPlaceholder}</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid min-w-48 flex-1 gap-1.5">
              <label
                className="text-xs font-medium text-muted-foreground"
                htmlFor="stock-q"
              >
                {t.stockSearchLabel}
              </label>
              <Input
                id="stock-q"
                value={stockQ}
                onChange={(e) => setStockQ(e.target.value)}
                placeholder={t.stockSearchPlaceholder}
                autoComplete="off"
              />
            </div>
            <Button
              type="submit"
              variant="secondary"
              disabled={stockBusy}
            >
              {stockBusy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              {t.stockSearchApply}
            </Button>
          </form>

          {stockBusy && stockArticles.length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {t.stockLoading}
            </p>
          ) : stockArticles.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.stockEmpty}</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.columns.sku}</TableHead>
                    <TableHead>{t.columns.name}</TableHead>
                    <TableHead>{t.stockSupplierCol}</TableHead>
                    <TableHead>{t.columns.unit}</TableHead>
                    <TableHead className="text-end">{t.columns.price}</TableHead>
                    <TableHead>{t.columns.currency}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockArticles.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-xs">
                        {a.supplierSku}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-sm">
                        {a.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm">{a.supplierName}</TableCell>
                      <TableCell className="text-sm">{a.unit ?? "—"}</TableCell>
                      <TableCell className="text-end text-sm">
                        {a.price ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm">{a.currency}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {stockCursor ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={stockBusy}
              onClick={() => void loadStockMore()}
            >
              {stockBusy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : null}
              {stockBusy ? t.stockLoading : t.stockLoadMore}
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingCart className="size-4" aria-hidden />
            {t.idsConnectLiveTitle}
          </CardTitle>
          <CardDescription className="text-xs">{t.idsConnectLiveHint}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {idsErr ? (
            <Alert variant="destructive" role="status" aria-live="polite">
              <AlertDescription>{idsErr}</AlertDescription>
            </Alert>
          ) : null}
          {idsSuppliers.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.idsConnectNoSuppliers}</p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label
                    className="text-xs font-medium text-muted-foreground"
                    htmlFor="ids-live-supplier"
                  >
                    {t.idsConnectPickSupplier}
                  </label>
                  <select
                    id="ids-live-supplier"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={idsLiveSupplierId}
                    onChange={(e) => {
                      setIdsLiveSupplierId(e.target.value);
                      setIdsCart(null);
                      setIdsHits([]);
                    }}
                  >
                    <option value="">{t.supplierPlaceholder}</option>
                    {idsSuppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!idsLiveSupplierId || idsBusy}
                    onClick={() => void handleIdsNewCart()}
                  >
                    {idsBusy ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : null}
                    {t.idsConnectNewCart}
                  </Button>
                </div>
              </div>
              <form
                className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end"
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleIdsSearch();
                }}
              >
                <div className="grid min-w-48 flex-1 gap-1.5">
                  <label
                    className="text-xs font-medium text-muted-foreground"
                    htmlFor="ids-search-q"
                  >
                    {t.stockSearchLabel}
                  </label>
                  <Input
                    id="ids-search-q"
                    value={idsSearchQ}
                    onChange={(e) => setIdsSearchQ(e.target.value)}
                    placeholder={t.idsConnectSearchPlaceholder}
                    autoComplete="off"
                  />
                </div>
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={!idsLiveSupplierId || idsBusy}
                >
                  {idsBusy ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : null}
                  {t.idsConnectSearchButton}
                </Button>
              </form>
              {idsHits.length > 0 ? (
                <ul className="space-y-2" role="list">
                  {idsHits.map((h) => (
                    <li
                      key={h.externalId}
                      className="flex flex-col gap-2 rounded-md border border-border p-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-mono text-xs text-muted-foreground">
                          {h.sku}
                        </p>
                        <p className="text-sm">{h.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">
                          {h.price} {h.currency}
                          {h.unit ? ` · ${h.unit}` : ""}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        disabled={!idsCart || idsBusy}
                        onClick={() => void handleIdsAddHit(h)}
                      >
                        {t.idsConnectAddToCart}
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {idsCart ? (
                <div className="space-y-2 rounded-md border border-dashed p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t.idsConnectCartStatus}: {idsCart.status} · ID {idsCart.id.slice(0, 8)}…
                  </p>
                  <p className="text-sm font-medium">{t.idsConnectCartLines}</p>
                  {idsCart.snapshot.lines.length === 0 ? (
                    <p className="text-xs text-muted-foreground">—</p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {idsCart.snapshot.lines.map((ln) => (
                        <li key={ln.externalId}>
                          {ln.sku} × {ln.quantity} — {ln.name ?? ln.externalId}
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button
                    type="button"
                    disabled={idsBusy || idsCart.status !== "draft"}
                    onClick={() => void handleIdsSubmit()}
                  >
                    {idsBusy ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : null}
                    {t.idsConnectSubmitCart}
                  </Button>
                </div>
              ) : null}
            </>
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
              <Alert variant="destructive" role="status" aria-live="polite">
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
