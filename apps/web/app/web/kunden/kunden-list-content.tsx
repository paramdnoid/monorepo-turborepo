"use client";

import { useCallback, useEffect, useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/table";

import {
  getCustomersDetailCopy,
  getCustomersKindLabel,
  getCustomersListCopy,
} from "@/content/customers-module";
import type { Locale } from "@/lib/i18n/locale";

type ListItem = z.infer<typeof customersListResponseSchema>["customers"][number];

type KundenListContentProps = {
  locale: Locale;
};

export function KundenListContent({ locale }: KundenListContentProps) {
  const copy = getCustomersListCopy(locale);
  const dCopy = getCustomersDetailCopy(locale);
  const [searchInput, setSearchInput] = useState("");
  const [appliedQuery, setAppliedQuery] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ListItem[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [customerNumber, setCustomerNumber] = useState("");
  const [addrRecipient, setAddrRecipient] = useState("");
  const [addrStreet, setAddrStreet] = useState("");
  const [addrPostal, setAddrPostal] = useState("");
  const [addrCity, setAddrCity] = useState("");
  const [addrCountry, setAddrCountry] = useState("DE");
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (appliedQuery) {
      params.set("q", appliedQuery);
    }
    if (includeArchived) {
      params.set("includeArchived", "1");
    }
    const url =
      params.size > 0
        ? `/api/web/customers?${params.toString()}`
        : "/api/web/customers";
    try {
      const res = await fetch(url, { credentials: "include" });
      const text = await res.text();
      if (!res.ok) {
        setError(copy.loadError);
        setRows([]);
        return;
      }
      const json: unknown = JSON.parse(text);
      const parsed = customersListResponseSchema.safeParse(json);
      if (!parsed.success) {
        setError(copy.loadError);
        setRows([]);
        return;
      }
      setRows(parsed.data.customers);
    } catch {
      setError(copy.loadError);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [appliedQuery, copy.loadError, includeArchived]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAppliedQuery(searchInput.trim());
  }

  function openCreate() {
    setDisplayName("");
    setCustomerNumber("");
    setAddrRecipient("");
    setAddrStreet("");
    setAddrPostal("");
    setAddrCity("");
    setAddrCountry("DE");
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
    const hasAddr =
      addrRecipient.trim() &&
      addrStreet.trim() &&
      addrPostal.trim() &&
      addrCity.trim();
    if (
      (addrRecipient.trim() ||
        addrStreet.trim() ||
        addrPostal.trim() ||
        addrCity.trim()) &&
      !hasAddr
    ) {
      setCreateError(dCopy.validation);
      return;
    }
    setCreateBusy(true);
    try {
      const body: Record<string, unknown> = {
        displayName: displayName.trim(),
        customerNumber: customerNumber.trim() === "" ? null : customerNumber.trim(),
      };
      if (hasAddr) {
        body.defaultAddress = {
          kind: "billing",
          recipientName: addrRecipient.trim(),
          street: addrStreet.trim(),
          postalCode: addrPostal.trim(),
          city: addrCity.trim(),
          country: addrCountry.trim().toUpperCase() || "DE",
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
      await load();
    } finally {
      setCreateBusy(false);
    }
  }

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <form onSubmit={handleSearchSubmit} className="flex min-w-[240px] flex-1 gap-2">
          <Input
            placeholder={copy.searchPlaceholder}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="max-w-md"
          />
          <Button type="submit" variant="secondary">
            {locale === "en" ? "Search" : "Suchen"}
          </Button>
        </form>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
          <Checkbox
            checked={includeArchived}
            onCheckedChange={(v) => setIncludeArchived(v === true)}
          />
          {copy.includeArchived}
        </label>
        <Button type="button" onClick={openCreate}>
          {copy.newCustomer}
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">
          {locale === "en" ? "Loading…" : "Laden …"}
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{copy.empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{copy.tableName}</TableHead>
                <TableHead>{copy.tableCity}</TableHead>
                <TableHead>{copy.tableNumber}</TableHead>
                <TableHead className="w-[120px]" />
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
                      <Link href={`/web/kunden/${r.id}`}>{copy.open}</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
                {getCustomersKindLabel(locale, "billing")} (optional)
              </p>
              <div className="grid gap-2">
                <Label htmlFor="c-ar">{dCopy.recipientName}</Label>
                <Input
                  id="c-ar"
                  value={addrRecipient}
                  onChange={(e) => setAddrRecipient(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="c-st">{dCopy.street}</Label>
                <Input
                  id="c-st"
                  value={addrStreet}
                  onChange={(e) => setAddrStreet(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-2">
                  <Label htmlFor="c-plz">{dCopy.postalCode}</Label>
                  <Input
                    id="c-plz"
                    value={addrPostal}
                    onChange={(e) => setAddrPostal(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="c-ci">{dCopy.city}</Label>
                  <Input
                    id="c-ci"
                    value={addrCity}
                    onChange={(e) => setAddrCity(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="c-land">{dCopy.country}</Label>
                <Input
                  id="c-land"
                  value={addrCountry}
                  onChange={(e) => setAddrCountry(e.target.value)}
                  maxLength={2}
                  className="uppercase"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
                {locale === "en" ? "Cancel" : "Abbrechen"}
              </Button>
              <Button type="submit" disabled={createBusy}>
                {locale === "en" ? "Create" : "Anlegen"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
