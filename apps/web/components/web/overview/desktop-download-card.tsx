"use client";

import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@repo/ui/button";

import { useAppLocale } from "@/components/locale-provider";
import { getUiText } from "@/content/ui-text";
import type { ClientPlatform } from "@/lib/detect-client-platform";
import { detectClientPlatform } from "@/lib/detect-client-platform";
import {
  getDesktopDownloadManifestFromEnv,
  listDesktopDownloadAlternatives,
} from "@/lib/desktop-download-manifest";
import { resolvePrimaryDesktopDownload } from "@/lib/resolve-desktop-download";

type DesktopDownloadCardProps = {
  isElectronShell: boolean;
};

export function DesktopDownloadCard({
  isElectronShell,
}: DesktopDownloadCardProps) {
  const locale = useAppLocale();
  const t = getUiText(locale).webShell.desktopDownload;
  const [platform, setPlatform] = useState<ClientPlatform | null>(null);

  const manifest = useMemo(() => getDesktopDownloadManifestFromEnv(), []);

  useEffect(() => {
    void detectClientPlatform().then(setPlatform);
  }, []);

  const primary = useMemo(() => {
    if (!platform) {
      return null;
    }
    return resolvePrimaryDesktopDownload(manifest, platform);
  }, [manifest, platform]);

  const otherLinks = useMemo(() => {
    if (!manifest) {
      return [];
    }
    const all = listDesktopDownloadAlternatives(manifest);
    if (!primary?.url) {
      return all;
    }
    return all.filter((a) => a.url !== primary.url);
  }, [manifest, primary?.url]);

  const configured =
    manifest !== null && listDesktopDownloadAlternatives(manifest).length > 0;

  if (isElectronShell) {
    return (
      <section className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <h2 className="mb-2 text-lg font-semibold tracking-tight">{t.title}</h2>
        <p className="text-sm text-muted-foreground">{t.inElectron}</p>
      </section>
    );
  }

  const osLabel =
    platform?.os === "windows"
      ? t.osLabels.windows
      : platform?.os === "macos"
        ? t.osLabels.macos
        : platform?.os === "linux"
          ? t.osLabels.linux
          : t.osLabels.unknown;

  const archLabel =
    platform?.arch === "arm64"
      ? t.archLabels.arm64
      : platform?.arch === "x64"
        ? t.archLabels.x64
        : t.archLabels.unknown;

  return (
    <section className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
      <h2 className="mb-2 text-lg font-semibold tracking-tight">{t.title}</h2>
      <p className="mb-4 text-sm text-muted-foreground">{t.description}</p>

      {platform ? (
        <p className="mb-4 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{t.detectedPrefix}</span>{" "}
          {osLabel} · {archLabel}
        </p>
      ) : null}

      {!configured || !primary?.url ? (
        <p className="text-sm text-muted-foreground">{t.configMissing}</p>
      ) : (
        <>
          <Button asChild className="w-full sm:w-auto">
            <a href={primary.url} target="_blank" rel="noopener noreferrer">
              <Download className="mr-2 size-4" aria-hidden />
              {t.cta}
            </a>
          </Button>
          {platform?.os === "macos" ? (
            <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
              {t.macOSGatekeeperHint}
            </p>
          ) : null}
          {otherLinks.length > 0 ? (
            <div className="mt-4 border-t pt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t.otherDownloads}
              </p>
              <ul className="flex flex-col gap-1.5 text-sm">
                {otherLinks.map((item) => (
                  <li key={item.id}>
                    <a
                      className="text-primary underline-offset-4 hover:underline"
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
