import type { ClientPlatform } from "./detect-client-platform";
import type { DesktopDownloadManifest } from "./desktop-download-manifest";

export type ResolvedPrimaryDownload = {
  url: string;
  label: string;
} | null;

function pickMacEntry(
  mac: NonNullable<DesktopDownloadManifest["mac"]>,
  arch: ClientPlatform["arch"],
): { url: string; label: string } | null {
  const u = mac.universal;
  const a64 = mac.arm64;
  const x64 = mac.x64;

  if (arch === "arm64") {
    if (a64?.url) {
      return { url: a64.url, label: a64.label ?? "macOS (Apple Silicon)" };
    }
    if (u?.url) {
      return { url: u.url, label: u.label ?? "macOS" };
    }
    if (x64?.url) {
      return { url: x64.url, label: x64.label ?? "macOS (Intel)" };
    }
  } else if (arch === "x64") {
    if (x64?.url) {
      return { url: x64.url, label: x64.label ?? "macOS (Intel)" };
    }
    if (u?.url) {
      return { url: u.url, label: u.label ?? "macOS" };
    }
    if (a64?.url) {
      return { url: a64.url, label: a64.label ?? "macOS (Apple Silicon)" };
    }
  } else {
    if (u?.url) {
      return { url: u.url, label: u.label ?? "macOS" };
    }
    if (a64?.url) {
      return { url: a64.url, label: a64.label ?? "macOS (Apple Silicon)" };
    }
    if (x64?.url) {
      return { url: x64.url, label: x64.label ?? "macOS (Intel)" };
    }
  }

  return null;
}

/**
 * Waehlt den passenden Primaer-Download aus dem Manifest.
 */
export function resolvePrimaryDesktopDownload(
  manifest: DesktopDownloadManifest | null,
  platform: ClientPlatform,
): ResolvedPrimaryDownload {
  if (!manifest) {
    return null;
  }

  if (platform.os === "windows" && manifest.windows?.url) {
    return {
      url: manifest.windows.url,
      label: manifest.windows.label ?? "Windows",
    };
  }

  if (platform.os === "linux" && manifest.linux?.url) {
    return {
      url: manifest.linux.url,
      label: manifest.linux.label ?? "Linux",
    };
  }

  if (platform.os === "macos" && manifest.mac) {
    const picked = pickMacEntry(manifest.mac, platform.arch);
    if (picked) {
      return picked;
    }
  }

  /* Unbekanntes OS oder fehlendes Mapping: erster verfuegbarer Eintrag */
  if (manifest.windows?.url) {
    return {
      url: manifest.windows.url,
      label: manifest.windows.label ?? "Windows",
    };
  }
  if (manifest.mac) {
    const picked = pickMacEntry(manifest.mac, platform.arch);
    if (picked) {
      return picked;
    }
  }
  if (manifest.linux?.url) {
    return {
      url: manifest.linux.url,
      label: manifest.linux.label ?? "Linux",
    };
  }

  return null;
}
