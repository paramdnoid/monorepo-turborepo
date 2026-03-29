"use client";

import type { ReactNode } from "react";

import { DocsMarketingFooter } from "@/components/docs-marketing-footer";
import { DocsSiteHeader } from "@/components/docs-site-header";
import { DocsTableOfContents } from "@/components/docs-table-of-contents";

const editOnGitHubUrl = process.env.NEXT_PUBLIC_DOCS_EDIT_ON_GITHUB_URL;

type DocsShellProps = {
  children: ReactNode;
};

export function DocsShell({ children }: DocsShellProps) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <DocsSiteHeader />

      {/* Gleiche horizontale Hilfslinie wie im Header (`max-w-7xl` + Padding) — Flucht mit Logo */}
      <div className="mx-auto flex w-full min-h-0 max-w-7xl flex-1 px-4 sm:px-6 lg:px-8">
        <div className="min-w-0 flex-1">{children}</div>

        <aside
          className="hidden w-72 min-w-0 shrink-0 border-l border-border bg-muted/10 xl:block"
          aria-label="Seitennavigation"
        >
          {/*
            Sticky und overflow dürfen nicht auf demselben Element liegen; `overflow-x` auf einem Vorfahren
            bricht sticky in Chromium. Außen: nur sticky + Padding; innen: max-h + scroll + overflow-x-hidden.
          */}
          <div className="sticky top-16 py-8 pl-4 pr-4 sm:pl-6 sm:pr-5 lg:pl-8 lg:pr-6">
            <div className="docs-sidebar-scroll max-h-[calc(100svh-4.25rem)] min-w-0">
              <DocsTableOfContents editOnGitHubUrl={editOnGitHubUrl} />
            </div>
          </div>
        </aside>
      </div>

      <DocsMarketingFooter />
    </div>
  );
}
