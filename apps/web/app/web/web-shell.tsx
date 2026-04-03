"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
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

import {
  WebAppProvider,
  type WebShellSession,
} from "./web-app-context";
import { WebUserMenu } from "./web-user-menu";

type WebShellProps = {
  webSession: WebShellSession;
  children: React.ReactNode;
};

function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function getHeaderMeta(pathname: string): { title: string; subtitle: string } {
  const p = normalizePath(pathname);
  if (p === "/web/settings" || p.startsWith("/web/settings/")) {
    return {
      title: "Einstellungen",
      subtitle: "Konto, Sitzung und Benachrichtigungen",
    };
  }
  if (p === "/web") {
    return {
      title: "Übersicht",
      subtitle: "Next.js · shadcn Sidebar-Layout (Radix Nova)",
    };
  }
  return {
    title: "App",
    subtitle: "ZunftGewerk Web",
  };
}

export function WebShell({ webSession, children }: WebShellProps) {
  const router = useRouter();
  const pathname = normalizePath(usePathname());
  const { title, subtitle } = getHeaderMeta(pathname);

  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleWebLogout = useCallback(async () => {
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
  }, [router]);

  const appValue = useMemo(
    () => ({
      session: webSession,
      logout: handleWebLogout,
      logoutBusy: authBusy,
      logoutError: authError,
    }),
    [webSession, handleWebLogout, authBusy, authError],
  );

  const overviewActive = pathname === "/web";

  return (
    <WebAppProvider value={appValue}>
      <SidebarProvider>
        <Sidebar collapsible="icon" variant="inset">
          <SidebarHeader className="border-sidebar-border">
            <SidebarBrand tagline={webSession.brandTagline} />
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      tooltip="Übersicht"
                      isActive={overviewActive}
                    >
                      <Link href="/web">
                        <LayoutDashboard />
                        <span>Übersicht</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <WebUserMenu
            webSession={webSession}
            onLogout={handleWebLogout}
            logoutBusy={authBusy}
          />
          <SidebarRail />
        </Sidebar>
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex flex-1 flex-col gap-0.5">
              <h1 className="text-sm font-medium leading-none">{title}</h1>
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            </div>
          </header>
          <main className="flex flex-1 flex-col gap-4 overflow-auto p-6">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </WebAppProvider>
  );
}
