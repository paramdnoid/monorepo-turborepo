"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
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

import { useWebApp } from "@/components/web/shell/web-app-context";
import {
  loadNotificationPreferences,
  saveNotificationPreferences,
  type NotificationPreferencesState,
} from "@/app/web/settings/notification-preferences-client";
import { WebOrganizationBrandingCard } from "./web-organization-branding-card";

export function WebSettingsContent() {
  const { session, logout, logoutBusy, logoutError } = useWebApp();
  const [productUpdates, setProductUpdates] = useState(false);
  const [securityAlerts, setSecurityAlerts] = useState(false);
  const [savedNotifications, setSavedNotifications] =
    useState<NotificationPreferencesState | null>(null);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);
  const [notificationsLoadError, setNotificationsLoadError] = useState<
    string | null
  >(null);
  const [pending, startTransition] = useTransition();

  const notificationsDirty =
    savedNotifications !== null &&
    (productUpdates !== savedNotifications.productUpdates ||
      securityAlerts !== savedNotifications.securityAlerts);

  const lastSavedLabel =
    savedNotifications?.updatedAt != null
      ? new Date(savedNotifications.updatedAt).toLocaleString(
          session.locale === "en" ? "en-US" : "de-DE",
        )
      : null;

  const refreshNotifications = useCallback(async () => {
    setNotificationsLoadError(null);
    setNotificationsLoaded(false);
    const result = await loadNotificationPreferences(session.locale);
    if (!result.ok) {
      setNotificationsLoadError(result.error);
      setNotificationsLoaded(true);
      return;
    }
    const prefs = result.preferences;
    setProductUpdates(prefs.productUpdates);
    setSecurityAlerts(prefs.securityAlerts);
    setSavedNotifications(prefs);
    setNotificationsLoaded(true);
  }, [session.locale]);

  useEffect(() => {
    void refreshNotifications();
  }, [refreshNotifications]);

  function handleSaveNotifications() {
    startTransition(() => {
      void (async () => {
        if (!notificationsLoaded || notificationsLoadError) {
          return;
        }
        try {
          const result = await saveNotificationPreferences(session.locale, {
            productUpdates,
            securityAlerts,
          });
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          const prefs = result.preferences;
          setProductUpdates(prefs.productUpdates);
          setSecurityAlerts(prefs.securityAlerts);
          setSavedNotifications(prefs);
          toast.success("Benachrichtigungseinstellungen gespeichert.");
        } catch {
          toast.error("Speichern fehlgeschlagen.");
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
            Voreinstellungen für die Produktoberfläche. Diese Einstellungen werden pro
            Benutzer gespeichert.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!notificationsLoaded ? (
            <div
              className="flex items-center gap-2 text-sm text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
              Laden…
            </div>
          ) : notificationsLoadError ? (
            <div>
              <p className="text-sm text-destructive" role="alert">
                {notificationsLoadError}
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-3"
                onClick={() => void refreshNotifications()}
              >
                Erneut versuchen
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
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
              {lastSavedLabel ? (
                <p className="text-xs text-muted-foreground">
                  Zuletzt gespeichert: {lastSavedLabel}
                </p>
              ) : null}
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-end border-t bg-muted/30">
          <Button
            type="button"
            onClick={handleSaveNotifications}
            disabled={
              pending ||
              !notificationsLoaded ||
              notificationsLoadError !== null ||
              !notificationsDirty
            }
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
