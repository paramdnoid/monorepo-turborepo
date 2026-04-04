"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/alert";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";

type ErrorKind =
  | "unauthorized"
  | "forbidden"
  | "notFound"
  | "conflict"
  | "server"
  | "unknown";

function classifyError(error: Error): ErrorKind {
  const message = `${error.name} ${error.message}`.toLowerCase();
  if (
    message.includes("401") ||
    message.includes("unauthorized") ||
    message.includes("invalid_session")
  ) {
    return "unauthorized";
  }
  if (message.includes("403") || message.includes("forbidden")) {
    return "forbidden";
  }
  if (
    message.includes("404") ||
    message.includes("not_found") ||
    message.includes("not found")
  ) {
    return "notFound";
  }
  if (
    message.includes("409") ||
    message.includes("conflict") ||
    message.includes("taken")
  ) {
    return "conflict";
  }
  if (
    message.includes("500") ||
    message.includes("503") ||
    message.includes("internal_server_error") ||
    message.includes("database_unavailable")
  ) {
    return "server";
  }
  return "unknown";
}

function isEnglishUi(): boolean {
  if (typeof document === "undefined") {
    return false;
  }
  return document.documentElement.lang.toLowerCase().startsWith("en");
}

export default function WebSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();
  const localeEn = isEnglishUi();
  const kind = classifyError(error);

  useEffect(() => {
    // Keep error details in console for diagnostics.
    console.error(error);
  }, [error]);

  const copy = useMemo(() => {
    if (localeEn) {
      return {
        title: "Something went wrong",
        subtitle:
          "The requested page could not be shown right now. You can retry or continue via a safe entry point.",
        retry: "Retry",
        reload: "Reload page",
        toOverview: "Go to dashboard",
        toLogin: "Go to login",
        toSales: "Open sales",
        toCustomers: "Open customers",
        toWorkforce: "Open workforce",
        detailTitle: "Technical details",
        kind: {
          unauthorized:
            "Your session is no longer valid. Please sign in again.",
          forbidden:
            "You do not have permission for this action in the current role.",
          notFound:
            "The requested resource does not exist or is no longer available.",
          conflict:
            "The data changed in parallel. Refresh and try again.",
          server:
            "A backend service is currently unavailable.",
          unknown:
            "An unexpected error occurred while loading this area.",
        },
      };
    }
    return {
      title: "Fehler im Bereich /web",
      subtitle:
        "Die angeforderte Seite konnte gerade nicht angezeigt werden. Du kannst es erneut versuchen oder ueber einen sicheren Einstieg weiterarbeiten.",
      retry: "Erneut versuchen",
      reload: "Seite neu laden",
      toOverview: "Zur Uebersicht",
      toLogin: "Zum Login",
      toSales: "Sales oeffnen",
      toCustomers: "Kunden oeffnen",
      toWorkforce: "Team & Planung oeffnen",
      detailTitle: "Technische Details",
      kind: {
        unauthorized:
          "Die Sitzung ist nicht mehr gueltig. Bitte melde dich erneut an.",
        forbidden:
          "Fuer diese Aktion fehlen Rechte in der aktuellen Rolle.",
        notFound:
          "Die angeforderte Ressource existiert nicht oder ist nicht mehr verfuegbar.",
        conflict:
          "Die Daten wurden parallel geaendert. Bitte neu laden und erneut versuchen.",
        server:
          "Ein Backend-Dienst ist aktuell nicht verfuegbar.",
        unknown:
          "Beim Laden dieses Bereichs ist ein unerwarteter Fehler aufgetreten.",
      },
    };
  }, [localeEn]);

  const contextLinks = useMemo(() => {
    if (!pathname) {
      return ["/web", "/web/sales/quotes", "/web/customers/list"];
    }
    if (pathname.startsWith("/web/sales")) {
      return ["/web/sales/quotes", "/web/sales/invoices", "/web"];
    }
    if (pathname.startsWith("/web/customers")) {
      return ["/web/customers/list", "/web/customers/addresses", "/web"];
    }
    if (pathname.startsWith("/web/employees") || pathname.startsWith("/web/scheduling")) {
      return ["/web/employees/list", "/web/scheduling", "/web"];
    }
    return ["/web", "/web/sales/quotes", "/web/customers/list"];
  }, [pathname]);

  const loginHref = `/login?next=${encodeURIComponent(pathname || "/web")}`;

  return (
    <div className="w-full min-w-0 space-y-6">
      <Card className="border-border/80 bg-muted/15 shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="size-5 text-destructive" aria-hidden />
            {copy.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
          <Alert variant="destructive">
            <AlertTitle>{copy.kind[kind]}</AlertTitle>
            <AlertDescription>
              {localeEn
                ? "Use the actions below to continue safely."
                : "Nutze die Aktionen unten, um sicher weiterzuarbeiten."}
            </AlertDescription>
          </Alert>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => reset()}>
              {copy.retry}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="mr-2 size-4" aria-hidden />
              {copy.reload}
            </Button>
            {kind === "unauthorized" ? (
              <Button variant="outline" asChild>
                <Link href={loginHref}>{copy.toLogin}</Link>
              </Button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {contextLinks.includes("/web") ? (
              <Button variant="outline" size="sm" asChild>
                <Link href="/web">{copy.toOverview}</Link>
              </Button>
            ) : null}
            {contextLinks.includes("/web/sales/quotes") ? (
              <Button variant="outline" size="sm" asChild>
                <Link href="/web/sales/quotes">{copy.toSales}</Link>
              </Button>
            ) : null}
            {contextLinks.includes("/web/customers/list") ? (
              <Button variant="outline" size="sm" asChild>
                <Link href="/web/customers/list">{copy.toCustomers}</Link>
              </Button>
            ) : null}
            {contextLinks.includes("/web/employees/list") || contextLinks.includes("/web/scheduling") ? (
              <Button variant="outline" size="sm" asChild>
                <Link href="/web/scheduling">{copy.toWorkforce}</Link>
              </Button>
            ) : null}
          </div>

          <details className="rounded-md border bg-card/70 p-3">
            <summary className="cursor-pointer text-xs text-muted-foreground">
              {copy.detailTitle}
            </summary>
            <pre className="mt-2 overflow-x-auto text-xs text-muted-foreground">
              {error.name}: {error.message}
              {error.digest ? `\ndigest: ${error.digest}` : ""}
            </pre>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}
