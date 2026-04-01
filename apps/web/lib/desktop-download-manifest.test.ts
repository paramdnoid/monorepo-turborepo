import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  listDesktopDownloadAlternatives,
  parseDesktopDownloadManifestJson,
} from "./desktop-download-manifest";

describe("parseDesktopDownloadManifestJson", () => {
  it("returns null for empty input", () => {
    assert.equal(parseDesktopDownloadManifestJson(undefined), null);
    assert.equal(parseDesktopDownloadManifestJson(""), null);
  });

  it("parses valid JSON", () => {
    const m = parseDesktopDownloadManifestJson(
      JSON.stringify({
        windows: { url: "https://x/w.exe" },
        linux: { url: "https://x/a.AppImage" },
      }),
    );
    assert.equal(m?.windows?.url, "https://x/w.exe");
    assert.equal(m?.linux?.url, "https://x/a.AppImage");
  });

  it("returns null for invalid JSON", () => {
    assert.equal(parseDesktopDownloadManifestJson("{"), null);
  });
});

describe("listDesktopDownloadAlternatives", () => {
  it("lists distinct URLs", () => {
    const alts = listDesktopDownloadAlternatives({
      windows: { url: "https://a/w.exe", label: "Win" },
      mac: { arm64: { url: "https://a/mac.dmg" } },
      linux: { url: "https://a/l.AppImage" },
    });
    assert.equal(alts.length, 3);
  });
});
