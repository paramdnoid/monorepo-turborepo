"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
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
  FieldSet,
} from "@repo/ui/field";
import { Input } from "@repo/ui/input";
import { Switch } from "@repo/ui/switch";

import { updateNotificationPreferences } from "@/app/web/actions/settings";

import { useWebApp } from "@/components/web/shell/web-app-context";
import { WebOrganizationBrandingCard } from "./web-organization-branding-card";

export function WebSettingsContent() {
  const { session, logout, logoutBusy, logoutError } = useWebApp();
  const [productUpdates, setProductUpdates] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [pending, startTransition] = useTransition();

  function handleSaveNotifications() {
    startTransition(() => {
      void (async () => {
        const result = await updateNotificationPreferences({
          productUpdates,
          securityAlerts,
        });
        if (result.ok) {
          toast.success("Einstellungen übernommen (lokal validiert).");
        } else {
          toast.error(result.error);
        }
      })();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Profil & Konto</CardTitle>
          <CardDescription>
            Angaben aus Ihrer Anmeldung; Änderungen erfolgen über den
            Identitätsanbieter.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="settings-name">Name</FieldLabel>
              <FieldContent>
                <Input
                  id="settings-name"
                  readOnly
                  value={session.name}
                  className="bg-muted/30"
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="settings-email">E-Mail</FieldLabel>
              <FieldContent>
                <Input
                  id="settings-email"
                  readOnly
                  type="email"
                  value={session.email}
                  className="bg-muted/30"
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="settings-tagline">
                Handwerk (Sidebar)
              </FieldLabel>
              <FieldContent>
                <Input
                  id="settings-tagline"
                  readOnly
                  value={session.brandTagline || "—"}
                  className="bg-muted/30"
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="settings-trade-slug">Trade-Slug</FieldLabel>
              <FieldContent>
                <Input
                  id="settings-trade-slug"
                  readOnly
                  value={session.tradeSlug ?? "—"}
                  className="bg-muted/30"
                />
                <FieldDescription>
                  Aus dem Access-Token; für Mandanten- und Handwerkslogik.
                </FieldDescription>
              </FieldContent>
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <WebOrganizationBrandingCard />

      <Card>
        <CardHeader>
          <CardTitle>Sitzung & Sicherheit</CardTitle>
          <CardDescription>
            Beenden Sie die Web-Sitzung auf diesem Gerät.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {logoutError ? (
            <p className="text-sm text-destructive" role="alert">
              {logoutError}
            </p>
          ) : null}
          <Button
            type="button"
            variant="outline"
            disabled={logoutBusy}
            onClick={() => void logout()}
          >
            {logoutBusy ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : null}
            Abmelden (Web)
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Benachrichtigungen</CardTitle>
          <CardDescription>
            Voreinstellungen für die Produktoberfläche. Speicherung im Backend ist
            vorgesehen — derzeit nur Validierung über die Server Action.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldSet className="gap-0">
            <Field
              orientation="horizontal"
              className="rounded-lg border border-transparent py-3 not-last:border-b"
            >
              <FieldLabel htmlFor="notify-product" className="flex-1">
                Produktupdates
              </FieldLabel>
              <FieldContent className="shrink-0">
                <Switch
                  id="notify-product"
                  checked={productUpdates}
                  onCheckedChange={setProductUpdates}
                />
              </FieldContent>
            </Field>
            <Field orientation="horizontal" className="py-3">
              <FieldLabel htmlFor="notify-security" className="flex-1">
                Sicherheitshinweise
              </FieldLabel>
              <FieldContent className="shrink-0">
                <Switch
                  id="notify-security"
                  checked={securityAlerts}
                  onCheckedChange={setSecurityAlerts}
                />
              </FieldContent>
            </Field>
          </FieldSet>
        </CardContent>
        <CardFooter className="justify-end border-t bg-muted/30">
          <Button
            type="button"
            onClick={handleSaveNotifications}
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : null}
            Benachrichtigungen speichern
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rechtliches & Daten</CardTitle>
          <CardDescription>
            Hinweise zu Impressum, Datenschutz und Nutzungsbedingungen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2 text-sm">
            <li>
              <Link
                className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                href="/legal/imprint"
                target="_blank"
                rel="noopener noreferrer"
              >
                Impressum
                <ExternalLink className="size-3.5 opacity-70" aria-hidden />
              </Link>
            </li>
            <li>
              <Link
                className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                href="/legal/privacy"
                target="_blank"
                rel="noopener noreferrer"
              >
                Datenschutz
                <ExternalLink className="size-3.5 opacity-70" aria-hidden />
              </Link>
            </li>
            <li>
              <Link
                className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                href="/legal/terms"
                target="_blank"
                rel="noopener noreferrer"
              >
                Nutzungsbedingungen
                <ExternalLink className="size-3.5 opacity-70" aria-hidden />
              </Link>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
