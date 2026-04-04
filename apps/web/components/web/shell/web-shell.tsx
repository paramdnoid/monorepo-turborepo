"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid } from "lucide-react";

import { TradeFeatureIcon } from "@/components/marketing/trades/trade-feature-icon";
import { getSalesHeaderMeta, getSalesSidebarCopy } from "@/content/sales-module";
import {
  getCustomersHeaderMeta,
  getCustomersSidebarCopy,
  isCustomersSidebarListActive,
} from "@/content/customers-module";
import {
  getWorkforceHeaderMeta,
  getWorkforceSidebarCopy,
} from "@/content/workforce-module";
import type { Locale } from "@/lib/i18n/locale";
import {
  getPainterModuleBySegment,
  getPainterModulesOrdered,
} from "@/lib/trades/painter-modules";
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

function isSalesPrintPreviewPath(pathname: string): boolean {
  return /^\/web\/sales\/(quotes|invoices)\/[^/]+\/print$/.test(pathname);
}

function getHeaderMeta(
  pathname: string,
  locale: Locale,
): { title: string; subtitle: string } {
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
  const salesMeta = getSalesHeaderMeta(p, locale);
  if (salesMeta) {
    return salesMeta;
  }
  const customersMeta = getCustomersHeaderMeta(p, locale);
  if (customersMeta) {
    return customersMeta;
  }
  const workforceMeta = getWorkforceHeaderMeta(p, locale);
  if (workforceMeta) {
    return workforceMeta;
  }
  if (p.startsWith("/web/painter/")) {
    const rest = p.slice("/web/painter/".length);
    const segment = rest.split("/")[0] ?? "";
    if (segment) {
      const mod = getPainterModuleBySegment(locale, segment);
      if (mod) {
        return {
          title: mod.feature.label,
          subtitle: mod.feature.description,
        };
      }
    }
    return {
      title:
        locale === "en" ? "Painter & decorator" : "Maler & Tapezierer",
      subtitle:
        locale === "en"
          ? "Industry-specific modules"
          : "Branchenspezifische Module",
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
  const { title, subtitle } = getHeaderMeta(pathname, webSession.locale);

  const painterModules = useMemo(
    () => getPainterModulesOrdered(webSession.locale),
    [webSession.locale],
  );

  const salesSidebar = useMemo(
    () => getSalesSidebarCopy(webSession.locale),
    [webSession.locale],
  );

  const customersSidebar = useMemo(
    () => getCustomersSidebarCopy(webSession.locale),
    [webSession.locale],
  );

  const workforceSidebar = useMemo(
    () => getWorkforceSidebarCopy(webSession.locale),
    [webSession.locale],
  );

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
  const salesPrintPreview = isSalesPrintPreviewPath(pathname);

  if (salesPrintPreview) {
    return (
      <WebAppProvider value={appValue}>
        <div className="min-h-svh min-w-0 p-6 print:bg-white print:p-0">
          {children}
        </div>
      </WebAppProvider>
    );
  }

  return (
    <WebAppProvider value={appValue}>
      <SidebarProvider className="min-w-0">
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
                        <LayoutGrid />
                        <span>Übersicht</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>{customersSidebar.groupLabel}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {customersSidebar.items.map((item) => {
                    const isActive =
                      item.href === "/web/customers/list"
                        ? isCustomersSidebarListActive(item.href, pathname)
                        : pathname === item.href ||
                          pathname.startsWith(`${item.href}/`);
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          tooltip={item.tooltip}
                          isActive={isActive}
                        >
                          <Link href={item.href}>
                            <TradeFeatureIcon name={item.icon} variant="nav" />
                            <span className="truncate">{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>{salesSidebar.groupLabel}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {salesSidebar.items.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          tooltip={item.tooltip}
                          isActive={isActive}
                        >
                          <Link href={item.href}>
                            <TradeFeatureIcon name={item.icon} variant="nav" />
                            <span className="truncate">{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>{workforceSidebar.groupLabel}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {workforceSidebar.items.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          tooltip={item.tooltip}
                          isActive={isActive}
                        >
                          <Link href={item.href}>
                            <TradeFeatureIcon name={item.icon} variant="nav" />
                            <span className="truncate">{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>
                {webSession.locale === "en"
                  ? "Painter & decorator"
                  : "Maler & Tapezierer"}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {painterModules.map(({ segment, href, feature }) => {
                    const isActive =
                      pathname === href || pathname.startsWith(`${href}/`);
                    return (
                      <SidebarMenuItem key={segment}>
                        <SidebarMenuButton
                          asChild
                          tooltip={feature.label}
                          isActive={isActive}
                        >
                          <Link href={href}>
                            <TradeFeatureIcon
                              name={feature.icon}
                              variant="nav"
                            />
                            <span className="truncate">{feature.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
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
          <header className="flex h-14 min-w-0 shrink-0 items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1 shrink-0" />
            <Separator orientation="vertical" className="mr-2 h-4 shrink-0" />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <h1 className="truncate text-sm font-medium leading-none">
                {title}
              </h1>
              <p className="truncate text-xs text-muted-foreground">
                {subtitle}
              </p>
            </div>
          </header>
          <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-auto p-6">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </WebAppProvider>
  );
}
