"use client";

import { Pencil } from "lucide-react";
import type { CustomerDetail } from "@repo/api-contracts";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";

import { getCustomersDetailCopy, getCustomersKindLabel } from "@/content/customers-module";
import type { Locale } from "@/lib/i18n/locale";

export type CustomerDetailAddressCardProps = {
  locale: Locale;
  standardBadgeLabel: string;
  address: CustomerDetail["addresses"][number];
  onEdit: () => void;
  onDelete: () => void;
};

export function CustomerDetailAddressCard({
  locale,
  standardBadgeLabel,
  address,
  onEdit,
  onDelete,
}: CustomerDetailAddressCardProps) {
  const copy = getCustomersDetailCopy(locale);
  const secondary = [address.label, address.addressLine2]
    .filter((x) => x?.trim())
    .join(" · ");

  return (
    <Card className="flex h-full flex-col border-border/80 shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base font-semibold">
            {getCustomersKindLabel(locale, address.kind)}
          </CardTitle>
          {address.isDefault ? (
            <Badge variant="secondary" className="font-normal">
              {standardBadgeLabel}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 pt-0">
        <div className="space-y-1.5 text-sm">
          <p className="font-medium text-foreground">{address.recipientName}</p>
          {secondary ? (
            <p className="text-muted-foreground">{secondary}</p>
          ) : null}
          <p className="text-muted-foreground">
            {address.street}
            <br />
            {address.postalCode} {address.city}
          </p>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {address.country}
          </p>
        </div>
        <div className="mt-auto flex flex-wrap gap-2 border-t border-border/60 pt-4">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="gap-1.5"
            onClick={onEdit}
          >
            <Pencil className="size-3.5" aria-hidden />
            {copy.edit}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={onDelete}
          >
            {copy.deleteAddress}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
