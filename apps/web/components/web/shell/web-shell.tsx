"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FolderKanban, LayoutGrid } from "lucide-react";

import { TradeFeatureIcon } from "@/components/marketing/trades/trade-feature-icon";
import { getSalesHeaderMeta, getSalesSidebarCopy } from "@/content/sales-module";
import { getUiText } from "@/content/ui-text";
import {
  getCustomersHeaderMeta,
  getCustomersSidebarCopy,
  isCustomersSidebarListActive,
} from "@/content/customers-module";
import {
  getWorkforceHeaderMeta,
  getWorkforceSidebarCopy,
} from "@/content/workforce-module";
import {
  getWebModuleFromPath,
  type WebModuleKey,
} from "@/lib/auth/web-permissions";
import type { Locale } from "@/lib/i18n/locale";
import {
  getPainterModuleBySegment,
  getPainterModulesOrdered,
} from "@/lib/trades/painter-modules";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/alert";
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
      subtitle: getUiText(locale).dashboard.overviewDescription,
    };
  }
  if (p === "/web/projects" || p.startsWith("/web/projects/")) {
    return {
      title: locale === "en" ? "Projects" : "Projekte",
      subtitle:
        locale === "en"
          ? "Master data, status, and lifecycle"
          : "Stammdaten, Status und Lebenszyklus",
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
  const searchParams = useSearchParams();
  const pathname = normalizePath(usePathname());
  const { title, subtitle } = getHeaderMeta(pathname, webSession.locale);
  const currentModule = getWebModuleFromPath(pathname);
  const currentPermissions = webSession.permissions[currentModule];

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
  const deniedReason = searchParams.get("denied");
  const deniedModule = searchParams.get("module");

  const deniedHint = useMemo(() => {
    if (!deniedReason) {
      return null;
    }
    const moduleLabel = (module: string | null): string => {
      const key = (module ?? "") as WebModuleKey;
      if (key === "sales") return webSession.locale === "en" ? "Sales" : "Sales";
      if (key === "customers")
        return webSession.locale === "en" ? "Customers" : "Kunden";
      if (key === "workforce")
        return webSession.locale === "en" ? "Workforce" : "Team & Planung";
      if (key === "projects")
        return webSession.locale === "en" ? "Projects" : "Projekte";
      if (key === "painter")
        return webSession.locale === "en" ? "Painter modules" : "Maler-Module";
      if (key === "settings")
        return webSession.locale === "en" ? "Settings" : "Einstellungen";
      return webSession.locale === "en" ? "this area" : "diesen Bereich";
    };

    if (webSession.locale === "en") {
      return deniedReason === "view"
        ? {
            title: "Access denied",
            description: `You do not have view permission for ${moduleLabel(deniedModule)}.`,
          }
        : {
            title: "Read-only access",
            description: `You can open ${moduleLabel(deniedModule)}, but edit/delete/export/batch actions are blocked for your role.`,
          };
    }

    return deniedReason === "view"
      ? {
          title: "Zugriff verweigert",
          description: `Dir fehlt die Leseberechtigung fuer ${moduleLabel(deniedModule)}.`,
        }
      : {
          title: "Nur Lesemodus",
          description: `Du kannst ${moduleLabel(deniedModule)} ansehen, aber Bearbeiten/Loeschen/Export/Massenaktionen sind fuer deine Rolle gesperrt.`,
        };
  }, [deniedModule, deniedReason, webSession.locale]);

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
                  {webSession.permissions.projects.canView ? (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        tooltip={webSession.locale === "en" ? "Projects" : "Projekte"}
                        isActive={pathname === "/web/projects" || pathname.startsWith("/web/projects/")}
                      >
                        <Link href="/web/projects">
                          <FolderKanban />
                          <span>{webSession.locale === "en" ? "Projects" : "Projekte"}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ) : null}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {webSession.permissions.customers.canView ? (
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
            ) : null}

            {webSession.permissions.sales.canView ? (
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
            ) : null}

            {webSession.permissions.workforce.canView ? (
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
            ) : null}

            {webSession.permissions.painter.canView ? (
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
            ) : null}
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
              {!currentPermissions.canEdit ? (
                <p className="truncate text-[11px] text-amber-700 dark:text-amber-400">
                  {webSession.locale === "en"
                    ? "Read-only mode for this module"
                    : "Nur Lesemodus fuer dieses Modul"}
                </p>
              ) : null}
            </div>
          </header>
          <main
            id="main-content"
            tabIndex={-1}
            className="flex min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-auto p-6"
          >
            {deniedHint ? (
              <Alert variant="destructive">
                <AlertTitle>{deniedHint.title}</AlertTitle>
                <AlertDescription>{deniedHint.description}</AlertDescription>
              </Alert>
            ) : null}
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </WebAppProvider>
  );
}
