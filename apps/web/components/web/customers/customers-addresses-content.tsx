"use client";

import {
  useCallback,
  useEffect,
  useReducer,
  useState,
} from "react";
import Link from "next/link";
import { customersAddressesListResponseSchema } from "@repo/api-contracts";
import type { z } from "zod";
import { Alert, AlertDescription } from "@repo/ui/alert";
import { Button } from "@repo/ui/button";
import { Checkbox } from "@repo/ui/checkbox";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import { Skeleton } from "@repo/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/table";

import {
  formatCustomersAddressesPaginationRange,
  getCustomersAddressesListCopy,
  getCustomersKindLabel,
} from "@/content/customers-module";
import type { Locale } from "@/lib/i18n/locale";
import { parseResponseJson } from "@/lib/parse-response-json";

const PAGE_SIZE = 25;

type ListFetchState = {
  debouncedQ: string;
  includeArchived: boolean;
  pageIndex: number;
  reloadNonce: number;
};

type ListFetchAction =
  | { type: "setDebouncedQ"; q: string }
  | { type: "setIncludeArchived"; value: boolean }
  | { type: "setPageIndex"; pageIndex: number }
  | { type: "bumpReload" };

function listFetchReducer(
  state: ListFetchState,
  action: ListFetchAction,
): ListFetchState {
  switch (action.type) {
    case "setDebouncedQ":
      if (state.debouncedQ === action.q) {
        return state;
      }
      return { ...state, debouncedQ: action.q, pageIndex: 0 };
    case "setIncludeArchived":
      if (state.includeArchived === action.value) {
        return state;
      }
      return { ...state, includeArchived: action.value, pageIndex: 0 };
    case "setPageIndex":
      if (state.pageIndex === action.pageIndex) {
        return state;
      }
      return { ...state, pageIndex: action.pageIndex };
    case "bumpReload":
      return { ...state, reloadNonce: state.reloadNonce + 1 };
    default:
      return state;
  }
}

type Row = z.infer<
  typeof customersAddressesListResponseSchema
>["rows"][number];

type CustomersAddressesContentProps = {
  locale: Locale;
};

function AddressesTableSkeleton() {
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Skeleton className="h-4 w-28" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-4 w-20" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-4 w-24" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-4 w-32" />
            </TableHead>
            <TableHead className="w-[120px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {[0, 1, 2, 3, 4].map((i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="h-4 w-36" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-40" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-8 w-24" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function CustomersAddressesContent({ locale }: CustomersAddressesContentProps) {
  const copy = getCustomersAddressesListCopy(locale);
  const [searchInput, setSearchInput] = useState("");
  const [fetchState, fetchDispatch] = useReducer(listFetchReducer, {
    debouncedQ: "",
    includeArchived: false,
    pageIndex: 0,
    reloadNonce: 0,
  });
  const { debouncedQ, includeArchived, pageIndex, reloadNonce } = fetchState;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchDispatch({ type: "setDebouncedQ", q: searchInput.trim() });
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", String(pageIndex * PAGE_SIZE));
    if (debouncedQ) {
      params.set("q", debouncedQ);
    }
    if (includeArchived) {
      params.set("includeArchived", "1");
    }
    const url = `/api/web/customers/addresses?${params.toString()}`;
    try {
      const res = await fetch(url, { credentials: "include" });
      const text = await res.text();
      if (!res.ok) {
        setError(copy.loadError);
        setRows([]);
        setTotal(0);
        return;
      }
      const json = parseResponseJson(text);
      if (json === null) {
        setError(copy.loadError);
        setRows([]);
        setTotal(0);
        return;
      }
      const parsed = customersAddressesListResponseSchema.safeParse(json);
      if (!parsed.success) {
        setError(copy.loadError);
        setRows([]);
        setTotal(0);
        return;
      }
      setRows(parsed.data.rows);
      setTotal(parsed.data.total);
    } catch {
      setError(copy.loadError);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [copy.loadError, debouncedQ, includeArchived, pageIndex]);

  useEffect(() => {
    void load();
  }, [load, reloadNonce]);

  function flushSearchNow() {
    const q = searchInput.trim();
    fetchDispatch({ type: "setDebouncedQ", q });
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : pageIndex * PAGE_SIZE + 1;
  const to = Math.min(total, (pageIndex + 1) * PAGE_SIZE);
  const rangeLabel = formatCustomersAddressesPaginationRange(
    locale,
    from,
    to,
    total,
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor="addr-search" className="text-xs font-medium">
            {copy.search}
          </Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              id="addr-search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={copy.searchPlaceholder}
              className="max-w-md"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  flushSearchNow();
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="shrink-0"
              onClick={flushSearchNow}
            >
              {copy.search}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{copy.searchAutoHint}</p>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="addr-archived"
            checked={includeArchived}
            onCheckedChange={(v) =>
              fetchDispatch({
                type: "setIncludeArchived",
                value: v === true,
              })
            }
          />
          <Label htmlFor="addr-archived" className="text-sm font-normal">
            {copy.includeArchived}
          </Label>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <AddressesTableSkeleton />
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{copy.empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{copy.tableCustomer}</TableHead>
                <TableHead>{copy.tableKind}</TableHead>
                <TableHead>{copy.tableCity}</TableHead>
                <TableHead>{copy.tableStreet}</TableHead>
                <TableHead className="w-[120px] text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.address.id}>
                  <TableCell className="font-medium">
                    <div className="min-w-0">
                      <span className="block truncate">{r.displayName}</span>
                      {r.customerArchivedAt ? (
                        <span className="text-xs text-muted-foreground">
                          {locale === "en" ? "archived customer" : "archivierter Kunde"}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {getCustomersKindLabel(locale, r.address.kind)}
                  </TableCell>
                  <TableCell className="text-sm">{r.address.city}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.address.street}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="link" size="sm" className="h-auto p-0" asChild>
                      <Link href={`/web/customers/${r.customerId}`}>
                        {copy.openCustomer}
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {!loading && total > 0 ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{rangeLabel}</p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pageIndex <= 0}
              onClick={() =>
                fetchDispatch({
                  type: "setPageIndex",
                  pageIndex: pageIndex - 1,
                })
              }
            >
              {copy.paginationPrev}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pageIndex >= pageCount - 1}
              onClick={() =>
                fetchDispatch({
                  type: "setPageIndex",
                  pageIndex: pageIndex + 1,
                })
              }
            >
              {copy.paginationNext}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
