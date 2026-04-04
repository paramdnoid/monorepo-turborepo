"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import Link from "next/link";
import { customersListResponseSchema } from "@repo/api-contracts";
import type { z } from "zod";
import { Alert, AlertDescription } from "@repo/ui/alert";
import { Button } from "@repo/ui/button";
import { Checkbox } from "@repo/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/dialog";
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
  formatCustomersPaginationRange,
  getCustomersDetailCopy,
  getCustomersKindLabel,
  getCustomersListCopy,
} from "@/content/customers-module";
import type { Locale } from "@/lib/i18n/locale";
import { parseResponseJson } from "@/lib/parse-response-json";

import {
  CustomerAddressManualFields,
  type CustomerAddressManualValues,
} from "./customer-address-manual-fields";
import { CustomerAddressGeocodeControls } from "./customer-address-geocode-controls";

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

type ListItem = z.infer<typeof customersListResponseSchema>["customers"][number];

type CustomersListContentProps = {
  locale: Locale;
};

function ListTableSkeleton() {
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Skeleton className="h-4 w-24" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-4 w-16" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-4 w-12" />
            </TableHead>
            <TableHead className="w-[120px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {[0, 1, 2, 3, 4].map((i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="h-4 w-40" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-28" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-8 w-20" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function CustomersListContent({ locale }: CustomersListContentProps) {
  const copy = getCustomersListCopy(locale);
  const dCopy = getCustomersDetailCopy(locale);
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
  const [rows, setRows] = useState<ListItem[]>([]);
  const [total, setTotal] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [customerNumber, setCustomerNumber] = useState("");
  const [addrManual, setAddrManual] = useState<CustomerAddressManualValues>({
    label: "",
    line2: "",
    recipient: "",
    street: "",
    postal: "",
    city: "",
    country: "DE",
  });

  const geocodeDefaultQuery = useMemo(
    () =>
      [addrManual.street, addrManual.postal, addrManual.city]
        .filter(Boolean)
        .join(", ")
        .trim(),
    [addrManual.street, addrManual.postal, addrManual.city],
  );

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
    const url = `/api/web/customers?${params.toString()}`;
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
      const parsed = customersListResponseSchema.safeParse(json);
      if (!parsed.success) {
        setError(copy.loadError);
        setRows([]);
        setTotal(0);
        return;
      }
      setRows(parsed.data.customers);
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

  function openCreate() {
    setDisplayName("");
    setCustomerNumber("");
    setAddrManual({
      label: "",
      line2: "",
      recipient: "",
      street: "",
      postal: "",
      city: "",
      country: "DE",
    });
    setCreateError(null);
    setCreateOpen(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    if (!displayName.trim()) {
      setCreateError(dCopy.validation);
      return;
    }
    const r = addrManual.recipient.trim();
    const st = addrManual.street.trim();
    const plz = addrManual.postal.trim();
    const ct = addrManual.city.trim();
    const hasAddr = r && st && plz && ct;
    if (
      (r ||
        st ||
        plz ||
        ct ||
        addrManual.label.trim() ||
        addrManual.line2.trim()) &&
      !hasAddr
    ) {
      setCreateError(dCopy.validation);
      return;
    }
    setCreateBusy(true);
    try {
      const body: Record<string, unknown> = {
        displayName: displayName.trim(),
        customerNumber:
          customerNumber.trim() === "" ? null : customerNumber.trim(),
      };
      if (hasAddr) {
        body.defaultAddress = {
          kind: "billing",
          label: addrManual.label.trim() === "" ? null : addrManual.label.trim(),
          addressLine2:
            addrManual.line2.trim() === "" ? null : addrManual.line2.trim(),
          recipientName: r,
          street: st,
          postalCode: plz,
          city: ct,
          country: addrManual.country.trim().toUpperCase() || "DE",
          isDefault: true,
        };
      }
      const res = await fetch("/api/web/customers", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 409) {
        setCreateError(dCopy.conflictNumber);
        return;
      }
      if (!res.ok) {
        setCreateError(dCopy.validation);
        return;
      }
      setCreateOpen(false);
      fetchDispatch({ type: "setPageIndex", pageIndex: 0 });
      fetchDispatch({ type: "bumpReload" });
    } finally {
      setCreateBusy(false);
    }
  }

  const rangeLabel =
    total === 0
      ? formatCustomersPaginationRange(locale, 0, 0, 0)
      : formatCustomersPaginationRange(
          locale,
          pageIndex * PAGE_SIZE + 1,
          Math.min((pageIndex + 1) * PAGE_SIZE, total),
          total,
        );

  const hasPrev = pageIndex > 0;
  const hasNext = (pageIndex + 1) * PAGE_SIZE < total;

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex min-w-[240px] flex-1 flex-col gap-1">
            <Label htmlFor="customers-search" className="text-xs font-medium">
              {copy.search}
            </Label>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                flushSearchNow();
              }}
              className="flex flex-wrap gap-2"
            >
              <Input
                id="customers-search"
                name="q"
                autoComplete="off"
                placeholder={copy.searchPlaceholder}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="max-w-md"
                aria-describedby="customers-search-hint"
              />
              <Button type="submit" variant="secondary">
                {copy.search}
              </Button>
            </form>
            <p id="customers-search-hint" className="text-xs text-muted-foreground">
              {copy.searchAutoHint}
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={includeArchived}
              onCheckedChange={(v) =>
                fetchDispatch({ type: "setIncludeArchived", value: v === true })
              }
            />
            {copy.includeArchived}
          </label>
          <Button type="button" onClick={openCreate}>
            {copy.newCustomer}
          </Button>
        </div>
        {total > 0 && !loading ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>{rangeLabel}</span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasPrev || loading}
                onClick={() =>
                  fetchDispatch({
                    type: "setPageIndex",
                    pageIndex: Math.max(0, pageIndex - 1),
                  })
                }
              >
                {copy.paginationPrev}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!hasNext || loading}
                onClick={() =>
                  fetchDispatch({ type: "setPageIndex", pageIndex: pageIndex + 1 })
                }
              >
                {copy.paginationNext}
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <ListTableSkeleton />
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-start gap-4 rounded-lg border border-dashed bg-card/50 p-8">
          <p className="text-sm text-muted-foreground">{copy.empty}</p>
          <Button type="button" onClick={openCreate}>
            {copy.newCustomer}
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{copy.tableName}</TableHead>
                <TableHead>{copy.tableCity}</TableHead>
                <TableHead>{copy.tableNumber}</TableHead>
                <TableHead className="w-[120px] text-right">
                  {copy.tableActions}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    {r.displayName}
                    {r.archivedAt ? (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        ({copy.archived})
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell>{r.city ?? "—"}</TableCell>
                  <TableCell>{r.customerNumber ?? "—"}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/web/customers/${r.id}`}>{copy.open}</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>{copy.newCustomer}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {createError ? (
                <Alert variant="destructive">
                  <AlertDescription>{createError}</AlertDescription>
                </Alert>
              ) : null}
              <div className="grid gap-2">
                <Label htmlFor="c-name">{dCopy.displayName}</Label>
                <Input
                  id="c-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="c-num">{dCopy.customerNumber}</Label>
                <Input
                  id="c-num"
                  value={customerNumber}
                  onChange={(e) => setCustomerNumber(e.target.value)}
                />
              </div>
              <p className="text-xs font-medium text-muted-foreground">
                {getCustomersKindLabel(locale, "billing")} (
                {copy.billingAddressOptional})
              </p>
              <CustomerAddressGeocodeControls
                locale={locale}
                defaultQuery={geocodeDefaultQuery}
                onApply={(s) => {
                  setAddrManual((prev) => ({
                    ...prev,
                    recipient: s.recipientName,
                    street: s.street,
                    postal: s.postalCode,
                    city: s.city,
                    country: s.country,
                    label: s.label?.trim() ? s.label.trim() : prev.label,
                    line2: s.addressLine2?.trim()
                      ? s.addressLine2.trim()
                      : prev.line2,
                  }));
                }}
              />
              <CustomerAddressManualFields
                locale={locale}
                idPrefix="c"
                values={addrManual}
                onChange={(patch) =>
                  setAddrManual((prev) => ({ ...prev, ...patch }))
                }
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateOpen(false)}
              >
                {copy.cancel}
              </Button>
              <Button type="submit" disabled={createBusy}>
                {copy.create}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
