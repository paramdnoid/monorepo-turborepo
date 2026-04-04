"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CUSTOMER_ADDRESS_KIND_OPTIONS,
  customerDetailResponseSchema,
  type CustomerAddressKind,
  type CustomerDetail,
} from "@repo/api-contracts";
import { Alert, AlertDescription } from "@repo/ui/alert";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { Checkbox } from "@repo/ui/checkbox";
import { Input } from "@repo/ui/input";
import { Label } from "@repo/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/select";
import { Skeleton } from "@repo/ui/skeleton";
import { Textarea } from "@repo/ui/textarea";

import {
  getCustomersDetailCopy,
  getCustomersGeocodeCopy,
  getCustomersKindLabel,
} from "@/content/customers-module";
import type { Locale } from "@/lib/i18n/locale";

import { CustomerAddressGeocodeControls } from "./customer-address-geocode-controls";

type CustomersCustomerDetailContentProps = {
  locale: Locale;
  customerId: string;
};

function DetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <div className="flex gap-2">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-32" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-9 w-24" />
        </CardContent>
      </Card>
      <div className="space-y-4">
        <Skeleton className="h-5 w-32" />
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-10 w-full max-w-xs" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function CustomersCustomerDetailContent({
  locale,
  customerId,
}: CustomersCustomerDetailContentProps) {
  const copy = getCustomersDetailCopy(locale);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [customerNumber, setCustomerNumber] = useState("");
  const [vatId, setVatId] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [masterBusy, setMasterBusy] = useState(false);
  const [masterMsg, setMasterMsg] = useState<string | null>(null);

  const [addKind, setAddKind] = useState<string>("billing");
  const [addLabel, setAddLabel] = useState("");
  const [addLine2, setAddLine2] = useState("");
  const [addRecipient, setAddRecipient] = useState("");
  const [addStreet, setAddStreet] = useState("");
  const [addPostal, setAddPostal] = useState("");
  const [addCity, setAddCity] = useState("");
  const [addCountry, setAddCountry] = useState("DE");
  const [addBusy, setAddBusy] = useState(false);

  const addGeocodeQuery = useMemo(
    () =>
      [addStreet, addPostal, addCity].filter(Boolean).join(", ").trim(),
    [addStreet, addPostal, addCity],
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
    setMasterMsg(null);
    try {
      const res = await fetch(`/api/web/customers/${customerId}`, {
        credentials: "include",
      });
      const text = await res.text();
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
      const json: unknown = JSON.parse(text);
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

  async function saveMaster(e: React.FormEvent) {
    e.preventDefault();
    setMasterMsg(null);
    if (!displayName.trim()) {
      setMasterMsg(copy.validation);
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
          customerNumber: customerNumber.trim() === "" ? null : customerNumber.trim(),
          vatId: vatId.trim() === "" ? null : vatId.trim(),
          taxNumber: taxNumber.trim() === "" ? null : taxNumber.trim(),
          notes: notes.trim() === "" ? null : notes.trim(),
        }),
      });
      if (res.status === 409) {
        setMasterMsg(copy.conflictNumber);
        return;
      }
      if (!res.ok) {
        setMasterMsg(copy.validation);
        return;
      }
      const json: unknown = JSON.parse(await res.text());
      const parsed = customerDetailResponseSchema.safeParse(json);
      if (!parsed.success) {
        setMasterMsg(copy.loadError);
        return;
      }
      applyCustomer(parsed.data.customer);
      setMasterMsg(copy.saved);
    } finally {
      setMasterBusy(false);
    }
  }

  async function toggleArchive(archived: boolean) {
    setMasterMsg(null);
    setMasterBusy(true);
    try {
      const res = await fetch(`/api/web/customers/${customerId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived }),
      });
      if (!res.ok) {
        setMasterMsg(copy.validation);
        return;
      }
      const json: unknown = JSON.parse(await res.text());
      const parsed = customerDetailResponseSchema.safeParse(json);
      if (!parsed.success) {
        setMasterMsg(copy.loadError);
        return;
      }
      applyCustomer(parsed.data.customer);
    } finally {
      setMasterBusy(false);
    }
  }

  async function addAddress(e: React.FormEvent) {
    e.preventDefault();
    if (
      !addRecipient.trim() ||
      !addStreet.trim() ||
      !addPostal.trim() ||
      !addCity.trim()
    ) {
      setMasterMsg(copy.validation);
      return;
    }
    setAddBusy(true);
    setMasterMsg(null);
    try {
      const res = await fetch(`/api/web/customers/${customerId}/addresses`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: addKind,
          label: addLabel.trim() === "" ? null : addLabel.trim(),
          addressLine2: addLine2.trim() === "" ? null : addLine2.trim(),
          recipientName: addRecipient.trim(),
          street: addStreet.trim(),
          postalCode: addPostal.trim(),
          city: addCity.trim(),
          country: (addCountry.trim().toUpperCase() || "DE").slice(0, 2),
          isDefault: true,
        }),
      });
      if (!res.ok) {
        setMasterMsg(copy.validation);
        return;
      }
      const json: unknown = JSON.parse(await res.text());
      const parsed = customerDetailResponseSchema.safeParse(json);
      if (!parsed.success) {
        setMasterMsg(copy.loadError);
        return;
      }
      applyCustomer(parsed.data.customer);
      setAddRecipient("");
      setAddStreet("");
      setAddPostal("");
      setAddCity("");
      setAddCountry("DE");
      setAddKind("billing");
      setAddLabel("");
      setAddLine2("");
    } finally {
      setAddBusy(false);
    }
  }

  async function deleteAddress(addressId: string) {
    setMasterMsg(null);
    try {
      const res = await fetch(
        `/api/web/customers/${customerId}/addresses/${addressId}`,
        { method: "DELETE", credentials: "include" },
      );
      if (!res.ok) {
        setMasterMsg(copy.validation);
        return;
      }
      const json: unknown = JSON.parse(await res.text());
      const parsed = customerDetailResponseSchema.safeParse(json);
      if (!parsed.success) {
        setMasterMsg(copy.loadError);
        return;
      }
      applyCustomer(parsed.data.customer);
    } catch {
      setMasterMsg(copy.loadError);
    }
  }

  async function patchAddress(
    addressId: string,
    patch: Record<string, unknown>,
  ) {
    setMasterMsg(null);
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
        setMasterMsg(copy.validation);
        return;
      }
      const json: unknown = JSON.parse(await res.text());
      const parsed = customerDetailResponseSchema.safeParse(json);
      if (!parsed.success) {
        setMasterMsg(copy.loadError);
        return;
      }
      applyCustomer(parsed.data.customer);
      setMasterMsg(copy.saved);
    } catch {
      setMasterMsg(copy.loadError);
    }
  }

  if (loading) {
    return <DetailSkeleton />;
  }

  if (error && !customer) {
    return (
      <div className="space-y-4">
        <Button variant="outline" asChild>
          <Link href="/web/customers">{copy.back}</Link>
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

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" asChild>
          <Link href="/web/customers">{copy.back}</Link>
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

      {masterMsg ? (
        <Alert variant={masterMsg === copy.saved ? "default" : "destructive"}>
          <AlertDescription>{masterMsg}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{copy.displayName}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={saveMaster} className="grid gap-4">
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
                <Input id="m-vat" value={vatId} onChange={(e) => setVatId(e.target.value)} />
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
                rows={3}
              />
            </div>
            <div>
              <Button type="submit" disabled={masterBusy}>
                {copy.save}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-sm font-medium">{copy.addressesHeading}</h2>
        {customer.addresses.map((a) => (
          <AddressEditCard
            key={a.id}
            locale={locale}
            standardBadgeLabel={gb.standardBadge}
            address={a}
            onSave={(patch) => void patchAddress(a.id, patch)}
            onDelete={() => void deleteAddress(a.id)}
          />
        ))}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{copy.newAddressTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={addAddress} className="grid gap-3">
              <CustomerAddressGeocodeControls
                locale={locale}
                defaultQuery={addGeocodeQuery}
                onApply={(s) => {
                  setAddRecipient(s.recipientName);
                  setAddStreet(s.street);
                  setAddPostal(s.postalCode);
                  setAddCity(s.city);
                  setAddCountry(s.country);
                  if (s.label?.trim()) {
                    setAddLabel(s.label.trim());
                  }
                  if (s.addressLine2?.trim()) {
                    setAddLine2(s.addressLine2.trim());
                  }
                }}
              />
              <div className="grid gap-2">
                <Label>{copy.addressKind}</Label>
                <Select value={addKind} onValueChange={setAddKind}>
                  <SelectTrigger className="w-full max-w-xs">
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
              <div className="grid gap-2">
                <Label>{copy.addressLabel}</Label>
                <Input value={addLabel} onChange={(e) => setAddLabel(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>{copy.addressLine2}</Label>
                <Input value={addLine2} onChange={(e) => setAddLine2(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>{copy.recipientName}</Label>
                <Input
                  value={addRecipient}
                  onChange={(e) => setAddRecipient(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>{copy.street}</Label>
                <Input value={addStreet} onChange={(e) => setAddStreet(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-2">
                  <Label>{copy.postalCode}</Label>
                  <Input value={addPostal} onChange={(e) => setAddPostal(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>{copy.city}</Label>
                  <Input value={addCity} onChange={(e) => setAddCity(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>{copy.country}</Label>
                <Input
                  value={addCountry}
                  onChange={(e) => setAddCountry(e.target.value)}
                  maxLength={2}
                  className="max-w-[5rem] uppercase"
                />
              </div>
              <Button type="submit" disabled={addBusy}>
                {copy.addAddress}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type AddressEditCardProps = {
  locale: Locale;
  standardBadgeLabel: string;
  address: CustomerDetail["addresses"][number];
  onSave: (patch: Record<string, unknown>) => void;
  onDelete: () => void;
};

function AddressEditCard({
  locale,
  standardBadgeLabel,
  address,
  onSave,
  onDelete,
}: AddressEditCardProps) {
  const copy = getCustomersDetailCopy(locale);
  const [kind, setKind] = useState<CustomerAddressKind>(address.kind);
  const [label, setLabel] = useState(address.label ?? "");
  const [addressLine2, setAddressLine2] = useState(address.addressLine2 ?? "");
  const [recipientName, setRecipientName] = useState(address.recipientName);
  const [street, setStreet] = useState(address.street);
  const [postalCode, setPostalCode] = useState(address.postalCode);
  const [city, setCity] = useState(address.city);
  const [country, setCountry] = useState(address.country);
  const [isDefault, setIsDefault] = useState(address.isDefault);

  const cardGeocodeQuery = useMemo(
    () =>
      [street, postalCode, city].filter(Boolean).join(", ").trim(),
    [street, postalCode, city],
  );

  useEffect(() => {
    setKind(address.kind);
    setLabel(address.label ?? "");
    setAddressLine2(address.addressLine2 ?? "");
    setRecipientName(address.recipientName);
    setStreet(address.street);
    setPostalCode(address.postalCode);
    setCity(address.city);
    setCountry(address.country);
    setIsDefault(address.isDefault);
  }, [address]);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      kind,
      label: label.trim() === "" ? null : label.trim(),
      addressLine2: addressLine2.trim() === "" ? null : addressLine2.trim(),
      recipientName: recipientName.trim(),
      street: street.trim(),
      postalCode: postalCode.trim(),
      city: city.trim(),
      country: country.trim().toUpperCase().slice(0, 2),
      isDefault,
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">
            {getCustomersKindLabel(locale, kind)}
          </CardTitle>
          {isDefault ? (
            <Badge variant="secondary" className="font-normal">
              {standardBadgeLabel}
            </Badge>
          ) : null}
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onDelete}>
          {copy.deleteAddress}
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="grid gap-3">
          <CustomerAddressGeocodeControls
            locale={locale}
            defaultQuery={cardGeocodeQuery}
            onApply={(s) => {
              setRecipientName(s.recipientName);
              setStreet(s.street);
              setPostalCode(s.postalCode);
              setCity(s.city);
              setCountry(s.country);
              if (s.label?.trim()) {
                setLabel(s.label.trim());
              }
              if (s.addressLine2?.trim()) {
                setAddressLine2(s.addressLine2.trim());
              }
            }}
          />
          <div className="grid gap-2">
            <Label>{copy.addressKind}</Label>
            <Select
              value={kind}
              onValueChange={(v) => setKind(v as CustomerAddressKind)}
            >
              <SelectTrigger className="w-full max-w-xs">
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
          <div className="grid gap-2">
            <Label>{copy.addressLabel}</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>{copy.addressLine2}</Label>
            <Input
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>{copy.recipientName}</Label>
            <Input
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label>{copy.street}</Label>
            <Input value={street} onChange={(e) => setStreet(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-2">
              <Label>{copy.postalCode}</Label>
              <Input
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>{copy.city}</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} required />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>{copy.country}</Label>
            <Input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              maxLength={2}
              className="max-w-[5rem] uppercase"
              required
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox checked={isDefault} onCheckedChange={(v) => setIsDefault(v === true)} />
            {copy.defaultForKind}
          </label>
          <Button type="submit" size="sm">
            {copy.saveAddress}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
