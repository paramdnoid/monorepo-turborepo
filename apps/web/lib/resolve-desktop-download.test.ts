import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { DesktopDownloadManifest } from "./desktop-download-manifest";
import { resolvePrimaryDesktopDownload } from "./resolve-desktop-download";

describe("resolvePrimaryDesktopDownload", () => {
  const manifest: DesktopDownloadManifest = {
    windows: { url: "https://cdn.example/w.exe", label: "Windows Installer" },
    mac: {
      universal: { url: "https://cdn.example/mac-universal.dmg" },
      arm64: { url: "https://cdn.example/mac-arm64.dmg" },
      x64: { url: "https://cdn.example/mac-x64.dmg" },
    },
    linux: { url: "https://cdn/example/app.AppImage" },
  };

  it("picks Windows entry", () => {
    const r = resolvePrimaryDesktopDownload(manifest, {
      os: "windows",
      arch: "x64",
    });
    assert.equal(r?.url, "https://cdn.example/w.exe");
  });

  it("picks mac arm64 when arch arm64", () => {
    const r = resolvePrimaryDesktopDownload(manifest, {
      os: "macos",
      arch: "arm64",
    });
    assert.equal(r?.url, "https://cdn.example/mac-arm64.dmg");
  });

  it("picks mac x64 when arch x64", () => {
    const r = resolvePrimaryDesktopDownload(manifest, {
      os: "macos",
      arch: "x64",
    });
    assert.equal(r?.url, "https://cdn.example/mac-x64.dmg");
  });

  it("picks Linux for linux os", () => {
    const r = resolvePrimaryDesktopDownload(manifest, {
      os: "linux",
      arch: "x64",
    });
    assert.equal(r?.url, "https://cdn/example/app.AppImage");
  });

  it("returns null when manifest is null", () => {
    const r = resolvePrimaryDesktopDownload(null, {
      os: "windows",
      arch: "x64",
    });
    assert.equal(r, null);
  });
});
