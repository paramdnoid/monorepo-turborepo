"use client";

import { useCallback, useEffect, useId, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  employeesBatchArchiveResponseSchema,
  employeesListResponseSchema,
} from "@repo/api-contracts";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Checkbox } from "@repo/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Skeleton } from "@repo/ui/skeleton";
import { Switch } from "@repo/ui/switch";
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

import { EmployeesCreateDialog } from "@/components/web/workforce/employees-create-dialog";
import {
  formatEmployeeListDateTime,
  formatEmployeesListMeta,
  formatEmployeesPagination,
  getEmployeesCopy,
  readEmployeeValidationIssues,
  summarizeEmployeeValidationIssues,
} from "@/content/employees-module";
import type { Locale } from "@/lib/i18n/locale";
import { parseResponseJson } from "@/lib/parse-response-json";
import { toast } from "sonner";

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 320;

type EmployeeStatus = "ACTIVE" | "ONBOARDING" | "INACTIVE";

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

function listSkeletonRows({ showSelect }: { showSelect: boolean }): ReactNode {
  return (
    <>
      {Array.from({ length: 5 }, (_, i) => (
        <TableRow key={i}>
          {showSelect ? (
            <TableCell className="w-[1%] p-2">
              <Skeleton className="size-4 rounded-[4px]" />
            </TableCell>
          ) : null}
          <TableCell>
            <Skeleton className="h-4 w-[min(100%,12rem)]" />
          </TableCell>
          <TableCell className="hidden md:table-cell">
            <Skeleton className="h-4 w-16" />
          </TableCell>
          <TableCell className="hidden sm:table-cell">
            <Skeleton className="h-4 w-24" />
          </TableCell>
          <TableCell className="hidden sm:table-cell">
            <Skeleton className="h-5 w-20 rounded-full" />
          </TableCell>
          <TableCell className="hidden md:table-cell">
            <Skeleton className="h-4 w-20" />
          </TableCell>
          <TableCell className="hidden xl:table-cell">
            <Skeleton className="h-4 w-28" />
          </TableCell>
          <TableCell className="hidden xl:table-cell">
            <Skeleton className="h-4 w-28" />
          </TableCell>
          <TableCell className="text-right">
            <Skeleton className="ml-auto h-5 w-10 rounded-full" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function formatEmployeeStatus(
  t: ReturnType<typeof getEmployeesCopy>,
  status: EmployeeStatus,
): { label: string; variant: "secondary" | "outline" | "destructive" } {
  switch (status) {
    case "ACTIVE":
      return { label: t.statusActive, variant: "secondary" };
    case "ONBOARDING":
      return { label: t.statusOnboarding, variant: "outline" };
    case "INACTIVE":
      return { label: t.statusInactive, variant: "destructive" };
    default:
      return { label: t.statusActive, variant: "secondary" };
  }
}

export function EmployeesListContent({ locale }: { locale: Locale }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = getEmployeesCopy(locale);
  const filterId = useId();

  const [busy, setBusy] = useState(false);
  const [batchBusy, setBatchBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounced(searchInput.trim(), SEARCH_DEBOUNCE_MS);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"ALL" | EmployeeStatus>(
    "ALL",
  );
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<
    {
      id: string;
      employeeNo: string | null;
      displayName: string;
      roleLabel: string | null;
      status: EmployeeStatus;
      city: string | null;
      hasGeo: boolean;
      archivedAt: string | null;
      createdAt: string;
      updatedAt: string;
    }[]
  >([]);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [showDeletedBanner, setShowDeletedBanner] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch.length > 0) {
        params.set("q", debouncedSearch);
      }
      if (includeArchived) {
        params.set("includeArchived", "1");
      }
      if (statusFilter !== "ALL") {
        params.set("status", statusFilter);
      }
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(page * PAGE_SIZE));
      const qs = params.toString();
      const res = await fetch(`/api/web/employees${qs ? `?${qs}` : ""}`, {
        credentials: "include",
      });
      const text = await res.text();
      const json = parseResponseJson(text);
      const parsed = employeesListResponseSchema.safeParse(json);
      if (!res.ok || !parsed.success) {
        setError(t.loadError);
        setRows([]);
        setTotal(0);
        setCanEdit(false);
        return;
      }
      setCanEdit(parsed.data.permissions.canEdit);
      const totalCount = parsed.data.total;
      const offset = page * PAGE_SIZE;
      if (totalCount > 0 && offset >= totalCount) {
        const maxPage = Math.max(0, Math.ceil(totalCount / PAGE_SIZE) - 1);
        setPage(maxPage);
        return;
      }
      setTotal(totalCount);
      setRows(parsed.data.employees);
    } catch {
      setError(t.loadError);
      setRows([]);
      setTotal(0);
      setCanEdit(false);
    } finally {
      setBusy(false);
    }
  }, [
    debouncedSearch,
    includeArchived,
    statusFilter,
    page,
    t.loadError,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, includeArchived, statusFilter]);

  useEffect(() => {
    setSelectedIds([]);
  }, [debouncedSearch, includeArchived, statusFilter, page]);

  const exportCsv = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (debouncedSearch.length > 0) {
        params.set("q", debouncedSearch);
      }
      if (includeArchived) {
        params.set("includeArchived", "1");
      }
      if (statusFilter !== "ALL") {
        params.set("status", statusFilter);
      }
      const qs = params.toString();
      const res = await fetch(
        `/api/web/employees/export${qs ? `?${qs}` : ""}`,
        { credentials: "include" },
      );
      if (!res.ok) {
        toast.error(t.exportCsvError);
        return;
      }
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = "employees-export.csv";
      a.rel = "noopener";
      a.click();
      URL.revokeObjectURL(href);
      toast.success(t.toastExportReady);
    } catch {
      toast.error(t.exportCsvError);
    }
  }, [debouncedSearch, includeArchived, statusFilter, t.exportCsvError, t.toastExportReady]);

  const runBatch = useCallback(
    async (archived: boolean) => {
      if (selectedIds.length === 0 || !canEdit) {
        return;
      }
      setBatchBusy(true);
      try {
        const res = await fetch("/api/web/employees/batch", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employeeIds: selectedIds, archived }),
        });
        const text = await res.text();
        const json = parseResponseJson(text);
        if (!res.ok) {
          if (res.status === 403) {
            toast.error(t.batchForbidden);
          } else {
            const issues = readEmployeeValidationIssues(json);
            toast.error(
              issues
                ? summarizeEmployeeValidationIssues(issues, t, locale)
                : t.batchError,
            );
          }
          return;
        }
        const parsed = employeesBatchArchiveResponseSchema.safeParse(json);
        if (!parsed.success) {
          toast.error(t.batchError);
          return;
        }
        if (parsed.data.updated === 0) {
          toast.message(t.toastBatchNoop);
        } else {
          toast.success(
            t.toastBatchUpdated.replace("{n}", String(parsed.data.updated)),
          );
        }
        setSelectedIds([]);
        void load();
      } catch {
        toast.error(t.batchError);
      } finally {
        setBatchBusy(false);
      }
    },
    [canEdit, selectedIds, load, locale, t],
  );

  const pageIds = rows.map((r) => r.id);
  const allOnPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
  const someOnPageSelected = pageIds.some((id) => selectedIds.includes(id));

  function toggleSelectAllOnPage() {
    if (allOnPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...pageIds])]);
    }
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  useEffect(() => {
    if (!createdId) {
      return;
    }
    const timer = setTimeout(() => setCreatedId(null), 12_000);
    return () => clearTimeout(timer);
  }, [createdId]);

  useEffect(() => {
    if (searchParams.get("deleted") === "1") {
      setShowDeletedBanner(true);
    }
  }, [searchParams]);

  const hasFilters =
    debouncedSearch.length > 0 || includeArchived || statusFilter !== "ALL";
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const displayPage = Math.min(page + 1, pageCount);
  const emptyMessage =
    hasFilters && !busy ? t.emptyFiltered : t.empty;

  return (
    <>
      <EmployeesCreateDialog
        locale={locale}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => {
          setCreatedId(id);
          void load();
        }}
      />
      {createdId ? (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/80 bg-muted/20 px-4 py-3 text-sm"
          role="status"
        >
          <span>{t.createdBanner}</span>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/web/employees/${createdId}`}>{t.openProfile}</Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCreatedId(null)}
            >
              {t.dismissBanner}
            </Button>
          </div>
        </div>
      ) : null}
      {showDeletedBanner ? (
        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/80 bg-muted/20 px-4 py-3 text-sm"
          role="status"
        >
          <span>{t.deletedBanner}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowDeletedBanner(false);
              const next = new URLSearchParams(searchParams.toString());
              next.delete("deleted");
              const qs = next.toString();
              router.replace(qs ? `${pathname}?${qs}` : pathname);
            }}
          >
            {t.dismissBanner}
          </Button>
        </div>
      ) : null}
      <Card
        className="border-border/80 bg-muted/15 shadow-none"
        aria-busy={busy || batchBusy}
      >
        <CardHeader className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base">{t.listTitle}</CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                {t.listDescription}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy || total === 0}
                onClick={() => void exportCsv()}
              >
                {t.exportCsvButton}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setCreateOpen(true)}
              >
                {t.addEmployee}
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="grid w-full min-w-0 gap-2 sm:max-w-xs sm:flex-1">
              <Label htmlFor={`${filterId}-q`} className="sr-only">
                {t.searchAriaLabel}
              </Label>
              <Input
                id={`${filterId}-q`}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t.searchPlaceholder}
                aria-label={t.searchAriaLabel}
                autoComplete="off"
              />
            </div>
            <div className="grid gap-2 sm:min-w-[12rem]">
              <Label htmlFor={`${filterId}-status`} className="sr-only">
                {t.fieldStatus}
              </Label>
              <Select
                value={statusFilter}
                onValueChange={(v) =>
                  setStatusFilter(v as "ALL" | EmployeeStatus)
                }
              >
                <SelectTrigger id={`${filterId}-status`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t.statusAll}</SelectItem>
                  <SelectItem value="ACTIVE">{t.statusActive}</SelectItem>
                  <SelectItem value="ONBOARDING">{t.statusOnboarding}</SelectItem>
                  <SelectItem value="INACTIVE">{t.statusInactive}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id={`${filterId}-arch`}
                checked={includeArchived}
                onCheckedChange={(v) => setIncludeArchived(v === true)}
              />
              <Label htmlFor={`${filterId}-arch`} className="text-sm font-normal">
                {t.includeArchivedLabel}
              </Label>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{t.listSortHint}</p>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="mb-4 text-sm text-destructive">{error}</p>
          ) : null}
          <p className="sr-only" role="status" aria-live="polite">
            {busy ? t.listLoadingAria : ""}
          </p>
          {total > 0 ? (
            <p className="mb-3 text-xs text-muted-foreground">
              {formatEmployeesListMeta(locale, {
                shown: rows.length,
                total,
              })}
            </p>
          ) : null}
          {canEdit && rows.length > 0 ? (
            <div
              className="mb-3 flex flex-wrap items-center gap-2 border-b border-border/60 pb-3"
              role="toolbar"
            >
              <span className="text-xs text-muted-foreground">
                {t.batchSelectedCount.replace(
                  "{n}",
                  String(selectedIds.length),
                )}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={
                  batchBusy || busy || selectedIds.length === 0
                }
                onClick={() => void runBatch(true)}
              >
                {t.batchArchiveSelected}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={
                  batchBusy || busy || selectedIds.length === 0
                }
                onClick={() => void runBatch(false)}
              >
                {t.batchUnarchiveSelected}
              </Button>
              {batchBusy ? (
                <span className="text-xs text-muted-foreground">{t.batchBusy}</span>
              ) : null}
            </div>
          ) : null}
          {busy && rows.length === 0 ? (
            <Table aria-hidden>
              <TableHeader>
                <TableRow>
                  {canEdit ? (
                    <TableHead className="w-[1%] p-2" />
                  ) : null}
                  <TableHead>{t.tableName}</TableHead>
                  <TableHead className="hidden md:table-cell">
                    {t.tableEmployeeNo}
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">
                    {t.tableRole}
                  </TableHead>
                  <TableHead className="hidden sm:table-cell whitespace-nowrap">
                    {t.tableEmployeeStatus}
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    {t.tableCity}
                  </TableHead>
                  <TableHead className="hidden xl:table-cell whitespace-nowrap">
                    {t.tableCreatedAt}
                  </TableHead>
                  <TableHead className="hidden xl:table-cell whitespace-nowrap">
                    {t.tableUpdatedAt}
                  </TableHead>
                  <TableHead className="w-[1%] whitespace-nowrap text-right">
                    {t.tableGeo}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{listSkeletonRows({ showSelect: canEdit })}</TableBody>
            </Table>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {canEdit ? (
                    <TableHead className="w-[1%] p-2">
                      <Checkbox
                        checked={
                          allOnPageSelected
                            ? true
                            : someOnPageSelected
                              ? "indeterminate"
                              : false
                        }
                        onCheckedChange={() => toggleSelectAllOnPage()}
                        aria-label={t.batchSelectAllAria}
                      />
                    </TableHead>
                  ) : null}
                  <TableHead>{t.tableName}</TableHead>
                  <TableHead className="hidden md:table-cell">
                    {t.tableEmployeeNo}
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">
                    {t.tableRole}
                  </TableHead>
                  <TableHead className="hidden sm:table-cell whitespace-nowrap">
                    {t.tableEmployeeStatus}
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    {t.tableCity}
                  </TableHead>
                  <TableHead className="hidden xl:table-cell whitespace-nowrap">
                    {t.tableCreatedAt}
                  </TableHead>
                  <TableHead className="hidden xl:table-cell whitespace-nowrap">
                    {t.tableUpdatedAt}
                  </TableHead>
                  {includeArchived ? (
                    <TableHead className="hidden lg:table-cell whitespace-nowrap">
                      {t.tableStatus}
                    </TableHead>
                  ) : null}
                  <TableHead className="w-[1%] whitespace-nowrap text-right">
                    {t.tableGeo}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className={busy ? "opacity-60" : undefined}>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    {canEdit ? (
                      <TableCell className="w-[1%] p-2 align-middle">
                        <Checkbox
                          checked={selectedIds.includes(r.id)}
                          onCheckedChange={() => toggleRow(r.id)}
                          aria-label={`${t.batchSelectRowAria}: ${r.displayName}`}
                        />
                      </TableCell>
                    ) : null}
                    <TableCell className="font-medium">
                      <Link
                        href={`/web/employees/${r.id}`}
                        className="text-primary underline underline-offset-4 hover:text-foreground"
                      >
                        {r.displayName}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {r.employeeNo ?? "—"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {r.roleLabel ?? "—"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {(() => {
                        const s = formatEmployeeStatus(t, r.status);
                        return <Badge variant={s.variant}>{s.label}</Badge>;
                      })()}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {r.city ?? "—"}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell whitespace-nowrap text-xs text-muted-foreground">
                      {formatEmployeeListDateTime(r.createdAt, locale)}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell whitespace-nowrap text-xs text-muted-foreground">
                      {formatEmployeeListDateTime(r.updatedAt, locale)}
                    </TableCell>
                    {includeArchived ? (
                      <TableCell className="hidden lg:table-cell">
                        <Badge
                          variant={
                            r.archivedAt ? "secondary" : "outline"
                          }
                        >
                          {r.archivedAt ? t.badgeArchived : t.badgeActive}
                        </Badge>
                      </TableCell>
                    ) : null}
                    <TableCell className="text-right">
                      <Badge variant={r.hasGeo ? "secondary" : "outline"}>
                        {r.hasGeo ? t.geoYes : t.geoNo}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {total > PAGE_SIZE ? (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                {formatEmployeesPagination(locale, {
                  page: displayPage,
                  pageCount,
                })}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy || page <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  {t.paginationPrev}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy || page >= pageCount - 1}
                  onClick={() =>
                    setPage((p) => Math.min(pageCount - 1, p + 1))
                  }
                >
                  {t.paginationNext}
                </Button>
              </div>
            </div>
          ) : null}
          <p className="mt-3 text-xs text-muted-foreground">{t.archivedHint}</p>
        </CardContent>
      </Card>
    </>
  );
}
