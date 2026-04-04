"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { getOrganizationBrandingCopy } from "@/content/organization-branding";
import type { MeOrganization } from "@repo/api-contracts";
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
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@repo/ui/field";
import { Input } from "@repo/ui/input";
import { Textarea } from "@repo/ui/textarea";

import { useWebApp } from "./web-app-context";

export function WebOrganizationBrandingCard() {
  const { session } = useWebApp();
  const copy = getOrganizationBrandingCopy(session.locale);

  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [org, setOrg] = useState<MeOrganization | null>(null);

  const [name, setName] = useState("");
  const [senderAddress, setSenderAddress] = useState("");
  const [vatId, setVatId] = useState("");
  const [taxNumber, setTaxNumber] = useState("");

  const [pending, startTransition] = useTransition();
  const [logoBusy, setLogoBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/web/organization", { cache: "no-store" });
      const json: unknown = await res.json();
      if (!res.ok) {
        setLoadError(
          typeof json === "object" &&
            json !== null &&
            "error" in json &&
            typeof (json as { error?: unknown }).error === "string"
            ? (json as { error: string }).error
            : copy.loadFailed,
        );
        setLoaded(true);
        return;
      }
      const o =
        typeof json === "object" &&
        json !== null &&
        "organization" in json &&
        (json as { organization: MeOrganization }).organization;
      if (!o) {
        setLoadError(copy.loadFailed);
        setLoaded(true);
        return;
      }
      setOrg(o);
      setName(o.name);
      setSenderAddress(o.senderAddress ?? "");
      setVatId(o.vatId ?? "");
      setTaxNumber(o.taxNumber ?? "");
      setLoaded(true);
    } catch {
      setLoadError(copy.loadFailed);
      setLoaded(true);
    }
  }, [copy.loadFailed]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function handleSave() {
    startTransition(() => {
      void (async () => {
        if (name.trim().length === 0) {
          toast.error(copy.nameRequired);
          return;
        }
        const patch = {
          name: name.trim(),
          senderAddress:
            senderAddress.trim() === "" ? null : senderAddress.trim(),
          vatId: vatId.trim() === "" ? null : vatId.trim(),
          taxNumber: taxNumber.trim() === "" ? null : taxNumber.trim(),
        };
        try {
          const res = await fetch("/api/web/organization", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
          });
          const json: unknown = await res.json();
          if (!res.ok) {
            toast.error(copy.saveFailed);
            return;
          }
          const nextOrg =
            typeof json === "object" &&
            json !== null &&
            "organization" in json
              ? (json as { organization: MeOrganization }).organization
              : null;
          if (nextOrg) setOrg(nextOrg);
          toast.success(copy.saved);
        } catch {
          toast.error(copy.saveFailed);
        }
      })();
    });
  }

  async function handleLogoPick(file: File | undefined) {
    if (!file) return;
    setLogoBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/web/organization/logo", {
        method: "POST",
        body: fd,
      });
      const json: unknown = await res.json();
      if (!res.ok) {
        toast.error(copy.uploadFailed);
        return;
      }
      const nextOrg =
        typeof json === "object" &&
        json !== null &&
        "organization" in json
          ? (json as { organization: MeOrganization }).organization
          : null;
      if (nextOrg) setOrg(nextOrg);
      toast.success(copy.saved);
    } catch {
      toast.error(copy.uploadFailed);
    } finally {
      setLogoBusy(false);
    }
  }

  async function handleClearLogo() {
    setLogoBusy(true);
    try {
      const res = await fetch("/api/web/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearLogo: true }),
      });
      const json: unknown = await res.json();
      if (!res.ok) {
        toast.error(copy.saveFailed);
        return;
      }
      const nextOrg =
        typeof json === "object" &&
        json !== null &&
        "organization" in json
          ? (json as { organization: MeOrganization }).organization
          : null;
      if (nextOrg) setOrg(nextOrg);
      toast.success(copy.saved);
    } catch {
      toast.error(copy.saveFailed);
    } finally {
      setLogoBusy(false);
    }
  }

  if (!loaded) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{copy.cardTitle}</CardTitle>
          <CardDescription>{copy.cardDescription}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          …
        </CardContent>
      </Card>
    );
  }

  if (loadError || org === null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{copy.cardTitle}</CardTitle>
          <CardDescription>{copy.cardDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive" role="alert">
            {loadError ?? copy.loadFailed}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            onClick={() => void refresh()}
          >
            {copy.retry}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy.cardTitle}</CardTitle>
        <CardDescription>{copy.cardDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="org-trade">{session.locale === "en" ? "Trade" : "Handwerk (Slug)"}</FieldLabel>
            <FieldContent>
              <Input
                id="org-trade"
                readOnly
                value={org.tradeSlug}
                className="bg-muted/30"
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="org-name">{copy.companyName}</FieldLabel>
            <FieldContent>
              <Input
                id="org-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="organization"
              />
              <FieldDescription>{copy.companyNameHint}</FieldDescription>
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="org-address">{copy.senderAddress}</FieldLabel>
            <FieldContent>
              <Textarea
                id="org-address"
                value={senderAddress}
                onChange={(e) => setSenderAddress(e.target.value)}
                rows={4}
                className="min-h-[5rem] resize-y"
              />
              <FieldDescription>{copy.senderAddressHint}</FieldDescription>
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="org-vat">{copy.vatId}</FieldLabel>
            <FieldContent>
              <Input
                id="org-vat"
                value={vatId}
                onChange={(e) => setVatId(e.target.value)}
                autoComplete="off"
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="org-tax">{copy.taxNumber}</FieldLabel>
            <FieldContent>
              <Input
                id="org-tax"
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
                autoComplete="off"
              />
            </FieldContent>
          </Field>
          <Field>
            <FieldLabel htmlFor="org-logo">{copy.logoLabel}</FieldLabel>
            <FieldContent className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                id="org-logo"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={logoBusy}
                className="cursor-pointer"
                onChange={(e) =>
                  void handleLogoPick(e.target.files?.[0] ?? undefined)
                }
              />
              {org.hasLogo ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={logoBusy}
                  onClick={() => void handleClearLogo()}
                >
                  {logoBusy ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : null}
                  {copy.clearLogo}
                </Button>
              ) : null}
              <FieldDescription>{copy.logoHint}</FieldDescription>
            </FieldContent>
          </Field>
          {org.hasLogo ? (
            <div className="rounded-md border border-border bg-muted/20 p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                {copy.logoLabel}
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/api/web/organization/logo"
                alt=""
                className="max-h-16 w-auto max-w-[12rem] object-contain object-left"
              />
            </div>
          ) : null}
          <p className="text-xs text-muted-foreground">{copy.legalHint}</p>
        </FieldGroup>
      </CardContent>
      <CardFooter className="justify-end border-t bg-muted/30">
        <Button type="button" onClick={handleSave} disabled={pending}>
          {pending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : null}
          {pending ? copy.saving : copy.save}
        </Button>
      </CardFooter>
    </Card>
  );
}
