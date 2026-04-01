"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { DesktopDownloadCard } from "./desktop-download-card";

const API_BASE =
  process.env.NEXT_PUBLIC_WEB_API_BASE_URL ?? "http://127.0.0.1:4000";

const WEB_ME_PATH = "/api/auth/backend-me";

function formatBackendMeError(status: number, body: string): string {
  try {
    const j = JSON.parse(body) as {
      code?: string;
      detail?: string;
      error?: string;
    };
    if (typeof j.detail === "string" && j.detail.trim()) {
      const head = [String(status), j.code].filter(Boolean).join(" ");
      return `${head}: ${j.detail}`;
    }
    if (typeof j.error === "string") {
      return [String(status), j.code ?? j.error].join(" ");
    }
  } catch {
    /* Rohtext anzeigen */
  }
  return `${String(status)} ${body}`;
}

export type WebShellSession = {
  name: string;
  email: string;
  avatar: string;
};

type WebLayoutProps = {
  webSession: WebShellSession;
};

export function WebLayout({ webSession }: WebLayoutProps) {
  const router = useRouter();
  const [ipcStatus, setIpcStatus] = useState<string>("…");
  const [isElectronShell, setIsElectronShell] = useState(false);
  const [auth, setAuth] = useState<WebDesktopAuthState | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [meJson, setMeJson] = useState<string | null>(null);
  const [meError, setMeError] = useState<string | null>(null);
  const [meSource, setMeSource] = useState<"desktop" | "web" | null>(null);

  const refreshAuth = useCallback(async () => {
    if (!window.desktop?.authGetState) {
      setAuth({ status: "signed_out" });
      return;
    }
    const next = await window.desktop.authGetState();
    setAuth(next);
  }, []);

  useEffect(() => {
    const ping = window.desktop?.ping;
    if (typeof ping !== "function") {
      setIpcStatus("kein Electron");
      setIsElectronShell(false);
      return;
    }
    void ping()
      .then((msg) => {
        setIpcStatus(msg);
        setIsElectronShell(true);
      })
      .catch(() => {
        setIpcStatus("nicht erreichbar");
        setIsElectronShell(false);
      });
  }, []);

  useEffect(() => {
    void refreshAuth();
  }, [refreshAuth]);

  useEffect(() => {
    if (auth === null) {
      setMeJson(null);
      setMeError(null);
      setMeSource(null);
      return;
    }
    if (auth.status === "signed_in") {
      setMeSource("desktop");
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
    }

    setMeSource("web");
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(WEB_ME_PATH, { credentials: "include" });
        const text = await res.text();
        if (cancelled) return;
        if (!res.ok) {
          setMeError(formatBackendMeError(res.status, text));
          setMeJson(null);
          return;
        }
        setMeJson(text);
        setMeError(null);
      } catch (e) {
        if (!cancelled) {
          setMeError(e instanceof Error ? e.message : String(e));
          setMeJson(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth]);

  async function handleWebLogout() {
    setAuthError(null);
    setAuthBusy(true);
    try {
      const csrfRes = await fetch("/api/auth/csrf", { credentials: "include" });
      if (!csrfRes.ok) {
        setAuthError("Abmeldung fehlgeschlagen (CSRF).");
        return;
      }
      const data = (await csrfRes.json()) as { csrf?: string };
      if (!data.csrf) {
        setAuthError("Abmeldung fehlgeschlagen (CSRF).");
        return;
      }
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csrf: data.csrf }),
      });
      if (!res.ok) {
        setAuthError("Abmeldung fehlgeschlagen.");
        return;
      }
      router.push("/login");
    } catch {
      setAuthError("Abmeldung fehlgeschlagen.");
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

          <DesktopDownloadCard isElectronShell={isElectronShell} />

          <section className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
            <h2 className="mb-2 text-lg font-semibold tracking-tight">
              Anmeldung (Web / Keycloak)
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              <strong className="font-medium text-foreground">Web:</strong>{" "}
              Passwort-Login über die Next.js-App; Session als httpOnly-Cookie.
            </p>
            {authError ? (
              <Alert variant="destructive" className="mb-4">
                <AlertTitle>Anmeldung</AlertTitle>
                <AlertDescription>{authError}</AlertDescription>
              </Alert>
            ) : null}

            <div className="mb-4 rounded-lg border bg-muted/30 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Web (Browser)
              </p>
              <p className="mt-2 text-sm">
                <span className="text-muted-foreground">Angemeldet als: </span>
                <span className="font-medium text-foreground">
                  {webSession.name}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">{webSession.email}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                disabled={authBusy}
                onClick={() => void handleWebLogout()}
              >
                {authBusy ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                Abmelden (Web)
              </Button>
            </div>
          </section>

          {auth !== null ? (
            <section className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
              <h2 className="mb-2 text-lg font-semibold tracking-tight">
                API{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-normal">
                  GET{" "}
                  {meSource === "desktop"
                    ? `${API_BASE}/v1/me`
                    : WEB_ME_PATH}
                </code>
              </h2>
              <p className="mb-2 text-xs text-muted-foreground">
                {meSource === "desktop"
                  ? "Direktaufruf der API mit Bearer-Token aus Electron."
                  : "Same-Origin-BFF mit httpOnly-Cookie (kein Token im Browser-JS)."}
              </p>
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
