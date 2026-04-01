/**
 * Konfigurierbare Download-URLs fuer die Electron-Desktop-App (z. B. via
 * NEXT_PUBLIC_DESKTOP_DOWNLOADS_JSON).
 */

export type DesktopDownloadEntry = {
  url: string;
  label?: string;
};

export type DesktopDownloadManifest = {
  windows?: DesktopDownloadEntry;
  mac?: {
    universal?: DesktopDownloadEntry;
    arm64?: DesktopDownloadEntry;
    x64?: DesktopDownloadEntry;
  };
  linux?: DesktopDownloadEntry;
};

export function parseDesktopDownloadManifestJson(
  raw: string | undefined,
): DesktopDownloadManifest | null {
  if (raw === undefined || raw.trim() === "") {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object") {
      return null;
    }
    return parsed as DesktopDownloadManifest;
  } catch {
    return null;
  }
}

export function getDesktopDownloadManifestFromEnv(): DesktopDownloadManifest | null {
  return parseDesktopDownloadManifestJson(
    process.env.NEXT_PUBLIC_DESKTOP_DOWNLOADS_JSON,
  );
}

export type DesktopDownloadAlternative = {
  id: string;
  label: string;
  url: string;
};

/** Sammelt alle konfigurierten Downloads fuer die Linkliste „Weitere Plattformen“. */
export function listDesktopDownloadAlternatives(
  manifest: DesktopDownloadManifest,
): DesktopDownloadAlternative[] {
  const out: DesktopDownloadAlternative[] = [];

  if (manifest.windows?.url) {
    out.push({
      id: "windows",
      label: manifest.windows.label ?? "Windows",
      url: manifest.windows.url,
    });
  }
  const mac = manifest.mac;
  if (mac?.universal?.url) {
    out.push({
      id: "mac-universal",
      label: mac.universal.label ?? "macOS (universal)",
      url: mac.universal.url,
    });
  }
  if (mac?.arm64?.url) {
    out.push({
      id: "mac-arm64",
      label: mac.arm64.label ?? "macOS (Apple Silicon)",
      url: mac.arm64.url,
    });
  }
  if (mac?.x64?.url) {
    out.push({
      id: "mac-x64",
      label: mac.x64.label ?? "macOS (Intel)",
      url: mac.x64.url,
    });
  }
  if (manifest.linux?.url) {
    out.push({
      id: "linux",
      label: manifest.linux.label ?? "Linux",
      url: manifest.linux.url,
    });
  }

  const seen = new Set<string>();
  return out.filter((e) => {
    if (seen.has(e.url)) return false;
    seen.add(e.url);
    return true;
  });
}
