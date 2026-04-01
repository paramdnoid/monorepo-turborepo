export type DesktopOsFamily = "windows" | "macos" | "linux" | "unknown";

export type DesktopCpuArch = "arm64" | "x64" | "unknown";

export type ClientPlatform = {
  os: DesktopOsFamily;
  arch: DesktopCpuArch;
};

/** Reine Zuordnung aus User-Agent Client Hints (Tests ohne DOM). */
export function clientPlatformFromHighEntropyHints(hints: {
  platform?: string;
  architecture?: string;
  bitness?: string;
}): ClientPlatform {
  const platform = hints.platform ?? "";
  let os: DesktopOsFamily = "unknown";
  if (/Windows/i.test(platform)) {
    os = "windows";
  } else if (/macOS/i.test(platform)) {
    os = "macos";
  } else if (/Linux/i.test(platform)) {
    os = "linux";
  }

  const archHint = hints.architecture?.toLowerCase() ?? "";
  const bitness = hints.bitness ?? "";
  let arch: DesktopCpuArch = "unknown";
  if (archHint === "arm" && bitness === "64") {
    arch = "arm64";
  } else if (archHint === "x86" && bitness === "64") {
    arch = "x64";
  } else if (archHint === "arm") {
    arch = "arm64";
  }

  return { os, arch };
}

/** Fallback ohne Client Hints: UA + navigator.platform. */
export function inferPlatformFromUserAgentAndPlatform(
  userAgent: string,
  platform: string,
): ClientPlatform {
  const ua = userAgent;
  const pl = platform;

  let os: DesktopOsFamily = "unknown";
  if (/Win/i.test(pl) || /Windows/i.test(ua)) {
    os = "windows";
  } else if (/Mac/i.test(pl) || /Mac OS X|Macintosh/i.test(ua)) {
    os = "macos";
  } else if (/Linux/i.test(pl) || /Linux/i.test(ua)) {
    os = "linux";
  }

  let arch: DesktopCpuArch = "unknown";
  const uaLower = ua.toLowerCase();
  if (
    /arm64|aarch64|win64; arm64|wow64; arm64/i.test(ua) ||
    (/arm/i.test(ua) && /64/.test(ua) && !/armv7/i.test(uaLower))
  ) {
    arch = "arm64";
  } else if (
    /x86_64|x64|amd64|wow64|win64/i.test(ua) ||
    /intel mac os x 1[0-9]/i.test(ua)
  ) {
    arch = "x64";
  }

  return { os, arch };
}

/**
 * Erkennt OS und CPU-Architektur im Browser (async wegen User-Agent Client Hints).
 * Nur OS/Arch — keine Geraete-Hardware wie GPU oder RAM.
 */
export async function detectClientPlatform(): Promise<ClientPlatform> {
  if (typeof navigator === "undefined") {
    return { os: "unknown", arch: "unknown" };
  }

  const nav = navigator as Navigator & {
    userAgentData?: {
      getHighEntropyValues?: (
        keys: string[],
      ) => Promise<Record<string, string | undefined>>;
    };
  };
  const uaData = nav.userAgentData;

  if (typeof uaData?.getHighEntropyValues === "function") {
    try {
      const hints = await uaData.getHighEntropyValues([
        "architecture",
        "bitness",
        "platform",
        "platformVersion",
      ]);
      const fromHints = clientPlatformFromHighEntropyHints({
        platform: hints.platform,
        architecture: hints.architecture,
        bitness: hints.bitness,
      });
      return mergeWithUaFallback(
        fromHints,
        navigator.userAgent,
        navigator.platform,
      );
    } catch {
      /* UA-Fallback */
    }
  }

  return inferPlatformFromUserAgentAndPlatform(
    navigator.userAgent,
    navigator.platform,
  );
}

function mergeWithUaFallback(
  hints: ClientPlatform,
  userAgent: string,
  platform: string,
): ClientPlatform {
  const fb = inferPlatformFromUserAgentAndPlatform(userAgent, platform);
  return {
    os: hints.os !== "unknown" ? hints.os : fb.os,
    arch: hints.arch !== "unknown" ? hints.arch : fb.arch,
  };
}
