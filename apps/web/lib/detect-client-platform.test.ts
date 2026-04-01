import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  clientPlatformFromHighEntropyHints,
  inferPlatformFromUserAgentAndPlatform,
} from "./detect-client-platform";

describe("clientPlatformFromHighEntropyHints", () => {
  it("maps Windows x86 64 to windows x64", () => {
    const p = clientPlatformFromHighEntropyHints({
      platform: "Windows",
      architecture: "x86",
      bitness: "64",
    });
    assert.equal(p.os, "windows");
    assert.equal(p.arch, "x64");
  });

  it("maps macOS arm 64 to macos arm64", () => {
    const p = clientPlatformFromHighEntropyHints({
      platform: "macOS",
      architecture: "arm",
      bitness: "64",
    });
    assert.equal(p.os, "macos");
    assert.equal(p.arch, "arm64");
  });

  it("maps Linux arm to arm64", () => {
    const p = clientPlatformFromHighEntropyHints({
      platform: "Linux",
      architecture: "arm",
      bitness: "",
    });
    assert.equal(p.os, "linux");
    assert.equal(p.arch, "arm64");
  });
});

describe("inferPlatformFromUserAgentAndPlatform", () => {
  it("detects Windows x64 from typical Chrome UA", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    const p = inferPlatformFromUserAgentAndPlatform(ua, "Win32");
    assert.equal(p.os, "windows");
    assert.equal(p.arch, "x64");
  });

  it("detects macOS arm64 from M-series UA", () => {
    const uaArm =
      "Mozilla/5.0 (Macintosh; arm64 Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    const p = inferPlatformFromUserAgentAndPlatform(uaArm, "MacIntel");
    assert.equal(p.os, "macos");
    assert.equal(p.arch, "arm64");
  });

  it("detects Linux and x64", () => {
    const ua =
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    const p = inferPlatformFromUserAgentAndPlatform(ua, "Linux x86_64");
    assert.equal(p.os, "linux");
    assert.equal(p.arch, "x64");
  });
});
