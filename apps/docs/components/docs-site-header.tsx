"use client";

import brandLogo from "@repo/brand/logo";
import { ExternalLinkIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { DocsThemeToggle } from "@/components/docs-theme-toggle";
import { cn } from "@repo/ui/utils";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://zunftgewerk.de";

export function DocsSiteHeader() {
  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-border/80 bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur-sm",
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href={siteUrl}
          className="group flex min-w-0 items-center gap-2.5"
          aria-label="ZunftGewerk zur Website"
        >
          <Image
            src={brandLogo}
            alt=""
            width={40}
            height={48}
            className="h-8 w-auto max-w-[36px] shrink-0 object-contain sm:h-9 sm:max-w-[40px]"
            priority
          />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="font-sans text-base font-bold tracking-tight text-foreground sm:text-[1.15rem]">
              Zunft<span className="text-foreground/75">Gewerk</span>
            </span>
            <span className="mt-0.5 text-[10px] font-medium text-muted-foreground sm:text-[11px]">
              Dokumentation · Handbuch
            </span>
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-1">
          <a
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground sm:inline-flex"
          >
            Website
            <ExternalLinkIcon className="size-3.5 opacity-60" aria-hidden />
          </a>
          <DocsThemeToggle />
        </div>
      </div>
    </header>
  );
}
