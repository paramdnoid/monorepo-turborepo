"use client";

import { useEffect, useState } from "react";
import { LayoutDashboard, MessageSquare, Settings2 } from "lucide-react";
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

export function DesktopLayout() {
  const [ipcStatus, setIpcStatus] = useState<string>("…");

  useEffect(() => {
    window.desktop
      ?.ping()
      .then((msg) => {
        setIpcStatus(msg);
      })
      .catch(() => {
        setIpcStatus("nicht erreichbar");
      });
  }, []);

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader className="border-b border-sidebar-border">
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
              shadcn Sidebar-Layout (Radix Nova)
            </p>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 overflow-auto p-6">
          <section className="rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
            <h2 className="mb-2 text-lg font-semibold tracking-tight">
              Willkommen
            </h2>
            <p className="text-sm text-muted-foreground">
              Dieses Fenster nutzt{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                @repo/ui/sidebar
              </code>{" "}
              im Renderer (Vite + React).
            </p>
            <p className="mt-4 text-sm">
              <span className="text-muted-foreground">IPC ping: </span>
              <span className="font-mono text-foreground">{ipcStatus}</span>
            </p>
          </section>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
