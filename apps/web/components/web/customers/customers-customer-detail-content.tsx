"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Loader2, MapPin, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  CUSTOMER_ADDRESS_KIND_OPTIONS,
  customerDetailResponseSchema,
  type CustomerAddressKind,
  type CustomerDetail,
} from "@repo/api-contracts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/alert-dialog";
import { Alert, AlertDescription } from "@repo/ui/alert";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Card, CardContent } from "@repo/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Separator } from "@repo/ui/separator";
import { Skeleton } from "@repo/ui/skeleton";
import { Textarea } from "@repo/ui/textarea";

import {
  getCustomersDetailCopy,
  getCustomersGeocodeCopy,
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
import { CustomerDetailAddressCard } from "./customer-detail-address-card";
import { CustomerAddressEditDialogContent } from "./customer-detail-address-edit-dialog";

type CustomersCustomerDetailContentProps = {
  locale: Locale;
  customerId: string;
};

function DetailSkeleton() {
  return (
    <div className="w-full min-w-0 space-y-8">
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-32" />
      </div>
      <Skeleton className="h-40 w-full rounded-2xl" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-52 rounded-lg" />
        <Skeleton className="h-52 rounded-lg" />
      </div>
    </div>
  );
}

export function CustomersCustomerDetailContent({
  locale,
  customerId,
}: CustomersCustomerDetailContentProps) {
  const copy = getCustomersDetailCopy(locale);
  const listCopy = getCustomersListCopy(locale);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [customerNumber, setCustomerNumber] = useState("");
  const [vatId, setVatId] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [masterBusy, setMasterBusy] = useState(false);
  const [masterDialogOpen, setMasterDialogOpen] = useState(false);

  const [addKind, setAddKind] = useState<CustomerAddressKind>("billing");
  const [addManual, setAddManual] = useState<CustomerAddressManualValues>({
    label: "",
    line2: "",
    recipient: "",
    street: "",
    postal: "",
    city: "",
    country: "DE",
  });
  const [addBusy, setAddBusy] = useState(false);
  const [newAddressOpen, setNewAddressOpen] = useState(false);

  const [editingAddress, setEditingAddress] = useState<
    CustomerDetail["addresses"][number] | null
  >(null);
  const [addressIdPendingDelete, setAddressIdPendingDelete] = useState<
    string | null
  >(null);

  const addGeocodeQuery = useMemo(
    () =>
      [addManual.street, addManual.postal, addManual.city]
        .filter(Boolean)
        .join(", ")
        .trim(),
    [addManual.street, addManual.postal, addManual.city],
  );

  const applyCustomer = useCallback((c: CustomerDetail) => {
    setCustomer(c);
    setDisplayName(c.displayName);
    setCustomerNumber(c.customerNumber ?? "");
    setVatId(c.vatId ?? "");
    setTaxNumber(c.taxNumber ?? "");
    setNotes(c.notes ?? "");
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/web/customers/${customerId}`, {
        credentials: "include",
      });
      const ptext = await res.text();
      if (res.status === 404) {
        setCustomer(null);
        setError(copy.notFound);
        return;
      }
      if (!res.ok) {
        setCustomer(null);
        setError(copy.loadError);
        return;
      }
      const json = parseResponseJson(ptext);
      if (json === null) {
        setCustomer(null);
        setError(copy.loadError);
        return;
      }
      const parsed = customerDetailResponseSchema.safeParse(json);
      if (!parsed.success) {
        setCustomer(null);
        setError(copy.loadError);
        return;
      }
      applyCustomer(parsed.data.customer);
    } catch {
      setCustomer(null);
      setError(copy.loadError);
    } finally {
      setLoading(false);
    }
  }, [applyCustomer, copy.loadError, copy.notFound, customerId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!masterDialogOpen || !customer) return;
    setDisplayName(customer.displayName);
    setCustomerNumber(customer.customerNumber ?? "");
    setVatId(customer.vatId ?? "");
    setTaxNumber(customer.taxNumber ?? "");
    setNotes(customer.notes ?? "");
  }, [masterDialogOpen, customer]);

  useEffect(() => {
    if (!newAddressOpen) return;
    setAddManual({
      label: "",
      line2: "",
      recipient: "",
      street: "",
      postal: "",
      city: "",
      country: "DE",
    });
    setAddKind("billing");
  }, [newAddressOpen]);

  async function saveMaster(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) {
      toast.error(copy.validation);
      return;
    }
    setMasterBusy(true);
    try {
      const res = await fetch(`/api/web/customers/${customerId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          customerNumber:
            customerNumber.trim() === "" ? null : customerNumber.trim(),
          vatId: vatId.trim() === "" ? null : vatId.trim(),
          taxNumber: taxNumber.trim() === "" ? null : taxNumber.trim(),
          notes: notes.trim() === "" ? null : notes.trim(),
        }),
      });
      if (res.status === 409) {
        toast.error(copy.conflictNumber);
        return;
      }
      if (!res.ok) {
        toast.error(copy.validation);
        return;
      }
      const json = parseResponseJson(await res.text());
      if (json === null) {
        toast.error(copy.loadError);
        return;
      }
      const parsed = customerDetailResponseSchema.safeParse(json);
      if (!parsed.success) {
        toast.error(copy.loadError);
        return;
      }
      applyCustomer(parsed.data.customer);
      toast.success(copy.saved);
      setMasterDialogOpen(false);
    } finally {
      setMasterBusy(false);
    }
  }

  async function toggleArchive(archived: boolean) {
    setMasterBusy(true);
    try {
      const res = await fetch(`/api/web/customers/${customerId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived }),
      });
      if (!res.ok) {
        toast.error(copy.validation);
        return;
      }
      const json = parseResponseJson(await res.text());
      if (json === null) {
        toast.error(copy.loadError);
        return;
      }
      const parsed = customerDetailResponseSchema.safeParse(json);
      if (!parsed.success) {
        toast.error(copy.loadError);
        return;
      }
      applyCustomer(parsed.data.customer);
      toast.success(copy.saved);
    } finally {
      setMasterBusy(false);
    }
  }

  async function addAddress(e: React.FormEvent) {
    e.preventDefault();
    const r = addManual.recipient.trim();
    const st = addManual.street.trim();
    const plz = addManual.postal.trim();
    const ct = addManual.city.trim();
    if (!r || !st || !plz || !ct) {
      toast.error(copy.validation);
      return;
    }
    setAddBusy(true);
    try {
      const res = await fetch(`/api/web/customers/${customerId}/addresses`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: addKind,
          label: addManual.label.trim() === "" ? null : addManual.label.trim(),
          addressLine2:
            addManual.line2.trim() === "" ? null : addManual.line2.trim(),
          recipientName: r,
          street: st,
          postalCode: plz,
          city: ct,
          country: (addManual.country.trim().toUpperCase() || "DE").slice(
            0,
            2,
          ),
          isDefault: true,
        }),
      });
      if (!res.ok) {
        toast.error(copy.validation);
        return;
      }
      const json = parseResponseJson(await res.text());
      if (json === null) {
        toast.error(copy.loadError);
        return;
      }
      const parsed = customerDetailResponseSchema.safeParse(json);
      if (!parsed.success) {
        toast.error(copy.loadError);
        return;
      }
      applyCustomer(parsed.data.customer);
      toast.success(copy.saved);
      setNewAddressOpen(false);
    } finally {
      setAddBusy(false);
    }
  }

  async function confirmDeleteAddress(addressId: string) {
    try {
      const res = await fetch(
        `/api/web/customers/${customerId}/addresses/${addressId}`,
        { method: "DELETE", credentials: "include" },
      );
      if (!res.ok) {
        toast.error(copy.validation);
        return;
      }
      const json = parseResponseJson(await res.text());
      if (json === null) {
        toast.error(copy.loadError);
        return;
      }
      const parsed = customerDetailResponseSchema.safeParse(json);
      if (!parsed.success) {
        toast.error(copy.loadError);
        return;
      }
      applyCustomer(parsed.data.customer);
      toast.success(copy.saved);
    } catch {
      toast.error(copy.loadError);
    } finally {
      setAddressIdPendingDelete(null);
    }
  }

  async function patchAddress(
    addressId: string,
    patch: Record<string, unknown>,
  ) {
    try {
      const res = await fetch(
        `/api/web/customers/${customerId}/addresses/${addressId}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        },
      );
      if (!res.ok) {
        toast.error(copy.validation);
        return;
      }
      const json = parseResponseJson(await res.text());
      if (json === null) {
        toast.error(copy.loadError);
        return;
      }
      const parsed = customerDetailResponseSchema.safeParse(json);
      if (!parsed.success) {
        toast.error(copy.loadError);
        return;
      }
      applyCustomer(parsed.data.customer);
      toast.success(copy.saved);
      setEditingAddress(null);
    } catch {
      toast.error(copy.loadError);
    }
  }

  if (loading) {
    return <DetailSkeleton />;
  }

  if (error && !customer) {
    return (
      <div className="space-y-4">
        <Button variant="outline" asChild>
          <Link href="/web/customers/list">{copy.back}</Link>
        </Button>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!customer) {
    return null;
  }

  const gb = getCustomersGeocodeCopy(locale);
  const naPrefix = "na";

  return (
    <div className="w-full min-w-0 space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" asChild>
          <Link href="/web/customers/list">{copy.back}</Link>
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={masterBusy}
          onClick={() => void toggleArchive(!customer.archivedAt)}
        >
          {customer.archivedAt ? copy.unarchive : copy.archive}
        </Button>
      </div>

      <section className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/90 shadow-sm ring-1 ring-foreground/4">
        <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-primary/80 via-primary/40 to-transparent" />
        <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-1 gap-4">
            <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary sm:flex">
              <Building2 className="size-7" aria-hidden />
            </div>
            <div className="min-w-0 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-semibold tracking-tight text-balance">
                  {customer.displayName}
                </h2>
                {customer.archivedAt ? (
                  <Badge variant="secondary" className="font-normal">
                    {listCopy.archived}
                  </Badge>
                ) : null}
              </div>
              <dl className="grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-1">
                  <dt className="text-muted-foreground">{copy.customerNumber}</dt>
                  <dd className="font-medium">
                    {customer.customerNumber?.trim()
                      ? customer.customerNumber
                      : "—"}
                  </dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-muted-foreground">{copy.vatId}</dt>
                  <dd className="font-medium">
                    {customer.vatId?.trim() ? customer.vatId : "—"}
                  </dd>
                </div>
                <div className="space-y-1">
                  <dt className="text-muted-foreground">{copy.taxNumber}</dt>
                  <dd className="font-medium">
                    {customer.taxNumber?.trim() ? customer.taxNumber : "—"}
                  </dd>
                </div>
                <div className="space-y-1 sm:col-span-2 xl:col-span-4">
                  <dt className="text-muted-foreground">{copy.notes}</dt>
                  <dd className="font-medium text-foreground/90">
                    {customer.notes?.trim() ? (
                      <span className="line-clamp-4 whitespace-pre-wrap">
                        {customer.notes}
                      </span>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
          <Button
            type="button"
            className="shrink-0 gap-2 shadow-sm"
            onClick={() => setMasterDialogOpen(true)}
          >
            <Pencil className="size-4" aria-hidden />
            {copy.edit}
          </Button>
        </div>
      </section>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <MapPin className="size-5 text-muted-foreground" aria-hidden />
              {copy.addressesHeading}
            </h3>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {copy.addressesSectionIntro}
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="w-full gap-2 sm:w-auto"
            onClick={() => setNewAddressOpen(true)}
          >
            <Plus className="size-4" aria-hidden />
            {copy.addAddress}
          </Button>
        </div>

        {customer.addresses.length === 0 ? (
          <Card className="border-dashed bg-muted/20">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <MapPin className="size-10 text-muted-foreground/60" aria-hidden />
              <p className="text-sm text-muted-foreground">
                {copy.addressesEmptyHint}
              </p>
              <Button type="button" onClick={() => setNewAddressOpen(true)}>
                <Plus className="size-4" aria-hidden />
                {copy.addAddress}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {customer.addresses.map((a) => (
              <CustomerDetailAddressCard
                key={a.id}
                locale={locale}
                standardBadgeLabel={gb.standardBadge}
                address={a}
                onEdit={() => setEditingAddress(a)}
                onDelete={() => setAddressIdPendingDelete(a.id)}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog open={masterDialogOpen} onOpenChange={setMasterDialogOpen}>
        <DialogContent
          showCloseButton
          className="max-h-[min(90vh,48rem)] gap-0 overflow-y-auto p-0 sm:max-w-xl"
        >
          <DialogHeader className="space-y-2 p-6 pb-2">
            <DialogTitle>{copy.masterDialogTitle}</DialogTitle>
            <DialogDescription>{copy.masterDialogDescription}</DialogDescription>
          </DialogHeader>
          <Separator />
          <form onSubmit={(e) => void saveMaster(e)} className="space-y-4 p-6">
            <div className="grid gap-2">
              <Label htmlFor="m-dn">{copy.displayName}</Label>
              <Input
                id="m-dn"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="m-cn">{copy.customerNumber}</Label>
              <Input
                id="m-cn"
                value={customerNumber}
                onChange={(e) => setCustomerNumber(e.target.value)}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
              <div className="grid gap-2">
                <Label htmlFor="m-vat">{copy.vatId}</Label>
                <Input
                  id="m-vat"
                  value={vatId}
                  onChange={(e) => setVatId(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="m-tax">{copy.taxNumber}</Label>
                <Input
                  id="m-tax"
                  value={taxNumber}
                  onChange={(e) => setTaxNumber(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="m-no">{copy.notes}</Label>
              <Textarea
                id="m-no"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="min-h-24 resize-y"
              />
            </div>
            <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setMasterDialogOpen(false)}
              >
                {copy.cancel}
              </Button>
              <Button type="submit" disabled={masterBusy}>
                {masterBusy ? (
                  <>
                    <Loader2
                      className="mr-2 size-4 animate-spin"
                      aria-hidden
                    />
                    {copy.saving}
                  </>
                ) : (
                  copy.save
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={newAddressOpen} onOpenChange={setNewAddressOpen}>
        <DialogContent
          showCloseButton
          className="max-h-[min(90vh,52rem)] gap-0 overflow-y-auto p-0 sm:max-w-xl"
        >
          <DialogHeader className="space-y-2 p-6 pb-2">
            <DialogTitle>{copy.newAddressTitle}</DialogTitle>
            <DialogDescription>{copy.newAddressDialogDescription}</DialogDescription>
          </DialogHeader>
          <Separator />
          <form onSubmit={(e) => void addAddress(e)} className="space-y-4 p-6">
            <CustomerAddressGeocodeControls
              locale={locale}
              defaultQuery={addGeocodeQuery}
              onApply={(s) => {
                setAddManual((prev) => ({
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
            <div className="grid gap-2">
              <Label htmlFor={`${naPrefix}-kind`}>{copy.addressKind}</Label>
              <Select
                value={addKind}
                onValueChange={(v) => setAddKind(v as CustomerAddressKind)}
              >
                <SelectTrigger id={`${naPrefix}-kind`} className="w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOMER_ADDRESS_KIND_OPTIONS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {getCustomersKindLabel(locale, k)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <CustomerAddressManualFields
              locale={locale}
              idPrefix={naPrefix}
              values={addManual}
              onChange={(patch) =>
                setAddManual((prev) => ({ ...prev, ...patch }))
              }
              countryClassName="max-w-20 uppercase"
            />
            <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewAddressOpen(false)}
              >
                {copy.cancel}
              </Button>
              <Button type="submit" disabled={addBusy}>
                {addBusy ? (
                  <>
                    <Loader2
                      className="mr-2 size-4 animate-spin"
                      aria-hidden
                    />
                    {copy.addingAddress}
                  </>
                ) : (
                  copy.addAddress
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editingAddress}
        onOpenChange={(open) => {
          if (!open) setEditingAddress(null);
        }}
      >
        {editingAddress ? (
          <CustomerAddressEditDialogContent
            key={editingAddress.id}
            locale={locale}
            address={editingAddress}
            onDismiss={() => setEditingAddress(null)}
            onPatch={(patch) => void patchAddress(editingAddress.id, patch)}
          />
        ) : null}
      </Dialog>

      <AlertDialog
        open={addressIdPendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setAddressIdPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.deleteAddressConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {copy.deleteAddressConfirmDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (addressIdPendingDelete) {
                  void confirmDeleteAddress(addressIdPendingDelete);
                }
              }}
            >
              {copy.deleteAddressConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
