"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronsUpDown, Loader2, LogOut, Settings2, SunMoon } from "lucide-react";
import { useTheme } from "@repo/ui/next-themes";
import { Switch } from "@repo/ui/switch";

import { useAppLocale } from "@/components/locale-provider";
import { getUiText } from "@/content/ui-text";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/dropdown-menu";
import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@repo/ui/sidebar";

function WebUserMenuThemeRow() {
  const locale = useAppLocale();
  const ui = getUiText(locale);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const { resolvedTheme, setTheme } = useTheme();
  const darkOn = mounted && resolvedTheme === "dark";

  return (
    <DropdownMenuItem
      className="cursor-default"
      onSelect={(e) => e.preventDefault()}
    >
      <SunMoon className="mr-2 size-4 shrink-0 opacity-80" aria-hidden />
      <span className="flex-1">{ui.common.appearance}</span>
      <Switch
        size="sm"
        checked={darkOn}
        className="shrink-0"
        onClick={(e) => e.stopPropagation()}
        onCheckedChange={(checked) => {
          const next = checked ? "dark" : "light";
          setTheme(next);
          document.cookie = `theme-preference=${next}; path=/; max-age=31536000`;
        }}
        aria-label={
          darkOn ? ui.common.switchToLightMode : ui.common.switchToDarkMode
        }
      />
    </DropdownMenuItem>
  );
}

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]?.[0];
    const b = parts[parts.length - 1]?.[0];
    if (a && b) return `${a}${b}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

/** OIDC-`picture` oder echte URL; Session-Fallback `/logo.png` ist kein Nutzerfoto (siehe getAuthSessionUser). */
function shouldShowUserAvatar(src: string): boolean {
  const s = src.trim();
  if (!s) return false;
  if (s === "/logo.png" || s.endsWith("/logo.png")) return false;
  return (
    s.startsWith("http://") ||
    s.startsWith("https://") ||
    s.startsWith("data:")
  );
}

type WebUserMenuProps = {
  webSession: { name: string; email: string; avatar: string };
  onLogout: () => void | Promise<void>;
  logoutBusy: boolean;
};

export function WebUserMenu({
  webSession,
  onLogout,
  logoutBusy,
}: WebUserMenuProps) {
  const locale = useAppLocale();
  const ui = getUiText(locale);
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const showImage = shouldShowUserAvatar(webSession.avatar);
  const initials = getInitials(webSession.name);

  return (
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                aria-label={ui.webShell.userMenu.menuAriaLabel}
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="size-8 rounded-lg!">
                  {showImage ? (
                    <AvatarImage src={webSession.avatar} alt="" />
                  ) : null}
                  <AvatarFallback className="rounded-lg bg-primary text-xs font-medium text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-medium">{webSession.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {webSession.email}
                  </span>
                </div>
                {!collapsed ? (
                  <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-50 group-data-[collapsible=icon]:hidden" />
                ) : null}
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="min-w-56 w-(--radix-dropdown-menu-trigger-width)"
              side="top"
              align="start"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex flex-col gap-1 px-1 py-1.5">
                  <span className="truncate text-sm font-medium">
                    {webSession.name}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {webSession.email}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/web/settings" className="cursor-pointer">
                  <Settings2 className="mr-2 size-4" />
                  {ui.webShell.userMenu.settings}
                </Link>
              </DropdownMenuItem>
              <WebUserMenuThemeRow />
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={logoutBusy}
                onSelect={() => void onLogout()}
              >
                {logoutBusy ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <LogOut className="mr-2 size-4" />
                )}
                {logoutBusy ? ui.navUser.loggingOut : ui.navUser.logout}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  );
}
