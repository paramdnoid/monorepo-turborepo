"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LayoutDashboard, Loader2, MessageSquare, Settings2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/alert";
import { Button } from "@repo/ui/button";
import {
  Sidebar,
  SidebarBrand,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@repo/ui/sidebar";
import { Separator } from "@repo/ui/separator";

import type { WebDesktopAuthState } from "./web-desktop-bridge";

const API_BASE =
  process.env.NEXT_PUBLIC_WEB_API_BASE_URL ?? "http://127.0.0.1:4000";

/** Preload fehlt (Browser) oder ist veraltet (fehlende Auth-Methoden). */
function getDesktopBridgeIssue(): string | null {
  if (typeof window === "undefined") return null;
  if (!window.desktop) {
    return "Diese Seite ist im normalen Browser geöffnet — es gibt keine Electron-Preload-Brücke. Für die Desktop-Shell: `pnpm exec turbo run dev --filter=desktop` (Renderer unter http://localhost:5173). Für Anmeldung im Web nutze den Link unten.";
  }
  if (typeof window.desktop.authLogin !== "function") {
    return "Preload ist veraltet: im Repo `pnpm --filter @repo/electron run build`, danach `dist/preload.js` neu erzeugen und den Desktop-Dev neu starten.";
  }
  return null;
}

export function WebLayout() {
  const [ipcStatus, setIpcStatus] = useState<string>("…");
  const [auth, setAuth] = useState<WebDesktopAuthState | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [meJson, setMeJson] = useState<string | null>(null);
  const [meError, setMeError] = useState<string | null>(null);
  const [bridgeIssue, setBridgeIssue] = useState<string | null>(null);

  const refreshAuth = useCallback(async () => {
    if (!window.desktop?.authGetState) {
      setAuth({ status: "signed_out" });
      return;
    }
    const next = await window.desktop.authGetState();
    setAuth(next);
  }, []);

  useEffect(() => {
    setBridgeIssue(getDesktopBridgeIssue());
    const ping = window.desktop?.ping;
    if (typeof ping !== "function") {
      setIpcStatus("kein Electron");
      return;
    }
    void ping()
      .then((msg) => {
        setIpcStatus(msg);
      })
      .catch(() => {
        setIpcStatus("nicht erreichbar");
      });
  }, []);

  useEffect(() => {
    void refreshAuth();
  }, [refreshAuth]);

  useEffect(() => {
    if (auth?.status !== "signed_in") {
      setMeJson(null);
      setMeError(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const token = await window.desktop?.authGetAccessToken?.();
      if (!token || cancelled) return;
      try {
        const res = await fetch(`${API_BASE}/v1/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const text = await res.text();
        if (!res.ok) {
          setMeError(`${String(res.status)} ${text}`);
          setMeJson(null);
          return;
        }
        setMeJson(text);
        setMeError(null);
      } catch (e) {
        setMeError(e instanceof Error ? e.message : String(e));
        setMeJson(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth]);

  async function handleLogin() {
    setAuthError(null);
    const bridge = getDesktopBridgeIssue();
    if (bridge) {
      setAuthError(bridge);
      return;
    }
    const desktopApi = window.desktop;
    if (!desktopApi || typeof desktopApi.authLogin !== "function") {
      setAuthError(
        getDesktopBridgeIssue() ?? "Anmeldung ist in dieser Umgebung nicht möglich.",
      );
      return;
    }
    setAuthBusy(true);
    try {
      const next = await desktopApi.authLogin();
      setAuth(next);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === "login_cancelled") {
        setAuthError("Anmeldung abgebrochen.");
      } else {
        setAuthError(msg);
      }
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleLogout() {
    setAuthError(null);
    setAuthBusy(true);
    try {
      await window.desktop?.authLogout?.();
      if (typeof window.desktop?.quitApp === "function") {
        await window.desktop.quitApp();
        return;
      }
      await refreshAuth();
      setMeJson(null);
      setMeError(null);
    } finally {
      setAuthBusy(false);
    }
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader className="border-sidebar-border">
          <SidebarBrand />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Übersicht" isActive>
                    <LayoutDashboard />
                    <span>Übersicht</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Nachrichten">
                    <MessageSquare />
                    <span>Nachrichten</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Einstellungen">
                    <Settings2 />
                    <span>Einstellungen</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <div className="flex flex-1 flex-col gap-0.5">
            <h1 className="text-sm font-medium leading-none">Übersicht</h1>
            <p className="text-xs text-muted-foreground">
              Next.js · shadcn Sidebar-Layout (Radix Nova)
            </p>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 overflow-auto p-6">
          <section className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
            <h2 className="mb-2 text-lg font-semibold tracking-tight">
              Willkommen
            </h2>
            <p className="text-sm text-muted-foreground">
              Diese Route nutzt{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                @repo/ui/sidebar
              </code>{" "}
              in der Next.js App (App Router).
            </p>
            <p className="mt-4 text-sm">
              <span className="text-muted-foreground">IPC ping: </span>
              <span className="font-mono text-foreground">{ipcStatus}</span>
            </p>
          </section>

          <section className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
            <h2 className="mb-2 text-lg font-semibold tracking-tight">
              Anmeldung (OIDC / Keycloak)
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Authorization Code mit PKCE; Tokens werden im Benutzerprofil
              gespeichert. Redirect: freier Port auf{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                127.0.0.1
              </code>{" "}
              (Keycloak:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                http://127.0.0.1:*
              </code>{" "}
              — siehe{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                pnpm keycloak:bootstrap
              </code>
              ).
            </p>
            {bridgeIssue ? (
              <Alert className="mb-4 border-amber-500/50 bg-amber-500/5">
                <AlertTitle>Nicht in der Desktop-App</AlertTitle>
                <AlertDescription className="text-sm">
                  {bridgeIssue}
                  <span className="mt-3 block">
                    <Link
                      href="/login?next=/web"
                      className="font-medium text-foreground underline underline-offset-4"
                    >
                      Zum Web-Login
                    </Link>
                  </span>
                </AlertDescription>
              </Alert>
            ) : null}
            {authError ? (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Anmeldung</AlertTitle>
                <AlertDescription>{authError}</AlertDescription>
              </Alert>
            ) : null}
            {auth?.status === "signed_in" ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm">
                  <span className="text-muted-foreground">Angemeldet als: </span>
                  <span className="font-medium text-foreground">
                    {auth.user.name ?? auth.user.email ?? auth.user.sub}
                  </span>
                </p>
                {auth.user.email ? (
                  <p className="text-xs text-muted-foreground">
                    {auth.user.email}
                  </p>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  disabled={authBusy}
                  onClick={() => void handleLogout()}
                >
                  {authBusy ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : null}
                  Abmelden
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-muted-foreground">
                  {auth === null
                    ? "Lade Sitzungsstatus …"
                    : "Nicht angemeldet. Keycloak-Client (öffentlich) mit PKCE und passender Redirect-URI benötigt."}
                </p>
                <Button
                  type="button"
                  disabled={
                    authBusy || auth === null || Boolean(bridgeIssue)
                  }
                  onClick={() => void handleLogin()}
                >
                  {authBusy ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : null}
                  Mit Konto anmelden
                </Button>
              </div>
            )}
          </section>

          {auth?.status === "signed_in" ? (
            <section className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
              <h2 className="mb-2 text-lg font-semibold tracking-tight">
                API{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-normal">
                  GET {API_BASE}/v1/me
                </code>
              </h2>
              {meError ? (
                <Alert variant="destructive">
                  <AlertTitle>/v1/me</AlertTitle>
                  <AlertDescription className="font-mono text-xs whitespace-pre-wrap">
                    {meError}
                  </AlertDescription>
                </Alert>
              ) : (
                <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
                  {meJson ?? "Lade …"}
                </pre>
              )}
            </section>
          ) : null}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
