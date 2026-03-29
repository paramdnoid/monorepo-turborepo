"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowUpCircle,
  Copy,
  LifeBuoy,
  List,
  MessageSquare,
  PencilLine,
} from "lucide-react";

import { docsNavSections } from "@/content/docs-nav";
import { Separator } from "@repo/ui/separator";
import { cn } from "@repo/ui/utils";

/** Abgestimmt auf den schlanken `DocsSiteHeader` */
const HEADER_OFFSET = 72;

type DocsTableOfContentsProps = {
  /** Optional: z. B. `https://github.com/org/repo/edit/main/apps/docs/app/page.tsx` */
  editOnGitHubUrl?: string;
};

export function DocsTableOfContents({ editOnGitHubUrl }: DocsTableOfContentsProps) {
  const [activeId, setActiveId] = useState<(typeof docsNavSections)[number]["id"]>(
    docsNavSections[0]?.id ?? "einfuehrung",
  );

  const updateActive = useCallback(() => {
    const scrollPos = window.scrollY + HEADER_OFFSET;
    let current: (typeof docsNavSections)[number]["id"] = docsNavSections[0]?.id ?? "einfuehrung";
    for (const { id } of docsNavSections) {
      const el = document.getElementById(id);
      if (!el) continue;
      const top = el.getBoundingClientRect().top + window.scrollY;
      if (top <= scrollPos + 1) {
        current = id;
      }
    }
    setActiveId(current);
  }, []);

  useEffect(() => {
    updateActive();
    window.addEventListener("scroll", updateActive, { passive: true });
    window.addEventListener("resize", updateActive);
    return () => {
      window.removeEventListener("scroll", updateActive);
      window.removeEventListener("resize", updateActive);
    };
  }, [updateActive]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const copyPageUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      /* ignore */
    }
  };

  const feedbackMailto =
    "mailto:support@zunftgewerk.de?subject=Feedback%20Dokumentation%20ZunftGewerk";

  return (
    <nav
      aria-label="Auf dieser Seite"
      className="flex w-full min-w-0 flex-col items-end gap-6 pb-8 text-right"
    >
      <div className="w-full min-w-0">
        <p className="mb-4 flex items-center justify-end gap-2 text-sm font-medium text-foreground">
          Auf dieser Seite
          <List className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        </p>
        <ul className="min-w-0 space-y-0.5">
          {docsNavSections.map(({ id, label }) => {
            const isActive = activeId === id;
            return (
              <li key={id} className="min-w-0">
                <a
                  href={`#${id}`}
                  className={cn(
                    "block min-w-0 break-words border-r-2 py-1.5 pr-3 text-[13px] leading-snug transition-colors",
                    isActive
                      ? "border-primary font-medium text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setActiveId(id)}
                >
                  {label}
                </a>
              </li>
            );
          })}
        </ul>
      </div>

      <Separator className="w-full max-w-full shrink-0 opacity-60" />

      <ul className="w-full min-w-0 space-y-0.5 text-[13px] text-muted-foreground">
        {editOnGitHubUrl ? (
          <li>
            <a
              href={editOnGitHubUrl}
              target="_blank"
              rel="noopener noreferrer"
            className="flex min-w-0 items-center justify-end gap-2 py-1.5 transition-colors hover:text-foreground"
          >
            Seite auf GitHub bearbeiten
              <PencilLine className="size-4 shrink-0 opacity-70" aria-hidden />
            </a>
          </li>
        ) : null}
        <li>
          <button
            type="button"
            onClick={scrollToTop}
            className="flex w-full min-w-0 items-center justify-end gap-2 py-1.5 text-right transition-colors hover:text-foreground"
          >
            Nach oben scrollen
            <ArrowUpCircle className="size-4 shrink-0 opacity-70" aria-hidden />
          </button>
        </li>
        <li>
          <a
            href={feedbackMailto}
            className="flex min-w-0 items-center justify-end gap-2 py-1.5 transition-colors hover:text-foreground"
          >
            Feedback geben
            <MessageSquare className="size-4 shrink-0 opacity-70" aria-hidden />
          </a>
        </li>
        <li>
          <button
            type="button"
            onClick={copyPageUrl}
            className="flex w-full min-w-0 items-center justify-end gap-2 py-1.5 text-right transition-colors hover:text-foreground"
          >
            Link kopieren
            <Copy className="size-4 shrink-0 opacity-70" aria-hidden />
          </button>
        </li>
        <li>
          <a
            href="mailto:support@zunftgewerk.de?subject=Frage%20Dokumentation"
            className="flex min-w-0 items-center justify-end gap-2 py-1.5 transition-colors hover:text-foreground"
          >
            Support kontaktieren
            <LifeBuoy className="size-4 shrink-0 opacity-70" aria-hidden />
          </a>
        </li>
      </ul>
    </nav>
  );
}
